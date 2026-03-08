"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, FileDown, FileSpreadsheet, Search } from "lucide-react";
import type { PortfolioReportInstallmentItem, PortfolioReportsResponse } from "@/src/lib/api";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { PortfolioHealthPanel } from "@/src/components/portfolio/portfolio-health-panel";
import { PortfolioMonthlyChart } from "@/src/components/portfolio/portfolio-monthly-chart";
import { ReportDuePressurePanel } from "@/src/components/reports/report-due-pressure-panel";
import { ReportInsightsPanel } from "@/src/components/reports/report-insights-panel";
import { ReportProjectionPanel } from "@/src/components/reports/report-projection-panel";
import { ReportRiskMapPanel } from "@/src/components/reports/report-risk-map-panel";

type ReportsWorkspaceProps = {
  initialPayload: PortfolioReportsResponse | null;
  initialError: string | null;
};

type ReportPeriodKey = "all" | "month_current" | "month_previous" | "last7" | "last15" | "last30" | "custom";

type ReportFilters = {
  period: ReportPeriodKey;
  customStartDate: string;
  customEndDate: string;
  customer: string;
  clientSearch: string;
  status: "all" | "paid" | "pending" | "overdue" | "due-today";
  interestType: "all" | "simples" | "composto" | "fixo";
  frequency: "all" | "mensal" | "quinzenal";
  minValue: string;
  maxValue: string;
  onlyOverdue: boolean;
};

type ReportMetricsSnapshot = {
  totalLoaned: number;
  totalExpected: number;
  totalReceived: number;
  totalOpen: number;
  totalOverdue: number;
  expectedRiskLoss: number;
  estimatedProfit: number;
  delinquencyRate: number;
  ticketAverage: number;
  totalCount: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
  uniqueLoanCount: number;
  uniqueClientCount: number;
};

const INITIAL_FILTERS: ReportFilters = {
  period: "month_current",
  customStartDate: "",
  customEndDate: "",
  customer: "all",
  clientSearch: "",
  status: "all",
  interestType: "all",
  frequency: "all",
  minValue: "",
  maxValue: "",
  onlyOverdue: false,
};

const PAGE_SIZE = 8;

function toNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatPercent(value: unknown) {
  return `${toNumber(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function formatDateTime(value?: string, timeZone?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timeZone || "America/Sao_Paulo",
  }).format(date);
}

function formatDateOnly(value?: string | null) {
  if (!value) return "--";
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return "--";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function parseDateOnly(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfMonth(value: string) {
  const date = parseDateOnly(value);
  if (!date) return "";
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 12, 0, 0)).toISOString().slice(0, 10);
}

function endOfMonth(value: string) {
  const date = parseDateOnly(value);
  if (!date) return "";
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 12, 0, 0)).toISOString().slice(0, 10);
}

function shiftDays(value: string, diff: number) {
  const date = parseDateOnly(value);
  if (!date) return "";
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
}

function shiftMonths(value: string, diff: number) {
  const date = parseDateOnly(value);
  if (!date) return "";
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + diff, date.getUTCDate(), 12, 0, 0)).toISOString().slice(0, 10);
}

function getDateKey(item: { dueDate?: string; paidDate?: string | null; status?: string }) {
  if (item.status === "paid" && item.paidDate) {
    return item.paidDate;
  }

  return item.dueDate || "";
}

function getPeriodBounds(period: ReportPeriodKey, todayDate: string, customStartDate: string, customEndDate: string) {
  if (period === "all") return { start: "", end: "" };
  if (period === "month_current") {
    return { start: startOfMonth(todayDate), end: endOfMonth(todayDate) };
  }
  if (period === "month_previous") {
    const previous = shiftMonths(todayDate, -1);
    return { start: startOfMonth(previous), end: endOfMonth(previous) };
  }
  if (period === "last7") {
    return { start: shiftDays(todayDate, -6), end: todayDate };
  }
  if (period === "last15") {
    return { start: shiftDays(todayDate, -14), end: todayDate };
  }
  if (period === "last30") {
    return { start: shiftDays(todayDate, -29), end: todayDate };
  }

  return {
    start: customStartDate || "",
    end: customEndDate || "",
  };
}

function getPreviousPeriodBounds(start: string, end: string) {
  if (!start || !end) return { start: "", end: "" };
  const startDate = parseDateOnly(start);
  const endDate = parseDateOnly(end);
  if (!startDate || !endDate || endDate < startDate) return { start: "", end: "" };

  const dayMs = 24 * 60 * 60 * 1000;
  const durationDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / dayMs) + 1);
  const previousEnd = new Date(startDate.getTime() - dayMs);
  const previousStart = new Date(previousEnd.getTime() - ((durationDays - 1) * dayMs));

  return {
    start: previousStart.toISOString().slice(0, 10),
    end: previousEnd.toISOString().slice(0, 10),
  };
}

function matchesReportFilters(
  item: PortfolioReportInstallmentItem,
  filters: ReportFilters,
  bounds: { start: string; end: string },
) {
  const searchTerm = filters.clientSearch.trim().toLowerCase();
  const minValue = filters.minValue ? toNumber(filters.minValue) : null;
  const maxValue = filters.maxValue ? toNumber(filters.maxValue) : null;

  if (filters.customer !== "all" && item.customerName !== filters.customer) return false;
  if (searchTerm && !`${item.customerName || ""} ${item.loanLabel || ""}`.toLowerCase().includes(searchTerm)) return false;
  if (filters.status !== "all" && item.status !== filters.status) return false;
  if (filters.interestType !== "all" && item.interestType !== filters.interestType) return false;
  if (filters.frequency !== "all" && item.frequency !== filters.frequency) return false;
  if (filters.onlyOverdue && item.status !== "overdue") return false;
  if (minValue !== null && toNumber(item.amount) < minValue) return false;
  if (maxValue !== null && toNumber(item.amount) > maxValue) return false;

  const dateKey = getDateKey(item);
  if (bounds.start && dateKey < bounds.start) return false;
  if (bounds.end && dateKey > bounds.end) return false;

  return true;
}

function calculateReportMetrics(rows: PortfolioReportInstallmentItem[], uniqueLoanCount: number): ReportMetricsSnapshot {
  const clientNames = new Set<string>();

  const metrics = rows.reduce<ReportMetricsSnapshot>((current, item) => {
    const amount = toNumber(item.amount);
    const principal = toNumber(item.principalAmount);

    current.totalExpected += amount;
    current.totalLoaned += principal;
    if (item.status === "paid") {
      current.totalReceived += amount;
      current.paidCount += 1;
    } else {
      current.totalOpen += amount;
      if (item.status === "overdue") {
        current.totalOverdue += amount;
        current.overdueCount += 1;
      } else {
        current.pendingCount += 1;
      }
    }
    if (item.customerName) clientNames.add(item.customerName);
    return current;
  }, {
    totalLoaned: 0,
    totalExpected: 0,
    totalReceived: 0,
    totalOpen: 0,
    totalOverdue: 0,
    expectedRiskLoss: 0,
    estimatedProfit: 0,
    delinquencyRate: 0,
    ticketAverage: 0,
    totalCount: rows.length,
    paidCount: 0,
    pendingCount: 0,
    overdueCount: 0,
    uniqueLoanCount,
    uniqueClientCount: 0,
  });

  const delinquencyRatio = metrics.totalExpected > 0 ? metrics.totalOverdue / metrics.totalExpected : 0;
  const riskProvisionRate = Math.min(1, Math.max(0.35, delinquencyRatio * 2));
  metrics.expectedRiskLoss = metrics.totalOverdue * riskProvisionRate;
  metrics.estimatedProfit = metrics.totalExpected - metrics.totalLoaned - metrics.expectedRiskLoss;
  metrics.delinquencyRate = delinquencyRatio * 100;
  metrics.ticketAverage = uniqueLoanCount > 0
    ? metrics.totalLoaned / uniqueLoanCount
    : clientNames.size > 0
      ? metrics.totalLoaned / clientNames.size
      : 0;
  metrics.uniqueClientCount = clientNames.size;

  return metrics;
}

function KpiCard({
  label,
  note,
  value,
}: {
  label: string;
  note: string;
  value: string;
}) {
  return (
    <article className="rounded-[20px] border border-slate-700/35 bg-[linear-gradient(180deg,rgba(10,18,34,0.96),rgba(9,16,30,0.84))] p-5 shadow-[0_10px_30px_rgba(2,6,23,0.28)]">
      <p className="text-[0.74rem] font-semibold uppercase tracking-[0.08em] text-slate-400">{label}</p>
      <p className="font-number mt-3 text-[1.85rem] tracking-[-0.03em] text-slate-100">{value}</p>
      <p className="mt-3 text-sm leading-6 text-slate-400">{note}</p>
    </article>
  );
}

function TableShell({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <article className="rounded-[22px] border border-slate-700/35 bg-[linear-gradient(180deg,rgba(10,18,34,0.96),rgba(9,16,30,0.84))] p-4 shadow-[0_10px_30px_rgba(2,6,23,0.28)]">
      <h3 className="text-[1.02rem] font-bold tracking-[-0.02em] text-slate-100">{title}</h3>
      {children}
    </article>
  );
}

export function ReportsWorkspace({ initialPayload, initialError }: ReportsWorkspaceProps) {
  const loans = initialPayload?.loans || [];
  const installments = initialPayload?.installments || [];
  const customers = initialPayload?.filters?.customers || [];
  const todayDate = initialPayload?.meta?.todayDate || new Date().toISOString().slice(0, 10);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [draftFilters, setDraftFilters] = useState<ReportFilters>(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters>(INITIAL_FILTERS);
  const [topDebtorsPage, setTopDebtorsPage] = useState(1);
  const [recentPaidPage, setRecentPaidPage] = useState(1);

  const { filteredInstallments, previousInstallments, metrics, reportMetrics, previousMetrics, topDebtors, recentPaid, chart } = useMemo(() => {
    const bounds = getPeriodBounds(
      appliedFilters.period,
      todayDate,
      appliedFilters.customStartDate,
      appliedFilters.customEndDate,
    );
    const rows = installments.filter((item) => matchesReportFilters(item, appliedFilters, bounds));

    const uniqueLoanIds = [...new Set(rows.map((item) => item.loanId).filter(Boolean))];
    const reportMetrics = calculateReportMetrics(rows, uniqueLoanIds.length);
    const previousBounds = getPreviousPeriodBounds(bounds.start, bounds.end);
    const previousRows = previousBounds.start && previousBounds.end
      ? installments.filter((item) => matchesReportFilters(item, appliedFilters, previousBounds))
      : [];
    const previousLoanIds = [...new Set(previousRows.map((item) => item.loanId).filter(Boolean))];
    const previousMetrics = calculateReportMetrics(previousRows, previousLoanIds.length);
    const matchedLoans = loans.filter((loan) => uniqueLoanIds.includes(loan.id));
    const paidRows = rows.filter((item) => item.status === "paid");
    const overdueRows = rows.filter((item) => item.status === "overdue");
    const openRows = rows.filter((item) => item.status !== "paid");
    const totalExpected = reportMetrics.totalExpected;
    const totalReceived = reportMetrics.totalReceived;
    const overdueAmount = reportMetrics.totalOverdue;
    const estimatedProfit = reportMetrics.estimatedProfit;
    const delinquencyRate = reportMetrics.delinquencyRate;
    const ticketAverage = reportMetrics.ticketAverage > 0
      ? reportMetrics.ticketAverage
      : matchedLoans.length > 0
        ? matchedLoans.reduce((total, item) => total + toNumber(item.principalAmount), 0) / matchedLoans.length
        : 0;
    const activeContracts = new Set(openRows.map((item) => item.loanId).filter(Boolean)).size;
    const contractsAtRisk = new Set(overdueRows.map((item) => item.loanId).filter(Boolean)).size;
    const healthyContracts = Math.max(activeContracts - contractsAtRisk, 0);
    const overdueCustomers = new Set(overdueRows.map((item) => item.customerName).filter(Boolean)).size;
    const averageInstallment = openRows.length > 0 ? openRows.reduce((total, item) => total + toNumber(item.amount), 0) / openRows.length : 0;
    const openInterestPotential = openRows.reduce((total, item) => total + toNumber(item.interestAmount), 0);
    const currentMonthKey = todayDate.slice(0, 7);
    const monthTarget = rows
      .filter((item) => String(item.dueDate || "").startsWith(currentMonthKey))
      .reduce((total, item) => total + toNumber(item.amount), 0);
    const monthPaid = rows
      .filter((item) => item.status === "paid" && String(item.paidDate || "").startsWith(currentMonthKey))
      .reduce((total, item) => total + toNumber(item.amount), 0);
    const collectionRateThisMonth = monthTarget > 0 ? (monthPaid / monthTarget) * 100 : 0;
    const healthScore = Math.min(Math.max(100 - (delinquencyRate * 1.25) - (contractsAtRisk * 6), 0), 100);
    const healthLabel = healthScore >= 80 ? "Saudavel" : healthScore >= 60 ? "Atencao" : "Critico";

    const topDebtorsRows = [...new Set(overdueRows.map((item) => item.customerName).filter(Boolean))]
      .map((customerName) => {
        const customerRows = rows.filter((item) => item.customerName === customerName);
        const customerOverdueRows = overdueRows.filter((item) => item.customerName === customerName);
        const lastPayment = customerRows
          .filter((item) => item.status === "paid" && item.paidDate)
          .sort((left, right) => String(right.paidDate).localeCompare(String(left.paidDate)))[0];

        return {
          customerName,
          overdueCount: customerOverdueRows.length,
          overdueBalance: customerOverdueRows.reduce((total, item) => total + toNumber(item.amount), 0),
          openBalance: customerRows.filter((item) => item.status !== "paid").reduce((total, item) => total + toNumber(item.amount), 0),
          lastPaymentDate: lastPayment?.paidDate || null,
        };
      })
      .sort((left, right) => right.overdueBalance - left.overdueBalance || right.openBalance - left.openBalance);

    const recentPaidRows = paidRows
      .slice()
      .sort((left, right) => String(right.paidDate || "").localeCompare(String(left.paidDate || "")) || toNumber(right.amount) - toNumber(left.amount));

    const monthlyMap = new Map<string, { label: string; monthKey: string; received: number; open: number; overdue: number }>();
    rows.forEach((item) => {
      const monthKey = getDateKey(item).slice(0, 7);
      if (!monthKey) return;
      const date = parseDateOnly(`${monthKey}-01`);
      const label = date
        ? new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" }).format(date).replace(".", "").replace(/^\p{L}/u, (char) => char.toUpperCase())
        : monthKey;
      const current = monthlyMap.get(monthKey) || { label, monthKey, received: 0, open: 0, overdue: 0 };

      if (item.status === "paid") current.received += toNumber(item.amount);
      else if (item.status === "overdue") current.overdue += toNumber(item.amount);
      else current.open += toNumber(item.amount);

      monthlyMap.set(monthKey, current);
    });

    return {
      filteredInstallments: rows,
      previousInstallments: previousRows,
      metrics: {
        totalReceived,
        estimatedProfit,
        delinquencyRate,
        ticketAverage,
        health: {
          score: healthScore,
          scoreLabel: healthLabel,
          healthyContracts,
          contractsAtRisk,
          overdueCustomers,
          averageTicket: ticketAverage,
          averageInstallment,
          openInterestPotential,
          collectionRateThisMonth,
          overdueExposure: overdueAmount,
        },
      },
      reportMetrics,
      previousMetrics,
      topDebtors: topDebtorsRows,
      recentPaid: recentPaidRows,
      chart: {
        period: monthlyMap.size <= 3 ? "3m" : monthlyMap.size <= 6 ? "6m" : "12m",
        points: [...monthlyMap.values()].sort((left, right) => left.monthKey.localeCompare(right.monthKey)).slice(-6),
        hasData: monthlyMap.size > 0,
        emptyMessage: "Sem dados para o filtro aplicado.",
      },
    };
  }, [appliedFilters, installments, loans, todayDate]);

  const topDebtorsTotalPages = Math.max(1, Math.ceil(topDebtors.length / PAGE_SIZE));
  const recentPaidTotalPages = Math.max(1, Math.ceil(recentPaid.length / PAGE_SIZE));
  const topDebtorsPageRows = topDebtors.slice((topDebtorsPage - 1) * PAGE_SIZE, topDebtorsPage * PAGE_SIZE);
  const recentPaidPageRows = recentPaid.slice((recentPaidPage - 1) * PAGE_SIZE, recentPaidPage * PAGE_SIZE);

  function applyFilters() {
    setAppliedFilters(draftFilters);
    setTopDebtorsPage(1);
    setRecentPaidPage(1);
  }

  function clearFilters() {
    setDraftFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    setTopDebtorsPage(1);
    setRecentPaidPage(1);
  }

  return (
    <div className="w-full">
      <section className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[clamp(2rem,1.2vw+1.2rem,2.55rem)] font-bold leading-[1.04] tracking-[-0.04em] text-slate-100">
            Relatorios
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-8 text-slate-300">
            Resumo da carteira, risco e performance operacional no recorte selecionado.
          </p>
        </div>

        <div className="grid gap-3 text-left lg:justify-items-end lg:text-right">
          <div className="flex flex-wrap gap-2">
            <Button disabled variant="outline" className="rounded-2xl border-slate-700/70 bg-slate-950/30 text-slate-300">
              <FileSpreadsheet className="size-4" />
              Exportar CSV
            </Button>
            <Button disabled variant="outline" className="rounded-2xl border-slate-700/70 bg-slate-950/30 text-slate-300">
              <FileDown className="size-4" />
              Exportar PDF
            </Button>
          </div>
          <div className="text-sm text-slate-400">
            Atualizado: <span className="font-number text-slate-200">{formatDateTime(initialPayload?.meta?.generatedAt, initialPayload?.meta?.timezone)}</span>
          </div>
        </div>
      </section>

      {initialError ? (
        <div className="mb-5 rounded-2xl border border-rose-400/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
          {initialError}
        </div>
      ) : null}

      <section className="mb-5 rounded-[24px] border border-sky-500/14 bg-[linear-gradient(180deg,rgba(8,16,31,0.96),rgba(8,15,28,0.88))] p-4 shadow-[0_18px_38px_rgba(2,6,23,0.22)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[1.08rem] font-bold tracking-[-0.02em] text-slate-100">Filtros avancados</h2>
          </div>
          <button type="button" onClick={() => setFiltersOpen((current) => !current)} className="inline-flex items-center gap-2 rounded-xl border border-slate-700/50 bg-slate-950/35 px-3 py-2 text-xs font-semibold text-slate-300">
            <ChevronDown className={`size-4 transition ${filtersOpen ? "rotate-180" : ""}`} />
            {filtersOpen ? "Ocultar filtros" : "Mostrar filtros"}
          </button>
        </div>

        {filtersOpen ? (
          <div className="mt-4 grid gap-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="grid gap-2">
                <span className="text-[0.76rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Periodo</span>
                <select value={draftFilters.period} onChange={(event) => setDraftFilters((current) => ({ ...current, period: event.target.value as ReportPeriodKey }))} className="h-11 rounded-2xl border border-border/70 bg-background/40 px-4 text-sm text-foreground outline-none transition focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/40">
                  <option value="all">Todo periodo</option>
                  <option value="month_current">Mes atual</option>
                  <option value="month_previous">Mes anterior</option>
                  <option value="last7">Ultimos 7 dias</option>
                  <option value="last15">Ultimos 15 dias</option>
                  <option value="last30">Ultimos 30 dias</option>
                  <option value="custom">Intervalo custom</option>
                </select>
              </label>

              {draftFilters.period === "custom" ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:col-span-2">
                  <label className="grid gap-2">
                    <span className="text-[0.76rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Data inicial</span>
                    <Input type="date" value={draftFilters.customStartDate} onChange={(event) => setDraftFilters((current) => ({ ...current, customStartDate: event.target.value }))} />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-[0.76rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Data final</span>
                    <Input type="date" value={draftFilters.customEndDate} onChange={(event) => setDraftFilters((current) => ({ ...current, customEndDate: event.target.value }))} />
                  </label>
                </div>
              ) : null}

              <label className="grid gap-2">
                <span className="text-[0.76rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Cliente</span>
                <select value={draftFilters.customer} onChange={(event) => setDraftFilters((current) => ({ ...current, customer: event.target.value }))} className="h-11 rounded-2xl border border-border/70 bg-background/40 px-4 text-sm text-foreground outline-none transition focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/40">
                  <option value="all">Todos os clientes</option>
                  {customers.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-[0.76rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Busca de cliente</span>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                  <Input value={draftFilters.clientSearch} onChange={(event) => setDraftFilters((current) => ({ ...current, clientSearch: event.target.value }))} placeholder="Nome do cliente" className="pl-11" />
                </div>
              </label>

              <label className="grid gap-2">
                <span className="text-[0.76rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Status</span>
                <select value={draftFilters.status} onChange={(event) => setDraftFilters((current) => ({ ...current, status: event.target.value as ReportFilters["status"] }))} className="h-11 rounded-2xl border border-border/70 bg-background/40 px-4 text-sm text-foreground outline-none transition focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/40">
                  <option value="all">Todos</option>
                  <option value="paid">Pago</option>
                  <option value="pending">Pendente</option>
                  <option value="overdue">Atrasado</option>
                  <option value="due-today">Vence hoje</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-[0.76rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Tipo de juros</span>
                <select value={draftFilters.interestType} onChange={(event) => setDraftFilters((current) => ({ ...current, interestType: event.target.value as ReportFilters["interestType"] }))} className="h-11 rounded-2xl border border-border/70 bg-background/40 px-4 text-sm text-foreground outline-none transition focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/40">
                  <option value="all">Todos</option>
                  <option value="simples">Simples</option>
                  <option value="composto">Composto</option>
                  <option value="fixo">Valor fixo</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-[0.76rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Forma</span>
                <select value={draftFilters.frequency} onChange={(event) => setDraftFilters((current) => ({ ...current, frequency: event.target.value as ReportFilters["frequency"] }))} className="h-11 rounded-2xl border border-border/70 bg-background/40 px-4 text-sm text-foreground outline-none transition focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/40">
                  <option value="all">Todas</option>
                  <option value="mensal">Mensal</option>
                  <option value="quinzenal">Quinzenal</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-[0.76rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Valor min.</span>
                <Input type="number" min="0" step="0.01" value={draftFilters.minValue} onChange={(event) => setDraftFilters((current) => ({ ...current, minValue: event.target.value }))} placeholder="0,00" />
              </label>

              <label className="grid gap-2">
                <span className="text-[0.76rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Valor max.</span>
                <Input type="number" min="0" step="0.01" value={draftFilters.maxValue} onChange={(event) => setDraftFilters((current) => ({ ...current, maxValue: event.target.value }))} placeholder="0,00" />
              </label>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-700/45 bg-slate-950/35 px-3 py-2 text-sm font-semibold text-slate-300">
                <input type="checkbox" checked={draftFilters.onlyOverdue} onChange={(event) => setDraftFilters((current) => ({ ...current, onlyOverdue: event.target.checked }))} className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-sky-500" />
                Somente atrasados
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={applyFilters}>Aplicar</Button>
                <Button type="button" variant="outline" onClick={clearFilters}>Limpar</Button>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="mb-5 grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <PortfolioHealthPanel health={metrics.health} />
        <div className="grid gap-4 md:grid-cols-2">
          <KpiCard label="Receita do periodo" note={`${filteredInstallments.filter((item) => item.status === "paid").length} parcela(s) recebida(s) no recorte.`} value={formatCurrency(metrics.totalReceived)} />
          <KpiCard label="Lucro liquido estimado" note="Margem de juros da carteira filtrada." value={formatCurrency(metrics.estimatedProfit)} />
          <KpiCard label="Taxa de inadimplencia real" note="Saldo vencido sobre o total previsto no recorte." value={formatPercent(metrics.delinquencyRate)} />
          <KpiCard label="Ticket medio" note="Valor medio por contrato dentro do filtro aplicado." value={formatCurrency(metrics.ticketAverage)} />
        </div>
      </section>

      <section id="reportChart" className="mb-5">
        <PortfolioMonthlyChart chart={chart} />
      </section>

      <section className="mb-5 grid gap-5 xl:grid-cols-2">
        <ReportRiskMapPanel rows={filteredInstallments} metrics={reportMetrics} todayDate={todayDate} />
        <ReportDuePressurePanel rows={filteredInstallments} totalExpected={reportMetrics.totalExpected} todayDate={todayDate} />
      </section>

      <section className="mb-5">
        <ReportInsightsPanel rows={filteredInstallments} previousRows={previousInstallments} metrics={reportMetrics} previousMetrics={previousMetrics} todayDate={todayDate} />
      </section>

      <section className="mb-5">
        <ReportProjectionPanel rows={filteredInstallments} metrics={reportMetrics} todayDate={todayDate} />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div id="topDebtorsTable">
          <TableShell title="Top clientes (risco/concentracao)">
          {topDebtorsPageRows.length > 0 ? (
            <>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-[760px] w-full border-collapse">
                  <thead>
                    <tr className="border-y border-slate-700/55">
                      <th className="px-4 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Cliente</th>
                      <th className="px-4 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Parcelas em atraso</th>
                      <th className="px-4 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Saldo em atraso</th>
                      <th className="px-4 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Total em aberto</th>
                      <th className="px-4 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Ultimo pagamento</th>
                      <th className="px-4 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topDebtorsPageRows.map((item) => (
                      <tr key={item.customerName} className="border-t border-slate-800/80">
                        <td className="px-4 py-4 text-sm font-semibold text-slate-100">{item.customerName}</td>
                        <td className="px-4 py-4 text-sm text-slate-300">{item.overdueCount}</td>
                        <td className="font-number px-4 py-4 text-sm text-rose-200">{formatCurrency(item.overdueBalance)}</td>
                        <td className="font-number px-4 py-4 text-sm text-slate-100">{formatCurrency(item.openBalance)}</td>
                        <td className="px-4 py-4 text-sm text-slate-300">{formatDateOnly(item.lastPaymentDate)}</td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <Link href="/app/clientes" className="inline-flex min-h-[2rem] items-center rounded-[10px] border border-slate-700/60 bg-slate-950/40 px-3 text-xs font-medium text-slate-200 transition hover:border-sky-400/35 hover:bg-slate-900/80">
                              Cliente
                            </Link>
                            <Link href={`/app/parcelas?customer=${encodeURIComponent(String(item.customerName || ""))}&status=overdue`} className="inline-flex min-h-[2rem] items-center rounded-[10px] border border-amber-500/25 bg-amber-950/40 px-3 text-xs font-medium text-amber-50 transition hover:border-amber-400/35 hover:bg-amber-900/60">
                              Atrasos
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <Button type="button" variant="outline" size="sm" disabled={topDebtorsPage <= 1} onClick={() => setTopDebtorsPage((current) => Math.max(1, current - 1))}>Anterior</Button>
                <span>Pagina {topDebtorsPage} de {topDebtorsTotalPages}</span>
                <Button type="button" variant="outline" size="sm" disabled={topDebtorsPage >= topDebtorsTotalPages} onClick={() => setTopDebtorsPage((current) => Math.min(topDebtorsTotalPages, current + 1))}>Proxima</Button>
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-[18px] border border-slate-700/45 bg-slate-950/35 px-5 py-7 text-center">
              <p className="text-base font-semibold text-slate-100">Sem clientes em risco</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">Nenhum cliente ficou com saldo em atraso para o filtro aplicado.</p>
            </div>
          )}
          </TableShell>
        </div>

        <div id="recentPaidTable">
          <TableShell title="Ultimas parcelas pagas">
          {recentPaidPageRows.length > 0 ? (
            <>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-[620px] w-full border-collapse">
                  <thead>
                    <tr className="border-y border-slate-700/55">
                      <th className="px-4 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Data</th>
                      <th className="px-4 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Cliente</th>
                      <th className="px-4 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Parcela</th>
                      <th className="px-4 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPaidPageRows.map((item) => (
                      <tr key={item.id} className="border-t border-slate-800/80">
                        <td className="px-4 py-4 text-sm text-slate-300">{formatDateOnly(item.paidDate)}</td>
                        <td className="px-4 py-4 text-sm font-semibold text-slate-100">{item.customerName}</td>
                        <td className="px-4 py-4 text-sm text-slate-300">{item.installmentLabel}</td>
                        <td className="font-number px-4 py-4 text-sm text-emerald-200">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <Button type="button" variant="outline" size="sm" disabled={recentPaidPage <= 1} onClick={() => setRecentPaidPage((current) => Math.max(1, current - 1))}>Anterior</Button>
                <span>Pagina {recentPaidPage} de {recentPaidTotalPages}</span>
                <Button type="button" variant="outline" size="sm" disabled={recentPaidPage >= recentPaidTotalPages} onClick={() => setRecentPaidPage((current) => Math.min(recentPaidTotalPages, current + 1))}>Proxima</Button>
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-[18px] border border-slate-700/45 bg-slate-950/35 px-5 py-7 text-center">
              <p className="text-base font-semibold text-slate-100">Sem pagamentos recentes</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">As ultimas parcelas pagas vao aparecer aqui conforme o filtro encontrar baixas.</p>
            </div>
          )}
          </TableShell>
        </div>
      </section>
    </div>
  );
}
