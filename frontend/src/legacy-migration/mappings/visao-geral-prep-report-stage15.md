# Etapa 15 - Prep Report (Visao Geral)

## Escopo da etapa

- Sem troca de rota legado.
- Objetivo: mapear completamente `visao-geral.ejs` antes da exposicao da rota de migracao.

## O que foi feito

- Analise da tela legado `backend/src/views/visao-geral.ejs`.
- Levantamento de:
  - blocos visuais obrigatorios
  - acoes do usuario
  - chamadas de API reais
  - estados/paginacao
  - mensagens de erro e estados vazios
- Documento criado:
  - `frontend/src/legacy-migration/mappings/visao-geral-parity-spec.md`

## Principais dependencias identificadas

- `GET /api/dashboard` com:
  - `period`
  - `metric`
  - `tz`
  - `recentMovementsPage`
  - `recentMovementsPageSize`
- `POST /auth/logout`
- Paginacao incremental da secao de movimentacoes recentes.

## Riscos para migracao da tela

- Alto volume de blocos na mesma pagina (cards, operacoes, alertas, fluxo, tabela responsiva).
- Convivencia desktop/mobile na secao de movimentacoes.
- Preservacao de regras de fallback para listas vazias e grafico sem dados.

## Build e Docker

- Sem alteracao de contrato backend.
- Nenhuma substituicao global.

## Proximo passo sugerido

- Expor rota dedicada `/migration/visao-geral` com paridade funcional preservada e validar visualmente antes da proxima tela.
