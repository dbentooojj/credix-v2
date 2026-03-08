import { Router } from "express";
import { z } from "zod";
import { handleAsync } from "../lib/async-route";
import { listFinanceTransactions } from "../lib/finance-repository";
import type { FinanceTransaction } from "../lib/finance-store";

const router = Router();

const TIME_ZONE = "America/Sao_Paulo";
const BASE_CASH_BALANCE = 440.88;

const dashboardQuerySchema = z.object({
  period: z.enum(["3m", "6m", "12m"]).default("6m"),
  metric: z.enum(["recebido", "emprestado", "lucro"]).default("recebido"),
  tz: z.string().trim().min(1).default(TIME_ZONE),
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

function isOpenTransaction(item: FinanceTransaction) {
  return item.status !== "completed";
}

function isOverdueTransaction(item: FinanceTransaction, todayDate: string) {
  return item.status !== "completed" && item.date < todayDate;
}

function isSameDayTransaction(item: FinanceTransaction, todayDate: string) {
  return item.status !== "completed" && item.date === todayDate;
}

function sumAmounts(items: FinanceTransaction[]) {
  return items.reduce((total, item) => total + item.amount, 0);
}

function buildOperationItem(item: FinanceTransaction, href: string, typeLabel: string) {
  return {
    href,
    typeLabel,
    moduleLabel: "Financeiro",
    title: item.description,
    subtitle: item.category,
    amount: item.amount,
    date: item.date,
  };
}

function buildRecentMovement(item: FinanceTransaction) {
  const isIncome = item.type === "income";

  return {
    id: item.id,
    href: isIncome ? "/app/finance/receivables" : "/app/finance/payables",
    direction: isIncome ? "in" : "out",
    typeLabel: isIncome ? "Recebimento" : "Pagamento",
    moduleLabel: "Financeiro",
    title: item.description,
    subtitle: item.category,
    amount: item.amount,
    date: item.date,
  };
}

router.get("/", handleAsync(async (req, res) => {
  const query = dashboardQuerySchema.parse({
    period: typeof req.query.period === "string" ? req.query.period : undefined,
    metric: typeof req.query.metric === "string" ? req.query.metric : undefined,
    tz: typeof req.query.tz === "string" ? req.query.tz : undefined,
  });

  const timeZone = query.tz || TIME_ZONE;
  const todayDate = formatDateOnlyInTimeZone(new Date(), timeZone);
  const todayMonth = todayDate.slice(0, 7);
  const transactions = await listFinanceTransactions();
  const incomeTransactions = transactions.filter((item) => item.type === "income");
  const expenseTransactions = transactions.filter((item) => item.type === "expense");

  const receivableTransactions = incomeTransactions.filter(isOpenTransaction);
  const payableTransactions = expenseTransactions.filter(isOpenTransaction);

  const cashBalance =
    BASE_CASH_BALANCE +
    sumAmounts(incomeTransactions.filter((item) => item.status === "completed")) -
    sumAmounts(expenseTransactions.filter((item) => item.status === "completed"));

  const accountsReceivable = sumAmounts(receivableTransactions);
  const accountsPayable = sumAmounts(payableTransactions);
  const projectedBalance = cashBalance + accountsReceivable - accountsPayable;

  const loanReceivables = receivableTransactions
    .filter((item) => item.category === "Recebiveis" || item.category === "Carteira");
  const financeReceivables = receivableTransactions
    .filter((item) => item.category !== "Recebiveis" && item.category !== "Carteira");

  const receiptsToday = receivableTransactions
    .filter((item) => isSameDayTransaction(item, todayDate))
    .sort((left, right) => right.amount - left.amount);

  const paymentsToday = payableTransactions
    .filter((item) => isSameDayTransaction(item, todayDate))
    .sort((left, right) => right.amount - left.amount);

  const monthsToShow = Number(query.period.replace("m", ""));
  const firstMonth = addMonths(startOfMonth(parseDateOnly(todayDate)), -(monthsToShow - 1));
  const chartPoints = Array.from({ length: monthsToShow }, (_, index) => {
    const monthDate = addMonths(firstMonth, index);
    const monthKey = formatDateOnlyInTimeZone(monthDate, timeZone).slice(0, 7);
    const monthIncome = incomeTransactions.filter((item) => item.date.startsWith(monthKey));
    const received = sumAmounts(monthIncome.filter((item) => item.status === "completed"));
    const open = sumAmounts(monthIncome.filter((item) => item.status !== "completed" && item.date >= todayDate));
    const overdue = sumAmounts(monthIncome.filter((item) => item.status !== "completed" && item.date < todayDate));

    return {
      label: formatMonthLabel(monthDate, timeZone),
      value: received,
      received,
      open,
      overdue,
    };
  });

  const currentPoint = chartPoints[chartPoints.length - 1] || { open: 0, overdue: 0 };
  const payload = {
    meta: {
      generatedAt: new Date().toISOString(),
      timezone: timeZone,
      period: query.period,
      metric: query.metric,
    },
    cashAdjustment: {
      net: 0,
    },
    overviewSummary: {
      cashBalance: {
        value: cashBalance,
        note: "Disponivel agora",
        href: "/app",
      },
      accountsReceivable: {
        value: accountsReceivable,
        note: "Emprestimos + Financeiro",
        href: "/app/finance/receivables",
        loanValue: sumAmounts(loanReceivables),
        financeValue: sumAmounts(financeReceivables),
      },
      accountsPayable: {
        value: accountsPayable,
        note: "Compromissos pendentes",
        href: "/app/finance/payables",
        itemsCount: payableTransactions.length,
      },
      projectedBalance: {
        value: projectedBalance,
        note: "Apos entradas e saidas",
        href: "/app",
        receivableValue: accountsReceivable,
        payableValue: accountsPayable,
      },
    },
    dailyOperations: {
      receiptsToday: {
        totalValue: sumAmounts(receiptsToday),
        items: receiptsToday.map((item) => buildOperationItem(item, "/app/finance/receivables", "Recebimento")),
      },
      paymentsToday: {
        totalValue: sumAmounts(paymentsToday),
        items: paymentsToday.map((item) => buildOperationItem(item, "/app/finance/payables", "Pagamento")),
      },
      alerts: {
        overdueIncomingCount: incomeTransactions.filter((item) => isOverdueTransaction(item, todayDate)).length,
        overdueOutgoingCount: expenseTransactions.filter((item) => isOverdueTransaction(item, todayDate)).length,
        incomingHref: "/app/finance/receivables",
        outgoingHref: "/app/finance/payables",
        dueTodayCount: receiptsToday.length + paymentsToday.length,
        projectedBalance,
        currentMonthExposure: currentPoint.open + currentPoint.overdue,
      },
    },
    chart: {
      metric: query.metric,
      period: query.period,
      points: chartPoints,
      hasData: chartPoints.some((point) => point.received > 0 || point.open > 0 || point.overdue > 0),
      emptyMessage: "Sem dados no periodo.",
      currentMonthKey: todayMonth,
    },
    recentMovements: transactions
      .slice(0, 6)
      .map(buildRecentMovement),
  };

  return res.status(200).json(payload);
}));

export { router as dashboardRoutes };
