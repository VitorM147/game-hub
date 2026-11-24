import os

import pygame 

from pista import LARGURA, ALTURA

HORIZONTE = ALTURA // 2
HORIZONTE_IMAGEM = 243
PARALAXE = 200
CAMINHO_FUNDO = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets', 'rio_fundo.png')


def cria_fundo():
    original = pygame.image.load(CAMINHO_FUNDO).convert()
    largura = LARGURA * 2
    escala = largura / original.get_width()
    imagem = pygame.transform.scale(original, (largura, round(original.get_height() * escala)))
    deslocamento = HORIZONTE - round(HORIZONTE_IMAGEM * escala)

    fundo = pygame.Surface((largura, ALTURA))
    fundo.fill(original.get_at((0, original.get_height() - 1)))
    if deslocamento > 0:
        fundo.fill(original.get_at((0, 0)), (0, 0, largura, deslocamento))
    fundo.blit(imagem, (0, deslocamento))
    return fundo


def desenha_fundo(tela, fundo, x_jogador):
    deslocamento = LARGURA / 2 + x_jogador * PARALAXE
    deslocamento = min(max(deslocamento, 0), fundo.get_width() - LARGURA)
    tela.blit(fundo, (-int(deslocamento), 0))
