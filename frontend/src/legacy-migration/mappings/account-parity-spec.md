# Parity Spec (Account)

## Tela escolhida

- Tela: `account`
- Rota legado: `/admin/account.html`
- Rota nova de migracao: `/migration/account`
- Arquivo legado: `backend/src/views/account.ejs`

## Escopo de preservacao

- Manter tabs:
  - `Meu perfil`
  - `Seguranca`
  - `Ajuda`
- Manter query param `tab` na URL.
- Manter fluxo de update de perfil (`/auth/profile`).
- Manter fluxo de update de senha (`/auth/password`).
- Manter painel de forca da senha e regras de validacao.
- Manter bloco de ajuda com e-mail e WhatsApp.
- Nao substituir rota legado nesta etapa.

## APIs reais

- `GET /auth/me` para carregar sessao/dados.
- `PATCH /auth/profile` com `{ name, email }`.
- `PATCH /auth/password` com `{ currentPassword, newPassword }`.

## Mensagens de fluxo preservadas

- `Preencha nome e e-mail.`
- `Perfil atualizado com sucesso.`
- `A confirmacao da nova senha nao confere.`
- `A nova senha deve ser diferente da atual.`
- `Senha fraca. Use: ...`
- `Senha alterada com sucesso.`

## Fora de escopo

- Nao alterar contratos backend.
- Nao redirecionar globalmente para rota nova.
- Nao fazer redesign de produto.
