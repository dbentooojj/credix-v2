import { PaymentMethod, Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env";
import { requireAuthApi } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router = Router();

const dashboardQuerySchema = z.object({
  period: z.enum(["3m", "6m", "12m"]).optional(),
  metric: z.enum(["recebido", "emprestado", "lucro"]).optional(),
  tz: z.string().optional(),
});

type DashboardMetric = "recebido" | "emprestado" | "lucro";
type InstallmentDerivedStatus = "PAGA" | "ATRASADA" | "VENCE_HOJE" | "EM_DIA";

type InstallmentWithRefs = {
  id: number;
  loanId: number;
  clientId: number;
  installmentNumber: number;
  dueDate: Date;
  paymentMethod: PaymentMethod | null;
  amount: Prisma.Decimal;
  principalAmount: Prisma.Decimal | null;
  interestAmount: Prisma.Decimal | null;
  client: {
    id: number;
    name: string;
    phone: string;
  };
  loan: {
    id: number;
    principalAmount: Prisma.Decimal;
    totalAmount: Prisma.Decimal;
    paymentMethod: PaymentMethod;
  };
};

function toNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeTimeZone(rawTimeZone?: string): string {
  const fallback = "America/Sao_Paulo";
  const value = rawTimeZone?.trim();
  if (!value) return fallback;

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return value;
  } catch {
    return fallback;
  }
}

function dateToIso(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function dateToMonthKey(value: Date): string {
  return value.toISOString().slice(0, 7);
}

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return dateToIso(date);
}

function getIsoTodayInTimeZone(timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(new Date());
  const year = parts.find((item) => item.type === "year")?.value ?? "1970";
  const month = parts.find((item) => item.type === "month")?.value ?? "01";
  const day = parts.find((item) => item.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function buildMonthSeries(currentMonthKey: string, count: number): string[] {
  const [year, month] = currentMonthKey.split("-").map(Number);
  const base = new Date(Date.UTC(year, month - 1, 1));

  const keys: string[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const cursor = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - offset, 1));
    keys.push(dateToMonthKey(cursor));
  }

  return keys;
}

function getInstallmentStatus(
  dueDateIso: string,
  todayIso: string,
  paidAmount: number,
  installmentAmount: number,
): { status: InstallmentDerivedStatus; statusLabel: string; outstanding: number } {
  const epsilon = 0.009;
  const outstanding = Math.max(installmentAmount - paidAmount, 0);
  const isPaid = outstanding <= epsilon;

  if (isPaid) {
    return { status: "PAGA", statusLabel: "Pago", outstanding: 0 };
  }

  if (dueDateIso < todayIso) {
    return { status: "ATRASADA", statusLabel: "Em atraso", outstanding };
  }

  if (dueDateIso === todayIso) {
    return { status: "VENCE_HOJE", statusLabel: "Vence hoje", outstanding };
  }

  return { status: "EM_DIA", statusLabel: "Em dia", outstanding };
}

function getRelativeDueLabel(dueDateIso: string, todayIso: string): string {
  const dueDate = new Date(`${dueDateIso}T00:00:00Z`);
  const today = new Date(`${todayIso}T00:00:00Z`);
  const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays < 0) {
    const abs = Math.abs(diffDays);
    return abs === 1 ? "ha 1 dia" : `ha ${abs} dias`;
  }

  if (diffDays === 0) return "hoje";
  if (diffDays === 1) return "em 1 dia";
  return `em ${diffDays} dias`;
}

router.use(requireAuthApi);

