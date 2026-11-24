#!/usr/bin/env bash
# Gera a versão web (WebAssembly) do ORION / Rescue Robot com pygbag e publica em
# public/games/rescue-robot/web/. Requer Python 3.10+, pip e acesso à internet
# (o pygbag baixa o template e o ambiente de execução em pygame-web.github.io).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/game-sources/rescue-robot/web-port"
DEST="$ROOT/public/games/rescue-robot/web"
PY="${PYTHON:-python3}"

command -v "$PY" >/dev/null || { echo "Python não encontrado. Defina PYTHON=/caminho/do/python"; exit 1; }
"$PY" -m pygbag --version >/dev/null 2>&1 || "$PY" -m pip install --user pygbag

# A pasta de trabalho precisa se chamar "rescue-robot": o pygbag nomeia o pacote (.apk) pela pasta.
STAGE="$(mktemp -d)/rescue-robot"
mkdir -p "$STAGE/assets"
cp "$SRC/main.py" "$STAGE/"
cp -r "$SRC/src" "$STAGE/src"
cp -r "$SRC/assets/sons" "$STAGE/assets/sons"
find "$STAGE" -name '__pycache__' -type d -prune -exec rm -rf {} +

"$PY" -m pygbag --build "$STAGE"

[ -f "$STAGE/build/web/index.html" ] || { echo "O pygbag não gerou index.html (sem acesso ao CDN?)."; exit 1; }

rm -rf "$DEST"
mkdir -p "$DEST"
cp -r "$STAGE/build/web/." "$DEST/"
echo "Versão web publicada em public/games/rescue-robot/web/. Rode 'npm run build' para o portal passar a marcá-la como jogável."
