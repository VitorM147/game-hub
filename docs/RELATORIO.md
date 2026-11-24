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
