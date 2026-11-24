import pygame

import fontes
from carro import NITRO_MAX, VEL_MAX
from itens import DURACAO_CARNAVAL
from pista import LARGURA, ALTURA
from ui import COR_DESTAQUE, COR_DICA, COR_ESCURA, COR_NEON, escurece

BARRA_LARGURA, BARRA_ALTURA = 240, 16
DURACAO_DICA = 6.0


def _barra(tela, x, y, fracao, cor, rotulo):
    pygame.draw.rect(tela, (30, 14, 40), (x - 2, y - 2, BARRA_LARGURA + 4, BARRA_ALTURA + 4))
    pygame.draw.rect(tela, (60, 30, 60), (x, y, BARRA_LARGURA, BARRA_ALTURA))
    pygame.draw.rect(tela, cor, (x, y, int(BARRA_LARGURA * max(0.0, min(1.0, fracao))), BARRA_ALTURA))
    fontes.escreve(tela, fontes.titulo(12), rotulo, (255, 255, 255), (x, y + BARRA_ALTURA + 6), sombra=COR_ESCURA)


def desenha_hud(tela, carro, pontos, nivel, aviso_nivel, tempo_corrida, tempo):
    titulo12 = fontes.titulo(12)
    fontes.escreve(tela, fontes.titulo(24), f"{int(carro.vel / VEL_MAX * 300)} KM/H", COR_NEON, (20, 18), sombra=COR_ESCURA)
    fontes.escreve(tela, titulo12, f"PONTOS {pontos}", (255, 255, 255), (20, 56), sombra=COR_ESCURA)
    fontes.escreve(tela, titulo12, f"NÍVEL {nivel}", COR_DESTAQUE, (20, 78), sombra=COR_ESCURA)

    x = LARGURA - BARRA_LARGURA - 20
    cor_vida = (60, 255, 120) if carro.vida > 40 else (255, 60, 60)
    _barra(tela, x, 20, carro.vida / 100, cor_vida, "VIDA")
    cheio = carro.nitro >= NITRO_MAX
    piscando = cheio and int(tempo * 6) % 2 == 0
    cor_nitro = (255, 255, 255) if piscando else ((255, 140, 0) if carro.nitro_ativo else (40, 160, 255))
    _barra(tela, x, 64, carro.nitro / NITRO_MAX, cor_nitro, "NITRO - ESPAÇO" if cheio else "NITRO")

    y = 112
    if carro.carnaval > 0:
        cor_carnaval = COR_DESTAQUE if int(tempo * 4) % 2 == 0 else (0, 200, 90)
        _barra(tela, x, y, carro.carnaval / DURACAO_CARNAVAL, cor_carnaval, f"CARNAVAL x2  {carro.carnaval:.0f}s")
        y += 44
    if carro.blindado:
        pygame.draw.rect(tela, (0, 200, 255), (x - 2, y - 2, BARRA_LARGURA + 4, 24), 2, border_radius=6)
        fontes.escreve(tela, fontes.titulo(12), "BLINDAGEM ATIVA", (0, 220, 255), (x + BARRA_LARGURA // 2, y + 10),
                       'center', sombra=COR_ESCURA)

    if aviso_nivel > 0:
        alfa = int(255 * min(1.0, aviso_nivel))
        fontes.escreve(tela, fontes.titulo(36), f"NÍVEL {nivel}", COR_DESTAQUE, (LARGURA // 2, 150), 'center',
                       sombra=COR_ESCURA, alfa=alfa)

    if tempo_corrida < DURACAO_DICA:
        alfa = int(255 * min(1.0, (DURACAO_DICA - tempo_corrida) / 1.0))
        fontes.escreve(tela, fontes.texto(28), "ESPAÇO: nitro    SHIFT + seta: drift    ESC: pausa",
                       (255, 255, 255), (LARGURA // 2, ALTURA - 190), 'center', sombra=COR_ESCURA, alfa=alfa)


def desenha_fim(tela, resultado):
    escurece(tela, 180)
    fontes.escreve(tela, fontes.titulo(32), "CARRO DESTRUÍDO", (255, 60, 60), (LARGURA // 2, 100), 'center',
                   sombra=COR_ESCURA)
    linhas = [
        (f"Pontos: {resultado['pontos']}", (255, 255, 255)),
        (f"Distância: {resultado['distancia']} m", (255, 255, 255)),
        (f"Ultrapassagens: {resultado['ultrapassagens']}", (255, 255, 255)),
        (f"Nível alcançado: {resultado['nivel']}", (255, 255, 255)),
        (f"Moedas ganhas: {resultado['moedas']}", COR_DESTAQUE),
    ]
    fonte = fontes.texto(36)
    for i, (texto, cor) in enumerate(linhas):
        fontes.escreve(tela, fonte, texto, cor, (LARGURA // 2, 170 + i * 36), 'center')
    if resultado['novo_recorde']:
        fontes.escreve(tela, fontes.titulo(20), "NOVO RECORDE!", COR_NEON, (LARGURA // 2, 370), 'center',
                       sombra=COR_ESCURA)
    fontes.escreve(tela, fontes.texto(30), "R: jogar de novo    M: menu", COR_DICA, (LARGURA // 2, ALTURA - 50), 'center')
