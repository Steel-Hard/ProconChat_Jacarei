#!/usr/bin/env bash
set -euo pipefail
umask 077

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

env_value() {
    if [ -f .env ]; then
        grep -E "^$1=" .env | tail -n 1 | cut -d= -f2- | tr -d "\"'"
    fi
}

RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-$(env_value BACKUP_RETENTION_DAYS)}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
if ! [[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]]; then
    echo "BACKUP_RETENTION_DAYS inválido: $RETENTION_DAYS" >&2
    exit 1
fi

if [ -z "${IMAGE_TAG:-}" ] && [ -f releases.log ]; then
    IMAGE_TAG="$(tail -n 1 releases.log | cut -d' ' -f2)"
fi
if [ -z "${IMAGE_TAG:-}" ]; then
    echo "nenhum deploy registrado em releases.log; defina IMAGE_TAG" >&2
    exit 1
fi
export IMAGE_TAG

BACKUP_DIR="$ROOT/backups"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

final="$BACKUP_DIR/proconchat-$(date +%F).dump"
partial="$(mktemp "$BACKUP_DIR/.proconchat-XXXXXX.partial")"
trap 'rm -f "$partial"' EXIT

docker compose -f compose.prod.yaml exec -T postgres \
    sh -c 'pg_dump -Fc -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > "$partial"

if [ ! -s "$partial" ]; then
    echo "pg_dump não gerou dados" >&2
    exit 1
fi

chmod 600 "$partial"
mv "$partial" "$final"
echo "backup criado em $final"

find "$BACKUP_DIR" -maxdepth 1 -type f -name 'proconchat-*.dump' -mtime +"$RETENTION_DAYS" -print -delete
