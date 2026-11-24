import functools
import math
import random

import pygame

import superficies
from pista import BASE_JOGADOR_Y, LARGURA, LARGURA_REFERENCIA_CARRO, meia_largura_para

VEL_MAX = 8000
VEL_MAX_NITRO = 11000
ACELERACAO = 3000
ACELERACAO_NITRO = 6000
DESACELERACAO_POS_NITRO = 3000
LIMITE_PISTA = 1.0
LIMITE_X = 2.0
DURACAO_DANO = 0.4
LARGURA_IMAGEM = LARGURA_REFERENCIA_CARRO
ALTURA_MAX_IMAGEM = 150

NITRO_MAX = 100
CONSUMO_NITRO = 35
GANHO_NITRO_DRIFT = 18
VEL_MIN_DRIFT = 0.45
PERDA_VELOCIDADE_DRIFT = 0.25
PONTOS_DRIFT_POR_SEGUNDO = 40
INCLINACAO_MAX = 6
INCLINACAO_DRIFT = 12
PERDA_VELOCIDADE_BATIDA = 0.7
PERDA_VELOCIDADE_BLINDADO = 0.15
MULTIPLICADOR_CARNAVAL = 2

_rng_chama = random.Random()


ATRIBUTOS_NEUTROS = {'velocidade': 1.0, 'aceleracao': 1.0, 'nitro': 1.0, 'resistencia': 1.0}


class Carro:
    def __init__(self, comprimento, atributos=None, largura_sprite=LARGURA_REFERENCIA_CARRO):
        atributos = atributos or ATRIBUTOS_NEUTROS
        self.meia_largura = meia_largura_para(largura_sprite)
        self.vel_max = VEL_MAX * atributos['velocidade']
        self.vel_max_nitro = VEL_MAX_NITRO * atributos['velocidade']
        self.aceleracao = ACELERACAO * atributos['aceleracao']
        self.aceleracao_nitro = ACELERACAO_NITRO * atributos['aceleracao']
        self.eficiencia_nitro = atributos['nitro']
        self.resistencia = atributos['resistencia']
        self.comprimento = comprimento
        self.pos = 0.0
        self.vel = 0.0
        self.x = 0.0
        self.vida = 100
        self.dano_timer = 0.0
        self.distancia = 0.0
        self.ultrapassagens = 0
        self.bonus = 0.0
        self.nitro = 0.0
        self.nitro_ativo = False
        self.drift = False
        self.pontos_drift = 0.0
        self.inclinacao = 0.0
        self.blindado = False
        self.carnaval = 0.0

    @property
    def fracao(self):
        return min(self.vel / self.vel_max, 1.0)

    @property
    def multiplicador(self):
        return MULTIPLICADOR_CARNAVAL if self.carnaval > 0 else 1

    def ganha_nitro(self, quantidade):
        self.nitro = min(NITRO_MAX, self.nitro + quantidade * self.eficiencia_nitro)

    def enche_nitro(self):
        self.nitro = NITRO_MAX

    def cura(self, quantidade):
        self.vida = min(100, self.vida + quantidade)

    def sofre_dano(self, dano, perda_velocidade=PERDA_VELOCIDADE_BATIDA):
        if self.blindado:
            self.blindado = False
            self.vel *= 1 - PERDA_VELOCIDADE_BLINDADO
            return True
        self.vida = max(0, self.vida - round(dano / self.resistencia))
        self.vel *= 1 - perda_velocidade
        self.dano_timer = DURACAO_DANO
        return False

    def atualiza(self, dt, teclas, curva):
        acelerando = teclas[pygame.K_UP] or teclas[pygame.K_w]
        freando = teclas[pygame.K_DOWN] or teclas[pygame.K_s]
        direcao = int(bool(teclas[pygame.K_RIGHT] or teclas[pygame.K_d])) - int(bool(teclas[pygame.K_LEFT] or teclas[pygame.K_a]))
        quer_nitro = teclas[pygame.K_SPACE]
        quer_drift = teclas[pygame.K_LSHIFT] or teclas[pygame.K_RSHIFT]

        self.nitro_ativo = bool(quer_nitro and self.nitro > 0)
        if self.nitro_ativo:
            self.vel = min(self.vel_max_nitro, self.vel + self.aceleracao_nitro * dt)
            self.nitro = max(0.0, self.nitro - CONSUMO_NITRO / self.eficiencia_nitro * dt)
        elif self.vel > self.vel_max:
            self.vel = max(self.vel_max, self.vel - DESACELERACAO_POS_NITRO * dt)
        elif acelerando:
            self.vel = min(self.vel_max, self.vel + self.aceleracao * dt)
        else:
            self.vel -= 1000 * dt
        if freando:
            self.vel -= 5000 * dt
        self.vel = max(self.vel, 0.0)

        fracao = self.fracao
        self.drift = bool(quer_drift and direcao and fracao >= VEL_MIN_DRIFT)
        forca = 3.0 if self.drift else 2.0
        self.x += direcao * forca * fracao * dt
        self.x -= curva * fracao * fracao * 0.5 * dt * (0.5 if self.drift else 1.0)
        multiplicador = self.multiplicador
        if self.drift:
            self.vel *= 1 - PERDA_VELOCIDADE_DRIFT * dt
            self.ganha_nitro(GANHO_NITRO_DRIFT * dt)
            pontos = PONTOS_DRIFT_POR_SEGUNDO * dt * multiplicador
            self.bonus += pontos
            self.pontos_drift += pontos
        if self.carnaval > 0:
            self.bonus += self.vel * dt / 10 * (multiplicador - 1)
            self.carnaval = max(0.0, self.carnaval - dt)

        if abs(self.x) > LIMITE_PISTA:
            self.vel *= 1 - 1.5 * dt
        self.x = max(-LIMITE_X, min(LIMITE_X, self.x))

        alvo = direcao * (INCLINACAO_DRIFT if self.drift else INCLINACAO_MAX) * fracao
        self.inclinacao += (alvo - self.inclinacao) * min(1.0, 8 * dt)

        self.distancia += self.vel * dt
        self.pos = (self.pos + self.vel * dt) % self.comprimento
        self.dano_timer = max(0.0, self.dano_timer - dt)


