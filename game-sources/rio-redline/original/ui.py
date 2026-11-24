import pygame

import fontes
import superficies
from pista import LARGURA, ALTURA

COR_DESTAQUE = (255, 200, 0)
COR_NEON = (0, 255, 255)
COR_ESCURA = (6, 2, 16)
COR_TEXTO = (230, 230, 240)
COR_DICA = (180, 180, 200)
PAINEL_LARGURA = 600
LINHA_ALTURA = 48
LINHA_ESPACO = 12


def escurece(tela, alfa=170):
    tela.blit(superficies.preenchida(LARGURA, ALTURA, (*COR_ESCURA, alfa)), (0, 0))


def desenha_painel(tela, titulo, linhas, indice, dica):
    escurece(tela)
    altura = 110 + len(linhas) * (LINHA_ALTURA + LINHA_ESPACO) + 40
    painel = pygame.Rect(0, 0, PAINEL_LARGURA, altura)
    painel.center = (LARGURA // 2, ALTURA // 2)
    pygame.draw.rect(tela, (20, 10, 40), painel, border_radius=14)
    pygame.draw.rect(tela, COR_NEON, painel, 2, border_radius=14)

    fontes.escreve(tela, fontes.titulo(28), titulo, COR_NEON, (painel.centerx, painel.top + 50), 'center',
                   sombra=COR_ESCURA)

    fonte = fontes.titulo(16)
    for i, (rotulo, valor) in enumerate(linhas):
        rect = pygame.Rect(painel.left + 30, painel.top + 100 + i * (LINHA_ALTURA + LINHA_ESPACO),
                           PAINEL_LARGURA - 60, LINHA_ALTURA)
        selecionado = i == indice
        pygame.draw.rect(tela, COR_DESTAQUE if selecionado else (32, 18, 60), rect, border_radius=10)
        cor = COR_ESCURA if selecionado else COR_TEXTO
        if valor is None:
            fontes.escreve(tela, fonte, rotulo, cor, rect.center, 'center')
        else:
            fontes.escreve(tela, fonte, rotulo, cor, (rect.left + 18, rect.centery), 'midleft')
            fontes.escreve(tela, fonte, valor, cor, (rect.right - 18, rect.centery), 'midright')

    fontes.escreve(tela, fontes.texto(24), dica, COR_DICA, (painel.centerx, painel.bottom - 22), 'center')


def navega(indice, total, tecla):
    if tecla in (pygame.K_UP, pygame.K_w):
        return (indice - 1) % total
    if tecla in (pygame.K_DOWN, pygame.K_s):
        return (indice + 1) % total
    return indice
