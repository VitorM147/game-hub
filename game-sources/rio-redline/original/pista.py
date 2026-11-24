import functools
import math
import random

import pygame

LARGURA, ALTURA = 960, 540
ESCALA_X = LARGURA / 2
ESCALA_Y = ESCALA_X * 0.75
TAM_SEGMENTO = 200
LARGURA_PISTA = 2000
ALTURA_CAMERA = 1000
PROFUNDIDADE_CAMERA = 0.84
DISTANCIA_DESENHO = 250
LARGURA_REFERENCIA_CARRO = 230
DISTANCIA_REFERENCIA = 1000
NPC_LARGURA_MUNDO = LARGURA_REFERENCIA_CARRO * DISTANCIA_REFERENCIA / (PROFUNDIDADE_CAMERA * ESCALA_X)
LARGURA_ITEM = NPC_LARGURA_MUNDO * 0.35
LARGURA_BURACO = NPC_LARGURA_MUNDO * 0.6
BASE_JOGADOR_Y = ALTURA - 8
ALTURA_CONTATO_JOGADOR = 90
# Sprites muito próximos da câmera crescem sem limite pela perspectiva; esse teto evita criar imagens gigantes.
LARGURA_MAXIMA_SPRITE = 2 * LARGURA


def profundidade_na_tela(y_tela):
    return PROFUNDIDADE_CAMERA * ALTURA_CAMERA * ESCALA_Y / (y_tela - ALTURA / 2)


PROFUNDIDADE_JOGADOR = profundidade_na_tela(BASE_JOGADOR_Y)
PROFUNDIDADE_FRENTE_JOGADOR = profundidade_na_tela(BASE_JOGADOR_Y - ALTURA_CONTATO_JOGADOR)


def meia_largura_para(largura_px):
    escala = PROFUNDIDADE_CAMERA / PROFUNDIDADE_JOGADOR
    return (largura_px / 2) / (escala * LARGURA_PISTA * ESCALA_X)


def meia_largura_jogador():
    return meia_largura_para(LARGURA_REFERENCIA_CARRO)

TRECHOS = [
    (60, 0, 0),
    (40, 0, 20),
    (50, 3, 0),
    (40, 0, -20),
    (60, -3, 0),
    (65, 2, 0),
    (40, 0, 0),
    (50, -2, 0),
]

CORES = {
    False: {'grama': (14, 60, 40), 'rumble': (240, 240, 240), 'asfalto': (62, 58, 66)},
    True: {'grama': (18, 72, 48), 'rumble': (230, 60, 60), 'asfalto': (72, 68, 76)},
}

CORES_POR_PAR = (CORES[False], CORES[True])

PREDIOS = [(236, 206, 160), (214, 180, 140), (240, 232, 214), (190, 222, 214)]
PROBABILIDADE_DECOR = 0.07
TIPOS_DECOR = ['palmeira', 'poste', 'casa', 'placa']
PESOS_DECOR = [0.3, 0.3, 0.25, 0.15]


class Pista(list):
    """Lista de segmentos com alturas, curvas e decoração já separadas, para o laço de desenho não consultar dicionários."""

    def __init__(self, segmentos):
        super().__init__(segmentos)
        self.ys = [segmento['y'] for segmento in self]
        self.curvas = [segmento['curva'] for segmento in self]
        self.decor = [decor_do_segmento(i) for i in range(len(self))]


def monta_pista():
    segmentos = []
    y = 0
    for quantidade, curva, subida in TRECHOS:
        for _ in range(quantidade):
            segmentos.append({'curva': curva, 'y': y})
            y += subida
    return Pista(segmentos)


@functools.lru_cache(maxsize=None)
def decor_do_segmento(indice):
    rng = random.Random(indice * 7919 + 7)
    decor = []
    for lado in (-1, 1):
        if rng.random() >= PROBABILIDADE_DECOR:
            continue
        tipo = rng.choices(TIPOS_DECOR, PESOS_DECOR)[0]
        item = {'tipo': tipo, 'x': lado * rng.randint(2300, 3100), 'altura': rng.randint(900, 1400)}
        if tipo == 'casa':
            item.update(largura=rng.randint(500, 800), altura=rng.randint(350, 600), cor=rng.choice(PREDIOS))
        decor.append(item)
    return tuple(decor)


