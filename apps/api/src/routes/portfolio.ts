import { Router } from "express";
import { z } from "zod";
import { handleAsync } from "../lib/async-route";
import { listFinanceTransactions } from "../lib/finance-repository";
import {
  type PortfolioInstallment,
  type PortfolioLoan,
} from "../lib/portfolio-store";
import {
  createPortfolioLoan,
  getPortfolioInstallment,
  getPortfolioLoan,
  listPortfolioInstallments,
  listPortfolioLoanSimulations,
  listPortfolioLoans,
  replacePortfolioLoanInstallments,
  updatePortfolioInstallment,
  updatePortfolioLoan,
} from "../lib/portfolio-repository";

const router = Router();

const TIME_ZONE = "America/Sao_Paulo";
const BASE_CASH_BALANCE = 440.88;

const portfolioQuerySchema = z.object({
  period: z.enum(["3m", "6m", "12m"]).default("6m"),
  tz: z.string().trim().min(1).default(TIME_ZONE),
});

const installmentUpdateSchema = z.object({
  status: z.enum(["pending", "completed"]).optional(),
  paidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  principalAmount: z.number().nonnegative().optional(),
  interestAmount: z.number().nonnegative().optional(),
});

const customerParamsSchema = z.object({
  id: z.string().trim().min(1),
});

const loanParamsSchema = z.object({
  id: z.string().trim().min(1),
});

const loanMutationSchema = z.object({
  customerName: z.string().trim().min(1),
  principalAmount: z.number().positive(),
  interestType: z.enum(["simples", "composto", "fixo"]),
  interestRate: z.number().min(0),
  fixedFeeAmount: z.number().min(0),
  installmentsCount: z.number().int().positive().max(96),
  issuedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  firstDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  observations: z.string().max(1000).optional().default(""),
});

function formatDateOnlyInTimeZone(date: Date, timeZone: string) {
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

function addDays(date: Date, diff: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + diff);
  return next;
}

function parseDateOnly(value: string) {
  return new Date(`${value}T12:00:00Z`);
}

function startOfMonth(date: Date) {
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), 1, 12, 0, 0);
}

function addMonths(date: Date, diff: number) {
  return new Date(date.getUTCFullYear(), date.getUTCMonth() + diff, 1, 12, 0, 0);
}

function formatMonthLabel(date: Date, timeZone: string) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    timeZone,
  }).format(date).replace(".", "");

  return label.replace(/^\p{L}/u, (character) => character.toUpperCase());
}

function sumAmounts<T>(items: T[], selector: (item: T) => number) {
  return items.reduce((total, item) => total + selector(item), 0);
}

