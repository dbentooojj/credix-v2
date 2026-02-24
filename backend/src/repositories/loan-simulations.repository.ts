import {
  LoanSimulationInterestType,
  LoanSimulationStatus,
  Prisma,
  type LoanSimulation,
} from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error-handler";

type PrismaExecutor = Prisma.TransactionClient | typeof prisma;

export type LoanSimulationDraftPayload = {
  clientId: number;
  principalAmount: number;
  interestType: LoanSimulationInterestType;
  interestRate: number;
  fixedFeeAmount: number | null;
  installmentsCount: number;
  firstDueDate: string;
  scheduleJson: Prisma.InputJsonValue;
  totalsJson: Prisma.InputJsonValue;
  expiresAt: Date;
};

export type LoanSimulationListFilters = {
  statuses?: LoanSimulationStatus[];
  clientId?: number;
  createdFrom?: string;
  createdTo?: string;
};

function resolveDb(db?: PrismaExecutor): PrismaExecutor {
  return db ?? prisma;
}

function toDateOnly(rawDate: string, fieldLabel: string): Date {
  const value = String(rawDate ?? "").trim();
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new AppError(`${fieldLabel} invalida. Use YYYY-MM-DD.`, 400);
  }

  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

export async function expireLoanSimulations(ownerUserId: number, db?: PrismaExecutor): Promise<number> {
  const client = resolveDb(db);
  const result = await client.loanSimulation.updateMany({
    where: {
      ownerUserId,
      status: { in: [LoanSimulationStatus.DRAFT, LoanSimulationStatus.SENT] },
      expiresAt: { lt: new Date() },
    },
    data: {
      status: LoanSimulationStatus.EXPIRED,
    },
  });

  return result.count;
}

export async function getLoanSimulationById(
  ownerUserId: number,
  simulationId: string,
  db?: PrismaExecutor,
): Promise<LoanSimulation | null> {
  const client = resolveDb(db);
  return client.loanSimulation.findFirst({
    where: {
      id: simulationId,
      ownerUserId,
    },
  });
}

export async function getLoanSimulationByIdWithClient(
  ownerUserId: number,
  simulationId: string,
  db?: PrismaExecutor,
) {
  const client = resolveDb(db);
  return client.loanSimulation.findFirst({
    where: {
      id: simulationId,
      ownerUserId,
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
        },
      },
      approvedLoan: {
        select: {
          id: true,
          status: true,
          totalAmount: true,
        },
      },
    },
  });
}

export async function listLoanSimulations(
  ownerUserId: number,
  filters: LoanSimulationListFilters,
  db?: PrismaExecutor,
) {
  const client = resolveDb(db);

  const where: Prisma.LoanSimulationWhereInput = {
    ownerUserId,
  };

  if (Array.isArray(filters.statuses) && filters.statuses.length > 0) {
    where.status = { in: filters.statuses };
  }

  if (Number.isFinite(filters.clientId)) {
    where.clientId = Number(filters.clientId);
  }

  if (filters.createdFrom || filters.createdTo) {
    where.createdAt = {};

    if (filters.createdFrom) {
      where.createdAt.gte = toDateOnly(filters.createdFrom, "Data inicial");
    }

    if (filters.createdTo) {
      const endDate = toDateOnly(filters.createdTo, "Data final");
      endDate.setUTCDate(endDate.getUTCDate() + 1);
      where.createdAt.lt = endDate;
    }
  }

  return client.loanSimulation.findMany({
    where,
    include: {
      client: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      approvedLoan: {
        select: {
          id: true,
          status: true,
        },
      },
    },
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
  });
}

export async function createLoanSimulationDraft(
  ownerUserId: number,
  payload: LoanSimulationDraftPayload,
  db?: PrismaExecutor,
) {
  const client = resolveDb(db);

  return client.loanSimulation.create({
    data: {
      ownerUserId,
      clientId: payload.clientId,
      principalAmount: payload.principalAmount,
      interestType: payload.interestType,
      interestRate: payload.interestRate,
      fixedFeeAmount: payload.fixedFeeAmount,
      installmentsCount: payload.installmentsCount,
      firstDueDate: toDateOnly(payload.firstDueDate, "Primeiro vencimento"),
      scheduleJson: payload.scheduleJson,
      totalsJson: payload.totalsJson,
      status: LoanSimulationStatus.DRAFT,
      expiresAt: payload.expiresAt,
    },
  });
}

export async function updateLoanSimulationDraft(
  ownerUserId: number,
  simulationId: string,
  payload: LoanSimulationDraftPayload,
  db?: PrismaExecutor,
) {
  const client = resolveDb(db);

  const existing = await client.loanSimulation.findFirst({
    where: {
      id: simulationId,
      ownerUserId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!existing) {
    throw new AppError("Simulacao nao encontrada.", 404);
  }

  if (existing.status === LoanSimulationStatus.ACCEPTED || existing.status === LoanSimulationStatus.CANCELED) {
    throw new AppError("Simulacao finalizada nao pode ser editada.", 400);
  }

  return client.loanSimulation.update({
    where: { id: simulationId },
    data: {
      clientId: payload.clientId,
      principalAmount: payload.principalAmount,
      interestType: payload.interestType,
      interestRate: payload.interestRate,
      fixedFeeAmount: payload.fixedFeeAmount,
      installmentsCount: payload.installmentsCount,
      firstDueDate: toDateOnly(payload.firstDueDate, "Primeiro vencimento"),
      scheduleJson: payload.scheduleJson,
      totalsJson: payload.totalsJson,
      status: LoanSimulationStatus.DRAFT,
      expiresAt: payload.expiresAt,
    },
  });
}

export async function updateLoanSimulationStatus(
  ownerUserId: number,
  simulationId: string,
  status: LoanSimulationStatus,
  data: Prisma.LoanSimulationUpdateInput = {},
  db?: PrismaExecutor,
) {
  const client = resolveDb(db);

  const result = await client.loanSimulation.updateMany({
    where: {
      id: simulationId,
      ownerUserId,
    },
    data: {
      ...data,
      status,
    },
  });

  if (result.count <= 0) {
    return null;
  }

  return client.loanSimulation.findUnique({
    where: { id: simulationId },
  });
}
