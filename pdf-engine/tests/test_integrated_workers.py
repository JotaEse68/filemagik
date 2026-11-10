"""End-to-end in-process QA of all private engines mounted in existing API."""
import io
import os
import shutil
import subprocess
import wave
import zipfile
from PIL import Image
from fastapi.testclient import TestClient
import pytest
from app import app
from worker_capacity import capacity

SECRET="test-filemagik-unified-secret-"+"s"*40
VISITOR="a"*64
HEADERS={"Authorization":"Bearer "+SECRET,"X-Filemagik-Visitor":VISITOR}
client=TestClient(app)

@pytest.fixture(autouse=True)
def isolated_worker_databases(monkeypatch,tmp_path):
    monkeypatch.setenv("PDF_ENGINE_SECRET",SECRET)
    monkeypatch.setenv("FILEMAGIK_UNIFIED_WORKERS_ENABLED","true")
    monkeypatch.setenv("FILEMAGIK_UNIFIED_CAPACITY_DB",str(tmp_path/"capacity.sqlite3"))
    for engine in ("IMAGE","MEDIA","ARCHIVE"):
        monkeypatch.setenv("FILEMAGIK_"+engine+"_QUOTA_DB",str(tmp_path/(engine.lower()+".sqlite3")))

def gif_bytes():
    frames=[Image.new("RGB",(8,8),"red"),Image.new("RGB",(8,8),"blue")]
    out=io.BytesIO()
    frames[0].save(out,format="GIF",save_all=True,append_images=frames[1:],
                   duration=[120,240],loop=0)
    return out.getvalue()

def heif_bytes():
    out=io.BytesIO()
    Image.new("RGB",(8,8),(25,100,190)).save(out,format="HEIF",quality=80)
    return out.getvalue()

