import json
import os
import sys

NOME_PASTA = 'NitroCarioca'
NOME_PASTA_ANTIGA = 'CorridaNeon'


def _base_dados():
    if sys.platform == 'darwin':
        return os.path.expanduser('~/Library/Application Support')
    if sys.platform.startswith('win'):
        return os.environ.get('APPDATA') or os.path.expanduser('~')
    return os.environ.get('XDG_DATA_HOME') or os.path.expanduser('~/.local/share')


def migra_pasta(antiga, nova):
    if os.path.isdir(antiga) and not os.path.exists(nova):
        os.replace(antiga, nova)


def pasta_dados():
    base = _base_dados()
    pasta = os.path.join(base, NOME_PASTA)
    migra_pasta(os.path.join(base, NOME_PASTA_ANTIGA), pasta)
    os.makedirs(pasta, exist_ok=True)
    return pasta


def le_json(caminho, renomeia_corrompido=True):
    if not os.path.exists(caminho):
        return None
    try:
        with open(caminho, encoding='utf-8') as arquivo:
            return json.load(arquivo)
    except (OSError, ValueError):
        if renomeia_corrompido:
            try:
                os.replace(caminho, caminho + '.corrompido')
            except OSError:
                pass
        return None


def grava_json(caminho, dados):
    temporario = caminho + '.tmp'
    with open(temporario, 'w', encoding='utf-8') as arquivo:
        json.dump(dados, arquivo, ensure_ascii=False, indent=2)
    os.replace(temporario, caminho)
