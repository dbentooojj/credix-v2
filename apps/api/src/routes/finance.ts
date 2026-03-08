import { Router } from "express";
import { z } from "zod";

const router = Router();

const transactionTypeSchema = z.enum(["income", "expense"]);
const transactionStatusSchema = z.enum(["completed", "scheduled", "pending"]);

const transactionPayloadSchema = z.object({
  type: transactionTypeSchema,
  amount: z.coerce.number().positive(),
  category: z.string().trim().min(1).max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().trim().min(1).max(300),
  status: transactionStatusSchema,
});

const transactionUpdateSchema = transactionPayloadSchema.partial().refine((payload) => {
  return Object.keys(payload).length > 0;
}, { message: "Nenhum campo para atualizar." });

const transactionQuerySchema = z.object({
  type: transactionTypeSchema.optional(),
  status: transactionStatusSchema.optional(),
  search: z.string().trim().min(1).optional(),
});

type FinanceTransaction = z.infer<typeof transactionPayloadSchema> & {
  id: string;
};

let nextId = 1008;

let transactions: FinanceTransaction[] = [
  {
    id: "1001",
    type: "expense",
    amount: 4200,
    category: "Fornecedores",
    date: "2026-03-12",
    description: "Pagamento da remessa de insumos da semana",
    status: "pending",
  },
  {
    id: "1002",
    type: "expense",
    amount: 980,
    category: "Infraestrutura",
    date: "2026-03-10",
    description: "Renovacao do plano de hospedagem",
    status: "scheduled",
  },
  {
    id: "1003",
    type: "expense",
    amount: 1650,
    category: "Folha",
    date: "2026-03-05",
    description: "Adiantamento operacional do time",
    status: "completed",
  },
  {
    id: "1004",
    type: "expense",
    amount: 730,
    category: "Servicos",
    date: "2026-03-03",
    description: "Prestacao de servicos contabeis",
    status: "pending",
  },
  {
    id: "1005",
    type: "income",
    amount: 6150,
    category: "Recebiveis",
    date: "2026-03-11",
    description: "Liquidacao de carteira do dia",
    status: "pending",
  },
  {
    id: "1006",
    type: "income",
    amount: 2400,
    category: "Comissoes",
    date: "2026-03-09",
    description: "Repasse de comissao do parceiro",
    status: "scheduled",
  },
  {
    id: "1007",
    type: "income",
    amount: 1880,
    category: "Recebiveis",
    date: "2026-03-04",
    description: "Recebimento manual de acordo fechado",
    status: "completed",
  },
];

function sortTransactions(rows: FinanceTransaction[]) {
  return [...rows].sort((left, right) => {
    if (left.date !== right.date) {
      return right.date.localeCompare(left.date);
    }

    return Number(right.id) - Number(left.id);
  });
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

router.get("/transactions", (req, res) => {
  const query = transactionQuerySchema.parse({
    type: typeof req.query.type === "string" ? req.query.type : undefined,
    status: typeof req.query.status === "string" ? req.query.status : undefined,
    search: typeof req.query.search === "string" ? req.query.search : undefined,
  });

  const filtered = sortTransactions(transactions).filter((transaction) => {
    if (query.type && transaction.type !== query.type) return false;
    if (query.status && transaction.status !== query.status) return false;

    if (query.search) {
      const haystack = normalizeSearch(`${transaction.description} ${transaction.category}`);
      if (!haystack.includes(normalizeSearch(query.search))) {
        return false;
      }
    }

    return true;
  });

  return res.status(200).json({
    data: filtered,
    meta: {
      total: filtered.length,
    },
  });
});

router.post("/transactions", (req, res) => {
  const payload = transactionPayloadSchema.parse(req.body);

  const created: FinanceTransaction = {
    id: String(nextId++),
    ...payload,
  };

  transactions = sortTransactions([...transactions, created]);

  return res.status(201).json({
    data: created,
  });
});

router.patch("/transactions/:id", (req, res) => {
  const payload = transactionUpdateSchema.parse(req.body);
  const transactionId = String(req.params.id || "");
  const currentIndex = transactions.findIndex((item) => item.id === transactionId);

  if (currentIndex === -1) {
    return res.status(404).json({ message: "Transacao nao encontrada." });
  }

  const updated: FinanceTransaction = {
    ...transactions[currentIndex],
    ...payload,
  };

  transactions = sortTransactions(
    transactions.map((item) => (item.id === transactionId ? updated : item)),
  );

  return res.status(200).json({
    data: updated,
  });
});

router.delete("/transactions/:id", (req, res) => {
  const transactionId = String(req.params.id || "");
  const beforeCount = transactions.length;

  transactions = transactions.filter((item) => item.id !== transactionId);

  if (transactions.length === beforeCount) {
    return res.status(404).json({ message: "Transacao nao encontrada." });
  }

  return res.status(204).send();
});

export { router as financeRoutes };