function uniqueCount(values: string[]) {
  return new Set(values).size;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function buildTimingLabel(item: PortfolioInstallment, todayDate: string) {
  const diffInDays = Math.round((parseDateOnly(item.dueDate).getTime() - parseDateOnly(todayDate).getTime()) / 86400000);

  if (diffInDays === 0) return "Vence hoje";
  if (diffInDays > 0) return `Vence em ${diffInDays} dia(s)`;

  return `${Math.abs(diffInDays)} dia(s) de atraso`;
}

function buildInstallmentItem(item: PortfolioInstallment, todayDate: string) {
  return {
    id: item.id,
    customerName: item.customerName,
    loanLabel: `Contrato #${item.loanId}`,
    installmentLabel: `Parcela ${item.installmentNumber}/${item.totalInstallments}`,
    amount: item.amount,
    dueDate: item.dueDate,
    timingLabel: buildTimingLabel(item, todayDate),
  };
}

function getInstallmentDisplayStatus(item: PortfolioInstallment, todayDate: string) {
  if (item.status === "completed") return "paid" as const;
  if (item.dueDate < todayDate) return "overdue" as const;
  if (item.dueDate === todayDate) return "due-today" as const;
  return "pending" as const;
}

function getInstallmentDisplayStatusLabel(status: ReturnType<typeof getInstallmentDisplayStatus>) {
  return {
    paid: "Pago",
    overdue: "Em atraso",
    "due-today": "Vence hoje",
    pending: "Pendente",
  }[status];
}

function getInstallmentStatusRank(status: ReturnType<typeof getInstallmentDisplayStatus>) {
  return {
    overdue: 0,
    "due-today": 1,
    pending: 2,
    paid: 3,
  }[status];
}

function getLoanSimulationStatusLabel(status: string) {
  return {
    DRAFT: "Rascunho",
    SENT: "Enviada",
    ACCEPTED: "Aceita",
    EXPIRED: "Expirada",
    CANCELED: "Cancelada",
  }[status] || status;
}

function getCustomerStatus(overdueCount: number, nextDueDate: string | null, todayDate: string) {
  if (overdueCount > 0) return "overdue" as const;
  if (!nextDueDate) return "healthy" as const;

  const days = diffDays(nextDueDate, todayDate);
  if (days <= 7) return "watch" as const;

  return "healthy" as const;
}

function getCustomerStatusLabel(status: ReturnType<typeof getCustomerStatus>) {
  return {
    overdue: "Em atraso",
    watch: "Atencao",
    healthy: "Em dia",
  }[status];
}

function getCustomerStatusRank(status: ReturnType<typeof getCustomerStatus>) {
  return {
    overdue: 0,
    watch: 1,
    healthy: 2,
  }[status];
}

function normalizeCustomerId(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");
}

function diffDays(leftDate: string, rightDate: string) {
  return Math.round((parseDateOnly(leftDate).getTime() - parseDateOnly(rightDate).getTime()) / 86400000);
}

function buildInstallmentTimingLabel(item: PortfolioInstallment, todayDate: string) {
  const status = getInstallmentDisplayStatus(item, todayDate);
  const days = diffDays(item.dueDate, todayDate);

  if (status === "paid") {
    return item.paidDate ? `Pago em ${item.paidDate}` : "Pago";
  }

  if (status === "due-today") return "Vence hoje";
  if (status === "overdue") return `${Math.abs(days)} dia(s) de atraso`;

  return `Vence em ${days} dia(s)`;
}

function buildInstallmentRecord(item: PortfolioInstallment, todayDate: string) {
  const displayStatus = getInstallmentDisplayStatus(item, todayDate);

  return {
    id: item.id,
    loanId: item.loanId,
    customerName: item.customerName,
    loanLabel: `Contrato #${item.loanId}`,
    installmentLabel: `Parcela ${item.installmentNumber}/${item.totalInstallments}`,
    installmentNumber: item.installmentNumber,
    totalInstallments: item.totalInstallments,
    dueDate: item.dueDate,
    paidDate: item.paidDate,
    amount: item.amount,
    principalAmount: item.principalAmount,
    interestAmount: item.interestAmount,
    status: displayStatus,
    statusLabel: getInstallmentDisplayStatusLabel(displayStatus),
    timingLabel: buildInstallmentTimingLabel(item, todayDate),
  };
}

function buildCustomerRecord(
  customerName: string,
  loans: PortfolioLoan[],
  installments: PortfolioInstallment[],
  todayDate: string,
  currentMonth: string,
) {
  const customerLoans = loans.filter((item) => item.customerName === customerName);
  const customerInstallments = installments.filter((item) => item.customerName === customerName);
  const completedInstallments = customerInstallments.filter((item) => item.status === "completed");
  const openInstallments = customerInstallments.filter((item) => item.status !== "completed");
  const overdueInstallments = openInstallments.filter((item) => item.dueDate < todayDate);
  const nextInstallment = [...openInstallments]
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate) || right.amount - left.amount)[0];
  const lastPaidInstallment = [...completedInstallments]
    .filter((item) => Boolean(item.paidDate))
    .sort((left, right) => String(right.paidDate).localeCompare(String(left.paidDate)))[0];
  const status = getCustomerStatus(overdueInstallments.length, nextInstallment?.dueDate || null, todayDate);
  const nextDueDiff = nextInstallment?.dueDate ? diffDays(nextInstallment.dueDate, todayDate) : null;
  const activeContractIds = new Set(openInstallments.map((item) => item.loanId));
  const receivedThisMonth = completedInstallments
    .filter((item) => item.paidDate?.startsWith(currentMonth));

  return {
    id: normalizeCustomerId(customerName),
    customerName,
    contractCount: customerLoans.length,
    activeContracts: activeContractIds.size,
    totalLoaned: sumAmounts(customerLoans, (item) => item.principalAmount),
    openBalance: sumAmounts(openInstallments, (item) => item.amount),
    overdueBalance: sumAmounts(overdueInstallments, (item) => item.amount),
    receivedThisMonth: sumAmounts(receivedThisMonth, (item) => item.amount),
    receivedTotal: sumAmounts(completedInstallments, (item) => item.amount),
    openInstallments: openInstallments.length,
    overdueInstallments: overdueInstallments.length,
    paidInstallments: completedInstallments.length,
    nextDueDate: nextInstallment?.dueDate || null,
    lastPaymentDate: lastPaidInstallment?.paidDate || null,
    status,
    statusLabel: getCustomerStatusLabel(status),
    statusNote: overdueInstallments.length > 0
      ? `${overdueInstallments.length} parcela(s) em atraso`
      : nextDueDiff === null
        ? "Sem parcelas em aberto"
        : nextDueDiff === 0
          ? "Vencimento hoje"
          : nextDueDiff > 0 && nextDueDiff <= 7
            ? `Proximo vencimento em ${nextDueDiff} dia(s)`
            : "Carteira em dia",
  };
}

