/*
 * ORION — Protocolo RX-7 (Robo Resgate) — port JavaScript/canvas.
 *
 * Porta fiel do jogo original em Python/pygame (game-sources/rescue-robot/original):
 * mesmas regras, mesmas fases, mesmos números e o mesmo visual feito só com retângulos.
 * Cada bloco abaixo indica o arquivo .py de onde veio.
 * Sem dependências, sem CDN: roda direto de arquivos estáticos.
 */
(() => {
  "use strict";

  // ───────────────────────────────────────────────────────── config.py
  const LARGURA = 960, ALTURA = 640, ALTURA_HUD = 48, TAMANHO = 32;
  const TOTAL_ROBOS = 5, TOTAL_BATERIAS = 8;
  const rgb = (r, g, b) => `rgb(${r},${g},${b})`;
  const PRETO = rgb(8, 12, 28), FUNDO = rgb(13, 22, 48), GRADE = rgb(20, 34, 64);
  const AZUL = rgb(58, 145, 255), CIANO = rgb(95, 235, 255), BRANCO = rgb(239, 246, 255);
  const VERDE = rgb(94, 239, 150), AMARELO = rgb(255, 218, 91), VERMELHO = rgb(255, 88, 105);
  const ROXO = rgb(173, 115, 255), CINZA = rgb(110, 130, 160), CINZA_ESCURO = rgb(80, 85, 110);
  const DIFICULDADES = [
    { nome: "FÁCIL", vidas: 4, dreno_energia: 1.3, velocidade_perigos: 0.8 },
    { nome: "NORMAL", vidas: 3, dreno_energia: 1.8, velocidade_perigos: 1.0 },
    { nome: "DIFÍCIL", vidas: 2, dreno_energia: 2.4, velocidade_perigos: 1.25 },
  ];
  const DIFICULDADE_PADRAO = 1;
  const TEMPO_TRANSICAO = 4.0;

  // ───────────────────────────────────────────── retângulos (como pygame.Rect)
  const R = (x, y, w, h) => ({ x, y, w, h });
  const dir = (r) => r.x + r.w;
  const base = (r) => r.y + r.h;
  const cx = (r) => r.x + Math.trunc(r.w / 2);
  const cy = (r) => r.y + Math.trunc(r.h / 2);
  const colide = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const inflar = (r, dw, dh) => R(r.x - Math.trunc(dw / 2), r.y - Math.trunc(dh / 2), r.w + dw, r.h + dh);
  const colideLista = (r, lista) => lista.some((o) => colide(r, o));
  const embaralhar = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const aleatorio = (min, max) => min + Math.random() * (max - min);
  const inteiro = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

  // ──────────────────────────────────────────────────── partida.py
  const PAREDES = [
    [220, 95, 160, 32], [440, 190, 32, 150], [160, 290, 190, 32],
    [570, 80, 32, 125], [650, 365, 190, 32], [350, 475, 32, 95],
  ];
  const PERIGOS_POR_FASE = {
    1: [
      { tipo: "laser", base: [110, 220], tamanho: [120, 8], eixo: "x", amplitude: 35, velocidade: 1.5, atraso: 0.0 },
      { tipo: "laser", base: [520, 520], tamanho: [120, 8], eixo: "x", amplitude: 35, velocidade: 1.5, atraso: 1.0 },
      { tipo: "drone", base: [760, 150], tamanho: [30, 30], eixo: "y", amplitude: 70, velocidade: 1.7, atraso: 0.0 },
    ],
    2: [
      { tipo: "drone", base: [300, 410], tamanho: [30, 30], eixo: "x", amplitude: 110, velocidade: 1.4, atraso: 2.0 },
    ],
    3: [
      { tipo: "laser", base: [700, 230], tamanho: [8, 100], eixo: "x", amplitude: 60, velocidade: 1.2, atraso: 0.5 },
      { tipo: "drone", base: [120, 450], tamanho: [30, 30], eixo: "y", amplitude: 60, velocidade: 2.0, atraso: 1.0 },
    ],
  };
  const TEXTOS_FASE = {
    2: ["Os sistemas de defesa detectaram o RX-7.", "Um novo drone de segurança foi ativado.", "Os perigos agora estão mais rápidos."],
    3: ["Energia da estação em nível crítico!", "Um laser vertical e outro drone entraram em ação.", "Falta pouco: resgate os últimos robôs."],
  };
  const PONTOS_BATERIA = 10, PONTOS_ROBO = 100;

  class Perigo {
    constructor(d) {
      this.tipo = d.tipo; this.base = d.base; this.eixo = d.eixo;
      this.amplitude = d.amplitude; this.velocidade = d.velocidade; this.atraso = d.atraso;
      this.rect = R(d.base[0], d.base[1], d.tamanho[0], d.tamanho[1]);
      this.ativo = true;
    }
    areaDePatrulha() {
      const a = this.amplitude;
      const area = this.eixo === "x"
        ? R(this.base[0] - a, this.base[1], this.rect.w + 2 * a, this.rect.h)
        : R(this.base[0], this.base[1] - a, this.rect.w, this.rect.h + 2 * a);
      return inflar(area, 24, 24);
    }
    atualizar(tempo, mult) {
      const desloc = Math.trunc(Math.sin(tempo * this.velocidade * mult + this.atraso) * this.amplitude);
      if (this.eixo === "x") this.rect.x = this.base[0] + desloc;
      else this.rect.y = this.base[1] + desloc;
      if (this.tipo === "laser") this.ativo = (tempo * 2 * mult + this.atraso) % 3 >= 1;
    }
  }

  class Partida {
    constructor(dificuldade) {
      this.dificuldade = dificuldade;
      this.jogador = R(64, 80, 32, 32);
      this.posicao = { x: 64, y: 80 };
      this.saida = R(LARGURA - 96, ALTURA - 100, 48, 48);
      this.paredes = PAREDES.map((p) => R(...p));
      this.perigos = PERIGOS_POR_FASE[1].map((d) => new Perigo(d));
      this.pontos = 0; this.energia = 100.0; this.vidas = dificuldade.vidas;
      this.resgatados = 0; this.fase = 1; this.tempo = 0.0; this.invulneravel = 0.0;
      this.andando = false;
      this.mensagem = "Resgate os 5 robôs e encontre a saída!";
      this.mensagem_tempo = 4.0;
      this.fim = null; this.nova_fase = null; this.eventos = [];
      this._espalharItens();
    }

    _espalharItens() {
      const futuros = Object.values(PERIGOS_POR_FASE).flat().map((d) => new Perigo(d));
      const proibidas = this.paredes.map((p) => inflar(p, 16, 16));
      proibidas.push(inflar(this.jogador, 120, 120), inflar(this.saida, 60, 60));
      const perigosZ = futuros.map((p) => p.areaDePatrulha());
      const livres = [], seguros = [];
      for (let y = 104; y < ALTURA - 72; y += 64) {
        for (let x = 64; x < LARGURA - 64; x += 64) {
          const r = R(x, y, 28, 30);
          if (colideLista(r, proibidas)) continue;
          livres.push([x, y]);
          if (!colideLista(r, perigosZ)) seguros.push([x, y]);
        }
      }
      embaralhar(seguros);
      // Robôs nunca ficam na rota de um perigo; baterias podem (risco extra).
      const posRobos = seguros.slice(0, TOTAL_ROBOS);
      const restantes = embaralhar(livres.filter((p) => !posRobos.includes(p)));
      this.robos = posRobos.map(([x, y]) => R(x, y, 28, 30));
      this.baterias = restantes.slice(0, TOTAL_BATERIAS).map(([x, y]) => R(x + 3, y + 2, 22, 26));
    }

    _mover(dx, dy) {
      const j = this.jogador;
      this.posicao.x += dx;
      j.x = Math.round(this.posicao.x);
      for (const p of this.paredes) {
        if (colide(j, p)) {
          if (dx > 0) j.x = p.x - j.w; else if (dx < 0) j.x = dir(p);
          this.posicao.x = j.x;
        }
      }
      this.posicao.y += dy;
      j.y = Math.round(this.posicao.y);
      for (const p of this.paredes) {
        if (colide(j, p)) {
          if (dy > 0) j.y = p.y - j.h; else if (dy < 0) j.y = base(p);
          this.posicao.y = j.y;
        }
      }
      j.x = Math.min(Math.max(j.x, 0), LARGURA - j.w);
      j.y = Math.min(Math.max(j.y, ALTURA_HUD), ALTURA - j.h);
      this.posicao.x = j.x; this.posicao.y = j.y;
    }

    _aviso(t, d) { this.mensagem = t; this.mensagem_tempo = d; }
    _evento(nome, r) { this.eventos.push([nome, r ? [cx(r), cy(r)] : null]); }
    multiplicadorPerigos() { return this.dificuldade.velocidade_perigos * (1 + 0.22 * (this.fase - 1)); }

    _avancarFase() {
      this.fase += 1;
      this.perigos.push(...PERIGOS_POR_FASE[this.fase].map((d) => new Perigo(d)));
      this.energia = Math.min(100.0, this.energia + 20);
      this.invulneravel = 2.0;
      this.nova_fase = this.fase;
    }

    _sofrerDano(perigo) {
      if (this.invulneravel > 0) return;
      this.vidas -= 1;
      this.energia = Math.max(0.0, this.energia - 15);
      this.invulneravel = 1.5;
      this._aviso(`Atenção! O RX-7 foi atingido por um ${perigo.tipo === "laser" ? "laser" : "drone"}.`, 1.8);
      if (perigo.tipo === "laser") this._evento("laser", this.jogador);
      this._evento("dano", this.jogador);
      if (this.vidas <= 0) this.fim = "sem_vidas";
      else if (this.energia <= 0) this.fim = "sem_energia";
    }

    atualizar(dt, tecla) {
      this.eventos = [];
      this.tempo += dt;
      this.mensagem_tempo = Math.max(0.0, this.mensagem_tempo - dt);
      this.invulneravel = Math.max(0.0, this.invulneravel - dt);

      this.energia -= dt * this.dificuldade.dreno_energia * (1 + 0.25 * (this.fase - 1));
      if (this.energia <= 0) { this.energia = 0.0; this.fim = "sem_energia"; return; }

      const velocidade = 190 + (this.fase - 1) * 15;
      let dx = (tecla("ArrowRight") || tecla("d") ? 1 : 0) - (tecla("ArrowLeft") || tecla("a") ? 1 : 0);
      let dy = (tecla("ArrowDown") || tecla("s") ? 1 : 0) - (tecla("ArrowUp") || tecla("w") ? 1 : 0);
      this.andando = dx !== 0 || dy !== 0;
      if (this.andando) {
        const n = Math.hypot(dx, dy); dx /= n; dy /= n; // diagonal não fica mais rápida
        this._mover(dx * velocidade * dt, 0);
        this._mover(0, dy * velocidade * dt);
      }

      for (const p of this.perigos) p.atualizar(this.tempo, this.multiplicadorPerigos());
      this._coletarItens();

      const corpo = inflar(this.jogador, -6, -6); // hitbox menor que o desenho
      for (const p of this.perigos) {
        if (p.ativo && colide(corpo, p.rect)) { this._sofrerDano(p); break; }
      }
      if (this.fim) return;

      if (colide(this.jogador, this.saida)) {
        if (this.resgatados >= TOTAL_ROBOS) {
          this.fim = "vitoria";
          this.pontos += Math.trunc(this.energia) * 2 + this.vidas * 50;
        } else if (this.mensagem_tempo <= 0.3) {
          this._aviso("A saída ainda está bloqueada. Resgate os 5 robôs!", 1.5);
        }
      }
    }

    _coletarItens() {
      for (const b of this.baterias.slice()) {
        if (colide(this.jogador, b)) {
          this.baterias.splice(this.baterias.indexOf(b), 1);
          this.pontos += PONTOS_BATERIA;
          this.energia = Math.min(100.0, this.energia + 22);
          this._aviso("+10 pontos! Bateria coletada: energia recuperada.", 1.2);
          this._evento("coleta", b);
        }
      }
      for (const r of this.robos.slice()) {
        if (colide(this.jogador, r)) {
          this.robos.splice(this.robos.indexOf(r), 1);
          this.resgatados += 1;
          this.pontos += PONTOS_ROBO;
          this.energia = Math.min(100.0, this.energia + 8);
          this._evento("resgate", r);
          if (this.resgatados >= TOTAL_ROBOS) {
            this._aviso("Todos resgatados! A SAÍDA foi liberada!", 3.0);
            this._evento("saida_liberada", this.saida);
          } else {
            this._aviso(`+100 pontos! Robô resgatado (${this.resgatados}/5).`, 1.8);
          }
          if (this.resgatados === 2 || this.resgatados === 4) this._avancarFase();
        }
      }
    }
  }

  // ──────────────────────────────────────────────────── efeitos.py
  class Particula {
    constructor(x, y, cor) {
      this.x = x; this.y = y;
      const v = aleatorio(60, 220);
      this.vx = aleatorio(-1, 1) * v; this.vy = aleatorio(-1, 1) * v;
      this.cor = cor; this.vida = aleatorio(0.35, 0.7);
      this.tamanho = [3, 4, 5][inteiro(0, 2)];
    }
    atualizar(dt) {
      this.x += this.vx * dt; this.y += this.vy * dt;
      this.vx *= 0.9; this.vy *= 0.9; this.vida -= dt;
    }
  }

  class Efeitos {
    constructor() { this.particulas = []; this.tremor = 0; this.clarao = 0; }
    explosao(c, cores, q = 18) {
      for (let i = 0; i < q; i++) this.particulas.push(new Particula(c[0], c[1], cores[inteiro(0, cores.length - 1)]));
    }
    tremer(d = 0.35) { this.tremor = d; this.clarao = 0.18; }
    atualizar(dt) {
      this.particulas.forEach((p) => p.atualizar(dt));
      this.particulas = this.particulas.filter((p) => p.vida > 0);
      this.tremor = Math.max(0, this.tremor - dt);
      this.clarao = Math.max(0, this.clarao - dt);
    }
    deslocamento() {
      if (this.tremor <= 0) return [0, 0];
      const f = Math.trunc(8 * this.tremor / 0.35) + 1;
      return [inteiro(-f, f), inteiro(-f, f)];
    }
  }

  // ────────────────────────────────────────────────────── audio.py
  const EFEITOS = ["coleta", "resgate", "dano", "vitoria", "derrota", "inicio", "laser"];
  const MUSICAS = { menu: "musica_menu.wav", partida: "musica_partida.wav" };
  const PASTA_SONS = "sounds/";

  class Audio_ {
    constructor() {
      this.volume = 0.7; this.mudo = false;
      this.musicaAtual = null; this.musicaPausada = false; this.el = null;
      this.efeitos = {};
      this.musicas = {};
      try {
        for (const n of EFEITOS) { const a = new Audio(PASTA_SONS + n + ".wav"); a.preload = "auto"; this.efeitos[n] = a; }
        for (const [n, f] of Object.entries(MUSICAS)) { const a = new Audio(PASTA_SONS + f); a.loop = true; a.preload = "auto"; this.musicas[n] = a; }
      } catch (e) { /* sem áudio: o jogo continua mudo */ }
    }
    get efetivo() { return this.mudo ? 0 : this.volume; }
    _aplicar() { if (this.el) this.el.volume = this.efetivo * 0.55; }
    tocar(nome) {
      const s = this.efeitos[nome];
      if (!s || this.mudo) return;
      try {
        const c = s.cloneNode(); c.volume = this.efetivo;
        const p = c.play(); if (p && p.catch) p.catch(() => {});
      } catch (e) { /* ignora */ }
    }
    musica(nome) {
      if (nome === this.musicaAtual) return;
      this.musicaAtual = nome;
      if (this.el) { this.el.pause(); this.el.currentTime = 0; this.el = null; }
      if (!nome || !this.musicas[nome]) return;
      this.el = this.musicas[nome];
      this._aplicar();
      this._tocarMusica();
    }
    _tocarMusica() {
      if (!this.el || this.musicaPausada) return;
      const p = this.el.play(); if (p && p.catch) p.catch(() => {}); // navegador exige um toque antes
    }
    pausarMusica(pausada) {
      this.musicaPausada = pausada;
      if (!this.el) return;
      if (pausada) this.el.pause(); else this._tocarMusica();
    }
    liberar() { this._tocarMusica(); } // chamado no 1º toque/tecla do jogador
    alternarMudo() { this.mudo = !this.mudo; this._aplicar(); }
    mudarVolume(d) {
      this.volume = Math.round(Math.min(1, Math.max(0, this.volume + d)) * 10) / 10;
      this.mudo = false; this._aplicar(); this.tocar("coleta");
    }
    descricao() { return this.mudo ? "SOM: MUDO" : `VOL: ${Math.trunc(this.volume * 100 + 0.5)}%`; }
  }

  // ───────────────────────────────────────────────────── recorde.py
  const CHAVE_RECORDE = "rescue-robot:recorde";
  const carregarRecorde = () => {
    try { const v = parseInt(localStorage.getItem(CHAVE_RECORDE) || "0", 10); return Number.isFinite(v) ? v : 0; }
    catch (e) { return 0; }
  };
  const salvarRecorde = (p) => { try { localStorage.setItem(CHAVE_RECORDE, String(p)); } catch (e) { /* sem armazenamento */ } };

  // ──────────────────────────────────────────────────── desenho.py
  const canvas = document.getElementById("canvas");
  const tela = canvas.getContext("2d");
  const mundoCanvas = document.createElement("canvas");
  mundoCanvas.width = LARGURA; mundoCanvas.height = ALTURA;
  const mundo = mundoCanvas.getContext("2d");

  const FAMILIA = '"Liberation Sans", "Helvetica Neue", Arial, Helvetica, sans-serif';
  const FONTES = { pequena: 16, normal: 21, grande: 30, titulo: 52 };

  const ret = (c, cor, x, y, w, h) => { c.fillStyle = cor; c.fillRect(x, y, w, h); };
  // Contorno desenhado para dentro do retângulo, como pygame.draw.rect(..., largura).
  const borda = (c, cor, x, y, w, h, e) => {
    c.fillStyle = cor;
    c.fillRect(x, y, w, e); c.fillRect(x, y + h - e, w, e);
    c.fillRect(x, y + e, e, h - 2 * e); c.fillRect(x + w - e, y + e, e, h - 2 * e);
  };
  const linhaH = (c, cor, x1, x2, y, e) => ret(c, cor, x1, y - (e >> 1), x2 - x1, e);
  const linhaV = (c, cor, x, y1, y2, e) => ret(c, cor, x - (e >> 1), y1, e, y2 - y1);

  function texto(c, conteudo, fonte, cor, centro, sombra = true) {
    c.font = `bold ${FONTES[fonte]}px ${FAMILIA}`;
    c.textAlign = "center"; c.textBaseline = "middle";
    if (sombra) { c.fillStyle = PRETO; c.fillText(String(conteudo), centro[0] + 2, centro[1] + 2); }
    c.fillStyle = cor; c.fillText(String(conteudo), centro[0], centro[1]);
  }
  function textoEsquerda(c, conteudo, fonte, cor, pos) {
    c.font = `bold ${FONTES[fonte]}px ${FAMILIA}`;
    c.textAlign = "left"; c.textBaseline = "middle";
    c.fillStyle = cor; c.fillText(String(conteudo), pos[0], pos[1]);
  }
  function caixa(c, r, corBorda = rgb(30, 53, 95), alfa = 225) {
    c.fillStyle = `rgba(6,10,26,${alfa / 255})`; c.fillRect(r.x, r.y, r.w, r.h);
    borda(c, corBorda, r.x, r.y, r.w, r.h, 4);
    for (const [px, py] of [[r.x, r.y], [dir(r), r.y], [r.x, base(r)], [dir(r), base(r)]]) ret(c, CIANO, px - 4, py - 4, 8, 8);
  }

  function desenharFundo(c, tempo = 0) {
    ret(c, FUNDO, 0, 0, LARGURA, ALTURA);
    for (let x = 0; x < LARGURA; x += TAMANHO) ret(c, GRADE, x, 0, 1, ALTURA);
    for (let y = 0; y < ALTURA; y += TAMANHO) ret(c, GRADE, 0, y, LARGURA, 1);
    for (let i = 0; i < 42; i++) {
      const x = (i * 137 + 29) % LARGURA, y = (i * 83 + 17) % ALTURA;
      const acesa = Math.sin(tempo * 2 + i) > 0.6;
      ret(c, acesa ? rgb(90, 150, 210) : (i % 3 ? rgb(38, 62, 104) : rgb(65, 111, 160)), x, y, 3, 3);
    }
  }
  function desenharParede(c, p) {
    ret(c, rgb(42, 57, 91), p.x, p.y, p.w, p.h);
    ret(c, rgb(92, 121, 166), p.x, p.y, p.w, 5);
    if (p.w >= p.h) {
      for (let px = p.x + 10; px < dir(p) - 5; px += 20) ret(c, rgb(25, 38, 68), px, p.y + 10, 8, Math.max(4, p.h - 15));
    } else {
      for (let py = p.y + 12; py < base(p) - 8; py += 20) ret(c, rgb(25, 38, 68), p.x + 8, py, p.w - 16, 8);
    }
  }
  function desenharSaida(c, s, liberada, tempo) {
    if (liberada) {
      const pulso = Math.trunc(6 + 4 * Math.sin(tempo * 6));
      const g = inflar(s, 12 + pulso, 12 + pulso);
      borda(c, rgb(30, 90, 70), g.x, g.y, g.w, g.h, 3);
    }
    const cor = liberada ? VERDE : CINZA_ESCURO;
    const f = inflar(s, 12, 12);
    ret(c, rgb(25, 40, 66), f.x, f.y, f.w, f.h);
    borda(c, cor, s.x, s.y, s.w, s.h, 4);
    borda(c, cor, s.x + 12, s.y + 8, 24, 32, 3);
    if (!liberada) {
      ret(c, cor, cx(s) - 6, cy(s) - 2, 12, 10);
      borda(c, cor, cx(s) - 4, cy(s) - 8, 8, 7, 2);
    }
    texto(c, "SAÍDA", "pequena", cor, [cx(s), base(s) + 18]);
  }

  function desenharRobo(c, x, y, cor = AZUL, s = 1, quadro = 0, olhos = PRETO) {
    const pe = quadro === 1 ? 2 * s : 0, pd = quadro === 2 ? 2 * s : 0;
    ret(c, rgb(8, 14, 32), x + 4 * s, y + 5 * s, 24 * s, 23 * s);
    ret(c, cor, x + 5 * s, y + 4 * s, 22 * s, 20 * s);
    ret(c, rgb(180, 225, 255), x + 8 * s, y + 7 * s, 16 * s, 5 * s);
    ret(c, olhos, x + 9 * s, y + 13 * s, 4 * s, 5 * s);
    ret(c, olhos, x + 19 * s, y + 13 * s, 4 * s, 5 * s);
    ret(c, cor, x + 1 * s, y + 10 * s - pd, 4 * s, 10 * s);
    ret(c, cor, x + 27 * s, y + 10 * s - pe, 4 * s, 10 * s);
    ret(c, rgb(80, 110, 150), x + 8 * s, y + 24 * s - pe, 5 * s, 6 * s);
    ret(c, rgb(80, 110, 150), x + 19 * s, y + 24 * s - pd, 5 * s, 6 * s);
    ret(c, AMARELO, x + 14 * s, y + 1 * s, 4 * s, 3 * s);
  }
  function desenharJogador(c, p) {
    if (p.invulneravel > 0 && Math.trunc(p.tempo * 12) % 2 === 1) return; // pisca após dano
    let quadro = 0;
    if (p.andando) quadro = Math.trunc(p.tempo * 8) % 2 === 0 ? 1 : 2;
    desenharRobo(c, p.jogador.x, p.jogador.y, AZUL, 1, quadro);
  }
  function desenharRoboPreso(c, r, tempo, i) {
    const salto = Math.trunc(Math.abs(Math.sin(tempo * 4 + i)) * 4);
    desenharRobo(c, r.x - 2, r.y - salto, ROXO, 1, 0, rgb(60, 20, 90));
    if (Math.trunc(tempo * 2 + i) % 2 === 0) texto(c, "SOS", "pequena", rgb(220, 190, 255), [cx(r), r.y - 14], false);
  }
  function desenharBateria(c, r, tempo) {
    const b = Math.trunc(tempo * 4) % 2 === 0 ? 3 : 1;
    ret(c, rgb(20, 70, 65), r.x - b, r.y - b, r.w + 2 * b, r.h + 2 * b);
    ret(c, VERDE, r.x, r.y, r.w, r.h);
    ret(c, rgb(210, 255, 214), r.x + 5, r.y + 4, 6, r.h - 8);
    ret(c, rgb(210, 255, 214), r.x + 13, r.y + 4, 4, r.h - 8);
    ret(c, VERDE, r.x + r.w, r.y + 6, 4, r.h - 12);
  }
  function desenharPerigo(c, p, tempo) {
    const r = p.rect;
    if (p.tipo === "laser") {
      const g = inflar(r, 8, 8);
      ret(c, rgb(70, 28, 57), g.x, g.y, g.w, g.h);
      if (p.ativo) {
        ret(c, VERMELHO, r.x, r.y, r.w, r.h);
        const t = Math.trunc(tempo * 30) % 2 ? 1 : -1;
        if (r.w >= r.h) linhaH(c, rgb(255, 190, 200), r.x, dir(r), cy(r) + t, 2);
        else linhaV(c, rgb(255, 190, 200), cx(r) + t, r.y, base(r), 2);
      } else {
        borda(c, rgb(100, 35, 65), r.x, r.y, r.w, r.h, 2);
      }
      if (r.w >= r.h) {
        ret(c, CINZA, r.x - 6, cy(r) - 6, 6, 12); ret(c, CINZA, dir(r), cy(r) - 6, 6, 12);
      } else {
        ret(c, CINZA, cx(r) - 6, r.y - 6, 12, 6); ret(c, CINZA, cx(r) - 6, base(r), 12, 6);
      }
    } else {
      const g = inflar(r, 4, 4);
      ret(c, rgb(40, 30, 50), g.x, g.y, g.w, g.h);
      ret(c, rgb(150, 70, 90), r.x, r.y, r.w, r.h);
      ret(c, rgb(90, 40, 60), r.x + 3, r.y + r.h - 8, r.w - 6, 5);
      const olho = Math.trunc(tempo * 6) % 2 === 0 ? VERMELHO : rgb(255, 180, 120);
      ret(c, PRETO, cx(r) - 7, r.y + 8, 14, 10);
      ret(c, olho, cx(r) - 4, r.y + 10, 8, 6);
      const larg = Math.trunc(tempo * 20) % 2 === 0 ? 18 : 8;
      for (const lado of [r.x + 2, dir(r) - 2]) {
        linhaV(c, CINZA, lado, r.y - 5, r.y, 2);
        linhaH(c, BRANCO, lado - (larg >> 1), lado + (larg >> 1), r.y - 6, 2);
      }
    }
  }

  function desenharCoracao(c, x, y, cor) {
    for (const [dx, dy, w, h] of [[2, 0, 4, 2], [8, 0, 4, 2], [0, 2, 14, 6], [2, 8, 10, 2], [4, 10, 6, 2], [6, 12, 2, 2]]) ret(c, cor, x + dx, y + dy, w, h);
  }
  function desenharHud(c, p, recorde, audio) {
    ret(c, rgb(6, 10, 24), 0, 0, LARGURA, ALTURA_HUD);
    linhaH(c, rgb(30, 53, 95), 0, LARGURA, ALTURA_HUD - 1, 2);
    const meio = ALTURA_HUD >> 1;
    textoEsquerda(c, `PONTOS ${p.pontos}`, "normal", BRANCO, [14, meio]);
    textoEsquerda(c, `ROBÔS ${p.resgatados}/${TOTAL_ROBOS}`, "normal", CIANO, [170, meio]);
    textoEsquerda(c, "VIDAS", "pequena", VERMELHO, [300, meio]);
    for (let i = 0; i < p.dificuldade.vidas; i++) desenharCoracao(c, 356 + i * 18, meio - 7, i < p.vidas ? VERMELHO : rgb(60, 40, 55));
    textoEsquerda(c, "ENERGIA", "pequena", BRANCO, [444, meio]);
    ret(c, rgb(65, 40, 60), 520, meio - 8, 120, 16);
    const e = p.energia;
    const cor = e > 35 ? VERDE : e > 15 ? AMARELO : VERMELHO;
    if (e > 15 || Math.trunc(p.tempo * 6) % 2 === 0) ret(c, cor, 520, meio - 8, Math.trunc(120 * Math.max(0, e) / 100), 16);
    borda(c, BRANCO, 520, meio - 8, 120, 16, 1);
    textoEsquerda(c, `FASE ${p.fase}`, "pequena", AMARELO, [656, meio]);
    const min = Math.trunc(p.tempo / 60), seg = Math.trunc(p.tempo) % 60;
    textoEsquerda(c, `${String(min).padStart(2, "0")}:${String(seg).padStart(2, "0")}`, "pequena", BRANCO, [722, meio]);
    textoEsquerda(c, `REC ${recorde}`, "pequena", ROXO, [782, meio]);
    textoEsquerda(c, audio.descricao(), "pequena", CINZA, [866, meio - 9]);
    textoEsquerda(c, "P: pausa", "pequena", CINZA, [866, meio + 9]);
  }

  function desenharPartida(p, efeitos, recorde, audio) {
    desenharFundo(mundo, p.tempo);
    desenharSaida(mundo, p.saida, p.resgatados >= TOTAL_ROBOS, p.tempo);
    p.paredes.forEach((w) => desenharParede(mundo, w));
    p.baterias.forEach((b) => desenharBateria(mundo, b, p.tempo));
    p.robos.forEach((r, i) => desenharRoboPreso(mundo, r, p.tempo, i));
    p.perigos.forEach((pe) => desenharPerigo(mundo, pe, p.tempo));
    desenharJogador(mundo, p);
    for (const part of efeitos.particulas) {
      const t = Math.max(1, Math.trunc(part.tamanho * Math.min(1.0, part.vida * 2)));
      ret(mundo, part.cor, Math.trunc(part.x), Math.trunc(part.y), t, t);
    }

    ret(tela, PRETO, 0, 0, LARGURA, ALTURA);
    const [ox, oy] = efeitos.deslocamento();
    tela.drawImage(mundoCanvas, ox, oy);
    if (efeitos.clarao > 0) {
      tela.fillStyle = `rgba(255,40,60,${(110 * efeitos.clarao / 0.18) / 255})`;
      tela.fillRect(0, 0, LARGURA, ALTURA);
    }
    desenharHud(tela, p, recorde, audio);
    if (p.mensagem_tempo > 0) {
      const faixa = R(150, ALTURA_HUD + 8, LARGURA - 300, 32);
      caixa(tela, faixa, undefined, 170);
      texto(tela, p.mensagem, "pequena", AMARELO, [cx(faixa), cy(faixa)]);
    }
    if (p.resgatados < TOTAL_ROBOS) texto(tela, "Resgate todos os robôs para liberar a saída", "pequena", CINZA, [LARGURA / 2, ALTURA - 14]);
    else if (Math.trunc(p.tempo * 3) % 2 === 0) texto(tela, "SAÍDA LIBERADA! Leve o RX-7 até a saída", "pequena", VERDE, [LARGURA / 2, ALTURA - 14]);
  }

  const escurecer = (alfa = 190) => { tela.fillStyle = `rgba(3,7,20,${alfa / 255})`; tela.fillRect(0, 0, LARGURA, ALTURA); };
  const M = LARGURA / 2;

  function desenharMenu(tempo, dif, recorde) {
    desenharFundo(tela, tempo);
    caixa(tela, R(110, 50, 740, 540));
    const flutuar = Math.trunc(Math.sin(tempo * 2.5) * 6);
    desenharRobo(tela, M - 32, 90 + flutuar, AZUL, 2, Math.trunc(tempo * 4) % 2 === 0 ? 1 : 2);
    texto(tela, "ROBO RESGATE", "titulo", CIANO, [M, 205]);
    texto(tela, "MISSÃO RX-7: SALVAR A TRIPULAÇÃO DA ESTAÇÃO ORION", "normal", BRANCO, [M, 250]);
    if (Math.trunc(tempo * 2) % 2 === 0) texto(tela, "ENTER - JOGAR", "grande", VERDE, [M, 305]);
    texto(tela, `<  DIFICULDADE: ${dif.nome}  >`, "normal", AMARELO, [M, 352]);
    texto(tela, `vidas: ${dif.vidas}   ·   setas esquerda/direita para trocar`, "pequena", CINZA, [M, 378]);
    texto(tela, `RECORDE: ${recorde}`, "normal", ROXO, [M, 415]);
    texto(tela, "COMO JOGAR", "normal", CIANO, [M, 460]);
    texto(tela, "Setas/WASD: mover   P ou ESC: pausar   M: som   - / +: volume", "pequena", BRANCO, [M, 490]);
    texto(tela, "Colete baterias (+10), resgate 5 robôs (+100) e alcance a saída.", "pequena", BRANCO, [M, 515]);
    texto(tela, "Evite lasers vermelhos e drones. Sem energia ou sem vidas, a missão falha.", "pequena", BRANCO, [M, 540]);
    // O "ESC - sair do jogo" do original não existe no navegador: a aba é que fecha o jogo.
  }
  function desenharIntroducao(tempo) {
    desenharFundo(tela, tempo);
    caixa(tela, R(100, 80, 760, 480), rgb(90, 70, 40));
    texto(tela, Math.trunc(tempo * 3) % 2 === 0 ? "! TRANSMISSÃO DE EMERGÊNCIA !" : "TRANSMISSÃO DE EMERGÊNCIA", "grande", AMARELO, [M, 130]);
    desenharRobo(tela, 160, 190, AZUL, 2);
    const linhas = [
      ["RX-7, aqui é o sistema central da estação ORION.", BRANCO],
      ["Uma pane cortou a energia de todos os setores.", BRANCO],
      ["Cinco robôs de manutenção ficaram presos.", BRANCO],
      ["Os lasers e drones de segurança estão com defeito", VERMELHO],
      ["e atacam qualquer coisa que se mova.", VERMELHO],
    ];
    linhas.forEach(([l, cor], i) => textoEsquerda(tela, l, "normal", cor, [250, 200 + i * 32]));
    texto(tela, "Colete baterias para não ficar sem energia.", "normal", CIANO, [M, 395]);
    texto(tela, "A saída só abrirá quando todos forem resgatados.", "normal", CIANO, [M, 428]);
    texto(tela, "Você é nossa última unidade operacional.", "normal", ROXO, [M, 461]);
    texto(tela, "ENTER - iniciar a missão     ESC - voltar", "grande", VERDE, [M, 515]);
  }
  function desenharTransicao(fase, linhas) {
    escurecer(200);
    caixa(tela, R(150, 170, 660, 300), rgb(90, 70, 40));
    texto(tela, `FASE ${fase}`, "titulo", AMARELO, [M, 230]);
    texto(tela, "TRANSMISSÃO DA ORION", "pequena", CINZA, [M, 272]);
    linhas.forEach((l, i) => texto(tela, l, "normal", BRANCO, [M, 315 + i * 32]));
    texto(tela, "ENTER - continuar", "normal", VERDE, [M, 438]);
  }
  function desenharPausa() {
    escurecer(190);
    caixa(tela, R(220, 180, 520, 280));
    texto(tela, "PAUSADO", "titulo", CIANO, [M, 240]);
    texto(tela, "P ou ESC - continuar", "normal", BRANCO, [M, 300]);
    texto(tela, "ENTER - voltar ao menu", "normal", BRANCO, [M, 335]);
    texto(tela, "M - ligar/desligar som     - / + volume", "normal", BRANCO, [M, 370]);
    texto(tela, "R - reiniciar a missão", "normal", BRANCO, [M, 405]);
  }
  const FINAIS = {
    vitoria: ["MISSÃO CUMPRIDA!", VERDE, ["Os cinco robôs foram resgatados e deixaram a ORION.", "Com a tripulação reunida, a estação volta a funcionar."]],
    sem_energia: ["SEM ENERGIA", AMARELO, ["A bateria do RX-7 se esgotou no meio da estação.", "No escuro, os robôs presos aguardam um novo resgate..."]],
    sem_vidas: ["RX-7 DESTRUÍDO", VERMELHO, ["As defesas com defeito danificaram o RX-7 demais.", "A ORION ficou em silêncio mais uma vez."]],
  };
  function desenharFim(p, tempo, novoRecorde, recorde) {
    escurecer(215);
    const [titulo, cor, linhas] = FINAIS[p.fim];
    caixa(tela, R(120, 90, 720, 470), cor);
    texto(tela, titulo, "titulo", cor, [M, 150]);
    if (p.fim === "vitoria") {
      for (let i = 0; i < TOTAL_ROBOS + 1; i++) {
        const salto = Math.trunc(Math.abs(Math.sin(tempo * 5 + i)) * 10);
        desenharRobo(tela, M - 150 + i * 50, 200 - salto, i === 2 ? AZUL : ROXO);
      }
    } else {
      desenharRobo(tela, M - 32, 180, CINZA_ESCURO, 2, 0, rgb(40, 40, 50));
      if (Math.trunc(tempo * 4) % 2 === 0) ret(tela, AMARELO, M + 24, 184, 4, 4);
    }
    linhas.forEach((l, i) => texto(tela, l, "normal", BRANCO, [M, 275 + i * 32]));
    const min = Math.trunc(p.tempo / 60), seg = Math.trunc(p.tempo) % 60;
    texto(tela, `Pontuação final: ${p.pontos}`, "grande", AMARELO, [M, 360]);
    texto(tela, `Robôs resgatados: ${p.resgatados}/${TOTAL_ROBOS}    Tempo: ${String(min).padStart(2, "0")}:${String(seg).padStart(2, "0")}`, "normal", CIANO, [M, 400]);
    if (novoRecorde) { if (Math.trunc(tempo * 4) % 2 === 0) texto(tela, "NOVO RECORDE!", "grande", ROXO, [M, 445]); }
    else texto(tela, `Recorde: ${recorde}`, "normal", ROXO, [M, 445]);
    texto(tela, "R - jogar novamente     ENTER - menu", "normal", BRANCO, [M, 510]);
  }

  // ───────────────────────────────────────────────────────── jogo.py
  class Jogo {
    constructor() {
      this.audio = new Audio_();
      this.efeitos = new Efeitos();
      this.recorde = carregarRecorde();
      this.indiceDificuldade = DIFICULDADE_PADRAO;
      this.estado = "menu";
      this.partida = null;
      this.tempoTela = 0; this.tempoTransicao = 0; this.novoRecorde = false;
      this.teclas = new Set();
      this.audio.musica("menu");
    }
    tecla(nome) { return this.teclas.has(nome); }

    iniciarPartida() {
      this.partida = new Partida(DIFICULDADES[this.indiceDificuldade]);
      this.efeitos = new Efeitos();
      this.novoRecorde = false;
      this.estado = "jogando";
      this.audio.tocar("inicio"); this.audio.musica("partida");
    }
    irParaMenu() { this.estado = "menu"; this.audio.pausarMusica(false); this.audio.musica("menu"); }
    terminarPartida() {
      this.estado = "fim";
      this.audio.musica(null);
      this.audio.tocar(this.partida.fim === "vitoria" ? "vitoria" : "derrota");
      if (this.partida.pontos > this.recorde) {
        this.recorde = this.partida.pontos; this.novoRecorde = true; salvarRecorde(this.recorde);
      }
    }

    tratarTecla(t) {
      if (t === "m") { this.audio.alternarMudo(); return; }
      if (t === "-") { this.audio.mudarVolume(-0.1); return; }
      if (t === "=" || t === "+") { this.audio.mudarVolume(0.1); return; }
      const enter = t === "Enter";
      switch (this.estado) {
        case "menu":
          if (enter) this.estado = "intro";
          else if (t === "ArrowLeft" || t === "a") { this.indiceDificuldade = (this.indiceDificuldade + DIFICULDADES.length - 1) % DIFICULDADES.length; this.audio.tocar("coleta"); }
          else if (t === "ArrowRight" || t === "d") { this.indiceDificuldade = (this.indiceDificuldade + 1) % DIFICULDADES.length; this.audio.tocar("coleta"); }
          break;
        case "intro":
          if (enter) this.iniciarPartida(); else if (t === "Escape") this.estado = "menu";
          break;
        case "jogando":
          if (t === "p" || t === "Escape") { this.estado = "pausa"; this.audio.pausarMusica(true); }
          break;
        case "transicao":
          if (enter || t === " ") this.estado = "jogando";
          break;
        case "pausa":
          if (t === "p" || t === "Escape") { this.estado = "jogando"; this.audio.pausarMusica(false); }
          else if (enter) this.irParaMenu();
          else if (t === "r") { this.audio.pausarMusica(false); this.iniciarPartida(); }
          break;
        case "fim":
          if (t === "r") this.iniciarPartida(); else if (enter) this.irParaMenu();
          break;
      }
    }

    reagir() {
      for (const [nome, pos] of this.partida.eventos) {
        if (nome === "coleta") { this.audio.tocar("coleta"); this.efeitos.explosao(pos, [VERDE, rgb(210, 255, 214)], 14); }
        else if (nome === "resgate") { this.audio.tocar("resgate"); this.efeitos.explosao(pos, [ROXO, CIANO, rgb(220, 190, 255)], 26); }
        else if (nome === "dano") { this.audio.tocar("dano"); this.efeitos.tremer(); this.efeitos.explosao(pos, [VERMELHO, AMARELO], 20); }
        else if (nome === "laser") this.audio.tocar("laser");
        else if (nome === "saida_liberada") { this.audio.tocar("inicio"); this.efeitos.explosao(pos, [VERDE, CIANO], 30); }
      }
    }

    atualizar(dt) {
      this.tempoTela += dt;
      if (this.estado === "jogando") {
        this.partida.atualizar(dt, (n) => this.tecla(n));
        this.reagir();
        this.efeitos.atualizar(dt);
        if (this.partida.fim) this.terminarPartida();
        else if (this.partida.nova_fase) {
          this.estado = "transicao"; this.tempoTransicao = TEMPO_TRANSICAO; this.partida.nova_fase = null;
        }
      } else if (this.estado === "transicao") {
        this.efeitos.atualizar(dt);
        this.tempoTransicao -= dt;
        if (this.tempoTransicao <= 0) this.estado = "jogando";
      } else if (this.estado === "fim") {
        this.efeitos.atualizar(dt);
      }
    }

    desenhar() {
      if (this.estado === "menu") desenharMenu(this.tempoTela, DIFICULDADES[this.indiceDificuldade], this.recorde);
      else if (this.estado === "intro") desenharIntroducao(this.tempoTela);
      else {
        desenharPartida(this.partida, this.efeitos, this.recorde, this.audio);
        if (this.estado === "transicao") desenharTransicao(this.partida.fase, TEXTOS_FASE[this.partida.fase]);
        else if (this.estado === "pausa") desenharPausa();
        else if (this.estado === "fim") desenharFim(this.partida, this.tempoTela, this.novoRecorde, this.recorde);
      }
    }
  }

  // ─────────────────────────────────────────── entrada (teclado e toque)
  const jogo = new Jogo();
  window.__rr = jogo; // gancho para testes automatizados

  const normalizar = (k) => (k.length === 1 ? k.toLowerCase() : k);
  const TECLAS_DO_JOGO = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "Enter", "Escape"]);

  function apertar(k) {
    jogo.audio.liberar();
    if (!jogo.teclas.has(k)) { jogo.teclas.add(k); jogo.tratarTecla(k); }
  }
  function soltar(k) { jogo.teclas.delete(k); }

  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = normalizar(e.key);
    if (TECLAS_DO_JOGO.has(k)) e.preventDefault();
    if (e.repeat) return;
    apertar(k);
  });
  window.addEventListener("keyup", (e) => soltar(normalizar(e.key)));
  window.addEventListener("blur", () => {
    jogo.teclas.clear();
    if (jogo.estado === "jogando") jogo.tratarTecla("p"); // perdeu o foco: pausa sozinho
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && jogo.estado === "jogando") jogo.tratarTecla("p");
  });
  canvas.addEventListener("pointerdown", () => { window.focus(); jogo.audio.liberar(); });

  // Controles de toque: alavanca (pad) com diagonais + botões de ação.
  const touch = document.getElementById("touch");
  const pad = document.getElementById("pad");
  const knob = document.getElementById("knob");
  const forcarToque = /[?&]touch=1/.test(location.search);
  const temToque = forcarToque || (window.matchMedia && matchMedia("(pointer: coarse)").matches) || "ontouchstart" in window;
  if (temToque) document.body.classList.add("touch");

  const DIRS = { left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp", down: "ArrowDown" };
  let padId = null;
  function moverPad(e) {
    const r = pad.getBoundingClientRect();
    const raio = r.width / 2;
    let dx = (e.clientX - (r.left + raio)) / raio, dy = (e.clientY - (r.top + raio)) / raio;
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    knob.style.transform = `translate(${dx * raio * 0.45}px, ${dy * raio * 0.45}px)`;
    const lim = 0.3;
    const alvo = { left: dx < -lim, right: dx > lim, up: dy < -lim, down: dy > lim };
    for (const [nome, ativo] of Object.entries(alvo)) {
      if (ativo) apertar(DIRS[nome]); else soltar(DIRS[nome]);
    }
  }
  function largarPad() {
    padId = null; knob.style.transform = "";
    Object.values(DIRS).forEach(soltar);
  }
  if (pad) {
    pad.addEventListener("pointerdown", (e) => { e.preventDefault(); padId = e.pointerId; try { pad.setPointerCapture(e.pointerId); } catch (_) { /* ok */ } moverPad(e); });
    pad.addEventListener("pointermove", (e) => { if (e.pointerId === padId) moverPad(e); });
    pad.addEventListener("pointerup", (e) => { if (e.pointerId === padId) largarPad(); });
    pad.addEventListener("pointercancel", largarPad);
  }
  document.querySelectorAll("#btns button").forEach((b) => {
    const k = b.dataset.key;
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault(); jogo.audio.liberar();
      b.classList.add("on");
      jogo.tratarTecla(k); // botão de ação = um toque, sem repetição
    });
    const fim = () => b.classList.remove("on");
    b.addEventListener("pointerup", fim); b.addEventListener("pointercancel", fim); b.addEventListener("pointerleave", fim);
  });
  document.addEventListener("contextmenu", (e) => { if (temToque) e.preventDefault(); });

  // ───────────────────────────────────────────────────── laço principal
  let anterior = performance.now();
  function quadro(agora) {
    const dt = Math.min((agora - anterior) / 1000, 0.04); // se travar, nada "teleporta"
    anterior = agora;
    jogo.atualizar(dt);
    jogo.desenhar();
    requestAnimationFrame(quadro);
  }
  window.focus();
  requestAnimationFrame(quadro);
})();
