import pytest
from fastapi import HTTPException
from quota import reserve

@pytest.fixture(autouse=True)
def quota_db(monkeypatch,tmp_path):
    monkeypatch.setenv("PDF_ENGINE_QUOTA_DB",str(tmp_path/"quota.sqlite3"))

def test_persists_daily_calls_across_connections(monkeypatch):
    monkeypatch.setenv("PDF_ENGINE_DAILY_VISITOR","2")
    person="a"*64
    with reserve(person):pass
    with reserve(person):pass
    with pytest.raises(HTTPException) as ex:
        with reserve(person):pass
    assert ex.value.status_code==429

def test_global_concurrency_reservation(monkeypatch):
    monkeypatch.setenv("PDF_ENGINE_MAX_INFLIGHT","1")
    with reserve("a"*64):
        with pytest.raises(HTTPException) as exc:
            with reserve("b"*64):pass
        assert exc.value.status_code==429
    with reserve("b"*64):pass

def test_global_daily_cap(monkeypatch):
    monkeypatch.setenv("PDF_ENGINE_DAILY_GLOBAL","1")
    with reserve("a"*64):pass
    with pytest.raises(HTTPException) as ex:
        with reserve("b"*64):pass
    assert ex.value.status_code==429

def test_rejects_invalid_identity():
    with pytest.raises(HTTPException) as ex:
        with reserve("192.0.2.1"):pass
    assert ex.value.status_code==403

def test_storage_missing_fails_closed(monkeypatch,tmp_path):
    monkeypatch.setenv("PDF_ENGINE_QUOTA_DB",str(tmp_path/"missing"/"db.sqlite3"))
    with pytest.raises(HTTPException) as ex:
        with reserve("a"*64):pass
    assert ex.value.status_code==503
