"""Leitura e gravação do recorde (maior pontuação).

No desktop usa o arquivo recorde.txt. No navegador (pygbag/emscripten) usa o
localStorage, para o recorde sobreviver ao recarregamento da página.
"""
import sys

from .config import ARQUIVO_RECORDE

CHAVE_WEB = "rescue-robot:recorde"
WEB = sys.platform == "emscripten"


def carregar_recorde():
    if WEB:
        try:
            import platform
            return int(platform.window.localStorage.getItem(CHAVE_WEB) or 0)
        except Exception:
            return 0
    try:
        return int(ARQUIVO_RECORDE.read_text(encoding="utf-8").strip() or 0)
    except (OSError, ValueError):
        # Arquivo ainda não existe ou foi corrompido: começa do zero.
        return 0


def salvar_recorde(pontos):
    if WEB:
        try:
            import platform
            platform.window.localStorage.setItem(CHAVE_WEB, str(pontos))
        except Exception:
            pass
        return
    try:
        ARQUIVO_RECORDE.write_text(str(pontos), encoding="utf-8")
    except OSError:
        pass  # sem permissão de escrita: o jogo segue sem salvar