def projeta(z, mundo_x, mundo_y, cam_x, cam_y, cam_z):
    profundidade = z - cam_z
    if profundidade <= PROFUNDIDADE_CAMERA:
        return None
    escala = PROFUNDIDADE_CAMERA / profundidade
    sx = LARGURA / 2 + escala * (mundo_x - cam_x) * ESCALA_X
    sy = ALTURA / 2 - escala * (mundo_y - cam_y) * ESCALA_Y
    return sx, sy, escala


def retangulo(x, y, w, h):
    return (int(x), int(y), max(1, int(w)), max(1, int(h)))


def desenha_palmeira(tela, sx, sy, esc, altura_mundo):
    altura = esc * altura_mundo * ESCALA_Y
    topo = (sx, sy - altura)
    espessura = max(1, int(esc * 90 * ESCALA_X))
    pygame.draw.line(tela, (96, 60, 36), (sx, sy), topo, espessura)
    raio = max(3, esc * 600 * ESCALA_X)
    for angulo in (160, 200, 250, 290, 340):
        rad = math.radians(angulo)
        ponta = (topo[0] + math.cos(rad) * raio, topo[1] + math.sin(rad) * raio * 0.5 + raio * 0.35)
        pygame.draw.line(tela, (30, 130, 70), topo, ponta, max(2, int(raio / 4)))


def desenha_poste(tela, sx, sy, esc, altura_mundo):
    altura = esc * altura_mundo * ESCALA_Y
    espessura = max(1, int(esc * 50 * ESCALA_X))
    pygame.draw.line(tela, (60, 60, 70), (sx, sy), (sx, sy - altura), espessura)
    pygame.draw.circle(tela, (255, 220, 150), (int(sx), int(sy - altura)), max(1, int(esc * 110 * ESCALA_X)))


def desenha_placa(tela, sx, sy, esc, altura_mundo):
    altura = esc * altura_mundo * ESCALA_Y
    espessura = max(1, int(esc * 40 * ESCALA_X))
    pygame.draw.line(tela, (60, 60, 70), (sx, sy), (sx, sy - altura), espessura)
    largura_placa = esc * 420 * ESCALA_X
    altura_placa = esc * 260 * ESCALA_Y
    pygame.draw.rect(tela, (20, 70, 150), retangulo(sx - largura_placa / 2, sy - altura, largura_placa, altura_placa))
    pygame.draw.rect(tela, (235, 235, 240), retangulo(
        sx - largura_placa / 2 + espessura, sy - altura + espessura,
        largura_placa - 2 * espessura, altura_placa - 2 * espessura,
    ), max(1, int(espessura / 2)))


def desenha_casa(tela, sx, sy, esc, largura_mundo, altura_mundo, cor):
    largura = esc * largura_mundo * ESCALA_X
    altura = esc * altura_mundo * ESCALA_Y
    pygame.draw.rect(tela, cor, retangulo(sx - largura / 2, sy - altura, largura, altura))
    telhado = tuple(int(c * 0.7) for c in cor)
    pygame.draw.rect(tela, telhado, retangulo(sx - largura / 2, sy - altura, largura, esc * 60 * ESCALA_Y))


@functools.lru_cache(maxsize=384)
def _escala_npc(imagem, largura):
    altura = max(1, round(imagem.get_height() * largura / imagem.get_width()))
    return pygame.transform.smoothscale(imagem, (largura, altura))


