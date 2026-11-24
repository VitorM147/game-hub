#!/usr/bin/env bash
# Publica o port JavaScript do ORION em public/games/rescue-robot/web/.
# Não precisa de internet nem de ferramentas extras: são só arquivos estáticos.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=game-sources/rescue-robot/js-port
DEST=public/games/rescue-robot/web
rm -rf "$DEST"
mkdir -p "$DEST/sounds"
cp "$SRC/index.html" "$SRC/game.js" "$DEST/"
cp "$SRC"/sounds/*.wav "$DEST/sounds/"
echo "Jogo publicado em $DEST"
