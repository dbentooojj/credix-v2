import { randomUUID } from "node:crypto";
import { Router } from "express";
import { requireAuthApi } from "../middleware/auth";
import { prisma } from "../lib/prisma";

type SimulationStatus = "DRAFT" | "SENT" | "ACCEPTED" | "EXPIRED" | "CANCELED";

type LoanSimulationRow = {
  id: string;
  ownerUserId: number;
  clientId: number;
  clientName: string | null;
  clientPhone: string | null;
  principalAmount: number;
  interestType: string;
  interestRate: number;
  fixedFeeAmount: number;
  installmentsCount: number;
  startDate: string;
  firstDueDate: string;
  dueDates: string[];
  observations: string;
  status: SimulationStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  totals: {
    totalAmount: number;
    installmentAmount: number;
  };
  schedule: Array<{ dueDate: string }>;
};

const router = Router();
router.use(requireAuthApi);

const simulationStore = new Map<number, Map<string, LoanSimulationRow>>();

function readUserId(req: { user?: { sub?: string } }): number {
  const parsed = Number(req.user?.sub);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round2(value: unknown): number {
  return Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;
}

function toIsoDateOnly(input: unknown, fallback = new Date()): string {
  const raw = String(input ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const parsed = new Date(raw || fallback.toISOString());
  if (Number.isNaN(parsed.getTime())) {
    return fallback.toISOString().slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
}

function addDaysIsoDate(baseIsoDate: string, days: number): string {
  const parsed = new Date(`${baseIsoDate}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return baseIsoDate;
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function formatCurrencyBRL(value: unknown): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatDateDayMonthShort(input: unknown): string {
  const raw = String(input ?? "").trim().slice(0, 10);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "-";

  const monthIndex = Number(match[2]) - 1;
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const month = months[monthIndex] ?? null;
  if (!month) return "-";

  return `${match[3]} ${month}`;
}

function normalizeDigits(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizeBrazilPhoneDigits(value: unknown): string {
  const digits = normalizeDigits(value);
  if (!digits) return "";

  let normalized = digits;
  if (normalized.startsWith("55") && normalized.length > 11) {
    normalized = normalized.slice(2);
  }
  if (normalized.length > 11) {
    normalized = normalized.slice(-11);
  }
  return normalized;
}

function toWhatsAppPhone(value: unknown): string | null {
  const digits = normalizeBrazilPhoneDigits(value);
  if (digits.length !== 10 && digits.length !== 11) return null;
  return `55${digits}`;
}

type ClientLite = {
  id: number;
  name: string;
  phone: string;
};

async function findClient(ownerUserId: number, clientId: number): Promise<ClientLite | null> {
  return prisma.client.findFirst({
    where: {
      ownerUserId,
      id: clientId,
    },
    select: {
      id: true,
      name: true,
      phone: true,
    },
  });
}

async function buildClientLookup(ownerUserId: number, rows: LoanSimulationRow[]): Promise<Map<number, ClientLite>> {
  const clientIds = [...new Set(rows.map((row) => row.clientId).filter((id) => Number.isFinite(id) && id > 0))];
  if (clientIds.length === 0) return new Map();

  const clients = await prisma.client.findMany({
    where: {
      ownerUserId,
      id: { in: clientIds },
    },
    select: {
      id: true,
      name: true,
      phone: true,
    },
  });

  return new Map(clients.map((client) => [client.id, client]));
}

function getUserStore(ownerUserId: number): Map<string, LoanSimulationRow> {
  const existing = simulationStore.get(ownerUserId);
  if (existing) return existing;
  const created = new Map<string, LoanSimulationRow>();
  simulationStore.set(ownerUserId, created);
  return created;
}

function parseStatusFilter(rawStatus: unknown): Set<SimulationStatus> | null {
  const input = String(rawStatus ?? "").trim().toUpperCase();
  if (!input) return null;
  const statuses = input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item): item is SimulationStatus => (
      item === "DRAFT"
      || item === "SENT"
      || item === "ACCEPTED"
      || item === "EXPIRED"
      || item === "CANCELED"
    ));

  return statuses.length > 0 ? new Set(statuses) : null;
}

function computeTotalsFromPayload(payload: Record<string, unknown>) {
  const principal = round2(payload.principalAmount);
  const installments = Math.max(1, Math.trunc(toNumber(payload.installmentsCount)));
  const interestType = String(payload.interestType ?? "composto").toLowerCase();
  const interestRate = round2(payload.interestRate);
  const fixedFeeAmount = round2(payload.fixedFeeAmount);

  const explicitTotal = round2((payload._preview as Record<string, unknown> | undefined)?.totalAmount);
  if (explicitTotal > 0) {
    return {
      totalAmount: explicitTotal,
      installmentAmount: round2(explicitTotal / installments),
      interestRate,
      fixedFeeAmount,
    };
  }

  if (interestType === "fixo") {
    const totalAmount = round2(principal + fixedFeeAmount);
    return {
      totalAmount,
      installmentAmount: round2(totalAmount / installments),
      interestRate: 0,
      fixedFeeAmount,
    };
  }

  const totalAmount = round2(principal * (1 + (interestRate / 100) * installments));
  return {
    totalAmount,
    installmentAmount: round2(totalAmount / installments),
    interestRate,
    fixedFeeAmount: 0,
  };
}

function mapRowForResponse(row: LoanSimulationRow, client?: ClientLite | null) {
  const nowIso = new Date().toISOString().slice(0, 10);
  const effectiveStatus: SimulationStatus = (
    (row.status === "DRAFT" || row.status === "SENT")
    && row.expiresAt < nowIso
  )
    ? "EXPIRED"
    : row.status;

  const clientName = client?.name ?? row.clientName ?? `Cliente #${row.clientId}`;
  const clientPhone = client?.phone ?? row.clientPhone ?? null;

  return {
    ...row,
    client: {
      id: row.clientId,
      name: clientName,
      phone: clientPhone,
    },
    status: effectiveStatus,
    statusLabel: effectiveStatus,
  };
}

router.get("/", async (req, res) => {
  const ownerUserId = readUserId(req);
  if (!Number.isFinite(ownerUserId)) return res.status(401).json({ message: "Nao autenticado" });

  const statusFilter = parseStatusFilter(req.query.status);
  const rawRows = [...getUserStore(ownerUserId).values()];
  const clientById = await buildClientLookup(ownerUserId, rawRows);
  const rows = rawRows
    .map((row) => mapRowForResponse(row, clientById.get(row.clientId) ?? null))
    .filter((item) => (statusFilter ? statusFilter.has(item.status) : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return res.json({ data: rows });
});

router.post("/", async (req, res) => {
  const ownerUserId = readUserId(req);
  if (!Number.isFinite(ownerUserId)) return res.status(401).json({ message: "Nao autenticado" });

  const payload = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>;
  const id = String(payload.id ?? "").trim() || randomUUID();
  const now = new Date();
  const nowIso = now.toISOString();
  const startDate = toIsoDateOnly(payload.startDate, now);
  const firstDueDate = toIsoDateOnly(payload.firstDueDate ?? payload.startDate, now);
  const dueDates = Array.isArray(payload.dueDates)
    ? payload.dueDates.map((item) => toIsoDateOnly(item, now))
    : [firstDueDate];
  const totals = computeTotalsFromPayload(payload);
  const clientId = Math.max(1, Math.trunc(toNumber(payload.clientId)));
  const client = await findClient(ownerUserId, clientId);
  if (!client) {
    return res.status(400).json({ message: "Cliente invalido para simulacao." });
  }

  const row: LoanSimulationRow = {
    id,
    ownerUserId,
    clientId,
    clientName: client.name,
    clientPhone: client.phone,
    principalAmount: round2(payload.principalAmount),
    interestType: String(payload.interestType ?? "composto").toLowerCase(),
    interestRate: totals.interestRate,
    fixedFeeAmount: totals.fixedFeeAmount,
    installmentsCount: Math.max(1, Math.trunc(toNumber(payload.installmentsCount))),
    startDate,
    firstDueDate,
    dueDates,
    observations: String(payload.observations ?? ""),
    status: "DRAFT",
    createdAt: nowIso,
    updatedAt: nowIso,
    expiresAt: addDaysIsoDate(nowIso.slice(0, 10), 7),
    totals: {
      totalAmount: totals.totalAmount,
      installmentAmount: totals.installmentAmount,
    },
    schedule: dueDates.map((dueDate) => ({ dueDate })),
  };

  getUserStore(ownerUserId).set(id, row);
  return res.status(201).json({ data: mapRowForResponse(row, client) });
});

router.post("/:id/send", async (req, res) => {
  const ownerUserId = readUserId(req);
  if (!Number.isFinite(ownerUserId)) return res.status(401).json({ message: "Nao autenticado" });

  const id = String(req.params.id ?? "").trim();
  const row = getUserStore(ownerUserId).get(id);
  if (!row) return res.status(404).json({ message: "Simulacao nao encontrada" });

  row.status = "SENT";
  row.updatedAt = new Date().toISOString();
  const client = await findClient(ownerUserId, row.clientId);
  const clientPhone = client?.phone ?? row.clientPhone ?? null;
  const waPhone = toWhatsAppPhone(clientPhone);
  const paymentDatesSource = row.schedule.length > 0
    ? row.schedule.map((item) => item.dueDate)
    : row.dueDates;
  const paymentDatesList = paymentDatesSource
    .map((date) => formatDateDayMonthShort(date))
    .filter((date) => date !== "-");
  const paymentDatesBlock = paymentDatesList.length > 0
    ? paymentDatesList.map((date) => `- ${date}`).join("\n")
    : "- -";

  const whatsappMessage = [
    `*Valor total:* ${formatCurrencyBRL(row.totals.totalAmount)}`,
    `*Valor da parcela:* ${formatCurrencyBRL(row.totals.installmentAmount)}`,
    "",
    "*Datas de pagamento:*",
    paymentDatesBlock,
  ].join("\n");
  const whatsappUrl = waPhone
    ? `https://wa.me/${waPhone}?text=${encodeURIComponent(whatsappMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;

  return res.json({ data: { ...mapRowForResponse(row, client), whatsappMessage, whatsappUrl } });
});

router.post("/:id/approve", async (req, res) => {
  const ownerUserId = readUserId(req);
  if (!Number.isFinite(ownerUserId)) return res.status(401).json({ message: "Nao autenticado" });

  const id = String(req.params.id ?? "").trim();
  const row = getUserStore(ownerUserId).get(id);
  if (!row) return res.status(404).json({ message: "Simulacao nao encontrada" });

  row.status = "ACCEPTED";
  row.updatedAt = new Date().toISOString();
  const client = await findClient(ownerUserId, row.clientId);
  return res.json({ data: { ...mapRowForResponse(row, client), loanId: null } });
});

router.post("/:id/cancel", async (req, res) => {
  const ownerUserId = readUserId(req);
  if (!Number.isFinite(ownerUserId)) return res.status(401).json({ message: "Nao autenticado" });

  const id = String(req.params.id ?? "").trim();
  const row = getUserStore(ownerUserId).get(id);
  if (!row) return res.status(404).json({ message: "Simulacao nao encontrada" });

  row.status = "CANCELED";
  row.updatedAt = new Date().toISOString();
  const client = await findClient(ownerUserId, row.clientId);
  return res.json({ data: mapRowForResponse(row, client) });
});

export { router as loanSimulationsRoutes };
