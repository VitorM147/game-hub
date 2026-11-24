# Relatório de entrega — JoyStation (antes Game Hub)

## 1. Análise dos repositórios

**learning-zone/website-templates** — 174 pastas de templates HTML/Bootstrap (corporativo, restaurante, portfólio, coming soon, landing de app). Nenhum é de games. Sem LICENSE na raiz; alguns templates trazem licença própria. Aproveitado apenas o padrão estrutural (cabeçalho fixo, hero grande, grade de cards, rodapé em colunas). Nada copiado; a identidade visual foi desenvolvida do zero.

**VitorM147/rescue-robot** — 1 commit (28/10/2026), ~1.100 linhas de Python em `src/` (jogo, partida, desenho, áudio, efeitos, recorde), 9 arquivos WAV, 6 capturas PNG. Todos os gráficos são desenhados por código (retângulos do pygame); não há sprites. Dependência única: pygame-ce ≥ 2.5. Sem arquivo de licença.

**Viabilidade web:**
- pygbag (Python → WebAssembly): empacota, mas o runtime vem de `pygame-web.github.io`, bloqueado no meu ambiente; não consegui gerar nem abrir o jogo. Mantido em `web-port/` como alternativa.
- **Solução adotada: port JavaScript/Canvas** (`game-sources/rescue-robot/js-port/`). Reescrita fiel de `config/partida/efeitos/desenho/jogo/audio/recorde.py`: mesmas regras, fases, perigos, números e telas; sons WAV originais; recorde em `localStorage`. Estático, sem CDN, testável aqui.
- Diferenças em relação ao original: o "ESC - sair do jogo" não existe no navegador; fonte do texto é a do sistema (a do pygame não está disponível); jogo pausa sozinho ao perder o foco; controles de toque na tela (alavanca com diagonais + ENTER/PAUSA/REINICIAR/SOM).
- Testado em Chrome headless (26/26): menu, dificuldade, intro, movimento, pausa, bateria, fases 2 e 3, resgate dos 5 robôs, vitória, derrota por dano, recorde persistente após recarregar, e toque em Pixel 7 emulado (retrato e paisagem, toque real via CDP).
- **Não validado:** celular físico (só emulação), áudio audível (headless não toca; o navegador exige um toque antes de liberar o som), iPhone/Safari, desempenho em aparelhos fracos.

## 2. Implementado

Home (header, hero interativo com arte + capturas, trilho de categorias, Continue jogando, Seus favoritos, Todos os jogos, bloco de história e controles) · Explorar (busca em tempo real, filtros de categoria/plataforma/disponibilidade, ordenação A–Z/Z–A/recentes/antigos, estado vazio, URL compartilhável) · Detalhes `/games/[slug]` (banner, galeria com tela cheia e setas, descrição, história, objetivos, controles, créditos, relacionados quando existirem, favoritar) · Player `/play/[slug]` (loading em 3 etapas reais, erro com "Tentar novamente", tela cheia, reiniciar, painel de controles, aviso para toque) · Categorias, Novidades, Favoritos + histórico, Preferências (reduzir animações, grade compacta, painel de controles) · 404 personalizado · menu mobile com foco preso e Esc · busca no header com combobox acessível e atalho `/` · metadados, Open Graph, JSON-LD, sitemap, robots · catálogo tipado extensível.

Escolhas de produto: "Adicionados recentemente" e prateleiras por categoria só aparecem com mais de 3 jogos (senão repetiriam o mesmo card). "Continue jogando" lista jogos abertos recentemente e avisa que o jogo não tem salvamento de partida. Volume: o jogo controla o próprio som (M, − e +); o portal não finge um controle que não alcança. Classificação do ORION em Arcade, Aventura e Indie é decisão editorial minha, editável em `data/games.ts`. Data de lançamento = data do commit público.

## 3. Pendências reais

1. Testar em celular de verdade (Android/iPhone) e conferir o som. No iPhone não há tela cheia pela API do navegador; o jogo ocupa a área do player.
2. Sem trailer: nenhum trailer real existe, então a seção não aparece.
3. Não implementados (e não simulados): login, perfis, conquistas, leaderboards, avaliações, comentários, nuvem, recomendações, ranking semanal, dashboard admin, publicação de jogos.
4. Gameplay em celular/tablet não testado e não anunciado.
5. Adicionar LICENSE ao repositório do jogo.
6. Lighthouse e leitor de tela real não foram rodados.

## 4. Testes executados (Chrome headless via Playwright, build de produção)

Build de produção: OK. `lint`: 0 erros e 0 avisos. `tsc --noEmit`: OK.

**Sem versão web (estado entregue): 33/33 passaram.** Navegação do header (5 rotas); atalho `/`; busca em tempo real; Enter abre detalhes; busca sem resultado; Explorar com busca, estado vazio, limpar filtros, filtros combinados, ordenação e URL; favoritar com toast, contador no header, persistência após reload, lista em Favoritos e na Home; preferência aplicada e persistida; apagar favoritos; mobile 390 px sem rolagem horizontal, menu abre/fecha com Esc e navega; 404 de jogo e 404 global; `/play` com aviso de indisponibilidade; download real do zip.

