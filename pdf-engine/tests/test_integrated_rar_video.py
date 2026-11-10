"""Integration tests of true RAR5 and video via the *same* existing FastAPI."""
import binascii
import io
import os
import subprocess
import shutil
import zipfile
import pytest
from fastapi.testclient import TestClient
from app import app

UU="begin 644 test_read_format_rar5_stored.rar\nM4F%R(1H'`0`SDK7E\"@$%!@`%`0&`@``X,`9C+`(#\"YT`!)T`I(,\"M$.@E8``\nM`0YH96QL;W=O<FQD+G1X=`H#$WX.JUM6Z0X::&5L;&\\@;&EB87)C:&EV92!T\n397-T('-U:71E(0H==U91`P4$````\n`\nend\n"
TOKEN="unified-filemagik-actual-media-secret-"+("z"*40)
HEADERS={"Authorization":"Bearer "+TOKEN,"X-Filemagik-Visitor":"e"*64}
client=TestClient(app)

@pytest.fixture(autouse=True)
def config(monkeypatch,tmp_path):
 monkeypatch.setenv("PDF_ENGINE_SECRET",TOKEN)
 monkeypatch.setenv("FILEMAGIK_UNIFIED_WORKERS_ENABLED","true")
 monkeypatch.setenv("FILEMAGIK_UNIFIED_CAPACITY_DB",str(tmp_path/"worker-capacity.db"))
 monkeypatch.setenv("FILEMAGIK_MEDIA_QUOTA_DB",str(tmp_path/"media-quota.db"))
 monkeypatch.setenv("FILEMAGIK_ARCHIVE_QUOTA_DB",str(tmp_path/"archive-quota.db"))

def test_real_rar5_to_zip_via_existing_api():
 fixture=b"".join(binascii.a2b_uu(line.encode("ascii")) for line in UU.splitlines()[1:-1])
 response=client.post("/workers/archive/v1/extract",headers=HEADERS,
   files={"file":("sample.rar",fixture,"application/x-rar-compressed")})
 assert response.status_code==200,response.text[:180] if response.status_code!=200 else ""
 with zipfile.ZipFile(io.BytesIO(response.content)) as z:
  assert len(z.namelist())==1
  assert z.read(z.namelist()[0])==b"hello libarchive test suite!\n"

@pytest.mark.skipif(shutil.which("ffmpeg") is None,reason="FFmpeg is required")
def test_real_video_to_animated_gif_via_existing_api(tmp_path):
 path=tmp_path/"sample.mp4"
 subprocess.run(["ffmpeg","-hide_banner","-loglevel","error","-f","lavfi",
                 "-i","color=c=red:s=160x120:d=1","-c:v","mpeg4","-y",str(path)],check=True)
 response=client.post("/workers/media/v1/media?operation=video-to-gif",headers=HEADERS,
   files={"file":("sample.mp4",path.read_bytes(),"video/mp4")})
 assert response.status_code==200,response.text[:180] if response.status_code!=200 else ""
 assert response.content.startswith((b"GIF89a",b"GIF87a"))
