# Etapa 17 - Integration Report (Debtors)

## Escopo

- Tela nova: `/migration/debtors`
- Tela legado preservada: `/debtors.html`
- Objetivo: migrar a tela de clientes para rota dedicada de migracao sem trocar a rota legado.

## Implementacao

- Rota criada:
  - `frontend/app/migration/debtors/page.tsx`
- Tela criada:
  - `frontend/src/legacy-migration/screens/debtors/debtors-screen.tsx`
- Mapeamento criado:
  - `frontend/src/legacy-migration/mappings/debtors-parity-spec.md`

## Funcionalidades preservadas na rota nova

- Header da tela com acao `Novo cliente`.
- KPIs de clientes (total, ativos, inativos, com atraso).
- Busca, filtros e ordenacao.
- Tabela com expansao de detalhes por cliente.
- Paginacao da listagem.
- Cadastro/edicao de cliente via modal.
- Exclusao de cliente com remocao de vinculos em `loans/installments`.

## Integracao com API real

- `GET /api/tables/debtors`
- `GET /api/tables/loans`
- `GET /api/tables/installments`
- `PUT /api/tables/debtors`
- `PUT /api/tables/loans`
- `PUT /api/tables/installments`

## O que nao foi mexido

- Rota legado `/debtors.html` continua ativa.
- Contratos backend/payloads nao foram alterados.
- Nenhuma substituicao global do legado foi feita.
