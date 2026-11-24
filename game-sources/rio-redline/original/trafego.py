import random

from pista import LARGURA_PISTA, NPC_LARGURA_MUNDO, PROFUNDIDADE_FRENTE_JOGADOR, PROFUNDIDADE_JOGADOR, meia_largura_jogador

VEL_NPC = 4000
FOLGA_LATERAL = 0.85
COMPRIMENTO_CARRO = PROFUNDIDADE_FRENTE_JOGADOR - PROFUNDIDADE_JOGADOR
MEIA_LARGURA_NPC = NPC_LARGURA_MUNDO / 2 / LARGURA_PISTA
FOLGA_RASPANDO = 0.2


def largura_colisao(meia_largura_carro):
    return FOLGA_LATERAL * (meia_largura_carro + MEIA_LARGURA_NPC)


LARGURA_COLISAO = largura_colisao(meia_largura_jogador())
DANO = 20
COOLDOWN = 1.0
LIMITE_FAIXA = 0.8
VEL_TROCA_FAIXA = 0.35
CHANCE_TROCA_FAIXA = 0.3
ESPACO_SEGURO = 900
SEPARACAO_LATERAL = 0.35
DISTANCIA_NIVEL = 60000
NIVEL_MAX = 10
NIVEL_TROCA_FAIXA = 3
SURGIMENTO_MIN, SURGIMENTO_MAX = 40000, 48000
TENTATIVAS_SURGIMENTO = 12

_rng = random.Random()


class Npc:
    def __init__(self, pos, x, imagem, troca_faixa=False):
        self.pos = pos
        self.x = x
        self.alvo_x = x
        self.imagem = imagem
        self.troca_faixa = troca_faixa
        self.cooldown = 0.0
        self.dz_anterior = None
        self.bateu_recente = False

    def atualiza(self, dt, comprimento):
        self.pos = (self.pos + VEL_NPC * dt) % comprimento
        self.cooldown = max(0.0, self.cooldown - dt)
        passo = VEL_TROCA_FAIXA * dt
        self.x += max(-passo, min(passo, self.alvo_x - self.x))


def _dz(a, b, comprimento):
    return (b - a + comprimento / 2) % comprimento - comprimento / 2


def caminho_livre(npc, alvo, trafego, comprimento):
    menor, maior = sorted((npc.x, alvo))
    for outro in trafego:
        if outro is npc or abs(_dz(npc.pos, outro.pos, comprimento)) > ESPACO_SEGURO:
            continue
        for x_outro in (outro.x, outro.alvo_x):
            if menor - SEPARACAO_LATERAL < x_outro < maior + SEPARACAO_LATERAL:
                return False
    return True


def atualiza_trafego(trafego, dt, comprimento):
    for npc in trafego:
        if npc.troca_faixa and abs(npc.alvo_x - npc.x) < 0.01 and _rng.random() < CHANCE_TROCA_FAIXA * dt:
            alvo = _rng.uniform(-LIMITE_FAIXA, LIMITE_FAIXA)
            if caminho_livre(npc, alvo, trafego, comprimento):
                npc.alvo_x = alvo
        npc.atualiza(dt, comprimento)


def nivel_para(distancia):
    return min(NIVEL_MAX, 1 + int(distancia // DISTANCIA_NIVEL))


def quantidade_para(nivel):
    return 10 + 2 * nivel


def monta_trafego(comprimento, total_imagens, semente=3):
    rng = random.Random(semente)
    quantidade = quantidade_para(1)
    espaco = comprimento / (quantidade + 1)
    return [
        Npc((k + 1) * espaco, rng.uniform(-LIMITE_FAIXA, LIMITE_FAIXA), rng.randrange(total_imagens))
        for k in range(quantidade)
    ]


def _cria_npc_livre(trafego, carro, comprimento, total_imagens, rng, troca_faixa):
    for _ in range(TENTATIVAS_SURGIMENTO):
        novo = Npc((carro.pos + rng.uniform(SURGIMENTO_MIN, SURGIMENTO_MAX)) % comprimento,
                   rng.uniform(-LIMITE_FAIXA, LIMITE_FAIXA), rng.randrange(total_imagens), troca_faixa)
        if caminho_livre(novo, novo.x, trafego, comprimento):
            return novo
    return None


def ajusta_dificuldade(trafego, carro, comprimento, total_imagens, rng):
    nivel = nivel_para(carro.distancia)
    troca_faixa = nivel >= NIVEL_TROCA_FAIXA
    if len(trafego) < quantidade_para(nivel):
        novo = _cria_npc_livre(trafego, carro, comprimento, total_imagens, rng, troca_faixa)
        if novo is not None:
            trafego.append(novo)
    if troca_faixa:
        for npc in trafego:
            npc.troca_faixa = True
    return nivel


def distancia_relativa(carro, npc, comprimento):
    return _dz(carro.pos, npc.pos, comprimento)


def na_zona_do_jogador(dz):
    return PROFUNDIDADE_JOGADOR - COMPRIMENTO_CARRO <= dz <= PROFUNDIDADE_FRENTE_JOGADOR


def colidiu(carro, npc, comprimento):
    dz = distancia_relativa(carro, npc, comprimento)
    return na_zona_do_jogador(dz) and abs(npc.x - carro.x) < largura_colisao(carro.meia_largura)


def conta_ultrapassagem(carro, npc, comprimento):
    dz = distancia_relativa(carro, npc, comprimento) - PROFUNDIDADE_JOGADOR
    anterior, npc.dz_anterior = npc.dz_anterior, dz
    if anterior is None or not (anterior > 0 >= dz) or abs(anterior - dz) > comprimento / 4:
        return 0
    bateu, npc.bateu_recente = npc.bateu_recente, False
    return 0 if bateu else 1


def raspou(carro, npc):
    return abs(npc.x - carro.x) < largura_colisao(carro.meia_largura) + FOLGA_RASPANDO
