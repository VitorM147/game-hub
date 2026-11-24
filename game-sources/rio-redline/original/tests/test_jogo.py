import os
import sys
import tempfile
import unittest

os.environ.setdefault('SDL_VIDEODRIVER', 'dummy')
os.environ.setdefault('SDL_AUDIODRIVER', 'dummy')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pygame  # noqa: E402

import progresso  # noqa: E402
from carro import Carro  # noqa: E402
from carros import CARROS  # noqa: E402
from config import carrega_config, salva_config  # noqa: E402
from garagem import Garagem  # noqa: E402
from opcoes import Opcoes  # noqa: E402
from pausa import Pausa  # noqa: E402
from trafego import (  # noqa: E402
    DISTANCIA_NIVEL, NIVEL_MAX, NIVEL_TROCA_FAIXA, SURGIMENTO_MIN, LIMITE_FAIXA,
    Npc, ajusta_dificuldade, atualiza_trafego, caminho_livre, colidiu, conta_ultrapassagem,
    monta_trafego, nivel_para, quantidade_para,
)
from armazenamento import migra_pasta  # noqa: E402
from carro import NITRO_MAX, VEL_MAX, VEL_MAX_NITRO  # noqa: E402


class Teclas:
    def __init__(self, *pressionadas):
        self.pressionadas = set(pressionadas)

    def __getitem__(self, tecla):
        return tecla in self.pressionadas


class TestCarro(unittest.TestCase):
    def test_nitro_passa_do_limite_e_acaba(self):
        carro = Carro(COMPRIMENTO)
        carro.vel = VEL_MAX
        carro.nitro = NITRO_MAX
        for _ in range(60):
            carro.atualiza(1 / 60, Teclas(pygame.K_SPACE, pygame.K_UP), 0)
        self.assertGreater(carro.vel, VEL_MAX)
        self.assertLessEqual(carro.vel, VEL_MAX_NITRO)
        self.assertLess(carro.nitro, NITRO_MAX)
        for _ in range(600):
            carro.atualiza(1 / 60, Teclas(pygame.K_SPACE, pygame.K_UP), 0)
        self.assertEqual(carro.nitro, 0)
        self.assertFalse(carro.nitro_ativo)
        for _ in range(120):
            carro.atualiza(1 / 60, Teclas(pygame.K_UP), 0)
        self.assertAlmostEqual(carro.vel, VEL_MAX)

    def test_sem_nitro_nao_ativa(self):
        carro = Carro(COMPRIMENTO)
        carro.atualiza(1 / 60, Teclas(pygame.K_SPACE), 0)
        self.assertFalse(carro.nitro_ativo)

    def test_drift_gera_nitro_e_pontos_so_em_velocidade(self):
        carro = Carro(COMPRIMENTO)
        carro.vel = VEL_MAX * 0.2
        carro.atualiza(1 / 60, Teclas(pygame.K_LSHIFT, pygame.K_LEFT), 0)
        self.assertFalse(carro.drift)
        carro.vel = VEL_MAX
        for _ in range(60):
            carro.atualiza(1 / 60, Teclas(pygame.K_LSHIFT, pygame.K_LEFT, pygame.K_UP), 0)
        self.assertTrue(carro.drift)
        self.assertGreater(carro.nitro, 0)
        self.assertGreater(carro.bonus, 0)

    def test_inclina_para_o_lado_da_curva(self):
        carro = Carro(COMPRIMENTO)
        carro.vel = VEL_MAX
        for _ in range(30):
            carro.atualiza(1 / 60, Teclas(pygame.K_RIGHT, pygame.K_UP), 0)
        self.assertGreater(carro.inclinacao, 0)


