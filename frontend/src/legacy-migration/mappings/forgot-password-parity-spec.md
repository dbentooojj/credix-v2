# Etapa 3 - Parity Spec (Forgot Password)

## Tela escolhida

- Tela: `forgot-password`
- Rota atual (legado): `/forgot-password` e `/forgot-password.html`
- Rota nova de migracao (sem substituicao): `/migration/forgot-password`
- Arquivo legado: `backend/src/views/forgot-password.ejs`

## Justificativa da escolha

- Baixo risco operacional: tela isolada e sem efeito financeiro.
- Dependencias pequenas: apenas `/auth/me` e `/auth/forgot-password`.
- Sem tabela, sem filtros complexos, sem fluxo multi-entidade.
- Excelente para validar padrao de migracao incremental com API real.

## Contexto de roteamento atual

- `GET /forgot-password`:
  - Se usuario autenticado: redireciona para `/admin/visao-geral.html`.
  - Se nao autenticado: renderiza a view de recuperacao.
- Referencia: `backend/src/routes/page.routes.ts`.

## Estrutura visual que precisa ser preservada

- Pagina centrada vertical/horizontal (`auth-page`).
- Fundo escuro com gradientes.
- Bloco de marca no topo (`partials/brand-wordmark`).
- Titulo e subtitulo centrais:
  - `Recuperar senha`
  - `Informe seu e-mail para receber o link de redefinicao.`
- Formulario com:
  - 1 campo de e-mail com icone de envelope.
  - area de mensagem (`#forgotPasswordMessage`), inicialmente oculta.
  - botao principal `Enviar link` com icone.
- Link secundario `Voltar para o login`.
- Rodape textual `© 2026 Credix`.

## Acoes do usuario

1. Digitar e-mail.
2. Submeter formulario.
3. Clicar em `Voltar para o login`.

## Chamadas de API existentes

### 1) Verificacao de sessao (on load)

- Endpoint: `GET /auth/me`
- Opcao obrigatoria: `credentials: "include"`
- Comportamento:
  - `response.ok === true` -> redireciona para `/admin/visao-geral.html`.
  - erro de rede -> ignora silenciosamente.

### 2) Solicitar recuperacao de senha (on submit)

- Endpoint: `POST /auth/forgot-password`
- Headers: `Content-Type: application/json`
- Opcao obrigatoria: `credentials: "include"`
- Payload:
  ```json
  { "email": "<email-normalizado>" }
  ```
- Normalizacao no frontend legado:
  - `trim()`
  - `toLowerCase()`

## Contrato relevante de backend

- Validador: `forgotPasswordSchema` em `backend/src/schemas/auth.schemas.ts`
  - `email: z.string().trim().email()`
- Handler: `POST /auth/forgot-password` em `backend/src/routes/auth.routes.ts`
  - Sempre responde com mensagem neutra para evitar user enumeration.
  - Mensagem padrao:
    - `Se o e-mail informado estiver cadastrado, enviaremos instrucoes para redefinir sua senha.`
  - Mesmo sem SMTP configurado, retorna sucesso neutro.

## Estados e regras condicionais (paridade funcional)

- Estado inicial:
  - input habilitado
  - botao habilitado com label `Enviar link`
  - mensagem oculta
- Estado de envio:
  - botao desabilitado
  - label do botao muda para `Enviando...` com spinner
- Sucesso:
  - mostrar mensagem com estilo de sucesso (`auth-message is-success`)
  - texto vem de `payload.message` quando existir
  - fallback:
    - `Se o e-mail estiver cadastrado, enviaremos instrucoes.`
- Falha (erro de rede/excecao):
  - mostrar mensagem com estilo de erro (`auth-message is-error`)
  - texto fixo:
    - `Nao foi possivel solicitar a recuperacao agora. Tente novamente.`
- Finalizacao:
  - restaurar estado do botao e label original em qualquer resultado.

## Validacoes

- HTML:
  - `type="email"`
  - `required`
- Pre-envio:
  - normalizacao de string (`trim + lower`).
- Nao existe validacao custom extra no frontend legado alem disso.

## Textos e mensagens que devem permanecer iguais

- `Recuperar senha`
- `Informe seu e-mail para receber o link de redefinicao.`
- `Enviar link`
- `Enviando...`
- `Voltar para o login`
- `Se o e-mail estiver cadastrado, enviaremos instrucoes.`
- `Nao foi possivel solicitar a recuperacao agora. Tente novamente.`

## Checklist de preservacao para Etapa 4

- [ ] Manter uma unica entrada de e-mail.
- [ ] Manter o redirecionamento por sessao ativa para `/admin/visao-geral.html`.
- [ ] Manter a chamada real para `/auth/forgot-password`.
- [ ] Manter `credentials: "include"` em todas as chamadas.
- [ ] Manter fluxo de loading do botao.
- [ ] Manter fallback de mensagem de sucesso.
- [ ] Manter mensagem de erro generica em falha de rede.
- [ ] Nao alterar textos, ordem visual e acoes.
- [ ] Nao substituir rota legada nesta etapa.

## Fora de escopo nesta tela

- Nao migrar `reset-password` junto.
- Nao alterar backend ou schema.
- Nao introduzir autentificacao client-side nova.
- Nao fazer redesign nem melhorias de UX.
- Nao substituir a rota legada nesta etapa.
