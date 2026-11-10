"""Cross-process CPU/memory gate shared by all worker operations.

The one SQLite file on the existing PDF volume guarantees a single intensive
image/media/archive operation at a time, even with multiple Uvicorn processes.
No file bytes or personal data are persisted in this database.
"""
import os
import sqlite3
import time
import uuid
from contextlib import contextmanager
from pathlib import Path
from fastapi import HTTPException

@contextmanager
def capacity():
    path=Path(os.getenv("FILEMAGIK_UNIFIED_CAPACITY_DB","/data/filemagik-worker-capacity.sqlite3"))
    if not path.parent.is_dir():
        raise HTTPException(503,"Persistent worker storage unavailable")
    token=uuid.uuid4().hex
    db=None
    granted=False
    try:
        db=sqlite3.connect(path,timeout=5,isolation_level=None)
        db.execute("PRAGMA busy_timeout=5000")
        db.execute("PRAGMA journal_mode=WAL")
        db.execute("CREATE TABLE IF NOT EXISTS jobs (token TEXT PRIMARY KEY, started INTEGER NOT NULL)")
        db.execute("BEGIN IMMEDIATE")
        db.execute("DELETE FROM jobs WHERE started < ?",(int(time.time())-180,))
        active=db.execute("SELECT COUNT(*) FROM jobs").fetchone()[0]
        if active>=1:
            db.execute("ROLLBACK")
            raise HTTPException(429,"Another intensive conversion is running")
        db.execute("INSERT INTO jobs(token,started) VALUES(?,?)",(token,int(time.time())))
        db.execute("COMMIT")
        granted=True
        yield
    except sqlite3.Error:
        raise HTTPException(503,"Worker capacity database unavailable")
    finally:
        if db is not None:
            if granted:
                try:
                    db.execute("BEGIN IMMEDIATE")
                    db.execute("DELETE FROM jobs WHERE token=?",(token,))
                    db.execute("COMMIT")
                except sqlite3.Error:
                    try:db.execute("ROLLBACK")
                    except sqlite3.Error:pass
            db.close()
