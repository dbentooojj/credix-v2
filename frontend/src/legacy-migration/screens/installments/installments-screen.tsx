"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarCheck2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FilterX,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  ApiClientError,
  createPayment,
  deleteInstallment,
  getLegacyTableData,
  revertInstallmentPayment,
  type LegacyTableRow,
  type PaymentMethod,
} from "../../services";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";

type MessageTone = "success" | "error";
type PeriodFilter = "all" | "today" | "next7" | "month_current" | "last30" | "custom";
type StatusFilter = "Todos" | "Pago" | "Pendente" | "Atrasado";
type PaymentMethodFilter = "Todas" | "Pix" | "Dinheiro" | "Transferencia" | "Cartao" | "Outro";
type KpiFilterKey = "" | "paid_month" | "pending_total" | "overdue_total";
type InstallmentModalMode = "details" | "payment" | "refund" | "confirmDelete";
type InstallmentStatus = "Pago" | "Pendente" | "Atrasado";
type InstallmentPaymentMethod = "Pix" | "Dinheiro" | "Transferencia" | "Cartao" | "Outro" | "";

type BannerMessage = {
  tone: MessageTone;
  text: string;
};

type DebtorRow = LegacyTableRow & {
  id?: string | number | null;
  name?: string | null;
  full_name?: string | null;
  phone?: string | null;
};

type LoanRow = LegacyTableRow & {
  id?: string | number | null;
  debtor_id?: string | number | null;
  client_id?: string | number | null;
  clientId?: string | number | null;
  principal_amount?: number | string | null;
  principalAmount?: number | string | null;
  total_amount?: number | string | null;
  totalAmount?: number | string | null;
  installments_count?: number | string | null;
  installmentsCount?: number | string | null;
  interest_rate?: number | string | null;
  interestRate?: number | string | null;
  interest_type?: string | null;
  interestType?: string | null;
  payment_method?: string | null;
  paymentMethod?: string | null;
};

type InstallmentRow = LegacyTableRow & {
  id?: string | number | null;
  loan_id?: string | number | null;
  loanId?: string | number | null;
  debtor_id?: string | number | null;
  client_id?: string | number | null;
  clientId?: string | number | null;
  installment_number?: number | string | null;
  installmentNumber?: number | string | null;
  number?: number | string | null;
  due_date?: string | null;
  dueDate?: string | null;
  payment_date?: string | null;
  paymentDate?: string | null;
  amount?: number | string | null;
  paid_amount?: number | string | null;
  payment_method?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
  status?: string | null;
  principal_amount?: number | string | null;
  principalAmount?: number | string | null;
  interest_amount?: number | string | null;
  interestAmount?: number | string | null;
};

type DebtorModel = {
  id: string;
  name: string;
  phone: string;
};

type LoanModel = {
  id: string;
  debtorId: string;
  principalAmount: number;
  totalAmount: number;
  installmentsCount: number;
  interestRate: number;
  interestType: "simples" | "composto";
  paymentMethod: InstallmentPaymentMethod;
};

type InstallmentModel = {
  id: string;
  loanId: string;
  debtorId: string;
  installmentNumber: number;
  dueDate: string;
  paymentDate: string;
  amount: number;
  paidAmount: number;
  paymentMethod: InstallmentPaymentMethod;
  notes: string;
  status: string;
  principalAmount: number | null;
  interestAmount: number | null;
};

type InsightTone = "positive" | "negative" | "neutral";
type KpiInsight = {
  tone: InsightTone;
  text: string;
};

type DeleteImpact = {
  currentCount: number;
  remainingCount: number;
  newTotalAmount: number;
  preservedSequenceTotal: number;
  isOnlyInstallment: boolean;
};

type PeriodBounds = {
  start: Date | null;
  end: Date | null;
  isMonthly: boolean;
};

const PAGE_SIZE = 10;