def desenha_npc(tela, sx, sy, esc, imagem):
    largura = max(1, int(esc * NPC_LARGURA_MUNDO * ESCALA_X))
    passo = max(1, largura // 24)
    largura = largura // passo * passo
    altura = largura * imagem.get_height() / imagem.get_width()
    fora_da_tela = sy - altura >= ALTURA or sx + largura / 2 <= 0 or sx - largura / 2 >= LARGURA
    if fora_da_tela or largura > LARGURA_MAXIMA_SPRITE:
        return
    img = _escala_npc(imagem, largura)
    tela.blit(img, (int(sx - img.get_width() / 2), int(sy - img.get_height())))


CORES_BRILHO_ITEM = {
    'kit': (60, 255, 120), 'nitro': (255, 140, 0), 'blindagem': (0, 220, 255), 'carnaval': (255, 220, 0),
}


def _brilho(tela, sx, sy, lado, cor):
    brilho = pygame.Surface((int(lado * 2), int(lado * 0.6) + 1), pygame.SRCALPHA)
    pygame.draw.ellipse(brilho, (*cor, 110), brilho.get_rect())
    tela.blit(brilho, brilho.get_rect(center=(sx, sy)))


def _desenha_kit(tela, sx, sy, lado):
    caixa = pygame.Rect(0, 0, int(lado), int(lado * 0.8))
    caixa.midbottom = (int(sx), int(sy))
    raio = max(1, int(lado * 0.12))
    pygame.draw.rect(tela, (245, 245, 245), caixa, border_radius=raio)
    pygame.draw.rect(tela, (40, 160, 70), caixa, max(1, int(lado * 0.06)), border_radius=raio)
    espessura = max(2, int(lado * 0.2))
    comprimento = max(espessura, int(lado * 0.56))
    for largura, altura in ((comprimento, espessura), (espessura, comprimento)):
        braco = pygame.Rect(0, 0, largura, altura)
        braco.center = caixa.center
        pygame.draw.rect(tela, (40, 190, 80), braco)


def _desenha_galao(tela, sx, sy, lado):
    corpo = pygame.Rect(0, 0, int(lado * 0.6), int(lado * 1.0))
    corpo.midbottom = (int(sx), int(sy))
    pygame.draw.rect(tela, (30, 90, 220), corpo, border_radius=max(1, int(lado * 0.15)))
    faixa = pygame.Rect(corpo.left, corpo.top + corpo.height * 0.4, corpo.width, max(2, corpo.height * 0.22))
    pygame.draw.rect(tela, (240, 240, 250), faixa)
    tampa = pygame.Rect(0, 0, max(2, int(corpo.width * 0.45)), max(2, int(lado * 0.18)))
    tampa.midbottom = corpo.midtop
    pygame.draw.rect(tela, (230, 40, 40), tampa)


def _desenha_escudo(tela, sx, sy, lado):
    w, h = lado * 0.9, lado * 1.0
    topo = sy - h
    pontos = [(sx - w / 2, topo), (sx + w / 2, topo), (sx + w / 2, topo + h * 0.45), (sx, sy), (sx - w / 2, topo + h * 0.45)]
    pygame.draw.polygon(tela, (180, 200, 220), pontos)
    pygame.draw.polygon(tela, (0, 200, 255), pontos, max(1, int(lado * 0.1)))
    pygame.draw.line(tela, (0, 200, 255), (sx, topo + h * 0.12), (sx, sy - h * 0.12), max(1, int(lado * 0.08)))


def _desenha_tambor(tela, sx, sy, lado):
    corpo = pygame.Rect(0, 0, int(lado), int(lado * 0.7))
    corpo.midbottom = (int(sx), int(sy))
    pygame.draw.rect(tela, (0, 150, 70), corpo)
    for k in range(1, 4):
        x = corpo.left + corpo.width * k / 4
        pygame.draw.line(tela, (255, 220, 0), (x, corpo.top), (x, corpo.bottom), max(1, int(lado * 0.06)))
    tampo = pygame.Rect(corpo.left, corpo.top - lado * 0.15, corpo.width, max(2, lado * 0.3))
    pygame.draw.ellipse(tela, (245, 240, 220), tampo)
    pygame.draw.ellipse(tela, (255, 220, 0), tampo, max(1, int(lado * 0.05)))


def _desenha_buraco(tela, sx, sy, esc):
    largura = esc * LARGURA_BURACO * ESCALA_X
    altura = max(2, largura * 0.28)
    borda = pygame.Rect(0, 0, int(largura), int(altura))
    borda.center = (int(sx), int(sy - altura / 2))
    pygame.draw.ellipse(tela, (35, 30, 38), borda)
    pygame.draw.ellipse(tela, (12, 10, 14), borda.inflate(-largura * 0.15, -altura * 0.3))


DESENHOS_ITEM = {'kit': _desenha_kit, 'nitro': _desenha_galao, 'blindagem': _desenha_escudo, 'carnaval': _desenha_tambor}


def desenha_item(tela, sx, sy, esc, tipo):
    if tipo == 'buraco':
        _desenha_buraco(tela, sx, sy, esc)
        return
    lado = esc * LARGURA_ITEM * ESCALA_X
    if lado < 2:
        return
    _brilho(tela, sx, sy, lado, CORES_BRILHO_ITEM[tipo])
    DESENHOS_ITEM[tipo](tela, sx, sy, lado)


def desenha_pista(tela, segmentos, pos, x_jogador, trafego, imagens_npc, itens=(), desenha_jogador=None):
    n = len(segmentos)
    ys = getattr(segmentos, 'ys', None) or [segmento['y'] for segmento in segmentos]
    curvas = getattr(segmentos, 'curvas', None) or [segmento['curva'] for segmento in segmentos]
    decors = getattr(segmentos, 'decor', None) or [decor_do_segmento(i) for i in range(n)]
    base = int(pos // TAM_SEGMENTO)
    fracao = (pos - base * TAM_SEGMENTO) / TAM_SEGMENTO
    cam_y = ys[base % n] + ALTURA_CAMERA
    x = 0.0
    dx = -curvas[base % n] * fracao
    maxy = ALTURA
    cam_x_jogador = x_jogador * LARGURA_PISTA
    meio_x, meio_y = LARGURA / 2, ALTURA / 2
    desenha_retangulo, desenha_poligono = pygame.draw.rect, pygame.draw.polygon

    objetos_por_seg = {}
    for tipo, lista in (('npc', trafego), ('item', itens)):
        for objeto in lista:
            objetos_por_seg.setdefault(int(objeto.pos // TAM_SEGMENTO) % n, []).append((tipo, objeto))

    sprites = []
    for i in range(DISTANCIA_DESENHO):
        indice = (base + i) % n
        z1 = (base + i) * TAM_SEGMENTO
        cam_x = cam_x_jogador - x
        x += dx
        dx += curvas[indice]

        profundidade1 = z1 - pos
        if profundidade1 <= PROFUNDIDADE_CAMERA:
            continue

        y_seg = ys[indice]
        for decor in decors[indice]:
            s = projeta(z1, decor['x'], y_seg, cam_x, cam_y, pos)
            if s is not None:
                sprites.append((z1, decor['tipo'], decor, s))

        for tipo, objeto in objetos_por_seg.get(indice, ()):
            z_objeto = z1 + objeto.pos % TAM_SEGMENTO
            s = projeta(z_objeto, objeto.x * LARGURA_PISTA, y_seg, cam_x, cam_y, pos)
            if s is not None:
                sprites.append((z_objeto, tipo, objeto, s))

        esc2 = PROFUNDIDADE_CAMERA / (z1 + TAM_SEGMENTO - pos)
        y2 = meio_y - esc2 * (ys[(indice + 1) % n] - cam_y) * ESCALA_Y
        if y2 >= maxy:
            continue

        esc1 = PROFUNDIDADE_CAMERA / profundidade1
        x1 = meio_x + esc1 * (0 - cam_x) * ESCALA_X
        y1 = meio_y - esc1 * (y_seg - cam_y) * ESCALA_Y
        x2 = meio_x + esc2 * (0 - cam_x) * ESCALA_X
        w1 = esc1 * LARGURA_PISTA * ESCALA_X
        w2 = esc2 * LARGURA_PISTA * ESCALA_X
        r1, r2 = 1.1 * w1, 1.1 * w2
        cores = CORES_POR_PAR[(indice // 3) % 2]
        desenha_retangulo(tela, cores['grama'], (0, int(y2), LARGURA, max(1, int(y1 - y2))))
        desenha_poligono(tela, cores['rumble'], [(x1 - r1, y1), (x2 - r2, y2), (x2 + r2, y2), (x1 + r1, y1)])
        desenha_poligono(tela, cores['asfalto'], [(x1 - w1, y1), (x2 - w2, y2), (x2 + w2, y2), (x1 + w1, y1)])
        maxy = y2

    sprites.sort(key=lambda item: -item[0])
    for z, tipo, objeto, (sx, sy, esc) in sprites:
        if desenha_jogador is not None and z - pos < PROFUNDIDADE_JOGADOR:
            desenha_jogador()
            desenha_jogador = None
        if tipo == 'npc':
            desenha_npc(tela, sx, sy, esc, imagens_npc[objeto.imagem])
        elif tipo == 'item':
            desenha_item(tela, sx, sy, esc, objeto.tipo)
        elif tipo == 'palmeira':
            desenha_palmeira(tela, sx, sy, esc, objeto['altura'])
        elif tipo == 'poste':
            desenha_poste(tela, sx, sy, esc, objeto['altura'])
        elif tipo == 'placa':
            desenha_placa(tela, sx, sy, esc, objeto['altura'])
        else:
            desenha_casa(tela, sx, sy, esc, objeto['largura'], objeto['altura'], objeto['cor'])
    if desenha_jogador is not None:
        desenha_jogador()