function buildLoanDetailRecord(
  loan: PortfolioLoan,
  installments: PortfolioInstallment[],
  todayDate: string,
) {
  const loanInstallments = installments.filter((item) => item.loanId === loan.id);
  const openInstallments = loanInstallments.filter((item) => item.status !== "completed");
  const overdueInstallments = openInstallments.filter((item) => item.dueDate < todayDate);
  const paidInstallments = loanInstallments.filter((item) => item.status === "completed");
  const nextDue = [...openInstallments]
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate) || right.amount - left.amount)[0];

  return {
    id: loan.id,
    loanLabel: `Contrato #${loan.id}`,
    issuedAt: loan.issuedAt,
    principalAmount: loan.principalAmount,
    installmentCount: loanInstallments.length,
    openInstallments: openInstallments.length,
    paidInstallments: paidInstallments.length,
    overdueInstallments: overdueInstallments.length,
    openBalance: sumAmounts(openInstallments, (item) => item.amount),
    overdueBalance: sumAmounts(overdueInstallments, (item) => item.amount),
    nextDueDate: nextDue?.dueDate || null,
  };
}

function buildLoanRecord(
  loan: PortfolioLoan,
  installments: PortfolioInstallment[],
  todayDate: string,
) {
  const loanInstallments = installments.filter((item) => item.loanId === loan.id);
  const openInstallments = loanInstallments.filter((item) => item.status !== "completed");
  const overdueInstallments = openInstallments.filter((item) => item.dueDate < todayDate);
  const paidInstallments = loanInstallments.filter((item) => item.status === "completed");
  const totalInterest = sumAmounts(loanInstallments, (item) => item.interestAmount);
  const totalAmount = loan.principalAmount + totalInterest;
  const interestRate = loan.principalAmount > 0 ? (totalInterest / loan.principalAmount) * 100 : 0;
  const nextDueInstallment = [...openInstallments]
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate) || right.amount - left.amount)[0];
  const status = openInstallments.length > 0 ? "active" as const : "inactive" as const;
  const financialStatus = openInstallments.length === 0
    ? "settled" as const
    : overdueInstallments.length > 0
      ? "overdue" as const
      : "healthy" as const;

  return {
    id: loan.id,
    customerName: loan.customerName,
    principalAmount: loan.principalAmount,
    totalAmount,
    installmentCount: loanInstallments.length,
    paidInstallments: paidInstallments.length,
    openInstallments: openInstallments.length,
    overdueInstallments: overdueInstallments.length,
    interestAmount: totalInterest,
    interestRate: loan.interestType === "fixo" ? interestRate : loan.interestRate || interestRate,
    interestType: loan.interestType,
    fixedFeeAmount: loan.fixedFeeAmount,
    issuedAt: loan.issuedAt,
    firstDueDate: loan.firstDueDate,
    observations: loan.observations,
    nextDueDate: nextDueInstallment?.dueDate || null,
    status,
    statusLabel: status === "active" ? "Ativo" : "Inativo",
    financialStatus,
    financialStatusLabel: financialStatus === "overdue"
      ? "Em atraso"
      : financialStatus === "settled"
        ? "Liquidado"
        : "Em dia",
    statusNote: financialStatus === "overdue"
      ? `${overdueInstallments.length} parcela(s) em atraso`
      : financialStatus === "settled"
        ? "Sem parcelas em aberto"
        : nextDueInstallment?.dueDate
          ? `Proximo vencimento em ${nextDueInstallment.dueDate}`
          : "Carteira em dia",
  };
}

function calculateLoanInterestAmount(payload: z.infer<typeof loanMutationSchema>) {
  if (payload.interestType === "fixo") return payload.fixedFeeAmount;
  if (payload.interestType === "composto") {
    return payload.principalAmount * (Math.pow(1 + (payload.interestRate / 100), payload.installmentsCount) - 1);
  }

  return payload.principalAmount * (payload.interestRate / 100);
}

function buildLoanInstallmentPlan(payload: z.infer<typeof loanMutationSchema>) {
  const totalInterest = calculateLoanInterestAmount(payload);
  const totalAmount = payload.principalAmount + totalInterest;
  const principalPart = payload.principalAmount / payload.installmentsCount;
  const interestPart = totalInterest / payload.installmentsCount;
  const baseDueDate = parseDateOnly(payload.firstDueDate);

  return Array.from({ length: payload.installmentsCount }, (_, index) => {
    const dueDate = addMonths(baseDueDate, index);

    return {
      amount: roundCurrency(totalAmount / payload.installmentsCount),
      dueDate: formatDateOnlyInTimeZone(dueDate, TIME_ZONE),
      interestAmount: roundCurrency(interestPart),
      principalAmount: roundCurrency(principalPart),
      status: "pending" as const,
    };
  }).map((item, index, items) => {
    if (index !== items.length - 1) return item;

    const principalDelta = payload.principalAmount - sumAmounts(items, (entry) => entry.principalAmount);
    const interestDelta = totalInterest - sumAmounts(items, (entry) => entry.interestAmount);
    const amountDelta = totalAmount - sumAmounts(items, (entry) => entry.amount);

    return {
      ...item,
      amount: roundCurrency(item.amount + amountDelta),
      interestAmount: roundCurrency(item.interestAmount + interestDelta),
      principalAmount: roundCurrency(item.principalAmount + principalDelta),
    };
  });
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function buildLoanDetailsPayload(
  loan: PortfolioLoan,
  installments: PortfolioInstallment[],
  timeZone: string,
  todayDate: string,
) {
  const loanInstallments = installments
    .filter((item) => item.loanId === loan.id)
    .sort((left, right) => left.installmentNumber - right.installmentNumber || left.dueDate.localeCompare(right.dueDate));
  const nextOpenInstallment = loanInstallments
    .filter((item) => item.status !== "completed")
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate) || right.amount - left.amount)[0];

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      timezone: timeZone,
      todayDate,
      currentMonthKey: todayDate.slice(0, 7),
    },
    loan: {
      ...buildLoanRecord(loan, installments, todayDate),
      loanLabel: `Contrato #${loan.id}`,
      firstDueDate: loan.firstDueDate || loanInstallments[0]?.dueDate || null,
      nextInstallmentLabel: nextOpenInstallment
        ? `Parcela ${nextOpenInstallment.installmentNumber}/${nextOpenInstallment.totalInstallments}`
        : null,
      nextInstallmentAmount: nextOpenInstallment?.amount || null,
    },
    installments: loanInstallments.map((item) => buildInstallmentRecord(item, todayDate)),
  };
}

