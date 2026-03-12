# Parity Spec (Finance Transactions)

## Tela escolhida

- Tela: `contas-a-pagar / contas-a-receber`
- Rotas legado:
  - `/admin/contas-a-pagar.html`
  - `/admin/contas-a-receber.html`
- Rotas novas de migracao:
  - `/migration/contas-a-pagar`
  - `/migration/contas-a-receber`
- Arquivo legado:
  - `backend/src/views/contas-a-pagar.ejs` (modo `expense` e `income`)

## Escopo de preservacao

- Preservar modo duplo da tela (pagar e receber) sem trocar contratos.
- Preservar barra de busca, seletor de mes (-1/mes atual/+1), chips de status e resumo superior.
- Preservar tabela com colunas:
  - `Conta`
  - `Valor (R$)`
  - `Vencimento`
  - `Status`
  - `Observacoes`
  - `Acoes`
- Preservar modal de criar/editar com campos e labels atuais.
- Preservar acoes por linha:
  - concluir (`Baixar`/`Receber`)
  - editar
  - excluir
- Preservar paginacao e texto `Mostrando X-Y de N contas`.
- Preservar regras de filtro por status (`all`, `pending`, `paid`, `overdue`, `due-today`).
- Preservar regras de observacao por status (paga/recebida, vencida, vence hoje, agendada, pendente).
- Preservar exclusao das categorias internas do sistema:
  - `Ajuste de caixa`
  - `Desembolso de emprestimo` (pagar)
  - `Recebimento de parcela` (receber)

## APIs reais

- `GET /api/finance/transactions`
- `POST /api/finance/transactions`
- `PATCH /api/finance/transactions/:id`
- `DELETE /api/finance/transactions/:id`

## Validacoes e mensagens preservadas

- `Preencha descricao e categoria.`
- `Informe um valor maior que zero.`
- `Informe uma data de vencimento valida.`
- `Situacao invalida.`
- Mensagens de sucesso/erro por modo para salvar, concluir e excluir.

## Fora de escopo

- Nao substituir rotas legadas.
- Nao alterar contrato de autenticacao (cookie httpOnly).
- Nao redesenhar fluxo funcional do legado.
