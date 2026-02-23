import { PaymentMethod, Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env";
import {
  addDays,
  dateToIso,
  dateToMonthKey,
  getIsoTodayInTimeZone,
  normalizeTimeZone,
} from "../lib/date-time";
import { toSafeNumber } from "../lib/numbers";
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
type KpiInsightTone = "positive" | "negative" | "neutral";
type KpiInsight = { text: string; tone: KpiInsightTone };

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
    startDate: Date;
  };
};

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" }).format(date);
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

function getPreviousMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const cursor = new Date(Date.UTC(year, month - 2, 1));
  return dateToMonthKey(cursor);
}

function getMonthEndIso(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const monthEnd = new Date(Date.UTC(year, month, 0));
  return dateToIso(monthEnd);
}

function formatCurrencyPtBr(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercentPtBr(value: number): string {
  return Math.abs(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
  const previousMonthKey = getPreviousMonthKey(currentMonthKey);
  const monthCount = period === "3m" ? 3 : period === "12m" ? 12 : 6;
  const monthKeys = buildMonthSeries(currentMonthKey, monthCount);
  const sparklineMonthKeys = buildMonthSeries(currentMonthKey, 6);
  const next7Iso = addDays(todayIso, 7);

  const [loans, installments, payments] = await Promise.all([
    prisma.loan.findMany({
      where: { ownerUserId: userId },
      select: {
        id: true,
        principalAmount: true,
        totalAmount: true,
        startDate: true,
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
            startDate: true,
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
  const paymentMetaByInstallment = new Map<number, { amount: number; paymentDateIso: string; monthKey: string }>();
  const receivedByMonth = new Map<string, number>();
  const receivedByMonthAll = new Map<string, number>();
  const loanedByMonthAll = new Map<string, number>();
  const profitByMonthAll = new Map<string, number>();
  let totalReceived = 0;
  let receivedThisMonth = 0;

  payments.forEach((payment) => {
    const paymentAmount = toSafeNumber(payment.amount);
    const paymentDateIso = dateToIso(payment.paymentDate);
    const paymentMonthKey = dateToMonthKey(payment.paymentDate);
    totalReceived += paymentAmount;
    if (paymentMonthKey === currentMonthKey) {
      receivedThisMonth += paymentAmount;
    }
    receivedByMonthAll.set(paymentMonthKey, (receivedByMonthAll.get(paymentMonthKey) ?? 0) + paymentAmount);
    if (monthKeySet.has(paymentMonthKey)) {
      receivedByMonth.set(paymentMonthKey, (receivedByMonth.get(paymentMonthKey) ?? 0) + paymentAmount);
    }

    if (payment.installmentId) {
      paymentByInstallment.set(
        payment.installmentId,
        (paymentByInstallment.get(payment.installmentId) ?? 0) + paymentAmount,
      );
      paymentMetaByInstallment.set(payment.installmentId, {
        amount: paymentAmount,
        paymentDateIso,
        monthKey: paymentMonthKey,
      });
    }
  });

  loans.forEach((loan) => {
    const monthKey = dateToMonthKey(loan.startDate);
    const principal = toSafeNumber(loan.principalAmount);
    loanedByMonthAll.set(monthKey, (loanedByMonthAll.get(monthKey) ?? 0) + principal);
  });

  const totalLoaned = loans.reduce((sum, loan) => sum + toSafeNumber(loan.principalAmount), 0);
  const totalExpected = loans.reduce((sum, loan) => sum + toSafeNumber(loan.totalAmount), 0);

  let totalOverdue = 0;
  let principalReceived = 0;
  let interestReceived = 0;
  let hasExplicitInterestBreakdown = false;

  let dueTodayCount = 0;
  let dueTodayValue = 0;
  let overdueCurrentMonthCount = 0;
  let overdueCurrentMonthValue = 0;
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
    const amount = toSafeNumber(installment.amount);
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
      if (monthKey === currentMonthKey) {
        overdueCurrentMonthCount += 1;
        overdueCurrentMonthValue += outstanding;
      }

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
      const loanPrincipal = toSafeNumber(installment.loan.principalAmount);
      const loanTotal = toSafeNumber(installment.loan.totalAmount);
      const defaultPrincipalShare = loanTotal > 0 ? amount * (loanPrincipal / loanTotal) : amount;

      const principalComponent = installment.principalAmount !== null
        ? toSafeNumber(installment.principalAmount)
        : defaultPrincipalShare;

      const interestComponent = installment.interestAmount !== null
        ? toSafeNumber(installment.interestAmount)
        : Math.max(amount - principalComponent, 0);

      if (installment.principalAmount !== null || installment.interestAmount !== null) {
        hasExplicitInterestBreakdown = true;
      }

      const principalPaid = Math.min(paidAmount, Math.max(principalComponent, 0));
      const interestPaid = Math.min(
        Math.max(paidAmount - principalPaid, 0),
        Math.max(interestComponent, 0),
      );

      principalReceived += principalPaid;
      interestReceived += interestPaid;

      const paymentMeta = paymentMetaByInstallment.get(installment.id);
      if (paymentMeta) {
        profitByMonthAll.set(
          paymentMeta.monthKey,
          (profitByMonthAll.get(paymentMeta.monthKey) ?? 0) + interestPaid,
        );
      }
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

  const buildMonthlySeries = (keys: string[], source: Map<string, number>): number[] => (
    keys.map((monthKey) => source.get(monthKey) ?? 0)
  );

  const buildCumulativeSeriesFromFlows = (currentTotal: number, monthlyFlows: number[]): number[] => {
    const sumFlows = monthlyFlows.reduce((sum, value) => sum + value, 0);
    const base = Math.max(currentTotal - sumFlows, 0);
    const series: number[] = [];
    let running = base;
    monthlyFlows.forEach((value) => {
      running += value;
      series.push(running);
    });
    return series;
  };

  const toSparklinePoints = (keys: string[], values: number[]) => keys.map((monthKey, index) => ({
    month: monthKey,
    label: monthLabel(monthKey),
    value: values[index] ?? 0,
  }));

  const computeSnapshotAt = (asOfIso: string): { toReceive: number; overdue: number } => {
    let toReceiveAtReference = 0;
    let overdueAtReference = 0;

    installments.forEach((installment) => {
      const loanStartIso = dateToIso(installment.loan.startDate);
      if (loanStartIso > asOfIso) return;

      const dueDateIso = dateToIso(installment.dueDate);
      const installmentAmount = toSafeNumber(installment.amount);
      const paymentMeta = paymentMetaByInstallment.get(installment.id);
      const paidAmountAtReference = paymentMeta && paymentMeta.paymentDateIso <= asOfIso
        ? paymentMeta.amount
        : 0;
      const outstandingAtReference = Math.max(installmentAmount - paidAmountAtReference, 0);
      if (outstandingAtReference <= 0) return;

      toReceiveAtReference += outstandingAtReference;
      if (dueDateIso < asOfIso) {
        overdueAtReference += outstandingAtReference;
      }
    });

    return { toReceive: toReceiveAtReference, overdue: overdueAtReference };
  };

  const sparklineSnapshotByMonth = new Map<string, { toReceive: number; overdue: number }>();
  sparklineMonthKeys.forEach((monthKey) => {
    if (monthKey === currentMonthKey) {
      sparklineSnapshotByMonth.set(monthKey, {
        toReceive: totalToReceive,
        overdue: totalOverdue,
      });
      return;
    }

    sparklineSnapshotByMonth.set(monthKey, computeSnapshotAt(getMonthEndIso(monthKey)));
  });

  const previousSnapshot = sparklineSnapshotByMonth.get(previousMonthKey)
    ?? computeSnapshotAt(getMonthEndIso(previousMonthKey));

  const receivedMonthlySeries = buildMonthlySeries(sparklineMonthKeys, receivedByMonthAll);
  const loanedMonthlyFlows = buildMonthlySeries(sparklineMonthKeys, loanedByMonthAll);
  const profitMonthlyFlows = buildMonthlySeries(sparklineMonthKeys, profitByMonthAll);
  const totalToReceiveSeries = sparklineMonthKeys.map((monthKey) => sparklineSnapshotByMonth.get(monthKey)?.toReceive ?? 0);
  const totalOverdueSeries = sparklineMonthKeys.map((monthKey) => sparklineSnapshotByMonth.get(monthKey)?.overdue ?? 0);
  const totalReceivedSeries = buildCumulativeSeriesFromFlows(totalReceived, receivedMonthlySeries);
  const totalLoanedSeries = buildCumulativeSeriesFromFlows(totalLoaned, loanedMonthlyFlows);
  const profitTotalSeries = buildCumulativeSeriesFromFlows(profitTotal, profitMonthlyFlows);
  const epsilon = 0.00001;

  const previousCumulativeValue = (series: number[]): number => (
    series.length >= 2 ? series[series.length - 2] : 0
  );

  const buildProjectionInsight = (projectionValue: number, previousValue: number): KpiInsight => {
    if (Math.abs(previousValue) < epsilon) {
      if (Math.abs(projectionValue) < epsilon) {
        return {
          tone: "neutral",
          text: `Projecao: ${formatCurrencyPtBr(projectionValue)} (0,00% vs mes anterior)`,
        };
      }

      return {
        tone: projectionValue >= 0 ? "positive" : "negative",
        text: `Projecao: ${formatCurrencyPtBr(projectionValue)} (sem base comparativa no mes anterior)`,
      };
    }

    const pct = ((projectionValue - previousValue) / Math.abs(previousValue)) * 100;
    if (Math.abs(pct) < 0.005) {
      return {
        tone: "neutral",
        text: `Projecao: ${formatCurrencyPtBr(projectionValue)} (0,00% vs mes anterior)`,
      };
    }

    return {
      tone: pct > 0 ? "positive" : "negative",
      text: `Projecao: ${formatCurrencyPtBr(projectionValue)} (${pct > 0 ? "↑" : "↓"} ${formatPercentPtBr(pct)}% vs mes anterior)`,
    };
  };

  const buildOverdueLast30Insight = (currentValue: number, value30DaysAgo: number): KpiInsight => {
    if (Math.abs(value30DaysAgo) < epsilon) {
      if (Math.abs(currentValue) < epsilon) {
        return {
          tone: "neutral",
          text: "0,00% vs ultimos 30 dias",
        };
      }

      return {
        tone: "negative",
        text: "↑ sem base comparativa vs ultimos 30 dias",
      };
    }

    const pct = ((currentValue - value30DaysAgo) / Math.abs(value30DaysAgo)) * 100;
    if (Math.abs(pct) < 0.005) {
      return {
        tone: "neutral",
        text: "0,00% vs ultimos 30 dias",
      };
    }

    return {
      tone: pct < 0 ? "positive" : "negative",
      text: `${pct > 0 ? "↑" : "↓"} ${formatPercentPtBr(pct)}% vs ultimos 30 dias`,
    };
  };

  const buildProfitAverage3MInsight = (currentMonthProfit: number, average3Months: number): KpiInsight => {
    if (Math.abs(average3Months) < epsilon) {
      if (Math.abs(currentMonthProfit) < epsilon) {
        return {
          tone: "neutral",
          text: `Lucro do mes: ${formatCurrencyPtBr(currentMonthProfit)} (sem historico 3M)`,
        };
      }

      return {
        tone: currentMonthProfit > 0 ? "positive" : "negative",
        text: `Lucro do mes: ${formatCurrencyPtBr(currentMonthProfit)} (sem base comparativa 3M)`,
      };
    }

    const pct = ((currentMonthProfit - average3Months) / Math.abs(average3Months)) * 100;
    if (Math.abs(pct) < 0.005) {
      return {
        tone: "neutral",
        text: `Lucro do mes: ${formatCurrencyPtBr(currentMonthProfit)} (0,00% vs media 3M)`,
      };
    }

    return {
      tone: pct > 0 ? "positive" : "negative",
      text: `Lucro do mes: ${formatCurrencyPtBr(currentMonthProfit)} (${pct > 0 ? "↑" : "↓"} ${formatPercentPtBr(pct)}% vs media 3M)`,
    };
  };

  const [currentYear, currentMonth, currentDay] = todayIso.split("-").map(Number);
  const daysInCurrentMonth = new Date(Date.UTC(currentYear, currentMonth, 0)).getUTCDate();
  const elapsedDays = Math.min(Math.max(currentDay, 1), daysInCurrentMonth);
  const projectedReceivedThisMonth = elapsedDays > 0
    ? (receivedThisMonth / elapsedDays) * daysInCurrentMonth
    : receivedThisMonth;
  const previousMonthReceived = receivedByMonthAll.get(previousMonthKey) ?? 0;
  const overdueSnapshot30Days = computeSnapshotAt(addDays(todayIso, -30));
  const overdue30DaysAgo = overdueSnapshot30Days.overdue;

  const previous3MonthKeys = buildMonthSeries(previousMonthKey, 3);
  const previous3MonthProfitAverage = previous3MonthKeys.length
    ? previous3MonthKeys.reduce((sum, monthKey) => sum + (profitByMonthAll.get(monthKey) ?? 0), 0) / previous3MonthKeys.length
    : 0;
  const currentMonthProfit = profitByMonthAll.get(currentMonthKey) ?? 0;

  const receivedProjectionInsight = buildProjectionInsight(projectedReceivedThisMonth, previousMonthReceived);
  const overdueLast30Insight = buildOverdueLast30Insight(totalOverdue, overdue30DaysAgo);
  const profitAverageInsight = buildProfitAverage3MInsight(currentMonthProfit, previous3MonthProfitAverage);

  const kpiCards = {
    totalToReceive: {
      currentValue: totalToReceive,
      previousValue: previousSnapshot.toReceive,
      series: toSparklinePoints(sparklineMonthKeys, totalToReceiveSeries),
    },
    totalOverdue: {
      currentValue: totalOverdue,
      previousValue: previousSnapshot.overdue,
      series: toSparklinePoints(sparklineMonthKeys, totalOverdueSeries),
      insight: overdueLast30Insight,
    },
    receivedThisMonth: {
      currentValue: receivedThisMonth,
      previousValue: receivedByMonthAll.get(previousMonthKey) ?? 0,
      series: toSparklinePoints(sparklineMonthKeys, receivedMonthlySeries),
      insight: receivedProjectionInsight,
    },
    totalLoaned: {
      currentValue: totalLoaned,
      previousValue: previousCumulativeValue(totalLoanedSeries),
      series: toSparklinePoints(sparklineMonthKeys, totalLoanedSeries),
    },
    profitTotal: {
      currentValue: profitTotal,
      previousValue: previousCumulativeValue(profitTotalSeries),
      series: toSparklinePoints(sparklineMonthKeys, profitTotalSeries),
      insight: profitAverageInsight,
    },
    totalReceived: {
      currentValue: totalReceived,
      previousValue: previousCumulativeValue(totalReceivedSeries),
      series: toSparklinePoints(sparklineMonthKeys, totalReceivedSeries),
    },
  };

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
    kpiCards,
    dailySummary: {
      dueToday: {
        count: dueTodayCount,
        totalValue: dueTodayValue,
        href: "/admin/installments.html?status=pending&due=today",
      },
      overdue: {
        count: overdueCurrentMonthCount,
        totalValue: overdueCurrentMonthValue,
        href: "/admin/installments.html?status=overdue&due=month",
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
