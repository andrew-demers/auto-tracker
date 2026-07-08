#!/bin/sh
set -e

# Defaults match Unraid's "nobody:users" (99:100) - see the "Running on
# Unraid" section of the README for why that matters for bind-mounted
# appdata paths.
PUID="${PUID:-99}"
PGID="${PGID:-100}"

UPLOADS_DIR="${UPLOADS_DIR:-/data/uploads}"
# Derive the SQLite file's directory from DATABASE_URL (e.g.
# "file:/data/auto-tracker.db" -> "/data") so it gets created/chowned too,
# even if DATABASE_URL is overridden to a different path under /data.
DB_PATH="$(echo "$DATABASE_URL" | sed -n 's#^file:##p')"
DB_DIR="$(dirname "${DB_PATH:-/data/auto-tracker.db}")"

echo "[entrypoint] Using PUID=$PUID PGID=$PGID"

# Create (or reuse) a group/user matching the requested PGID/PUID so files
# written to a bind-mounted /data are owned by something the host expects
# (e.g. Unraid's nobody:users) rather than root.
if ! getent group "$PGID" >/dev/null 2>&1; then
  addgroup -g "$PGID" appgroup
fi
GROUP_NAME="$(getent group "$PGID" | cut -d: -f1)"

if ! getent passwd "$PUID" >/dev/null 2>&1; then
  adduser -D -H -u "$PUID" -G "$GROUP_NAME" appuser
fi
USER_NAME="$(getent passwd "$PUID" | cut -d: -f1)"

mkdir -p "$DB_DIR" "$UPLOADS_DIR"
chown -R "$PUID:$PGID" /data

echo "[entrypoint] Running database migrations..."
su-exec "$PUID:$PGID" node_modules/.bin/prisma migrate deploy

echo "[entrypoint] Seeding first admin user (no-op if users already exist)..."
su-exec "$PUID:$PGID" node_modules/.bin/prisma db seed

echo "[entrypoint] Starting Auto Tracker as $USER_NAME ($PUID:$PGID)..."
exec su-exec "$PUID:$PGID" "$@"