router.get("/overview", handleAsync(async (req, res) => {
  const query = portfolioQuerySchema.parse({
    period: typeof req.query.period === "string" ? req.query.period : undefined,
    tz: typeof req.query.tz === "string" ? req.query.tz : undefined,
  });

  const timeZone = query.tz || TIME_ZONE;
  const todayDate = formatDateOnlyInTimeZone(new Date(), timeZone);
  const today = parseDateOnly(todayDate);
  const next7Date = formatDateOnlyInTimeZone(addDays(today, 7), timeZone);
  const currentMonth = todayDate.slice(0, 7);
  const monthsToShow = Number(query.period.replace("m", ""));
  const loans = await listPortfolioLoans();
  const installments = await listPortfolioInstallments();
  const completedInstallments = installments.filter((item) => item.status === "completed");
  const openInstallments = installments.filter((item) => item.status !== "completed");
  const overdueInstallments = openInstallments.filter((item) => item.dueDate < todayDate);
  const futureInstallments = openInstallments.filter((item) => item.dueDate >= todayDate);
  const dueToday = openInstallments.filter((item) => item.dueDate === todayDate);
  const next7Days = openInstallments.filter((item) => item.dueDate >= todayDate && item.dueDate <= next7Date);
  const activeLoanIds = new Set(openInstallments.map((item) => item.loanId));
  const activeLoans = loans.filter((loan) => activeLoanIds.has(loan.id));
  const overdueAmount = sumAmounts(overdueInstallments, (item) => item.amount);
  const openAmount = sumAmounts(openInstallments, (item) => item.amount);
  const receivedThisMonthItems = completedInstallments.filter((item) => item.paidDate?.startsWith(currentMonth));
  const totalLoaned = sumAmounts(loans, (item) => item.principalAmount);
  const profitThisMonth = sumAmounts(receivedThisMonthItems, (item) => item.interestAmount);
  const profitTotal = sumAmounts(completedInstallments, (item) => item.interestAmount);
  const roiRate = totalLoaned > 0 ? (profitTotal / totalLoaned) * 100 : 0;
  const overdueContracts = uniqueCount(overdueInstallments.map((item) => item.loanId));
  const overdueCustomers = uniqueCount(overdueInstallments.map((item) => item.customerName));
  const healthyContracts = Math.max(activeLoans.length - overdueContracts, 0);
  const averageTicket = loans.length > 0 ? totalLoaned / loans.length : 0;
  const averageInstallment = openInstallments.length > 0 ? openAmount / openInstallments.length : 0;
  const openInterestPotential = sumAmounts(openInstallments, (item) => item.interestAmount);
  const financeTransactions = await listFinanceTransactions();
  const cashBalance =
    BASE_CASH_BALANCE +
    sumAmounts(financeTransactions.filter((item) => item.type === "income" && item.status === "completed"), (item) => item.amount) -
    sumAmounts(financeTransactions.filter((item) => item.type === "expense" && item.status === "completed"), (item) => item.amount);
  const currentMonthPayments = completedInstallments.filter((item) => item.paidDate?.startsWith(currentMonth));
  const currentMonthReceipts = sumAmounts(currentMonthPayments, (item) => item.amount);
  const monthStart = formatDateOnlyInTimeZone(startOfMonth(today), timeZone);
  const overdueThisMonth = overdueInstallments.filter((item) => item.dueDate >= monthStart);
  const currentMonthInstallments = installments.filter((item) => item.dueDate.startsWith(currentMonth));
  const currentMonthCollectionTarget = sumAmounts(currentMonthInstallments, (item) => item.amount);
  const currentMonthCollectionPaid = sumAmounts(
    currentMonthInstallments.filter((item) => item.status === "completed"),
    (item) => item.amount,
  );
  const collectionRateThisMonth = currentMonthCollectionTarget > 0
    ? (currentMonthCollectionPaid / currentMonthCollectionTarget) * 100
    : 0;
  const delinquencyRate = openAmount > 0 ? (overdueAmount / openAmount) * 100 : 0;
  const healthScore = clamp(100 - (delinquencyRate * 1.25) - (overdueContracts * 6), 0, 100);
  const healthLabel = healthScore >= 80 ? "Saudavel" : healthScore >= 60 ? "Atencao" : "Critico";
  const firstMonth = addMonths(startOfMonth(today), -(monthsToShow - 1));
  const chartPoints = Array.from({ length: monthsToShow }, (_, index) => {
    const monthDate = addMonths(firstMonth, index);
    const monthKey = formatDateOnlyInTimeZone(monthDate, timeZone).slice(0, 7);
    const received = sumAmounts(
      completedInstallments.filter((item) => item.paidDate?.startsWith(monthKey)),
      (item) => item.amount,
    );
    const open = sumAmounts(
      openInstallments.filter((item) => item.dueDate.startsWith(monthKey) && item.dueDate >= todayDate),
      (item) => item.amount,
    );
    const overdue = sumAmounts(
      openInstallments.filter((item) => item.dueDate.startsWith(monthKey) && item.dueDate < todayDate),
      (item) => item.amount,
    );

    return {
      label: formatMonthLabel(monthDate, timeZone),
      monthKey,
      received,
      open,
      overdue,
    };
  });

  return res.status(200).json({
    meta: {
      generatedAt: new Date().toISOString(),
      timezone: timeZone,
    },
    highlights: {
      activeContracts: activeLoans.length,
      activeCustomers: uniqueCount(activeLoans.map((item) => item.customerName)),
      delinquencyRate,
    },
    kpis: {
      cashBalance,
      receivedThisMonth: currentMonthReceipts,
      openReceivableTotal: openAmount,
      openReceivableFuture: sumAmounts(futureInstallments, (item) => item.amount),
      openReceivableOverdue: overdueAmount,
      profitThisMonth,
      profitTotal,
      roiRate,
      totalLoaned,
    },
    health: {
      score: healthScore,
      scoreLabel: healthLabel,
      healthyContracts,
      contractsAtRisk: overdueContracts,
      overdueCustomers,
      averageTicket,
      averageInstallment,
      openInterestPotential,
      collectionRateThisMonth,
      overdueExposure: overdueAmount,
    },
    dailySummary: {
      dueToday: {
        count: dueToday.length,
        totalValue: sumAmounts(dueToday, (item) => item.amount),
      },
      overdue: {
        count: overdueThisMonth.length,
        totalValue: sumAmounts(overdueThisMonth, (item) => item.amount),
      },
      next7Days: {
        count: next7Days.length,
        totalValue: sumAmounts(next7Days, (item) => item.amount),
      },
    },
    chart: {
      period: query.period,
      points: chartPoints,
      hasData: chartPoints.some((point) => point.received > 0 || point.open > 0 || point.overdue > 0),
      emptyMessage: "Sem dados no periodo.",
      currentMonthKey: currentMonth,
    },
    upcomingDue: futureInstallments
      .sort((left, right) => left.dueDate.localeCompare(right.dueDate) || right.amount - left.amount)
      .slice(0, 6)
      .map((item) => buildInstallmentItem(item, todayDate)),
    overduePayments: overdueInstallments
      .sort((left, right) => left.dueDate.localeCompare(right.dueDate) || right.amount - left.amount)
      .slice(0, 6)
      .map((item) => buildInstallmentItem(item, todayDate)),
  });
}));

