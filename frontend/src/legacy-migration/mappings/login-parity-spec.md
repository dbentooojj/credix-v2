# Parity Spec (Login)

## Tela escolhida

- Tela: `login` (view legado `index.ejs`)
- Rota legado: `/login`, `/`, `/index.html`
- Rota nova de migracao: `/migration/login`
- Arquivo legado: `backend/src/views/index.ejs`

## Preservacoes obrigatorias

- Nao substituir rota legado nesta etapa.
- Manter visual de auth escuro e denso.
- Manter acoes e textos:
  - `Email`
  - `Senha`
  - `Lembrar-me`
  - `Esqueceu?`
  - `Entrar`
- Manter mensagens por `reason`:
  - `timeout` -> `Sua sessao expirou por inatividade. Faca login novamente.`
  - `reset-success` -> `Senha redefinida com sucesso. Entre com sua nova senha.`
- Manter fluxo de sucesso:
  - salvar dados em localStorage
  - mostrar `Login realizado com sucesso. Redirecionando...`
  - redirecionar para `/admin/visao-geral.html` apos ~600ms

## Chamadas de API reais

1. `GET /auth/me` (on load)
   - se autenticado, redireciona para `/admin/visao-geral.html`
2. `POST /auth/login`
   - payload: `{ email, password }`
   - `credentials: "include"`
   - erro: usa mensagem do backend

## Contratos backend relevantes

- `POST /auth/login` valida com `loginSchema` (`email` valido, `password` min 1).
- Retornos esperados:
  - `200` sucesso com `user` e cookie JWT.
  - `401` credenciais invalidas.
  - `400` erro de validacao.

## Estados de UI

- Toggle de visibilidade de senha (`Mostrar senha` / `Ocultar senha`).
- Mensagens de status: warning/success/error.
- Botao `Entrar` preservado.

