#!/bin/sh
set -eu
# Railway mounts a persistent volume outside the image's ownership.
# Correct only the mountpoint ownership and keep the app unprivileged.
if [ ! -d /data ]; then
  echo "PDF quota volume missing: refusing to start" >&2
  exit 1
fi
chown engine:engine /data
exec gosu engine uvicorn app:app --host 0.0.0.0 --port "${PORT:-8000}" --workers 2 --timeout-keep-alive 5
