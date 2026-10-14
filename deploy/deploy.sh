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
        { grep -E "^$1=" .env || true; } | tail -n 1 | cut -d= -f2- | tr -d "\"'"
    fi
}

SITE_ADDRESS="${SITE_ADDRESS:-$(env_value SITE_ADDRESS)}"
if [ -z "$SITE_ADDRESS" ]; then
    echo "SITE_ADDRESS não definido no .env" >&2
    exit 1
fi

text_chars() {
    printf '%s' "$1" | LC_ALL=C tr -d '\200-\277' | LC_ALL=C wc -c
}

text_bytes() {
    printf '%s' "$1" | LC_ALL=C wc -c
}

auth_token_secret="${AUTH_TOKEN_SECRET:-$(env_value AUTH_TOKEN_SECRET)}"
encryption_key="${ENCRYPTION_KEY:-$(env_value ENCRYPTION_KEY)}"
root_email="${ROOT_EMAIL:-$(env_value ROOT_EMAIL)}"
root_password="${ROOT_PASSWORD:-$(env_value ROOT_PASSWORD)}"
invalid_auth=0
if [ "$(($(text_chars "$auth_token_secret")))" -lt 32 ]; then
    echo "AUTH_TOKEN_SECRET no .env precisa ter 32 ou mais caracteres (gere com openssl rand -hex 32)" >&2
    invalid_auth=1
fi
if ! printf '%s' "$encryption_key" | grep -Eq '^[0-9a-fA-F]{64}$'; then
    echo "ENCRYPTION_KEY no .env precisa ter exatamente 64 caracteres hexadecimais (gere com openssl rand -hex 32)" >&2
    invalid_auth=1
fi
if [ -z "$(printf '%s' "$root_email" | tr -d '[:space:]')" ]; then
    echo "ROOT_EMAIL não definido no .env" >&2
    invalid_auth=1
fi
if [ "$(($(text_chars "$root_password")))" -lt 8 ] || [ "$(($(text_bytes "$root_password")))" -gt 72 ]; then
    echo "ROOT_PASSWORD no .env precisa ter de 8 caracteres a 72 bytes" >&2
    invalid_auth=1
fi
unset auth_token_secret encryption_key root_email root_password
if [ "$invalid_auth" -ne 0 ]; then
    echo "deploy abortado antes de baixar imagens ou recriar containers" >&2
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

"${compose[@]}" pull --policy missing
"${compose[@]}" up -d --remove-orphans

wait_healthy backend
wait_healthy gateway
"${compose[@]}" exec -T caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile

check_status / 200
check_status /webhooks/whatsapp 403

printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$IMAGE_TAG" >> releases.log
docker image prune -af --filter "until=168h"
echo "deploy de $IMAGE_TAG concluído"
