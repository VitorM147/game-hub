import array
import math
import os
import random

import pygame

TAXA = 22050
NIVEIS_MOTOR = 8
TOM_MARCHA_LENTA, TOM_GIRO_ALTO = 0.6, 1.8
MARCHAS = 5
ROTACAO_APOS_TROCA = 0.45
PASTA_SONS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets', 'sons')
ARQUIVOS_MOTOR = ('motor.ogg', 'motor.wav', 'motor.mp3')


def _tom(frequencias, duracao, volume=0.5, onda='quadrada', ruido=0.0, decaimento=4.0):
    rng = random.Random(1)
    total = int(TAXA * duracao)
    amostras = array.array('h')
    fase = 0.0
    for i in range(total):
        t = i / total
        freq = frequencias[0] + (frequencias[-1] - frequencias[0]) * t
        fase += freq / TAXA
        if onda == 'quadrada':
            valor = 1.0 if (fase % 1) < 0.5 else -1.0
        else:
            valor = 2 * abs(2 * (fase % 1) - 1) - 1
        valor = valor * (1 - ruido) + rng.uniform(-1, 1) * ruido
        envelope = math.exp(-decaimento * t) * min(1.0, i / 200)
        amostra = int(valor * envelope * volume * 32767)
        amostras.append(amostra)
        amostras.append(amostra)
    return pygame.mixer.Sound(buffer=amostras.tobytes())


BATIDAS_BATUCADA = [(0.0, 'surdo'), (0.15, 'tamborim'), (0.3, 'tamborim'), (0.45, 'surdo'),
                    (0.6, 'tamborim'), (0.675, 'tamborim'), (0.75, 'tamborim'), (0.9, 'surdo')]


def _batucada():
    rng = random.Random(2)
    total = int(TAXA * 1.3)
    buffer = [0.0] * total
    for inicio, instrumento in BATIDAS_BATUCADA:
        comeco = int(inicio * TAXA)
        if instrumento == 'surdo':
            duracao, decaimento = int(TAXA * 0.35), 9.0
            som = lambda t: math.sin(2 * math.pi * (75 - 25 * t) * t)
        else:
            duracao, decaimento = int(TAXA * 0.06), 45.0
            som = lambda t: 0.5 * math.sin(2 * math.pi * 1100 * t) + 0.5 * rng.uniform(-1, 1)
        for n in range(min(duracao, total - comeco)):
            t = n / TAXA
            buffer[comeco + n] += som(t) * math.exp(-decaimento * t)
    pico = max(abs(v) for v in buffer) or 1.0
    amostras = array.array('h')
    for valor in buffer:
        amostra = int(valor / pico * 0.5 * 32767)
        amostras.append(amostra)
        amostras.append(amostra)
    return pygame.mixer.Sound(buffer=amostras.tobytes())


def tons_motor():
    razao = (TOM_GIRO_ALTO / TOM_MARCHA_LENTA) ** (1 / (NIVEIS_MOTOR - 1))
    return [TOM_MARCHA_LENTA * razao ** i for i in range(NIVEIS_MOTOR)]


def reamostra(mono, tom):
    total = len(mono)
    novo_total = max(1, round(total / tom))
    passo = total / novo_total
    saida = array.array('h')
    for i in range(novo_total):
        posicao = i * passo
        base = int(posicao)
        fracao = posicao - base
        a = mono[base % total]
        b = mono[(base + 1) % total]
        saida.append(int(a + (b - a) * fracao))
    return saida


def _caminho_motor():
    for nome in ARQUIVOS_MOTOR:
        caminho = os.path.join(PASTA_SONS, nome)
        if os.path.exists(caminho):
            return caminho
    return None


