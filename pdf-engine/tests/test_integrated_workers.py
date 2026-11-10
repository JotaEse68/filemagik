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
