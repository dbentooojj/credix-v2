export const roadmapPhases = [
  {
    eyebrow: "Fase 1",
    title: "Fundacao",
    text: "Preparar autenticacao, shell do admin e o padrao de integracao entre web e api.",
    items: [
      "Definir estrategia de sessao entre o Next e a API.",
      "Estabilizar layout, navegacao e componentes-base.",
      "Padronizar cliente HTTP e shape minimo das respostas.",
    ],
  },
  {
    eyebrow: "Fase 2",
    title: "Financeiro",
    text: "Migrar as telas financeiras primeiro porque elas exercitam tabela, filtros, modais e acoes diretas.",
    items: [
      "Contas a pagar.",
      "Valores a receber.",
      "Relatorios financeiros.",
    ],
  },
  {
    eyebrow: "Fase 3",
    title: "Operacao",
    text: "Trazer clientes, emprestimos e parcelas para o padrao novo, removendo dependencia do legado visual.",
    items: [
      "Clientes.",
      "Emprestimos.",
      "Parcelas.",
    ],
  },
  {
    eyebrow: "Fase 4",
    title: "Encerramento do legado",
    text: "Remover renderizacao server-side de tela no backend quando os modulos principais ja estiverem no web.",
    items: [
      "Remover views EJS.",
      "Desligar res.render no backend.",
      "Deixar o backend somente em /api.",
    ],
  },
];

export const standardRules = [
  "Tela nova so entra no apps/web.",
  "Endpoint novo so entra no apps/api.",
  "Backend nao renderiza HTML, CSS nem helper visual.",
  "Frontend nao acessa banco e nao replica regra critica de negocio.",
  "Cada modulo migrado deixa de depender da view antiga.",
  "Contrato de API precisa ser explicito para a UI, nao implicito pelo legado.",
];
