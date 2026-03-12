# Etapa 7 - Parity Spec (Reset Password)

## Tela escolhida

- Tela: `reset-password`
- Rota atual (legado): `/reset-password` e `/reset-password.html`
- Rota nova de migracao (sem substituicao): `/migration/reset-password`
- Arquivo legado: `backend/src/views/reset-password.ejs`

## Justificativa da escolha

- Baixo risco operacional: fluxo isolado de autenticacao.
- Dependencia principal em um unico endpoint (`/auth/reset-password`).
- Sem tabela, sem filtros, sem dados financeiros.
- Permite validar padrao de telas de auth com token em query string.

## Contexto de roteamento atual

- `GET /reset-password`:
  - Se usuario autenticado: redireciona para `/admin/visao-geral.html`.
  - Se nao autenticado: renderiza view de redefinicao.
- Referencia: `backend/src/routes/page.routes.ts`.

## Estrutura visual que precisa ser preservada

- Pagina centralizada com fundo escuro em gradiente.
- Marca no topo (`partials/brand-wordmark`).
- Titulo/subtitulo:
  - `Redefinir senha`
  - `Digite sua nova senha para concluir a recuperacao.`
- Formulario com:
  - Campo `Nova senha` (password).
  - Campo `Confirmar nova senha` (password).
  - Texto de regras de senha.
  - Area de mensagem (`#resetPasswordMessage`) inicialmente oculta.
  - Botao `Salvar nova senha`.
- Link secundario `Voltar para o login`.
- Rodape textual `© 2026 Credix`.

## Acoes do usuario

1. Abrir pagina com token em query string (`?token=...`).
2. Preencher nova senha.
3. Confirmar nova senha.
4. Submeter formulario.
5. Clicar em `Voltar para o login`.

## Chamadas de API existentes

### 1) Redefinicao de senha (on submit)

- Endpoint: `POST /auth/reset-password`
- Headers: `Content-Type: application/json`
- Opcao obrigatoria: `credentials: "include"`
- Payload legado:
  ```json
  {
    "token": "<token-da-query>",
    "newPassword": "<senha>",
    "confirmPassword": "<confirmacao>"
  }
  ```

## Contrato relevante de backend

- Schema: `resetPasswordSchema` em `backend/src/schemas/auth.schemas.ts`
  - `token`: string trim, min 16, max 4096.
  - `newPassword`: minimo 8, maximo 72, exige maiuscula, minuscula, numero, simbolo e sem espacos.
  - `confirmPassword`: obrigatorio.
  - `superRefine`: `newPassword` e `confirmPassword` devem ser iguais.
- Handler: `POST /auth/reset-password` em `backend/src/routes/auth.routes.ts`
  - Token invalido/expirado: `400` com `Link de recuperacao invalido ou expirado`.
  - Nova senha igual a atual: `400` com `A nova senha deve ser diferente da atual`.
  - Sucesso: `200` com `Senha redefinida com sucesso. Faca login novamente.`

## Estados e regras condicionais (paridade funcional)

- Estado inicial:
  - Inputs habilitados.
  - Botao habilitado com `Salvar nova senha`.
  - Mensagem oculta.
- Token ausente na query string:
  - Exibe erro: `Link de recuperacao invalido. Solicite um novo e-mail.`
  - Desabilita botao de submit.
- Validacao client-side antes da API:
  - Se senhas divergentes:
    - Exibe erro: `A confirmacao da nova senha nao confere.`
    - Nao chama API.
- Estado de envio:
  - Botao desabilitado.
  - Label muda para `Salvando...` com spinner.
- Sucesso:
  - Exibe mensagem de sucesso (`auth-message is-success`).
  - Usa `payload.message` quando existir.
  - Fallback: `Senha redefinida com sucesso.`
  - Redireciona para `/login?reason=reset-success` apos 1200ms.
- Falha:
  - Exibe mensagem de erro (`auth-message is-error`).
  - Usa `error.message` da falha da API.
  - Fallback: `Falha ao redefinir senha.`
- Finalizacao:
  - Reabilita botao.
  - Restaura label original.

## Validacoes

- HTML:
  - `type="password"` + `required` nos 2 campos.
- Client-side:
  - comparacao direta `newPassword !== confirmPassword`.
- Backend:
  - regras de senha forte + token + confirmacao obrigatoria.

## Textos e mensagens que devem permanecer iguais

- `Redefinir senha`
- `Digite sua nova senha para concluir a recuperacao.`
- `Regras: minimo de 8 caracteres, com maiuscula, minuscula, numero e simbolo.`
- `Salvar nova senha`
- `Salvando...`
- `Link de recuperacao invalido. Solicite um novo e-mail.`
- `A confirmacao da nova senha nao confere.`
- `Senha redefinida com sucesso.`
- `Falha ao redefinir senha.`
- `Voltar para o login`

## Checklist de preservacao para implementacao

- [ ] Manter rota legada ativa sem substituicao.
- [ ] Manter rota nova isolada em `/migration/reset-password`.
- [ ] Ler `token` da query string.
- [ ] Bloquear submit e exibir erro quando nao houver token.
- [ ] Manter validacao local de confirmacao antes da API.
- [ ] Enviar payload com `token`, `newPassword` e `confirmPassword`.
- [ ] Manter `credentials: "include"`.
- [ ] Manter estado de loading e textos do botao.
- [ ] Manter redirect de sucesso para `/login?reason=reset-success` apos 1200ms.
- [ ] Nao alterar textos, ordem visual e comportamento.

## Atencao tecnica para a proxima etapa

- O helper atual `resetPassword` em `frontend/src/legacy-migration/services/auth-service.ts` envia apenas `token` e `newPassword`.
- Para paridade com o legado e com o schema atual do backend, a tela migrada precisa enviar tambem `confirmPassword`.

## Fora de escopo nesta etapa

- Nao migrar fluxo de login junto.
- Nao alterar schema/handler de backend.
- Nao substituir rota legada.
- Nao fazer redesign ou melhorias de UX.
