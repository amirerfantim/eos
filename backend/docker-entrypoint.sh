#!/bin/sh
# Container entrypoint: bring the database schema up to date, then run the CMD.
# Migrations run here (not in app code) so the app stays stateless and the same
# image works locally and in the cloud.
set -e

echo "[entrypoint] Applying database migrations..."
alembic upgrade head

echo "[entrypoint] Starting: $*"
exec "$@"
