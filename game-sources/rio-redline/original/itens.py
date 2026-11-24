from carro import NITRO_MAX
from pista import LARGURA_BURACO, LARGURA_ITEM, LARGURA_PISTA, PROFUNDIDADE_JOGADOR
from trafego import na_zona_do_jogador

VIDA_KIT = 25
DANO_BURACO = 10
PERDA_VELOCIDADE_BURACO = 0.35
DURACAO_CARNAVAL = 10.0
INTERVALO_ITEM = 25000
# Precisa ficar abaixo de meia pista: além disso a distância "dá a volta" e o item conta como já ultrapassado.
SURGIMENTO_MIN, SURGIMENTO_MAX = 30000, 38000
LIMITE_FAIXA = 0.8
DISTANCIA_PERDIDO = 300
PESOS = {'kit': 25, 'nitro': 30, 'blindagem': 15, 'carnaval': 15, 'buraco': 25}


def largura_coleta(tipo, carro):
    largura_item = LARGURA_BURACO if tipo == 'buraco' else LARGURA_ITEM
    return carro.meia_largura + largura_item / 2 / LARGURA_PISTA


class Item:
    def __init__(self, pos, x, tipo):
        self.pos = pos
        self.x = x
        self.tipo = tipo


def tipos_disponiveis(carro):
    tipos = ['buraco']
    if carro.vida < 100:
        tipos.append('kit')
    if carro.nitro < NITRO_MAX:
        tipos.append('nitro')
    if not carro.blindado:
        tipos.append('blindagem')
    if carro.carnaval <= 0:
        tipos.append('carnaval')
    return tipos


def aplica(carro, tipo):
    if tipo == 'kit':
        carro.cura(VIDA_KIT)
    elif tipo == 'nitro':
        carro.enche_nitro()
    elif tipo == 'blindagem':
        carro.blindado = True
    elif tipo == 'carnaval':
        carro.carnaval = DURACAO_CARNAVAL
    elif carro.sofre_dano(DANO_BURACO, PERDA_VELOCIDADE_BURACO):
        return 'buraco_blindado'
    return tipo


class GerenciadorItens:
    def __init__(self):
        self.itens = []
        self.proximo = INTERVALO_ITEM

    def _dz(self, carro, item, comprimento):
        return (item.pos - carro.pos + comprimento / 2) % comprimento - comprimento / 2

    def _sorteia(self, carro, comprimento, rng):
        tipos = tipos_disponiveis(carro)
        tipo = rng.choices(tipos, [PESOS[t] for t in tipos])[0]
        pos = (carro.pos + rng.uniform(SURGIMENTO_MIN, SURGIMENTO_MAX)) % comprimento
        self.itens.append(Item(pos, rng.uniform(-LIMITE_FAIXA, LIMITE_FAIXA), tipo))
        self.proximo = carro.distancia + INTERVALO_ITEM

    def atualiza(self, carro, comprimento, rng):
        if not self.itens and carro.distancia >= self.proximo:
            self._sorteia(carro, comprimento, rng)

        eventos = []
        restantes = []
        for item in self.itens:
            dz = self._dz(carro, item, comprimento)
            if na_zona_do_jogador(dz) and abs(item.x - carro.x) < largura_coleta(item.tipo, carro):
                eventos.append(aplica(carro, item.tipo))
            elif dz > PROFUNDIDADE_JOGADOR - DISTANCIA_PERDIDO:
                restantes.append(item)
        self.itens = restantes
        return eventos
