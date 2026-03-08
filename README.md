# Credix V2

Base nova do projeto com um padrao unico:

- `apps/api` cuida de autenticacao, regras de negocio e API.
- `apps/web` cuida de interface, layout, componentes e experiencia visual.
- o backend nao renderiza HTML.

## Estrutura

```text
credix-v2/
  apps/
    api/
    web/
  docs/
```

## Principios

1. Toda interface fica no `web`.
2. Toda regra de negocio fica no `api`.
3. Nada de EJS ou tela renderizada pelo backend.
4. Cada modulo migrado sai do legado por completo.
5. Padrao antes de velocidade: nome, pasta, fluxo e responsabilidade consistentes.

## Scripts

Na raiz:

```bash
npm install
npm run build
npm run typecheck
npm run dev:api
npm run dev:web
```

## Proximo passo

O plano detalhado de migracao esta em [docs/refactor-plan.md](./docs/refactor-plan.md).
