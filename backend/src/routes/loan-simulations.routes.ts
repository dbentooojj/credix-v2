import {
  InstallmentStatus,
  InterestType,
  LoanSimulationInterestType,
  LoanSimulationStatus,
  LoanStatus,
  PaymentMethod,
  type LoanSimulation,
  type Prisma,
} from "@prisma/client";
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuthApi } from "../middleware/auth";
import { AppError } from "../middleware/error-handler";
import { validateBody } from "../middleware/validate";
import {
  createLoanSimulationDraft,
  expireLoanSimulations,
  getLoanSimulationByIdWithClient,
  listLoanSimulations,
  updateLoanSimulationDraft,
  updateLoanSimulationStatus,
} from "../repositories/loan-simulations.repository";
import {
  createOrUpdateLoanSimulationSchema,
  loanSimulationIdParamSchema,
  loanSimulationListQuerySchema,
  type CreateOrUpdateLoanSimulationInput,
} from "../schemas/loan-simulations.schemas";
import { calculateLoanSimulation } from "../services/loan-simulation-calculation.service";
import { normalizePhoneForWhatsApp } from "../services/whatsapp.service";

const router = Router();

const LOAN_META_START = "[[LOAN_META]]";
const LOAN_META_END = "[[/LOAN_META]]";
const DEFAULT_SIMULATION_VALIDITY_DAYS = 3;

function readUserId(req: { user?: { sub?: string } }): number {
  const parsed = Number(req.user?.sub);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function round2(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round((parsed + Number.EPSILON) * 100) / 100;
}

function toDateOnly(input: string, fieldLabel: string): Date {
  const raw = String(input ?? "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new AppError(`${fieldLabel} invalida. Use YYYY-MM-DD.`, 400);
  }

  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function parseIsoDate(rawValue: unknown, fieldLabel: string): string {
  const raw = String(rawValue ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new AppError(`${fieldLabel} invalida. Use YYYY-MM-DD.`, 400);
  }
  return raw;
}

function mapInterestTypeFromApi(rawType: CreateOrUpdateLoanSimulationInput["interestType"]): LoanSimulationInterestType {
  if (rawType === "simples") return LoanSimulationInterestType.SIMPLES;
  if (rawType === "fixo") return LoanSimulationInterestType.FIXO;
  return LoanSimulationInterestType.COMPOSTO;
}

function mapInterestTypeToApi(type: LoanSimulationInterestType): "simples" | "composto" | "fixo" {
  if (type === LoanSimulationInterestType.SIMPLES) return "simples";
  if (type === LoanSimulationInterestType.FIXO) return "fixo";
  return "composto";
}

function mapSimulationStatusToLabel(status: LoanSimulationStatus): string {
  if (status === LoanSimulationStatus.DRAFT) return "Rascunho";
  if (status === LoanSimulationStatus.SENT) return "Enviada";
  if (status === LoanSimulationStatus.ACCEPTED) return "Aceita";
  if (status === LoanSimulationStatus.EXPIRED) return "Expirada";
  if (status === LoanSimulationStatus.CANCELED) return "Cancelada";
  return String(status);
}

function parseStatusesFilter(raw: string | undefined): LoanSimulationStatus[] | undefined {
  if (!raw) return undefined;

  const values = raw
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);

  if (values.length === 0) return undefined;

  const parsed = values.map((value) => {
    if (value === "DRAFT") return LoanSimulationStatus.DRAFT;
    if (value === "SENT") return LoanSimulationStatus.SENT;
    if (value === "ACCEPTED") return LoanSimulationStatus.ACCEPTED;
    if (value === "EXPIRED") return LoanSimulationStatus.EXPIRED;
    if (value === "CANCELED") return LoanSimulationStatus.CANCELED;
    throw new AppError(`Status de simulacao invalido: ${value}.`, 400);
  });

  return [...new Set(parsed)];
}

function resolveExpiresAt(raw?: string): Date {
  if (!raw || !raw.trim()) {
    const date = new Date();
    date.setDate(date.getDate() + DEFAULT_SIMULATION_VALIDITY_DAYS);
    return date;
  }

  const value = raw.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = toDateOnly(value, "Validade");
    date.setUTCHours(23, 59, 59, 999);
    return date;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError("expiresAt invalido. Use YYYY-MM-DD ou ISO datetime.", 400);
  }
  return parsed;
}

