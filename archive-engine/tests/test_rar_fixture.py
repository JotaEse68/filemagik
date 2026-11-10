"""RAR5 positive fixture from libarchive's BSD-licensed test suite.
Source: libarchive/libarchive libarchive/test/test_read_format_rar5_stored.rar.uu
"""
import io
import binascii
import zipfile
from fastapi.testclient import TestClient
from app import app
import pytest

UU="begin 644 test_read_format_rar5_stored.rar\nM4F%R(1H'`0`SDK7E\"@$%!@`%`0&`@``X,`9C+`(#\"YT`!)T`I(,\"M$.@E8``\nM`0YH96QL;W=O<FQD+G1X=`H#$WX.JUM6Z0X::&5L;&\\@;&EB87)C:&EV92!T\n397-T('-U:71E(0H==U91`P4$````\n`\nend\n"
def rar_fixture():
 lines=UU.splitlines()
 return b"".join(binascii.a2b_uu(line.encode("ascii")) for line in lines[1:-1])

@pytest.fixture(autouse=True)
def quota_db(monkeypatch,tmp_path):
 monkeypatch.setenv("FILEMAGIK_ARCHIVE_QUOTA_DB",str(tmp_path/"quota.sqlite3"))

def test_authentic_rar5_stored_to_zip(monkeypatch):
 secret="archive-fixture-secret-"+"x"*40
 monkeypatch.setenv("FILEMAGIK_ARCHIVE_SECRET",secret)
 r=TestClient(app).post("/v1/extract",headers={"Authorization":"Bearer "+secret,"X-Filemagik-Visitor":"a"*64},
  files={"file":("archive.rar",rar_fixture(),"application/x-rar-compressed")})
 assert r.status_code==200,r.text[:200] if r.status_code!=200 else ""
 with zipfile.ZipFile(io.BytesIO(r.content)) as data:
  names=data.namelist()
  assert len(names)==1
  assert data.read(names[0])==b"hello libarchive test suite!\n"
