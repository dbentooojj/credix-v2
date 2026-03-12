# Etapa 6 - Validation Report (Forgot Password)

## Escopo validado

- Tela migrada: `/migration/forgot-password`
- Tela legada preservada: `/forgot-password`
- Fluxo `/app/*` preservado: `/app/visao-geral`

## Correcoes tecnicas aplicadas nesta etapa

- Removido `frontend/app/app/layout.tsx` para evitar aplicacao indevida/duplicada de shell no roteamento.
- `AppShell` aplicado explicitamente em `frontend/app/app/visao-geral/page.tsx`, mantendo o comportamento esperado de `/app/visao-geral` sem afetar rotas de migracao.

## Paridade visual/estrutural

1. **Tela migrada sem shell de area logada**
   - Request: `GET /migration/forgot-password`
   - Resultado: `200`
   - Verificacao de markup: ocorrencias de `Alternar menu lateral` = `0` (esperado para tela de auth).

2. **Tela de visao geral com shell unico**
   - Request: `GET /app/visao-geral`
   - Resultado: `200`
   - Verificacao de markup: ocorrencias de `Alternar menu lateral` = `1` (sem duplicidade).

3. **Tela legada permanece ativa**
   - Request: `GET /forgot-password`
   - Resultado: `200`

## Paridade funcional/API

1. **Sessao sem autenticacao**
   - Request: `GET /auth/me` sem cookie
   - Resultado: `401` (esperado)

2. **Solicitacao de recuperacao com e-mail valido**
   - Request: `POST /auth/forgot-password` com JSON valido
   - Resultado: `200` com mensagem neutra (esperado)

3. **Solicitacao de recuperacao com e-mail invalido**
   - Request: `POST /auth/forgot-password` com payload JSON valido e e-mail invalido
   - Resultado: `400` com erro de validacao (esperado)

## Build e Docker

- Build monorepo: `npm run build` -> **OK**
- Build imagem frontend: `docker compose build frontend` -> **OK**
- Runtime Docker: `docker compose up -d frontend` -> **OK**
- Health status:
  - `credix_frontend`: healthy
  - `credix_backend`: healthy
  - `credix_db`: healthy

## O que nao foi mexido

- Nao houve troca de rota legada para rota nova.
- Nao houve alteracao em contratos de API (`/auth/*`, `/api/*`).
- Nao houve alteracao de backend para suportar a tela migrada.
- Nao houve redesign ou mudanca de fluxo funcional da tela.
