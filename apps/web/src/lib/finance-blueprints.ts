export type FinanceBlueprint = {
  slug: "payables" | "receivables";
  href: string;
  kicker: string;
  title: string;
  summary: string;
  statusLabel: string;
  statusTone: "warning" | "success";
  highlights: string[];
  uiSlices: string[];
  apiContracts: string[];
  doneCriteria: string[];
  firstDelivery: string[];
};

export const financeBlueprints: FinanceBlueprint[] = [
  {
    slug: "payables",
    href: "/app/finance/payables",
    kicker: "Finance / Outgoing",
    title: "Contas a pagar",
    summary:
      "Migrar a tela de obrigacoes financeiras para React, com filtros, listagem, paginacao e modal de criacao/edicao consumindo somente a API.",
    statusLabel: "Proximo modulo",
    statusTone: "warning",
    highlights: [
      "Listagem por mes com status visivel.",
      "Acoes rapidas para baixar, editar e excluir.",
      "Mesmo padrao premium, mas sem logica inline em template.",
    ],
    uiSlices: [
      "Tabela responsiva com cards mobile e paginacao.",
      "Busca por descricao e categoria.",
      "Chips de filtro por status e seletor de mes.",
      "Modal para criar e editar lancamento manual.",
    ],
    apiContracts: [
      "GET /api/finance/transactions com filtro por tipo expense.",
      "POST /api/finance/transactions para criar conta manual.",
      "PATCH /api/finance/transactions/:id para editar ou baixar.",
      "DELETE /api/finance/transactions/:id para exclusao.",
    ],
    doneCriteria: [
      "A nova rota no web cobre listagem, criacao, edicao, baixa e exclusao.",
      "O backend nao renderiza mais nenhuma view para este fluxo.",
      "A origem de verdade da interface passa a ser o Next.",
    ],
    firstDelivery: [
      "Recriar o layout e a experiencia visual da tela atual.",
      "Conectar a tabela a API real com empty state e loading state.",
      "Fechar o fluxo de criacao de conta manual.",
    ],
  },
  {
    slug: "receivables",
    href: "/app/finance/receivables",
    kicker: "Finance / Incoming",
    title: "Valores a receber",
    summary:
      "Criar a tela irma de contas a pagar para recebimentos, reaproveitando componentes visuais e alterando apenas textos, filtros e tipo de transacao.",
    statusLabel: "Base herdada do pagar",
    statusTone: "success",
    highlights: [
      "Mesmo layout-base do pagar, sem duplicar arquitetura.",
      "Fluxo focado em recebimento manual de valores.",
      "Estados e acoes alinhados ao tipo income.",
    ],
    uiSlices: [
      "Reuso dos componentes da tabela e do modal.",
      "Textos, labels e status ajustados para recebimentos.",
      "Acao principal de receber ou confirmar entrada.",
      "Resumo mensal com pendentes, vencidos e vencendo hoje.",
    ],
    apiContracts: [
      "GET /api/finance/transactions com filtro por tipo income.",
      "POST /api/finance/transactions criando lancamento do tipo income.",
      "PATCH /api/finance/transactions/:id para confirmar recebimento.",
      "Mesma estrutura de resposta do pagar para maximizar reuso.",
    ],
    doneCriteria: [
      "A nova tela reutiliza a base do pagar sem copy-paste estrutural.",
      "Os textos e estados refletem recebimento, nao pagamento.",
      "A tela antiga deixa de ser necessaria no backend legado.",
    ],
    firstDelivery: [
      "Clonar a composicao do pagar com componentes compartilhados.",
      "Trocar labels e comportamento para o dominio de recebimentos.",
      "Fechar criacao manual e confirmacao de recebimento.",
    ],
  },
];

export function getFinanceBlueprint(slug: FinanceBlueprint["slug"]) {
  const blueprint = financeBlueprints.find((item) => item.slug === slug);

  if (!blueprint) {
    throw new Error(`Finance blueprint not found for slug "${slug}".`);
  }

  return blueprint;
}
