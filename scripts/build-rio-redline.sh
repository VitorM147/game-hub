#!/usr/bin/env bash
# Publica o porte web do RIO REDLINE em public/games/rio-redline/web/ (arquivos estáticos).
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=game-sources/rio-redline/web
DEST=public/games/rio-redline/web
rm -rf "$DEST"; mkdir -p "$DEST"
cp -r "$SRC"/index.html "$SRC"/game.js "$SRC"/img "$SRC"/fonts "$DEST/"
echo "Jogo publicado em $DEST"
