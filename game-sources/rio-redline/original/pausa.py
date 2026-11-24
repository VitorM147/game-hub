import pygame

from ui import desenha_painel, navega

OPCOES = [('Continuar', 'continuar'), ('Opções', 'opcoes'), ('Abandonar', 'menu')]


class Pausa:
    def __init__(self):
        self.indice = 0

    def abre(self):
        self.indice = 0

    def trata(self, evento):
        if evento.key in (pygame.K_ESCAPE, pygame.K_p):
            return 'continuar'
        if evento.key in (pygame.K_RETURN, pygame.K_KP_ENTER):
            return OPCOES[self.indice][1]
        self.indice = navega(self.indice, len(OPCOES), evento.key)
        return None

    def desenha(self, tela):
        linhas = [(nome, None) for nome, _ in OPCOES]
        desenha_painel(tela, "PAUSA", linhas, self.indice, "Enter: selecionar    Esc: continuar")
