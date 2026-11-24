import random
import sys

import pygame

from ambiente import cria_fundo, desenha_fundo
from audio import Audio
from carro import ALTURA_MAX_IMAGEM, Carro, LARGURA_IMAGEM, carrega_imagem, desenha_carro
from atributos import multiplicadores
from carros import ARQUIVOS_NPC, CARROS, caminho_asset, carro_por_id
from config import carrega_config, salva_config
from efeitos import Efeitos
from garagem import Garagem
from hud import desenha_fim, desenha_hud
from itens import DANO_BURACO, VIDA_KIT, GerenciadorItens
from menu import Menu
from opcoes import Opcoes
from pausa import Pausa
from pista import LARGURA, ALTURA, TAM_SEGMENTO, desenha_pista, monta_pista
from progresso import carrega, moedas_ganhas, pontuacao, salva
from trafego import (
    COOLDOWN, DANO, ajusta_dificuldade, atualiza_trafego, colidiu, conta_ultrapassagem, monta_trafego, raspou,
)

TITULO = "Nitro Carioca"
LARGURA_MINIATURA = 80
LARGURA_MENU = 300
# Mesma proporção da altura máxima na corrida, para o carro parecer do mesmo tamanho em todas as telas.
ALTURA_MAX_MENU = round(ALTURA_MAX_IMAGEM * LARGURA_MENU / LARGURA_IMAGEM)
ALTURA_MAX_MINIATURA = round(ALTURA_MAX_IMAGEM * LARGURA_MINIATURA / LARGURA_IMAGEM)
DURACAO_AVISO_NIVEL = 2.0
NITRO_ULTRAPASSAGEM = 8
NITRO_RASPANDO = 18
PONTOS_RASPANDO = 25
PONTOS_ULTRAPASSAGEM = 50
DRIFT_MINIMO_PARA_AVISO = 0.6
TECLAS_NAVEGACAO = {pygame.K_UP, pygame.K_DOWN, pygame.K_LEFT, pygame.K_RIGHT,
                    pygame.K_w, pygame.K_s, pygame.K_a, pygame.K_d}
ESTADOS_COM_MENU = ('menu', 'garagem', 'pausa', 'opcoes')
COR_BONUS = (255, 200, 0)
COR_RASPOU = (0, 255, 255)
COR_CURA = (60, 255, 120)
COR_BLINDAGEM = (0, 220, 255)
EVENTOS_ITEM = {
    'kit': ('cura', f"+{VIDA_KIT} VIDA", COR_CURA),
    'nitro': ('galao', "NITRO CHEIO!", (255, 140, 0)),
    'blindagem': ('blindagem', "BLINDAGEM!", COR_BLINDAGEM),
    'carnaval': ('carnaval', "CARNAVAL! x2", COR_BONUS),
    'buraco': ('buraco', f"BURACO! -{DANO_BURACO}", (255, 90, 60)),
    'buraco_blindado': ('blindagem_quebra', "BLINDAGEM!", COR_BLINDAGEM),
}


class Corrida:
    def __init__(self, comprimento, atributos=None, largura_sprite=LARGURA_IMAGEM):
        self.carro = Carro(comprimento, atributos, largura_sprite)
        self.trafego = monta_trafego(comprimento, len(ARQUIVOS_NPC))
        self.rng = random.Random()
        self.nivel = 1
        self.aviso_nivel = 0.0
        self.tempo = 0.0
        self.tempo_drift = 0.0
        self.nitro_anterior = False
        self.itens = GerenciadorItens()


def finaliza(corrida, progresso):
    carro = corrida.carro
    pontos = pontuacao(carro.distancia, carro.ultrapassagens, carro.bonus)
    ganhas = moedas_ganhas(carro.distancia)
    novo_recorde = pontos > progresso['recorde']
    progresso['moedas'] += ganhas
    progresso['recorde'] = max(progresso['recorde'], pontos)
    salva(progresso)
    return {
        'pontos': pontos,
        'distancia': int(carro.distancia),
        'ultrapassagens': carro.ultrapassagens,
        'nivel': corrida.nivel,
        'moedas': ganhas,
        'novo_recorde': novo_recorde,
    }


def carrega_imagens_npc():
    return [pygame.image.load(caminho_asset(arquivo)).convert_alpha() for arquivo in ARQUIVOS_NPC]


def abre_janela(tela_cheia):
    flags = pygame.SCALED | (pygame.FULLSCREEN if tela_cheia else 0)
    return pygame.display.set_mode((LARGURA, ALTURA), flags)


def alterna_tela_cheia(config):
    pygame.display.toggle_fullscreen()
    config['tela_cheia'] = not config['tela_cheia']
    salva_config(config)


