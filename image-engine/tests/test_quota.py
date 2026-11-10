"""Persistent quota regression tests for the private image worker."""
import pytest
from fastapi import HTTPException
from quota import reserve

@pytest.fixture(autouse=True)
def db(monkeypatch,tmp_path):
 monkeypatch.setenv("FILEMAGIK_IMAGE_QUOTA_DB",str(tmp_path/"quota.sqlite3"))

def test_repeated_usage_persists_between_reservations(monkeypatch):
 monkeypatch.setenv("FILEMAGIK_IMAGE_DAILY_VISITOR","2")
 visitor="a"*64
 with reserve(visitor):pass
 with reserve(visitor):pass
 with pytest.raises(HTTPException) as exc:
  with reserve(visitor):pass
 assert exc.value.status_code==429

def test_global_concurrency_is_enforced(monkeypatch):
 monkeypatch.setenv("FILEMAGIK_IMAGE_MAX_INFLIGHT","1")
 with reserve("a"*64):
  with pytest.raises(HTTPException) as exc:
   with reserve("b"*64):pass
  assert exc.value.status_code==429

def test_invalid_visitor_fails_closed():
 with pytest.raises(HTTPException) as exc:
  with reserve("untrusted-ip"):pass
 assert exc.value.status_code==403

def test_missing_volume_fails_closed(monkeypatch,tmp_path):
 monkeypatch.setenv("FILEMAGIK_IMAGE_QUOTA_DB",str(tmp_path/"missing"/"quota.sqlite3"))
 with pytest.raises(HTTPException) as exc:
  with reserve("a"*64):pass
 assert exc.value.status_code==503
