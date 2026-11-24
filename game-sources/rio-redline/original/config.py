import copy
import os

from armazenamento import grava_json, le_json, pasta_dados

PADRAO = {'tela_cheia': False, 'volume': 70}


def caminho_config():
    return os.path.join(pasta_dados(), 'config.json')


def carrega_config(caminho=None):
    dados = le_json(caminho or caminho_config())
    if not isinstance(dados, dict):
        return copy.deepcopy(PADRAO)
    config = {**copy.deepcopy(PADRAO), **dados}
    if not isinstance(config['tela_cheia'], bool):
        config['tela_cheia'] = PADRAO['tela_cheia']
    if not isinstance(config['volume'], int) or isinstance(config['volume'], bool):
        config['volume'] = PADRAO['volume']
    config['volume'] = max(0, min(100, config['volume']))
    return config


def salva_config(config, caminho=None):
    grava_json(caminho or caminho_config(), config)