class TestAtributos(unittest.TestCase):
    def setUp(self):
        self.pasta = tempfile.TemporaryDirectory()
        self.caminho_original = progresso.caminho_save
        progresso.caminho_save = lambda: os.path.join(self.pasta.name, 'save.json')
        self.dados = progresso.carrega(os.path.join(self.pasta.name, 'save.json'))

    def tearDown(self):
        progresso.caminho_save = self.caminho_original
        self.pasta.cleanup()

    def test_carro_inicial_e_a_referencia(self):
        from atributos import multiplicadores
        self.assertEqual(set(multiplicadores(self.dados, CARROS[0]).values()), {1.0})

    def test_carros_caros_sao_melhores_no_total(self):
        soma = [sum(carro['atributos'].values()) for carro in CARROS]
        self.assertEqual(soma[0], min(soma))
        self.assertEqual(soma[-1], max(soma))

    def test_lista_ordenada_por_preco_e_o_ultimo_e_o_mais_forte(self):
        precos = [carro['preco'] for carro in CARROS]
        self.assertEqual(precos, sorted(precos))
        ultimo = CARROS[-1]
        self.assertEqual(ultimo['id'], 'uno')
        for outro in CARROS[:-1]:
            self.assertGreater(sum(ultimo['atributos'].values()), sum(outro['atributos'].values()), outro['id'])
            for atributo, valor in outro['atributos'].items():
                self.assertGreaterEqual(ultimo['atributos'][atributo], valor, (outro['id'], atributo))

    def test_fluxo_de_compra_de_melhoria(self):
        from atributos import MELHORIAS_MAXIMAS, compra_melhoria, custo_melhoria, nivel
        bloqueado = CARROS[1]
        self.assertEqual(compra_melhoria(self.dados, bloqueado, 'velocidade'), 'bloqueado')
        carro = CARROS[0]
        self.assertEqual(compra_melhoria(self.dados, carro, 'velocidade'), 'sem_moedas')
        self.dados['moedas'] = 10000
        custos = []
        for _ in range(MELHORIAS_MAXIMAS):
            custos.append(custo_melhoria(self.dados, carro, 'velocidade'))
            self.assertEqual(compra_melhoria(self.dados, carro, 'velocidade'), 'ok')
        self.assertEqual(custos, sorted(custos))
        self.assertEqual(self.dados['moedas'], 10000 - sum(custos))
        self.assertEqual(nivel(self.dados, carro, 'velocidade'), 3 + MELHORIAS_MAXIMAS)
        self.assertEqual(compra_melhoria(self.dados, carro, 'velocidade'), 'maximo')
        salvo = progresso.carrega(progresso.caminho_save())
        self.assertEqual(salvo['melhorias'], {'veilside': {'velocidade': MELHORIAS_MAXIMAS}})

    def test_nivel_nao_passa_de_dez(self):
        from atributos import NIVEL_MAXIMO, nivel, pode_melhorar
        pedra = next(c for c in CARROS if c['id'] == 'pedra')
        self.dados['melhorias'] = {'pedra': {'resistencia': 3}}
        self.assertEqual(nivel(self.dados, pedra, 'resistencia'), NIVEL_MAXIMO)
        self.assertFalse(pode_melhorar(self.dados, pedra, 'resistencia'))

    def test_save_com_melhorias_invalidas_e_limpo(self):
        progresso.salva({'melhorias': {'veilside': {'velocidade': 2, 'voar': 1, 'nitro': 99},
                                       'inexistente': {'nitro': 1}, 'skyline': 'x'}},
                        progresso.caminho_save())
        dados = progresso.carrega(progresso.caminho_save())
        self.assertEqual(dados['melhorias'], {'veilside': {'velocidade': 2}})

    def test_atributos_mudam_a_corrida(self):
        rapido = Carro(COMPRIMENTO, {'velocidade': 1.2, 'aceleracao': 1.0, 'nitro': 1.0, 'resistencia': 2.0})
        normal = Carro(COMPRIMENTO)
        for carro in (rapido, normal):
            for _ in range(600):
                carro.atualiza(1 / 60, Teclas(pygame.K_UP), 0)
        self.assertAlmostEqual(rapido.vel, VEL_MAX * 1.2)
        self.assertAlmostEqual(normal.vel, VEL_MAX)
        rapido.sofre_dano(20)
        normal.sofre_dano(20)
        self.assertEqual(rapido.vida, 90)
        self.assertEqual(normal.vida, 80)

    def test_garagem_compra_melhoria_pelo_painel(self):
        self.dados['moedas'] = 1000
        garagem = Garagem()
        garagem.trata(tecla(pygame.K_DOWN), self.dados)
        self.assertEqual(garagem.trata(tecla(pygame.K_RETURN), self.dados), 'confirmar')
        self.assertEqual(self.dados['melhorias'], {'veilside': {'velocidade': 1}})


