import functools

import pygame

# As superfícies abaixo são compartilhadas pelo cache: quem recebe só pode desenhá-las, nunca alterá-las.


@functools.lru_cache(maxsize=64)
def preenchida(largura, altura, rgba):
    superficie = pygame.Surface((largura, altura), pygame.SRCALPHA)
    superficie.fill(rgba)
    return superficie


@functools.lru_cache(maxsize=128)
def elipse(largura, altura, rgba, borda=0, rgba_borda=None):
    superficie = pygame.Surface((largura, altura), pygame.SRCALPHA)
    pygame.draw.ellipse(superficie, rgba, superficie.get_rect())
    if borda:
        pygame.draw.ellipse(superficie, rgba_borda, superficie.get_rect(), borda)
    return superficie


@functools.lru_cache(maxsize=512)
def circulo(raio, rgba):
    superficie = pygame.Surface((raio * 2, raio * 2), pygame.SRCALPHA)
    pygame.draw.circle(superficie, rgba, (raio, raio), raio)
    return superficie
