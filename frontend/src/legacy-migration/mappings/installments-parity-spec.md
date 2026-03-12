# Etapa 3 - Parity Spec (Installments)

## Tela escolhida

- Tela: `installments`
- Rota legado: `/admin/installments.html`
- Rota de migracao (sem substituir legado): `/migration/installments`
- Fonte legado: `backend/src/views/installments.ejs`

## Justificativa da escolha

- Menor risco tecnico entre as 3 pendentes (`loans`, `installments`, `reports`).
- Fluxo principal bem delimitado: listagem + detalhes + pagamento/estorno/exclusao.
- Ja usa APIs claras de tabela e pagamentos.
- Permite validar padrao de paridade em tela operacional com tabela.

## Estrutura visual que precisa ser preservada

- Header da pagina com titulo `Controle de cobranca`.
- 4 cards KPI:
  - `Pagas no mes`
  - `Pendentes`
  - `Em atraso`
  - `A vencer`
- Bloco de filtros com:
  - busca
  - status
  - cliente
  - periodo
  - forma de pagamento
  - periodo personalizado (inicio/fim) quando `periodo=custom`
  - botao `Limpar filtros`
- Bloco principal `Parcelas da cobranca` com:
  - contador de resultados
  - lista mobile (`installmentsMobileList`)
  - tabela desktop (`installmentsTableBody`) com colunas:
    - Cliente
    - Emprestimo
    - Parcela
    - Vencimento
    - Valor
    - Status
    - Acoes
  - estado vazio (`installmentsEmptyState`)
  - paginacao (anterior/proxima + contador)
- Modal de notificacoes em lote (`notificationModal`).
- Modal de parcela (`installmentModal`) com modos:
  - details
  - payment
  - refund
  - confirmDelete

## Acoes do usuario

1. Buscar por nome/telefone/emprestimo/parcela.
2. Filtrar por status, cliente, periodo e forma de pagamento.
3. Filtrar por KPI clicavel (`paid_month`, `pending_total`, `overdue_total`).
4. Abrir detalhes da parcela pela tabela/lista.
5. Registrar pagamento.
6. Estornar pagamento.
7. Excluir parcela.
8. Enviar notificacoes em lote via WhatsApp a partir dos filtros atuais.
9. Navegar na paginacao.
10. Limpar filtros.

## Chamadas de API mapeadas

### Carga de dados

- `GET /api/tables/installments` (com `credentials: include`)
- `GET /api/tables/debtors` (com `credentials: include`)
- `GET /api/tables/loans` (com `credentials: include`)

### Operacoes financeiras da parcela

- `POST /api/payments`
  - Payload:
    - `loanId`
    - `installmentId`
    - `amount`
    - `paymentDate` (YYYY-MM-DD)
    - `method` (`PIX|DINHEIRO|TRANSFERENCIA|CARTAO`)
    - `notes` opcional
- `POST /api/payments/installments/:installmentId/revert`
- `DELETE /api/payments/installments/:installmentId`

### Notificacao em lote

- `POST /api/notifications/whatsapp/batch`
  - Payload: `{ recipients: [{ phone, message, installmentIds, debtorId? }] }`

### Sessao/conta

- `POST /auth/logout`

## Estados e regras condicionais preservadas

- `installmentsState`:
  - `installments`, `debtors`, `loans`
  - `filtered`
  - `currentPage`, `pageSize`
  - `isLoading`
  - `kpiFilter`
- `installmentModalState`:
  - `isOpen`, `mode`, `selectedInstallmentId`, `isSubmitting`
  - `form.paymentDate`, `form.paymentMethod`, `form.paymentNotes`, `form.refundReason`
- Status efetivo da parcela:
  - `Pago` quando status pago
  - `Atrasado` quando status atrasado ou vencida sem pagamento
  - `Pendente` caso contrario
- Exclusao:
  - bloqueada para parcela paga (exigir estorno)
  - bloqueada quando emprestimo possui apenas 1 parcela
- Estorno:
  - permitido apenas quando parcela esta `Pago`

## Parametros de query preservados

- `?status=pending|paid|overdue` mapeado para filtro de status.
- `?due=today|next7|month` mapeado para filtro de periodo.

## Validacoes preservadas

- Pagamento:
  - exigir `paymentDate` e `paymentMethod`
  - validar `loanId` e `installmentId` numericos > 0
- Estorno:
  - bloquear se parcela nao for paga
  - `installmentId` valido > 0
- Exclusao:
  - bloquear se parcela paga
  - bloquear se for parcela unica do emprestimo
  - `installmentId` valido > 0
- Notificacao em lote:
  - mensagem obrigatoria
  - ao menos 1 alvo elegivel
  - ao menos 1 cliente com telefone valido

## Mensagens de erro/sucesso que precisam ser preservadas

- `Pagamento registrado com sucesso.`
- `Pagamento estornado com sucesso!`
- `Parcela excluida com sucesso!`
- `Somente parcelas pagas podem ser estornadas.`
- `Parcela paga deve ser estornada antes da exclusao.`
- `Este emprestimo possui apenas uma parcela. Exclua o emprestimo inteiro.`
- `Parcela nao encontrada.`
- `Erro de conexao ao registrar pagamento.`
- `Erro de conexao ao estornar pagamento.`
- `Erro de conexao ao excluir parcela.`
- `Preencha os campos obrigatorios do pagamento.`
- `Notificacoes enviadas: ...`
- `Nenhuma parcela se encaixa no filtro de notificacao.`
- `Nenhum cliente com telefone valido para notificacao.`

## Checklist de preservacao para Etapa 4/5

- [ ] Manter todos os filtros e comportamento de combinacao.
- [ ] Manter tabela desktop + cards mobile.
- [ ] Manter modal de detalhes com 4 modos.
- [ ] Manter APIs reais e mesmos payloads.
- [ ] Manter regras de bloqueio para estorno/exclusao.
- [ ] Manter query params de pre-filtro.
- [ ] Nao substituir rota legada.

## Fora de escopo nesta etapa

- Nao alterar contratos do backend.
- Nao reescrever regras financeiras.
- Nao simplificar colunas, filtros ou modais.
- Nao migrar `loans` e `reports` junto.

