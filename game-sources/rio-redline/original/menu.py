import math

import pygame

import fontes
import superficies
from ambiente import desenha_fundo
from carros import CARROS
from pista import LARGURA, ALTURA
from ui import COR_DESTAQUE, COR_DICA, COR_ESCURA, COR_NEON

OPCOES = [('Jogar', 'corrida'), ('Garagem', 'garagem'), ('Opções', 'opcoes'), ('Sair', 'sair')]
BOTAO_LARGURA, BOTAO_ALTURA = 300, 46
BOTAO_X, BOTAO_Y, BOTAO_ESPACO = 50, 170, 58
CARRO_CENTRO_X, CARRO_BASE_Y = 710, 340


class Menu:
    def __init__(self):
        self.indice = 0
        self.sombra = self._cria_sombra()

    def _cria_sombra(self):
        sombra = pygame.Surface((LARGURA, ALTURA), pygame.SRCALPHA)
        for x in range(LARGURA):
            alfa = int(max(0, 215 * (1 - x / 580)))
            pygame.draw.line(sombra, (*COR_ESCURA, alfa), (x, 0), (x, ALTURA))
        return sombra

    def trata(self, evento):
        if evento.key in (pygame.K_UP, pygame.K_w):
            self.indice = (self.indice - 1) % len(OPCOES)
        elif evento.key in (pygame.K_DOWN, pygame.K_s):
            self.indice = (self.indice + 1) % len(OPCOES)
        elif evento.key in (pygame.K_RETURN, pygame.K_KP_ENTER):
            return OPCOES[self.indice][1]
        return None

    def desenha(self, tela, progresso, fundo, imagem_carro):
        desenha_fundo(tela, fundo, 0)
        tela.blit(self.sombra, (0, 0))

        fontes.escreve(tela, fontes.titulo(40), "NITRO", COR_NEON, (BOTAO_X, 46), sombra=COR_ESCURA)
        fontes.escreve(tela, fontes.titulo(40), "CARIOCA", COR_DESTAQUE, (BOTAO_X + 220, 46), sombra=COR_ESCURA)
        fontes.escreve(tela, fontes.texto(30), "Rio de Janeiro, quando o sol se põe", (230, 230, 240), (BOTAO_X + 2, 100))

        fonte_botao = fontes.titulo(16)
        for i, (nome, _) in enumerate(OPCOES):
            rect = pygame.Rect(BOTAO_X, BOTAO_Y + i * BOTAO_ESPACO, BOTAO_LARGURA, BOTAO_ALTURA)
            selecionado = i == self.indice
            pygame.draw.rect(tela, COR_DESTAQUE if selecionado else (24, 12, 46), rect, border_radius=10)
            pygame.draw.rect(tela, (255, 255, 255) if selecionado else (110, 70, 150), rect, 2, border_radius=10)
            texto = f"> {nome} <" if selecionado else nome
            fontes.escreve(tela, fonte_botao, texto, COR_ESCURA if selecionado else (230, 230, 240), rect.center, 'center')

        self._desenha_carro(tela, progresso, imagem_carro)

        tela.blit(superficies.preenchida(420, 36, (10, 4, 26, 200)), (BOTAO_X, ALTURA - 76))
        fontes.escreve(tela, fontes.titulo(12), f"MOEDAS {progresso['moedas']}   RECORDE {progresso['recorde']}",
                       (255, 255, 255), (BOTAO_X + 210, ALTURA - 58), 'center')
        fontes.escreve(tela, fontes.texto(24), "Setas: navegar    Enter: selecionar    F11: tela cheia",
                       COR_DICA, (BOTAO_X, ALTURA - 30))

    def _desenha_carro(self, tela, progresso, imagem_carro):
        balanco = math.sin(pygame.time.get_ticks() / 350) * 6
        brilho = superficies.elipse(imagem_carro.get_width(), 30, (0, 255, 255, 110))
        tela.blit(brilho, brilho.get_rect(center=(CARRO_CENTRO_X, CARRO_BASE_Y + 6)))
        tela.blit(imagem_carro, imagem_carro.get_rect(midbottom=(CARRO_CENTRO_X, CARRO_BASE_Y + balanco)))
        nome = next(c['nome'] for c in CARROS if c['id'] == progresso['selecionado'])
        fontes.escreve(tela, fontes.titulo(16), nome, (255, 255, 255), (CARRO_CENTRO_X, CARRO_BASE_Y + 50), 'center',
                       sombra=COR_ESCURA)
