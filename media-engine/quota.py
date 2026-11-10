"""Persistent, fail-closed per-visitor and global workload quotas for Railway.

No document content is stored. Visitor IDs are pseudonymous HMAC digests
created by the trusted Vercel proxy. SQLite's BEGIN IMMEDIATE serializes
reservations across Uvicorn workers; the Railway volume retains counters on
restart. A missing persistent storage directory disables jobs rather than
resetting the quota.
"""
import os
import re
import sqlite3
import time
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from fastapi import HTTPException

VISITOR_RE = re.compile(r"^[a-f0-9]{64}$")
def _limit(env, fallback):
    return max(1, min(100000, int(os.getenv(env, str(fallback)))))

def _connect():
    path = Path(os.getenv("FILEMAGIK_MEDIA_QUOTA_DB", "/data/filemagik-media-quota.sqlite3"))
    if not path.parent.is_dir():
        raise HTTPException(503, "Quota storage is unavailable")
    try:
        db = sqlite3.connect(path, timeout=5, isolation_level=None)
        db.execute("PRAGMA busy_timeout=5000")
        db.execute("PRAGMA journal_mode=WAL")
        db.execute("""CREATE TABLE IF NOT EXISTS usage(
          bucket TEXT NOT NULL, visitor TEXT NOT NULL, calls INTEGER NOT NULL,
          PRIMARY KEY(bucket, visitor))""")
        db.execute("""CREATE TABLE IF NOT EXISTS inflight(
          id TEXT PRIMARY KEY, created INTEGER NOT NULL, visitor TEXT NOT NULL)""")
        return db
    except sqlite3.Error:
        raise HTTPException(503, "Quota database is not available")

@contextmanager
def reserve(visitor: str):
    if not VISITOR_RE.fullmatch(visitor or ""):
        raise HTTPException(403, "Valid visitor identity is required")
    day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    hour = datetime.now(timezone.utc).strftime("%Y-%m-%d-%H")
    month = day[:7]
    now = int(time.time())
    request_id = uuid.uuid4().hex
    db = _connect()
    granted = False
    try:
        db.execute("BEGIN IMMEDIATE")
        db.execute("DELETE FROM inflight WHERE created < ?", (now-120,))
        if db.execute("SELECT COUNT(*) FROM inflight").fetchone()[0] >= _limit("FILEMAGIK_MEDIA_MAX_INFLIGHT", 2):
            raise HTTPException(429, "Conversion capacity reached")
        budgets = [
            ("d:"+day, visitor, _limit("FILEMAGIK_MEDIA_DAILY_VISITOR", 12)),
            ("h:"+hour, visitor, _limit("FILEMAGIK_MEDIA_HOURLY_VISITOR", 4)),
            ("d:"+day, "*", _limit("FILEMAGIK_MEDIA_DAILY_GLOBAL", 300)),
            ("m:"+month, "*", _limit("FILEMAGIK_MEDIA_MONTHLY_GLOBAL", 4000)),
        ]
        for bucket, identity, cap in budgets:
            calls = db.execute("SELECT calls FROM usage WHERE bucket=? AND visitor=?",
                               (bucket, identity)).fetchone()
            if calls and calls[0] >= cap:
                raise HTTPException(429, "media conversion quota exceeded")
        for bucket, identity, _ in budgets:
            db.execute("INSERT INTO usage(bucket,visitor,calls) VALUES(?,?,1) "
                       "ON CONFLICT(bucket,visitor) DO UPDATE SET calls=calls+1",
                       (bucket, identity))
        db.execute("INSERT INTO inflight(id,created,visitor) VALUES(?,?,?)",
                   (request_id, now, visitor))
        db.execute("COMMIT")
        granted = True
        yield
    except Exception:
        if not granted:
            try: db.execute("ROLLBACK")
            except sqlite3.Error: pass
        raise
    finally:
        if granted:
            try:
                db.execute("BEGIN IMMEDIATE")
                db.execute("DELETE FROM inflight WHERE id=?", (request_id,))
                db.execute("COMMIT")
            except sqlite3.Error:
                try: db.execute("ROLLBACK")
                except sqlite3.Error: pass
        db.close()
