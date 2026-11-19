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

import sqlite3
import time
from pathlib import Path
import image_quota
import media_quota
import archive_quota
from worker_capacity import capacity,memory_headroom
import worker_capacity

@pytest.mark.parametrize("module,env,prefix",[
    (image_quota,"FILEMAGIK_IMAGE_QUOTA_DB","FILEMAGIK_IMAGE"),
    (media_quota,"FILEMAGIK_MEDIA_QUOTA_DB","FILEMAGIK_MEDIA"),
    (archive_quota,"FILEMAGIK_ARCHIVE_QUOTA_DB","FILEMAGIK_ARCHIVE"),
])
def test_other_engines_preserve_quotas_after_reconnect(monkeypatch,tmp_path,module,env,prefix):
    monkeypatch.setenv(env,str(tmp_path/"shared.sqlite3"))
    monkeypatch.setenv(prefix+"_DAILY_VISITOR","1")
    with module.reserve("a"*64):pass
    with pytest.raises(HTTPException) as rejected:
        with module.reserve("a"*64):pass
    assert rejected.value.status_code==429

def test_quota_invalid_config_blocks_without_consuming_budget(monkeypatch):
    monkeypatch.setenv("PDF_ENGINE_HOURLY_VISITOR","unlimited")
    with pytest.raises(HTTPException) as rejected:
        with reserve("a"*64):pass
    assert rejected.value.status_code==503
    monkeypatch.delenv("PDF_ENGINE_HOURLY_VISITOR")
    with reserve("a"*64):pass

def test_quota_corrupt_database_fails_closed(monkeypatch,tmp_path):
    path=tmp_path/"broken.sqlite3"
    path.write_bytes(b"not a sqlite database")
    monkeypatch.setenv("PDF_ENGINE_QUOTA_DB",str(path))
    with pytest.raises(HTTPException) as rejected:
        with reserve("a"*64):pass
    assert rejected.value.status_code==503

def test_stale_quota_reservation_releases_after_crashed_process(monkeypatch,tmp_path):
    path=tmp_path/"quota.sqlite3"
    monkeypatch.setenv("PDF_ENGINE_QUOTA_DB",str(path))
    monkeypatch.setenv("PDF_ENGINE_MAX_INFLIGHT","1")
    with reserve("a"*64):pass
    with sqlite3.connect(path) as db:
        db.execute("INSERT INTO inflight(id,created,visitor) VALUES(?,?,?)",
                   ("crashed",int(time.time())-121,"b"*64))
    with reserve("c"*64):pass
    with sqlite3.connect(path) as db:
        assert db.execute("SELECT COUNT(*) FROM inflight").fetchone()[0]==0

def test_stale_unified_job_recovers_after_restart(monkeypatch,tmp_path):
    path=tmp_path/"capacity.sqlite3"
    monkeypatch.setenv("FILEMAGIK_UNIFIED_CAPACITY_DB",str(path))
    with capacity():pass
    with sqlite3.connect(path) as db:
        db.execute("INSERT INTO jobs(token,started) VALUES(?,?)",("dead",int(time.time())-181))
    with capacity():pass
    with sqlite3.connect(path) as db:
        assert db.execute("SELECT COUNT(*) FROM jobs").fetchone()[0]==0

def test_invalid_worker_memory_budget_fails_closed(monkeypatch):
    monkeypatch.setenv("FILEMAGIK_UNIFIED_MIN_FREE_MB","disabled")
    with pytest.raises(HTTPException) as rejected:
        memory_headroom()
    assert rejected.value.status_code==503

def test_out_of_range_quota_budget_fails_closed(monkeypatch):
    monkeypatch.setenv("PDF_ENGINE_DAILY_GLOBAL","0")
    with pytest.raises(HTTPException) as rejected:
        with reserve("a"*64):pass
    assert rejected.value.status_code==503
