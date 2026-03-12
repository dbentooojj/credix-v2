# Parity Spec (Finance Reports Placeholder)

## Tela escolhida

- Tela: `finance-reports` (placeholder administrativo)
- Rota legado: `/admin/finance-reports.html`
- Rota nova de migracao: `/migration/finance-reports`
- Arquivo legado: `backend/src/views/blank-admin-page.ejs`

## Objetivo de paridade

- Preservar comportamento de pagina administrativa protegida.
- Preservar titulo `Relatorios`.
- Preservar bloco visual vazio (canvas placeholder).
- Nao substituir rota legado nesta etapa.

## Estrutura visual a preservar

- Header + sidebar de area logada.
- Container central com card escuro.
- Titulo da pagina.
- Area vazia com borda tracejada para representar conteudo futuro.

## API / sessao

- Nao possui chamadas de dados especificas da pagina.
- Deve respeitar autenticacao da area logada (`/auth/me`).

## Fora de escopo

- Nao criar filtros, tabelas ou graficos novos.
- Nao alterar fluxo do legado.
- Nao alterar contratos backend.
