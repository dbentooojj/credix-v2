import {
  ClientStatus,
  InstallmentStatus,
  InterestType,
  LoanStatus,
  PaymentMethod,
  type Prisma,
} from "@prisma/client";
import { prisma } from "../lib/prisma";

export type TableName = "debtors" | "loans" | "installments";

type RawRow = Record<string, unknown>;

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeAsciiUpper(value: unknown): string {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toInt(value: unknown): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.trunc(parsed);
}

function toDateOnly(value: unknown, fallback = new Date()): Date {
  if (!value) return new Date(fallback);

  const raw = String(value).trim();
  const dateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]) - 1;
    const day = Number(dateOnlyMatch[3]);
    return new Date(Date.UTC(year, month, day));
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return new Date(fallback);
  return parsed;
}

function toIsoDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function asRows(rows: unknown[]): RawRow[] {
  return rows.filter((row): row is RawRow => Boolean(row && typeof row === "object"));
}

function normalizeClientStatus(value: unknown): ClientStatus {
  const normalized = normalizeAsciiUpper(value);
  if (normalized === "INATIVO" || normalized === "QUITADO") return ClientStatus.INATIVO;
  return ClientStatus.ATIVO;
}

function mapClientStatusToUi(value: ClientStatus): string {
  return value === ClientStatus.ATIVO ? "Ativo" : "Inativo";
}

function normalizeLoanStatus(value: unknown): LoanStatus {
  const normalized = normalizeAsciiUpper(value);

  if (normalized === "ATRASADO") return LoanStatus.ATRASADO;
  if (normalized === "FINALIZADO" || normalized === "QUITADO") return LoanStatus.QUITADO;
  if (normalized === "ATIVO" || normalized === "EM_DIA" || normalized === "EM DIA") return LoanStatus.EM_DIA;
  return LoanStatus.PENDENTE;
}

function mapLoanStatusToUi(value: LoanStatus): string {
  if (value === LoanStatus.ATRASADO) return "Atrasado";
  if (value === LoanStatus.QUITADO) return "Finalizado";
  if (value === LoanStatus.EM_DIA) return "Ativo";
  return "Pendente";
}

function normalizeInstallmentStatus(value: unknown): InstallmentStatus {
  const normalized = normalizeAsciiUpper(value);
  if (normalized === "PAGO") return InstallmentStatus.PAGO;
  if (normalized === "ATRASADO") return InstallmentStatus.ATRASADO;
  return InstallmentStatus.PENDENTE;
}

function mapInstallmentStatusToUi(value: InstallmentStatus): string {
  if (value === InstallmentStatus.PAGO) return "Pago";
  if (value === InstallmentStatus.ATRASADO) return "Atrasado";
  return "Pendente";
}

function normalizeInterestType(value: unknown): InterestType {
  const normalized = normalizeAsciiUpper(value);
  return normalized === "SIMPLES" ? InterestType.SIMPLES : InterestType.COMPOSTO;
}

function mapInterestTypeToUi(value: InterestType): string {
  return value === InterestType.SIMPLES ? "simples" : "composto";
}

function normalizePaymentMethod(value: unknown): PaymentMethod {
  const normalized = normalizeAsciiUpper(value);

  if (normalized === "DINHEIRO") return PaymentMethod.DINHEIRO;
  if (normalized === "TRANSFERENCIA") return PaymentMethod.TRANSFERENCIA;
  if (normalized === "PIX") return PaymentMethod.PIX;

  return PaymentMethod.PIX;
}

function mapPaymentMethodToUi(value: PaymentMethod): string {
  if (value === PaymentMethod.DINHEIRO) return "Dinheiro";
  if (value === PaymentMethod.TRANSFERENCIA) return "Transferência";
  return "Pix";
}

