#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"

if [ "$#" -gt 0 ]; then
    arquivos=()
    for nome in "$@"; do
        nome="${nome##*/}"
        arquivos+=("$DIR/${nome%.md}.md")
    done
else
    arquivos=("$DIR"/*.md)
fi

for arquivo in "${arquivos[@]}"; do
    if [ ! -f "$arquivo" ]; then
        echo "arquivo não encontrado: $arquivo" >&2
        exit 1
    fi
done

for comando in node npx; do
    if ! command -v "$comando" >/dev/null 2>&1; then
        echo "$comando não encontrado; instale o Node.js 20 ou mais novo" >&2
        exit 1
    fi
done

if [ -z "${CHROME_PATH:-}" ]; then
    for candidato in google-chrome google-chrome-stable chromium chromium-browser; do
        if command -v "$candidato" >/dev/null 2>&1; then
            CHROME_PATH="$(command -v "$candidato")"
            break
        fi
    done
fi

if [ -z "${CHROME_PATH:-}" ] || [ ! -x "$CHROME_PATH" ]; then
    echo "Chrome ou Chromium não encontrado; instale um deles ou defina CHROME_PATH" >&2
    exit 1
fi

for arquivo in "${arquivos[@]}"; do
    pdf="${arquivo%.md}.pdf"
    echo "Gerando $(basename "$pdf")"
    node "$DIR/gerar-pdf.mjs" "$arquivo" "$pdf" "$CHROME_PATH"
done
