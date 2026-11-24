# Publicar no GitHub Pages

Endereço final: `https://<usuario>.github.io/<repositorio>/` (hoje: `https://vitorm147.github.io/game-hub/`).

## Uma vez só (no GitHub)

1. Repositório › **Settings › Pages › Build and deployment › Source: GitHub Actions**.
2. Faça o merge da branch `feature/joystation-rebranding` no `main` (ou rode o workflow manualmente em *Actions › Publicar no GitHub Pages › Run workflow*, escolhendo `main`).
3. O workflow `.github/workflows/pages.yml` roda `npm ci`, `build:game`, lint, typecheck, testes e o build estático, e publica a pasta `out/`.

Se a primeira execução falhar com "Pages not enabled", o passo 1 não foi feito.

## Localmente

```bash
STATIC_EXPORT=1 NEXT_PUBLIC_BASE_PATH=/game-hub NEXT_PUBLIC_SITE_URL=https://vitorm147.github.io/game-hub npm run build
# resultado em out/
```

`NEXT_PUBLIC_BASE_PATH` precisa ser `/<nome-do-repositorio>`. O workflow já usa o nome real do repositório; se renomear o repo para `joystation`, o endereço passa a ser `.../joystation/` sem alterar código.

## Domínio próprio ou `usuario.github.io` (repositório raiz)

Deixe `NEXT_PUBLIC_BASE_PATH` vazio e ajuste `NEXT_PUBLIC_SITE_URL` no workflow.

## Limitações do GitHub Pages

- **Sem cabeçalhos HTTP próprios**: os cabeçalhos de segurança de `next.config.ts` só valem no modo servidor (`npm start`). Pages já serve HTTPS e `nosniff`.
- Rotas inexistentes mostram a página 404 da JoyStation.
- O site é 100% estático; favoritos e histórico ficam no navegador de cada pessoa.
- Pages grátis exige repositório **público** (ou plano pago para privado). Tornar o repositório público expõe também o código e as imagens dos jogos de terceiros: confirme as licenças antes (ver RELATORIO.md).
