import io
import os
import subprocess
from fastapi.testclient import TestClient
from app import app
from pathlib import Path

client=TestClient(app)
TOKEN="test-filemagik-private-media-secret-"+"a"*35
HEADERS={"Authorization":"Bearer "+TOKEN}

def sample_audio(tmp_path):
 path=tmp_path/"sample.wav"
 subprocess.run(["ffmpeg","-hide_banner","-loglevel","error","-f","lavfi",
                 "-i","sine=frequency=440:duration=1","-ar","44100","-y",str(path)],check=True)
 return path.read_bytes()

def sample_video(tmp_path):
 path=tmp_path/"sample.mp4"
 subprocess.run(["ffmpeg","-hide_banner","-loglevel","error","-f","lavfi",
                 "-i","color=c=red:s=160x120:d=1","-c:v","mpeg4","-y",str(path)],check=True)
 return path.read_bytes()

def test_denies_missing_bearer(monkeypatch,tmp_path):
 monkeypatch.setenv("FILEMAGIK_MEDIA_SECRET",TOKEN)
 result=client.post("/v1/media?operation=audio-to-mp3",files={"file":("a.wav",sample_audio(tmp_path),"audio/wav")})
 assert result.status_code==401

def test_audio_transcodes_real_mp3_and_wav(monkeypatch,tmp_path):
 monkeypatch.setenv("FILEMAGIK_MEDIA_SECRET",TOKEN)
 source=sample_audio(tmp_path)
 result=client.post("/v1/media?operation=audio-to-mp3",headers=HEADERS,
                    files={"file":("sound.wav",source,"audio/wav")})
 assert result.status_code==200,result.text[:180] if result.status_code!=200 else ""
 assert result.content[:3]==b"ID3" or result.content[:2] in (bytes.fromhex("fffb"),bytes.fromhex("fff3"))
 result2=client.post("/v1/media?operation=audio-to-wav",headers=HEADERS,
                    files={"file":("sound.wav",source,"audio/wav")})
 assert result2.status_code==200
 assert result2.content[:4]==b"RIFF"

def test_video_transcodes_and_generates_real_gif(monkeypatch,tmp_path):
 monkeypatch.setenv("FILEMAGIK_MEDIA_SECRET",TOKEN)
 data=sample_video(tmp_path)
 for op,magic in (("video-to-gif",b"GIF89a"),("video-to-mp4",b"ftyp")):
  result=client.post("/v1/media?operation="+op,headers=HEADERS,
                     files={"file":("video.mp4",data,"video/mp4")})
  assert result.status_code==200,(op,result.status_code,result.text[:200] if result.status_code!=200 else "")
  assert magic in result.content[:24]

def test_rejects_invalid_media_and_oversize(monkeypatch):
 monkeypatch.setenv("FILEMAGIK_MEDIA_SECRET",TOKEN)
 result=client.post("/v1/media?operation=audio-to-mp3",headers=HEADERS,
                    files={"file":("sound.wav",b"not valid wav","audio/wav")})
 assert result.status_code==422
 result=client.post("/v1/media?operation=audio-to-mp3",headers=HEADERS,
                    files={"file":("sound.txt",b"bad","text/plain")})
 assert result.status_code==415
 result=client.post("/v1/media?operation=audio-to-mp3",headers=HEADERS,
                    files={"file":("sound.wav",b"x"*(25*1024*1024+1),"audio/wav")})
 assert result.status_code==413
