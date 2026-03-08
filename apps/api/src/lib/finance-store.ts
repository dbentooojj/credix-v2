export type FinanceTransactionType = "income" | "expense";
export type FinanceTransactionStatus = "completed" | "scheduled" | "pending";

export type FinanceTransaction = {
  id: string;
  type: FinanceTransactionType;
  amount: number;
  category: string;
  date: string;
  description: string;
  status: FinanceTransactionStatus;
};

const DEFAULT_TIMEZONE = "America/Sao_Paulo";

function formatDateOnly(date: Date, timeZone = DEFAULT_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value || "1970";
  const month = parts.find((part) => part.type === "month")?.value || "01";
  const day = parts.find((part) => part.type === "day")?.value || "01";

  return `${year}-${month}-${day}`;
}

function shiftDays(diff: number) {
  const next = new Date();
  next.setDate(next.getDate() + diff);
  return formatDateOnly(next);
}

function shiftMonths(diff: number, day: number) {
  const now = new Date();
  const year = now.getFullYear();
  const monthIndex = now.getMonth() + diff;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const safeDay = Math.min(Math.max(day, 1), lastDay);

  return formatDateOnly(new Date(year, monthIndex, safeDay, 12, 0, 0));
}

function sortTransactions(rows: FinanceTransaction[]) {
  return [...rows].sort((left, right) => {
    if (left.date !== right.date) {
      return right.date.localeCompare(left.date);
    }

    return Number(right.id) - Number(left.id);
  });
}

