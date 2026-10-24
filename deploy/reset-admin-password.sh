#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 0 ]; then
    echo "uso: $0" >&2
    exit 2
fi

if [ ! -t 0 ]; then
    echo "rode este script em um terminal interativo" >&2
    exit 2
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

text_chars() {
    printf '%s' "$1" | LC_ALL=C tr -d '\200-\277' | LC_ALL=C wc -c
}

text_bytes() {
    printf '%s' "$1" | LC_ALL=C wc -c
}

if [ ! -f compose.prod.yaml ] || [ ! -f .env ]; then
    echo "compose.prod.yaml e .env precisam existir em $ROOT" >&2
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

new_password=""
repeat_password=""
trap 'unset new_password repeat_password' EXIT

echo "Redefinição da senha da conta Admin (tag $IMAGE_TAG)."
echo "A senha nova precisa ter de 8 caracteres a 72 bytes."
echo "Todas as sessões abertas do Admin serão encerradas."
echo

read -r -s -p "Senha nova: " new_password
echo
read -r -s -p "Repita a senha nova: " repeat_password
echo

if [ "$new_password" != "$repeat_password" ]; then
    echo "as senhas não são iguais; nada foi alterado" >&2
    exit 1
fi

if [ "$(($(text_chars "$new_password")))" -lt 8 ]; then
    echo "a senha precisa ter pelo menos 8 caracteres; nada foi alterado" >&2
    exit 1
fi

if [ "$(($(text_bytes "$new_password")))" -gt 72 ]; then
    echo "a senha não pode passar de 72 bytes; nada foi alterado" >&2
    exit 1
fi

if ! ROOT_PASSWORD="$new_password" docker compose -f compose.prod.yaml run --rm seed node dist/db/scripts/resetAdminPassword.js; then
    echo "não foi possível redefinir a senha do Admin; veja a mensagem acima" >&2
    exit 1
fi

echo
echo "Senha do Admin redefinida. O e-mail do Admin não mudou."
echo "Entre no painel com a senha nova."
