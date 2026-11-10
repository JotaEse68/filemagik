"""F1 full real-format matrix on the existing unified FileMagik Railway API.

Every operation uses real files, real codec binaries and authenticated ASGI
routes. Never requires production credentials and never reaches public users.
"""
import io
import os
import subprocess
import zipfile
import wave
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from app import app

client = TestClient(app)
SECRET = "filemagik-unified-regression-"+("z"*45)
HEADERS={"Authorization":"Bearer "+SECRET,"X-Filemagik-Visitor":"b"*64}

@pytest.fixture(autouse=True)
def isolated_quota(monkeypatch,tmp_path):
    monkeypatch.setenv("PDF_ENGINE_SECRET",SECRET)
    monkeypatch.setenv("FILEMAGIK_UNIFIED_WORKERS_ENABLED","true")
    monkeypatch.setenv("FILEMAGIK_UNIFIED_CAPACITY_DB",str(tmp_path/"capacity.db"))
    for engine in ("IMAGE","MEDIA","ARCHIVE"):
        monkeypatch.setenv("FILEMAGIK_"+engine+"_QUOTA_DB",str(tmp_path/(engine.lower()+".db")))

def animated_gif():
    a=Image.new("RGB",(32,32),(255,0,0));b=Image.new("RGB",(32,32),(0,0,255))
    out=io.BytesIO();a.save(out,format="GIF",save_all=True,append_images=[b],
                          duration=[120,220],loop=0)
    return out.getvalue()

def wav_audio():
    out=io.BytesIO()
    with wave.open(out,"wb") as writer:
        writer.setnchannels(1);writer.setsampwidth(2);writer.setframerate(8000)
        writer.writeframes(b"\\x00\\x00"*8000)
    return out.getvalue()

@pytest.fixture
def video(tmp_path):
    path=tmp_path/"input.mp4"
    subprocess.run(["ffmpeg","-hide_banner","-loglevel","error",
      "-f","lavfi","-i","testsrc2=size=160x120:rate=8:duration=1",
      "-c:v","mpeg4","-y",str(path)],check=True,timeout=20)
    return path.read_bytes()

def test_real_animated_gif_keeps_frames_in_webp_and_mp4(tmp_path):
    gif=animated_gif()
    webp=client.post("/workers/image/v1/convert?operation=gif-to-animated-webp",
       headers=HEADERS,files={"file":("animation.gif",gif,"image/gif")})
    assert webp.status_code==200,webp.text[:160] if webp.status_code!=200 else ""
    with Image.open(io.BytesIO(webp.content)) as result:assert result.n_frames==2
    mp4=client.post("/workers/media/v1/media?operation=animated-gif-to-mp4",
       headers=HEADERS,files={"file":("animation.gif",gif,"image/gif")})
    assert mp4.status_code==200,mp4.text[:160] if mp4.status_code!=200 else ""
    path=tmp_path/"from-gif.mp4";path.write_bytes(mp4.content)
    output=subprocess.check_output(["ffprobe","-v","error","-count_frames",
      "-select_streams","v:0","-show_entries","stream=nb_read_frames",
      "-of","default=noprint_wrappers=1:nokey=1",str(path)],timeout=10)
    assert int(output.strip())>=2

def test_real_video_mp4_and_gif(video):
    for operation,magic in (("video-to-mp4",b"ftyp"),("video-to-gif",b"GIF8")):
        res=client.post("/workers/media/v1/media?operation="+operation,
            headers=HEADERS,files={"file":("sample.mp4",video,"video/mp4")})
        assert res.status_code==200,(operation,res.status_code,res.text[:180] if res.status_code!=200 else "")
        assert magic in res.content[:20]

def test_real_mp3_wav(video):
    mp3=client.post("/workers/media/v1/media?operation=audio-to-mp3",
       headers=HEADERS,files={"file":("sound.wav",wav_audio(),"audio/wav")})
    assert mp3.status_code==200
    assert mp3.content.startswith(b"ID3") or mp3.content[:1]==b"\\xff"
    extracted=client.post("/workers/media/v1/media?operation=extract-audio-mp3",
       headers=HEADERS,files={"file":("silent.mp4",video,"video/mp4")})
    assert extracted.status_code==422 # source has no audio track; clear refusal

def test_quota_refusal_and_invalid_input(monkeypatch):
    monkeypatch.setenv("FILEMAGIK_MEDIA_HOURLY_VISITOR","1")
    sound=wav_audio()
    for expected in (200,429):
        res=client.post("/workers/media/v1/media?operation=audio-to-mp3",
             headers=HEADERS,files={"file":("sound.wav",sound,"audio/wav")})
        assert res.status_code==expected
    invalid=client.post("/workers/archive/v1/extract",headers=HEADERS,
             files={"file":("bad.7z",b"fake data","application/x-7z-compressed")})
    assert invalid.status_code==422

def test_extract_real_video_audio_and_pcm_wav(tmp_path):
    video=tmp_path/"sound.mp4"
    subprocess.run(["ffmpeg","-hide_banner","-loglevel","error",
      "-f","lavfi","-i","color=c=blue:s=160x120:r=5:d=1",
      "-f","lavfi","-i","sine=frequency=600:duration=1",
      "-c:v","mpeg4","-c:a","aac","-shortest","-y",str(video)],
      check=True,timeout=25)
    extracted=client.post("/workers/media/v1/media?operation=extract-audio-mp3",
       headers=HEADERS,files={"file":("clip.mp4",video.read_bytes(),"video/mp4")})
    assert extracted.status_code==200, extracted.text[:150] if extracted.status_code!=200 else ""
    assert extracted.content.startswith(b"ID3") or extracted.content[:1]==b"\\xff"
    pcm=client.post("/workers/media/v1/media?operation=audio-to-wav",
       headers=HEADERS,files={"file":("voice.mp3",extracted.content,"audio/mpeg")})
    assert pcm.status_code==200,pcm.text[:150] if pcm.status_code!=200 else ""
    assert pcm.content[:4]==b"RIFF" and pcm.content[8:12]==b"WAVE"
    with wave.open(io.BytesIO(pcm.content),"rb") as audio:
        assert audio.getnchannels()==2
        assert audio.getnframes()>1000