router.get("/loans", handleAsync(async (req, res) => {
  const query = portfolioQuerySchema.parse({
    period: typeof req.query.period === "string" ? req.query.period : undefined,
    tz: typeof req.query.tz === "string" ? req.query.tz : undefined,
  });

  const timeZone = query.tz || TIME_ZONE;
  const todayDate = formatDateOnlyInTimeZone(new Date(), timeZone);
  const currentMonth = todayDate.slice(0, 7);
  const loans = await listPortfolioLoans();
  const installments = await listPortfolioInstallments();
  const loanRows = loans
    .map((loan) => buildLoanRecord(loan, installments, todayDate))
    .sort((left, right) => {
      if (left.status !== right.status) return left.status === "active" ? -1 : 1;
      if (left.overdueInstallments !== right.overdueInstallments) return right.overdueInstallments - left.overdueInstallments;
      return right.issuedAt.localeCompare(left.issuedAt) || right.id.localeCompare(left.id);
    });

  return res.status(200).json({
    meta: {
      generatedAt: new Date().toISOString(),
      timezone: timeZone,
      todayDate,
      currentMonthKey: currentMonth,
    },
    summary: {
      totalLoans: loanRows.length,
      activeLoans: loanRows.filter((item) => item.status === "active").length,
      inactiveLoans: loanRows.filter((item) => item.status === "inactive").length,
      overdueLoans: loanRows.filter((item) => item.overdueInstallments > 0).length,
      principalTotal: sumAmounts(loanRows, (item) => item.principalAmount),
      contractedTotal: sumAmounts(loanRows, (item) => item.totalAmount),
      overdueBalance: sumAmounts(
        installments.filter((item) => item.status !== "completed" && item.dueDate < todayDate),
        (item) => item.amount,
      ),
    },
    data: loanRows,
  });
}));

