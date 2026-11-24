# Game Hub

Portal de jogos feito com Next.js (App Router), React, TypeScript e Tailwind CSS. Primeiro título do catálogo: **ORION — Protocolo RX-7** (Rescue Robot).

Funciona sem infraestrutura paga: é um site estático. Favoritos, histórico e preferências ficam no `localStorage` do navegador (não há conta nem servidor).

## Rodar localmente

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start   # produção local
npm run lint && npm run typecheck
```

Requer Node.js 20+.

## Jogar no navegador

O ORION roda **direto no navegador**, sem instalar nada: o botão "Jogar agora" (ou clicar no card) abre `/play/rescue-robot` e o jogo carrega na hora, no PC e no celular (controles de toque na tela).

A versão web é um **port em JavaScript/Canvas** do código Python original, feito linha a linha (mesmas regras, fases, números e visual). O fonte fica em `game-sources/rescue-robot/js-port/` e é publicado em `public/games/rescue-robot/web/` (já incluído no repositório). Para regenerar depois de editar o fonte:

```bash
npm run build:game   # copia js-port -> public/games/rescue-robot/web/ (offline, sem dependências)
```

A tentativa com pygbag (Python → WebAssembly) continua em `web-port/` e `npm run build:game:pygbag`; foi abandonada como caminho principal porque exige baixar o runtime de `pygame-web.github.io` e não pôde ser testada.

A disponibilidade é decidida pelos arquivos existentes no build (`lib/catalog.ts`): se `public/games/<slug>/web/index.html` existir, o jogo é "Jogue agora". Sem ele, vira "Somente download".

Código original preservado em `game-sources/rescue-robot/original/`. A adaptação (`web-port/`) muda só o necessário: laço principal assíncrono (`asyncio.sleep(0)`), `.ogg` no navegador e recorde em `localStorage`.

## Estrutura

```
app/(site)/          Home, /games, /games/[slug], /categorias, /novidades, /favoritos, /preferencias, 404
app/(play)/play/[slug]/   Ambiente exclusivo de gameplay
components/          layout, navigation, games, player, ui
data/games.ts        Catálogo tipado (fonte única dos jogos)
data/categories.ts   Categorias
lib/                 catalog (server), store (localStorage), search, format, toast
types/game.ts        Tipos do catálogo
public/games/<slug>/ Imagens, download e build web de cada jogo
game-sources/        Código-fonte original e adaptação web dos jogos
scripts/             build-rescue-robot-web.sh
```

## Adicionar o segundo jogo

1. Coloque os arquivos em `public/games/<slug>/` (capa, capturas e, se houver, `web/index.html` e um `.zip` em `download/`).
2. Acrescente um objeto em `data/games.ts` seguindo o tipo `Game` (`types/game.ts`). Campos opcionais (`trailerUrl`, `playableUrl`, `downloadUrl`, `repositoryUrl`) só devem existir se forem reais.
3. `npm run build`. Páginas de detalhe e de jogo (`/games/<slug>`, `/play/<slug>`), busca, filtros, sitemap e as prateleiras da Home passam a incluir o jogo, sem tocar em componentes.

Nenhum segundo jogo foi inventado: o catálogo tem exatamente um título.

## Deploy

Site estático/SSG; qualquer host de Next.js serve (Vercel, Netlify, Cloudflare Pages, Node com `npm start`).

- Defina `NEXT_PUBLIC_SITE_URL` (ex.: `https://seu-dominio.com`) para metadados, sitemap e robots corretos.
- O jogo web já está em `public/games/rescue-robot/web/` e é 100% estático (sem CDN, sem servidor próprio).

## Licenças e créditos

- Gráficos, sons e músicas do ORION foram criados pelo grupo autor (créditos na página do jogo). O repositório original não possui arquivo `LICENSE`: recomenda-se adicionar um antes de redistribuir.
- Pygame-ce (LGPL) e a fonte padrão do pygame (GNU FreeFont, GPL com exceção para fontes) conforme o README do jogo.
- `learning-zone/website-templates` foi analisado só como referência de estrutura. O repositório não tem licença própria na raiz e cada template traz a sua; **nenhum template, imagem ou código dele foi copiado**.
- Fontes: Rajdhani (OFL), Inter (OFL) e JetBrains Mono (OFL), via `@fontsource`, auto-hospedadas.

## GTA VI "Em breve"

`data/games.ts` tem um cartão `gta-vi` com `status: "coming-soon"`: sem botão de jogar, sem download, sem rota `/play`, capa tipográfica própria (sem arte nem logo da Rockstar). É um título de terceiros e o cartão diz isso. Em 23/11/2026, segundo a imprensa, o jogo já saiu em PS5 e Xbox Series X|S e não tinha versão nem data para PC; ele não roda no Game Hub.

## NEBLINA — Os Três Arcanos

Segundo jogo do catálogo, vindo de https://github.com/deogos/taro-dos-gatos (título dentro do jogo: "Tarô dos Gatos"). É um jogo web nativo (HTML + módulos JS + Canvas), copiado sem alterações para `public/games/neblina/web/`; o original fica em `game-sources/neblina/original/`. Controles de toque já vêm no próprio jogo.

- A capa é uma arte conceitual fornecida por você (não é captura de tela); a galeria usa uma captura real da fase 1.
- O repositório de origem **não tem arquivo de licença**: confirme com o autor (deogos) a permissão para publicá-lo antes de colocar o portal no ar.

## RIO REDLINE — Velocidade sem limites

Corrida arcade pseudo-3D (original "Nitro Carioca", Python/pygame, repositório
<https://github.com/Kaique-Martins/jogo-a3>). Jogável no navegador.

- Porte para JavaScript + Canvas 2D + WebAudio em `game-sources/rio-redline/web/` (`npm run build:game` publica em `public/games/rio-redline/web/`).
- Código original intacto em `game-sources/rio-redline/original/` (sem `save.json`, que é o progresso pessoal do autor).
- Diferenças do porte: sem "Sair"/"Tela cheia" no menu; progresso em `localStorage`; trânsito inicial e decoração usam outro gerador aleatório (layout não é idêntico); em toque a aceleração é automática; sem som de motor (o repositório não traz `assets/sons/motor.*`).
- Fontes Press Start 2P e VT323 (licença OFL, em `web/fonts/`).
- **Licença:** o repositório de origem não tem arquivo LICENSE. Peça autorização ao Kaique antes de publicar o Hub publicamente.
