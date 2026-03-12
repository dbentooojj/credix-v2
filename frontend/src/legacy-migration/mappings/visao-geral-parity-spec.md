# Parity Spec (Visao Geral)

## Tela escolhida

- Tela: `visao-geral` (resumo financeiro executivo)
- Rota legado: `/admin/visao-geral.html`
- Rota planejada de migracao: `/migration/visao-geral`
- Arquivo legado: `backend/src/views/visao-geral.ejs`

## Estrutura visual e funcional a preservar

- Header e sidebar administrativa com menu de usuario.
- Hero da pagina:
  - titulo `Visao geral`
  - subtitulo descritivo
  - chip de periodo (`heroPeriodChip`)
  - horario de atualizacao (`heroGeneratedAt`)
- Cards principais de resumo (`overviewSummary`):
  - saldo em caixa
  - contas a receber
  - contas a pagar
  - saldo previsto
- Blocos operacionais do dia:
  - recebimentos de hoje
  - pagamentos de hoje
  - alertas financeiros
- Fluxo mensal:
  - cards de leitura rapida (mes atual, comparativo, carteira do mes)
  - grafico com series recebido / em aberto / atrasado
- Resumo do dia (3 cards):
  - entradas previstas hoje
  - saidas previstas hoje
  - saldo projetado do dia
- Movimentacoes recentes:
  - tabela desktop
  - cards mobile
  - paginacao

## Acoes de usuario a preservar

- Abrir links dos cards para modulos corretos.
- Navegar em itens de operacoes diarias.
- Navegar em alertas financeiros.
- Navegar em linhas/cards de movimentacoes recentes.
- Paginar movimentacoes recentes (`Anterior`, paginas numeradas, `Proxima`).
- Acessar menu de usuario:
  - perfil
  - seguranca
  - ajuda
  - logout

## APIs reais envolvidas

- `GET /api/dashboard` com query:
  - `period=6m`
  - `metric=recebido`
  - `tz`
  - `recentMovementsPage`
  - `recentMovementsPageSize`
- `POST /auth/logout`

## Estados e regras condicionais

- Estado de pagina:
  - `recentMovementsPage`
  - `recentMovementsPageSize` (6)
  - `recentMovementsTotalPages`
  - `isPaginatingRecentMovements`
- Estados visuais:
  - loading inicial
  - loading de paginacao de movimentacoes
  - exibicao de erro global (`overviewError`)
- Condicoes de fallback:
  - blocos vazios quando listas nao possuem itens
  - grafico vazio quando `hasData=false`
  - paginacao oculta quando `totalItems <= pageSize`

## Validacoes e mensagens a preservar

- Carregamento geral:
  - `Falha ao carregar a visao geral.`
- Paginacao de movimentacoes:
  - `Falha ao carregar as movimentacoes recentes.`
- Estados vazios:
  - `Sem recebimentos previstos para hoje.`
  - `Sem pagamentos previstos para hoje.`
  - `Sem movimentacoes recentes.`
  - `Sem dados no periodo.`

## Fora de escopo desta fase

- Nao substituir `/admin/visao-geral.html`.
- Nao alterar contratos de `/api/dashboard`.
- Nao alterar payloads, nomes de campos ou autenticacao por cookie.
- Nao simplificar/remover blocos da tela legado.