**Fluxo do player com página-stub (20/20 passaram):** botão "Jogar agora" e selo na Home; filtro "navegador"; loading por etapas; overlay some quando o canvas ativa; proporção 3:2; setas, W, P e Enter chegam ao conteúdo do iframe; tela cheia; painel de controles; reiniciar; voltar ao catálogo; Continue jogando e histórico de 2 sessões; erro com "Tentar novamente" e recuperação; download no erro; aviso de teclado em Pixel 7 e iframe só após confirmar.

Console do navegador: sem erros (exceto os 404 propositais das páginas de teste de rota inexistente).
Bug encontrado e corrigido nos testes: painel de controles cobria o aviso no celular; overflow horizontal na Home em 390 px.


## 5. Atualização: jogar com um clique + GTA VI

- Clicar no card (ou em "Jogar agora") abre `/play/rescue-robot` e o jogo roda ali. Removido "Baixar para PC" do fluxo principal; o zip da versão original fica só como link discreto na página de detalhes.
- Plataforma deixou de ser filtro/selo; onde aparece, diz "PC (Windows/Mac) e celular".
- GTA VI: cartão "Em breve" (terceiros, sem jogar/baixar, aviso claro). Ao pedir "Em breve", registrei o fato: segundo a imprensa já saiu nos consoles e não tem data para PC.
- Teste do portal com o jogo real (12/12): Home, Explorar (2 jogos, filtro "Em breve"), clique no card → jogo no menu → Enter×2 → jogando, `/play/gta-vi` = 404, celular Pixel 7 emulado sem aviso de teclado e com controles de toque.

## 6. Atualização: NEBLINA — Os Três Arcanos

Adicionado como segundo jogo, só editando `data/games.ts` e copiando os arquivos (nenhuma página mudou). Testado: abre pelo card, fase 1 carrega, tecla D move a gata, celular Pixel 7 emulado mostra os botões de toque. Não testei as fases 2 e 3 de ponta a ponta nem em aparelho real. Sem licença no repositório de origem (ver README).

## RIO REDLINE (adicionado em 23/11/2026)

**Feito:** porte fiel de `main.py, pista.py, carro.py, carros.py, atributos.py, itens.py, trafego.py, progresso.py, garagem.py, menu.py, pausa.py, opcoes.py, hud.py, efeitos.py, audio.py` para JS/canvas (pygbag não é testável aqui).

**Verificado (headless Chrome):**
- Constantes de projeção/colisão idênticas às do Python (comparadas valor a valor).
- Física do carro (`Carro.atualiza`) comparada com o Python em 3 carros × 440 passos: diferença relativa máxima 3e-15.
- 21 testes funcionais: garagem (compra, melhoria 230 moedas, limite de 3), persistência após recarregar, atributos aplicados, pausa/opções/blur, itens (kit, buraco, blindagem), colisão, fim de jogo, ultrapassagem.
- Toque em emulação Pixel 7 (retrato e paisagem): 22/22, inclusive multitoque (direita + nitro) via CDP.
- Portal: página do jogo, /play dentro do iframe, sem erros de console.

**Não verificado:** celular físico; som audível (só a geração dos buffers); desempenho em aparelhos fracos; o `tests/test_jogo.py` original não foi executado contra o porte.

**Atenção:** repositório de origem sem LICENSE; capa enviada pelo usuário (arte conceitual, não captura).


## JoyStation — rebranding e evolução (23/11/2026, branch `feature/joystation-rebranding`)

**Feito:** marca original (símbolo + wordmark em SVG, ícone, banner, Open Graph), `config/brand.ts`, troca de todas as ocorrências de "Game Hub" no código, metadados/Open Graph/Twitter/JSON-LD/sitemap/robots; Home com destaques alternáveis; 10 categorias (só as não vazias aparecem); busca por desenvolvedor; mecânicas, compartilhar e página de jogo; `/desenvolvedores`; GTA VI como conteúdo editorial (sem jogar, sem baixar, sem rota `/play`); biblioteca com remoção de item e confirmação; migração `gamehub:v1` → `joystation:v1` (a chave antiga é preservada); cabeçalhos de segurança; 8 testes automatizados (`npm test`).

**Executado de verdade (cópia limpa do repositório):** `npm ci` (0 vulnerabilidades reportadas), `npm run build:game`, `npm run lint`, `npm run typecheck`, `npm test` (8/8), `npm run build` (20 páginas). Playwright/Chrome em 360, 390, 768, 1024, 1280, 1440 e 1920 px: sem rolagem horizontal, sem erros de console e sem o texto "Game Hub" em 7 rotas. Verificados no navegador: migração com dados reais de `gamehub:v1`, busca por "kaique", remover item do histórico, GTA VI sem links de jogar/baixar. Bug achado e corrigido: cabeçalho estourava a largura em 1024 px com o nome maior.