def wav_bytes():
    out=io.BytesIO()
    with wave.open(out,"wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(8000)
        audio.writeframes(b"\x00\x00"*8000)
    return out.getvalue()

def test_existing_pdf_api_health_is_unchanged():
    response=client.get("/healthz")
    assert response.status_code==200
    assert response.json()["engine"]=="filemagik-pdf-engine"

def test_workers_default_to_disabled_even_with_valid_credentials(monkeypatch):
    monkeypatch.delenv("FILEMAGIK_UNIFIED_WORKERS_ENABLED",raising=False)
    result=client.post("/workers/image/v1/convert?operation=gif-to-animated-webp",
        headers=HEADERS,files={"file":("a.gif",gif_bytes(),"image/gif")})
    assert result.status_code==503

def test_integrated_real_heif_to_png():
    response=client.post("/workers/image/v1/convert?operation=heic-to-png",
        headers=HEADERS,files={"file":("photo.heif",heif_bytes(),"image/heif")})
    assert response.status_code==200,response.text[:150] if response.status_code!=200 else ""
    assert response.content[:8]==b"\x89PNG\r\n\x1a\n"

def test_integrated_real_animated_gif_to_webp():
    response=client.post("/workers/image/v1/convert?operation=gif-to-animated-webp",
        headers=HEADERS,files={"file":("animation.gif",gif_bytes(),"image/gif")})
    assert response.status_code==200,response.text[:150] if response.status_code!=200 else ""
    with Image.open(io.BytesIO(response.content)) as converted:
        assert converted.n_frames==2

@pytest.mark.skipif(not shutil.which("ffmpeg"),reason="ffmpeg required")
def test_integrated_ffmpeg_transcodes_real_wav_to_mp3():
    response=client.post("/workers/media/v1/media?operation=audio-to-mp3",
        headers=HEADERS,files={"file":("sample.wav",wav_bytes(),"audio/wav")})
    assert response.status_code==200,response.text[:150] if response.status_code!=200 else ""
    assert response.content.startswith(b"ID3") or response.content[:1]==b"\xff"

@pytest.mark.skipif(not shutil.which("7z"),reason="p7zip needed for genuine archive fixture")
def test_integrated_archive_extracts_real_7z(tmp_path):
    sample=tmp_path/"notes.txt"
    sample.write_text("FileMagik unified archive","utf8")
    archive=tmp_path/"sample.7z"
    subprocess.run(["7z","a","-bd",str(archive),str(sample)],
        check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    response=client.post("/workers/archive/v1/extract",headers=HEADERS,
        files={"file":("sample.7z",archive.read_bytes(),"application/x-7z-compressed")})
    assert response.status_code==200,response.text[:150] if response.status_code!=200 else ""
    with zipfile.ZipFile(io.BytesIO(response.content)) as z:
        assert len(z.namelist())==1
        assert z.read(z.namelist()[0])==b"FileMagik unified archive"

def test_private_auth_identity_and_daily_budget(monkeypatch):
    route="/workers/image/v1/convert?operation=gif-to-animated-webp"
    blob={"file":("a.gif",gif_bytes(),"image/gif")}
    assert client.post(route,files=blob).status_code==401
    assert client.post(route,headers={"Authorization":"Bearer "+SECRET},files=blob).status_code==403
    monkeypatch.setenv("FILEMAGIK_IMAGE_DAILY_VISITOR","1")
    assert client.post(route,headers=HEADERS,files=blob).status_code==200
    assert client.post(route,headers=HEADERS,files=blob).status_code==429

def test_capacity_is_shared_across_all_engines_and_processes():
    with capacity():
        response=client.post("/workers/image/v1/convert?operation=gif-to-animated-webp",
            headers=HEADERS,files={"file":("a.gif",gif_bytes(),"image/gif")})
        assert response.status_code==429

def test_worker_without_persistent_storage_fails_closed(monkeypatch,tmp_path):
    monkeypatch.setenv("FILEMAGIK_UNIFIED_CAPACITY_DB",
        str(tmp_path/"nonexistent"/"capacity.sqlite3"))
    response=client.post("/workers/image/v1/convert?operation=gif-to-animated-webp",
        headers=HEADERS,files={"file":("a.gif",gif_bytes(),"image/gif")})
    assert response.status_code==503

def test_memory_headroom_for_small_real_conversions():
    import resource
    peak_kb=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    # Conservative CI regression check, not a substitute for Railway load testing.
    assert peak_kb<700*1024

def test_pdf_and_media_share_capacity_when_workers_enabled():
    # The PDF job must not run at the same time as a costly media conversion.
    with capacity():
        response=client.post("/v1/jobs?operation=pdf-to-docx",
            headers=HEADERS,files={"file":("draft.pdf",b"%PDF-1.5 fake","application/pdf")})
        assert response.status_code==429

def test_worker_memory_pressure_refuses_request(monkeypatch):
    import worker_capacity
    from fastapi import HTTPException
    def simulated_exhausted_ram():
        raise HTTPException(503,"Insufficient memory headroom")
    monkeypatch.setattr(worker_capacity,"memory_headroom",simulated_exhausted_ram)
    response=client.post("/workers/image/v1/convert?operation=gif-to-animated-webp",
        headers=HEADERS,files={"file":("a.gif",gif_bytes(),"image/gif")})
    assert response.status_code==503

def test_ffprobe_rejects_excessive_video_dimensions(monkeypatch,tmp_path):
    from fastapi import HTTPException
    import media_worker
    def fake_probe(command,timeout=35):
        if "format=duration" in command:return b"3.0"
        return b"4096x2160"
    monkeypatch.setattr(media_worker,"run_command",fake_probe)
    with pytest.raises(HTTPException) as rejected:
        media_worker.inspect(tmp_path/"fake.mp4")
    assert rejected.value.status_code==413


@pytest.mark.skipif(not shutil.which("ffmpeg") or not shutil.which("ffprobe"), reason="FFmpeg tools required")
def test_new_media_formats_and_audio_trim(monkeypatch):
    monkeypatch.setenv("FILEMAGIK_MEDIA_HOURLY_VISITOR","100")
    monkeypatch.setenv("FILEMAGIK_MEDIA_DAILY_VISITOR","100")
    import media_worker
    payload=wav_bytes()
    base="/workers/media/v1/media?operation="
    for op,magic in [("audio-to-flac",b"fLaC"),("audio-to-ogg",b"OggS")]:
        response=client.post(base+op,headers=HEADERS,
            files={"file":("sample.wav",payload,"audio/wav")})
        assert response.status_code==200,response.text[:150] if response.status_code!=200 else ""
        assert response.content.startswith(magic)
    response=client.post(base+"trim-audio-mp3&start=0.1&end=0.6",headers=HEADERS,
        files={"file":("sample.wav",payload,"audio/wav")})
    assert response.status_code==200
    assert response.content.startswith(b"ID3") or response.content[:1]==bytes.fromhex("ff")
    for invalid in ("start=-1&end=0.5","start=0.8&end=0.2",
                    "start=0&end=120","start=nan&end=1"):
        rejected=client.post(base+"trim-audio-mp3&"+invalid,headers=HEADERS,
            files={"file":("sample.wav",payload,"audio/wav")})
        assert rejected.status_code in (400,422)


@pytest.mark.skipif(not shutil.which("ffmpeg") or not shutil.which("ffprobe"), reason="FFmpeg tools required")
def test_new_video_trim_and_single_png_frame(tmp_path):
    source=tmp_path/"moving.mp4"
    subprocess.run(["ffmpeg","-hide_banner","-loglevel","error","-f","lavfi",
        "-i","testsrc=size=128x96:rate=10","-t","2","-threads","1",
        "-c:v","mpeg4","-y",str(source)],check=True)
    data=source.read_bytes()
    base="/workers/media/v1/media?operation="
    frame=client.post(base+"video-frame-png&start=0.5",headers=HEADERS,
        files={"file":("moving.mp4",data,"video/mp4")})
    assert frame.status_code==200,frame.text[:150] if frame.status_code!=200 else ""
    assert frame.content.startswith(bytes.fromhex("89504e470d0a1a0a"))
    trimmed=client.post(base+"trim-video-mp4&start=0.25&end=1.25",headers=HEADERS,
        files={"file":("moving.mp4",data,"video/mp4")})
    assert trimmed.status_code==200,trimmed.text[:150] if trimmed.status_code!=200 else ""
    assert b"ftyp" in trimmed.content[:64]


def test_gif_frame_zip_contains_real_pngs_and_timing():
    import json
    response=client.post("/workers/image/v1/convert?operation=gif-to-frames-zip",
        headers=HEADERS,files={"file":("animation.gif",gif_bytes(),"image/gif")})
    assert response.status_code==200,response.text[:160] if response.status_code!=200 else ""
    with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
        assert archive.namelist()==["frame-001.png","frame-002.png","frames.json"]
        assert archive.read("frame-001.png").startswith(bytes.fromhex("89504e470d0a1a0a"))
        meta=json.loads(archive.read("frames.json"))
        assert meta["frames"]==2
        assert meta["durations_ms"]==[120,240]


def test_private_mixed_batch_zip_manifest_and_presets(monkeypatch):
    import json
    monkeypatch.setenv("FILEMAGIK_MEDIA_HOURLY_VISITOR","100")
    monkeypatch.setenv("FILEMAGIK_IMAGE_HOURLY_VISITOR","100")
    url="/workers/batch/v1/convert?preset=web-friendly"
    mixed=[
        ("files",("animation.gif",gif_bytes(),"image/gif")),
        ("files",("sound.wav",wav_bytes(),"audio/wav")),
        ("files",("unknown.xyz",b"bad","application/octet-stream"))]
    assert client.post(url,files=mixed).status_code==401
    result=client.post(url,headers=HEADERS,files=mixed)
    assert result.status_code==200,result.text[:180] if result.status_code!=200 else ""
    with zipfile.ZipFile(io.BytesIO(result.content)) as archive:
        names=archive.namelist()
        assert "01-animation.webp" in names
        assert "02-sound.mp3" in names
        assert archive.read("01-animation.webp")[:4]==b"RIFF"
        assert archive.read("02-sound.mp3")[:3]==b"ID3"
        manifest=json.loads(archive.read("manifest.json"))
        assert [row["status"] for row in manifest["files"]]==["ok","ok","unsupported"]
        assert len(manifest["files"][0]["sha256"])==64

def test_private_mixed_batch_limits_and_fail_closed():
    many=[("files",(f"bad{i}.gif",gif_bytes(),"image/gif")) for i in range(7)]
    too_many=client.post("/workers/batch/v1/convert",headers=HEADERS,files=many)
    assert too_many.status_code==413
    no_valid=client.post("/workers/batch/v1/convert",headers=HEADERS,
        files=[("files",("broken.bin",b"xx","application/octet-stream"))])
    assert no_valid.status_code==422
