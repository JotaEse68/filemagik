import io
import os
from PIL import Image,ImageSequence
from fastapi.testclient import TestClient
from app import app

client=TestClient(app)
SECRET="filemagik-image-test-secret-"+"x"*40
HEADERS={"Authorization":"Bearer "+SECRET}

def heic_image():
 im=Image.new("RGB",(8,8),(220,90,20))
 out=io.BytesIO();im.save(out,format="HEIF",quality=80)
 return out.getvalue()

def gif_animation():
 red=Image.new("RGBA",(8,8),"red")
 blue=Image.new("RGBA",(8,8),"blue")
 out=io.BytesIO()
 red.save(out,format="GIF",save_all=True,append_images=[blue],duration=[120,240],loop=0)
 return out.getvalue()

def test_requires_bearer(monkeypatch):
 monkeypatch.setenv("FILEMAGIK_IMAGE_SECRET",SECRET)
 r=client.post("/v1/convert?operation=heic-to-png",
     files={"file":("sample.heic",heic_image(),"image/heic")})
 assert r.status_code==401

def test_real_heic_to_png(monkeypatch):
 monkeypatch.setenv("FILEMAGIK_IMAGE_SECRET",SECRET)
 r=client.post("/v1/convert?operation=heic-to-png",headers=HEADERS,
     files={"file":("sample.heic",heic_image(),"image/heic")})
 assert r.status_code==200,r.text[:150] if r.status_code!=200 else ""
 assert r.content[:8]==bytes.fromhex("89504e470d0a1a0a")
 assert Image.open(io.BytesIO(r.content)).size==(8,8)

def test_gif_to_animated_webp_preserves_frames_and_timing(monkeypatch):
 monkeypatch.setenv("FILEMAGIK_IMAGE_SECRET",SECRET)
 r=client.post("/v1/convert?operation=gif-to-animated-webp",headers=HEADERS,
     files={"file":("animated.gif",gif_animation(),"image/gif")})
 assert r.status_code==200,r.text[:150] if r.status_code!=200 else ""
 assert r.content[:4]==b"RIFF" and r.content[8:12]==b"WEBP"
 with Image.open(io.BytesIO(r.content)) as image:
  assert image.n_frames==2
  assert image.info.get("loop")==0
 # Pillow does not expose animated WebP duration through frame.info.
  # Inspect ANMF timing directly: 24-bit milliseconds at payload offset 12.
  positions=[i for i in range(len(r.content)-24) if r.content[i:i+4]==b"ANMF"]
  assert len(positions)==2
  durations=[int.from_bytes(r.content[pos+20:pos+23],"little") for pos in positions]
  assert durations[0]>=100 and durations[1]>=200

def test_rejects_invalid_and_large_files(monkeypatch):
 monkeypatch.setenv("FILEMAGIK_IMAGE_SECRET",SECRET)
 r=client.post("/v1/convert?operation=heic-to-png",headers=HEADERS,
     files={"file":("not-heic.heic",b"bad data","image/heic")})
 assert r.status_code==422
 r=client.post("/v1/convert?operation=gif-to-animated-webp",headers=HEADERS,
     files={"file":("unsafe.gif",b"x"*(30*1024*1024+1),"image/gif")})
 assert r.status_code==413
