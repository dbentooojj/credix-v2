# Etapa 8 - Integration Report (Reset Password)

## Escopo

- Tela nova: `/migration/reset-password`
- Tela legada preservada: `/reset-password`
- API real utilizada: `POST /auth/reset-password`

## Implementacao realizada

- Criada rota de migracao:
  - `frontend/app/migration/reset-password/page.tsx`
- Criada tela React com paridade de fluxo:
  - `frontend/src/legacy-migration/screens/reset-password/reset-password-screen.tsx`
- Ajustado servico para payload completo exigido pelo backend:
  - `frontend/src/legacy-migration/services/auth-service.ts`
  - `resetPassword(token, newPassword, confirmPassword)`

## Validacoes executadas

1. **Rota nova acessivel**
   - Request: `GET /migration/reset-password`
   - Resultado: `200`

2. **Rota legada preservada**
   - Request: `GET /reset-password?token=abc123`
   - Resultado: `200`

3. **Paridade estrutural de tela de auth**
   - Request: `GET /migration/reset-password?token=abc123`
   - Resultado: `200`
   - Verificacao de markup:
     - textos principais encontrados (`Redefinir senha`, `Salvar nova senha`, `Voltar para o login`)
     - `Alternar menu lateral` = `0` (sem shell de area logada)

4. **Sessao nao autenticada**
   - Request: `GET /auth/me` sem cookie
   - Resultado: `401` (esperado)

5. **Reset com token invalido**
   - Request: `POST /auth/reset-password` com token invalido (formato valido)
   - Resultado: `400` com `Link de recuperacao invalido ou expirado` (esperado)

6. **Reset sem confirmPassword**
   - Request: `POST /auth/reset-password` sem `confirmPassword`
   - Resultado: `400` com erro de validacao (esperado)

7. **Reset com confirmacao divergente**
   - Request: `POST /auth/reset-password` com `confirmPassword` divergente
   - Resultado: `400` com erro de validacao da confirmacao (esperado)

## Build e Docker

- Build monorepo (`npm run build`) -> **OK**
- Build imagem frontend (`docker compose build frontend`) -> **OK**
- Runtime (`docker compose up -d frontend`) -> **OK**
- Health:
  - `credix_frontend`: healthy
  - `credix_backend`: healthy
  - `credix_db`: healthy

## Observacao tecnica aplicada

- A primeira implementacao usava `useSearchParams` no componente client da rota.
- Em build de producao, isso exigiu ajuste estrutural.
- Solucao aplicada: leitura de `searchParams.token` no `page.tsx` (server) e passagem de `token` por props para o client component.