class TestImagensDosCarros(unittest.TestCase):
    def setUp(self):
        pygame.display.set_mode((1, 1))

    def test_nenhum_carro_passa_da_altura_maxima_na_corrida(self):
        from carro import ALTURA_MAX_IMAGEM, LARGURA_IMAGEM, carrega_imagem
        from carros import caminho_asset
        for carro in CARROS:
            imagem = carrega_imagem(caminho_asset(carro['arquivo']), LARGURA_IMAGEM, ALTURA_MAX_IMAGEM)
            self.assertLessEqual(imagem.get_height(), ALTURA_MAX_IMAGEM, carro['id'])
            self.assertLessEqual(imagem.get_width(), LARGURA_IMAGEM, carro['id'])

    def test_carros_baixos_mantem_a_largura_de_referencia(self):
        from carro import ALTURA_MAX_IMAGEM, LARGURA_IMAGEM, carrega_imagem
        from carros import caminho_asset
        imagem = carrega_imagem(caminho_asset('ovni.png'), LARGURA_IMAGEM, ALTURA_MAX_IMAGEM)
        self.assertEqual(imagem.get_width(), LARGURA_IMAGEM)
        self.assertLess(imagem.get_height(), ALTURA_MAX_IMAGEM)

    def test_coleta_de_item_acompanha_a_largura_do_carro(self):
        from itens import largura_coleta
        self.assertLess(largura_coleta('kit', Carro(COMPRIMENTO, largura_sprite=160)),
                        largura_coleta('kit', Carro(COMPRIMENTO)))


class TestPista(unittest.TestCase):
    def test_listas_auxiliares_acompanham_os_segmentos(self):
        from pista import decor_do_segmento, monta_pista
        segmentos = monta_pista()
        self.assertEqual(segmentos.ys, [s['y'] for s in segmentos])
        self.assertEqual(segmentos.curvas, [s['curva'] for s in segmentos])
        self.assertEqual(segmentos.decor, [decor_do_segmento(i) for i in range(len(segmentos))])

    def test_desenho_aceita_lista_comum_de_segmentos(self):
        from pista import ALTURA, LARGURA, desenha_pista, monta_pista
        segmentos = monta_pista()
        a, b = pygame.Surface((LARGURA, ALTURA)), pygame.Surface((LARGURA, ALTURA))
        desenha_pista(a, segmentos, 5000, 0.2, [], [])
        desenha_pista(b, list(segmentos), 5000, 0.2, [], [])
        self.assertEqual(pygame.image.tobytes(a, 'RGB'), pygame.image.tobytes(b, 'RGB'))


class TestDesenhoNpc(unittest.TestCase):
    def setUp(self):
        import pista
        self.pista = pista
        self.larguras = []
        self.original = pista._escala_npc
        original = pista._escala_npc.__wrapped__

        def espiao(imagem, largura):
            self.larguras.append(largura)
            return original(imagem, largura)
        pista._escala_npc = espiao
        self.tela = pygame.Surface((pista.LARGURA, pista.ALTURA))
        self.imagem = pygame.Surface((300, 200), pygame.SRCALPHA)

    def tearDown(self):
        self.pista._escala_npc = self.original

    def _desenha(self, dz, sy=None):
        p = self.pista
        esc = p.PROFUNDIDADE_CAMERA / dz
        y = sy if sy is not None else p.ALTURA / 2 + esc * p.ALTURA_CAMERA * p.ESCALA_Y
        p.desenha_npc(self.tela, p.LARGURA / 2, y, esc, self.imagem)

    def test_npc_colado_na_camera_nao_gera_sprite_gigante(self):
        for dz in (400, 120, 40, 12, 2, 1):
            self._desenha(dz)
        self.assertEqual(self.larguras, [])

    def test_teto_de_largura_protege_mesmo_se_estiver_na_tela(self):
        self._desenha(2, sy=self.pista.ALTURA)
        self.assertEqual(self.larguras, [])

    def test_npc_no_horizonte_e_no_nivel_do_jogador_sao_desenhados(self):
        p = self.pista
        self._desenha(1154)
        self._desenha(5000)
        self.assertEqual(len(self.larguras), 2)
        referencia = p.LARGURA_REFERENCIA_CARRO * 1000 / 1154
        self.assertAlmostEqual(self.larguras[0], referencia, delta=referencia * 0.06)
        self.assertLessEqual(max(self.larguras), p.LARGURA_MAXIMA_SPRITE)

    def test_larguras_sao_agrupadas_para_o_cache(self):
        larguras = set()
        for dz in range(1200, 6000, 7):
            self.larguras.clear()
            self._desenha(dz)
            larguras.update(self.larguras)
        self.assertLess(len(larguras), 160)


