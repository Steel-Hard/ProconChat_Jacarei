#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ] || [ -z "$1" ]; then
    echo "uso: $0 <tag-da-imagem>" >&2
    exit 2
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export IMAGE_TAG="$1"
WAIT_TIMEOUT="${DEPLOY_WAIT_TIMEOUT:-300}"
compose=(docker compose -f compose.prod.yaml)

env_value() {
    if [ -f .env ]; then
        grep -E "^$1=" .env | tail -n 1 | cut -d= -f2- | tr -d "\"'"
    fi
}

SITE_ADDRESS="${SITE_ADDRESS:-$(env_value SITE_ADDRESS)}"
if [ -z "$SITE_ADDRESS" ]; then
    echo "SITE_ADDRESS não definido no .env" >&2
    exit 1
fi

wait_healthy() {
    local service="$1"
    local deadline=$((SECONDS + WAIT_TIMEOUT))
    local health
    while true; do
        health="$("${compose[@]}" ps --format '{{.Health}}' "$service" 2>/dev/null || true)"
        if [ "$health" = "healthy" ]; then
            echo "$service healthy"
            return 0
        fi
        if [ "$SECONDS" -ge "$deadline" ]; then
            echo "$service não ficou healthy em ${WAIT_TIMEOUT}s (estado: ${health:-ausente})" >&2
            "${compose[@]}" ps -a >&2 || true
            return 1
        fi
        sleep 5
    done
}

curl_options=(--silent --output /dev/null --write-out '%{http_code}' --max-time 15)
if [ "${SITE_ADDRESS%%:*}" = "localhost" ]; then
    curl_options+=(--insecure)
fi

check_status() {
    local path="$1"
    local expected="$2"
    local url="https://${SITE_ADDRESS}${path}"
    local status=""
    local attempt
    for attempt in $(seq 1 12); do
        status="$(curl "${curl_options[@]}" "$url" || true)"
        if [ "$status" = "$expected" ]; then
            echo "$url respondeu $status"
            return 0
        fi
        echo "tentativa $attempt: $url respondeu ${status:-sem resposta}, esperado $expected" >&2
        sleep 5
    done
    return 1
}

"${compose[@]}" pull
"${compose[@]}" up -d --remove-orphans

wait_healthy backend
wait_healthy gateway

check_status / 200
check_status /webhooks/whatsapp 403

printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$IMAGE_TAG" >> releases.log
docker image prune -f
echo "deploy de $IMAGE_TAG concluído"