function createSeedTransactions(): FinanceTransaction[] {
  return sortTransactions([
    {
      id: "1001",
      type: "expense",
      amount: 4200,
      category: "Fornecedores",
      date: shiftDays(4),
      description: "Pagamento da remessa de insumos da semana",
      status: "pending",
    },
    {
      id: "1002",
      type: "expense",
      amount: 980,
      category: "Infraestrutura",
      date: shiftDays(2),
      description: "Renovacao do plano de hospedagem",
      status: "scheduled",
    },
    {
      id: "1003",
      type: "expense",
      amount: 1650,
      category: "Folha",
      date: shiftDays(-3),
      description: "Adiantamento operacional do time",
      status: "completed",
    },
    {
      id: "1004",
      type: "expense",
      amount: 730,
      category: "Servicos",
      date: shiftDays(-5),
      description: "Prestacao de servicos contabeis",
      status: "pending",
    },
    {
      id: "1005",
      type: "income",
      amount: 6150,
      category: "Recebiveis",
      date: shiftDays(3),
      description: "Liquidacao de carteira do dia",
      status: "pending",
    },
    {
      id: "1006",
      type: "income",
      amount: 2400,
      category: "Comissoes",
      date: shiftDays(1),
      description: "Repasse de comissao do parceiro",
      status: "scheduled",
    },
    {
      id: "1007",
      type: "income",
      amount: 1880,
      category: "Recebiveis",
      date: shiftDays(-4),
      description: "Recebimento manual de acordo fechado",
      status: "completed",
    },
    {
      id: "1008",
      type: "income",
      amount: 1120,
      category: "Carteira",
      date: shiftDays(-6),
      description: "Parcela renegociada ainda em aberto",
      status: "pending",
    },
    {
      id: "1009",
      type: "income",
      amount: 12300,
      category: "Carteira",
      date: shiftMonths(-1, 12),
      description: "Recebimento consolidado da carteira",
      status: "completed",
    },
    {
      id: "1010",
      type: "income",
      amount: 2500,
      category: "Recebiveis",
      date: shiftMonths(-1, 24),
      description: "Repasse pendente do fechamento mensal",
      status: "pending",
    },
    {
      id: "1011",
      type: "expense",
      amount: 6200,
      category: "Operacional",
      date: shiftMonths(-1, 18),
      description: "Folha e custos fixos do mes",
      status: "completed",
    },
    {
      id: "1012",
      type: "expense",
      amount: 840,
      category: "Servicos",
      date: shiftMonths(-1, 26),
      description: "Pagamento pendente do escritorio contabil",
      status: "pending",
    },
    {
      id: "1013",
      type: "income",
      amount: 10850,
      category: "Carteira",
      date: shiftMonths(-2, 11),
      description: "Recebimento centralizado do ciclo anterior",
      status: "completed",
    },
    {
      id: "1014",
      type: "income",
      amount: 1950,
      category: "Comissoes",
      date: shiftMonths(-2, 21),
      description: "Comissao do parceiro ainda nao liquidada",
      status: "pending",
    },
    {
      id: "1015",
      type: "expense",
      amount: 5710,
      category: "Operacional",
      date: shiftMonths(-2, 16),
      description: "Custos operacionais do mes",
      status: "completed",
    },
    {
      id: "1016",
      type: "income",
      amount: 9840,
      category: "Recebiveis",
      date: shiftMonths(-3, 13),
      description: "Consolidado mensal da carteira ativa",
      status: "completed",
    },
    {
      id: "1017",
      type: "income",
      amount: 1600,
      category: "Carteira",
      date: shiftMonths(-3, 28),
      description: "Parcela antiga ainda sem baixa",
      status: "pending",
    },
    {
      id: "1018",
      type: "expense",
      amount: 5400,
      category: "Operacional",
      date: shiftMonths(-3, 19),
      description: "Despesas recorrentes do periodo",
      status: "completed",
    },
    {
      id: "1019",
      type: "income",
      amount: 11220,
      category: "Carteira",
      date: shiftMonths(-4, 9),
      description: "Recebimento da carteira com antecipacoes",
      status: "completed",
    },
    {
      id: "1020",
      type: "income",
      amount: 1780,
      category: "Recebiveis",
      date: shiftMonths(-4, 23),
      description: "Titulo antigo ainda nao regularizado",
      status: "pending",
    },
    {
      id: "1021",
      type: "expense",
      amount: 5180,
      category: "Operacional",
      date: shiftMonths(-4, 14),
      description: "Fechamento operacional do mes",
      status: "completed",
    },
    {
      id: "1022",
      type: "income",
      amount: 9340,
      category: "Carteira",
      date: shiftMonths(-5, 10),
      description: "Recebimento agregado da base ativa",
      status: "completed",
    },
    {
      id: "1023",
      type: "income",
      amount: 1450,
      category: "Comissoes",
      date: shiftMonths(-5, 22),
      description: "Comissao antiga ainda em conciliacao",
      status: "pending",
    },
    {
      id: "1024",
      type: "expense",
      amount: 4890,
      category: "Operacional",
      date: shiftMonths(-5, 16),
      description: "Custos estruturais do ciclo",
      status: "completed",
    },
  ]);
}

export function listSeedTransactions() {
  return createSeedTransactions();
}

let transactions = createSeedTransactions();
let nextId = Math.max(...transactions.map((item) => Number(item.id)), 1000) + 1;

export function listStoredTransactions() {
  return sortTransactions(transactions);
}

export function createStoredTransaction(payload: Omit<FinanceTransaction, "id">) {
  const created: FinanceTransaction = {
    id: String(nextId++),
    ...payload,
  };

  transactions = sortTransactions([...transactions, created]);
  return created;
}

export function updateStoredTransaction(id: string, payload: Partial<Omit<FinanceTransaction, "id">>) {
  const currentIndex = transactions.findIndex((item) => item.id === id);
  if (currentIndex === -1) return null;

  const updated: FinanceTransaction = {
    ...transactions[currentIndex],
    ...payload,
  };

  transactions = sortTransactions(
    transactions.map((item) => (item.id === id ? updated : item)),
  );

  return updated;
}

export function deleteStoredTransaction(id: string) {
  const beforeCount = transactions.length;
  transactions = transactions.filter((item) => item.id !== id);
  return transactions.length < beforeCount;
}