class TestItens(unittest.TestCase):
    def setUp(self):
        import random
        from itens import GerenciadorItens
        self.rng = random.Random(0)
        self.itens = GerenciadorItens()
        self.carro = Carro(COMPRIMENTO)

    def _item_no_carro(self, tipo, dx=0.0):
        from itens import Item
        from pista import PROFUNDIDADE_JOGADOR
        self.itens.itens = [Item(self.carro.pos + PROFUNDIDADE_JOGADOR + 50, self.carro.x + dx, tipo)]
        return self.itens.atualiza(self.carro, COMPRIMENTO, self.rng)

    def test_nao_aparece_antes_do_intervalo(self):
        from itens import INTERVALO_ITEM
        self.carro.distancia = INTERVALO_ITEM - 1
        self.itens.atualiza(self.carro, COMPRIMENTO, self.rng)
        self.assertEqual(self.itens.itens, [])

    def test_aparece_um_por_vez_a_frente(self):
        from itens import INTERVALO_ITEM, SURGIMENTO_MIN
        self.carro.distancia = INTERVALO_ITEM * 3
        self.itens.atualiza(self.carro, COMPRIMENTO, self.rng)
        self.itens.atualiza(self.carro, COMPRIMENTO, self.rng)
        self.assertEqual(len(self.itens.itens), 1)
        self.assertGreaterEqual((self.itens.itens[0].pos - self.carro.pos) % COMPRIMENTO, SURGIMENTO_MIN - 1)

    def test_so_sorteia_itens_uteis(self):
        from carro import NITRO_MAX
        from itens import tipos_disponiveis
        self.carro.nitro = NITRO_MAX
        self.carro.blindado = True
        self.carro.carnaval = 5
        self.assertEqual(tipos_disponiveis(self.carro), ['buraco'])
        self.carro.vida, self.carro.nitro, self.carro.blindado, self.carro.carnaval = 50, 0, False, 0
        self.assertEqual(set(tipos_disponiveis(self.carro)), {'buraco', 'kit', 'nitro', 'blindagem', 'carnaval'})

    def test_item_chega_ate_o_jogador_dirigindo(self):
        from itens import INTERVALO_ITEM
        self.carro.distancia = INTERVALO_ITEM
        self.carro.vel = 6000
        self.itens.atualiza(self.carro, COMPRIMENTO, self.rng)
        self.carro.x = self.itens.itens[0].x
        eventos = []
        for _ in range(60 * 10):
            self.carro.pos = (self.carro.pos + self.carro.vel / 60) % COMPRIMENTO
            eventos += self.itens.atualiza(self.carro, COMPRIMENTO, self.rng)
        self.assertEqual(len(eventos), 1)

    def test_kit_cura_sem_passar_de_cem(self):
        from itens import VIDA_KIT
        self.carro.vida = 90
        self.assertEqual(self._item_no_carro('kit'), ['kit'])
        self.assertEqual(self.carro.vida, min(100, 90 + VIDA_KIT))
        self.assertEqual(self.itens.itens, [])

    def test_galao_enche_o_nitro(self):
        from carro import NITRO_MAX
        self.assertEqual(self._item_no_carro('nitro'), ['nitro'])
        self.assertEqual(self.carro.nitro, NITRO_MAX)

    def test_blindagem_absorve_uma_batida(self):
        self._item_no_carro('blindagem')
        self.assertTrue(self.carro.blindado)
        self.assertTrue(self.carro.sofre_dano(20))
        self.assertEqual(self.carro.vida, 100)
        self.assertFalse(self.carro.blindado)
        self.assertFalse(self.carro.sofre_dano(20))
        self.assertEqual(self.carro.vida, 80)

    def test_buraco_machuca_e_blindagem_protege(self):
        from itens import DANO_BURACO
        self.carro.vel = 6000
        self.assertEqual(self._item_no_carro('buraco'), ['buraco'])
        self.assertEqual(self.carro.vida, 100 - DANO_BURACO)
        self.assertLess(self.carro.vel, 6000)
        self.carro.blindado = True
        self.assertEqual(self._item_no_carro('buraco'), ['buraco_blindado'])
        self.assertEqual(self.carro.vida, 100 - DANO_BURACO)

    def test_carnaval_dobra_pontos_e_acaba(self):
        from itens import DURACAO_CARNAVAL
        self._item_no_carro('carnaval')
        self.assertEqual(self.carro.multiplicador, 2)
        self.carro.vel = 6000
        bonus_inicial = self.carro.bonus
        for _ in range(60):
            self.carro.atualiza(1 / 60, Teclas(pygame.K_UP), 0)
        ganho_distancia = self.carro.distancia / 10
        self.assertAlmostEqual(self.carro.bonus - bonus_inicial, ganho_distancia, delta=1)
        for _ in range(int(60 * DURACAO_CARNAVAL)):
            self.carro.atualiza(1 / 60, Teclas(pygame.K_UP), 0)
        self.assertEqual(self.carro.multiplicador, 1)

    def test_item_em_outra_faixa_e_perdido_depois_de_passar(self):
        from itens import Item
        from pista import PROFUNDIDADE_JOGADOR
        self.carro.vida = 50
        self.itens.itens = [Item(5000, 0.7, 'kit')]
        self.carro.x = -0.5
        self.carro.pos = 5000 - PROFUNDIDADE_JOGADOR - 50
        self.assertEqual(self.itens.atualiza(self.carro, COMPRIMENTO, self.rng), [])
        self.assertEqual(len(self.itens.itens), 1)
        self.carro.pos = 5000 - PROFUNDIDADE_JOGADOR + 500
        self.itens.atualiza(self.carro, COMPRIMENTO, self.rng)
        self.assertEqual(self.itens.itens, [])
        self.assertEqual(self.carro.vida, 50)