router.get("/", async (req, res) => {
  const userId = Number(req.user?.sub);
  if (!Number.isFinite(userId)) {
    return res.status(401).json({ message: "Nao autenticado" });
  }

  const parsedQuery = dashboardQuerySchema.parse(req.query);
  const period = parsedQuery.period ?? "6m";
  const metric = parsedQuery.metric ?? "recebido";
  const timeZone = normalizeTimeZone(parsedQuery.tz);

  const todayIso = getIsoTodayInTimeZone(timeZone);
  const currentMonthKey = todayIso.slice(0, 7);
  const monthCount = period === "3m" ? 3 : period === "12m" ? 12 : 6;
  const monthKeys = buildMonthSeries(currentMonthKey, monthCount);
  const next7Iso = addDays(todayIso, 7);

  const [loans, installments, payments] = await Promise.all([
    prisma.loan.findMany({
      where: { ownerUserId: userId },
      select: {
        id: true,
        principalAmount: true,
        totalAmount: true,
      },
    }),
    prisma.installment.findMany({
      where: { ownerUserId: userId },
      select: {
        id: true,
        loanId: true,
        clientId: true,
        installmentNumber: true,
        dueDate: true,
        paymentMethod: true,
        amount: true,
        principalAmount: true,
        interestAmount: true,
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        loan: {
          select: {
            id: true,
            principalAmount: true,
            totalAmount: true,
            paymentMethod: true,
          },
        },
      },
    }) as Promise<InstallmentWithRefs[]>,
    prisma.payment.findMany({
      where: { ownerUserId: userId },
      select: {
        id: true,
        loanId: true,
        installmentId: true,
        amount: true,
        paymentDate: true,
      },
    }),
  ]);

  const monthKeySet = new Set(monthKeys);
  const paymentByInstallment = new Map<number, number>();
  const receivedByMonth = new Map<string, number>();
  let totalReceived = 0;
  let receivedThisMonth = 0;

  payments.forEach((payment) => {
    const paymentAmount = toNumber(payment.amount);
    const paymentMonthKey = dateToMonthKey(payment.paymentDate);
    totalReceived += paymentAmount;
    if (paymentMonthKey === currentMonthKey) {
      receivedThisMonth += paymentAmount;
    }
    if (monthKeySet.has(paymentMonthKey)) {
      receivedByMonth.set(paymentMonthKey, (receivedByMonth.get(paymentMonthKey) ?? 0) + paymentAmount);
    }

    if (payment.installmentId) {
      paymentByInstallment.set(
        payment.installmentId,
        (paymentByInstallment.get(payment.installmentId) ?? 0) + paymentAmount,
      );
    }
  });

  const totalLoaned = loans.reduce((sum, loan) => sum + toNumber(loan.principalAmount), 0);
  const totalExpected = loans.reduce((sum, loan) => sum + toNumber(loan.totalAmount), 0);

  let totalOverdue = 0;
  let principalReceived = 0;
  let interestReceived = 0;
  let hasExplicitInterestBreakdown = false;

  let dueTodayCount = 0;
  let dueTodayValue = 0;
  let overdueCount = 0;
  let overdueValue = 0;
  let next7Count = 0;
  let next7Value = 0;
  const overdueByMonth = new Map<string, number>();
  const openByMonth = new Map<string, number>();

  const upcomingCandidates: Array<{
    installmentId: number;
    loanId: number;
    debtorId: number;
    debtorName: string;
    phone: string;
    paymentMethod: PaymentMethod;
    amount: number;
    dueDate: string;
    dueRelative: string;
    status: "ATRASADA" | "VENCE_HOJE" | "EM_DIA";
    statusLabel: string;
    statusColor: "red" | "yellow" | "green";
  }> = [];

  const overdueByDebtor = new Map<number, { debtorName: string; total: number; count: number }>();

  installments.forEach((installment) => {
    const dueDateIso = dateToIso(installment.dueDate);
    const amount = toNumber(installment.amount);
    const paidAmount = paymentByInstallment.get(installment.id) ?? 0;

    const current = getInstallmentStatus(dueDateIso, todayIso, paidAmount, amount);
    const outstanding = current.outstanding;
    const monthKey = dueDateIso.slice(0, 7);

    if (outstanding > 0 && monthKeySet.has(monthKey)) {
      if (current.status === "ATRASADA") {
        overdueByMonth.set(monthKey, (overdueByMonth.get(monthKey) ?? 0) + outstanding);
      } else if (current.status === "EM_DIA" || current.status === "VENCE_HOJE") {
        openByMonth.set(monthKey, (openByMonth.get(monthKey) ?? 0) + outstanding);
      }
    }

    if (current.status !== "PAGA" && dueDateIso <= next7Iso) {
      const statusColor = current.status === "ATRASADA" ? "red" : current.status === "VENCE_HOJE" ? "yellow" : "green";

      upcomingCandidates.push({
        installmentId: installment.id,
        loanId: installment.loanId,
        debtorId: installment.clientId,
        debtorName: installment.client.name,
        phone: installment.client.phone,
        paymentMethod: installment.paymentMethod ?? installment.loan.paymentMethod ?? PaymentMethod.PIX,
        amount,
        dueDate: dueDateIso,
        dueRelative: getRelativeDueLabel(dueDateIso, todayIso),
        status: current.status,
        statusLabel: current.statusLabel,
        statusColor,
      });
    }

    if (current.status === "ATRASADA") {
      totalOverdue += outstanding;
      overdueCount += 1;
      overdueValue += outstanding;

      const previous = overdueByDebtor.get(installment.clientId) ?? {
        debtorName: installment.client.name,
        total: 0,
        count: 0,
      };
      previous.total += outstanding;
      previous.count += 1;
      overdueByDebtor.set(installment.clientId, previous);
    }

    if (current.status === "VENCE_HOJE") {
      dueTodayCount += 1;
      dueTodayValue += outstanding;
    }

    if (current.status === "EM_DIA" && dueDateIso > todayIso && dueDateIso <= next7Iso) {
      next7Count += 1;
      next7Value += outstanding;
    }

    if (paidAmount > 0) {
      const loanPrincipal = toNumber(installment.loan.principalAmount);
      const loanTotal = toNumber(installment.loan.totalAmount);
      const defaultPrincipalShare = loanTotal > 0 ? amount * (loanPrincipal / loanTotal) : amount;

      const principalComponent = installment.principalAmount !== null
        ? toNumber(installment.principalAmount)
        : defaultPrincipalShare;

      const interestComponent = installment.interestAmount !== null
        ? toNumber(installment.interestAmount)
        : Math.max(amount - principalComponent, 0);

      if (installment.principalAmount !== null || installment.interestAmount !== null) {
        hasExplicitInterestBreakdown = true;
      }

      principalReceived += Math.min(paidAmount, Math.max(principalComponent, 0));
      interestReceived += Math.min(
        Math.max(paidAmount - Math.min(paidAmount, Math.max(principalComponent, 0)), 0),
        Math.max(interestComponent, 0),
      );
    }
  });

  const totalToReceive = Math.max(totalExpected - totalReceived, 0);
  const delinquencyRate = totalToReceive > 0 ? (totalOverdue / totalToReceive) * 100 : 0;
  const profitTotal = hasExplicitInterestBreakdown
    ? Math.max(interestReceived, 0)
    : Math.max(totalReceived - principalReceived, 0);
  const roiRate = totalLoaned > 0 ? (profitTotal / totalLoaned) * 100 : 0;

  const chartPoints = monthKeys.map((monthKey) => ({
    month: monthKey,
    label: monthLabel(monthKey),
    value: receivedByMonth.get(monthKey) ?? 0,
    received: receivedByMonth.get(monthKey) ?? 0,
    overdue: overdueByMonth.get(monthKey) ?? 0,
    open: openByMonth.get(monthKey) ?? 0,
  }));

  const hasChartData = chartPoints.some(
    (point) => point.received > 0 || point.overdue > 0 || point.open > 0,
  );

  const upcomingDue = upcomingCandidates
    .filter((item) => item.status !== "ATRASADA")
    .sort((a, b) => {
      if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      return a.debtorName.localeCompare(b.debtorName);
    })
    .map((item) => ({
      ...item,
      pixKey: env.PIX_KEY ?? null,
      paymentLink: env.PAYMENT_LINK ?? null,
    }));

  const overduePayments = upcomingCandidates
    .filter((item) => item.status === "ATRASADA")
    .sort((a, b) => {
      if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      return a.debtorName.localeCompare(b.debtorName);
    })
    .map((item) => ({
      ...item,
      pixKey: env.PIX_KEY ?? null,
      paymentLink: env.PAYMENT_LINK ?? null,
    }));

  const ranking = [...overdueByDebtor.entries()]
    .map(([debtorId, data]) => ({
      debtorId,
      debtorName: data.debtorName,
      totalOverdue: data.total,
      installmentsCount: data.count,
      href: `/admin/debtors.html?debtorId=${debtorId}`,
    }))
    .sort((a, b) => b.totalOverdue - a.totalOverdue)
    .slice(0, 3);

  return res.json({
    meta: {
      generatedAt: new Date().toISOString(),
      timezone: timeZone,
      period,
      metric,
    },
    kpis: {
      totalLoaned,
      totalToReceive,
      totalReceived,
      receivedThisMonth,
      totalOverdue,
      profitTotal,
      roiRate,
      delinquencyRate,
    },
    dailySummary: {
      dueToday: {
        count: dueTodayCount,
        totalValue: dueTodayValue,
        href: "/admin/installments.html?status=pending&due=today",
      },
      overdue: {
        count: overdueCount,
        totalValue: overdueValue,
        href: "/admin/installments.html?status=overdue",
      },
      next7Days: {
        count: next7Count,
        totalValue: next7Value,
        href: "/admin/installments.html?status=pending&due=next7",
      },
    },
    chart: {
      metric,
      period,
      points: chartPoints,
      hasData: hasChartData,
      emptyMessage: "Sem dados no periodo.",
    },
    upcomingDue,
    overduePayments,
    ranking,
  });
});

export { router as dashboardRoutes };
