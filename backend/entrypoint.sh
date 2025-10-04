#!/bin/sh
set -e
echo "Running DB init/seed script"
python ./scripts/init_db.py
echo "Starting server"
exec uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