def carrega_imagem(caminho, largura, altura_max=None):
    imagem = pygame.image.load(caminho).convert_alpha()
    altura = round(imagem.get_height() * largura / imagem.get_width())
    if altura_max and altura > altura_max:
        largura = round(largura * altura_max / altura)
        altura = altura_max
    return pygame.transform.smoothscale(imagem, (largura, altura))


@functools.lru_cache(maxsize=128)
def _girada(imagem, angulo):
    return pygame.transform.rotate(imagem, angulo)


def desenha_carro(tela, imagem, carro, tempo):
    centro_x, base_y = LARGURA // 2, BASE_JOGADOR_Y
    vibracao = math.sin(tempo * 45) * 1.5 * carro.fracao
    girada = _girada(imagem, -round(carro.inclinacao))
    rect = girada.get_rect(midbottom=(centro_x + carro.inclinacao * 2, base_y + vibracao))

    cor_brilho = (255, 140, 0, 120) if carro.nitro_ativo else (0, 255, 255, 110)
    brilho = superficies.elipse(imagem.get_width(), 26, cor_brilho)
    tela.blit(brilho, brilho.get_rect(center=(rect.centerx, base_y - 4)))
    tela.blit(girada, rect)

    if carro.nitro_ativo:
        for lado in (-1, 1):
            _desenha_chama(tela, rect.centerx + lado * imagem.get_width() * 0.24, rect.bottom - imagem.get_height() * 0.18)
    if carro.blindado:
        _desenha_bolha(tela, rect, tempo)


def _desenha_bolha(tela, rect, tempo):
    area = rect.inflate(30, 24)
    pulso = 0.5 + 0.5 * math.sin(tempo * 6)
    bolha = superficies.elipse(area.width, area.height, (0, 220, 255, int(10 + 12 * pulso)),
                               3, (120, 240, 255, int(140 + 80 * pulso)))
    tela.blit(bolha, area)


def _desenha_chama(tela, x, y):
    tamanho = _rng_chama.uniform(0.8, 1.2)
    for raio, cor in ((16, (255, 120, 0)), (11, (255, 220, 60)), (6, (120, 200, 255))):
        r = max(2, int(raio * tamanho))
        pygame.draw.ellipse(tela, cor, (int(x - r), int(y - r * 0.7), 2 * r, int(2 * r * 1.4)))
