# Etapa 13 - Prep Report (Dashboard)

## Escopo da etapa

- Sem mudanca visual nesta etapa.
- Objetivo: preparar a migracao da tela `dashboard.html` com mapeamento completo de paridade e contratos.

## O que foi feito

- Mapeamento tecnico da tela legado `backend/src/views/dashboard.ejs`.
- Levantamento de:
  - blocos visuais obrigatorios
  - acoes do usuario
  - chamadas de API reais
  - estados locais e regras condicionais
  - validacoes e mensagens
- Documento criado:
  - `frontend/src/legacy-migration/mappings/dashboard-parity-spec.md`

## Principais dependencias identificadas

- Dados e agregacoes do endpoint `GET /api/dashboard`.
- Fluxo de pagamento via `POST /api/payments`.
- Fluxo de ajuste de caixa via `POST /api/dashboard/cash-adjustments`.
- Dependencia de autenticacao por cookie httpOnly.
- Persistencia de preferencia de grafico no `localStorage`.

## Riscos para a migracao da tela

- Alto volume de regras de renderizacao condicional.
- Multiplicidade de modais com estados concorrentes.
- Necessidade de manter sem regressao:
  - paginacao de listas
  - atualizacao de grafico
  - validacoes de formulario

## Build e Docker

- Sem alteracao de rota/tela nesta etapa.
- Nenhum contrato backend alterado.

## Proximo passo sugerido

- Etapa 14: iniciar implementacao React/Next da tela `dashboard` em rota de migracao dedicada (`/migration/dashboard`) com paridade funcional minima validavel, mantendo legado intacto.