router.get("/loans/:id", handleAsync(async (req, res) => {
  const query = portfolioQuerySchema.parse({
    period: typeof req.query.period === "string" ? req.query.period : undefined,
    tz: typeof req.query.tz === "string" ? req.query.tz : undefined,
  });
  const params = loanParamsSchema.parse({
    id: typeof req.params.id === "string" ? req.params.id : undefined,
  });

  const timeZone = query.tz || TIME_ZONE;
  const todayDate = formatDateOnlyInTimeZone(new Date(), timeZone);
  const currentMonth = todayDate.slice(0, 7);
  const loan = await getPortfolioLoan(params.id);
  const installments = await listPortfolioInstallments();

  if (!loan) {
    return res.status(404).json({ message: "Emprestimo nao encontrado." });
  }

  return res.status(200).json(buildLoanDetailsPayload(loan, installments, timeZone, todayDate));
}));

router.post("/loans", handleAsync(async (req, res) => {
  const payload = loanMutationSchema.parse(req.body);
  const diff = diffDays(payload.firstDueDate, payload.issuedAt);

  if (!Number.isFinite(diff) || diff <= 0) {
    return res.status(400).json({ message: "O primeiro vencimento deve ser maior que a data de inicio." });
  }

  const created = await createPortfolioLoan({
    customerName: payload.customerName,
    principalAmount: payload.principalAmount,
    issuedAt: payload.issuedAt,
    firstDueDate: payload.firstDueDate,
    interestType: payload.interestType,
    interestRate: payload.interestRate,
    fixedFeeAmount: payload.fixedFeeAmount,
    observations: payload.observations || "",
  });

  await replacePortfolioLoanInstallments(created.id, created.customerName, buildLoanInstallmentPlan(payload));

  return res.status(201).json(buildLoanDetailsPayload(
    created,
    await listPortfolioInstallments(),
    TIME_ZONE,
    formatDateOnlyInTimeZone(new Date(), TIME_ZONE),
  ));
}));

router.patch("/loans/:id", handleAsync(async (req, res) => {
  const params = loanParamsSchema.parse({
    id: typeof req.params.id === "string" ? req.params.id : undefined,
  });
  const payload = loanMutationSchema.parse(req.body);
  const todayDate = formatDateOnlyInTimeZone(new Date(), TIME_ZONE);
  const currentInstallments = (await listPortfolioInstallments()).filter((item) => item.loanId === params.id);

  if (!currentInstallments.length) {
    return res.status(404).json({ message: "Emprestimo nao encontrado." });
  }

  if (currentInstallments.some((item) => item.status === "completed")) {
    return res.status(400).json({ message: "Nao e permitido editar emprestimo com parcela paga." });
  }

  const diff = diffDays(payload.firstDueDate, payload.issuedAt);
  if (!Number.isFinite(diff) || diff <= 0) {
    return res.status(400).json({ message: "O primeiro vencimento deve ser maior que a data de inicio." });
  }

  const updated = await updatePortfolioLoan(params.id, {
    customerName: payload.customerName,
    principalAmount: payload.principalAmount,
    issuedAt: payload.issuedAt,
    firstDueDate: payload.firstDueDate,
    interestType: payload.interestType,
    interestRate: payload.interestRate,
    fixedFeeAmount: payload.fixedFeeAmount,
    observations: payload.observations || "",
  });

  if (!updated) {
    return res.status(404).json({ message: "Emprestimo nao encontrado." });
  }

  await replacePortfolioLoanInstallments(updated.id, updated.customerName, buildLoanInstallmentPlan(payload));

  return res.status(200).json(buildLoanDetailsPayload(
    updated,
    await listPortfolioInstallments(),
    TIME_ZONE,
    todayDate,
  ));
}));

router.get("/loan-simulations", handleAsync(async (req, res) => {
  const query = portfolioQuerySchema.parse({
    period: typeof req.query.period === "string" ? req.query.period : undefined,
    tz: typeof req.query.tz === "string" ? req.query.tz : undefined,
  });

  const timeZone = query.tz || TIME_ZONE;
  const simulations = (await listPortfolioLoanSimulations())
    .map((simulation, index) => ({
      id: simulation.id,
      displayId: index + 1,
      customerName: simulation.customerName,
      principalAmount: simulation.principalAmount,
      totalAmount: simulation.totalAmount,
      installmentsCount: simulation.installmentsCount,
      interestType: simulation.interestType,
      interestRate: simulation.interestRate,
      fixedFeeAmount: simulation.fixedFeeAmount,
      status: simulation.status,
      statusLabel: getLoanSimulationStatusLabel(simulation.status),
      expiresAt: simulation.expiresAt,
    }))
    .sort((left, right) => String(left.expiresAt).localeCompare(String(right.expiresAt)));

  return res.status(200).json({
    meta: {
      generatedAt: new Date().toISOString(),
      timezone: timeZone,
    },
    summary: {
      total: simulations.length,
      pending: simulations.filter((item) => item.status === "DRAFT" || item.status === "SENT" || item.status === "EXPIRED").length,
    },
    data: simulations,
  });
}));