type StoredScheduleInstallment = {
  installmentNumber: number;
  dueDate: string;
  amount: number;
  principalAmount: number;
  interestAmount: number;
  status: string;
  balance?: number;
  daysInterval?: number;
};

type StoredScheduleJson = {
  startDate: string;
  dueDates: string[];
  observations: string;
  installments: StoredScheduleInstallment[];
};

type StoredTotalsJson = {
  totalAmount: number;
  totalInterest: number;
  installmentAmount: number;
  interestRate: number;
  fixedFeeAmount: number;
};

function readJsonObject(raw: Prisma.JsonValue, fieldLabel: string): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new AppError(`${fieldLabel} invalido na simulacao armazenada.`, 500);
  }

  return raw as Record<string, unknown>;
}

function parseStoredScheduleJson(raw: Prisma.JsonValue): StoredScheduleJson {
  const value = readJsonObject(raw, "scheduleJson");
  const startDate = parseIsoDate(value.startDate, "Data de inicio da simulacao");

  const dueDatesRaw = Array.isArray(value.dueDates) ? value.dueDates : [];
  const dueDates = dueDatesRaw.map((item, index) => parseIsoDate(item, `Vencimento #${index + 1}`));

  const installmentsRaw = Array.isArray(value.installments) ? value.installments : [];
  const installments = installmentsRaw.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new AppError(`Parcela #${index + 1} da simulacao esta invalida.`, 500);
    }

    const row = item as Record<string, unknown>;

    return {
      installmentNumber: Math.max(1, Math.trunc(Number(row.installmentNumber) || (index + 1))),
      dueDate: parseIsoDate(row.dueDate, `Vencimento #${index + 1}`),
      amount: round2(row.amount),
      principalAmount: round2(row.principalAmount),
      interestAmount: round2(row.interestAmount),
      status: String(row.status || "Pendente"),
      balance: row.balance === undefined ? undefined : round2(row.balance),
      daysInterval: row.daysInterval === undefined ? undefined : Math.trunc(Number(row.daysInterval) || 0),
    } satisfies StoredScheduleInstallment;
  });

  return {
    startDate,
    dueDates,
    observations: String(value.observations || "").trim(),
    installments,
  };
}

function parseStoredTotalsJson(raw: Prisma.JsonValue): StoredTotalsJson {
  const value = readJsonObject(raw, "totalsJson");

  return {
    totalAmount: round2(value.totalAmount),
    totalInterest: round2(value.totalInterest),
    installmentAmount: round2(value.installmentAmount),
    interestRate: round2(value.interestRate),
    fixedFeeAmount: round2(value.fixedFeeAmount),
  };
}

async function syncTableIdSequence(
  db: Prisma.TransactionClient,
  tableName: "Loan" | "Installment",
): Promise<void> {
  const query = tableName === "Loan"
    ? `SELECT setval(pg_get_serial_sequence('"Loan"', 'id'), GREATEST((SELECT COALESCE(MAX("id"), 0) FROM "Loan"), 1), true);`
    : `SELECT setval(pg_get_serial_sequence('"Installment"', 'id'), GREATEST((SELECT COALESCE(MAX("id"), 0) FROM "Installment"), 1), true);`;

  await db.$executeRawUnsafe(query);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(round2(value));
}