class TestArmazenamento(unittest.TestCase):
    def test_migra_pasta_antiga_preservando_save(self):
        with tempfile.TemporaryDirectory() as base:
            antiga, nova = os.path.join(base, 'antiga'), os.path.join(base, 'nova')
            os.makedirs(antiga)
            with open(os.path.join(antiga, 'save.json'), 'w') as arquivo:
                arquivo.write('{}')
            migra_pasta(antiga, nova)
            self.assertTrue(os.path.exists(os.path.join(nova, 'save.json')))
            self.assertFalse(os.path.exists(antiga))

    def test_nao_sobrescreve_pasta_nova_existente(self):
        with tempfile.TemporaryDirectory() as base:
            antiga, nova = os.path.join(base, 'antiga'), os.path.join(base, 'nova')
            os.makedirs(antiga)
            os.makedirs(nova)
            migra_pasta(antiga, nova)
            self.assertTrue(os.path.exists(antiga))

pygame.init()

COMPRIMENTO = 81000


def tecla(codigo):
    return pygame.event.Event(pygame.KEYDOWN, key=codigo)


class TestProgresso(unittest.TestCase):
    def setUp(self):
        self.pasta = tempfile.TemporaryDirectory()
        self.caminho = os.path.join(self.pasta.name, 'save.json')

    def tearDown(self):
        self.pasta.cleanup()

    def test_sem_arquivo_usa_padrao(self):
        self.assertEqual(progresso.carrega(self.caminho), progresso.PADRAO)

    def test_salva_e_carrega(self):
        dados = progresso.carrega(self.caminho)
        dados['moedas'] = 42
        progresso.salva(dados, self.caminho)
        self.assertEqual(progresso.carrega(self.caminho)['moedas'], 42)

    def test_arquivo_corrompido_volta_ao_padrao_e_e_preservado(self):
        with open(self.caminho, 'w') as arquivo:
            arquivo.write('{quebrado')
        self.assertEqual(progresso.carrega(self.caminho), progresso.PADRAO)
        self.assertTrue(os.path.exists(self.caminho + '.corrompido'))

    def test_valores_invalidos_sao_corrigidos(self):
        progresso.salva({'moedas': -5, 'recorde': 'x', 'desbloqueados': ['inexistente'],
                         'selecionado': 'inexistente'}, self.caminho)
        dados = progresso.carrega(self.caminho)
        self.assertEqual(dados['moedas'], 0)
        self.assertEqual(dados['recorde'], 0)
        self.assertEqual(dados['desbloqueados'], [CARROS[0]['id']])
        self.assertEqual(dados['selecionado'], CARROS[0]['id'])

    def test_pontuacao_e_moedas(self):
        self.assertEqual(progresso.pontuacao(1000, 2), 200)
        self.assertEqual(progresso.pontuacao(1000, 2, 30.7), 230)
        self.assertEqual(progresso.moedas_ganhas(1050), 10)


class TestConfig(unittest.TestCase):
    def test_salva_e_carrega_tela_cheia(self):
        with tempfile.TemporaryDirectory() as pasta:
            caminho = os.path.join(pasta, 'config.json')
            self.assertFalse(carrega_config(caminho)['tela_cheia'])
            salva_config({'tela_cheia': True}, caminho)
            self.assertTrue(carrega_config(caminho)['tela_cheia'])

    def test_volume_invalido_e_corrigido(self):
        with tempfile.TemporaryDirectory() as pasta:
            caminho = os.path.join(pasta, 'config.json')
            self.assertEqual(carrega_config(caminho)['volume'], 70)
            salva_config({'volume': 250}, caminho)
            self.assertEqual(carrega_config(caminho)['volume'], 100)
            salva_config({'volume': 'alto'}, caminho)
            self.assertEqual(carrega_config(caminho)['volume'], 70)


