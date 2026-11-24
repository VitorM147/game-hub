import pygame

from ui import desenha_painel, navega

ITENS = ['volume', 'tela_cheia', 'voltar']
PASSO_VOLUME = 10


class Opcoes:
    def __init__(self):
        self.indice = 0

    def abre(self):
        self.indice = 0

    def trata(self, evento, config):
        item = ITENS[self.indice]
        if evento.key == pygame.K_ESCAPE:
            return 'voltar'
        if item == 'volume' and evento.key in (pygame.K_LEFT, pygame.K_a, pygame.K_RIGHT, pygame.K_d):
            sinal = 1 if evento.key in (pygame.K_RIGHT, pygame.K_d) else -1
            novo = max(0, min(100, config['volume'] + sinal * PASSO_VOLUME))
            if novo == config['volume']:
                return None
            config['volume'] = novo
            return 'volume'
        if item == 'tela_cheia' and evento.key in (pygame.K_RETURN, pygame.K_KP_ENTER, pygame.K_LEFT,
                                                   pygame.K_a, pygame.K_RIGHT, pygame.K_d):
            return 'tela_cheia'
        if item == 'voltar' and evento.key in (pygame.K_RETURN, pygame.K_KP_ENTER):
            return 'voltar'
        self.indice = navega(self.indice, len(ITENS), evento.key)
        return None

    def desenha(self, tela, config):
        linhas = [
            ('Volume', f"< {config['volume']}% >"),
            ('Tela cheia', 'Ligada' if config['tela_cheia'] else 'Desligada'),
            ('Voltar', None),
        ]
        desenha_painel(tela, "Opções", linhas, self.indice,
                       "Setas: ajustar    Enter: selecionar    Esc: voltar")
