# Plano de Refatoracao

## Objetivo

Sair de uma base hibrida e chegar em um padrao unico:

- `api` como backend puro.
- `web` como frontend unico.
- contrato claro entre as camadas.

## Problema atual

O legado mistura:

- backend renderizando EJS;
- backend expondo API;
- frontend em Next sem ser a origem principal do admin;
- logica de tela dentro de templates.

Isso aumenta custo de manutencao, duplica responsabilidade e dificulta evolucao.

## Arquitetura alvo

### `apps/api`

Responsavel por:

- autenticacao;
- autorizacao;
- regras de negocio;
- persistencia;
- jobs;
- integracoes externas;
- contratos HTTP.

Nao deve conter:

- EJS;
- HTML;
- CSS;
- logica visual.

### `apps/web`

Responsavel por:

- layout do admin;
- paginas;
- componentes;
- formularios;
- estado de UI;
- consumo da API.

Nao deve conter:

- regra critica de negocio;
- acesso direto ao banco;
- duplicacao de validacao que deveria estar no backend.

## Regras de padrao

1. Tela nova so entra no `web`.
2. Endpoint novo so entra no `api`.
3. Cada modulo deve ter dono claro: `api` ou `web`.
4. Nada de helper de UI no backend.
5. Nada de query direta do frontend ao banco.
6. Contratos de API devem ser versionados por codigo, nao por suposicao.

## Ordem recomendada de migracao

### Fase 0

Congelar o legado:

- nao criar telas novas em EJS;
- permitir apenas correcoes necessarias.

### Fase 1

Preparar a fundacao:

- padronizar auth entre `web` e `api`;
- definir estrategia de cookies ou bearer token;
- criar shell do admin no `web`.

### Fase 2

Migrar modulos financeiros:

- contas a pagar;
- valores a receber;
- relatorios financeiros.

Motivo:

- sao telas com padrao repetivel;
- ja ajudam a definir componentes reutilizaveis.

### Fase 3

Migrar modulos operacionais:

- clientes;
- emprestimos;
- parcelas.

### Fase 4

Migrar conta do usuario, notificacoes e ajustes.

### Fase 5

Encerrar o legado:

- remover `res.render`;
- remover views EJS;
- remover rotas de pagina do backend;
- deixar o backend apenas em `/api`.

## Definicao de pronto por modulo

Um modulo so conta como migrado quando:

1. a tela existe no `web`;
2. o backend expõe apenas API para ele;
3. os fluxos principais funcionam;
4. o legado equivalente deixa de ser o caminho principal;
5. existe validacao minima automatizada.

## Primeiros entregaveis

1. login e sessao integrados entre `web` e `api`;
2. layout base do admin no `web`;
3. migracao completa de `contas a pagar`;
4. migracao completa de `valores a receber`.
