# Etapa 4 - Parity Report (Installments)

## Escopo da etapa

- Tela migrada: `/migration/installments`
- Tela legado preservada: `/admin/installments.html`
- Sem substituicao de rota legado.

## O que foi criado

- `frontend/src/legacy-migration/screens/installments/installments-screen.tsx`
- `frontend/app/migration/installments/page.tsx`

## O que foi migrado com paridade

- Header com titulo/subtitulo e horario de atualizacao.
- 3 cards KPI clicaveis:
  - `Recebido no mes`
  - `Total pendente`
  - `Total atrasado`
- Filtros:
  - busca
  - status
  - cliente
  - periodo
  - forma de pagamento
  - periodo personalizado
  - limpar filtros
- Listagem:
  - cards mobile
  - tabela desktop
  - paginação com anterior/proxima e contador
  - estado vazio com CTA para emprestimos
- Modal de parcela com modos:
  - `details`
  - `payment`
  - `refund`
  - `confirmDelete`
- Regras preservadas:
  - bloqueio de estorno para parcelas nao pagas
  - bloqueio de exclusao para parcela paga
  - bloqueio de exclusao para emprestimo com parcela unica
  - pre-filtro por query params (`status` e `due`)

## O que nao foi mexido

- Backend (Express/Prisma) nao foi alterado.
- Contratos de API nao foram alterados.
- Tela EJS antiga continua intacta.
- Rotas legadas continuam responsaveis pelo fluxo atual.