class TestDificuldade(unittest.TestCase):
    def test_nivel_sobe_com_distancia_e_tem_teto(self):
        self.assertEqual(nivel_para(0), 1)
        self.assertEqual(nivel_para(DISTANCIA_NIVEL), 2)
        self.assertEqual(nivel_para(DISTANCIA_NIVEL * 100), NIVEL_MAX)

    def test_trafego_cresce_a_frente_do_jogador_sem_sobrepor(self):
        import random
        carro = Carro(COMPRIMENTO)
        trafego = monta_trafego(COMPRIMENTO, 6)
        self.assertEqual(len(trafego), quantidade_para(1))
        carro.distancia = DISTANCIA_NIVEL * 4
        rng = random.Random(0)
        for passo in range(60):
            carro.pos = (passo * 1500) % COMPRIMENTO
            antes = len(trafego)
            nivel = ajusta_dificuldade(trafego, carro, COMPRIMENTO, 6, rng)
            if len(trafego) > antes:
                dz = (trafego[-1].pos - carro.pos) % COMPRIMENTO
                self.assertGreaterEqual(dz, SURGIMENTO_MIN - 1)
                self.assertTrue(caminho_livre(trafego[-1], trafego[-1].x, trafego[:-1], COMPRIMENTO))
        self.assertEqual(nivel, 5)
        self.assertEqual(len(trafego), quantidade_para(5))
        self.assertTrue(all(npc.troca_faixa for npc in trafego))

    def test_npcs_nao_se_atravessam_trocando_de_faixa(self):
        trafego = [Npc(1000 + i * 300, -0.6 + i * 0.4, 0, troca_faixa=True) for i in range(4)]
        for _ in range(3000):
            atualiza_trafego(trafego, 1 / 60, COMPRIMENTO)
            for i, a in enumerate(trafego):
                for b in trafego[i + 1:]:
                    perto = abs((b.pos - a.pos + COMPRIMENTO / 2) % COMPRIMENTO - COMPRIMENTO / 2) < 300
                    self.assertFalse(perto and abs(a.x - b.x) < 0.2)

    def test_caminho_bloqueado_por_vizinho(self):
        npc = Npc(1000, -0.6, 0)
        vizinho = Npc(1200, 0.0, 0)
        self.assertFalse(caminho_livre(npc, 0.6, [npc, vizinho], COMPRIMENTO))
        vizinho.pos = 1000 + 5000
        self.assertTrue(caminho_livre(npc, 0.6, [npc, vizinho], COMPRIMENTO))

    def test_sem_troca_de_faixa_no_inicio(self):
        import random
        carro = Carro(COMPRIMENTO)
        trafego = monta_trafego(COMPRIMENTO, 6)
        carro.distancia = DISTANCIA_NIVEL * (NIVEL_TROCA_FAIXA - 2)
        ajusta_dificuldade(trafego, carro, COMPRIMENTO, 6, random.Random(0))
        self.assertFalse(any(npc.troca_faixa for npc in trafego))

    def test_troca_de_faixa_respeita_limite_e_velocidade(self):
        npc = Npc(0, 0.0, 0, troca_faixa=True)
        npc.alvo_x = LIMITE_FAIXA
        npc.atualiza(1.0, COMPRIMENTO)
        self.assertAlmostEqual(npc.x, 0.35)
        for _ in range(10):
            npc.atualiza(1.0, COMPRIMENTO)
        self.assertLessEqual(abs(npc.x), LIMITE_FAIXA)


