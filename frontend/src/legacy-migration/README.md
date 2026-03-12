# Legacy Migration Base

Esta pasta e exclusiva para a migracao incremental das telas legadas de EJS para Next.js + React + TypeScript.

## Objetivo

- Migrar uma tela por vez com paridade visual e funcional.
- Preservar contratos de API existentes (`/api/*`, `/auth/*`).
- Nao substituir rotas legadas nesta fase inicial.

## Escopo da Etapa 1

- Tema escuro/roxo baseado na paleta acordada.
- Fonte Inter herdada do layout global.
- Base tecnica com `shadcn/ui` (utilitario `cn` + componentes base).
- Estrutura separada para evoluir sem impactar o legado.
