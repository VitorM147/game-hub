# Segurança

## Como relatar uma vulnerabilidade

Use **GitHub › Security › Report a vulnerability** neste repositório (relato privado). Não abra issue pública com detalhes de falhas. Responderemos assim que possível; este é um projeto acadêmico, sem SLA.

## Modelo de ameaças (resumo)

Site 100% estático, sem contas, banco de dados, cookies nem APIs próprias. Superfícies relevantes:

| Superfície | Controle |
| --- | --- |
| Jogos em iframe (mesmo domínio) | `sandbox="allow-scripts allow-same-origin allow-pointer-lock"`: sem navegar a página pai, sem popups, formulários ou diálogos |
| Scripts/estilos/imagens de terceiros | Nenhum. CSP em `<meta>` (`config/csp.ts`) limita tudo a `'self'` e bloqueia `object-src`, `base-uri` e `form-action` externos |
| Dados do usuário (localStorage) | Tratado como não confiável: `lib/state.ts` valida formato, slugs, limites e duplicados; chave antiga é migrada sem apagar |
| JSON-LD | Serializado com `<` escapado |
| Dependências | `npm audit` no CI, Dependabot semanal, `npm ci` com lockfile |
| Segredos | Nenhum. Só variáveis `NEXT_PUBLIC_*` públicas (URL e base path) |

## Limitações conhecidas

- GitHub Pages **não permite cabeçalhos HTTP próprios**. Por isso `frame-ancestors`/`X-Frame-Options`, HSTS customizado e `Permissions-Policy` não podem ser aplicados lá (CSP via `<meta>` não suporta `frame-ancestors`). Em outro host (Netlify, Vercel, Cloudflare Pages, servidor Node) os cabeçalhos de `next.config.ts` entram automaticamente no modo servidor.
- A CSP precisa de `'unsafe-inline'` para scripts (hidratação do Next e jogos). Sem nonces no modo estático.
- Os jogos têm CSP própria? Não: os arquivos `index.html` dos jogos de terceiros não foram alterados.
- `allow-same-origin` + `allow-scripts` no sandbox dá aos jogos acesso ao localStorage do site (necessário para recordes). Só publique jogos em que você confia.

## Verificações executadas

Ver `docs/RELATORIO.md`, seção de qualidade e segurança.