function formatDayMonth(value: string): string {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}`;
}

function buildSimulationWhatsAppMessage(input: {
  totalAmount: number;
  installmentAmount: number;
  paymentDates: string[];
}) {
  const paymentDatesText = input.paymentDates
    .map((isoDate) => formatDayMonth(isoDate))
    .filter((label) => Boolean(label && label !== "-"))
    .join(", ");

  return [
    `Valor total: ${formatCurrency(input.totalAmount)}`,
    `Valor da parcela: ${formatCurrency(input.installmentAmount)}`,
    `Datas de pagamento: ${paymentDatesText || "-"}`,
  ].join("\n");
}

function encodeLoanObservations(baseText: string, meta: Record<string, unknown>): string {
  const cleanText = String(baseText || "").trim();
  const encodedMeta = `${LOAN_META_START}${JSON.stringify(meta)}${LOAN_META_END}`;
  if (!cleanText) return encodedMeta;
  return `${cleanText}\n${encodedMeta}`;
}

function computeInstallmentStatusByDueDate(dueDateIso: string, todayIso: string): InstallmentStatus {
  const dueDate = toDateOnly(dueDateIso, "Vencimento");
  const todayDate = toDateOnly(todayIso, "Data atual");
  return dueDate < todayDate ? InstallmentStatus.ATRASADO : InstallmentStatus.PENDENTE;
}

function computeLoanStatus(installmentStatuses: InstallmentStatus[]): LoanStatus {
  if (installmentStatuses.length === 0) return LoanStatus.PENDENTE;
  if (installmentStatuses.every((status) => status === InstallmentStatus.PAGO)) return LoanStatus.QUITADO;
  if (installmentStatuses.some((status) => status === InstallmentStatus.ATRASADO)) return LoanStatus.ATRASADO;
  return LoanStatus.EM_DIA;
}

function serializeLoanSimulation(simulation: LoanSimulation & {
  client?: {
    id: number;
    name: string;
    phone: string;
    email?: string | null;
  };
  approvedLoan?: {
    id: number;
    status: LoanStatus;
    totalAmount?: Prisma.Decimal;
  } | null;
}) {
  const schedule = parseStoredScheduleJson(simulation.scheduleJson);
  const totals = parseStoredTotalsJson(simulation.totalsJson);

  return {
    id: simulation.id,
    clientId: simulation.clientId,
    principalAmount: round2(simulation.principalAmount),
    interestType: mapInterestTypeToApi(simulation.interestType),
    interestRate: round2(simulation.interestRate),
    fixedFeeAmount: simulation.fixedFeeAmount === null ? null : round2(simulation.fixedFeeAmount),
    installmentsCount: simulation.installmentsCount,
    startDate: schedule.startDate,
    firstDueDate: toIsoDate(simulation.firstDueDate),
    dueDates: schedule.dueDates,
    schedule: schedule.installments,
    totals,
    observations: schedule.observations,
    status: simulation.status,
    statusLabel: mapSimulationStatusToLabel(simulation.status),
    expiresAt: simulation.expiresAt.toISOString(),
    approvedLoanId: simulation.approvedLoanId,
    createdAt: simulation.createdAt.toISOString(),
    updatedAt: simulation.updatedAt.toISOString(),
    client: simulation.client
      ? {
          id: simulation.client.id,
          name: simulation.client.name,
          phone: simulation.client.phone,
          email: simulation.client.email ?? null,
        }
      : null,
    approvedLoan: simulation.approvedLoan
      ? {
          id: simulation.approvedLoan.id,
          status: simulation.approvedLoan.status,
        }
      : null,
  };
}

router.use(requireAuthApi);

router.post("/", validateBody(createOrUpdateLoanSimulationSchema), async (req, res) => {
  const ownerUserId = readUserId(req);
  if (!Number.isFinite(ownerUserId)) {
    return res.status(401).json({ message: "Nao autenticado" });
  }

  const payload = req.body as CreateOrUpdateLoanSimulationInput;

  await expireLoanSimulations(ownerUserId);

  const client = await prisma.client.findFirst({
    where: {
      id: payload.clientId,
      ownerUserId,
    },
    select: { id: true },
  });

  if (!client) {
    throw new AppError("Cliente da simulacao nao encontrado.", 404);
  }

  const interestType = mapInterestTypeFromApi(payload.interestType);

  const calculation = calculateLoanSimulation({
    principalAmount: payload.principalAmount,
    interestType,
    interestRate: payload.interestRate,
    fixedFeeAmount: payload.fixedFeeAmount,
    installmentsCount: payload.installmentsCount,
    startDate: payload.startDate,
    firstDueDate: payload.firstDueDate,
    dueDates: payload.dueDates,
  });

  const scheduleJson = {
    startDate: calculation.normalizedInput.startDate,
    dueDates: calculation.normalizedInput.dueDates,
    observations: payload.observations || "",
    installments: calculation.schedule.map((row) => ({
      installmentNumber: row.installmentNumber,
      dueDate: row.dueDate,
      amount: round2(row.amount),
      principalAmount: round2(row.principalAmount),
      interestAmount: round2(row.interestAmount),
      status: row.status,
      ...(row.balance !== undefined ? { balance: round2(row.balance) } : {}),
      ...(row.daysInterval !== undefined ? { daysInterval: Math.trunc(row.daysInterval) } : {}),
    })),
  } satisfies Prisma.InputJsonObject;

  const totalsJson = {
    totalAmount: round2(calculation.totals.totalAmount),
    totalInterest: round2(calculation.totals.totalInterest),
    installmentAmount: round2(calculation.totals.installmentAmount),
    interestRate: round2(calculation.normalizedInput.interestRate),
    fixedFeeAmount: round2(calculation.normalizedInput.fixedFeeAmount),
  } satisfies Prisma.InputJsonObject;

  const draftPayload = {
    clientId: payload.clientId,
    principalAmount: round2(calculation.normalizedInput.principalAmount),
    interestType,
    interestRate: round2(calculation.normalizedInput.interestRate),
    fixedFeeAmount: interestType === LoanSimulationInterestType.FIXO
      ? round2(calculation.normalizedInput.fixedFeeAmount)
      : null,
    installmentsCount: calculation.normalizedInput.installmentsCount,
    firstDueDate: calculation.normalizedInput.firstDueDate,
    scheduleJson,
    totalsJson,
    expiresAt: resolveExpiresAt(payload.expiresAt),
  };

  const simulation = payload.id
    ? await updateLoanSimulationDraft(ownerUserId, payload.id, draftPayload)
    : await createLoanSimulationDraft(ownerUserId, draftPayload);

  const fullSimulation = await getLoanSimulationByIdWithClient(ownerUserId, simulation.id);
  if (!fullSimulation) {
    throw new AppError("Nao foi possivel carregar a simulacao apos salvar.", 500);
  }

  return res.status(payload.id ? 200 : 201).json({
    message: payload.id ? "Simulacao atualizada" : "Simulacao criada",
    data: serializeLoanSimulation(fullSimulation),
  });
});

router.get("/", async (req, res) => {
  const ownerUserId = readUserId(req);
  if (!Number.isFinite(ownerUserId)) {
    return res.status(401).json({ message: "Nao autenticado" });
  }

  await expireLoanSimulations(ownerUserId);

  const query = loanSimulationListQuerySchema.parse(req.query);
  const statuses = parseStatusesFilter(query.status);

  const rows = await listLoanSimulations(ownerUserId, {
    statuses,
    clientId: query.clientId,
    createdFrom: query.createdFrom,
    createdTo: query.createdTo,
  });

  return res.json({
    data: rows.map((row) => serializeLoanSimulation(row)),
  });
});

router.get("/:id", async (req, res) => {
  const ownerUserId = readUserId(req);
  if (!Number.isFinite(ownerUserId)) {
    return res.status(401).json({ message: "Nao autenticado" });
  }

  await expireLoanSimulations(ownerUserId);

  const { id } = loanSimulationIdParamSchema.parse(req.params);
  const simulation = await getLoanSimulationByIdWithClient(ownerUserId, id);

  if (!simulation) {
    throw new AppError("Simulacao nao encontrada.", 404);
  }

  return res.json({
    data: serializeLoanSimulation(simulation),
  });
});

router.post("/:id/send", async (req, res) => {
  const ownerUserId = readUserId(req);
  if (!Number.isFinite(ownerUserId)) {
    return res.status(401).json({ message: "Nao autenticado" });
  }

  await expireLoanSimulations(ownerUserId);

  const { id } = loanSimulationIdParamSchema.parse(req.params);
  const simulation = await getLoanSimulationByIdWithClient(ownerUserId, id);

  if (!simulation) {
    throw new AppError("Simulacao nao encontrada.", 404);
  }

  if (simulation.status === LoanSimulationStatus.ACCEPTED) {
    throw new AppError("Simulacao ja aceita. Nao e possivel reenviar pelo fluxo de proposta.", 400);
  }

  if (simulation.status === LoanSimulationStatus.CANCELED) {
    throw new AppError("Simulacao cancelada. Nao e possivel enviar.", 400);
  }

  if (!simulation.client?.phone) {
    throw new AppError("Cliente sem telefone para envio por WhatsApp.", 400);
  }

  const totals = parseStoredTotalsJson(simulation.totalsJson);
  const schedule = parseStoredScheduleJson(simulation.scheduleJson);

  const message = buildSimulationWhatsAppMessage({
    totalAmount: totals.totalAmount,
    installmentAmount: totals.installmentAmount,
    paymentDates: schedule.installments.map((item) => item.dueDate),
  });

  const normalizedPhone = normalizePhoneForWhatsApp(simulation.client.phone);
  if (!normalizedPhone) {
    throw new AppError("Telefone do cliente invalido para WhatsApp.", 400);
  }

  const whatsappUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;

  const updated = await updateLoanSimulationStatus(ownerUserId, id, LoanSimulationStatus.SENT);
  if (!updated) {
    throw new AppError("Nao foi possivel atualizar o status da simulacao.", 500);
  }

  return res.json({
    message: "Simulacao marcada como enviada",
    data: {
      id: simulation.id,
      status: LoanSimulationStatus.SENT,
      whatsappUrl,
      whatsappPhone: normalizedPhone,
      whatsappMessage: message,
      schedule: schedule.installments,
      totals,
    },
  });
});

router.post("/:id/approve", async (req, res) => {
  const ownerUserId = readUserId(req);
  if (!Number.isFinite(ownerUserId)) {
    return res.status(401).json({ message: "Nao autenticado" });
  }

  await expireLoanSimulations(ownerUserId);

  const { id } = loanSimulationIdParamSchema.parse(req.params);

  const approvalResult = await prisma.$transaction(async (tx) => {
    const simulation = await tx.loanSimulation.findFirst({
      where: {
        id,
        ownerUserId,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!simulation) {
      throw new AppError("Simulacao nao encontrada.", 404);
    }

    if (simulation.status === LoanSimulationStatus.CANCELED) {
      throw new AppError("Simulacao cancelada nao pode ser aprovada.", 400);
    }

    if (simulation.status === LoanSimulationStatus.ACCEPTED && simulation.approvedLoanId) {
      const existingLoan = await tx.loan.findFirst({
        where: {
          id: simulation.approvedLoanId,
          ownerUserId,
        },
        select: {
          id: true,
          status: true,
        },
      });

      return {
        alreadyApproved: true,
        simulationId: simulation.id,
        loanId: simulation.approvedLoanId,
        loanStatus: existingLoan?.status ?? null,
      };
    }

    const schedule = parseStoredScheduleJson(simulation.scheduleJson);
    const totals = parseStoredTotalsJson(simulation.totalsJson);

    if (!Array.isArray(schedule.installments) || schedule.installments.length === 0) {
      throw new AppError("Simulacao sem parcelas validas para aprovacao.", 400);
    }

    const startDate = toDateOnly(schedule.startDate, "Data de inicio da simulacao");
    const firstDueDate = toDateOnly(toIsoDate(simulation.firstDueDate), "Primeiro vencimento");
    const dueDateIso = schedule.installments[schedule.installments.length - 1]?.dueDate;
    const dueDate = toDateOnly(dueDateIso, "Ultimo vencimento");

    const todayIso = new Date().toISOString().slice(0, 10);

    const installmentRows = schedule.installments.map((item) => {
      const dueIso = parseIsoDate(item.dueDate, `Vencimento da parcela #${item.installmentNumber}`);
      const status = computeInstallmentStatusByDueDate(dueIso, todayIso);

      return {
        installmentNumber: item.installmentNumber,
        dueDate: toDateOnly(dueIso, `Vencimento da parcela #${item.installmentNumber}`),
        amount: round2(item.amount),
        principalAmount: round2(item.principalAmount),
        interestAmount: round2(item.interestAmount),
        status,
      };
    });

    const loanInstallmentStatuses = installmentRows.map((item) => item.status);
    const loanStatus = computeLoanStatus(loanInstallmentStatuses);

    const loanInterestType = simulation.interestType === LoanSimulationInterestType.SIMPLES
      ? InterestType.SIMPLES
      : InterestType.COMPOSTO;

    const loanInterestRate = simulation.interestType === LoanSimulationInterestType.FIXO
      ? round2(simulation.fixedFeeAmount ?? simulation.interestRate)
      : round2(simulation.interestRate);

    const loanObservations = encodeLoanObservations(schedule.observations, {
      interestMode: mapInterestTypeToApi(simulation.interestType),
      fixedAddition: round2(simulation.fixedFeeAmount),
      maxInstallment: 0,
      sourceSimulationId: simulation.id,
    });

    await syncTableIdSequence(tx, "Loan");
    const createdLoan = await tx.loan.create({
      data: {
        ownerUserId,
        clientId: simulation.clientId,
        principalAmount: round2(simulation.principalAmount),
        interestRate: loanInterestRate,
        interestType: loanInterestType,
        installmentsCount: simulation.installmentsCount,
        installmentAmount: round2(totals.installmentAmount),
        totalAmount: round2(totals.totalAmount),
        paymentMethod: PaymentMethod.PIX,
        startDate,
        firstDueDate,
        dueDate,
        status: loanStatus,
        observations: loanObservations,
      },
      select: {
        id: true,
        status: true,
      },
    });

    await syncTableIdSequence(tx, "Installment");
    await tx.installment.createMany({
      data: installmentRows.map((item) => ({
        ownerUserId,
        loanId: createdLoan.id,
        clientId: simulation.clientId,
        installmentNumber: item.installmentNumber,
        dueDate: item.dueDate,
        paymentDate: null,
        amount: item.amount,
        principalAmount: item.principalAmount,
        interestAmount: item.interestAmount,
        status: item.status,
        paymentMethod: null,
        notes: `Criada a partir da simulacao ${simulation.id}`,
      })),
    });

    const acceptanceUpdate = await tx.loanSimulation.updateMany({
      where: {
        id: simulation.id,
        ownerUserId,
        approvedLoanId: null,
        status: { in: [LoanSimulationStatus.DRAFT, LoanSimulationStatus.SENT, LoanSimulationStatus.EXPIRED] },
      },
      data: {
        status: LoanSimulationStatus.ACCEPTED,
        approvedLoanId: createdLoan.id,
      },
    });

    if (acceptanceUpdate.count <= 0) {
      throw new AppError("Simulacao ja foi aprovada em outra operacao. Recarregue os dados.", 409);
    }

    return {
      alreadyApproved: false,
      simulationId: simulation.id,
      loanId: createdLoan.id,
      loanStatus: createdLoan.status,
    };
  });

  if (approvalResult.alreadyApproved) {
    return res.json({
      message: "Simulacao ja estava aprovada",
      data: approvalResult,
    });
  }

  return res.status(201).json({
    message: "Simulacao aprovada e emprestimo criado",
    data: approvalResult,
  });
});

router.post("/:id/cancel", async (req, res) => {
  const ownerUserId = readUserId(req);
  if (!Number.isFinite(ownerUserId)) {
    return res.status(401).json({ message: "Nao autenticado" });
  }

  await expireLoanSimulations(ownerUserId);

  const { id } = loanSimulationIdParamSchema.parse(req.params);

  const simulation = await getLoanSimulationByIdWithClient(ownerUserId, id);
  if (!simulation) {
    throw new AppError("Simulacao nao encontrada.", 404);
  }

  if (simulation.status === LoanSimulationStatus.ACCEPTED) {
    throw new AppError("Simulacao aceita nao pode ser cancelada.", 400);
  }

  const updated = await updateLoanSimulationStatus(ownerUserId, id, LoanSimulationStatus.CANCELED);
  if (!updated) {
    throw new AppError("Nao foi possivel cancelar a simulacao.", 500);
  }

  return res.json({
    message: "Simulacao cancelada",
    data: {
      id,
      status: LoanSimulationStatus.CANCELED,
    },
  });
});

export { router as loanSimulationsRoutes };