function computeLoanStatusFromInstallments(
  installments: Array<{ status: InstallmentStatus; dueDate: Date; paymentDate: Date | null }>,
): LoanStatus {
  if (installments.length === 0) return LoanStatus.PENDENTE;

  const now = new Date();
  const allPaid = installments.every((item) => item.status === InstallmentStatus.PAGO);
  if (allPaid) return LoanStatus.QUITADO;

  const hasOverdue = installments.some((item) => {
    if (item.status === InstallmentStatus.ATRASADO) return true;
    if (item.status === InstallmentStatus.PAGO) return false;
    return item.dueDate < now;
  });

  if (hasOverdue) return LoanStatus.ATRASADO;
  return LoanStatus.EM_DIA;
}

async function refreshLoanStatuses(tx: Prisma.TransactionClient, loanIds: number[]) {
  const uniqueLoanIds = [...new Set(loanIds.filter((id) => Number.isFinite(id)))];
  for (const loanId of uniqueLoanIds) {
    const items = await tx.installment.findMany({
      where: { loanId },
      select: { status: true, dueDate: true, paymentDate: true },
    });

    const nextStatus = computeLoanStatusFromInstallments(items);

    await tx.loan.update({
      where: { id: loanId },
      data: { status: nextStatus },
    });
  }
}

export async function getTableData(tableName: TableName) {
  if (tableName === "debtors") {
    const rows = await prisma.client.findMany({ orderBy: { id: "asc" } });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      cpf: row.cpf,
      document: row.cpf,
      email: row.email,
      status: mapClientStatusToUi(row.status),
      address: row.address,
      notes: row.notes,
      created_at: toIsoDate(row.createdAt),
    }));
  }

  if (tableName === "loans") {
    const rows = await prisma.loan.findMany({ orderBy: { id: "asc" } });
    return rows.map((row) => ({
      id: row.id,
      debtor_id: row.clientId,
      principal_amount: toNumber(row.principalAmount),
      total_amount: toNumber(row.totalAmount),
      installments_count: row.installmentsCount,
      interest_rate: toNumber(row.interestRate),
      interest_type: mapInterestTypeToUi(row.interestType),
      installment_amount: row.installmentAmount ? toNumber(row.installmentAmount) : null,
      payment_method: mapPaymentMethodToUi(row.paymentMethod),
      observations: row.observations,
      start_date: toIsoDate(row.startDate),
      first_due_date: toIsoDate(row.firstDueDate),
      due_date: toIsoDate(row.dueDate),
      status: mapLoanStatusToUi(row.status),
    }));
  }

  const rows = await prisma.installment.findMany({ orderBy: { id: "asc" } });
  return rows.map((row) => ({
    id: row.id,
    loan_id: row.loanId,
    debtor_id: row.clientId,
    installment_number: row.installmentNumber,
    due_date: toIsoDate(row.dueDate),
    payment_date: toIsoDate(row.paymentDate),
    amount: toNumber(row.amount),
    principal_amount: row.principalAmount ? toNumber(row.principalAmount) : null,
    interest_amount: row.interestAmount ? toNumber(row.interestAmount) : null,
    status: mapInstallmentStatusToUi(row.status),
    payment_method: row.paymentMethod ? mapPaymentMethodToUi(row.paymentMethod) : null,
    notes: row.notes,
  }));
}