class TestMotor(unittest.TestCase):
    def test_rotacao_cai_ao_trocar_de_marcha(self):
        from audio import MARCHAS, ROTACAO_APOS_TROCA, rotacao_motor
        self.assertEqual(rotacao_motor(0), 0)
        fim_primeira = rotacao_motor(1 / MARCHAS - 1e-6)
        inicio_segunda = rotacao_motor(1 / MARCHAS + 1e-6)
        self.assertGreater(fim_primeira, 0.99)
        self.assertAlmostEqual(inicio_segunda, ROTACAO_APOS_TROCA, places=3)
        self.assertEqual(rotacao_motor(1), 1)

    def test_reamostra_muda_duracao_e_emenda_o_loop(self):
        import array
        import math
        from audio import reamostra
        onda = array.array('h', (int(10000 * math.sin(2 * math.pi * k / 100)) for k in range(1000)))
        agudo = reamostra(onda, 2.0)
        grave = reamostra(onda, 0.5)
        self.assertEqual(len(agudo), 500)
        self.assertEqual(len(grave), 2000)
        maior_passo = max(abs(grave[k + 1] - grave[k]) for k in range(len(grave) - 1))
        self.assertLessEqual(abs(grave[-1] - grave[0]), maior_passo)


class TestTelas(unittest.TestCase):
    def test_pausa_esc_continua_e_enter_seleciona(self):
        pausa = Pausa()
        self.assertEqual(pausa.trata(tecla(pygame.K_ESCAPE)), 'continuar')
        pausa.trata(tecla(pygame.K_DOWN))
        pausa.trata(tecla(pygame.K_DOWN))
        self.assertEqual(pausa.trata(tecla(pygame.K_RETURN)), 'menu')

    def test_opcoes_volume_tem_limites(self):
        opcoes = Opcoes()
        config = {'volume': 100, 'tela_cheia': False}
        self.assertIsNone(opcoes.trata(tecla(pygame.K_RIGHT), config))
        self.assertEqual(opcoes.trata(tecla(pygame.K_LEFT), config), 'volume')
        self.assertEqual(config['volume'], 90)

    def test_opcoes_tela_cheia_e_voltar(self):
        opcoes = Opcoes()
        config = {'volume': 50, 'tela_cheia': False}
        opcoes.trata(tecla(pygame.K_DOWN), config)
        self.assertEqual(opcoes.trata(tecla(pygame.K_RETURN), config), 'tela_cheia')
        opcoes.trata(tecla(pygame.K_DOWN), config)
        self.assertEqual(opcoes.trata(tecla(pygame.K_RETURN), config), 'voltar')
        self.assertEqual(opcoes.trata(tecla(pygame.K_ESCAPE), config), 'voltar')


