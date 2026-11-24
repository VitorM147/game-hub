import os

PASTA_ASSETS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets')
ARQUIVOS_NPC = [f'npc_{i}.png' for i in range(1, 7)]


def _atributos(velocidade, aceleracao, nitro, resistencia):
    return {'velocidade': velocidade, 'aceleracao': aceleracao, 'nitro': nitro, 'resistencia': resistencia}


CARROS = [
    {'id': 'veilside', 'nome': 'Veilside RX-7', 'arquivo': 'carro.png', 'preco': 0,
     'atributos': _atributos(3, 3, 3, 3)},
    {'id': 'skyline', 'nome': 'R34 Skyline', 'arquivo': 'skyline_r34.png', 'preco': 300,
     'atributos': _atributos(4, 4, 3, 4)},
    {'id': 'supra', 'nome': 'Supra MK4', 'arquivo': 'supra_mk4.png', 'preco': 500,
     'atributos': _atributos(5, 4, 4, 3)},
    {'id': 'troller', 'nome': 'Troller T4', 'arquivo': 'troller.png', 'preco': 800,
     'atributos': _atributos(4, 4, 3, 7)},
    {'id': 'lfa', 'nome': 'LFA-EXP', 'arquivo': 'lfa.png', 'preco': 1500,
     'atributos': _atributos(6, 5, 4, 4)},
    {'id': 'delorean', 'nome': 'Cyber-DeLorean', 'arquivo': 'delorean.png', 'preco': 3000,
     'atributos': _atributos(6, 5, 7, 4)},
    {'id': 'pedra', 'nome': 'Flintstones', 'arquivo': 'pedra.png', 'preco': 5000,
     'atributos': _atributos(3, 3, 3, 9)},
    {'id': 'ovni', 'nome': 'NLO-ET', 'arquivo': 'ovni.png', 'preco': 8000,
     'atributos': _atributos(8, 7, 7, 5)},
    {'id': 'uno', 'nome': 'Uno com Escada', 'arquivo': 'uno_escada.png', 'preco': 15000,
     'atributos': _atributos(9, 9, 9, 9)},
]


def caminho_asset(arquivo):
    return os.path.join(PASTA_ASSETS, arquivo)


def carro_por_id(identificador):
    return next(carro for carro in CARROS if carro['id'] == identificador)
