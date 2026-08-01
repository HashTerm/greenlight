#!/bin/sh
# Align an existing Postgres data directory to POSTGRES_USER / POSTGRES_DB / POSTGRES_PASSWORD
# from the current environment (same vars used by docker-compose.self-host*.yml).
#
# Run inside the postgres container:
#   docker exec -i <postgres-container> sh < scripts/align-postgres-env.sh

set -e

target_user="${POSTGRES_USER:?POSTGRES_USER is required}"
target_db="${POSTGRES_DB:?POSTGRES_DB is required}"
target_password="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"

psql_as() {
  role="$1"
  db="$2"
  shift 2
  psql -v ON_ERROR_STOP=1 -U "$role" -d "$db" "$@"
}

role_exists() {
  psql_as "$1" postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname = '$2'" | grep -q 1
}

database_exists() {
  psql_as "$1" postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$2'" | grep -q 1
}

discover_superuser() {
  if [ -n "$ALIGN_SOURCE_USER" ] && psql_as "$ALIGN_SOURCE_USER" postgres -c "SELECT 1" >/dev/null 2>&1; then
    echo "$ALIGN_SOURCE_USER"
    return 0
  fi

  for candidate in greenlight postgres "$target_user"; do
    if psql_as "$candidate" postgres -c "SELECT 1" >/dev/null 2>&1; then
      echo "$candidate"
      return 0
    fi
    if psql_as "$candidate" "$candidate" -c "SELECT 1" >/dev/null 2>&1; then
      echo "$candidate"
      return 0
    fi
  done

  echo "Could not connect as a local superuser. Set ALIGN_SOURCE_USER to the existing role." >&2
  return 1
}

discover_app_database() {
  superuser="$1"
  for db in greenlight "$superuser" "$target_db"; do
    if database_exists "$superuser" "$db"; then
      echo "$db"
      return 0
    fi
  done
  psql_as "$superuser" postgres -tAc "
    SELECT datname FROM pg_database
    WHERE datistemplate = false AND datname NOT IN ('postgres')
    ORDER BY datname LIMIT 1
  "
}

if psql_as "$target_user" "$target_db" -c "SELECT 1" >/dev/null 2>&1; then
  echo "Already aligned: role=$target_user database=$target_db"
  psql_as "$target_user" postgres -c "ALTER ROLE \"$target_user\" PASSWORD '$target_password';"
  echo "Updated password for role $target_user"
  exit 0
fi

superuser="$(discover_superuser)"
echo "Using bootstrap superuser: $superuser"

source_user="$superuser"
if [ "$source_user" = "$target_user" ]; then
  :
elif role_exists "$superuser" "$target_user"; then
  echo "Target role $target_user already exists; skipping rename from $source_user"
  source_user="$target_user"
else
  echo "Renaming role $source_user -> $target_user"
  psql_as "$superuser" postgres -c "ALTER ROLE \"$source_user\" RENAME TO \"$target_user\";"
  superuser="$target_user"
  source_user="$target_user"
fi

psql_as "$superuser" postgres -c "ALTER ROLE \"$target_user\" PASSWORD '$target_password';"

if database_exists "$superuser" "$target_db"; then
  echo "Target database $target_db already exists"
else
  source_db="$(discover_app_database "$superuser")"
  if [ -z "$source_db" ]; then
    echo "No application database found to rename. Create $target_db manually." >&2
    exit 1
  fi
  if [ "$source_db" != "$target_db" ]; then
    echo "Renaming database $source_db -> $target_db"
    psql_as "$superuser" postgres -c "
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '$source_db' AND pid <> pg_backend_pid();
    " >/dev/null 2>&1 || true
    psql_as "$superuser" postgres -c "ALTER DATABASE \"$source_db\" RENAME TO \"$target_db\";"
  fi
fi

psql_as "$target_user" "$target_db" -c "SELECT 1" >/dev/null
echo "Aligned: role=$target_user database=$target_db"
