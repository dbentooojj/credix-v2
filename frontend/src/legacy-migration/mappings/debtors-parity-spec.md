# Parity Spec (Debtors)

## Tela escolhida

- Tela: `clientes`
- Rota legado: `/debtors.html`
- Rota nova de migracao: `/migration/debtors`
- Arquivo legado: `backend/src/views/debtors.ejs`

## Escopo de preservacao

- Preservar cabecalho com titulo/subtitulo e acao `Novo cliente`.
- Preservar cards KPI:
  - `Total de clientes`
  - `Clientes ativos`
  - `Clientes inativos`
  - `Clientes com atraso`
- Preservar filtros:
  - busca (nome/telefone/documento/email)
  - status
  - ordenacao
  - limpar filtros
- Preservar tabela com colunas:
  - `Cliente`
  - `Status`
  - `Situacao`
  - `Indice Credix`
  - `Atrasos`
  - `Total em aberto`
  - `Acoes`
- Preservar expansao de detalhes por cliente.
- Preservar paginação com texto `Mostrando X ate Y de N resultados`.
- Preservar modal de criar/editar cliente.
- Preservar modal de confirmacao de exclusao.

## APIs reais

- `GET /api/tables/debtors`
- `GET /api/tables/loans`
- `GET /api/tables/installments`
- `PUT /api/tables/debtors`
- `PUT /api/tables/loans` (no fluxo de exclusao)
- `PUT /api/tables/installments` (no fluxo de exclusao)

## Validacoes preservadas

- `Informe o nome.`
- `Informe um telefone valido (10 ou 11 digitos).`
- `CPF invalido.`
- `E-mail invalido.`

## Fora de escopo nesta etapa

- Nao substituir rota legado `/debtors.html`.
- Nao alterar contrato de autenticacao por cookie httpOnly.
- Nao alterar contratos/payloads existentes de tabela.
