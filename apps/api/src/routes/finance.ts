import { Router } from "express";
import { z } from "zod";
import { handleAsync } from "../lib/async-route";
import {
  createFinanceTransaction,
  deleteFinanceTransaction,
  listFinanceTransactions,
  updateFinanceTransaction,
} from "../lib/finance-repository";

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

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

router.get("/transactions", handleAsync(async (req, res) => {
  const query = transactionQuerySchema.parse({
    type: typeof req.query.type === "string" ? req.query.type : undefined,
    status: typeof req.query.status === "string" ? req.query.status : undefined,
    search: typeof req.query.search === "string" ? req.query.search : undefined,
  });

  const transactions = await listFinanceTransactions();
  const filtered = transactions.filter((transaction) => {
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
}));

router.post("/transactions", handleAsync(async (req, res) => {
  const payload = transactionPayloadSchema.parse(req.body);
  const created = await createFinanceTransaction(payload);

  return res.status(201).json({
    data: created,
  });
}));

router.patch("/transactions/:id", handleAsync(async (req, res) => {
  const payload = transactionUpdateSchema.parse(req.body);
  const transactionId = String(req.params.id || "");
  const updated = await updateFinanceTransaction(transactionId, payload);

  if (!updated) {
    return res.status(404).json({ message: "Transacao nao encontrada." });
  }

  return res.status(200).json({
    data: updated,
  });
}));

router.delete("/transactions/:id", handleAsync(async (req, res) => {
  const transactionId = String(req.params.id || "");
  const deleted = await deleteFinanceTransaction(transactionId);

  if (!deleted) {
    return res.status(404).json({ message: "Transacao nao encontrada." });
  }

  return res.status(204).send();
}));

export { router as financeRoutes };
