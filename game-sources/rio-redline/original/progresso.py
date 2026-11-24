import copy
import os

from armazenamento import grava_json, le_json, pasta_dados
from carros import CARROS

SAVE_LEGADO = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'save.json')
PADRAO = {
    'moedas': 0,
    'recorde': 0,
    'desbloqueados': [CARROS[0]['id']],
    'selecionado': CARROS[0]['id'],
    'melhorias': {},
}
IDS_CARROS = {carro['id'] for carro in CARROS}
IDS_ATRIBUTOS = set(CARROS[0]['atributos'])
MELHORIAS_LIMITE = 3


def _valida_melhorias(melhorias):
    if not isinstance(melhorias, dict):
        return {}
    validas = {}
    for id_carro, por_atributo in melhorias.items():
        if id_carro not in IDS_CARROS or not isinstance(por_atributo, dict):
            continue
        limpas = {atributo: quantidade for atributo, quantidade in por_atributo.items()
                  if atributo in IDS_ATRIBUTOS and isinstance(quantidade, int)
                  and not isinstance(quantidade, bool) and 0 < quantidade <= MELHORIAS_LIMITE}
        if limpas:
            validas[id_carro] = limpas
    return validas


def caminho_save():
    return os.path.join(pasta_dados(), 'save.json')


def _valida(dados):
    progresso = {**copy.deepcopy(PADRAO), **dados}
    if not isinstance(progresso['moedas'], int) or progresso['moedas'] < 0:
        progresso['moedas'] = PADRAO['moedas']
    if not isinstance(progresso['recorde'], int) or progresso['recorde'] < 0:
        progresso['recorde'] = PADRAO['recorde']
    desbloqueados = [i for i in progresso['desbloqueados'] if i in IDS_CARROS]
    progresso['desbloqueados'] = desbloqueados or list(PADRAO['desbloqueados'])
    if progresso['selecionado'] not in progresso['desbloqueados']:
        progresso['selecionado'] = progresso['desbloqueados'][0]
    progresso['melhorias'] = _valida_melhorias(progresso['melhorias'])
    return progresso


def carrega(caminho=None):
    if caminho is not None:
        dados = le_json(caminho)
    else:
        dados = le_json(caminho_save())
        if dados is None and os.path.exists(SAVE_LEGADO):
            dados = le_json(SAVE_LEGADO, renomeia_corrompido=False)
    if not isinstance(dados, dict):
        return copy.deepcopy(PADRAO)
    return _valida(dados)


def salva(progresso, caminho=None):
    grava_json(caminho or caminho_save(), progresso)


def pontuacao(distancia, ultrapassagens, bonus=0):
    return int(distancia / 10) + 50 * ultrapassagens + int(bonus)


def moedas_ganhas(distancia):
    return int(distancia // 100)
