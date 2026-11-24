import pygame

import fontes
import superficies
from ambiente import desenha_fundo
from atributos import (
    ATRIBUTOS, NIVEL_MAXIMO, NOMES, compra_melhoria, custo_melhoria, nivel, pode_melhorar,
)
from carros import CARROS
from pista import LARGURA, ALTURA
from progresso import salva
from ui import COR_DESTAQUE, COR_DICA, COR_ESCURA, COR_NEON, escurece

CENTRO_X, BASE_CARRO_Y = 330, 340
SETA_ESQUERDA_X, SETA_DIREITA_X, SETA_Y = 80, 580, 220
PAINEL = pygame.Rect(620, 86, 310, 270)
LINHA_ATRIBUTO = 56
SEGMENTO, SEGMENTO_ESPACO = 22, 4
MINIATURA_ESPACO = 14
MINIATURA_Y = 468
COR_BLOQUEADO = (55, 50, 75)
COR_BASE = (0, 200, 230)
COR_MELHORIA = COR_DESTAQUE
COR_VAZIO = (50, 36, 70)
MENSAGENS_MELHORIA = {
    'maximo': "Atributo no máximo",
    'bloqueado': "Compre o carro primeiro",
}


class Garagem:
    def __init__(self):
        self.indice = 0
        self.foco = 0
        self.mensagem = ''
        self.silhuetas = {}

    def abre(self, progresso):
        self.indice = next(i for i, c in enumerate(CARROS) if c['id'] == progresso['selecionado'])
        self.foco = 0
        self.mensagem = ''

    def trata(self, evento, progresso):
        if evento.key == pygame.K_ESCAPE:
            return 'menu'
        if evento.key in (pygame.K_LEFT, pygame.K_a):
            self.indice = (self.indice - 1) % len(CARROS)
            self.mensagem = ''
        elif evento.key in (pygame.K_RIGHT, pygame.K_d):
            self.indice = (self.indice + 1) % len(CARROS)
            self.mensagem = ''
        elif evento.key in (pygame.K_UP, pygame.K_w):
            self.foco = (self.foco - 1) % (len(ATRIBUTOS) + 1)
            self.mensagem = ''
        elif evento.key in (pygame.K_DOWN, pygame.K_s):
            self.foco = (self.foco + 1) % (len(ATRIBUTOS) + 1)
            self.mensagem = ''
        elif evento.key in (pygame.K_RETURN, pygame.K_KP_ENTER):
            if self.foco == 0:
                return self._escolhe(progresso)
            return self._melhora(progresso, ATRIBUTOS[self.foco - 1])
        return None

    def _escolhe(self, progresso):
        carro = CARROS[self.indice]
        if carro['id'] in progresso['desbloqueados']:
            progresso['selecionado'] = carro['id']
            self.mensagem = f"{carro['nome']} selecionado"
        elif progresso['moedas'] >= carro['preco']:
            progresso['moedas'] -= carro['preco']
            progresso['desbloqueados'].append(carro['id'])
            progresso['selecionado'] = carro['id']
            self.mensagem = f"{carro['nome']} desbloqueado"
        else:
            self.mensagem = f"Faltam {carro['preco'] - progresso['moedas']} moedas"
            return 'erro'
        salva(progresso)
        return 'confirmar'

    def _melhora(self, progresso, atributo):
        carro = CARROS[self.indice]
        custo = custo_melhoria(progresso, carro, atributo)
        resultado = compra_melhoria(progresso, carro, atributo)
        if resultado == 'ok':
            self.mensagem = f"{NOMES[atributo]} melhorada!"
            return 'confirmar'
        if resultado == 'sem_moedas':
            self.mensagem = f"Faltam {custo - progresso['moedas']} moedas"
        else:
            self.mensagem = MENSAGENS_MELHORIA[resultado]
        return 'erro'

    def _silhueta(self, chave, imagem):
        if chave not in self.silhuetas:
            sombra = imagem.copy()
            sombra.fill(COR_BLOQUEADO, special_flags=pygame.BLEND_RGB_MULT)
            self.silhuetas[chave] = sombra
        return self.silhuetas[chave]

    def _status(self, progresso, carro):
        desbloqueado = carro['id'] in progresso['desbloqueados']
        if self.mensagem:
            return self.mensagem, (255, 255, 255)
        if self.foco > 0:
            atributo = ATRIBUTOS[self.foco - 1]
            if not desbloqueado:
                return "Compre o carro para melhorar", COR_DICA
            if not pode_melhorar(progresso, carro, atributo):
                return f"{NOMES[atributo]} no máximo", COR_DICA
            return f"Melhorar {NOMES[atributo]}: {custo_melhoria(progresso, carro, atributo)} moedas", COR_DESTAQUE
        if progresso['selecionado'] == carro['id']:
            return 'EM USO', COR_NEON
        if desbloqueado:
            return 'Enter para usar', (60, 255, 120)
        return f"{carro['preco']} moedas  -  Enter para comprar", COR_DESTAQUE

    def desenha(self, tela, progresso, imagens_grandes, miniaturas, fundo):
        desenha_fundo(tela, fundo, 0)
        escurece(tela, 190)

        fontes.escreve(tela, fontes.titulo(32), "GARAGEM", COR_NEON, (LARGURA // 2, 40), 'center', sombra=COR_ESCURA)
        fontes.escreve(tela, fontes.titulo(12), f"MOEDAS {progresso['moedas']}", COR_DESTAQUE, (20, 20), sombra=COR_ESCURA)

        carro = CARROS[self.indice]
        desbloqueado = carro['id'] in progresso['desbloqueados']
        imagem = imagens_grandes[carro['id']]
        if not desbloqueado:
            imagem = self._silhueta(('grande', carro['id']), imagem)
        brilho = superficies.elipse(imagem.get_width(), 34, (0, 255, 255, 90 if desbloqueado else 30))
        tela.blit(brilho, brilho.get_rect(center=(CENTRO_X, BASE_CARRO_Y)))
        tela.blit(imagem, imagem.get_rect(midbottom=(CENTRO_X, BASE_CARRO_Y)))

        fonte_seta = fontes.titulo(32)
        fontes.escreve(tela, fonte_seta, '<', COR_NEON, (SETA_ESQUERDA_X, SETA_Y), 'center')
        fontes.escreve(tela, fonte_seta, '>', COR_NEON, (SETA_DIREITA_X, SETA_Y), 'center')

        nome = f"> {carro['nome']} <" if self.foco == 0 else carro['nome']
        fontes.escreve(tela, fontes.titulo(20), nome, (255, 255, 255), (CENTRO_X, 372), 'center', sombra=COR_ESCURA)
        status, cor = self._status(progresso, carro)
        fontes.escreve(tela, fontes.texto(30), status, cor, (CENTRO_X, 404), 'center')

        self._desenha_atributos(tela, progresso, carro)
        self._desenha_miniaturas(tela, progresso, miniaturas)
        fontes.escreve(tela, fontes.texto(24), "Esquerda/Direita: carro    Cima/Baixo: atributo    Enter: comprar/usar    Esc: voltar",
                       COR_DICA, (LARGURA // 2, ALTURA - 16), 'center')

    def _desenha_atributos(self, tela, progresso, carro):
        tela.blit(superficies.preenchida(PAINEL.width, PAINEL.height, (20, 10, 40, 210)), PAINEL.topleft)
        pygame.draw.rect(tela, (110, 70, 150), PAINEL, 2, border_radius=10)
        fontes.escreve(tela, fontes.titulo(12), "ATRIBUTOS", COR_NEON, (PAINEL.centerx, PAINEL.top + 18), 'center')

        fonte_rotulo = fontes.texto(28)
        for i, atributo in enumerate(ATRIBUTOS):
            topo = PAINEL.top + 40 + i * LINHA_ATRIBUTO
            linha = pygame.Rect(PAINEL.left + 8, topo, PAINEL.width - 16, LINHA_ATRIBUTO - 6)
            if self.foco == i + 1:
                pygame.draw.rect(tela, COR_NEON, linha, 2, border_radius=6)

            fontes.escreve(tela, fonte_rotulo, NOMES[atributo], (255, 255, 255), (linha.left + 10, topo + 2))
            if carro['id'] not in progresso['desbloqueados']:
                extra, cor_extra = '', COR_DICA
            elif pode_melhorar(progresso, carro, atributo):
                extra, cor_extra = f"+ {custo_melhoria(progresso, carro, atributo)}", COR_DESTAQUE
            else:
                extra, cor_extra = "MÁX", COR_DICA
            fontes.escreve(tela, fonte_rotulo, extra, cor_extra, (linha.right - 10, topo + 2), 'topright')

            base = carro['atributos'][atributo]
            total = nivel(progresso, carro, atributo)
            for segmento in range(NIVEL_MAXIMO):
                cor = COR_BASE if segmento < base else COR_MELHORIA if segmento < total else COR_VAZIO
                x = linha.left + 10 + segmento * (SEGMENTO + SEGMENTO_ESPACO)
                pygame.draw.rect(tela, cor, (x, topo + 30, SEGMENTO, 12))

    def _desenha_miniaturas(self, tela, progresso, miniaturas):
        larguras = [miniaturas[c['id']].get_width() for c in CARROS]
        total = sum(larguras) + MINIATURA_ESPACO * (len(CARROS) - 1)
        x = (LARGURA - total) // 2
        for i, carro in enumerate(CARROS):
            imagem = miniaturas[carro['id']]
            if carro['id'] not in progresso['desbloqueados']:
                imagem = self._silhueta(('mini', carro['id']), imagem)
            rect = imagem.get_rect(midleft=(x, MINIATURA_Y))
            if i == self.indice:
                pygame.draw.rect(tela, COR_NEON, rect.inflate(10, 10), 2, border_radius=6)
            tela.blit(imagem, rect)
            x += imagem.get_width() + MINIATURA_ESPACO