**Não feito / não verificado:** Lighthouse não foi rodado (sem pontuações); leitor de tela real; aparelhos físicos; travar orientação no celular durante o jogo; verificação de marca do nome "JoyStation"; consulta de dependências além do `npm ci`.

**Permissões antes de publicar:** os repositórios de ORION (próprio), NEBLINA (deogos/taro-dos-gatos) e RIO REDLINE (Kaique-Martins/jogo-a3) **não têm LICENSE**; obtenha autorização por escrito dos autores. Nenhuma licença foi adicionada ao código de terceiros. GTA VI é só notícia, sem parceria com a Rockstar.

**Histórico:** o zip antigo continua no histórico do `main` (force-push foi negado). O repositório não foi renomeado e nada foi publicado em produção.


### Atualização (23/11/2026, noite): criadores, Lighthouse e orientação

- **Criadores:** `data/creators.ts` (8 nomes e RAs informados pelo grupo), página `/criadores`, seção na Home e link no rodapé. Para remover ou editar alguém (inclusive o RA, que é dado pessoal), basta mexer nesse arquivo.
- **Orientação no celular:** ao entrar em tela cheia num jogo paisagem, o player tenta travar em paisagem (`screen.orientation.lock`) e destrava ao sair. Verificado em Pixel 7 emulado com a API simulada (chamada com `landscape`); em aparelho real só funciona em Android/Chrome e é ignorado onde não há suporte (iPhone).
- **Lighthouse 13 (build de produção local, Chrome headless):** após as correções, Home mobile 88 desempenho / 100 acessibilidade / 100 boas práticas / 100 SEO; /games mobile 91 / 100 / 100 / 100. Medições antes dessa rodada (mobile): home 81, games 66, jogo 92, criadores 96, desenvolvedores 99; todas em desktop de 90 a 100. Acessibilidade, boas práticas e SEO: 98 a 100 em todas. Correções feitas: salto de layout em /games (0,63 → 0,04), ordem de títulos e nome acessível do botão Favoritar. Valores variam de rodada para rodada; são de ambiente local, não de produção.
- `npm audit`: 0 vulnerabilidades. Testes automatizados: 8/8. Playwright em 7 larguras com a página Criadores: sem overflow nem erros.
- **Continua sem verificação:** celular físico, leitor de tela real, verificação de marca (fora do pedido), licenças dos repositórios de origem, zip no histórico do `main`.


## Auditoria estática (método ESAA-Security) e correções, 24/11/2026

Referência: <https://github.com/elzobrito/ESAA-Security> (auditoria por domínio, achado com evidência de arquivo, relatório reprodutível). Aqui foi aplicado só o **método** de forma manual e estática; o framework em si **não foi executado**, então não há pontuação dele.

| Domínio | Achado (evidência) | Correção | Verificação |
| --- | --- | --- | --- |
| Frontend / iframe | `GamePlayer.tsx`: iframe sem `sandbox` | `sandbox="allow-scripts allow-same-origin allow-pointer-lock"` + `referrerPolicy` | e2e: atributo presente, sem `allow-top-navigation/popups/forms`; 3 jogos ainda carregam e o canvas é acessado |
| Headers / CSP | Nenhuma CSP; Pages não aceita cabeçalhos | CSP em `<meta>` (`config/csp.ts`, só em produção) | e2e: meta presente, zero requisições a terceiros, zero erros de console/CSP |
| Entrada de dados | `lib/store.ts`: validação fraca do localStorage | `lib/state.ts`: slugs validados por regex, ttlimites, duplicados, números finitos | 5 testes unitários, e2e com JSON corrompido e `<script>` |
| Dependências | Sem rotina | `npm audit` no CI, Dependabot semanal | `npm audit`: 0 vulnerabilidades |
| Divulgação | Sem política | `SECURITY.md`, `/.well-known/security.txt` | arquivo servido no export estático |
| Maturidade | Sem privacidade/avisos legais | Página `/privacidade` (dados, créditos, marcas, GTA VI) | e2e + export estático em subpasta |
| Testes | 8 testes, sem e2e, sem CI de PR | 20 unitários/integridade (`npm test`), 20 e2e (`npm run test:e2e`, desktop + Pixel 7), CI em PR | todos passando localmente |
| Usabilidade | Sem aviso sem JS | `<noscript>` | revisão manual |

**Limitações que continuam (não dá para corrigir só com código):** GitHub Pages não permite `frame-ancestors`, HSTS próprio nem `Permissions-Policy` (os cabeçalhos de `next.config.ts` só valem no modo servidor); CSP precisa de `'unsafe-inline'`; os `index.html` dos jogos de terceiros não foram alterados (sem CSP própria); jogos sem licença escrita dos autores; **LICENSE do próprio portal não foi adicionada** porque a escolha da licença é decisão do grupo; marca "JoyStation" sem verificação; sem teste em celular físico ou leitor de tela; o relato privado de vulnerabilidades precisa estar habilitado em Settings › Code security.

As "notas" de 0 a 10 mencionadas em conversa são estimativas qualitativas, não certificação nem auditoria independente.
