# Parity Spec (Dashboard)

## Tela escolhida

- Tela: `dashboard` (painel financeiro legado)
- Rota legado: `/admin/dashboard.html`
- Rota planejada de migracao: `/migration/dashboard` (ainda nao criada)
- Arquivo legado: `backend/src/views/dashboard.ejs`

## Estrutura visual e funcional a preservar

- Header e sidebar administrativa com menu de usuario.
- Bloco de filtros:
  - periodo (`periodSelect`)
  - metrica (`metricSelect`)
  - seletor de tipo de grafico (`Linha` / `Barras empilhadas`)
- KPIs principais:
  - saldo em caixa
  - total a receber em aberto
  - recebido no mes
  - lucro no mes
  - resultado acumulado
  - total emprestado
- Bloco de resumo diario (vence hoje, atraso, proximos 7 dias).
- Grafico principal mensal com suporte a:
  - visao `line`
  - visao `stacked`
- Lista de vencimentos em dia (`upcomingList`) com paginacao.
- Lista de pagamentos atrasados (`overdueList`) com paginacao.
- Modais:
  - cobranca (`collectionModal`)
  - confirmacao de pagamento (`paymentConfirmModal`)
  - ajuste de caixa (`cashAdjustModal`)

## Acoes de usuario a preservar

- Trocar periodo e recarregar dashboard.
- Trocar metrica e recarregar dashboard.
- Trocar tipo de grafico sem recarregar API.
- Paginar listas de `upcoming` e `overdue`.
- Marcar parcela como paga.
- Abrir cobranca via WhatsApp (quando houver telefone valido).
- Copiar mensagem de cobranca.
- Registrar ajuste de caixa.
- Logout pelo menu de usuario.

## APIs reais envolvidas

- `GET /api/dashboard` com query:
  - `period`
  - `metric`
  - `tz`
- `POST /api/payments`
- `POST /api/dashboard/cash-adjustments`
- `POST /auth/logout`

## Estados e regras condicionais

- `dashboardState` legado:
  - `period`
  - `metric`
  - `chartView`
  - `upcomingPage`
  - `overduePage`
  - `panelPageSize`
  - `selectedCollection`
  - `selectedPayment`
  - `paymentSubmitting`
  - `cashAdjustmentSubmitting`
- `chartView` persistido em `localStorage` (`dashboardChartView`).
- Controle de scroll da pagina durante modais (`modalScrollState`).

## Validacoes e mensagens a preservar

- Pagamento:
  - `Informe uma data de pagamento valida.`
  - `Parcela marcada como paga.`
  - `Falha ao marcar parcela como paga.`
- Ajuste de caixa:
  - `Tipo de ajuste invalido.`
  - `Informe um valor maior que zero.`
  - `Informe uma data valida.`
  - `Ajuste de caixa salvo.`
  - `Falha ao salvar ajuste de caixa.`
- Cobranca:
  - `Mensagem copiada.`
  - `Nao foi possivel copiar a mensagem.`
  - `Cliente sem telefone valido para WhatsApp.`

## Fora de escopo desta fase

- Nao substituir a rota legado.
- Nao alterar contratos de payload/resposta do backend.
- Nao simplificar ou remover modais/acoes.