export async function replaceTableData(tableName: TableName, rawRows: unknown[]) {
  if (tableName === "debtors") {
    const rows = asRows(rawRows);

    await prisma.$transaction(async (tx) => {
      const maxId = (await tx.client.aggregate({ _max: { id: true } }))._max.id ?? 0;
      let nextId = maxId + 1;

      const normalized = rows.map((row) => {
        const id = toInt(row.id) ?? nextId++;
        const cpfRaw = normalizeText(row.document ?? row.cpf);
        const cpf = cpfRaw || `CPF-${id}`;

        return {
          id,
          name: normalizeText(row.name) || `Cliente ${id}`,
          cpf,
          phone: normalizeText(row.phone),
          email: normalizeText(row.email) || null,
          status: normalizeClientStatus(row.status),
          address: normalizeText(row.address) || null,
          notes: normalizeText(row.notes) || null,
          createdAt: toDateOnly(row.created_at ?? row.createdAt ?? new Date()),
        };
      });

      const ids = normalized.map((row) => row.id);
      if (ids.length > 0) {
        await tx.client.deleteMany({ where: { id: { notIn: ids } } });
      } else {
        await tx.client.deleteMany();
      }

      for (const row of normalized) {
        await tx.client.upsert({
          where: { id: row.id },
          create: {
            id: row.id,
            name: row.name,
            cpf: row.cpf,
            phone: row.phone,
            email: row.email,
            status: row.status,
            address: row.address,
            notes: row.notes,
            createdAt: row.createdAt,
          },
          update: {
            name: row.name,
            cpf: row.cpf,
            phone: row.phone,
            email: row.email,
            status: row.status,
            address: row.address,
            notes: row.notes,
          },
        });
      }
    });

    return getTableData("debtors");
  }

  if (tableName === "loans") {
    const rows = asRows(rawRows);

    await prisma.$transaction(async (tx) => {
      const clientIds = new Set((await tx.client.findMany({ select: { id: true } })).map((item) => item.id));

      const maxId = (await tx.loan.aggregate({ _max: { id: true } }))._max.id ?? 0;
      let nextId = maxId + 1;

      const normalized = rows
        .map((row) => {
          const clientId = toInt(row.debtor_id ?? row.client_id ?? row.clientId);
          if (!clientId || !clientIds.has(clientId)) return null;

          const id = toInt(row.id) ?? nextId++;
          const startDate = toDateOnly(row.start_date ?? row.startDate ?? new Date());
          const firstDueDate = toDateOnly(row.first_due_date ?? row.firstDueDate ?? startDate);
          const dueDate = toDateOnly(row.due_date ?? row.dueDate ?? firstDueDate);

          return {
            id,
            clientId,
            principalAmount: toNumber(row.principal_amount ?? row.principalAmount),
            totalAmount: toNumber(row.total_amount ?? row.totalAmount),
            installmentsCount: Math.max(1, toInt(row.installments_count ?? row.installmentsCount) ?? 1),
            interestRate: toNumber(row.interest_rate ?? row.interestRate),
            interestType: normalizeInterestType(row.interest_type ?? row.interestType),
            installmentAmount: (() => {
              const value = row.installment_amount ?? row.installmentAmount;
              const amount = toNumber(value, Number.NaN);
              return Number.isFinite(amount) ? amount : null;
            })(),
            paymentMethod: normalizePaymentMethod(row.payment_method ?? row.paymentMethod),
            observations: normalizeText(row.observations ?? row.notes) || null,
            startDate,
            firstDueDate,
            dueDate,
            status: normalizeLoanStatus(row.status),
          };
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row));

      const ids = normalized.map((row) => row.id);
      if (ids.length > 0) {
        await tx.loan.deleteMany({ where: { id: { notIn: ids } } });
      } else {
        await tx.loan.deleteMany();
      }

      for (const row of normalized) {
        await tx.loan.upsert({
          where: { id: row.id },
          create: {
            id: row.id,
            clientId: row.clientId,
            principalAmount: row.principalAmount,
            totalAmount: row.totalAmount,
            installmentsCount: row.installmentsCount,
            interestRate: row.interestRate,
            interestType: row.interestType,
            installmentAmount: row.installmentAmount,
            paymentMethod: row.paymentMethod,
            observations: row.observations,
            startDate: row.startDate,
            firstDueDate: row.firstDueDate,
            dueDate: row.dueDate,
            status: row.status,
          },
          update: {
            clientId: row.clientId,
            principalAmount: row.principalAmount,
            totalAmount: row.totalAmount,
            installmentsCount: row.installmentsCount,
            interestRate: row.interestRate,
            interestType: row.interestType,
            installmentAmount: row.installmentAmount,
            paymentMethod: row.paymentMethod,
            observations: row.observations,
            startDate: row.startDate,
            firstDueDate: row.firstDueDate,
            dueDate: row.dueDate,
            status: row.status,
          },
        });
      }
    });

    return getTableData("loans");
  }

  const rows = asRows(rawRows);

  await prisma.$transaction(async (tx) => {
    const loans = await tx.loan.findMany({ select: { id: true, clientId: true, paymentMethod: true } });
    const loanMap = new Map(loans.map((loan) => [loan.id, loan]));

    const maxId = (await tx.installment.aggregate({ _max: { id: true } }))._max.id ?? 0;
    let nextId = maxId + 1;

    const normalized = rows
      .map((row) => {
        const loanId = toInt(row.loan_id ?? row.loanId);
        if (!loanId) return null;

        const loan = loanMap.get(loanId);
        if (!loan) return null;

        const id = toInt(row.id) ?? nextId++;
        const status = normalizeInstallmentStatus(row.status);
        const paymentMethodRaw = row.payment_method ?? row.paymentMethod;
        const paymentMethod = normalizeText(paymentMethodRaw)
          ? normalizePaymentMethod(paymentMethodRaw)
          : null;

        return {
          id,
          loanId,
          clientId: toInt(row.debtor_id ?? row.client_id ?? row.clientId) ?? loan.clientId,
          installmentNumber: Math.max(1, toInt(row.installment_number ?? row.installmentNumber) ?? 1),
          dueDate: toDateOnly(row.due_date ?? row.dueDate ?? new Date()),
          paymentDate: status === InstallmentStatus.PAGO ? toDateOnly(row.payment_date ?? row.paymentDate ?? new Date()) : null,
          amount: toNumber(row.amount),
          principalAmount: (() => {
            const raw = row.principal_amount ?? row.principalAmount;
            if (raw === null || raw === undefined || raw === "") return null;
            return toNumber(raw);
          })(),
          interestAmount: (() => {
            const raw = row.interest_amount ?? row.interestAmount;
            if (raw === null || raw === undefined || raw === "") return null;
            return toNumber(raw);
          })(),
          status,
          paymentMethod,
          notes: normalizeText(row.notes) || null,
          fallbackLoanMethod: loan.paymentMethod,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    const ids = normalized.map((row) => row.id);
    if (ids.length > 0) {
      await tx.installment.deleteMany({ where: { id: { notIn: ids } } });
    } else {
      await tx.installment.deleteMany();
      await tx.payment.deleteMany({ where: { installmentId: { not: null } } });
    }

    for (const row of normalized) {
      await tx.installment.upsert({
        where: { id: row.id },
        create: {
          id: row.id,
          loanId: row.loanId,
          clientId: row.clientId,
          installmentNumber: row.installmentNumber,
          dueDate: row.dueDate,
          paymentDate: row.paymentDate,
          amount: row.amount,
          principalAmount: row.principalAmount,
          interestAmount: row.interestAmount,
          status: row.status,
          paymentMethod: row.paymentMethod,
          notes: row.notes,
        },
        update: {
          loanId: row.loanId,
          clientId: row.clientId,
          installmentNumber: row.installmentNumber,
          dueDate: row.dueDate,
          paymentDate: row.paymentDate,
          amount: row.amount,
          principalAmount: row.principalAmount,
          interestAmount: row.interestAmount,
          status: row.status,
          paymentMethod: row.paymentMethod,
          notes: row.notes,
        },
      });

      if (row.status === InstallmentStatus.PAGO && row.paymentDate) {
        await tx.payment.upsert({
          where: { installmentId: row.id },
          create: {
            installmentId: row.id,
            loanId: row.loanId,
            amount: row.amount,
            paymentDate: row.paymentDate,
            method: row.paymentMethod ?? row.fallbackLoanMethod ?? PaymentMethod.PIX,
            notes: row.notes,
          },
          update: {
            loanId: row.loanId,
            amount: row.amount,
            paymentDate: row.paymentDate,
            method: row.paymentMethod ?? row.fallbackLoanMethod ?? PaymentMethod.PIX,
            notes: row.notes,
          },
        });
      } else {
        await tx.payment.deleteMany({ where: { installmentId: row.id } });
      }
    }

    await refreshLoanStatuses(
      tx,
      normalized.map((row) => row.loanId),
    );
  });

  return getTableData("installments");
}
