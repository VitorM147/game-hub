/*
 * RIO REDLINE — porte para navegador (JavaScript + Canvas 2D + WebAudio).
 *
 * Este arquivo é um PORTE do jogo original em Python/pygame
 * (https://github.com/Kaique-Martins/jogo-a3, "Nitro Carioca"). Constantes, fórmulas,
 * estados e telas seguem os módulos originais (config, carro, carros, atributos,
 * itens, trafego, pista, progresso, garagem, menu, pausa, opcoes, hud, efeitos, audio).
 * O código original está preservado, sem alterações, em game-sources/rio-redline/original.
 *
 * Diferenças deliberadas (documentadas em docs/RELATORIO.md):
 *  - sem "Sair" e sem "Tela cheia" no menu (o portal cuida disso);
 *  - progresso e opções ficam em localStorage (não em arquivo);
 *  - a posição do trânsito inicial e da decoração usa um gerador pseudoaleatório
 *    próprio (o do Python não existe no navegador), então o desenho exato da pista difere;
 *  - em telas de toque a aceleração é automática (soltar = freio de motor, FREIO = freia);
 *  - sem som de motor: o repositório não traz o arquivo assets/sons/motor.*, e o jogo
 *    original só toca motor se ele existir.
 */
(() => {
  'use strict';

  // ------------------------------------------------------------------ utilidades
  const W = 960, H = 540;
  const A = (nome) => (window.__ASSETS && window.__ASSETS[nome]) || 'img/' + nome + '.webp';
  const mod = (a, n) => ((a % n) + n) % n;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const trunc = Math.trunc;
  const rgb = (c, a) => (a === undefined || a >= 1) ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  class Rng {
    constructor(semente) { this.s = (semente >>> 0) || 1; }
    random() { // mulberry32
      this.s = (this.s + 0x6D2B79F5) >>> 0;
      let t = this.s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    uniform(a, b) { return a + (b - a) * this.random(); }
    randint(a, b) { return a + Math.floor(this.random() * (b - a + 1)); }
    randrange(n) { return Math.floor(this.random() * n); }
    choice(lista) { return lista[this.randrange(lista.length)]; }
    choices(lista, pesos) {
      const total = pesos.reduce((x, y) => x + y, 0);
      let r = this.random() * total;
      for (let i = 0; i < lista.length; i++) { r -= pesos[i]; if (r < 0) return lista[i]; }
      return lista[lista.length - 1];
    }
  }
  const rngGlobal = new Rng((Math.random() * 4294967296) >>> 0);

  // ------------------------------------------------------------------ pista.py (constantes)
  const ESCALA_X = W / 2, ESCALA_Y = ESCALA_X * 0.75;
  const TAM_SEGMENTO = 200, LARGURA_PISTA = 2000, ALTURA_CAMERA = 1000, PROFUNDIDADE_CAMERA = 0.84;
  const DISTANCIA_DESENHO = 250, LARGURA_REFERENCIA_CARRO = 230, DISTANCIA_REFERENCIA = 1000;
  const NPC_LARGURA_MUNDO = LARGURA_REFERENCIA_CARRO * DISTANCIA_REFERENCIA / (PROFUNDIDADE_CAMERA * ESCALA_X);
  const LARGURA_ITEM = NPC_LARGURA_MUNDO * 0.35, LARGURA_BURACO = NPC_LARGURA_MUNDO * 0.6;
  const BASE_JOGADOR_Y = H - 8, ALTURA_CONTATO_JOGADOR = 90, LARGURA_MAXIMA_SPRITE = 2 * W;
  const profundidadeNaTela = (y) => PROFUNDIDADE_CAMERA * ALTURA_CAMERA * ESCALA_Y / (y - H / 2);
  const PROFUNDIDADE_JOGADOR = profundidadeNaTela(BASE_JOGADOR_Y);
  const PROFUNDIDADE_FRENTE_JOGADOR = profundidadeNaTela(BASE_JOGADOR_Y - ALTURA_CONTATO_JOGADOR);
  const meiaLarguraPara = (px) => (px / 2) / ((PROFUNDIDADE_CAMERA / PROFUNDIDADE_JOGADOR) * LARGURA_PISTA * ESCALA_X);
  const meiaLarguraJogador = () => meiaLarguraPara(LARGURA_REFERENCIA_CARRO);

  const TRECHOS = [[60, 0, 0], [40, 0, 20], [50, 3, 0], [40, 0, -20], [60, -3, 0], [65, 2, 0], [40, 0, 0], [50, -2, 0]];
  const CORES = [
    { grama: [14, 60, 40], rumble: [240, 240, 240], asfalto: [62, 58, 66] },
    { grama: [18, 72, 48], rumble: [230, 60, 60], asfalto: [72, 68, 76] },
  ];
  const PREDIOS = [[236, 206, 160], [214, 180, 140], [240, 232, 214], [190, 222, 214]];
  const PROBABILIDADE_DECOR = 0.07;
  const TIPOS_DECOR = ['palmeira', 'poste', 'casa', 'placa'], PESOS_DECOR = [0.3, 0.3, 0.25, 0.15];

  function decorDoSegmento(indice) {
    const rng = new Rng(indice * 7919 + 7);
    const decor = [];
    for (const lado of [-1, 1]) {
      if (rng.random() >= PROBABILIDADE_DECOR) continue;
      const tipo = rng.choices(TIPOS_DECOR, PESOS_DECOR);
      const item = { tipo, x: lado * rng.randint(2300, 3100), altura: rng.randint(900, 1400) };
      if (tipo === 'casa') { item.largura = rng.randint(500, 800); item.altura = rng.randint(350, 600); item.cor = rng.choice(PREDIOS); }
      decor.push(item);
    }
    return decor;
  }

  function montaPista() {
    const ys = [], curvas = [];
    let y = 0;
    for (const [qtd, curva, subida] of TRECHOS) for (let i = 0; i < qtd; i++) { curvas.push(curva); ys.push(y); y += subida; }
    const decor = ys.map((_, i) => decorDoSegmento(i));
    return { n: ys.length, ys, curvas, decor };
  }

  // ------------------------------------------------------------------ carros.py / progresso.py / atributos.py
  const at = (v, a, n, r) => ({ velocidade: v, aceleracao: a, nitro: n, resistencia: r });
  const CARROS = [
    { id: 'veilside', nome: 'Veilside RX-7', arquivo: 'carro', preco: 0, atributos: at(3, 3, 3, 3) },
    { id: 'skyline', nome: 'R34 Skyline', arquivo: 'skyline_r34', preco: 300, atributos: at(4, 4, 3, 4) },
    { id: 'supra', nome: 'Supra MK4', arquivo: 'supra_mk4', preco: 500, atributos: at(5, 4, 4, 3) },
    { id: 'troller', nome: 'Troller T4', arquivo: 'troller', preco: 800, atributos: at(4, 4, 3, 7) },
    { id: 'lfa', nome: 'LFA-EXP', arquivo: 'lfa', preco: 1500, atributos: at(6, 5, 4, 4) },
    { id: 'delorean', nome: 'Cyber-DeLorean', arquivo: 'delorean', preco: 3000, atributos: at(6, 5, 7, 4) },
    { id: 'pedra', nome: 'Flintstones', arquivo: 'pedra', preco: 5000, atributos: at(3, 3, 3, 9) },
    { id: 'ovni', nome: 'NLO-ET', arquivo: 'ovni', preco: 8000, atributos: at(8, 7, 7, 5) },
    { id: 'uno', nome: 'Uno com Escada', arquivo: 'uno_escada', preco: 15000, atributos: at(9, 9, 9, 9) },
  ];
  const ARQUIVOS_NPC = [1, 2, 3, 4, 5, 6].map((i) => 'npc_' + i);
  const carroPorId = (id) => CARROS.find((c) => c.id === id);

  const MELHORIAS_LIMITE = 3;
  const ATRIBUTOS = ['velocidade', 'aceleracao', 'nitro', 'resistencia'];
  const NOMES = { velocidade: 'Velocidade', aceleracao: 'Aceleração', nitro: 'Nitro', resistencia: 'Resistência' };
  const NIVEL_MAXIMO = 10, NIVEL_REFERENCIA = 3, GANHO_POR_NIVEL = 0.05, CUSTO_BASE_MELHORIA = 200, FATOR_PRECO_CARRO = 0.1;
  const IDS_CARROS = new Set(CARROS.map((c) => c.id));
  const KEY_PROGRESSO = 'rio-redline:progresso', KEY_CONFIG = 'rio-redline:config';

  const memoria = {};
  const lerJson = (k) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : (memoria[k] ?? null); } catch (e) { return memoria[k] ?? null; } };
  const gravarJson = (k, v) => { memoria[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem armazenamento: fica na memória */ } };

  const progressoPadrao = () => ({ moedas: 0, recorde: 0, desbloqueados: [CARROS[0].id], selecionado: CARROS[0].id, melhorias: {} });
  function validaMelhorias(m) {
    if (!m || typeof m !== 'object' || Array.isArray(m)) return {};
    const out = {};
    for (const [id, por] of Object.entries(m)) {
      if (!IDS_CARROS.has(id) || !por || typeof por !== 'object') continue;
      const limpas = {};
      for (const [a, q] of Object.entries(por)) if (ATRIBUTOS.includes(a) && Number.isInteger(q) && q > 0 && q <= MELHORIAS_LIMITE) limpas[a] = q;
      if (Object.keys(limpas).length) out[id] = limpas;
    }
    return out;
  }
  function validaProgresso(d) {
    const p = Object.assign(progressoPadrao(), d);
    if (!Number.isInteger(p.moedas) || p.moedas < 0) p.moedas = 0;
    if (!Number.isInteger(p.recorde) || p.recorde < 0) p.recorde = 0;
    const desb = Array.isArray(p.desbloqueados) ? p.desbloqueados.filter((i) => IDS_CARROS.has(i)) : [];
    p.desbloqueados = desb.length ? desb : [CARROS[0].id];
    if (!p.desbloqueados.includes(p.selecionado)) p.selecionado = p.desbloqueados[0];
    p.melhorias = validaMelhorias(p.melhorias);
    return p;
  }
  const carregaProgresso = () => { const d = lerJson(KEY_PROGRESSO); return d && typeof d === 'object' ? validaProgresso(d) : progressoPadrao(); };
  const salvaProgresso = (p) => gravarJson(KEY_PROGRESSO, p);
  const pontuacao = (dist, ult, bonus = 0) => trunc(dist / 10) + 50 * ult + trunc(bonus);
  const moedasGanhas = (dist) => Math.floor(dist / 100);

  const melhoriasDoCarro = (p, c) => p.melhorias[c.id] || {};
  const nivelAttr = (p, c, a) => Math.min(NIVEL_MAXIMO, c.atributos[a] + (melhoriasDoCarro(p, c)[a] || 0));
  const multiplicador = (n) => 1 + (n - NIVEL_REFERENCIA) * GANHO_POR_NIVEL;
  const multiplicadores = (p, c) => Object.fromEntries(ATRIBUTOS.map((a) => [a, multiplicador(nivelAttr(p, c, a))]));
  const podeMelhorar = (p, c, a) => (melhoriasDoCarro(p, c)[a] || 0) < MELHORIAS_LIMITE && nivelAttr(p, c, a) < NIVEL_MAXIMO;
  const custoMelhoria = (p, c, a) => trunc((CUSTO_BASE_MELHORIA + c.preco * FATOR_PRECO_CARRO) * ((melhoriasDoCarro(p, c)[a] || 0) + 1));
  function compraMelhoria(p, c, a) {
    if (!p.desbloqueados.includes(c.id)) return 'bloqueado';
    if (!podeMelhorar(p, c, a)) return 'maximo';
    const custo = custoMelhoria(p, c, a);
    if (p.moedas < custo) return 'sem_moedas';
    p.moedas -= custo;
    const m = (p.melhorias[c.id] = p.melhorias[c.id] || {});
    m[a] = (m[a] || 0) + 1;
    salvaProgresso(p);
    return 'ok';
  }

  const PADRAO_CONFIG = { volume: 70 };
  function carregaConfig() {
    const d = lerJson(KEY_CONFIG);
    const c = Object.assign({}, PADRAO_CONFIG, d && typeof d === 'object' ? d : {});
    if (!Number.isInteger(c.volume)) c.volume = PADRAO_CONFIG.volume;
    c.volume = clamp(c.volume, 0, 100);
    return c;
  }
  const salvaConfig = (c) => gravarJson(KEY_CONFIG, c);

  // ------------------------------------------------------------------ carro.py
  const VEL_MAX = 8000, VEL_MAX_NITRO = 11000, ACELERACAO = 3000, ACELERACAO_NITRO = 6000, DESACELERACAO_POS_NITRO = 3000;
  const LIMITE_PISTA = 1.0, LIMITE_X = 2.0, DURACAO_DANO = 0.4, LARGURA_IMAGEM = LARGURA_REFERENCIA_CARRO, ALTURA_MAX_IMAGEM = 150;
  const NITRO_MAX = 100, CONSUMO_NITRO = 35, GANHO_NITRO_DRIFT = 18, VEL_MIN_DRIFT = 0.45, PERDA_VELOCIDADE_DRIFT = 0.25;
  const PONTOS_DRIFT_POR_SEGUNDO = 40, INCLINACAO_MAX = 6, INCLINACAO_DRIFT = 12;
  const PERDA_VELOCIDADE_BATIDA = 0.7, PERDA_VELOCIDADE_BLINDADO = 0.15, MULTIPLICADOR_CARNAVAL = 2;
  const NEUTROS = { velocidade: 1, aceleracao: 1, nitro: 1, resistencia: 1 };

  class Carro {
    constructor(comprimento, atributos, larguraSprite) {
      atributos = atributos || NEUTROS;
      this.meiaLargura = meiaLarguraPara(larguraSprite || LARGURA_REFERENCIA_CARRO);
      this.velMax = VEL_MAX * atributos.velocidade; this.velMaxNitro = VEL_MAX_NITRO * atributos.velocidade;
      this.aceleracao = ACELERACAO * atributos.aceleracao; this.aceleracaoNitro = ACELERACAO_NITRO * atributos.aceleracao;
      this.eficienciaNitro = atributos.nitro; this.resistencia = atributos.resistencia;
      this.comprimento = comprimento;
      this.pos = 0; this.vel = 0; this.x = 0; this.vida = 100; this.danoTimer = 0; this.distancia = 0;
      this.ultrapassagens = 0; this.bonus = 0; this.nitro = 0; this.nitroAtivo = false; this.drift = false;
      this.pontosDrift = 0; this.inclinacao = 0; this.blindado = false; this.carnaval = 0;
    }
    get fracao() { return Math.min(this.vel / this.velMax, 1); }
    get multiplicador() { return this.carnaval > 0 ? MULTIPLICADOR_CARNAVAL : 1; }
    ganhaNitro(q) { this.nitro = Math.min(NITRO_MAX, this.nitro + q * this.eficienciaNitro); }
    enche() { this.nitro = NITRO_MAX; }
    cura(q) { this.vida = Math.min(100, this.vida + q); }
    sofreDano(dano, perda = PERDA_VELOCIDADE_BATIDA) {
      if (this.blindado) { this.blindado = false; this.vel *= 1 - PERDA_VELOCIDADE_BLINDADO; return true; }
      this.vida = Math.max(0, this.vida - Math.round(dano / this.resistencia));
      this.vel *= 1 - perda; this.danoTimer = DURACAO_DANO;
      return false;
    }
    atualiza(dt, t, curva) {
      const acelerando = t.up, freando = t.down;
      const direcao = (t.right ? 1 : 0) - (t.left ? 1 : 0);
      this.nitroAtivo = !!(t.nitro && this.nitro > 0);
      if (this.nitroAtivo) {
        this.vel = Math.min(this.velMaxNitro, this.vel + this.aceleracaoNitro * dt);
        this.nitro = Math.max(0, this.nitro - CONSUMO_NITRO / this.eficienciaNitro * dt);
      } else if (this.vel > this.velMax) {
        this.vel = Math.max(this.velMax, this.vel - DESACELERACAO_POS_NITRO * dt);
      } else if (acelerando) {
        this.vel = Math.min(this.velMax, this.vel + this.aceleracao * dt);
      } else {
        this.vel -= 1000 * dt;
      }
      if (freando) this.vel -= 5000 * dt;
      this.vel = Math.max(this.vel, 0);

      const fracao = this.fracao;
      this.drift = !!(t.drift && direcao && fracao >= VEL_MIN_DRIFT);
      const forca = this.drift ? 3 : 2;
      this.x += direcao * forca * fracao * dt;
      this.x -= curva * fracao * fracao * 0.5 * dt * (this.drift ? 0.5 : 1);
      const mult = this.multiplicador;
      if (this.drift) {
        this.vel *= 1 - PERDA_VELOCIDADE_DRIFT * dt;
        this.ganhaNitro(GANHO_NITRO_DRIFT * dt);
        const pontos = PONTOS_DRIFT_POR_SEGUNDO * dt * mult;
        this.bonus += pontos; this.pontosDrift += pontos;
      }
      if (this.carnaval > 0) {
        this.bonus += this.vel * dt / 10 * (mult - 1);
        this.carnaval = Math.max(0, this.carnaval - dt);
      }
      if (Math.abs(this.x) > LIMITE_PISTA) this.vel *= 1 - 1.5 * dt;
      this.x = Math.max(-LIMITE_X, Math.min(LIMITE_X, this.x));
      const alvo = direcao * (this.drift ? INCLINACAO_DRIFT : INCLINACAO_MAX) * fracao;
      this.inclinacao += (alvo - this.inclinacao) * Math.min(1, 8 * dt);
      this.distancia += this.vel * dt;
      this.pos = mod(this.pos + this.vel * dt, this.comprimento);
      this.danoTimer = Math.max(0, this.danoTimer - dt);
    }
  }

  // ------------------------------------------------------------------ trafego.py
  const VEL_NPC = 4000, FOLGA_LATERAL = 0.85, COMPRIMENTO_CARRO = PROFUNDIDADE_FRENTE_JOGADOR - PROFUNDIDADE_JOGADOR;
  const MEIA_LARGURA_NPC = NPC_LARGURA_MUNDO / 2 / LARGURA_PISTA, FOLGA_RASPANDO = 0.2;
  const larguraColisao = (meia) => FOLGA_LATERAL * (meia + MEIA_LARGURA_NPC);
  const DANO = 20, COOLDOWN = 1.0, LIMITE_FAIXA = 0.8, VEL_TROCA_FAIXA = 0.35, CHANCE_TROCA_FAIXA = 0.3;
  const ESPACO_SEGURO = 900, SEPARACAO_LATERAL = 0.35, DISTANCIA_NIVEL = 60000, NIVEL_MAX = 10, NIVEL_TROCA_FAIXA = 3;
  const SURG_NPC_MIN = 40000, SURG_NPC_MAX = 48000, TENTATIVAS_SURGIMENTO = 12;

  class Npc {
    constructor(pos, x, imagem, trocaFaixa = false) {
      this.pos = pos; this.x = x; this.alvoX = x; this.imagem = imagem; this.trocaFaixa = trocaFaixa;
      this.cooldown = 0; this.dzAnterior = null; this.bateuRecente = false;
    }
    atualiza(dt, comprimento) {
      this.pos = mod(this.pos + VEL_NPC * dt, comprimento);
      this.cooldown = Math.max(0, this.cooldown - dt);
      const passo = VEL_TROCA_FAIXA * dt;
      this.x += Math.max(-passo, Math.min(passo, this.alvoX - this.x));
    }
  }
  const dzRel = (a, b, c) => mod(b - a + c / 2, c) - c / 2;
  function caminhoLivre(npc, alvo, trafego, comprimento) {
    const menor = Math.min(npc.x, alvo), maior = Math.max(npc.x, alvo);
    for (const o of trafego) {
      if (o === npc || Math.abs(dzRel(npc.pos, o.pos, comprimento)) > ESPACO_SEGURO) continue;
      for (const xo of [o.x, o.alvoX]) if (menor - SEPARACAO_LATERAL < xo && xo < maior + SEPARACAO_LATERAL) return false;
    }
    return true;
  }
  function atualizaTrafego(trafego, dt, comprimento) {
    for (const npc of trafego) {
      if (npc.trocaFaixa && Math.abs(npc.alvoX - npc.x) < 0.01 && rngGlobal.random() < CHANCE_TROCA_FAIXA * dt) {
        const alvo = rngGlobal.uniform(-LIMITE_FAIXA, LIMITE_FAIXA);
        if (caminhoLivre(npc, alvo, trafego, comprimento)) npc.alvoX = alvo;
      }
      npc.atualiza(dt, comprimento);
    }
  }
  const nivelPara = (d) => Math.min(NIVEL_MAX, 1 + Math.floor(d / DISTANCIA_NIVEL));
  const quantidadePara = (n) => 10 + 2 * n;
  function montaTrafego(comprimento, totalImagens, semente = 3) {
    const rng = new Rng(semente), q = quantidadePara(1), espaco = comprimento / (q + 1), out = [];
    for (let k = 0; k < q; k++) out.push(new Npc((k + 1) * espaco, rng.uniform(-LIMITE_FAIXA, LIMITE_FAIXA), rng.randrange(totalImagens)));
    return out;
  }
  function criaNpcLivre(trafego, carro, comprimento, totalImagens, rng, trocaFaixa) {
    for (let i = 0; i < TENTATIVAS_SURGIMENTO; i++) {
      const novo = new Npc(mod(carro.pos + rng.uniform(SURG_NPC_MIN, SURG_NPC_MAX), comprimento),
        rng.uniform(-LIMITE_FAIXA, LIMITE_FAIXA), rng.randrange(totalImagens), trocaFaixa);
      if (caminhoLivre(novo, novo.x, trafego, comprimento)) return novo;
    }
    return null;
  }
  function ajustaDificuldade(trafego, carro, comprimento, totalImagens, rng) {
    const nivel = nivelPara(carro.distancia), troca = nivel >= NIVEL_TROCA_FAIXA;
    if (trafego.length < quantidadePara(nivel)) {
      const novo = criaNpcLivre(trafego, carro, comprimento, totalImagens, rng, troca);
      if (novo) trafego.push(novo);
    }
    if (troca) for (const n of trafego) n.trocaFaixa = true;
    return nivel;
  }
  const distanciaRelativa = (carro, npc, c) => dzRel(carro.pos, npc.pos, c);
  const naZonaDoJogador = (dz) => PROFUNDIDADE_JOGADOR - COMPRIMENTO_CARRO <= dz && dz <= PROFUNDIDADE_FRENTE_JOGADOR;
  const colidiu = (carro, npc, c) => naZonaDoJogador(distanciaRelativa(carro, npc, c)) && Math.abs(npc.x - carro.x) < larguraColisao(carro.meiaLargura);
  function contaUltrapassagem(carro, npc, c) {
    const dz = distanciaRelativa(carro, npc, c) - PROFUNDIDADE_JOGADOR;
    const anterior = npc.dzAnterior; npc.dzAnterior = dz;
    if (anterior === null || !(anterior > 0 && 0 >= dz) || Math.abs(anterior - dz) > c / 4) return 0;
    const bateu = npc.bateuRecente; npc.bateuRecente = false;
    return bateu ? 0 : 1;
  }
  const raspou = (carro, npc) => Math.abs(npc.x - carro.x) < larguraColisao(carro.meiaLargura) + FOLGA_RASPANDO;

  // ------------------------------------------------------------------ itens.py
  const VIDA_KIT = 25, DANO_BURACO = 10, PERDA_VELOCIDADE_BURACO = 0.35, DURACAO_CARNAVAL = 10.0, INTERVALO_ITEM = 25000;
  const SURG_ITEM_MIN = 30000, SURG_ITEM_MAX = 38000, LIMITE_FAIXA_ITEM = 0.8, DISTANCIA_PERDIDO = 300;
  const PESOS_ITEM = { kit: 25, nitro: 30, blindagem: 15, carnaval: 15, buraco: 25 };
  const larguraColeta = (tipo, carro) => carro.meiaLargura + (tipo === 'buraco' ? LARGURA_BURACO : LARGURA_ITEM) / 2 / LARGURA_PISTA;
  function tiposDisponiveis(carro) {
    const t = ['buraco'];
    if (carro.vida < 100) t.push('kit');
    if (carro.nitro < NITRO_MAX) t.push('nitro');
    if (!carro.blindado) t.push('blindagem');
    if (carro.carnaval <= 0) t.push('carnaval');
    return t;
  }
  function aplica(carro, tipo) {
    if (tipo === 'kit') carro.cura(VIDA_KIT);
    else if (tipo === 'nitro') carro.enche();
    else if (tipo === 'blindagem') carro.blindado = true;
    else if (tipo === 'carnaval') carro.carnaval = DURACAO_CARNAVAL;
    else if (carro.sofreDano(DANO_BURACO, PERDA_VELOCIDADE_BURACO)) return 'buraco_blindado';
    return tipo;
  }
  class GerenciadorItens {
    constructor() { this.itens = []; this.proximo = INTERVALO_ITEM; }
    sorteia(carro, comprimento, rng) {
      const tipos = tiposDisponiveis(carro);
      const tipo = rng.choices(tipos, tipos.map((t) => PESOS_ITEM[t]));
      const pos = mod(carro.pos + rng.uniform(SURG_ITEM_MIN, SURG_ITEM_MAX), comprimento);
      this.itens.push({ pos, x: rng.uniform(-LIMITE_FAIXA_ITEM, LIMITE_FAIXA_ITEM), tipo });
      this.proximo = carro.distancia + INTERVALO_ITEM;
    }
    atualiza(carro, comprimento, rng) {
      if (!this.itens.length && carro.distancia >= this.proximo) this.sorteia(carro, comprimento, rng);
      const eventos = [], restantes = [];
      for (const item of this.itens) {
        const dz = mod(item.pos - carro.pos + comprimento / 2, comprimento) - comprimento / 2;
        if (naZonaDoJogador(dz) && Math.abs(item.x - carro.x) < larguraColeta(item.tipo, carro)) eventos.push(aplica(carro, item.tipo));
        else if (dz > PROFUNDIDADE_JOGADOR - DISTANCIA_PERDIDO) restantes.push(item);
      }
      this.itens = restantes;
      return eventos;
    }
  }

  // ------------------------------------------------------------------ audio.py (síntese WebAudio)
  const TAXA = 22050;
  const Audio_ = (() => {
    let ac = null, master = null, sons = null, ativo = true, volume = 0.7;
    function tom(freqs, dur, vol = 0.5, onda = 'quadrada', ruido = 0, dec = 4) {
      const rng = new Rng(1), total = Math.floor(TAXA * dur), d = new Float32Array(total);
      let fase = 0;
      for (let i = 0; i < total; i++) {
        const t = i / total, freq = freqs[0] + (freqs[freqs.length - 1] - freqs[0]) * t;
        fase += freq / TAXA;
        const f = fase - Math.floor(fase);
        let v = onda === 'quadrada' ? (f < 0.5 ? 1 : -1) : 2 * Math.abs(2 * f - 1) - 1;
        v = v * (1 - ruido) + rng.uniform(-1, 1) * ruido;
        d[i] = v * Math.exp(-dec * t) * Math.min(1, i / 200) * vol;
      }
      return d;
    }
    function batucada() {
      const rng = new Rng(2), total = Math.floor(TAXA * 1.3), buf = new Float32Array(total);
      const batidas = [[0, 's'], [0.15, 't'], [0.3, 't'], [0.45, 's'], [0.6, 't'], [0.675, 't'], [0.75, 't'], [0.9, 's']];
      for (const [ini, ins] of batidas) {
        const c = Math.floor(ini * TAXA);
        const dur = ins === 's' ? Math.floor(TAXA * 0.35) : Math.floor(TAXA * 0.06), dec = ins === 's' ? 9 : 45;
        for (let n = 0; n < Math.min(dur, total - c); n++) {
          const t = n / TAXA;
          const s = ins === 's' ? Math.sin(2 * Math.PI * (75 - 25 * t) * t) : 0.5 * Math.sin(2 * Math.PI * 1100 * t) + 0.5 * rng.uniform(-1, 1);
          buf[c + n] += s * Math.exp(-dec * t);
        }
      }
      let pico = 0; for (const v of buf) pico = Math.max(pico, Math.abs(v)); pico = pico || 1;
      for (let i = 0; i < total; i++) buf[i] = buf[i] / pico * 0.5;
      return buf;
    }
    function cria() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { ativo = false; return; }
      try { ac = new AC(); } catch (e) { ativo = false; return; }
      master = ac.createGain(); master.gain.value = volume; master.connect(ac.destination);
      const defs = {
        batida: tom([180, 40], 0.35, 0.6, 'quadrada', 0.7, 6), ultrapassagem: tom([880, 1320], 0.15, 0.3, 'tri', 0, 3),
        menu: tom([660, 660], 0.06, 0.25, 'quadrada', 0, 5), confirmar: tom([520, 1040], 0.18, 0.3, 'tri', 0, 3),
        erro: tom([220, 160], 0.2, 0.3, 'quadrada', 0, 4), fim: tom([440, 110], 0.9, 0.4, 'quadrada', 0, 2),
        nitro: tom([200, 700], 0.5, 0.35, 'quadrada', 0.85, 2.5), raspou: tom([700, 1400], 0.12, 0.3, 'tri', 0, 3),
        cura: tom([520, 1040], 0.35, 0.3, 'tri', 0, 2.5), galao: tom([400, 1200], 0.25, 0.3, 'tri', 0, 2.5),
        blindagem: tom([300, 900], 0.3, 0.3, 'tri', 0, 2), blindagem_quebra: tom([1500, 400], 0.3, 0.35, 'quadrada', 0.6, 4),
        buraco: tom([120, 50], 0.25, 0.6, 'quadrada', 0.6, 5), carnaval: batucada(),
      };
      sons = {};
      for (const [k, d] of Object.entries(defs)) { const b = ac.createBuffer(1, d.length, TAXA); b.copyToChannel(d, 0); sons[k] = b; }
    }
    return {
      desbloqueia() { if (!ac && ativo) cria(); if (ac && ac.state === 'suspended') ac.resume().catch(() => {}); },
      volume(v) { volume = v / 100; if (master) master.gain.value = volume; },
      toca(nome) {
        if (!ac || !sons || !sons[nome] || ac.state !== 'running') return;
        const s = ac.createBufferSource(); s.buffer = sons[nome]; s.connect(master); s.start();
      },
      get pronto() { return !!ac && ac.state === 'running'; },
    };
  })();

  // ------------------------------------------------------------------ desenho: utilitários
  const cv = document.getElementById('canvas');
  const tela = cv.getContext('2d');
  const mundoCv = document.createElement('canvas'); mundoCv.width = W; mundoCv.height = H;
  const mundo = mundoCv.getContext('2d');

  const COR_DESTAQUE = [255, 200, 0], COR_NEON = [0, 255, 255], COR_ESCURA = [6, 2, 16], COR_TEXTO = [230, 230, 240], COR_DICA = [180, 180, 200];
  const FT = (s) => ({ t: 1, s }), FX = (s) => ({ t: 0, s });
  const SEM_ACENTO = { 'Í': 'I', 'Ó': 'O', 'Ô': 'O', 'Õ': 'O' };

  function escreve(c, f, texto, cor, x, y, anc = 'topleft', sombra = null, alfa = null) {
    if (f.t) texto = texto.replace(/[ÍÓÔÕ]/g, (m) => SEM_ACENTO[m]);
    c.font = f.t ? `${f.s}px "Press Start 2P"` : `${f.s}px VT323`;
    const horiz = anc.endsWith('right') ? 'right' : anc === 'center' ? 'center' : 'left';
    c.textAlign = horiz;
    c.textBaseline = (anc === 'center' || anc === 'midleft' || anc === 'midright') ? 'middle' : 'top';
    const prev = c.globalAlpha;
    if (alfa !== null) c.globalAlpha = alfa / 255;
    if (sombra) { const d = Math.max(2, Math.floor(f.s / 10)); c.fillStyle = rgb(sombra); c.fillText(texto, x + d, y + d); }
    c.fillStyle = rgb(cor); c.fillText(texto, x, y);
    c.globalAlpha = prev;
  }
  function pathRound(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function caixa(c, x, y, w, h, cor, raio = 0) { c.fillStyle = typeof cor === 'string' ? cor : rgb(cor); if (raio) { pathRound(c, x, y, w, h, raio); c.fill(); } else c.fillRect(x, y, w, h); }
  function borda(c, x, y, w, h, lw, cor, raio = 0) {
    c.lineWidth = lw; c.strokeStyle = typeof cor === 'string' ? cor : rgb(cor);
    const i = lw / 2;
    if (raio) { pathRound(c, x + i, y + i, w - lw, h - lw, Math.max(0, raio - i)); c.stroke(); } else c.strokeRect(x + i, y + i, w - lw, h - lw);
  }
  function elipse(c, cx, cy, w, h, fill, bordaLw = 0, bordaCor = null) {
    c.beginPath(); c.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
    if (bordaLw) { c.beginPath(); c.ellipse(cx, cy, w / 2 - bordaLw / 2, h / 2 - bordaLw / 2, 0, 0, Math.PI * 2); c.lineWidth = bordaLw; c.strokeStyle = bordaCor; c.stroke(); }
  }
  function linha(c, x1, y1, x2, y2, lw, cor) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineWidth = lw; c.lineCap = 'butt'; c.strokeStyle = typeof cor === 'string' ? cor : rgb(cor); c.stroke(); }
  function poligono(c, pts, cor) { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fillStyle = typeof cor === 'string' ? cor : rgb(cor); c.fill(); }
  const escurece = (c, alfa = 170) => { c.fillStyle = rgb(COR_ESCURA, alfa / 255); c.fillRect(0, 0, W, H); };

  // ------------------------------------------------------------------ imagens
  const IMG = {}; // nome -> HTMLImageElement
  function carregaImagens() {
    const nomes = [...CARROS.map((c) => c.arquivo), ...ARQUIVOS_NPC, 'rio_fundo'];
    return Promise.all(nomes.map((n) => new Promise((ok, erro) => {
      const im = new Image(); im.onload = () => { IMG[n] = im; ok(); }; im.onerror = () => erro(new Error('imagem ausente: ' + n)); im.src = A(n);
    })));
  }
  function escala(im, largura, alturaMax) {
    let w = largura, h = Math.round(im.height * largura / im.width);
    if (alturaMax && h > alturaMax) { w = Math.round(w * alturaMax / h); h = alturaMax; }
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, w, h);
    return c;
  }
  function silhueta(img) {
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'multiply'; x.fillStyle = 'rgb(55,50,75)'; x.fillRect(0, 0, c.width, c.height);
    x.globalCompositeOperation = 'destination-in'; x.drawImage(img, 0, 0);
    return c;
  }
  const LARGURA_MINIATURA = 80, LARGURA_MENU = 300;
  const ALTURA_MAX_MENU = Math.round(ALTURA_MAX_IMAGEM * LARGURA_MENU / LARGURA_IMAGEM);
  const ALTURA_MAX_MINIATURA = Math.round(ALTURA_MAX_IMAGEM * LARGURA_MINIATURA / LARGURA_IMAGEM);
  let imagens, miniaturas, imagensMenu, imagensNpc, silhuetas = {}, fundo;

  function preparaImagens() {
    imagens = {}; miniaturas = {}; imagensMenu = {};
    for (const c of CARROS) {
      const im = IMG[c.arquivo];
      imagens[c.id] = escala(im, LARGURA_IMAGEM, ALTURA_MAX_IMAGEM);
      miniaturas[c.id] = escala(im, LARGURA_MINIATURA, ALTURA_MAX_MINIATURA);
      imagensMenu[c.id] = escala(im, LARGURA_MENU, ALTURA_MAX_MENU);
    }
    imagensNpc = ARQUIVOS_NPC.map((n) => IMG[n]);
    // ambiente.py: cria_fundo
    const orig = IMG.rio_fundo, larg = W * 2, esc = larg / orig.width;
    const hImg = Math.round(orig.height * esc), desloc = H / 2 - Math.round(243 * esc);
    const px = document.createElement('canvas'); px.width = orig.width; px.height = orig.height;
    const pxc = px.getContext('2d'); pxc.drawImage(orig, 0, 0);
    const base = pxc.getImageData(0, orig.height - 1, 1, 1).data, topo = pxc.getImageData(0, 0, 1, 1).data;
    fundo = document.createElement('canvas'); fundo.width = larg; fundo.height = H;
    const fx = fundo.getContext('2d');
    fx.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`; fx.fillRect(0, 0, larg, H);
    if (desloc > 0) { fx.fillStyle = `rgb(${topo[0]},${topo[1]},${topo[2]})`; fx.fillRect(0, 0, larg, desloc); }
    fx.imageSmoothingQuality = 'high'; fx.drawImage(orig, 0, desloc, larg, hImg);
  }
  function desenhaFundo(c, xJogador) {
    const d = clamp(W / 2 + xJogador * 200, 0, fundo.width - W);
    c.drawImage(fundo, -trunc(d), 0);
  }

  // ------------------------------------------------------------------ pista.py (desenho)
  const R = Math.round;
  function desenhaPalmeira(c, sx, sy, esc, alt) {
    const altura = esc * alt * ESCALA_Y, topo = [sx, sy - altura];
    linha(c, sx, sy, topo[0], topo[1], Math.max(1, trunc(esc * 90 * ESCALA_X)), [96, 60, 36]);
    const raio = Math.max(3, esc * 600 * ESCALA_X);
    for (const ang of [160, 200, 250, 290, 340]) {
      const rad = ang * Math.PI / 180;
      linha(c, topo[0], topo[1], topo[0] + Math.cos(rad) * raio, topo[1] + Math.sin(rad) * raio * 0.5 + raio * 0.35, Math.max(2, trunc(raio / 4)), [30, 130, 70]);
    }
  }
  function desenhaPoste(c, sx, sy, esc, alt) {
    const altura = esc * alt * ESCALA_Y;
    linha(c, sx, sy, sx, sy - altura, Math.max(1, trunc(esc * 50 * ESCALA_X)), [60, 60, 70]);
    c.beginPath(); c.arc(trunc(sx), trunc(sy - altura), Math.max(1, trunc(esc * 110 * ESCALA_X)), 0, Math.PI * 2); c.fillStyle = rgb([255, 220, 150]); c.fill();
  }
  function desenhaPlaca(c, sx, sy, esc, alt) {
    const altura = esc * alt * ESCALA_Y, esp = Math.max(1, trunc(esc * 40 * ESCALA_X));
    linha(c, sx, sy, sx, sy - altura, esp, [60, 60, 70]);
    const lp = esc * 420 * ESCALA_X, ap = esc * 260 * ESCALA_Y;
    caixa(c, trunc(sx - lp / 2), trunc(sy - altura), Math.max(1, trunc(lp)), Math.max(1, trunc(ap)), [20, 70, 150]);
    borda(c, trunc(sx - lp / 2 + esp), trunc(sy - altura + esp), Math.max(1, trunc(lp - 2 * esp)), Math.max(1, trunc(ap - 2 * esp)), Math.max(1, trunc(esp / 2)), [235, 235, 240]);
  }
  function desenhaCasa(c, sx, sy, esc, lm, am, cor) {
    const l = esc * lm * ESCALA_X, a = esc * am * ESCALA_Y;
    caixa(c, trunc(sx - l / 2), trunc(sy - a), Math.max(1, trunc(l)), Math.max(1, trunc(a)), cor);
    caixa(c, trunc(sx - l / 2), trunc(sy - a), Math.max(1, trunc(l)), Math.max(1, trunc(esc * 60 * ESCALA_Y)), cor.map((v) => trunc(v * 0.7)));
  }
  function desenhaNpc(c, sx, sy, esc, im) {
    const l = Math.max(1, trunc(esc * NPC_LARGURA_MUNDO * ESCALA_X)), a = l * im.height / im.width;
    if (sy - a >= H || sx + l / 2 <= 0 || sx - l / 2 >= W || l > LARGURA_MAXIMA_SPRITE) return;
    c.drawImage(im, trunc(sx - l / 2), trunc(sy - a), l, Math.max(1, Math.round(a)));
  }
  const CORES_BRILHO_ITEM = { kit: [60, 255, 120], nitro: [255, 140, 0], blindagem: [0, 220, 255], carnaval: [255, 220, 0] };
  function desenhaKit(c, sx, sy, lado) {
    const w = trunc(lado), h = trunc(lado * 0.8), x = trunc(sx) - Math.floor(w / 2), y = trunc(sy) - h, r = Math.max(1, trunc(lado * 0.12));
    caixa(c, x, y, w, h, [245, 245, 245], r); borda(c, x, y, w, h, Math.max(1, trunc(lado * 0.06)), [40, 160, 70], r);
    const esp = Math.max(2, trunc(lado * 0.2)), comp = Math.max(esp, trunc(lado * 0.56)), cx = x + w / 2, cy = y + h / 2;
    for (const [bw, bh] of [[comp, esp], [esp, comp]]) caixa(c, trunc(cx - bw / 2), trunc(cy - bh / 2), bw, bh, [40, 190, 80]);
  }
  function desenhaGalao(c, sx, sy, lado) {
    const w = trunc(lado * 0.6), h = trunc(lado), x = trunc(sx) - Math.floor(w / 2), y = trunc(sy) - h;
    caixa(c, x, y, w, h, [30, 90, 220], Math.max(1, trunc(lado * 0.15)));
    caixa(c, x, trunc(y + h * 0.4), w, Math.max(2, trunc(h * 0.22)), [240, 240, 250]);
    const tw = Math.max(2, trunc(w * 0.45)), th = Math.max(2, trunc(lado * 0.18));
    caixa(c, trunc(x + w / 2 - tw / 2), y - th, tw, th, [230, 40, 40]);
  }
  function desenhaEscudo(c, sx, sy, lado) {
    const w = lado * 0.9, h = lado, topo = sy - h;
    const pts = [[sx - w / 2, topo], [sx + w / 2, topo], [sx + w / 2, topo + h * 0.45], [sx, sy], [sx - w / 2, topo + h * 0.45]];
    poligono(c, pts, [180, 200, 220]);
    c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.lineWidth = Math.max(1, trunc(lado * 0.1)); c.strokeStyle = rgb([0, 200, 255]); c.stroke();
    linha(c, sx, topo + h * 0.12, sx, sy - h * 0.12, Math.max(1, trunc(lado * 0.08)), [0, 200, 255]);
  }
  function desenhaTambor(c, sx, sy, lado) {
    const w = trunc(lado), h = trunc(lado * 0.7), x = trunc(sx) - Math.floor(w / 2), y = trunc(sy) - h;
    caixa(c, x, y, w, h, [0, 150, 70]);
    for (let k = 1; k < 4; k++) { const xx = x + w * k / 4; linha(c, xx, y, xx, y + h, Math.max(1, trunc(lado * 0.06)), [255, 220, 0]); }
    const th = Math.max(2, lado * 0.3), ty = y - lado * 0.15;
    elipse(c, x + w / 2, ty + th / 2, w, th, rgb([245, 240, 220]));
    const lw = Math.max(1, trunc(lado * 0.05));
    c.beginPath(); c.ellipse(x + w / 2, ty + th / 2, w / 2 - lw / 2, th / 2 - lw / 2, 0, 0, Math.PI * 2); c.lineWidth = lw; c.strokeStyle = rgb([255, 220, 0]); c.stroke();
  }
  function desenhaBuraco(c, sx, sy, esc) {
    const l = esc * LARGURA_BURACO * ESCALA_X, a = Math.max(2, l * 0.28);
    elipse(c, trunc(sx), sy - a / 2, trunc(l), trunc(a), rgb([35, 30, 38]));
    elipse(c, trunc(sx), sy - a / 2, Math.max(1, trunc(l) - l * 0.15), Math.max(1, trunc(a) - a * 0.3), rgb([12, 10, 14]));
  }
  const DESENHOS_ITEM = { kit: desenhaKit, nitro: desenhaGalao, blindagem: desenhaEscudo, carnaval: desenhaTambor };
  function desenhaItem(c, sx, sy, esc, tipo) {
    if (tipo === 'buraco') { desenhaBuraco(c, sx, sy, esc); return; }
    const lado = esc * LARGURA_ITEM * ESCALA_X;
    if (lado < 2) return;
    elipse(c, sx, sy, lado * 2, trunc(lado * 0.6) + 1, rgb(CORES_BRILHO_ITEM[tipo], 110 / 255));
    DESENHOS_ITEM[tipo](c, sx, sy, lado);
  }
  function projeta(z, mx, my, camX, camY, camZ) {
    const prof = z - camZ;
    if (prof <= PROFUNDIDADE_CAMERA) return null;
    const esc = PROFUNDIDADE_CAMERA / prof;
    return [W / 2 + esc * (mx - camX) * ESCALA_X, H / 2 - esc * (my - camY) * ESCALA_Y, esc];
  }
  function desenhaPista(c, pista, pos, xJogador, trafego, itens, desenhaJogador) {
    const n = pista.n, { ys, curvas, decor } = pista;
    const base = Math.floor(pos / TAM_SEGMENTO), fracao = (pos - base * TAM_SEGMENTO) / TAM_SEGMENTO;
    const camY = ys[base % n] + ALTURA_CAMERA;
    let x = 0, dx = -curvas[base % n] * fracao, maxy = H;
    const camXJ = xJogador * LARGURA_PISTA, meioX = W / 2, meioY = H / 2;
    const porSeg = new Map();
    for (const [tipo, lista] of [['npc', trafego], ['item', itens]]) for (const o of lista) {
      const k = Math.floor(o.pos / TAM_SEGMENTO) % n;
      if (!porSeg.has(k)) porSeg.set(k, []);
      porSeg.get(k).push([tipo, o]);
    }
    const sprites = [];
    for (let i = 0; i < DISTANCIA_DESENHO; i++) {
      const indice = (base + i) % n, z1 = (base + i) * TAM_SEGMENTO, camX = camXJ - x;
      x += dx; dx += curvas[indice];
      const prof1 = z1 - pos;
      if (prof1 <= PROFUNDIDADE_CAMERA) continue;
      const ySeg = ys[indice];
      for (const d of decor[indice]) { const s = projeta(z1, d.x, ySeg, camX, camY, pos); if (s) sprites.push([z1, d.tipo, d, s]); }
      const lista = porSeg.get(indice);
      if (lista) for (const [tipo, o] of lista) {
        const zo = z1 + mod(o.pos, TAM_SEGMENTO), s = projeta(zo, o.x * LARGURA_PISTA, ySeg, camX, camY, pos);
        if (s) sprites.push([zo, tipo, o, s]);
      }
      const esc2 = PROFUNDIDADE_CAMERA / (z1 + TAM_SEGMENTO - pos);
      const y2 = meioY - esc2 * (ys[(indice + 1) % n] - camY) * ESCALA_Y;
      if (y2 >= maxy) continue;
      const esc1 = PROFUNDIDADE_CAMERA / prof1;
      const x1 = meioX + esc1 * (0 - camX) * ESCALA_X, y1 = meioY - esc1 * (ySeg - camY) * ESCALA_Y, x2 = meioX + esc2 * (0 - camX) * ESCALA_X;
      const w1 = esc1 * LARGURA_PISTA * ESCALA_X, w2 = esc2 * LARGURA_PISTA * ESCALA_X, r1 = 1.1 * w1, r2 = 1.1 * w2;
      const cores = CORES[Math.floor(indice / 3) % 2];
      const iy1 = R(y1), iy2 = R(y2);
      c.fillStyle = rgb(cores.grama); c.fillRect(0, iy2, W, Math.max(1, iy1 - iy2));
      poligono(c, [[R(x1 - r1), iy1], [R(x2 - r2), iy2], [R(x2 + r2), iy2], [R(x1 + r1), iy1]], cores.rumble);
      poligono(c, [[R(x1 - w1), iy1], [R(x2 - w2), iy2], [R(x2 + w2), iy2], [R(x1 + w1), iy1]], cores.asfalto);
      maxy = y2;
    }
    sprites.sort((a, b) => b[0] - a[0]);
    for (const [z, tipo, o, [sx, sy, esc]] of sprites) {
      if (desenhaJogador && z - pos < PROFUNDIDADE_JOGADOR) { desenhaJogador(); desenhaJogador = null; }
      if (tipo === 'npc') desenhaNpc(c, sx, sy, esc, imagensNpc[o.imagem]);
      else if (tipo === 'item') desenhaItem(c, sx, sy, esc, o.tipo);
      else if (tipo === 'palmeira') desenhaPalmeira(c, sx, sy, esc, o.altura);
      else if (tipo === 'poste') desenhaPoste(c, sx, sy, esc, o.altura);
      else if (tipo === 'placa') desenhaPlaca(c, sx, sy, esc, o.altura);
      else desenhaCasa(c, sx, sy, esc, o.largura, o.altura, o.cor);
    }
    if (desenhaJogador) desenhaJogador();
  }

  // ------------------------------------------------------------------ carro.py (desenho do jogador)
  function desenhaChama(c, x, y) {
    const tam = rngGlobal.uniform(0.8, 1.2);
    for (const [raio, cor] of [[16, [255, 120, 0]], [11, [255, 220, 60]], [6, [120, 200, 255]]]) {
      const r = Math.max(2, trunc(raio * tam));
      elipse(c, x, y - r * 0.7 + r * 0.7, 2 * r, trunc(2 * r * 1.4), rgb(cor));
    }
  }
  function desenhaCarro(c, img, carro, tempo) {
    const cx = W / 2, vib = Math.sin(tempo * 45) * 1.5 * carro.fracao;
    const ang = Math.round(carro.inclinacao), rad = ang * Math.PI / 180;
    const rw = img.width * Math.abs(Math.cos(rad)) + img.height * Math.abs(Math.sin(rad));
    const rh = img.width * Math.abs(Math.sin(rad)) + img.height * Math.abs(Math.cos(rad));
    const mx = cx + carro.inclinacao * 2, bottom = BASE_JOGADOR_Y + vib, cy = bottom - rh / 2;
    elipse(c, mx, BASE_JOGADOR_Y - 4, img.width, 26, carro.nitroAtivo ? 'rgba(255,140,0,0.47)' : 'rgba(0,255,255,0.43)');
    c.save(); c.translate(mx, cy); c.rotate(rad); c.drawImage(img, -img.width / 2, -img.height / 2); c.restore();
    if (carro.nitroAtivo) for (const lado of [-1, 1]) desenhaChama(c, mx + lado * img.width * 0.24, bottom - img.height * 0.18);
    if (carro.blindado) {
      const lw = rw + 30, lh = rh + 24, pulso = 0.5 + 0.5 * Math.sin(tempo * 6);
      elipse(c, mx, cy, lw, lh, `rgba(0,220,255,${(10 + 12 * pulso) / 255})`, 3, `rgba(120,240,255,${(140 + 80 * pulso) / 255})`);
    }
  }

  // ------------------------------------------------------------------ efeitos.py
  const DURACAO_TREMOR = 0.35, FORCA_TREMOR = 14, DURACAO_TEXTO = 1.2;
  const CORES_CONFETE = [[0, 170, 80], [255, 220, 0], [30, 90, 220], [255, 60, 160], [255, 255, 255]];
  class Efeitos {
    constructor() { this.rng = new Rng(12345); this.particulas = []; this.textos = []; this.tremor = 0; }
    batida(x, y) {
      this.tremor = DURACAO_TREMOR;
      for (let i = 0; i < 28; i++) {
        const ang = this.rng.uniform(Math.PI * 1.05, Math.PI * 1.95), v = this.rng.uniform(150, 420);
        this.particulas.push({ tipo: 'faisca', x: x + this.rng.uniform(-40, 40), y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v,
          vida: this.rng.uniform(0.3, 0.6), cor: this.rng.choice([[255, 230, 120], [255, 160, 40], [255, 255, 255]]) });
      }
    }
    fumaca(x, y) {
      for (let i = 0; i < 2; i++) this.particulas.push({ tipo: 'fumaca', x: x + this.rng.uniform(-10, 10), y, vx: this.rng.uniform(-40, 40), vy: this.rng.uniform(-60, -20), vida: 0.6, cor: [200, 200, 210] });
    }
    confete() { this.particulas.push({ tipo: 'confete', x: this.rng.uniform(0, W), y: -10, vx: this.rng.uniform(-30, 30), vy: this.rng.uniform(120, 220), vida: 3, cor: this.rng.choice(CORES_CONFETE) }); }
    texto(mensagem, cor) { this.textos.push({ mensagem, cor, vida: DURACAO_TEXTO }); }
    limpa() { this.particulas.length = 0; this.textos.length = 0; this.tremor = 0; }
    atualiza(dt) {
      this.tremor = Math.max(0, this.tremor - dt);
      for (const p of this.particulas) { p.x += p.vx * dt; p.y += p.vy * dt; if (p.tipo === 'faisca') p.vy += 900 * dt; p.vida -= dt; }
      this.particulas = this.particulas.filter((p) => p.vida > 0);
      for (const t of this.textos) t.vida -= dt;
      this.textos = this.textos.filter((t) => t.vida > 0);
    }
    deslocamento() {
      if (this.tremor <= 0) return [0, 0];
      const f = FORCA_TREMOR * this.tremor / DURACAO_TREMOR;
      return [trunc(this.rng.uniform(-f, f)), trunc(this.rng.uniform(-f, f))];
    }
    desenhaParticulas(c) {
      for (const p of this.particulas) {
        if (p.tipo === 'faisca') linha(c, p.x, p.y, p.x - p.vx * 0.03, p.y - p.vy * 0.03, 2, p.cor);
        else if (p.tipo === 'confete') caixa(c, trunc(p.x), trunc(p.y), trunc(3 + 3 * Math.abs(Math.sin(p.vida * 8))), 6, p.cor);
        else {
          const raio = trunc(10 + (0.6 - p.vida) * 40), alfa = trunc(140 * p.vida / 0.6) / 255;
          c.beginPath(); c.arc(p.x, p.y, raio, 0, Math.PI * 2); c.fillStyle = rgb(p.cor, alfa); c.fill();
        }
      }
    }
    desenhaTextos(c) {
      this.textos.forEach((t, i) => {
        const prog = 1 - t.vida / DURACAO_TEXTO, alfa = trunc(255 * Math.min(1, t.vida / 0.4)), y = H * 0.42 - prog * 40 - i * 30;
        escreve(c, FT(20), t.mensagem, t.cor, W / 2, y, 'center', [10, 4, 20], alfa);
      });
    }
    desenhaLinhasVelocidade(c, intensidade) {
      if (intensidade <= 0) return;
      const diag = Math.hypot(W, H) / 2, cxf = W / 2, cyf = H * 0.5, n = trunc(18 * intensidade);
      for (let i = 0; i < n; i++) {
        const ang = this.rng.uniform(0, 2 * Math.PI), ini = this.rng.uniform(0.55, 0.85) * diag, fim = ini + this.rng.uniform(40, 140) * intensidade;
        const dx = Math.cos(ang), dy = Math.sin(ang);
        linha(c, cxf + dx * ini, cyf + dy * ini, cxf + dx * fim, cyf + dy * fim, 2, `rgba(255,255,255,${trunc(150 * intensidade) / 255})`);
      }
    }
  }

  // ------------------------------------------------------------------ hud.py / ui.py
  const BARRA_LARGURA = 240, BARRA_ALTURA = 16, DURACAO_DICA = 6.0;
  function barra(c, x, y, frac, cor, rotulo) {
    caixa(c, x - 2, y - 2, BARRA_LARGURA + 4, BARRA_ALTURA + 4, [30, 14, 40]);
    caixa(c, x, y, BARRA_LARGURA, BARRA_ALTURA, [60, 30, 60]);
    caixa(c, x, y, trunc(BARRA_LARGURA * Math.max(0, Math.min(1, frac))), BARRA_ALTURA, cor);
    escreve(c, FT(12), rotulo, [255, 255, 255], x, y + BARRA_ALTURA + 6, 'topleft', COR_ESCURA);
  }
  function desenhaHud(c, carro, pontos, nivel, avisoNivel, tempoCorrida, tempo) {
    escreve(c, FT(24), `${trunc(carro.vel / VEL_MAX * 300)} KM/H`, COR_NEON, 20, 18, 'topleft', COR_ESCURA);
    escreve(c, FT(12), `PONTOS ${pontos}`, [255, 255, 255], 20, 56, 'topleft', COR_ESCURA);
    escreve(c, FT(12), `NÍVEL ${nivel}`, COR_DESTAQUE, 20, 78, 'topleft', COR_ESCURA);
    const x = W - BARRA_LARGURA - 20;
    barra(c, x, 20, carro.vida / 100, carro.vida > 40 ? [60, 255, 120] : [255, 60, 60], 'VIDA');
    const cheio = carro.nitro >= NITRO_MAX, piscando = cheio && trunc(tempo * 6) % 2 === 0;
    const corNitro = piscando ? [255, 255, 255] : (carro.nitroAtivo ? [255, 140, 0] : [40, 160, 255]);
    barra(c, x, 64, carro.nitro / NITRO_MAX, corNitro, cheio ? 'NITRO - ESPAÇO' : 'NITRO');
    let y = 112;
    if (carro.carnaval > 0) {
      barra(c, x, y, carro.carnaval / DURACAO_CARNAVAL, trunc(tempo * 4) % 2 === 0 ? COR_DESTAQUE : [0, 200, 90], `CARNAVAL x2  ${carro.carnaval.toFixed(0)}s`);
      y += 44;
    }
    if (carro.blindado) {
      borda(c, x - 2, y - 2, BARRA_LARGURA + 4, 24, 2, [0, 200, 255], 6);
      escreve(c, FT(12), 'BLINDAGEM ATIVA', [0, 220, 255], x + BARRA_LARGURA / 2, y + 10, 'center', COR_ESCURA);
    }
    if (avisoNivel > 0) escreve(c, FT(36), `NÍVEL ${nivel}`, COR_DESTAQUE, W / 2, 150, 'center', COR_ESCURA, trunc(255 * Math.min(1, avisoNivel)));
    if (tempoCorrida < DURACAO_DICA) {
      escreve(c, FX(28), 'ESPAÇO: nitro    SHIFT + seta: drift    ESC: pausa', [255, 255, 255], W / 2, H - 190, 'center', COR_ESCURA, trunc(255 * Math.min(1, (DURACAO_DICA - tempoCorrida) / 1)));
    }
  }
  function desenhaFim(c, r) {
    escurece(c, 180);
    escreve(c, FT(32), 'CARRO DESTRUÍDO', [255, 60, 60], W / 2, 100, 'center', COR_ESCURA);
    const linhas = [[`Pontos: ${r.pontos}`, [255, 255, 255]], [`Distância: ${r.distancia} m`, [255, 255, 255]], [`Ultrapassagens: ${r.ultrapassagens}`, [255, 255, 255]],
      [`Nível alcançado: ${r.nivel}`, [255, 255, 255]], [`Moedas ganhas: ${r.moedas}`, COR_DESTAQUE]];
    linhas.forEach(([t, cor], i) => escreve(c, FX(36), t, cor, W / 2, 170 + i * 36, 'center'));
    if (r.novoRecorde) escreve(c, FT(20), 'NOVO RECORDE!', COR_NEON, W / 2, 370, 'center', COR_ESCURA);
    escreve(c, FX(30), 'R: jogar de novo    M: menu', COR_DICA, W / 2, H - 50, 'center');
  }
  const PAINEL_LARGURA = 600, LINHA_ALTURA = 48, LINHA_ESPACO = 12;
  function desenhaPainel(c, titulo, linhas, indice, dica) {
    escurece(c);
    const altura = 110 + linhas.length * (LINHA_ALTURA + LINHA_ESPACO) + 40;
    const px = W / 2 - PAINEL_LARGURA / 2, py = H / 2 - altura / 2;
    caixa(c, px, py, PAINEL_LARGURA, altura, [20, 10, 40], 14); borda(c, px, py, PAINEL_LARGURA, altura, 2, COR_NEON, 14);
    escreve(c, FT(28), titulo, COR_NEON, W / 2, py + 50, 'center', COR_ESCURA);
    linhas.forEach(([rotulo, valor], i) => {
      const rx = px + 30, ry = py + 100 + i * (LINHA_ALTURA + LINHA_ESPACO), rw = PAINEL_LARGURA - 60, sel = i === indice;
      caixa(c, rx, ry, rw, LINHA_ALTURA, sel ? COR_DESTAQUE : [32, 18, 60], 10);
      const cor = sel ? COR_ESCURA : COR_TEXTO;
      if (valor === null) escreve(c, FT(16), rotulo, cor, rx + rw / 2, ry + LINHA_ALTURA / 2, 'center');
      else { escreve(c, FT(16), rotulo, cor, rx + 18, ry + LINHA_ALTURA / 2, 'midleft'); escreve(c, FT(16), valor, cor, rx + rw - 18, ry + LINHA_ALTURA / 2, 'midright'); }
    });
    escreve(c, FX(24), dica, COR_DICA, W / 2, py + altura - 22, 'center');
  }
  const navega = (i, total, k) => (k === 'up' ? mod(i - 1, total) : k === 'down' ? mod(i + 1, total) : i);

  // ------------------------------------------------------------------ menu.py / pausa.py / opcoes.py / garagem.py
  const MENU_OPCOES = [['Jogar', 'corrida'], ['Garagem', 'garagem'], ['Opções', 'opcoes']];
  const BOTAO_X = 50, BOTAO_Y = 170, BOTAO_ESPACO = 58, BOTAO_LARGURA = 300, BOTAO_ALTURA = 46, CARRO_CENTRO_X = 710, CARRO_BASE_Y = 340;
  const menu = { indice: 0 };
  function desenhaMenu(c, progresso, agora) {
    desenhaFundo(c, 0);
    const g = c.createLinearGradient(0, 0, 580, 0); g.addColorStop(0, rgb(COR_ESCURA, 215 / 255)); g.addColorStop(1, rgb(COR_ESCURA, 0));
    c.fillStyle = g; c.fillRect(0, 0, 580, H);
    escreve(c, FT(40), 'RIO', COR_NEON, BOTAO_X, 46, 'topleft', COR_ESCURA);
    escreve(c, FT(40), 'REDLINE', COR_DESTAQUE, BOTAO_X + 160, 46, 'topleft', COR_ESCURA);
    escreve(c, FX(30), 'Rio de Janeiro, quando o sol se põe', COR_TEXTO, BOTAO_X + 2, 100);
    MENU_OPCOES.forEach(([nome], i) => {
      const y = BOTAO_Y + i * BOTAO_ESPACO, sel = i === menu.indice;
      caixa(c, BOTAO_X, y, BOTAO_LARGURA, BOTAO_ALTURA, sel ? COR_DESTAQUE : [24, 12, 46], 10);
      borda(c, BOTAO_X, y, BOTAO_LARGURA, BOTAO_ALTURA, 2, sel ? [255, 255, 255] : [110, 70, 150], 10);
      escreve(c, FT(16), sel ? `> ${nome} <` : nome, sel ? COR_ESCURA : COR_TEXTO, BOTAO_X + BOTAO_LARGURA / 2, y + BOTAO_ALTURA / 2, 'center');
    });
    const im = imagensMenu[progresso.selecionado], balanco = Math.sin(agora * 1000 / 350) * 6;
    elipse(c, CARRO_CENTRO_X, CARRO_BASE_Y + 6, im.width, 30, 'rgba(0,255,255,0.43)');
    c.drawImage(im, Math.round(CARRO_CENTRO_X - im.width / 2), Math.round(CARRO_BASE_Y + balanco - im.height));
    escreve(c, FT(16), carroPorId(progresso.selecionado).nome, [255, 255, 255], CARRO_CENTRO_X, CARRO_BASE_Y + 50, 'center', COR_ESCURA);
    caixa(c, BOTAO_X, H - 76, 420, 36, 'rgba(10,4,26,0.78)');
    escreve(c, FT(12), `MOEDAS ${progresso.moedas}   RECORDE ${progresso.recorde}`, [255, 255, 255], BOTAO_X + 210, H - 58, 'center');
    escreve(c, FX(24), 'Setas: navegar    Enter: selecionar', COR_DICA, BOTAO_X, H - 30);
  }

  const PAUSA_OPCOES = [['Continuar', 'continuar'], ['Opções', 'opcoes'], ['Abandonar', 'menu']];
  const pausa = { indice: 0 };
  const OPCOES_ITENS = ['volume', 'voltar'];
  const opcoes = { indice: 0 };

  const CENTRO_X = 330, BASE_CARRO_Y = 340, PAINEL = { x: 620, y: 86, w: 310, h: 270 }, LINHA_ATRIBUTO = 56, SEGMENTO = 22, SEGMENTO_ESPACO = 4;
  const MINIATURA_ESPACO = 14, MINIATURA_Y = 468, COR_BASE = [0, 200, 230], COR_VAZIO = [50, 36, 70];
  const MENSAGENS_MELHORIA = { maximo: 'Atributo no máximo', bloqueado: 'Compre o carro primeiro' };
  const garagem = { indice: 0, foco: 0, mensagem: '' };
  function garagemEscolhe(p) {
    const c = CARROS[garagem.indice];
    if (p.desbloqueados.includes(c.id)) { p.selecionado = c.id; garagem.mensagem = `${c.nome} selecionado`; }
    else if (p.moedas >= c.preco) { p.moedas -= c.preco; p.desbloqueados.push(c.id); p.selecionado = c.id; garagem.mensagem = `${c.nome} desbloqueado`; }
    else { garagem.mensagem = `Faltam ${c.preco - p.moedas} moedas`; return 'erro'; }
    salvaProgresso(p);
    return 'confirmar';
  }
  function garagemMelhora(p, a) {
    const c = CARROS[garagem.indice], custo = custoMelhoria(p, c, a), r = compraMelhoria(p, c, a);
    if (r === 'ok') { garagem.mensagem = `${NOMES[a]} melhorada!`; return 'confirmar'; }
    garagem.mensagem = r === 'sem_moedas' ? `Faltam ${custo - p.moedas} moedas` : MENSAGENS_MELHORIA[r];
    return 'erro';
  }
  function garagemStatus(p, c) {
    const desb = p.desbloqueados.includes(c.id);
    if (garagem.mensagem) return [garagem.mensagem, [255, 255, 255]];
    if (garagem.foco > 0) {
      const a = ATRIBUTOS[garagem.foco - 1];
      if (!desb) return ['Compre o carro para melhorar', COR_DICA];
      if (!podeMelhorar(p, c, a)) return [`${NOMES[a]} no máximo`, COR_DICA];
      return [`Melhorar ${NOMES[a]}: ${custoMelhoria(p, c, a)} moedas`, COR_DESTAQUE];
    }
    if (p.selecionado === c.id) return ['EM USO', COR_NEON];
    if (desb) return ['Enter para usar', [60, 255, 120]];
    return [`${c.preco} moedas  -  Enter para comprar`, COR_DESTAQUE];
  }
  function silhuetaDe(chave, img) { return silhuetas[chave] || (silhuetas[chave] = silhueta(img)); }
  function desenhaGaragem(c, p) {
    desenhaFundo(c, 0); escurece(c, 190);
    escreve(c, FT(32), 'GARAGEM', COR_NEON, W / 2, 40, 'center', COR_ESCURA);
    escreve(c, FT(12), `MOEDAS ${p.moedas}`, COR_DESTAQUE, 20, 20, 'topleft', COR_ESCURA);
    const car = CARROS[garagem.indice], desb = p.desbloqueados.includes(car.id);
    let im = imagensMenu[car.id]; if (!desb) im = silhuetaDe('g' + car.id, im);
    elipse(c, CENTRO_X, BASE_CARRO_Y, im.width, 34, `rgba(0,255,255,${(desb ? 90 : 30) / 255})`);
    c.drawImage(im, Math.round(CENTRO_X - im.width / 2), BASE_CARRO_Y - im.height);
    escreve(c, FT(32), '<', COR_NEON, 80, 220, 'center'); escreve(c, FT(32), '>', COR_NEON, 580, 220, 'center');
    escreve(c, FT(20), garagem.foco === 0 ? `> ${car.nome} <` : car.nome, [255, 255, 255], CENTRO_X, 372, 'center', COR_ESCURA);
    const [st, cor] = garagemStatus(p, car);
    escreve(c, FX(30), st, cor, CENTRO_X, 404, 'center');
    // atributos
    c.fillStyle = 'rgba(20,10,40,0.82)'; pathRound(c, PAINEL.x, PAINEL.y, PAINEL.w, PAINEL.h, 0); c.fill();
    borda(c, PAINEL.x, PAINEL.y, PAINEL.w, PAINEL.h, 2, [110, 70, 150], 10);
    escreve(c, FT(12), 'ATRIBUTOS', COR_NEON, PAINEL.x + PAINEL.w / 2, PAINEL.y + 18, 'center');
    ATRIBUTOS.forEach((a, i) => {
      const topo = PAINEL.y + 40 + i * LINHA_ATRIBUTO, lx = PAINEL.x + 8, lw = PAINEL.w - 16;
      if (garagem.foco === i + 1) borda(c, lx, topo, lw, LINHA_ATRIBUTO - 6, 2, COR_NEON, 6);
      escreve(c, FX(28), NOMES[a], [255, 255, 255], lx + 10, topo + 2);
      let extra = '', ce = COR_DICA;
      if (!desb) { /* nada */ } else if (podeMelhorar(p, car, a)) { extra = `+ ${custoMelhoria(p, car, a)}`; ce = COR_DESTAQUE; } else extra = 'MÁX';
      escreve(c, FX(28), extra, ce, lx + lw - 10, topo + 2, 'topright');
      const base = car.atributos[a], total = nivelAttr(p, car, a);
      for (let s = 0; s < NIVEL_MAXIMO; s++) caixa(c, lx + 10 + s * (SEGMENTO + SEGMENTO_ESPACO), topo + 30, SEGMENTO, 12, s < base ? COR_BASE : s < total ? COR_DESTAQUE : COR_VAZIO);
    });
    // miniaturas
    const total = CARROS.reduce((s, k) => s + miniaturas[k.id].width, 0) + MINIATURA_ESPACO * (CARROS.length - 1);
    let x = Math.floor((W - total) / 2);
    CARROS.forEach((k, i) => {
      let m = miniaturas[k.id]; if (!p.desbloqueados.includes(k.id)) m = silhuetaDe('m' + k.id, m);
      const ry = MINIATURA_Y - m.height / 2;
      if (i === garagem.indice) borda(c, x - 5, ry - 5, m.width + 10, m.height + 10, 2, COR_NEON, 6);
      c.drawImage(m, x, Math.round(ry)); x += m.width + MINIATURA_ESPACO;
    });
    escreve(c, FX(24), 'Esquerda/Direita: carro    Cima/Baixo: atributo    Enter: comprar/usar    Esc: voltar', COR_DICA, W / 2, H - 16, 'center');
  }

  // ------------------------------------------------------------------ main.py
  const DURACAO_AVISO_NIVEL = 2.0, NITRO_ULTRAPASSAGEM = 8, NITRO_RASPANDO = 18, PONTOS_RASPANDO = 25, PONTOS_ULTRAPASSAGEM = 50, DRIFT_MINIMO_PARA_AVISO = 0.6;
  const COR_BONUS = COR_DESTAQUE, COR_RASPOU = [0, 255, 255], COR_CURA = [60, 255, 120], COR_BLINDAGEM = [0, 220, 255];
  const EVENTOS_ITEM = {
    kit: ['cura', `+${VIDA_KIT} VIDA`, COR_CURA], nitro: ['galao', 'NITRO CHEIO!', [255, 140, 0]], blindagem: ['blindagem', 'BLINDAGEM!', COR_BLINDAGEM],
    carnaval: ['carnaval', 'CARNAVAL! x2', COR_BONUS], buraco: ['buraco', `BURACO! -${DANO_BURACO}`, [255, 90, 60]], buraco_blindado: ['blindagem_quebra', 'BLINDAGEM!', COR_BLINDAGEM],
  };

  const pista = montaPista();
  const comprimento = pista.n * TAM_SEGMENTO;
  const efeitos = new Efeitos();
  const config = carregaConfig();
  let progresso = carregaProgresso();
  const T = { up: false, down: false, left: false, right: false, nitro: false, drift: false }; // teclas seguradas
  const auto = { gas: false }; // aceleração automática (toque)
  let estado = 'menu', origemOpcoes = 'menu', corrida = null, resultado = null, relogioStart = performance.now();
  const ouvintes = [];

  function setEstado(e) { estado = e; document.body.dataset.estado = e; for (const f of ouvintes) f(e); }
  function novaCorrida() {
    efeitos.limpa();
    const id = progresso.selecionado;
    const c = {
      carro: new Carro(comprimento, multiplicadores(progresso, carroPorId(id)), imagens[id].width),
      trafego: montaTrafego(comprimento, ARQUIVOS_NPC.length), rng: rngGlobal, nivel: 1, avisoNivel: 0, tempo: 0, tempoDrift: 0, itens: new GerenciadorItens(),
    };
    return c;
  }
  function finaliza(c) {
    const carro = c.carro, pontos = pontuacao(carro.distancia, carro.ultrapassagens, carro.bonus), ganhas = moedasGanhas(carro.distancia);
    const novoRecorde = pontos > progresso.recorde;
    progresso.moedas += ganhas; progresso.recorde = Math.max(progresso.recorde, pontos); salvaProgresso(progresso);
    return { pontos, distancia: trunc(carro.distancia), ultrapassagens: carro.ultrapassagens, nivel: c.nivel, moedas: ganhas, novoRecorde };
  }
  function intensidadeVento(carro) { return carro.nitroAtivo ? 1 : Math.max(0, (carro.fracao - 0.75) / 0.25) * 0.5; }

  function atualizaCorrida(c, dt) {
    const carro = c.carro; c.tempo += dt;
    const indice = Math.floor(carro.pos / TAM_SEGMENTO) % pista.n;
    carro.atualiza(dt, { up: T.up || auto.gas, down: T.down, left: T.left, right: T.right, nitro: T.nitro, drift: T.drift }, pista.curvas[indice]);
    if (carro.nitroAtivo && !c.nitroAnterior) Audio_.toca('nitro');
    c.nitroAnterior = carro.nitroAtivo;
    if (carro.drift) { c.tempoDrift += dt; for (const lado of [-1, 1]) efeitos.fumaca(W / 2 + lado * 80, H - 20); }
    else {
      if (c.tempoDrift >= DRIFT_MINIMO_PARA_AVISO) efeitos.texto(`DRIFT +${trunc(carro.pontosDrift)}`, COR_BONUS);
      c.tempoDrift = 0; carro.pontosDrift = 0;
    }
    if (carro.carnaval > 0 && c.rng.random() < 0.6) efeitos.confete();
    const nivel = ajustaDificuldade(c.trafego, carro, comprimento, ARQUIVOS_NPC.length, c.rng);
    if (nivel > c.nivel) { c.nivel = nivel; c.avisoNivel = DURACAO_AVISO_NIVEL; Audio_.toca('confirmar'); }
    c.avisoNivel = Math.max(0, c.avisoNivel - dt);
    for (const ev of c.itens.atualiza(carro, comprimento, c.rng)) {
      const [som, msg, cor] = EVENTOS_ITEM[ev];
      Audio_.toca(som); efeitos.texto(msg, cor);
      if (ev === 'buraco') efeitos.batida(W / 2, H - 40);
    }
    atualizaTrafego(c.trafego, dt, comprimento);
    for (const npc of c.trafego) {
      if (npc.cooldown <= 0 && colidiu(carro, npc, comprimento)) {
        npc.cooldown = COOLDOWN; npc.bateuRecente = true; efeitos.batida(W / 2, H - 90);
        if (carro.sofreDano(DANO)) { Audio_.toca('blindagem_quebra'); efeitos.texto('BLINDAGEM!', COR_BLINDAGEM); } else Audio_.toca('batida');
      }
      if (contaUltrapassagem(carro, npc, comprimento)) {
        carro.ultrapassagens += 1;
        const m = carro.multiplicador;
        carro.bonus += PONTOS_ULTRAPASSAGEM * (m - 1);
        if (raspou(carro, npc)) {
          carro.bonus += PONTOS_RASPANDO * m; carro.ganhaNitro(NITRO_RASPANDO); Audio_.toca('raspou');
          efeitos.texto(`RASPOU! +${(PONTOS_ULTRAPASSAGEM + PONTOS_RASPANDO) * m}`, COR_RASPOU);
        } else { carro.ganhaNitro(NITRO_ULTRAPASSAGEM); Audio_.toca('ultrapassagem'); efeitos.texto(`+${PONTOS_ULTRAPASSAGEM * m}`, [255, 255, 255]); }
      }
    }
    efeitos.atualiza(dt);
    if (carro.vida <= 0) { Audio_.toca('fim'); return finaliza(c); }
    return null;
  }

  // entrada discreta (equivale ao KEYDOWN do pygame)
  function onKey(k) {
    Audio_.desbloqueia();
    const comMenu = ['menu', 'garagem', 'pausa', 'opcoes'].includes(estado);
    if (comMenu && ['up', 'down', 'left', 'right'].includes(k)) Audio_.toca('menu');
    if (estado === 'menu') {
      if (k === 'up' || k === 'down') menu.indice = navega(menu.indice, MENU_OPCOES.length, k);
      else if (k === 'enter') {
        const destino = MENU_OPCOES[menu.indice][1]; Audio_.toca('confirmar');
        if (destino === 'corrida') { corrida = novaCorrida(); setEstado('corrida'); }
        else if (destino === 'garagem') {
          garagem.indice = CARROS.findIndex((x) => x.id === progresso.selecionado); garagem.foco = 0; garagem.mensagem = ''; setEstado('garagem');
        } else if (destino === 'opcoes') { opcoes.indice = 0; origemOpcoes = 'menu'; setEstado('opcoes'); }
      }
    } else if (estado === 'garagem') {
      const n = ATRIBUTOS.length + 1;
      if (k === 'esc') { setEstado('menu'); return; }
      if (k === 'left') { garagem.indice = mod(garagem.indice - 1, CARROS.length); garagem.mensagem = ''; }
      else if (k === 'right') { garagem.indice = mod(garagem.indice + 1, CARROS.length); garagem.mensagem = ''; }
      else if (k === 'up') { garagem.foco = mod(garagem.foco - 1, n); garagem.mensagem = ''; }
      else if (k === 'down') { garagem.foco = mod(garagem.foco + 1, n); garagem.mensagem = ''; }
      else if (k === 'enter') Audio_.toca(garagem.foco === 0 ? garagemEscolhe(progresso) : garagemMelhora(progresso, ATRIBUTOS[garagem.foco - 1]));
    } else if (estado === 'corrida') {
      if (k === 'esc' || k === 'p') { pausa.indice = 0; setEstado('pausa'); }
    } else if (estado === 'pausa') {
      if (k === 'esc' || k === 'p') setEstado('corrida');
      else if (k === 'enter') {
        const d = PAUSA_OPCOES[pausa.indice][1];
        if (d === 'continuar') setEstado('corrida');
        else if (d === 'opcoes') { Audio_.toca('confirmar'); opcoes.indice = 0; origemOpcoes = 'pausa'; setEstado('opcoes'); }
        else if (d === 'menu') { corrida = null; setEstado('menu'); }
      } else pausa.indice = navega(pausa.indice, PAUSA_OPCOES.length, k);
    } else if (estado === 'opcoes') {
      const item = OPCOES_ITENS[opcoes.indice];
      if (k === 'esc') setEstado(origemOpcoes);
      else if (item === 'volume' && (k === 'left' || k === 'right')) {
        const novo = clamp(config.volume + (k === 'right' ? 10 : -10), 0, 100);
        if (novo !== config.volume) { config.volume = novo; Audio_.volume(novo); salvaConfig(config); }
      } else if (item === 'voltar' && k === 'enter') setEstado(origemOpcoes);
      else opcoes.indice = navega(opcoes.indice, OPCOES_ITENS.length, k);
    } else if (estado === 'fim') {
      if (k === 'r') { corrida = novaCorrida(); setEstado('corrida'); }
      else if (k === 'm' || k === 'esc') { corrida = null; setEstado('menu'); }
    }
  }

  function desenha(agora) {
    const cena = estado === 'opcoes' ? origemOpcoes : estado;
    if (cena === 'menu') desenhaMenu(tela, progresso, agora);
    else if (cena === 'garagem') desenhaGaragem(tela, progresso);
    else {
      const carro = corrida.carro, tremendo = efeitos.tremor > 0 && (estado === 'corrida' || estado === 'fim');
      const alvo = tremendo ? mundo : tela;
      desenhaFundo(alvo, carro.x);
      const img = imagens[progresso.selecionado];
      desenhaPista(alvo, pista, carro.pos, carro.x, corrida.trafego, corrida.itens.itens, () => desenhaCarro(alvo, img, carro, agora));
      if (cena === 'corrida') efeitos.desenhaLinhasVelocidade(alvo, intensidadeVento(carro));
      efeitos.desenhaParticulas(alvo);
      if (carro.danoTimer > 0) { alvo.fillStyle = 'rgba(255,0,0,0.353)'; alvo.fillRect(0, 0, W, H); }
      if (tremendo) { tela.fillStyle = '#000'; tela.fillRect(0, 0, W, H); const [dx, dy] = efeitos.deslocamento(); tela.drawImage(mundoCv, dx, dy); }
      if (cena === 'fim') desenhaFim(tela, resultado);
      else {
        desenhaHud(tela, carro, pontuacao(carro.distancia, carro.ultrapassagens, carro.bonus), corrida.nivel, corrida.avisoNivel, corrida.tempo, agora);
        efeitos.desenhaTextos(tela);
        if (estado === 'pausa') desenhaPainel(tela, 'PAUSA', PAUSA_OPCOES.map(([n]) => [n, null]), pausa.indice, 'Enter: selecionar    Esc: continuar');
      }
    }
    if (estado === 'opcoes') {
      desenhaPainel(tela, 'Opções', [['Volume', `< ${config.volume}% >`], ['Voltar', null]], opcoes.indice, 'Setas: ajustar    Enter: selecionar    Esc: voltar');
    }
  }

  let ultimo = 0;
  function quadro(ts) {
    requestAnimationFrame(quadro);
    const decorrido = ts - ultimo;
    if (decorrido < 1000 / 60 - 2) return;
    const dt = Math.min(decorrido / 1000, 0.05);
    ultimo = ts;
    avanca(dt, (ts - relogioStart) / 1000);
  }
  function avanca(dt, agora) {
    if (estado === 'corrida') {
      const r = atualizaCorrida(corrida, dt);
      if (r) { resultado = r; setEstado('fim'); }
    } else if (estado === 'fim') efeitos.atualiza(dt);
    desenha(agora);
  }

  // ------------------------------------------------------------------ entrada (teclado, toque, foco)
  const MAPA = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    Enter: 'enter', NumpadEnter: 'enter', Escape: 'esc', KeyP: 'p', KeyR: 'r', KeyM: 'm' };
  const SEGURAR = { up: 'up', down: 'down', left: 'left', right: 'right', Space: 'nitro', ShiftLeft: 'drift', ShiftRight: 'drift' };
  function segurar(nome, v) { if (nome in T) T[nome] = v; }
  addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    const k = MAPA[e.code];
    if (k) segurar(k, true);
    if (e.code === 'Space') segurar('nitro', true);
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') segurar('drift', true);
    if (k && !e.repeat) onKey(k); else if (!k) Audio_.desbloqueia();
  });
  addEventListener('keyup', (e) => {
    const k = MAPA[e.code];
    if (k) segurar(k, false);
    if (e.code === 'Space') segurar('nitro', false);
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') segurar('drift', false);
  });
  function soltaTudo() { for (const k of Object.keys(T)) T[k] = false; document.querySelectorAll('#touch .on').forEach((b) => b.classList.remove('on')); }
  function pausaAuto() { soltaTudo(); if (estado === 'corrida') { pausa.indice = 0; setEstado('pausa'); } }
  addEventListener('blur', pausaAuto);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pausaAuto(); });
  cv.addEventListener('pointerdown', () => { Audio_.desbloqueia(); try { cv.focus(); } catch (e) { /* ok */ } });

  // controles de toque (botões HTML)
  const ehToque = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (ehToque) { document.body.classList.add('touch'); auto.gas = true; }
  document.querySelectorAll('#touch button').forEach((b) => {
    const hold = b.dataset.hold, press = b.dataset.press;
    const down = (e) => { e.preventDefault(); Audio_.desbloqueia(); b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch (x) { /* ok */ } if (hold) segurar(hold, true); if (press) onKey(press); };
    const up = (e) => { e.preventDefault(); b.classList.remove('on'); if (hold) segurar(hold, false); };
    b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  });

  // ------------------------------------------------------------------ início
  Audio_.volume(config.volume);
  const fontes = ['16px "Press Start 2P"', '24px VT323'].map((f) => document.fonts.load(f, 'ÍÓÔÕ0123 AbÇ').catch(() => {}));
  Promise.all([carregaImagens(), ...fontes]).then(() => {
    preparaImagens();
    setEstado('menu');
    requestAnimationFrame(quadro);
  }).catch((e) => {
    const d = document.createElement('div'); d.style.cssText = 'position:absolute;inset:0;display:grid;place-items:center;color:#ff5c5c;font:16px sans-serif;text-align:center;padding:24px';
    d.textContent = 'Não foi possível carregar os arquivos do jogo: ' + e.message; document.body.appendChild(d);
  });

  // gancho para testes automatizados (somente leitura/avanço; não altera regras do jogo)
  window.__rr = {
    get estado() { return estado; }, get progresso() { return progresso; }, get corrida() { return corrida; }, get resultado() { return resultado; },
    get config() { return config; }, get menu() { return menu; }, get garagem() { return garagem; }, get pausa() { return pausa; },
    onKey, avanca, T, auto, constantes: { PROFUNDIDADE_JOGADOR, PROFUNDIDADE_FRENTE_JOGADOR, NPC_LARGURA_MUNDO, LARGURA_ITEM, LARGURA_BURACO, COMPRIMENTO_CARRO, MEIA_LARGURA_NPC, comprimento, larguraColisaoJogador: larguraColisao(meiaLarguraJogador()) },
    CARROS, custoMelhoria, nivelAttr, multiplicadores, pontuacao, moedasGanhas, montaTrafego, Carro, GerenciadorItens, validaProgresso, ouvir: (f) => ouvintes.push(f),
    setProgresso(p) { progresso = validaProgresso(p); },
  };
})();