class TestTrafego(unittest.TestCase):
    def setUp(self):
        self.carro = Carro(COMPRIMENTO)
        self.npc = Npc(10000, 0.0, 0)

    def _npc_a(self, dz, dx=0.0):
        self.carro.pos = self.npc.pos - dz
        self.carro.x = self.npc.x - dx

    def test_zona_de_contato_bate_com_a_tela(self):
        from pista import (BASE_JOGADOR_Y, ALTURA_CONTATO_JOGADOR, ALTURA_CAMERA, PROFUNDIDADE_FRENTE_JOGADOR,
                           PROFUNDIDADE_JOGADOR, projeta)
        traseira = projeta(PROFUNDIDADE_JOGADOR, 0, 0, 0, ALTURA_CAMERA, 0)
        frente = projeta(PROFUNDIDADE_FRENTE_JOGADOR, 0, 0, 0, ALTURA_CAMERA, 0)
        self.assertAlmostEqual(traseira[1], BASE_JOGADOR_Y)
        self.assertAlmostEqual(frente[1], BASE_JOGADOR_Y - ALTURA_CONTATO_JOGADOR)

    def test_colide_quando_npc_esta_sobre_o_carro_na_tela(self):
        from pista import PROFUNDIDADE_FRENTE_JOGADOR, PROFUNDIDADE_JOGADOR
        for dz in (PROFUNDIDADE_JOGADOR, (PROFUNDIDADE_JOGADOR + PROFUNDIDADE_FRENTE_JOGADOR) / 2,
                   PROFUNDIDADE_FRENTE_JOGADOR - 1):
            self._npc_a(dz)
            self.assertTrue(colidiu(self.carro, self.npc, COMPRIMENTO), dz)

    def test_nao_colide_com_npc_atras_da_camera_nem_longe(self):
        from pista import PROFUNDIDADE_FRENTE_JOGADOR
        for dz in (0, 450, PROFUNDIDADE_FRENTE_JOGADOR + 200, 5000):
            self._npc_a(dz)
            self.assertFalse(colidiu(self.carro, self.npc, COMPRIMENTO), dz)

    def test_colide_com_npc_encostado_na_traseira(self):
        from pista import PROFUNDIDADE_JOGADOR
        self._npc_a(PROFUNDIDADE_JOGADOR - 400, 0.15)
        self.assertTrue(colidiu(self.carro, self.npc, COMPRIMENTO))

    def test_largura_lateral(self):
        from pista import PROFUNDIDADE_JOGADOR
        from trafego import LARGURA_COLISAO
        self._npc_a(PROFUNDIDADE_JOGADOR + 100, LARGURA_COLISAO - 0.02)
        self.assertTrue(colidiu(self.carro, self.npc, COMPRIMENTO))
        self._npc_a(PROFUNDIDADE_JOGADOR + 100, LARGURA_COLISAO + 0.02)
        self.assertFalse(colidiu(self.carro, self.npc, COMPRIMENTO))

    def test_carro_estreito_tem_area_de_batida_menor(self):
        from pista import PROFUNDIDADE_JOGADOR
        from trafego import LARGURA_COLISAO, largura_colisao, raspou
        estreito = Carro(COMPRIMENTO, largura_sprite=160)
        largo = Carro(COMPRIMENTO)
        self.assertLess(largura_colisao(estreito.meia_largura), LARGURA_COLISAO)
        self.assertAlmostEqual(largura_colisao(largo.meia_largura), LARGURA_COLISAO)
        for carro, bate in ((estreito, False), (largo, True)):
            self.carro = carro
            self._npc_a(PROFUNDIDADE_JOGADOR + 100, 0.85 * LARGURA_COLISAO)
            self.assertEqual(colidiu(carro, self.npc, COMPRIMENTO), bate)
        self.carro = estreito
        self._npc_a(PROFUNDIDADE_JOGADOR + 100, largura_colisao(estreito.meia_largura) + 0.1)
        self.assertTrue(raspou(estreito, self.npc))

    def test_sem_tunel_em_velocidade_maxima_de_nitro(self):
        from carro import VEL_MAX_NITRO
        self.carro.x = self.npc.x
        bateu = False
        self.carro.pos = self.npc.pos - 5000
        for _ in range(120):
            self.carro.pos += (VEL_MAX_NITRO * 1.35 - 4000) / 60
            bateu = bateu or colidiu(self.carro, self.npc, COMPRIMENTO)
        self.assertTrue(bateu)

    def test_ultrapassagem_conta_uma_vez(self):
        from pista import PROFUNDIDADE_JOGADOR
        for dz, esperado in ((PROFUNDIDADE_JOGADOR + 100, 0), (PROFUNDIDADE_JOGADOR - 100, 1),
                             (PROFUNDIDADE_JOGADOR - 200, 0)):
            self._npc_a(dz, 0.8)
            self.assertEqual(conta_ultrapassagem(self.carro, self.npc, COMPRIMENTO), esperado)

    def test_ultrapassagem_apos_batida_nao_conta(self):
        from pista import PROFUNDIDADE_JOGADOR
        self._npc_a(PROFUNDIDADE_JOGADOR + 100)
        conta_ultrapassagem(self.carro, self.npc, COMPRIMENTO)
        self.npc.bateu_recente = True
        self._npc_a(PROFUNDIDADE_JOGADOR - 100)
        self.assertEqual(conta_ultrapassagem(self.carro, self.npc, COMPRIMENTO), 0)


class TestGaragem(unittest.TestCase):
    def setUp(self):
        self.pasta = tempfile.TemporaryDirectory()
        self.caminho_original = progresso.caminho_save
        progresso.caminho_save = lambda: os.path.join(self.pasta.name, 'save.json')
        self.dados = progresso.carrega(os.path.join(self.pasta.name, 'save.json'))

    def tearDown(self):
        progresso.caminho_save = self.caminho_original
        self.pasta.cleanup()

    def test_compra_sem_moedas_falha(self):
        garagem = Garagem()
        garagem.trata(tecla(pygame.K_RIGHT), self.dados)
        self.assertEqual(garagem.trata(tecla(pygame.K_RETURN), self.dados), 'erro')
        self.assertNotIn(CARROS[1]['id'], self.dados['desbloqueados'])

    def test_compra_com_moedas_desbloqueia(self):
        self.dados['moedas'] = CARROS[1]['preco']
        garagem = Garagem()
        garagem.trata(tecla(pygame.K_RIGHT), self.dados)
        self.assertEqual(garagem.trata(tecla(pygame.K_RETURN), self.dados), 'confirmar')
        self.assertIn(CARROS[1]['id'], self.dados['desbloqueados'])
        self.assertEqual(self.dados['moedas'], 0)
        self.assertEqual(self.dados['selecionado'], CARROS[1]['id'])


if __name__ == '__main__':
    unittest.main()
