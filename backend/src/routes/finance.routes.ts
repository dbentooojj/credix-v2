import { FinanceTransactionStatus, FinanceTransactionType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuthApi } from "../middleware/auth";

const router = Router();

const transactionStatusSchema = z.enum(["completed", "scheduled", "pending"]);
const transactionTypeSchema = z.enum(["income", "expense"]);

const createTransactionSchema = z.object({
  type: transactionTypeSchema,
  amount: z.number().positive(),
  category: z.string().trim().min(1).max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().trim().min(1).max(300),
  status: transactionStatusSchema,
});

const updateTransactionSchema = createTransactionSchema.partial().refine((payload) => {
  return (
    payload.type !== undefined
    || payload.amount !== undefined
    || payload.category !== undefined
    || payload.date !== undefined
    || payload.description !== undefined
    || payload.status !== undefined
  );
}, { message: "Nenhum campo para atualizar." });

function toPrismaType(type: "income" | "expense"): FinanceTransactionType {
  return type === "income" ? FinanceTransactionType.INCOME : FinanceTransactionType.EXPENSE;
}

function toPrismaStatus(status: "completed" | "scheduled" | "pending"): FinanceTransactionStatus {
  if (status === "scheduled") return FinanceTransactionStatus.SCHEDULED;
  if (status === "pending") return FinanceTransactionStatus.PENDING;
  return FinanceTransactionStatus.COMPLETED;
}

function toApiType(type: FinanceTransactionType): "income" | "expense" {
  return type === FinanceTransactionType.INCOME ? "income" : "expense";
}

function toApiStatus(status: FinanceTransactionStatus): "completed" | "scheduled" | "pending" {
  if (status === FinanceTransactionStatus.SCHEDULED) return "scheduled";
  if (status === FinanceTransactionStatus.PENDING) return "pending";
  return "completed";
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toDateOnlyIso(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function readUserId(req: { user?: { sub?: string } }): number {
  const parsed = Number(req.user?.sub);
  if (!Number.isFinite(parsed)) return Number.NaN;
  return parsed;
}

router.use(requireAuthApi);

router.get("/transactions", async (req, res) => {
  const userId = readUserId(req);
  if (!Number.isFinite(userId)) {
    return res.status(401).json({ message: "Nao autenticado" });
  }

  const rows = await prisma.financeTransaction.findMany({
    where: { ownerUserId: userId },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });

  return res.json({
    data: rows.map((row) => ({
      id: String(row.id),
      type: toApiType(row.type),
      amount: Number(row.amount),
      category: row.category,
      date: toDateOnlyIso(row.date),
      description: row.description,
      status: toApiStatus(row.status),
    })),
  });
});

router.post("/transactions", async (req, res) => {
  const userId = readUserId(req);
  if (!Number.isFinite(userId)) {
    return res.status(401).json({ message: "Nao autenticado" });
  }

  const payload = createTransactionSchema.parse(req.body);

  const created = await prisma.financeTransaction.create({
    data: {
      ownerUserId: userId,
      type: toPrismaType(payload.type),
      amount: payload.amount,
      category: payload.category,
      date: parseDateOnly(payload.date),
      description: payload.description,
      status: toPrismaStatus(payload.status),
    },
  });

  return res.status(201).json({
    data: {
      id: String(created.id),
      type: toApiType(created.type),
      amount: Number(created.amount),
      category: created.category,
      date: toDateOnlyIso(created.date),
      description: created.description,
      status: toApiStatus(created.status),
    },
  });
});

router.patch("/transactions/:id", async (req, res) => {
  const userId = readUserId(req);
  if (!Number.isFinite(userId)) {
    return res.status(401).json({ message: "Nao autenticado" });
  }

  const transactionId = Number(req.params.id);
  if (!Number.isFinite(transactionId)) {
    return res.status(400).json({ message: "Identificador invalido." });
  }

  const payload = updateTransactionSchema.parse(req.body);

  const existing = await prisma.financeTransaction.findFirst({
    where: { id: transactionId, ownerUserId: userId },
  });

  if (!existing) {
    return res.status(404).json({ message: "Transacao nao encontrada." });
  }

  const updated = await prisma.financeTransaction.update({
    where: { id: transactionId },
    data: {
      type: payload.type ? toPrismaType(payload.type) : undefined,
      amount: payload.amount,
      category: payload.category,
      date: payload.date ? parseDateOnly(payload.date) : undefined,
      description: payload.description,
      status: payload.status ? toPrismaStatus(payload.status) : undefined,
    },
  });

  return res.json({
    data: {
      id: String(updated.id),
      type: toApiType(updated.type),
      amount: Number(updated.amount),
      category: updated.category,
      date: toDateOnlyIso(updated.date),
      description: updated.description,
      status: toApiStatus(updated.status),
    },
  });
});

router.delete("/transactions/:id", async (req, res) => {
  const userId = readUserId(req);
  if (!Number.isFinite(userId)) {
    return res.status(401).json({ message: "Nao autenticado" });
  }

  const transactionId = Number(req.params.id);
  if (!Number.isFinite(transactionId)) {
    return res.status(400).json({ message: "Identificador invalido." });
  }

  const result = await prisma.financeTransaction.deleteMany({
    where: { id: transactionId, ownerUserId: userId },
  });

  if (result.count === 0) {
    return res.status(404).json({ message: "Transacao nao encontrada." });
  }

  return res.status(204).send();
});

export { router as financeRoutes };