function sameId(a: unknown, b: unknown) {
  return String(a ?? "") === String(b ?? "");
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round2(value: unknown) {
  return Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;
}

function normalizeAscii(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function parseDateValue(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return new Date(value.getTime());

  const raw = String(value).trim();
  const dateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]) - 1;
    const day = Number(dateOnlyMatch[3]);
    return new Date(year, month, day);
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function startOfDay(value: unknown): Date | null {
  const date = parseDateValue(value);
  if (!date) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function toIsoDate(value: unknown) {
  const date = parseDateValue(value);
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(toNumber(value));
}

function formatDate(value: unknown) {
  const date = parseDateValue(value);
  if (!date) return "-";
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function normalizePaymentMethod(value: unknown, notes: unknown = ""): InstallmentPaymentMethod {
  const source = normalizeAscii(value);
  const notesSource = normalizeAscii(notes);
  if (notesSource.includes("forma informada: outro")) return "Outro";
  if (source.includes("pix")) return "Pix";
  if (source.includes("dinheiro")) return "Dinheiro";
  if (source.includes("transfer")) return "Transferencia";
  if (source.includes("cartao")) return "Cartao";
  if (source.includes("outro")) return "Outro";
  return "";
}

function toApiPaymentMethod(value: unknown): PaymentMethod {
  const source = normalizeAscii(value);
  if (source.includes("dinheiro")) return "DINHEIRO";
  if (source.includes("transfer")) return "TRANSFERENCIA";
  if (source.includes("cartao")) return "CARTAO";
  return "PIX";
}

function normalizeLoanRow(row: LoanRow): LoanModel {
  return {
    id: String(row.id ?? ""),
    debtorId: String(row.debtor_id ?? row.client_id ?? row.clientId ?? ""),
    principalAmount: round2(row.principal_amount ?? row.principalAmount ?? 0),
    totalAmount: round2(row.total_amount ?? row.totalAmount ?? 0),
    installmentsCount: Math.max(1, Math.trunc(toNumber(row.installments_count ?? row.installmentsCount ?? 1))),
    interestRate: round2(row.interest_rate ?? row.interestRate ?? 0),
    interestType: normalizeAscii(row.interest_type ?? row.interestType) === "simples" ? "simples" : "composto",
    paymentMethod: normalizePaymentMethod(row.payment_method ?? row.paymentMethod),
  };
}

function normalizeInstallmentRow(row: InstallmentRow): InstallmentModel {
  return {
    id: String(row.id ?? ""),
    loanId: String(row.loan_id ?? row.loanId ?? ""),
    debtorId: String(row.debtor_id ?? row.client_id ?? row.clientId ?? ""),
    installmentNumber: Math.max(1, Math.trunc(toNumber(row.installment_number ?? row.installmentNumber ?? row.number ?? 1))),
    dueDate: toIsoDate(row.due_date ?? row.dueDate),
    paymentDate: toIsoDate(row.payment_date ?? row.paymentDate),
    amount: round2(row.amount),
    paidAmount: round2(row.paid_amount ?? row.amount),
    paymentMethod: normalizePaymentMethod(row.payment_method ?? row.paymentMethod, row.notes),
    notes: String(row.notes ?? ""),
    principalAmount: row.principal_amount ?? row.principalAmount ? round2(row.principal_amount ?? row.principalAmount) : null,
    interestAmount: row.interest_amount ?? row.interestAmount ? round2(row.interest_amount ?? row.interestAmount) : null,
    status: String(row.status ?? "Pendente"),
  };
}

function normalizeDebtorRow(row: DebtorRow): DebtorModel {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? row.full_name ?? "Cliente nao identificado"),
    phone: String(row.phone ?? ""),
  };
}

function normalizeInstallmentStatus(installment: InstallmentModel): InstallmentStatus {
  const rawStatus = normalizeAscii(installment.status);
  if (rawStatus === "pago" || rawStatus === "paid") return "Pago";
  if (rawStatus === "atrasado") return "Atrasado";
  const dueDate = startOfDay(installment.dueDate);
  const today = startOfDay(new Date());
  if (dueDate && today && dueDate < today) return "Atrasado";
  return "Pendente";
}

function getStatusBadge(status: InstallmentStatus) {
  if (status === "Pago") {
    return {
      text: "Pago",
      className: "border border-emerald-400/35 bg-emerald-500/15 text-emerald-300",
    };
  }
  if (status === "Atrasado") {
    return {
      text: "Em atraso",
      className: "border border-rose-400/35 bg-rose-500/15 text-rose-300",
    };
  }
  return {
    text: "Em dia",
    className: "border border-slate-500/50 bg-slate-500/15 text-slate-300",
  };
}

function dueInDays(installment: InstallmentModel): number | null {
  const dueDate = startOfDay(installment.dueDate);
  const today = startOfDay(new Date());
  if (!dueDate || !today) return null;
  return Math.round((dueDate.getTime() - today.getTime()) / 86400000);
}

function getPeriodBoundsFromFilter(
  periodValue: PeriodFilter,
  customStartValue: string,
  customEndValue: string,
): PeriodBounds {
  const today = startOfDay(new Date());
  if (!today) return { start: null, end: null, isMonthly: false };

  if (periodValue === "today") return { start: today, end: today, isMonthly: false };

  if (periodValue === "next7") {
    const end = new Date(today.getTime());
    end.setDate(end.getDate() + 7);
    end.setHours(0, 0, 0, 0);
    return { start: today, end, isMonthly: false };
  }

  if (periodValue === "last30") {
    const start = new Date(today.getTime());
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    return { start, end: today, isMonthly: false };
  }

  if (periodValue === "custom") {
    let start = startOfDay(customStartValue);
    let end = startOfDay(customEndValue);
    if (start && end && start > end) {
      const temp = start;
      start = end;
      end = temp;
    }
    if (start && end) return { start, end, isMonthly: false };
  }

  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  return { start, end: today, isMonthly: true };
}

function shiftRangeByYears(start: Date | null, end: Date | null, years = -1) {
  if (!start || !end || end < start) return { start: null, end: null };
  const shiftedStart = new Date(start.getFullYear() + years, start.getMonth(), start.getDate());
  const shiftedEnd = new Date(end.getFullYear() + years, end.getMonth(), end.getDate());
  shiftedStart.setHours(0, 0, 0, 0);
  shiftedEnd.setHours(0, 0, 0, 0);
  return { start: shiftedStart, end: shiftedEnd };
}

function getMonthEquivalentBounds(referenceDate: Date, offsetMonths = 0) {
  const reference = startOfDay(referenceDate);
  if (!reference) return { start: null, end: null };
  const start = new Date(reference.getFullYear(), reference.getMonth() + offsetMonths, 1);
  start.setHours(0, 0, 0, 0);
  if (offsetMonths === 0) return { start, end: reference };
  const targetMonthLastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const boundedDay = Math.min(reference.getDate(), targetMonthLastDay);
  const end = new Date(start.getFullYear(), start.getMonth(), boundedDay);
  end.setHours(0, 0, 0, 0);
  return { start, end };
}

function getPreviousPeriodBounds(start: Date | null, end: Date | null, periodsBack = 1) {
  if (!start || !end || end < start) return { start: null, end: null };
  const durationDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  const offset = durationDays * Math.max(1, Math.trunc(toNumber(periodsBack, 1)));
  const shiftedStart = new Date(start.getTime() - offset * 86400000);
  const shiftedEnd = new Date(end.getTime() - offset * 86400000);
  shiftedStart.setHours(0, 0, 0, 0);
  shiftedEnd.setHours(0, 0, 0, 0);
  return { start: shiftedStart, end: shiftedEnd };
}

function getInsightComparisonRanges(periodValue: PeriodFilter, currentBounds: PeriodBounds) {
  const start = startOfDay(currentBounds.start);
  const end = startOfDay(currentBounds.end);
  if (!start || !end || end < start) {
    return {
      previous: { start: null, end: null },
      avgRanges: [{ start: null, end: null }, { start: null, end: null }, { start: null, end: null }],
      yearAgo: { start: null, end: null },
    };
  }

  if (periodValue === "month_current" || periodValue === "all") {
    const previous = getMonthEquivalentBounds(end, -1);
    const minus2 = getMonthEquivalentBounds(end, -2);
    const minus3 = getMonthEquivalentBounds(end, -3);
    const yearAgo = shiftRangeByYears(start, end, -1);
    return { previous, avgRanges: [previous, minus2, minus3], yearAgo };
  }

  const previous = getPreviousPeriodBounds(start, end, 1);
  const minus2 = getPreviousPeriodBounds(start, end, 2);
  const minus3 = getPreviousPeriodBounds(start, end, 3);
  const yearAgo = shiftRangeByYears(start, end, -1);
  return { previous, avgRanges: [previous, minus2, minus3], yearAgo };
}

function isDateInRange(value: unknown, start: Date | null, end: Date | null) {
  const date = startOfDay(value);
  if (!date || !start || !end) return false;
  return date >= start && date <= end;
}

function getInstallmentMetricInRange(
  metricKey: "received" | "pending" | "overdue",
  list: InstallmentModel[],
  start: Date | null,
  end: Date | null,
) {
  if (!start || !end) return 0;
  return list.reduce((sum, installment) => {
    const status = normalizeInstallmentStatus(installment);
    if (metricKey === "received") {
      if (status !== "Pago") return sum;
      if (!isDateInRange(installment.paymentDate, start, end)) return sum;
      return sum + toNumber(installment.paidAmount || installment.amount);
    }
    if (metricKey === "pending") {
      if (status === "Pago") return sum;
      if (!isDateInRange(installment.dueDate, start, end)) return sum;
      return sum + installment.amount;
    }
    if (status !== "Atrasado") return sum;
    if (!isDateInRange(installment.dueDate, start, end)) return sum;
    return sum + installment.amount;
  }, 0);
}

function getComparisonPercent(currentValue: number, baselineValue: number, minRobustBase = 0) {
  const current = Number.isFinite(currentValue) ? currentValue : 0;
  const baseline = Number.isFinite(baselineValue) ? baselineValue : 0;
  if (Math.abs(baseline) < Math.max(0, minRobustBase)) return null;
  return ((current - baseline) / Math.abs(baseline)) * 100;
}

function formatPercentMagnitude(percentValue: number) {
  return Math.abs(percentValue).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getInsightTone(percentValue: number, invert = false): InsightTone {
  if (!Number.isFinite(percentValue) || Math.abs(percentValue) < 0.005) return "neutral";
  const positive = percentValue > 0;
  if (invert) return positive ? "negative" : "positive";
  return positive ? "positive" : "negative";
}

function formatPrimaryInsightText(percentValue: number, label: string) {
  if (!Number.isFinite(percentValue) || Math.abs(percentValue) < 0.005) return `0,00% ${label}`;
  return `${percentValue > 0 ? "+" : "-"} ${formatPercentMagnitude(percentValue)}% ${label}`;
}

function formatSecondaryInsightText(percentValue: number, label: string) {
  if (!Number.isFinite(percentValue) || Math.abs(percentValue) < 0.005) return `${label}: 0,00%`;
  return `${label}: ${percentValue > 0 ? "+" : "-"}${formatPercentMagnitude(percentValue)}%`;
}

function buildSmartKpiInsight(
  currentValue: number,
  comparisons: { average3: number; previous: number; yearAgo: number },
  options: { invert?: boolean; minRobustBase?: number } = {},
): KpiInsight {
  const invert = options.invert ?? false;
  const minRobustBase = options.minRobustBase ?? 0;

  const average3Pct = getComparisonPercent(currentValue, comparisons.average3, minRobustBase);
  const previousPct = getComparisonPercent(currentValue, comparisons.previous, minRobustBase);
  const yearAgoPct = getComparisonPercent(currentValue, comparisons.yearAgo, minRobustBase);
  const hasAverage3Pct = average3Pct !== null && Number.isFinite(average3Pct);
  const hasPreviousPct = previousPct !== null && Number.isFinite(previousPct);
  const hasYearAgoPct = yearAgoPct !== null && Number.isFinite(yearAgoPct);

  const primary = hasAverage3Pct
    ? { key: "average3", pct: average3Pct, label: "vs media 3 periodos" }
    : hasPreviousPct
      ? { key: "previous", pct: previousPct, label: "vs periodo anterior" }
      : hasYearAgoPct
        ? { key: "yearAgo", pct: yearAgoPct, label: "vs A/A" }
        : null;

  if (!primary) return { tone: "neutral", text: "sem base robusta para comparacao" };

  const secondary: string[] = [];
  if (primary.key !== "previous" && hasPreviousPct) {
    secondary.push(formatSecondaryInsightText(previousPct, "M-1"));
  }
  if (primary.key !== "yearAgo" && hasYearAgoPct) {
    secondary.push(formatSecondaryInsightText(yearAgoPct, "A/A"));
  }
  if (primary.key !== "average3" && hasAverage3Pct) {
    secondary.unshift(formatSecondaryInsightText(average3Pct, "3P"));
  }

  let text = formatPrimaryInsightText(primary.pct, primary.label);
  if (secondary.length > 0) text += ` | ${secondary.join(" | ")}`;
  return { tone: getInsightTone(primary.pct, invert), text };
}

function insightClassName(tone: InsightTone) {
  if (tone === "positive") return "text-lm-positive";
  if (tone === "negative") return "text-lm-negative";
  return "text-lm-text-muted";
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiClientError) return error.message || fallback;
  return fallback;
}

function bannerClassName(tone: MessageTone) {
  return tone === "success"
    ? "border border-emerald-400/35 bg-emerald-500/10 text-emerald-200"
    : "border border-rose-400/35 bg-rose-500/10 text-rose-200";
}

function localTodayInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function InstallmentsScreen() {
  const [installments, setInstallments] = useState<InstallmentModel[]>([]);
  const [debtors, setDebtors] = useState<DebtorModel[]>([]);
  const [loans, setLoans] = useState<LoanModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState("--:--");
  const [banner, setBanner] = useState<BannerMessage | null>(null);

  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Todos");
  const [clientFilter, setClientFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethodFilter>("Todas");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [kpiFilter, setKpiFilter] = useState<KpiFilterKey>("");
  const [currentPage, setCurrentPage] = useState(1);

  const [installmentModalOpen, setInstallmentModalOpen] = useState(false);
  const [installmentModalMode, setInstallmentModalMode] = useState<InstallmentModalMode>("details");
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalPaymentDate, setModalPaymentDate] = useState(localTodayInputValue());
  const [modalPaymentMethod, setModalPaymentMethod] = useState<InstallmentPaymentMethod>("Pix");
  const [modalPaymentNotes, setModalPaymentNotes] = useState("");
  const [modalRefundReason, setModalRefundReason] = useState("");

  const debtorsById = useMemo(() => new Map(debtors.map((debtor) => [debtor.id, debtor])), [debtors]);
  const loansById = useMemo(() => new Map(loans.map((loan) => [loan.id, loan])), [loans]);

  const clientOptions = useMemo(() => {
    const options = new Map<string, { id: string; name: string }>();
    installments.forEach((installment) => {
      if (!installment.debtorId) return;
      if (options.has(installment.debtorId)) return;
      const debtor = debtorsById.get(installment.debtorId);
      options.set(installment.debtorId, {
        id: installment.debtorId,
        name: debtor?.name || "Cliente nao identificado",
      });
    });
    return [...options.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [debtorsById, installments]);

  useEffect(() => {
    if (clientFilter === "all") return;
    const exists = clientOptions.some((client) => client.id === clientFilter);
    if (!exists) setClientFilter("all");
  }, [clientFilter, clientOptions]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const statusParam = normalizeAscii(params.get("status"));
    const dueParam = normalizeAscii(params.get("due") ?? params.get("vence"));

    if (statusParam === "pending" || statusParam === "pendente") {
      setStatusFilter("Pendente");
    } else if (statusParam === "paid" || statusParam === "paga" || statusParam === "pago") {
      setStatusFilter("Pago");
    } else if (statusParam === "overdue" || statusParam === "atraso" || statusParam === "atrasada" || statusParam === "atrasado") {
      setStatusFilter("Atrasado");
    }

    if (dueParam === "today" || dueParam === "hoje") {
      setPeriodFilter("today");
    } else if (dueParam === "next7" || dueParam === "7dias" || dueParam === "7d") {
      setPeriodFilter("next7");
    } else if (
      dueParam === "month"
      || dueParam === "mes"
      || dueParam === "month_current"
      || dueParam === "current_month"
      || dueParam === "thismonth"
      || dueParam === "mes_atual"
    ) {
      setPeriodFilter("month_current");
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (banner) setBanner(null);
    }, 4200);
    return () => window.clearTimeout(timeoutId);
  }, [banner]);

  async function loadInstallmentsData(options: { silent?: boolean; preservePage?: boolean } = {}) {
    const silent = options.silent ?? false;
    const preservePage = options.preservePage ?? false;

    if (!silent && installments.length === 0) setLoading(true);

    try {
      const [installmentsResponse, debtorsResponse, loansResponse] = await Promise.all([
        getLegacyTableData<InstallmentRow>("installments"),
        getLegacyTableData<DebtorRow>("debtors"),
        getLegacyTableData<LoanRow>("loans"),
      ]);

      const nextInstallments = (Array.isArray(installmentsResponse.data) ? installmentsResponse.data : []).map(normalizeInstallmentRow);
      const nextDebtors = (Array.isArray(debtorsResponse.data) ? debtorsResponse.data : []).map(normalizeDebtorRow);
      const nextLoans = (Array.isArray(loansResponse.data) ? loansResponse.data : []).map(normalizeLoanRow);

      setInstallments(nextInstallments);
      setDebtors(nextDebtors);
      setLoans(nextLoans);

      if (!preservePage) setCurrentPage(1);

      setLastUpdatedAt(
        new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    } catch (error) {
      setBanner({
        tone: "error",
        text: error instanceof ApiClientError ? error.message : "Erro ao carregar parcelas. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInstallmentsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getDebtorName(debtorId: string) {
    const debtor = debtorsById.get(debtorId);
    return debtor?.name || "Cliente nao identificado";
  }

  function getDebtorPhone(debtorId: string) {
    const debtor = debtorsById.get(debtorId);
    return debtor?.phone || "";
  }

  function getLoanById(loanId: string) {
    return loansById.get(loanId) ?? null;
  }

  function getInstallmentPaymentMethod(installment: InstallmentModel): InstallmentPaymentMethod {
    if (installment.paymentMethod) return installment.paymentMethod;
    const loan = getLoanById(installment.loanId);
    return loan?.paymentMethod || "";
  }

  function getInstallmentLabel(installment: InstallmentModel) {
    const loan = getLoanById(installment.loanId);
    const totalFromLoan = Math.max(0, Math.trunc(toNumber(loan?.installmentsCount, 0)));
    const total = Math.max(installment.installmentNumber, totalFromLoan);
    return total > 0 ? `${installment.installmentNumber}/${total}` : String(installment.installmentNumber);
  }

  function getLoanSummary(loan: LoanModel | null) {
    if (!loan) return "Sem resumo";
    const principal = formatCurrency(loan.principalAmount);
    const interest = loan.interestType === "simples" ? `Simples ${loan.interestRate}%` : `Composto ${loan.interestRate}%`;
    return `Principal ${principal} | ${interest}`;
  }

  function getDueHint(installment: InstallmentModel, status: InstallmentStatus) {
    if (status === "Pago") {
      if (!installment.paymentDate) return "(paga)";
      return `(paga em ${formatDate(installment.paymentDate)})`;
    }
    const days = dueInDays(installment);
    if (days === null || !Number.isFinite(days)) return "";
    if (days < 0) return `(ha ${Math.abs(days)} dia(s))`;
    if (days === 0) return "(hoje)";
    return `(em ${days} dia(s))`;
  }

  function clearInstallmentFilters() {
    setSearchValue("");
    setStatusFilter("Todos");
    setClientFilter("all");
    setPeriodFilter("all");
    setPaymentMethodFilter("Todas");
    setCustomStartDate("");
    setCustomEndDate("");
    setKpiFilter("");
    setCurrentPage(1);
  }

  function applyKpiFilter(filterKey: Exclude<KpiFilterKey, "">) {
    if (kpiFilter === filterKey) {
      clearInstallmentFilters();
      return;
    }

    setKpiFilter(filterKey);
    if (filterKey === "paid_month") {
      setStatusFilter("Pago");
      setPeriodFilter("month_current");
    } else if (filterKey === "pending_total") {
      setStatusFilter("Pendente");
      setPeriodFilter("all");
    } else {
      setStatusFilter("Atrasado");
      setPeriodFilter("all");
    }
    setCurrentPage(1);
  }

  const filteredInstallments = useMemo(() => {
    const search = searchValue.trim().toLowerCase();

    const next = installments.filter((installment) => {
      const status = normalizeInstallmentStatus(installment);
      const dueDate = startOfDay(installment.dueDate);

      if (statusFilter !== "Todos" && status !== statusFilter) return false;
      if (clientFilter !== "all" && !sameId(installment.debtorId, clientFilter)) return false;

      if (kpiFilter === "paid_month") {
        if (status !== "Pago") return false;
        const paymentDate = parseDateValue(installment.paymentDate);
        const now = new Date();
        if (!paymentDate || paymentDate.getMonth() !== now.getMonth() || paymentDate.getFullYear() !== now.getFullYear()) {
          return false;
        }
      } else if (kpiFilter === "pending_total") {
        if (status !== "Pendente") return false;
      } else if (kpiFilter === "overdue_total") {
        if (status !== "Atrasado") return false;
      }

      if (periodFilter === "today") {
        const days = dueInDays(installment);
        if (days === null || !Number.isFinite(days) || days !== 0) return false;
      } else if (periodFilter === "next7") {
        const days = dueInDays(installment);
        if (days === null || !Number.isFinite(days) || days < 0 || days > 7) return false;
      } else if (periodFilter === "month_current") {
        const today = startOfDay(new Date());
        if (!today || !dueDate || dueDate.getMonth() !== today.getMonth() || dueDate.getFullYear() !== today.getFullYear()) {
          return false;
        }
      } else if (periodFilter === "last30") {
        const today = startOfDay(new Date());
        if (!today || !dueDate) return false;
        const start = new Date(today.getTime());
        start.setDate(start.getDate() - 29);
        if (dueDate < start || dueDate > today) return false;
      } else if (periodFilter === "custom") {
        const start = startOfDay(customStartDate);
        const end = startOfDay(customEndDate);
        if (start && end && (!dueDate || dueDate < start || dueDate > end)) return false;
      }

      if (paymentMethodFilter !== "Todas") {
        const method = getInstallmentPaymentMethod(installment);
        if (method !== paymentMethodFilter) return false;
      }

      if (!search) return true;
      const debtorName = getDebtorName(installment.debtorId).toLowerCase();
      const phone = getDebtorPhone(installment.debtorId).toLowerCase();
      const loanId = installment.loanId.toLowerCase();
      const number = String(installment.installmentNumber).toLowerCase();
      const installmentId = installment.id.toLowerCase();

      return (
        debtorName.includes(search)
        || phone.includes(search)
        || loanId.includes(search)
        || number.includes(search)
        || installmentId.includes(search)
      );
    });

    next.sort((left, right) => {
      const statusLeft = normalizeInstallmentStatus(left);
      const statusRight = normalizeInstallmentStatus(right);
      const rankLeft = statusLeft === "Atrasado" ? 0 : statusLeft === "Pendente" ? 1 : 2;
      const rankRight = statusRight === "Atrasado" ? 0 : statusRight === "Pendente" ? 1 : 2;
      if (rankLeft !== rankRight) return rankLeft - rankRight;

      const dueLeft = dueInDays(left);
      const dueRight = dueInDays(right);
      const safeLeft = dueLeft !== null && Number.isFinite(dueLeft) ? dueLeft : 999999;
      const safeRight = dueRight !== null && Number.isFinite(dueRight) ? dueRight : 999999;
      if (safeLeft !== safeRight) return safeLeft - safeRight;

      return toNumber(left.id) - toNumber(right.id);
    });

    return next;
  }, [
    clientFilter,
    customEndDate,
    customStartDate,
    installments,
    kpiFilter,
    paymentMethodFilter,
    periodFilter,
    searchValue,
    statusFilter,
    debtorsById,
    loansById,
  ]);

  const summaryKpis = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const receivedThisMonthInstallments = installments.filter((installment) => {
      if (normalizeInstallmentStatus(installment) !== "Pago") return false;
      const paymentDate = parseDateValue(installment.paymentDate);
      return Boolean(paymentDate && paymentDate.getMonth() === month && paymentDate.getFullYear() === year);
    });
    const pendingInstallments = installments.filter((installment) => normalizeInstallmentStatus(installment) === "Pendente");
    const overdueInstallments = installments.filter((installment) => normalizeInstallmentStatus(installment) === "Atrasado");

    const receivedThisMonth = receivedThisMonthInstallments.reduce((sum, installment) => {
      return sum + toNumber(installment.paidAmount || installment.amount);
    }, 0);
    const pendingTotal = pendingInstallments.reduce((sum, installment) => sum + installment.amount, 0);
    const overdueTotal = overdueInstallments.reduce((sum, installment) => sum + installment.amount, 0);

    const currentBounds = getPeriodBoundsFromFilter(periodFilter, customStartDate, customEndDate);
    const comparisons = getInsightComparisonRanges(periodFilter, currentBounds);

    function metricComparisons(metricKey: "received" | "pending" | "overdue") {
      const current = getInstallmentMetricInRange(metricKey, installments, currentBounds.start, currentBounds.end);
      const previous = getInstallmentMetricInRange(metricKey, installments, comparisons.previous.start, comparisons.previous.end);
      const yearAgo = getInstallmentMetricInRange(metricKey, installments, comparisons.yearAgo.start, comparisons.yearAgo.end);
      const avgValues = comparisons.avgRanges.map((range) =>
        getInstallmentMetricInRange(metricKey, installments, range.start, range.end),
      );
      const average3 = avgValues.length > 0 ? avgValues.reduce((sum, value) => sum + value, 0) / avgValues.length : 0;
      return { current, previous, average3, yearAgo };
    }

    const receivedComparison = metricComparisons("received");
    const pendingComparison = metricComparisons("pending");
    const overdueComparison = metricComparisons("overdue");

    const receivedPrefix = currentBounds.isMonthly ? "Mes atual:" : "Periodo atual:";
    const pendingPrefix = currentBounds.isMonthly ? "Em aberto no mes:" : "Em aberto no periodo:";
    const overduePrefix = currentBounds.isMonthly ? "Atrasos no mes:" : "Atrasos no periodo:";

    return {
      receivedThisMonth,
      receivedThisMonthCount: receivedThisMonthInstallments.length,
      pendingTotal,
      pendingCount: pendingInstallments.length,
      overdueTotal,
      overdueCount: overdueInstallments.length,
      receivedInsight: {
        prefix: receivedPrefix,
        ...buildSmartKpiInsight(receivedComparison.current, {
          average3: receivedComparison.average3,
          previous: receivedComparison.previous,
          yearAgo: receivedComparison.yearAgo,
        }, { minRobustBase: 50 }),
      },
      pendingInsight: {
        prefix: pendingPrefix,
        ...buildSmartKpiInsight(pendingComparison.current, {
          average3: pendingComparison.average3,
          previous: pendingComparison.previous,
          yearAgo: pendingComparison.yearAgo,
        }, { invert: true, minRobustBase: 50 }),
      },
      overdueInsight: {
        prefix: overduePrefix,
        ...buildSmartKpiInsight(overdueComparison.current, {
          average3: overdueComparison.average3,
          previous: overdueComparison.previous,
          yearAgo: overdueComparison.yearAgo,
        }, { invert: true, minRobustBase: 50 }),
      },
    };
  }, [installments, periodFilter, customStartDate, customEndDate]);

  const totalPages = Math.max(1, Math.ceil(filteredInstallments.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const currentPageRows = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = Math.min(startIndex + PAGE_SIZE, filteredInstallments.length);
    return filteredInstallments.slice(startIndex, endIndex);
  }, [currentPage, filteredInstallments]);

  const pagination = useMemo(() => {
    const total = filteredInstallments.length;
    const startIndex = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE;
    const endIndex = total === 0 ? 0 : Math.min(startIndex + PAGE_SIZE, total);
    return {
      start: total === 0 ? 0 : startIndex + 1,
      end: endIndex,
      total,
    };
  }, [currentPage, filteredInstallments.length]);

  const selectedInstallment = useMemo(() => {
    if (!selectedInstallmentId) return null;
    return installments.find((item) => sameId(item.id, selectedInstallmentId)) ?? null;
  }, [installments, selectedInstallmentId]);

  function getInstallmentsByLoan(loanId: string) {
    return installments
      .filter((item) => sameId(item.loanId, loanId))
      .sort((left, right) => {
        const numberDiff = left.installmentNumber - right.installmentNumber;
        if (numberDiff !== 0) return numberDiff;
        const dueLeft = startOfDay(left.dueDate)?.getTime() ?? 0;
        const dueRight = startOfDay(right.dueDate)?.getTime() ?? 0;
        if (dueLeft !== dueRight) return dueLeft - dueRight;
        return toNumber(left.id) - toNumber(right.id);
      });
  }

  function getDeleteImpact(installment: InstallmentModel): DeleteImpact {
    const loanInstallments = getInstallmentsByLoan(installment.loanId);
    const remaining = loanInstallments.filter((item) => !sameId(item.id, installment.id));
    const newTotalAmount = remaining.reduce((sum, item) => sum + item.amount, 0);
    const preservedSequenceTotal = remaining.reduce((max, item) => {
      const value = Math.max(0, Math.trunc(toNumber(item.installmentNumber, 0)));
      return value > max ? value : max;
    }, 0);
    return {
      currentCount: loanInstallments.length,
      remainingCount: remaining.length,
      newTotalAmount,
      preservedSequenceTotal,
      isOnlyInstallment: loanInstallments.length <= 1,
    };
  }

  function closeInstallmentModal() {
    setInstallmentModalOpen(false);
    setInstallmentModalMode("details");
    setSelectedInstallmentId(null);
    setModalSubmitting(false);
  }

  function setModalModeWithGuard(mode: InstallmentModalMode, installment: InstallmentModel) {
    const status = normalizeInstallmentStatus(installment);
    if (mode === "payment" && status === "Pago") {
      setBanner({ tone: "error", text: "Essa parcela ja esta paga." });
      setInstallmentModalMode("details");
      return;
    }
    if (mode === "refund" && status !== "Pago") {
      setBanner({ tone: "error", text: "Somente parcelas pagas podem ser estornadas." });
      setInstallmentModalMode("details");
      return;
    }
    setInstallmentModalMode(mode);
  }

  function openInstallmentModal(installmentId: string, mode: InstallmentModalMode = "details") {
    const installment = installments.find((item) => sameId(item.id, installmentId));
    if (!installment) return;

    const loan = getLoanById(installment.loanId);
    setSelectedInstallmentId(installment.id);
    setModalSubmitting(false);
    setModalPaymentDate(localTodayInputValue());
    setModalPaymentMethod(getInstallmentPaymentMethod(installment) || loan?.paymentMethod || "Pix");
    setModalPaymentNotes("");
    setModalRefundReason("");
    setInstallmentModalOpen(true);
    setModalModeWithGuard(mode, installment);
  }

  useEffect(() => {
    if (!installmentModalOpen) return;
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") closeInstallmentModal();
    }
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [installmentModalOpen]);

  async function submitInstallmentPaymentFromModal() {
    const installment = selectedInstallment;
    if (!installment) {
      setBanner({ tone: "error", text: "Parcela nao encontrada." });
      closeInstallmentModal();
      return;
    }

    if (!modalPaymentDate || !modalPaymentMethod) {
      setBanner({ tone: "error", text: "Preencha os campos obrigatorios do pagamento." });
      return;
    }

    const numericLoanId = toNumber(installment.loanId);
    const numericInstallmentId = toNumber(installment.id);
    if (numericLoanId <= 0 || numericInstallmentId <= 0) {
      setBanner({ tone: "error", text: "Parcela invalida para registro de pagamento." });
      return;
    }

    setModalSubmitting(true);
    try {
      const methodToPersist = modalPaymentMethod === "Outro" ? "Pix" : modalPaymentMethod;
      const apiMethod = toApiPaymentMethod(methodToPersist);
      const notesWithMethod = modalPaymentMethod === "Outro"
        ? `Forma informada: Outro${modalPaymentNotes ? ` | ${modalPaymentNotes.trim()}` : ""}`
        : modalPaymentNotes;

      await createPayment({
        loanId: numericLoanId,
        installmentId: numericInstallmentId,
        amount: round2(installment.amount),
        paymentDate: modalPaymentDate,
        method: apiMethod,
        notes: notesWithMethod || undefined,
      });

      setBanner({ tone: "success", text: "Pagamento registrado com sucesso." });
      await loadInstallmentsData({ silent: true, preservePage: true });
      setInstallmentModalMode("details");
    } catch (error) {
      if (error instanceof ApiClientError) {
        setBanner({
          tone: "error",
          text: getApiErrorMessage(error, "Nao foi possivel registrar o pagamento."),
        });
      } else {
        setBanner({ tone: "error", text: "Erro de conexao ao registrar pagamento." });
      }
    } finally {
      setModalSubmitting(false);
    }
  }

  async function submitInstallmentRefundFromModal() {
    const installment = selectedInstallment;
    if (!installment) {
      setBanner({ tone: "error", text: "Parcela nao encontrada." });
      closeInstallmentModal();
      return;
    }

    if (normalizeInstallmentStatus(installment) !== "Pago") {
      setBanner({ tone: "error", text: "Somente parcelas pagas podem ser estornadas." });
      setInstallmentModalMode("details");
      return;
    }

    const numericInstallmentId = toNumber(installment.id);
    if (numericInstallmentId <= 0) {
      setBanner({ tone: "error", text: "Parcela invalida para estorno." });
      return;
    }

    setModalSubmitting(true);
    try {
      await revertInstallmentPayment(numericInstallmentId);
      setBanner({ tone: "success", text: "Pagamento estornado com sucesso!" });
      await loadInstallmentsData({ silent: true, preservePage: true });
      setInstallmentModalMode("details");
    } catch (error) {
      if (error instanceof ApiClientError) {
        setBanner({
          tone: "error",
          text: getApiErrorMessage(error, "Nao foi possivel estornar o pagamento."),
        });
      } else {
        setBanner({ tone: "error", text: "Erro de conexao ao estornar pagamento." });
      }
    } finally {
      setModalSubmitting(false);
    }
  }

  async function submitInstallmentDeleteFromModal() {
    const installment = selectedInstallment;
    if (!installment) {
      setBanner({ tone: "error", text: "Parcela nao encontrada." });
      closeInstallmentModal();
      return;
    }

    const status = normalizeInstallmentStatus(installment);
    if (status === "Pago") {
      setBanner({ tone: "error", text: "Parcela paga deve ser estornada antes da exclusao." });
      setInstallmentModalMode("refund");
      return;
    }

    const impact = getDeleteImpact(installment);
    if (impact.isOnlyInstallment) {
      setBanner({ tone: "error", text: "Este emprestimo possui apenas uma parcela. Exclua o emprestimo inteiro." });
      return;
    }

    const numericInstallmentId = toNumber(installment.id);
    if (numericInstallmentId <= 0) {
      setBanner({ tone: "error", text: "Parcela invalida para exclusao." });
      return;
    }

    setModalSubmitting(true);
    try {
      await deleteInstallment(numericInstallmentId);
      setBanner({ tone: "success", text: "Parcela excluida com sucesso!" });
      await loadInstallmentsData({ silent: true, preservePage: true });
      closeInstallmentModal();
    } catch (error) {
      if (error instanceof ApiClientError) {
        setBanner({
          tone: "error",
          text: getApiErrorMessage(error, "Nao foi possivel excluir a parcela."),
        });
      } else {
        setBanner({ tone: "error", text: "Erro de conexao ao excluir parcela." });
      }
    } finally {
      setModalSubmitting(false);
    }
  }

  const modalContext = useMemo(() => {
    if (!selectedInstallment) return null;
    const loan = getLoanById(selectedInstallment.loanId);
    const status = normalizeInstallmentStatus(selectedInstallment);
    const badge = getStatusBadge(status);
    const installmentLabel = getInstallmentLabel(selectedInstallment);
    const debtorName = getDebtorName(selectedInstallment.debtorId);
    const dueHint = getDueHint(selectedInstallment, status);
    const dueHintText = dueHint ? dueHint.replace(/^\(/, "").replace(/\)$/, "") : "";
    const paymentMethod = getInstallmentPaymentMethod(selectedInstallment) || "-";
    const summaryLine = `${debtorName} | Parcela #${installmentLabel} | ${formatCurrency(selectedInstallment.amount)} | Venc.: ${formatDate(selectedInstallment.dueDate)}`;
    const principalValue = loan ? formatCurrency(loan.principalAmount) : "-";
    const totalLoanValue = loan ? formatCurrency(loan.totalAmount) : "-";
    const deleteImpact = getDeleteImpact(selectedInstallment);

    return {
      installment: selectedInstallment,
      loan,
      status,
      badge,
      installmentLabel,
      debtorName,
      dueHint,
      dueHintText,
      paymentMethod,
      summaryLine,
      principalValue,
      totalLoanValue,
      deleteImpact,
    };
  }, [selectedInstallment, debtorsById, loansById]);

  return (
    <div className="w-full">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[clamp(2rem,1.2vw+1.2rem,2.8rem)] font-extrabold tracking-[-0.03em] text-lm-text">
            Controle de cobranca
          </h1>
          <p className="mt-1 text-sm text-lm-text-muted">Acompanhe pendencias, atrasos e recebimentos com acao rapida.</p>
        </div>
        <div className="flex items-center">
          <p className="text-xs text-lm-text-subtle">
            Atualizado: <span className="font-semibold text-lm-text-muted">{lastUpdatedAt}</span>
          </p>
        </div>
      </header>

      <section className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <button
          className={`rounded-2xl border p-5 text-left transition ${kpiFilter === "paid_month" ? "border-lm-primary-strong bg-lm-card" : "border-lm-border/80 bg-lm-card/92 hover:border-lm-primary/50"}`}
          onClick={() => applyKpiFilter("paid_month")}
          type="button"
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-lm-text-subtle">Recebido no mes</span>
            <CheckCircle2 className="h-4 w-4 text-lm-positive" />
          </div>
          <p className="mt-3 text-2xl font-extrabold text-lm-positive">{formatCurrency(summaryKpis.receivedThisMonth)}</p>
          <p className="mt-2 text-sm text-lm-text-muted">{summaryKpis.receivedThisMonthCount} parcela(s) paga(s)</p>
          <p className={`mt-2 text-xs font-semibold ${insightClassName(summaryKpis.receivedInsight.tone)}`}>
            {summaryKpis.receivedInsight.prefix} {summaryKpis.receivedInsight.text}
          </p>
        </button>

        <button
          className={`rounded-2xl border p-5 text-left transition ${kpiFilter === "pending_total" ? "border-lm-primary-strong bg-lm-card" : "border-lm-border/80 bg-lm-card/92 hover:border-lm-primary/50"}`}
          onClick={() => applyKpiFilter("pending_total")}
          type="button"
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-lm-text-subtle">Total pendente</span>
            <Clock3 className="h-4 w-4 text-amber-300" />
          </div>
          <p className="mt-3 text-2xl font-extrabold text-amber-300">{formatCurrency(summaryKpis.pendingTotal)}</p>
          <p className="mt-2 text-sm text-lm-text-muted">{summaryKpis.pendingCount} parcela(s) em aberto</p>
          <p className={`mt-2 text-xs font-semibold ${insightClassName(summaryKpis.pendingInsight.tone)}`}>
            {summaryKpis.pendingInsight.prefix} {summaryKpis.pendingInsight.text}
          </p>
        </button>

        <button
          className={`rounded-2xl border p-5 text-left transition ${kpiFilter === "overdue_total" ? "border-lm-primary-strong bg-lm-card" : "border-lm-border/80 bg-lm-card/92 hover:border-lm-primary/50"}`}
          onClick={() => applyKpiFilter("overdue_total")}
          type="button"
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-lm-text-subtle">Total atrasado</span>
            <TriangleAlert className="h-4 w-4 text-lm-negative" />
          </div>
          <p className="mt-3 text-2xl font-extrabold text-lm-negative">{formatCurrency(summaryKpis.overdueTotal)}</p>
          <p className="mt-2 text-sm text-lm-text-muted">{summaryKpis.overdueCount} parcela(s) em atraso</p>
          <p className={`mt-2 text-xs font-semibold ${insightClassName(summaryKpis.overdueInsight.tone)}`}>
            {summaryKpis.overdueInsight.prefix} {summaryKpis.overdueInsight.text}
          </p>
        </button>
      </section>

      <section className="mb-6 rounded-2xl border border-lm-border/80 bg-lm-card/92 p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
          <label className="md:col-span-2 xl:col-span-3">
            <span className="mb-1 block text-sm text-lm-text-muted">Buscar</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-lm-text-subtle" />
              <Input
                className="h-11 pl-10"
                onChange={(event) => {
                  setSearchValue(event.target.value);
                  setKpiFilter("");
                  setCurrentPage(1);
                }}
                placeholder="Nome, telefone, emprestimo ou parcela"
                type="text"
                value={searchValue}
              />
            </span>
          </label>

          <label className="md:col-span-1 xl:col-span-2">
            <span className="mb-1 block text-sm text-lm-text-muted">Status</span>
            <select
              className="h-11 w-full rounded-md border border-lm-border bg-lm-sidebar px-3 text-sm text-lm-text"
              onChange={(event) => {
                setStatusFilter(event.target.value as StatusFilter);
                setKpiFilter("");
                setCurrentPage(1);
              }}
              value={statusFilter}
            >
              <option value="Todos">Todos</option>
              <option value="Pago">Pago</option>
              <option value="Pendente">Pendente</option>
              <option value="Atrasado">Em atraso</option>
            </select>
          </label>

          <label className="md:col-span-1 xl:col-span-2">
            <span className="mb-1 block text-sm text-lm-text-muted">Cliente</span>
            <select
              className="h-11 w-full rounded-md border border-lm-border bg-lm-sidebar px-3 text-sm text-lm-text"
              onChange={(event) => {
                setClientFilter(event.target.value);
                setKpiFilter("");
                setCurrentPage(1);
              }}
              value={clientFilter}
            >
              <option value="all">Todos os clientes</option>
              {clientOptions.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>

          <label className="md:col-span-1 xl:col-span-2">
            <span className="mb-1 block text-sm text-lm-text-muted">Periodo</span>
            <select
              className="h-11 w-full rounded-md border border-lm-border bg-lm-sidebar px-3 text-sm text-lm-text"
              onChange={(event) => {
                setPeriodFilter(event.target.value as PeriodFilter);
                setKpiFilter("");
                setCurrentPage(1);
              }}
              value={periodFilter}
            >
              <option value="all">Todos</option>
              <option value="today">Hoje</option>
              <option value="next7">Proximos 7 dias</option>
              <option value="month_current">Mes atual</option>
              <option value="last30">Ultimos 30 dias</option>
              <option value="custom">Personalizado</option>
            </select>
          </label>

          <label className="md:col-span-1 xl:col-span-2">
            <span className="mb-1 block text-sm text-lm-text-muted">Forma de pagamento</span>
            <select
              className="h-11 w-full rounded-md border border-lm-border bg-lm-sidebar px-3 text-sm text-lm-text"
              onChange={(event) => {
                setPaymentMethodFilter(event.target.value as PaymentMethodFilter);
                setKpiFilter("");
                setCurrentPage(1);
              }}
              value={paymentMethodFilter}
            >
              <option value="Todas">Todas</option>
              <option value="Pix">Pix</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Cartao">Cartao</option>
              <option value="Outro">Outro</option>
            </select>
          </label>

          <div className="md:col-span-2 xl:col-span-1 flex items-end">
            <Button
              className="h-11 w-full"
              onClick={clearInstallmentFilters}
              type="button"
              variant="secondary"
            >
              <FilterX className="mr-2 h-4 w-4" />
              Limpar filtros
            </Button>
          </div>

          {periodFilter === "custom" ? (
            <div className="md:col-span-2 xl:col-span-6">
              <span className="mb-1 block text-sm text-lm-text-muted">Periodo personalizado</span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Input
                  aria-label="Data inicial"
                  className="h-11"
                  onChange={(event) => {
                    setCustomStartDate(event.target.value);
                    setKpiFilter("");
                    setCurrentPage(1);
                  }}
                  type="date"
                  value={customStartDate}
                />
                <Input
                  aria-label="Data final"
                  className="h-11"
                  onChange={(event) => {
                    setCustomEndDate(event.target.value);
                    setKpiFilter("");
                    setCurrentPage(1);
                  }}
                  type="date"
                  value={customEndDate}
                />
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {banner ? (
        <div className={`mb-4 rounded-xl px-3 py-2 text-sm ${bannerClassName(banner.tone)}`}>{banner.text}</div>
      ) : null}

      <section className="rounded-2xl border border-lm-border/80 bg-lm-card/92 p-5">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-xl font-bold text-lm-text">Parcelas da cobranca</h3>
          <span className="text-sm text-lm-text-muted">
            Resultados: <strong className="text-lm-text">{filteredInstallments.length}</strong>
          </span>
        </div>

        <div className="space-y-3 sm:hidden">
          {loading && installments.length === 0 ? (
            <div className="rounded-2xl border border-lm-border/80 bg-lm-sidebar/60 p-4 text-center text-sm text-lm-text-muted">
              Carregando parcelas...
            </div>
          ) : null}

          {!loading && currentPageRows.length === 0 ? (
            <div className="rounded-2xl border border-lm-border/80 bg-lm-sidebar/60 p-4 text-center text-sm text-lm-text-muted">
              Nenhuma parcela encontrada.
            </div>
          ) : null}

          {!loading
            ? currentPageRows.map((installment) => {
              const status = normalizeInstallmentStatus(installment);
              const badge = getStatusBadge(status);
              const loan = getLoanById(installment.loanId);
              const installmentNumber = getInstallmentLabel(installment);
              const phone = getDebtorPhone(installment.debtorId);
              const dueHint = getDueHint(installment, status);

              return (
                <article
                  className="rounded-2xl border border-lm-border/80 bg-lm-sidebar/60 p-4"
                  key={`mobile-${installment.id}`}
                  onClick={() => openInstallmentModal(installment.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-lm-text">{getDebtorName(installment.debtorId)}</p>
                      <p className="text-xs text-lm-text-muted">{phone || "Sem telefone"}</p>
                    </div>
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${badge.className}`}>
                      {badge.text}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-lm-text-subtle">Emprestimo</p>
                      <p className="font-semibold text-lm-text">#{installment.loanId || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-lm-text-subtle">Parcela</p>
                      <p className="font-semibold text-lm-text">{installmentNumber}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[11px] uppercase tracking-wide text-lm-text-subtle">Vencimento</p>
                      <p className={`font-semibold ${status === "Atrasado" ? "text-lm-negative" : "text-lm-text"}`}>
                        {formatDate(installment.dueDate)}{" "}
                        <span className={status === "Atrasado" ? "text-lm-negative" : "text-lm-text-muted"}>
                          {dueHint}
                        </span>
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[11px] uppercase tracking-wide text-lm-text-subtle">Valor</p>
                      <p className="text-lg font-bold text-lm-text">{formatCurrency(installment.amount)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[11px] uppercase tracking-wide text-lm-text-subtle">Resumo</p>
                      <p className="text-sm text-lm-text-muted">{getLoanSummary(loan)}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                    <button
                      className="inline-flex h-8 items-center rounded-lg border border-lm-border px-2 text-xs font-semibold text-lm-text-muted hover:text-lm-text"
                      onClick={(event) => {
                        event.stopPropagation();
                        openInstallmentModal(installment.id);
                      }}
                      type="button"
                    >
                      Mais detalhes
                    </button>
                  </div>
                </article>
              );
            })
            : null}
        </div>

        <div className="hidden overflow-x-auto rounded-2xl border border-lm-border/80 sm:block">
          <table className="w-full min-w-[1020px] border-collapse">
            <thead className="bg-lm-sidebar/75">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.09em] text-lm-text-subtle">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.09em] text-lm-text-subtle">Emprestimo</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.09em] text-lm-text-subtle">Parcela</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.09em] text-lm-text-subtle">Vencimento</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.09em] text-lm-text-subtle">Valor</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.09em] text-lm-text-subtle">Status</th>
                <th className="w-[1%] whitespace-nowrap px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.09em] text-lm-text-subtle">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {loading && installments.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-lm-text-muted" colSpan={7}>
                    Carregando parcelas...
                  </td>
                </tr>
              ) : null}

              {!loading && currentPageRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-lm-text-muted" colSpan={7}>
                    Nenhuma parcela encontrada.
                  </td>
                </tr>
              ) : null}

              {!loading
                ? currentPageRows.map((installment) => {
                  const status = normalizeInstallmentStatus(installment);
                  const badge = getStatusBadge(status);
                  const loan = getLoanById(installment.loanId);
                  const installmentNumber = getInstallmentLabel(installment);
                  const phone = getDebtorPhone(installment.debtorId);
                  const dueHint = getDueHint(installment, status);

                  return (
                    <tr
                      className="cursor-pointer border-t border-lm-border/60 bg-lm-sidebar/45 hover:bg-lm-sidebar/70"
                      key={`row-${installment.id}`}
                      onClick={() => openInstallmentModal(installment.id)}
                    >
                      <td className="px-4 py-4">
                        <p className="font-semibold text-lm-text">{getDebtorName(installment.debtorId)}</p>
                        <p className="text-xs text-lm-text-muted">{phone || "Sem telefone"}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-lm-text">#{installment.loanId || "-"}</p>
                        <p className="mt-0.5 text-xs text-lm-text-muted">{getLoanSummary(loan)}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-lm-text">{installmentNumber}</p>
                        <p className="mt-0.5 text-xs text-lm-text-muted">Parcela #{installment.installmentNumber || "-"}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-lm-text">{formatDate(installment.dueDate)}</p>
                        <p className={`text-xs ${status === "Atrasado" ? "text-lm-negative" : "text-lm-text-muted"}`}>{dueHint}</p>
                      </td>
                      <td className="px-4 py-4 font-semibold text-lm-text">{formatCurrency(installment.amount)}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${badge.className}`}>{badge.text}</span>
                      </td>
                      <td className="w-[1%] whitespace-nowrap px-4 py-4 text-right">
                        <button
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-lm-border text-lm-text-muted hover:bg-lm-sidebar hover:text-lm-text"
                          onClick={(event) => {
                            event.stopPropagation();
                            openInstallmentModal(installment.id);
                          }}
                          title="Detalhes"
                          type="button"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
                : null}
            </tbody>
          </table>
        </div>

        {!loading && filteredInstallments.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-lm-border/80 bg-lm-sidebar/45 px-6 py-12 text-center">
            <CalendarCheck2 className="mx-auto mb-4 h-12 w-12 text-lm-text-subtle" />
            <h4 className="text-lg font-semibold text-lm-text">Nenhuma parcela encontrada</h4>
            <p className="mt-1 text-sm text-lm-text-muted">Ajuste os filtros para visualizar resultados.</p>
            <Link
              className="mt-4 inline-flex items-center rounded-xl border border-lm-primary/60 bg-lm-primary px-4 py-2 text-sm font-semibold text-lm-text hover:bg-lm-primary-strong"
              href="/admin/loans.html"
            >
              Ir para Emprestimos
            </Link>
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-lm-text-muted">
            Mostrando {pagination.start} ate {pagination.end} de {pagination.total} resultados
          </p>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex h-9 items-center rounded-lg border border-lm-border bg-lm-sidebar px-3 text-sm text-lm-text-muted transition hover:text-lm-text disabled:opacity-50"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              type="button"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-lm-text-muted">Pagina {currentPage} de {totalPages}</span>
            <button
              className="inline-flex h-9 items-center rounded-lg border border-lm-border bg-lm-sidebar px-3 text-sm text-lm-text-muted transition hover:text-lm-text disabled:opacity-50"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              type="button"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {installmentModalOpen && modalContext ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeInstallmentModal();
          }}
        >
          <div className="w-full max-w-4xl rounded-2xl border border-lm-border bg-lm-card p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3 border-b border-lm-border/70 pb-3">
              <h3 className="text-2xl font-bold text-lm-text">
                {installmentModalMode === "details"
                  ? "Detalhes da parcela"
                  : installmentModalMode === "payment"
                    ? "Registrar pagamento"
                    : installmentModalMode === "refund"
                      ? "Estorno"
                      : "Excluir parcela"}
              </h3>
              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-lm-border text-lm-text-muted hover:bg-lm-sidebar hover:text-lm-text"
                onClick={closeInstallmentModal}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {installmentModalMode === "details" ? (
              <div className="space-y-4">
                <section className="rounded-xl border border-lm-border/70 bg-lm-sidebar/60 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-lm-text-subtle">Parcela selecionada</p>
                      <h4 className="mt-2 text-2xl font-bold text-lm-text">#{modalContext.installmentLabel}</h4>
                      <p className="mt-1 text-sm text-lm-text-muted">
                        Emprestimo #{modalContext.installment.loanId || "-"} | Cliente: {modalContext.debtorName}
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${modalContext.badge.className}`}>
                        {modalContext.badge.text}
                      </span>
                      {modalContext.dueHintText ? (
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            modalContext.status === "Atrasado"
                              ? "border border-rose-400/35 bg-rose-500/15 text-rose-300"
                              : modalContext.status === "Pago"
                                ? "border border-emerald-400/35 bg-emerald-500/15 text-emerald-300"
                                : "border border-slate-500/50 bg-slate-500/15 text-slate-300"
                          }`}
                        >
                          {modalContext.dueHintText}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </section>

                <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-lm-border/70 bg-lm-sidebar/60 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.11em] text-lm-text-subtle">Valor da parcela</p>
                    <p className="mt-2 text-3xl font-bold text-lm-text">{formatCurrency(modalContext.installment.amount)}</p>
                  </div>
                  <div className="rounded-xl border border-lm-border/70 bg-lm-sidebar/60 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.11em] text-lm-text-subtle">Vencimento</p>
                    <p className="mt-2 text-2xl font-bold text-lm-text">{formatDate(modalContext.installment.dueDate)}</p>
                    <p className={`mt-1 text-sm ${modalContext.status === "Atrasado" ? "text-lm-negative" : "text-lm-text-muted"}`}>
                      {modalContext.dueHintText || "Sem observacao"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-lm-border/70 bg-lm-sidebar/60 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.11em] text-lm-text-subtle">Principal</p>
                    <p className="mt-2 text-xl font-bold text-lm-text">{modalContext.principalValue}</p>
                    <p className="mt-1 text-sm text-lm-text-muted">Valor original do emprestimo</p>
                  </div>
                  <div className="rounded-xl border border-lm-border/70 bg-lm-sidebar/60 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.11em] text-lm-text-subtle">Total do emprestimo</p>
                    <p className="mt-2 text-xl font-bold text-lm-text">{modalContext.totalLoanValue}</p>
                    <p className="mt-1 text-sm text-lm-text-muted">Inclui os juros aplicados</p>
                  </div>
                </section>

                <section className="rounded-xl border border-lm-border/70 bg-lm-sidebar/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.11em] text-lm-text-subtle">Historico</p>
                  <p className="mt-2 text-base text-lm-text">
                    {modalContext.status === "Pago"
                      ? `Pago em ${formatDate(modalContext.installment.paymentDate)} via ${modalContext.paymentMethod}`
                      : "Pagamento nao registrado."}
                  </p>
                  {modalContext.status === "Pago" && modalContext.installment.notes ? (
                    <p className="mt-1 text-sm text-lm-text-muted">Obs.: {modalContext.installment.notes}</p>
                  ) : null}
                </section>

                <div className="flex flex-wrap justify-end gap-2 pt-1">
                  {modalContext.status !== "Pago" ? (
                    <Button onClick={() => setModalModeWithGuard("payment", modalContext.installment)} type="button">
                      Registrar pagamento
                    </Button>
                  ) : null}
                  {modalContext.status === "Pago" ? (
                    <Button onClick={() => setModalModeWithGuard("refund", modalContext.installment)} type="button" variant="ghost">
                      Estorno
                    </Button>
                  ) : null}
                  <Button onClick={() => setInstallmentModalMode("confirmDelete")} type="button" variant="danger">
                    Excluir
                  </Button>
                  <Button onClick={closeInstallmentModal} type="button" variant="ghost">
                    Concluir
                  </Button>
                </div>
              </div>
            ) : null}

            {installmentModalMode === "payment" ? (
              <div className="space-y-4">
                <section className="rounded-xl border border-lm-border/70 bg-lm-sidebar/60 p-4">
                  <h4 className="text-sm font-bold uppercase tracking-[0.08em] text-lm-text-subtle">Resumo da parcela</h4>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-lm-text-subtle">Cliente</p>
                      <p className="text-base font-semibold text-lm-text">{modalContext.debtorName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-lm-text-subtle">Parcela</p>
                      <p className="text-base font-semibold text-lm-text">#{modalContext.installmentLabel}</p>
                    </div>
                    <div>
                      <p className="text-xs text-lm-text-subtle">Valor</p>
                      <p className="text-base font-semibold text-lm-text">{formatCurrency(modalContext.installment.amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-lm-text-subtle">Vencimento</p>
                      <p className="text-base font-semibold text-lm-text">{formatDate(modalContext.installment.dueDate)}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${modalContext.badge.className}`}>
                      {modalContext.badge.text}
                    </span>
                  </div>
                </section>

                <section className="rounded-xl border border-lm-border/70 bg-lm-sidebar/60 p-4">
                  <h4 className="text-sm font-bold uppercase tracking-[0.08em] text-lm-text-subtle">Informacoes financeiras</h4>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label>
                      <span className="mb-1 block text-sm text-lm-text-muted">Data do pagamento</span>
                      <Input
                        className="h-11"
                        onChange={(event) => setModalPaymentDate(event.target.value)}
                        type="date"
                        value={modalPaymentDate}
                      />
                    </label>
                    <label>
                      <span className="mb-1 block text-sm text-lm-text-muted">Forma de pagamento</span>
                      <select
                        className="h-11 w-full rounded-md border border-lm-border bg-lm-sidebar px-3 text-sm text-lm-text"
                        onChange={(event) => setModalPaymentMethod(event.target.value as InstallmentPaymentMethod)}
                        value={modalPaymentMethod}
                      >
                        <option value="Pix">Pix</option>
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="Transferencia">Transferencia</option>
                        <option value="Cartao">Cartao</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </label>
                  </div>
                </section>

                <section className="rounded-xl border border-lm-border/70 bg-lm-sidebar/60 p-4">
                  <h4 className="text-sm font-bold uppercase tracking-[0.08em] text-lm-text-subtle">Observacao</h4>
                  <label>
                    <span className="mb-1 mt-3 block text-sm text-lm-text-muted">Observacao (opcional)</span>
                    <textarea
                      className="min-h-[96px] w-full rounded-md border border-lm-border bg-lm-sidebar px-3 py-2 text-sm text-lm-text outline-none focus:border-lm-primary-strong"
                      onChange={(event) => setModalPaymentNotes(event.target.value)}
                      placeholder="Observacoes sobre o pagamento"
                      rows={3}
                      value={modalPaymentNotes}
                    />
                  </label>
                </section>

                <div className="flex flex-wrap justify-between gap-2 pt-1">
                  <Button onClick={() => setInstallmentModalMode("details")} type="button" variant="ghost">
                    Voltar
                  </Button>
                  <Button
                    disabled={modalSubmitting}
                    onClick={() => void submitInstallmentPaymentFromModal()}
                    type="button"
                  >
                    {modalSubmitting ? "Confirmando..." : "Confirmar pagamento"}
                  </Button>
                </div>
              </div>
            ) : null}

            {installmentModalMode === "refund" ? (
              <div className="space-y-4">
                <section className="rounded-xl border border-lm-border/70 bg-lm-sidebar/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-lm-text-subtle">Parcela selecionada</p>
                  <p className="mt-2 text-base font-medium text-lm-text">{modalContext.summaryLine}</p>
                </section>

                <div className="rounded-xl border border-amber-400/45 bg-amber-900/30 px-4 py-3 text-sm text-amber-200">
                  Estornar este pagamento ira voltar a parcela para "Em aberto/Em atraso" e remover a data de pagamento.
                </div>

                <section className="rounded-xl border border-lm-border/70 bg-lm-sidebar/60 p-4">
                  <label>
                    <span className="mb-1 block text-sm text-lm-text-muted">Motivo do estorno (opcional)</span>
                    <textarea
                      className="min-h-[96px] w-full rounded-md border border-lm-border bg-lm-sidebar px-3 py-2 text-sm text-lm-text outline-none focus:border-lm-primary-strong"
                      onChange={(event) => setModalRefundReason(event.target.value)}
                      placeholder="Motivo do estorno"
                      rows={3}
                      value={modalRefundReason}
                    />
                  </label>
                </section>

                <div className="flex flex-wrap justify-between gap-2 pt-1">
                  <Button onClick={() => setInstallmentModalMode("details")} type="button" variant="ghost">
                    Voltar
                  </Button>
                  <Button
                    disabled={modalSubmitting}
                    onClick={() => void submitInstallmentRefundFromModal()}
                    type="button"
                  >
                    {modalSubmitting ? "Confirmando..." : "Confirmar estorno"}
                  </Button>
                </div>
              </div>
            ) : null}

            {installmentModalMode === "confirmDelete" ? (
              <div className="space-y-4">
                <section className="rounded-xl border border-lm-border/70 bg-lm-sidebar/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-lm-text-subtle">Parcela selecionada</p>
                  <p className="mt-2 text-base font-medium text-lm-text">{modalContext.summaryLine}</p>
                </section>

                {modalContext.status === "Pago" ? (
                  <>
                    <div className="rounded-xl border border-amber-400/45 bg-amber-900/30 px-4 py-3 text-sm text-amber-200">
                      Esta parcela esta paga. Para excluir, use Estorno primeiro.
                    </div>
                    <div className="flex flex-wrap justify-between gap-2 pt-1">
                      <Button onClick={() => setInstallmentModalMode("details")} type="button" variant="ghost">
                        Voltar
                      </Button>
                      <Button
                        onClick={() => setModalModeWithGuard("refund", modalContext.installment)}
                        type="button"
                      >
                        Ir para estorno
                      </Button>
                    </div>
                  </>
                ) : null}

                {modalContext.status !== "Pago" && modalContext.deleteImpact.isOnlyInstallment ? (
                  <>
                    <div className="rounded-xl border border-rose-400/45 bg-rose-950/35 px-4 py-3 text-sm text-rose-200">
                      Este emprestimo possui apenas uma parcela. Exclua o emprestimo inteiro na tela de emprestimos.
                    </div>
                    <div className="flex flex-wrap justify-between gap-2 pt-1">
                      <Button onClick={() => setInstallmentModalMode("details")} type="button" variant="ghost">
                        Voltar
                      </Button>
                      <Button asChild type="button" variant="danger">
                        <Link href="/admin/loans.html">Ir para emprestimos</Link>
                      </Button>
                    </div>
                  </>
                ) : null}

                {modalContext.status !== "Pago" && !modalContext.deleteImpact.isOnlyInstallment ? (
                  <>
                    <div className="rounded-xl border border-rose-400/45 bg-rose-950/35 px-4 py-3 text-sm text-rose-200">
                      Tem certeza que deseja excluir esta parcela? Isso pode alterar o total do emprestimo e relatorios.
                    </div>
                    <section className="rounded-xl border border-lm-border/70 bg-lm-sidebar/60 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.11em] text-lm-text-subtle">Impacto da exclusao</p>
                      <p className="mt-2 text-base text-lm-text">
                        Parcelas restantes: <strong>{modalContext.deleteImpact.remainingCount}</strong>
                      </p>
                      <p className="mt-1 text-sm text-lm-text-muted">
                        Novo total do emprestimo apos exclusao:{" "}
                        <strong>{formatCurrency(modalContext.deleteImpact.newTotalAmount)}</strong>
                      </p>
                    </section>
                    <div className="flex flex-wrap justify-between gap-2 pt-1">
                      <Button onClick={() => setInstallmentModalMode("details")} type="button" variant="ghost">
                        Cancelar
                      </Button>
                      <Button
                        disabled={modalSubmitting}
                        onClick={() => void submitInstallmentDeleteFromModal()}
                        type="button"
                        variant="danger"
                      >
                        {modalSubmitting ? "Excluindo..." : "Excluir parcela"}
                      </Button>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {!installmentModalOpen && !modalContext && selectedInstallmentId ? (
        <div className="hidden">
          <AlertTriangle />
        </div>
      ) : null}
    </div>
  );
}
