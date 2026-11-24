import math
import random

import pygame

import fontes
import superficies
from pista import LARGURA, ALTURA

DURACAO_TREMOR = 0.35
FORCA_TREMOR = 14
DURACAO_TEXTO = 1.2
CENTRO_FUGA = (LARGURA / 2, ALTURA * 0.5)
CORES_CONFETE = [(0, 170, 80), (255, 220, 0), (30, 90, 220), (255, 60, 160), (255, 255, 255)]


class Efeitos:
    def __init__(self):
        self.rng = random.Random()
        self.particulas = []
        self.textos = []
        self.tremor = 0.0
        self.camada = pygame.Surface((LARGURA, ALTURA), pygame.SRCALPHA)

    def batida(self, x, y):
        self.tremor = DURACAO_TREMOR
        for _ in range(28):
            angulo = self.rng.uniform(math.pi * 1.05, math.pi * 1.95)
            velocidade = self.rng.uniform(150, 420)
            self.particulas.append({
                'tipo': 'faisca', 'x': x + self.rng.uniform(-40, 40), 'y': y,
                'vx': math.cos(angulo) * velocidade, 'vy': math.sin(angulo) * velocidade,
                'vida': self.rng.uniform(0.3, 0.6), 'cor': self.rng.choice([(255, 230, 120), (255, 160, 40), (255, 255, 255)]),
            })

    def fumaca(self, x, y):
        for _ in range(2):
            self.particulas.append({
                'tipo': 'fumaca', 'x': x + self.rng.uniform(-10, 10), 'y': y,
                'vx': self.rng.uniform(-40, 40), 'vy': self.rng.uniform(-60, -20),
                'vida': 0.6, 'cor': (200, 200, 210),
            })

    def confete(self):
        self.particulas.append({
            'tipo': 'confete', 'x': self.rng.uniform(0, LARGURA), 'y': -10,
            'vx': self.rng.uniform(-30, 30), 'vy': self.rng.uniform(120, 220),
            'vida': 3.0, 'cor': self.rng.choice(CORES_CONFETE),
        })

    def texto(self, mensagem, cor):
        self.textos.append({'mensagem': mensagem, 'cor': cor, 'vida': DURACAO_TEXTO})

    def limpa(self):
        self.particulas.clear()
        self.textos.clear()
        self.tremor = 0.0

    def atualiza(self, dt):
        self.tremor = max(0.0, self.tremor - dt)
        for p in self.particulas:
            p['x'] += p['vx'] * dt
            p['y'] += p['vy'] * dt
            if p['tipo'] == 'faisca':
                p['vy'] += 900 * dt
            p['vida'] -= dt
        self.particulas = [p for p in self.particulas if p['vida'] > 0]
        for t in self.textos:
            t['vida'] -= dt
        self.textos = [t for t in self.textos if t['vida'] > 0]

    def deslocamento(self):
        if self.tremor <= 0:
            return 0, 0
        forca = FORCA_TREMOR * self.tremor / DURACAO_TREMOR
        return int(self.rng.uniform(-forca, forca)), int(self.rng.uniform(-forca, forca))

    def desenha_particulas(self, tela):
        for p in self.particulas:
            if p['tipo'] == 'faisca':
                fim = (p['x'] - p['vx'] * 0.03, p['y'] - p['vy'] * 0.03)
                pygame.draw.line(tela, p['cor'], (p['x'], p['y']), fim, 2)
            elif p['tipo'] == 'confete':
                largura = 3 + 3 * abs(math.sin(p['vida'] * 8))
                pygame.draw.rect(tela, p['cor'], (int(p['x']), int(p['y']), int(largura), 6))
            else:
                raio = int(10 + (0.6 - p['vida']) * 40)
                alfa = int(140 * p['vida'] / 0.6) // 10 * 10
                tela.blit(superficies.circulo(raio, (*p['cor'], alfa)), (p['x'] - raio, p['y'] - raio))

    def desenha_textos(self, tela):
        fonte = fontes.titulo(20)
        for i, t in enumerate(self.textos):
            progresso = 1 - t['vida'] / DURACAO_TEXTO
            alfa = int(255 * min(1.0, t['vida'] / 0.4))
            y = ALTURA * 0.42 - progresso * 40 - i * 30
            fontes.escreve(tela, fonte, t['mensagem'], t['cor'], (LARGURA // 2, y), 'center', sombra=(10, 4, 20), alfa=alfa)

    def desenha_linhas_velocidade(self, tela, intensidade):
        if intensidade <= 0:
            return
        self.camada.fill((0, 0, 0, 0))
        diagonal = math.hypot(LARGURA, ALTURA) / 2
        for _ in range(int(18 * intensidade)):
            angulo = self.rng.uniform(0, 2 * math.pi)
            inicio = self.rng.uniform(0.55, 0.85) * diagonal
            fim = inicio + self.rng.uniform(40, 140) * intensidade
            dx, dy = math.cos(angulo), math.sin(angulo)
            pygame.draw.line(self.camada, (255, 255, 255, int(150 * intensidade)),
                             (CENTRO_FUGA[0] + dx * inicio, CENTRO_FUGA[1] + dy * inicio),
                             (CENTRO_FUGA[0] + dx * fim, CENTRO_FUGA[1] + dy * fim), 2)
        tela.blit(self.camada, (0, 0))