def atualiza_corrida(corrida, dt, segmentos, comprimento, progresso, audio, efeitos):
    carro = corrida.carro
    corrida.tempo += dt
    indice = int(carro.pos // TAM_SEGMENTO) % len(segmentos)
    carro.atualiza(dt, pygame.key.get_pressed(), segmentos[indice]['curva'])
    audio.motor_velocidade(carro.fracao)

    if carro.nitro_ativo and not corrida.nitro_anterior:
        audio.toca('nitro')
    corrida.nitro_anterior = carro.nitro_ativo

    if carro.drift:
        corrida.tempo_drift += dt
        for lado in (-1, 1):
            efeitos.fumaca(LARGURA // 2 + lado * 80, ALTURA - 20)
    else:
        if corrida.tempo_drift >= DRIFT_MINIMO_PARA_AVISO:
            efeitos.texto(f"DRIFT +{int(carro.pontos_drift)}", COR_BONUS)
        corrida.tempo_drift = 0.0
        carro.pontos_drift = 0.0
    if carro.carnaval > 0 and corrida.rng.random() < 0.6:
        efeitos.confete()

    nivel = ajusta_dificuldade(corrida.trafego, carro, comprimento, len(ARQUIVOS_NPC), corrida.rng)
    if nivel > corrida.nivel:
        corrida.nivel = nivel
        corrida.aviso_nivel = DURACAO_AVISO_NIVEL
        audio.toca('confirmar')
    corrida.aviso_nivel = max(0.0, corrida.aviso_nivel - dt)

    for evento in corrida.itens.atualiza(carro, comprimento, corrida.rng):
        som, mensagem, cor = EVENTOS_ITEM[evento]
        audio.toca(som)
        efeitos.texto(mensagem, cor)
        if evento == 'buraco':
            efeitos.batida(LARGURA // 2, ALTURA - 40)

    atualiza_trafego(corrida.trafego, dt, comprimento)
    for npc in corrida.trafego:
        if npc.cooldown <= 0 and colidiu(carro, npc, comprimento):
            npc.cooldown = COOLDOWN
            npc.bateu_recente = True
            efeitos.batida(LARGURA // 2, ALTURA - 90)
            if carro.sofre_dano(DANO):
                audio.toca('blindagem_quebra')
                efeitos.texto("BLINDAGEM!", COR_BLINDAGEM)
            else:
                audio.toca('batida')
        if conta_ultrapassagem(carro, npc, comprimento):
            carro.ultrapassagens += 1
            multiplicador = carro.multiplicador
            carro.bonus += PONTOS_ULTRAPASSAGEM * (multiplicador - 1)
            if raspou(carro, npc):
                carro.bonus += PONTOS_RASPANDO * multiplicador
                carro.ganha_nitro(NITRO_RASPANDO)
                audio.toca('raspou')
                efeitos.texto(f"RASPOU! +{(PONTOS_ULTRAPASSAGEM + PONTOS_RASPANDO) * multiplicador}", COR_RASPOU)
            else:
                carro.ganha_nitro(NITRO_ULTRAPASSAGEM)
                audio.toca('ultrapassagem')
                efeitos.texto(f"+{PONTOS_ULTRAPASSAGEM * multiplicador}", (255, 255, 255))
    efeitos.atualiza(dt)

    if carro.vida <= 0:
        audio.motor_desliga()
        audio.toca('fim')
        return finaliza(corrida, progresso)
    return None


def intensidade_vento(carro):
    if carro.nitro_ativo:
        return 1.0
    return max(0.0, (carro.fracao - 0.75) / 0.25) * 0.5


def main():
    pygame.init()
    config = carrega_config()
    tela = abre_janela(config['tela_cheia'])
    pygame.display.set_caption(TITULO)
    relogio = pygame.time.Clock()
    mundo = pygame.Surface((LARGURA, ALTURA))
    flash = pygame.Surface((LARGURA, ALTURA), pygame.SRCALPHA)
    flash.fill((255, 0, 0, 90))
    audio = Audio()
    audio.define_volume(config['volume'])
    efeitos = Efeitos()

    try:
        fundo = cria_fundo()
        imagens = {c['id']: carrega_imagem(caminho_asset(c['arquivo']), LARGURA_IMAGEM, ALTURA_MAX_IMAGEM)
                   for c in CARROS}
        miniaturas = {c['id']: carrega_imagem(caminho_asset(c['arquivo']), LARGURA_MINIATURA, ALTURA_MAX_MINIATURA)
                      for c in CARROS}
        imagens_menu = {c['id']: carrega_imagem(caminho_asset(c['arquivo']), LARGURA_MENU, ALTURA_MAX_MENU)
                        for c in CARROS}
        imagens_npc = carrega_imagens_npc()
    except (FileNotFoundError, pygame.error) as erro:
        pygame.quit()
        sys.exit(f"Arquivo do jogo ausente ou corrompido na pasta assets: {erro}")

    segmentos = monta_pista()
    comprimento = len(segmentos) * TAM_SEGMENTO
    progresso = carrega()
    menu = Menu()
    garagem = Garagem()
    pausa = Pausa()
    opcoes = Opcoes()

    estado = 'menu'
    origem_opcoes = 'menu'
    corrida, resultado = None, None

    def inicia_corrida():
        audio.motor_desliga()
        audio.motor_liga()
        efeitos.limpa()
        atributos = multiplicadores(progresso, carro_por_id(progresso['selecionado']))
        return Corrida(comprimento, atributos, imagens[progresso['selecionado']].get_width()), 'corrida'

    rodando = True
    while rodando:
        dt = min(relogio.tick(60) / 1000, 0.05)
        tempo = pygame.time.get_ticks() / 1000

        for evento in pygame.event.get():
            if evento.type == pygame.QUIT:
                rodando = False
                continue
            if evento.type != pygame.KEYDOWN:
                continue
            if evento.key == pygame.K_F11:
                alterna_tela_cheia(config)
                continue
            if estado in ESTADOS_COM_MENU and evento.key in TECLAS_NAVEGACAO:
                audio.toca('menu')

            if estado == 'menu':
                destino = menu.trata(evento)
                if destino:
                    audio.toca('confirmar')
                if destino == 'corrida':
                    corrida, estado = inicia_corrida()
                elif destino == 'garagem':
                    garagem.abre(progresso)
                    estado = 'garagem'
                elif destino == 'opcoes':
                    opcoes.abre()
                    origem_opcoes, estado = 'menu', 'opcoes'
                elif destino == 'sair':
                    rodando = False
            elif estado == 'garagem':
                retorno = garagem.trata(evento, progresso)
                if retorno == 'menu':
                    estado = 'menu'
                elif retorno:
                    audio.toca(retorno)
            elif estado == 'corrida':
                if evento.key in (pygame.K_ESCAPE, pygame.K_p):
                    audio.motor_pausa()
                    pausa.abre()
                    estado = 'pausa'
            elif estado == 'pausa':
                destino = pausa.trata(evento)
                if destino == 'continuar':
                    audio.motor_continua()
                    estado = 'corrida'
                elif destino == 'opcoes':
                    audio.toca('confirmar')
                    opcoes.abre()
                    origem_opcoes, estado = 'pausa', 'opcoes'
                elif destino == 'menu':
                    audio.motor_desliga()
                    corrida, estado = None, 'menu'
            elif estado == 'opcoes':
                retorno = opcoes.trata(evento, config)
                if retorno == 'volume':
                    audio.define_volume(config['volume'])
                    salva_config(config)
                elif retorno == 'tela_cheia':
                    alterna_tela_cheia(config)
                elif retorno == 'voltar':
                    estado = origem_opcoes
            elif estado == 'fim':
                if evento.key == pygame.K_r:
                    corrida, estado = inicia_corrida()
                elif evento.key in (pygame.K_m, pygame.K_ESCAPE):
                    corrida, estado = None, 'menu'

        if estado == 'corrida':
            resultado_corrida = atualiza_corrida(corrida, dt, segmentos, comprimento, progresso, audio, efeitos)
            if resultado_corrida is not None:
                resultado, estado = resultado_corrida, 'fim'
        elif estado == 'fim':
            efeitos.atualiza(dt)

        cena = origem_opcoes if estado == 'opcoes' else estado
        if cena == 'menu':
            menu.desenha(tela, progresso, fundo, imagens_menu[progresso['selecionado']])
        elif cena == 'garagem':
            garagem.desenha(tela, progresso, imagens_menu, miniaturas, fundo)
        else:
            carro = corrida.carro
            tremendo = efeitos.tremor > 0 and estado in ('corrida', 'fim')
            alvo = mundo if tremendo else tela
            desenha_fundo(alvo, fundo, carro.x)
            imagem_jogador = imagens[progresso['selecionado']]
            desenha_pista(alvo, segmentos, carro.pos, carro.x, corrida.trafego, imagens_npc, corrida.itens.itens,
                          lambda: desenha_carro(alvo, imagem_jogador, carro, tempo))
            if cena == 'corrida':
                efeitos.desenha_linhas_velocidade(alvo, intensidade_vento(carro))
            efeitos.desenha_particulas(alvo)
            if carro.dano_timer > 0:
                alvo.blit(flash, (0, 0))
            if tremendo:
                tela.fill((0, 0, 0))
                tela.blit(mundo, efeitos.deslocamento())
            if cena == 'fim':
                desenha_fim(tela, resultado)
            else:
                pontos = pontuacao(carro.distancia, carro.ultrapassagens, carro.bonus)
                desenha_hud(tela, carro, pontos, corrida.nivel, corrida.aviso_nivel, corrida.tempo, tempo)
                efeitos.desenha_textos(tela)
                if cena == 'pausa' and estado == 'pausa':
                    pausa.desenha(tela)
        if estado == 'opcoes':
            opcoes.desenha(tela, config)
        pygame.display.flip()

    pygame.quit()


if __name__ == "__main__":
    main()