router.get("/reports", handleAsync(async (req, res) => {
  const query = portfolioQuerySchema.parse({
    period: typeof req.query.period === "string" ? req.query.period : undefined,
    tz: typeof req.query.tz === "string" ? req.query.tz : undefined,
  });

  const timeZone = query.tz || TIME_ZONE;
  const todayDate = formatDateOnlyInTimeZone(new Date(), timeZone);
  const loans = await listPortfolioLoans();
  const installments = await listPortfolioInstallments();
  const loanRows = loans.map((loan) => buildLoanRecord(loan, installments, todayDate));
  const loanById = new Map(loanRows.map((item) => [item.id, item]));
  const baseInstallments = installments.map((item) => {
    const loan = loans.find((entry) => entry.id === item.loanId);
    const loanRow = loanById.get(item.loanId);

    return {
      ...buildInstallmentRecord(item, todayDate),
      interestType: loan?.interestType || "composto",
      frequency: "mensal" as const,
      loanPrincipalAmount: loan?.principalAmount || 0,
      loanStatus: loanRow?.status || "active",
      loanStatusLabel: loanRow?.statusLabel || "Ativo",
    };
  });
  const customers = [...new Set(loans.map((item) => item.customerName))]
    .sort((left, right) => left.localeCompare(right, "pt-BR"));

  return res.status(200).json({
    meta: {
      generatedAt: new Date().toISOString(),
      timezone: timeZone,
      todayDate,
    },
    filters: {
      customers: customers.map((customerName) => ({
        value: customerName,
        label: customerName,
      })),
    },
    loans: loanRows.map((item) => ({
      ...item,
      frequency: "mensal" as const,
    })),
    installments: baseInstallments,
  });
}));

router.get("/installments", handleAsync(async (req, res) => {
  const query = portfolioQuerySchema.parse({
    period: typeof req.query.period === "string" ? req.query.period : undefined,
    tz: typeof req.query.tz === "string" ? req.query.tz : undefined,
  });

  const timeZone = query.tz || TIME_ZONE;
  const todayDate = formatDateOnlyInTimeZone(new Date(), timeZone);
  const currentMonth = todayDate.slice(0, 7);
  const installments = await listPortfolioInstallments();
  const completedInstallments = installments.filter((item) => item.status === "completed");
  const openInstallments = installments.filter((item) => item.status !== "completed");
  const overdueInstallments = openInstallments.filter((item) => item.dueDate < todayDate);
  const paidThisMonth = completedInstallments.filter((item) => item.paidDate?.startsWith(currentMonth));
  const sortedInstallments = [...installments].sort((left, right) => {
    const leftStatus = getInstallmentDisplayStatus(left, todayDate);
    const rightStatus = getInstallmentDisplayStatus(right, todayDate);
    const rankDiff = getInstallmentStatusRank(leftStatus) - getInstallmentStatusRank(rightStatus);

    if (rankDiff !== 0) return rankDiff;
    if (left.dueDate !== right.dueDate) return left.dueDate.localeCompare(right.dueDate);
    return right.amount - left.amount;
  });
  const customers = [...new Set(sortedInstallments.map((item) => item.customerName))]
    .sort((left, right) => left.localeCompare(right, "pt-BR"));

  return res.status(200).json({
    meta: {
      generatedAt: new Date().toISOString(),
      timezone: timeZone,
      currentMonthKey: currentMonth,
      todayDate,
    },
    summary: {
      receivedMonth: {
        value: sumAmounts(paidThisMonth, (item) => item.amount),
        count: paidThisMonth.length,
      },
      pendingTotal: {
        value: sumAmounts(openInstallments, (item) => item.amount),
        count: openInstallments.length,
      },
      overdueTotal: {
        value: sumAmounts(overdueInstallments, (item) => item.amount),
        count: overdueInstallments.length,
      },
    },
    filters: {
      customers: customers.map((customerName) => ({
        value: customerName,
        label: customerName,
      })),
    },
    data: sortedInstallments.map((item) => buildInstallmentRecord(item, todayDate)),
  });
}));