def _carrega_motores():
    caminho = _caminho_motor()
    if caminho is None:
        return []
    try:
        bruto = array.array('h', pygame.mixer.Sound(caminho).get_raw())
    except pygame.error:
        return []
    mono = array.array('h', ((bruto[i] + bruto[i + 1]) // 2 for i in range(0, len(bruto) - 1, 2)))
    return [pygame.mixer.Sound(buffer=_estereo(reamostra(mono, tom)).tobytes()) for tom in tons_motor()]


def rotacao_motor(fracao_velocidade):
    posicao = max(0.0, min(1.0, fracao_velocidade)) * MARCHAS
    marcha = min(int(posicao), MARCHAS - 1)
    dentro = posicao - marcha
    if marcha == 0:
        return dentro
    return ROTACAO_APOS_TROCA + (1 - ROTACAO_APOS_TROCA) * dentro


def _estereo(mono):
    estereo = array.array('h')
    for amostra in mono:
        estereo.append(amostra)
        estereo.append(amostra)
    return estereo


class Audio:
    def __init__(self):
        self.ativo = False
        self.sons = {}
        self.motores = []
        self.canais_motor = []
        self.motor_tocando = False
        try:
            pygame.mixer.init(frequency=TAXA, size=-16, channels=2)
        except pygame.error:
            return
        self.ativo = True
        pygame.mixer.set_num_channels(NIVEIS_MOTOR + 8)
        pygame.mixer.set_reserved(NIVEIS_MOTOR)
        self.canais_motor = [pygame.mixer.Channel(i) for i in range(NIVEIS_MOTOR)]
        self.motores = _carrega_motores()
        self.sons = {
            'batida': _tom([180, 40], 0.35, volume=0.6, ruido=0.7, decaimento=6),
            'ultrapassagem': _tom([880, 1320], 0.15, volume=0.3, onda='triangular', decaimento=3),
            'menu': _tom([660, 660], 0.06, volume=0.25, decaimento=5),
            'confirmar': _tom([520, 1040], 0.18, volume=0.3, onda='triangular', decaimento=3),
            'erro': _tom([220, 160], 0.2, volume=0.3, decaimento=4),
            'fim': _tom([440, 110], 0.9, volume=0.4, decaimento=2),
            'nitro': _tom([200, 700], 0.5, volume=0.35, ruido=0.85, decaimento=2.5),
            'raspou': _tom([700, 1400], 0.12, volume=0.3, onda='triangular', decaimento=3),
            'cura': _tom([520, 1040], 0.35, volume=0.3, onda='triangular', decaimento=2.5),
            'galao': _tom([400, 1200], 0.25, volume=0.3, onda='triangular', decaimento=2.5),
            'blindagem': _tom([300, 900], 0.3, volume=0.3, onda='triangular', decaimento=2),
            'blindagem_quebra': _tom([1500, 400], 0.3, volume=0.35, ruido=0.6, decaimento=4),
            'buraco': _tom([120, 50], 0.25, volume=0.6, ruido=0.6, decaimento=5),
            'carnaval': _batucada(),
        }

    def define_volume(self, volume):
        if not self.ativo:
            return
        fator = volume / 100
        for som in list(self.sons.values()) + self.motores:
            som.set_volume(fator)

    def toca(self, nome):
        if self.ativo:
            self.sons[nome].play()

    def motor_liga(self):
        if not self.motores or self.motor_tocando:
            return
        for canal, som in zip(self.canais_motor, self.motores):
            canal.play(som, loops=-1)
            canal.set_volume(0)
        self.motor_tocando = True
        self.motor_velocidade(0)

    def motor_desliga(self):
        for canal in self.canais_motor:
            canal.stop()
        self.motor_tocando = False

    def motor_pausa(self):
        for canal in self.canais_motor:
            canal.pause()

    def motor_continua(self):
        for canal in self.canais_motor:
            canal.unpause()

    def motor_velocidade(self, fracao):
        if not self.motor_tocando:
            return
        rotacao = rotacao_motor(fracao)
        posicao = rotacao * (NIVEIS_MOTOR - 1)
        nivel = min(int(posicao), NIVEIS_MOTOR - 2)
        mistura = posicao - nivel
        volume = 0.55 + 0.45 * fracao
        for i, canal in enumerate(self.canais_motor):
            if i == nivel:
                canal.set_volume(math.cos(mistura * math.pi / 2) * volume)
            elif i == nivel + 1:
                canal.set_volume(math.sin(mistura * math.pi / 2) * volume)
            else:
                canal.set_volume(0)
