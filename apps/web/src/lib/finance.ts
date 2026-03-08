import type { FinanceTransaction, FinanceTransactionStatus, FinanceTransactionType } from "@/src/lib/api";

export type FinanceViewConfig = {
  mode: FinanceTransactionType;
  kicker: string;
  title: string;
  summary: string;
  focusLabel: string;
  listTitle: string;
  listDescription: string;
  createTitle: string;
  createDescription: string;
  createActionLabel: string;
  updateActionLabel: string;
  completeActionLabel: string;
  completeStatusLabel: string;
  emptyTitle: string;
  emptyText: string;
};

const financeViewConfigs: Record<FinanceTransactionType, FinanceViewConfig> = {
  expense: {
    mode: "expense",
    kicker: "Finance / Outgoing",
    title: "Contas a pagar",
    summary:
      "Primeiro modulo funcional da migracao. O fluxo agora nasce no Next, consome a API nova e elimina a necessidade de EJS para obrigacoes financeiras.",
    focusLabel: "Saidas operacionais",
    listTitle: "Lancamentos a pagar",
    listDescription: "Controle manual de despesas, vencimentos e baixas do fluxo financeiro.",
    createTitle: "Nova conta a pagar",
    createDescription: "Cadastre obrigacoes financeiras e reaproveite o mesmo painel para editar itens existentes.",
    createActionLabel: "Salvar conta",
    updateActionLabel: "Atualizar conta",
    completeActionLabel: "Baixar",
    completeStatusLabel: "Paga",
    emptyTitle: "Nenhuma conta encontrada",
    emptyText: "Crie a primeira conta manual ou ajuste os filtros para visualizar as despesas.",
  },
  income: {
    mode: "income",
    kicker: "Finance / Incoming",
    title: "Valores a receber",
    summary:
      "Tela irma de contas a pagar, com a mesma arquitetura e o mesmo workspace visual, trocando apenas o contexto para recebimentos.",
    focusLabel: "Entradas operacionais",
    listTitle: "Lancamentos a receber",
    listDescription: "Acompanhe previsoes de entrada, recebimentos pendentes e confirmacoes manuais.",
    createTitle: "Novo valor a receber",
    createDescription: "Use a mesma base do pagar para cadastrar e atualizar recebimentos manuais.",
    createActionLabel: "Salvar recebimento",
    updateActionLabel: "Atualizar recebimento",
    completeActionLabel: "Receber",
    completeStatusLabel: "Recebida",
    emptyTitle: "Nenhum recebimento encontrado",
    emptyText: "Cadastre uma entrada manual ou limpe a busca para ver os recebimentos disponiveis.",
  },
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function getFinanceViewConfig(mode: FinanceTransactionType) {
  return financeViewConfigs[mode];
}

export function formatFinanceCurrency(value: number) {
  return currencyFormatter.format(value);
}

export function formatFinanceDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return dateFormatter.format(new Date(year, month - 1, day));
}

export function getFinanceTodayDate() {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getFinanceStatusLabel(status: FinanceTransactionStatus, mode: FinanceTransactionType) {
  if (status === "completed") {
    return mode === "expense" ? "Paga" : "Recebida";
  }

  if (status === "scheduled") {
    return "Agendada";
  }

  return "Pendente";
}

export function getFinanceStatusVariant(status: FinanceTransactionStatus) {
  if (status === "completed") return "success";
  if (status === "scheduled") return "warning";
  return "outline";
}

export function isFinanceTransactionOpen(transaction: FinanceTransaction) {
  return transaction.status !== "completed";
}

export function isFinanceTransactionOverdue(transaction: FinanceTransaction, today = getFinanceTodayDate()) {
  return isFinanceTransactionOpen(transaction) && transaction.date < today;
}
