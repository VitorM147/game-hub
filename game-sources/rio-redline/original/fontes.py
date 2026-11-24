import functools
import os

import pygame

PASTA = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets', 'fontes')
ARQUIVO_TITULO = 'PressStart2P-Regular.ttf'
ARQUIVO_TEXTO = 'VT323-Regular.ttf'
# Na Press Start 2P, Ó/Ô/Õ maiúsculos são idênticos aos minúsculos e o Í parece minúsculo.
SEM_ACENTO_TITULO = str.maketrans('ÍÓÔÕ', 'IOOO')

_fontes_titulo = set()


@functools.lru_cache(maxsize=None)
def _carrega(arquivo, tamanho):
    return pygame.font.Font(os.path.join(PASTA, arquivo), tamanho)


def titulo(tamanho):
    fonte = _carrega(ARQUIVO_TITULO, tamanho)
    _fontes_titulo.add(fonte)
    return fonte


def texto(tamanho):
    return _carrega(ARQUIVO_TEXTO, tamanho)


def escreve(tela, fonte, conteudo, cor, posicao, ancora='topleft', sombra=None, alfa=None):
    if fonte in _fontes_titulo:
        conteudo = conteudo.translate(SEM_ACENTO_TITULO)
    superficie = fonte.render(conteudo, False, cor)
    rect = superficie.get_rect(**{ancora: posicao})
    if sombra is not None:
        fundo = fonte.render(conteudo, False, sombra)
        if alfa is not None:
            fundo.set_alpha(alfa)
        deslocamento = max(2, fonte.get_height() // 10)
        tela.blit(fundo, rect.move(deslocamento, deslocamento))
    if alfa is not None:
        superficie.set_alpha(alfa)
    tela.blit(superficie, rect)
    return rect