router.get("/customers", handleAsync(async (req, res) => {
  const query = portfolioQuerySchema.parse({
    period: typeof req.query.period === "string" ? req.query.period : undefined,
    tz: typeof req.query.tz === "string" ? req.query.tz : undefined,
  });

  const timeZone = query.tz || TIME_ZONE;
  const todayDate = formatDateOnlyInTimeZone(new Date(), timeZone);
  const currentMonth = todayDate.slice(0, 7);
  const loans = await listPortfolioLoans();
  const installments = await listPortfolioInstallments();
  const customerNames = [...new Set(loans.map((item) => item.customerName))]
    .sort((left, right) => left.localeCompare(right, "pt-BR"));

  const customers = customerNames.map((customerName) =>
    buildCustomerRecord(customerName, loans, installments, todayDate, currentMonth))
    .sort((left, right) => {
    const rankDiff = getCustomerStatusRank(left.status) - getCustomerStatusRank(right.status);
    if (rankDiff !== 0) return rankDiff;
    if (left.overdueBalance !== right.overdueBalance) return right.overdueBalance - left.overdueBalance;
    if (left.openBalance !== right.openBalance) return right.openBalance - left.openBalance;
    return left.customerName.localeCompare(right.customerName, "pt-BR");
  });

  return res.status(200).json({
    meta: {
      generatedAt: new Date().toISOString(),
      timezone: timeZone,
      todayDate,
      currentMonthKey: currentMonth,
    },
    summary: {
      totalCustomers: customers.length,
      activeCustomers: customers.filter((item) => item.activeContracts > 0).length,
      overdueCustomers: customers.filter((item) => item.status === "overdue").length,
      watchCustomers: customers.filter((item) => item.status === "watch").length,
      totalLoaned: sumAmounts(loans, (item) => item.principalAmount),
      openBalance: sumAmounts(customers, (item) => item.openBalance),
      overdueBalance: sumAmounts(customers, (item) => item.overdueBalance),
      receivedThisMonth: sumAmounts(customers, (item) => item.receivedThisMonth),
    },
    data: customers,
  });
}));

router.get("/customers/:id", handleAsync(async (req, res) => {
  const query = portfolioQuerySchema.parse({
    period: typeof req.query.period === "string" ? req.query.period : undefined,
    tz: typeof req.query.tz === "string" ? req.query.tz : undefined,
  });
  const params = customerParamsSchema.parse({
    id: typeof req.params.id === "string" ? req.params.id : undefined,
  });

  const timeZone = query.tz || TIME_ZONE;
  const todayDate = formatDateOnlyInTimeZone(new Date(), timeZone);
  const currentMonth = todayDate.slice(0, 7);
  const loans = await listPortfolioLoans();
  const installments = await listPortfolioInstallments();
  const customerName = [...new Set(loans.map((item) => item.customerName))]
    .find((item) => normalizeCustomerId(item) === params.id);

  if (!customerName) {
    return res.status(404).json({ message: "Cliente nao encontrado." });
  }

  const customer = buildCustomerRecord(customerName, loans, installments, todayDate, currentMonth);

  if (!customer.contractCount) {
    return res.status(404).json({ message: "Cliente nao encontrado." });
  }

  const customerLoans = loans
    .filter((item) => item.customerName === customerName)
    .sort((left, right) => right.issuedAt.localeCompare(left.issuedAt))
    .map((loan) => buildLoanDetailRecord(loan, installments, todayDate));
  const customerInstallments = installments.filter((item) => item.customerName === customerName);
  const overdueInstallments = customerInstallments
    .filter((item) => item.status !== "completed" && item.dueDate < todayDate)
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate) || right.amount - left.amount)
    .slice(0, 6)
    .map((item) => buildInstallmentRecord(item, todayDate));
  const upcomingInstallments = customerInstallments
    .filter((item) => item.status !== "completed" && item.dueDate >= todayDate)
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate) || right.amount - left.amount)
    .slice(0, 6)
    .map((item) => buildInstallmentRecord(item, todayDate));

  return res.status(200).json({
    meta: {
      generatedAt: new Date().toISOString(),
      timezone: timeZone,
      todayDate,
      currentMonthKey: currentMonth,
    },
    customer,
    contracts: customerLoans,
    upcomingInstallments,
    overdueInstallments,
  });
}));

router.patch("/installments/:id", handleAsync(async (req, res) => {
  const payload = installmentUpdateSchema.parse(req.body);
  const installmentId = String(req.params.id || "");
  const todayDate = formatDateOnlyInTimeZone(new Date(), TIME_ZONE);
  const currentInstallment = await getPortfolioInstallment(installmentId);

  if (!currentInstallment) {
    return res.status(404).json({ message: "Parcela nao encontrada." });
  }

  const nextPrincipalAmount = payload.principalAmount ?? currentInstallment.principalAmount;
  const nextInterestAmount = payload.interestAmount ?? currentInstallment.interestAmount;
  const nextPaidDate = payload.status === "completed"
    ? (payload.paidDate || todayDate)
    : payload.status === "pending"
      ? null
      : payload.paidDate;
  const patchPayload: Partial<PortfolioInstallment> = {
    amount: nextPrincipalAmount + nextInterestAmount,
    interestAmount: nextInterestAmount,
    principalAmount: nextPrincipalAmount,
  };

  if (payload.status !== undefined) {
    patchPayload.status = payload.status;
  }

  if (payload.dueDate !== undefined) {
    patchPayload.dueDate = payload.dueDate;
  }

  if (payload.paidDate !== undefined || payload.status !== undefined) {
    patchPayload.paidDate = nextPaidDate;
  }

  const updated = await updatePortfolioInstallment(installmentId, {
    ...patchPayload,
  });

  if (!updated) {
    return res.status(404).json({ message: "Parcela nao encontrada." });
  }

  return res.status(200).json({
    data: buildInstallmentRecord(updated, todayDate),
  });
}));

export { router as portfolioRoutes };
