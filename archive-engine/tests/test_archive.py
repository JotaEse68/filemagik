import os
import subprocess
import zipfile
import io
from fastapi.testclient import TestClient
from app import app
import pytest

client=TestClient(app)
SECRET="filemagik-archive-test-secret-"+"a"*40
HEADERS={"Authorization":"Bearer "+SECRET}

@pytest.fixture(autouse=True)
def secret(monkeypatch):monkeypatch.setenv("FILEMAGIK_ARCHIVE_SECRET",SECRET)

def make_7z(tmp_path):
 source=tmp_path/"notes.txt"
 source.write_text("FileMagik safe 7z archive",encoding="utf-8")
 dest=tmp_path/"fixture.7z"
 subprocess.run(["7z","a","-bd",str(dest),str(source)],check=True,capture_output=True)
 return dest.read_bytes()

def test_authentication_required(tmp_path):
 r=client.post("/v1/extract",files={"file":("test.7z",make_7z(tmp_path),"application/x-7z-compressed")})
 assert r.status_code==401

def test_real_7z_roundtrip_to_zip(tmp_path):
 r=client.post("/v1/extract",headers=HEADERS,
     files={"file":("fixture.7z",make_7z(tmp_path),"application/x-7z-compressed")})
 assert r.status_code==200,r.text[:200] if r.status_code!=200 else ""
 with zipfile.ZipFile(io.BytesIO(r.content)) as archive:
  names=archive.namelist()
  assert len(names)==1
  assert archive.read(names[0])==b"FileMagik safe 7z archive"

def test_rejects_corrupted_rar_and_non_archives():
 r=client.post("/v1/extract",headers=HEADERS,
     files={"file":("fake.rar",b"not a real rar file","application/x-rar-compressed")})
 assert r.status_code==422
 r=client.post("/v1/extract",headers=HEADERS,
     files={"file":("fake.zip",b"hello","application/zip")})
 assert r.status_code==415

def test_limit_and_symlink_refusal(tmp_path):
 r=client.post("/v1/extract",headers=HEADERS,
     files={"file":("huge.7z",b"x"*(25*1024*1024+1),"application/x-7z-compressed")})
 assert r.status_code==413
 # Reject a real directory entry that isn't a regular file even when
 # archive metadata claims it is a symlink; avoid relying on p7zip packaging
 # a dangling symlink, which differs across OS distributions.
 import app as module
 from contextlib import contextmanager
 class SymlinkEntry:
  isfile=False
  isdir=False
 @contextmanager
 def link_reader(_):
  yield [SymlinkEntry()]
 monkeypatch_module=None
 original=module.libarchive.file_reader
 module.libarchive.file_reader=link_reader
 try:
  r=client.post("/v1/extract",headers=HEADERS,
      files={"file":("link.7z",make_7z(tmp_path),"application/x-7z-compressed")})
  assert r.status_code==422
 finally:
  module.libarchive.file_reader=original
