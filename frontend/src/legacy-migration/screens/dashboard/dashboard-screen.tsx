"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  ApiClientError,
  createCashAdjustment,
  createPayment,
  getDashboard,
  type DashboardChartPoint,
  type DashboardKpiCardMetric,
  type DashboardMetric,
  type DashboardPaymentItem,
  type DashboardPeriod,
  type DashboardResponse,
  type DashboardSparklinePoint,
  type PaymentMethod,
} from "../../services";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";

type BannerTone = "success" | "error";
type BannerMessage = { tone: BannerTone; text: string };
type ChartView = "line" | "stacked";
type SafePaymentMethod = Extract<PaymentMethod, "PIX" | "DINHEIRO" | "TRANSFERENCIA">;
type InsightTone = "positive" | "negative" | "neutral";
type ChartRenderPoint = {
  label: string;
  received: number;
  open: number;
  overdue: number;
};

const PANEL_PAGE_SIZE = 5;
const COLLECTION_TEMPLATE = "Ola, {nome}. Parcela em aberto: {valor} (venc. {vencimento}).\nChave PIX: {pix_chave}.";
const DEFAULT_SUMMARY_LINKS = {
  dueToday: "/admin/installments.html?status=pending&due=today",
  overdue: "/admin/installments.html?status=overdue&due=month",
  next7: "/admin/installments.html?status=pending&due=next7",
};

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
  const parsed = toNumber(value);
  return `${parsed.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function formatDate(isoDate: string | undefined) {
  if (!isoDate) return "-";
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function currentTimeLabel() {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date());
}

function getLocalTodayIso() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function normalizePaymentMethod(value: unknown): SafePaymentMethod {
  const method = String(value || "").trim().toUpperCase();
  if (method === "DINHEIRO" || method === "TRANSFERENCIA") return method;
  return "PIX";
}

function normalizeWhatsappPhone(rawPhone: unknown) {
  const digits = String(rawPhone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.length > 11) return digits;
  return "";
}

function replaceCollectionPlaceholders(template: string, item: DashboardPaymentItem | null) {
  const safeTemplate = template || COLLECTION_TEMPLATE;
  const payload = {
    nome: item?.debtorName || "-",
    valor: formatCurrency(item?.amount || 0),
    vencimento: formatDate(item?.dueDate),
    pix_chave: "nao informado",
  };

  return safeTemplate
    .replaceAll("{nome}", payload.nome)
    .replaceAll("{valor}", payload.valor)
    .replaceAll("{vencimento}", payload.vencimento)
    .replaceAll("{pix_chave}", payload.pix_chave);
}

function buildWhatsAppChargeUrl(item: DashboardPaymentItem) {
  const phone = normalizeWhatsappPhone(item.whatsappPhone || item.phone);
  if (!phone) return "";
  return `https://wa.me/${phone}?text=${encodeURIComponent(replaceCollectionPlaceholders(COLLECTION_TEMPLATE, item))}`;
}

function readSparklineSeries(metric: DashboardKpiCardMetric | undefined) {
  const raw = Array.isArray(metric?.series) ? metric.series : [];
  return raw
    .map((point) => {
      if (typeof point === "number") return toNumber(point);
      const obj = point as DashboardSparklinePoint;
      return toNumber(obj.value);
    })
    .filter((value) => Number.isFinite(value));
}

function computeDeltaInsight(currentValue: number, previousValue: number): { tone: InsightTone; text: string } {
  const epsilon = 0.00001;

  if (Math.abs(previousValue) < epsilon) {
    if (Math.abs(currentValue) < epsilon) {
      return { tone: "neutral" as InsightTone, text: "0,00% vs mes ant." };
    }
    return { tone: currentValue >= 0 ? "positive" : "negative", text: "Sem base ant." };
  }

  const pct = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
  if (Math.abs(pct) < 0.005) {
    return { tone: "neutral" as InsightTone, text: "0,00% vs mes ant." };
  }

  const pctText = Math.abs(pct).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return {
    tone: pct > 0 ? "positive" : "negative",
    text: `${pct > 0 ? "+" : "-"}${pctText}% vs mes ant.`,
  };
}

function resolveInsight(metric: DashboardKpiCardMetric | undefined): { tone: InsightTone; text: string } {
  const currentValue = toNumber(metric?.currentValue ?? metric?.value);
  const previousValue = toNumber(metric?.previousValue);
  const customText = typeof metric?.insight?.text === "string" ? metric.insight.text.trim() : "";
  const customTone = metric?.insight?.tone;

  if (customText) {
    return {
      tone: customTone === "positive" || customTone === "negative" ? customTone : "neutral",
      text: customText,
    };
  }

  return computeDeltaInsight(currentValue, previousValue);
}

function normalizeChartPoints(points: DashboardChartPoint[] | undefined): ChartRenderPoint[] {
  if (!Array.isArray(points)) return [];
  return points.map((point, index) => ({
    label: String(point.label || `Mes ${index + 1}`),
    received: toNumber(point.received ?? point.value),
    open: toNumber(point.open),
    overdue: toNumber(point.overdue),
  }));
}

function statusPillClass(statusColor: DashboardPaymentItem["statusColor"]) {
  if (statusColor === "red") return "border-rose-400/55 bg-rose-500/15 text-rose-200";
  if (statusColor === "yellow") return "border-amber-400/55 bg-amber-500/15 text-amber-200";
  return "border-emerald-400/55 bg-emerald-500/15 text-emerald-200";
}

function toneClass(tone: InsightTone) {
  if (tone === "positive") return "text-lm-positive";
  if (tone === "negative") return "text-lm-negative";
  return "text-lm-text-muted";
}

function messageClassName(tone: BannerTone) {
  if (tone === "success") {
    return "border border-emerald-400/35 bg-emerald-500/12 text-emerald-200";
  }
  return "border border-rose-400/35 bg-rose-500/12 text-rose-200";
}

function parseAdjustmentAmount(value: string) {
  const normalized = value.replace(/\s+/g, "").replace("R$", "").replace(/\./g, "").replace(",", ".");
  return toNumber(normalized);
}

function nextPageSlice<TItem>(items: TItem[], page: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / PANEL_PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const startIndex = (safePage - 1) * PANEL_PAGE_SIZE;
  return {
    safePage,
    totalPages,
    hasItems: items.length > 0,
    items: items.slice(startIndex, startIndex + PANEL_PAGE_SIZE),
  };
}

function Sparkline({ series, tone }: { series: number[]; tone: InsightTone }) {
  if (!series.length) return <div className="h-[34px] w-full" />;

  const width = 100;
  const height = 34;
  const topPad = 3;
  const bottomPad = 3;
  const usableHeight = height - topPad - bottomPad;
  const minValue = Math.min(...series);
  const maxValue = Math.max(...series);
  const range = maxValue - minValue || 1;
  const stepX = series.length > 1 ? width / (series.length - 1) : width;

  const points = series.map((value, index) => {
    const x = series.length > 1 ? index * stepX : width / 2;
    const normalized = (value - minValue) / range;
    const y = topPad + (1 - normalized) * usableHeight;
    return { x, y };
  });

  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const area = `${path} L ${lastPoint.x.toFixed(2)} ${(height - 1).toFixed(2)} L ${firstPoint.x.toFixed(2)} ${(height - 1).toFixed(2)} Z`;

  const lineColor = tone === "positive" ? "#34D399" : tone === "negative" ? "#FB7185" : "#94A3B8";
  const fillColor = tone === "positive" ? "rgba(52,211,153,0.16)" : tone === "negative" ? "rgba(251,113,133,0.16)" : "rgba(148,163,184,0.14)";

  return (
    <svg aria-hidden="true" className="h-[34px] w-full" preserveAspectRatio="none" viewBox="0 0 100 34">
      <path d={area} fill={fillColor} />
      <path d={path} fill="none" stroke={lineColor} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
    </svg>
  );
}

function DashboardChartGraphic({ points, view }: { points: ChartRenderPoint[]; view: ChartView }) {
  if (!points.length) return null;

  const width = 940;
  const height = 300;
  const padLeft = 30;
  const padRight = 18;
  const padTop = 16;
  const padBottom = 36;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;
  const lineMax = Math.max(1, ...points.flatMap((point) => [point.received, point.open, point.overdue]));
  const stackedMax = Math.max(1, ...points.map((point) => point.received + point.open + point.overdue));
  const maxValue = view === "stacked" ? stackedMax : lineMax;
  const gridLevels = 4;

  const xPosition = (index: number) => {
    if (points.length <= 1) return padLeft + plotWidth / 2;
    return padLeft + (index / (points.length - 1)) * plotWidth;
  };

  const yPosition = (value: number) => padTop + plotHeight - (Math.max(0, value) / maxValue) * plotHeight;

  const receivedPath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${xPosition(index)} ${yPosition(point.received)}`).join(" ");
  const openPath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${xPosition(index)} ${yPosition(point.open)}`).join(" ");
  const overduePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${xPosition(index)} ${yPosition(point.overdue)}`).join(" ");

  return (
    <div className="relative h-[300px] w-full overflow-hidden rounded-xl border border-lm-border/60 bg-[#120A1F]/60">
      <svg className="h-full w-full" preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`}>
        {Array.from({ length: gridLevels + 1 }).map((_item, idx) => {
          const y = padTop + (idx / gridLevels) * plotHeight;
          return <line key={`grid-${idx}`} stroke="rgba(148,163,184,0.18)" strokeWidth="1" x1={padLeft} x2={width - padRight} y1={y} y2={y} />;
        })}

        {view === "line" ? (
          <>
            <path d={overduePath} fill="none" stroke="#FB7185" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
            <path d={receivedPath} fill="none" stroke="#8B5CF6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
            <path d={openPath} fill="none" stroke="#34D399" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
            {points.map((point, index) => (
              <g key={`dot-${point.label}-${index}`}>
                <circle cx={xPosition(index)} cy={yPosition(point.overdue)} fill="#FB7185" r="2.6" />
                <circle cx={xPosition(index)} cy={yPosition(point.received)} fill="#8B5CF6" r="2.6" />
                <circle cx={xPosition(index)} cy={yPosition(point.open)} fill="#34D399" r="2.6" />
              </g>
            ))}
          </>
        ) : (
          <>
            {points.map((point, index) => {
              const x = xPosition(index);
              const groupWidth = Math.max(24, Math.min(52, plotWidth / Math.max(points.length, 1) * 0.58));
              const startY = padTop + plotHeight;
              const receivedHeight = (Math.max(0, point.received) / maxValue) * plotHeight;
              const openHeight = (Math.max(0, point.open) / maxValue) * plotHeight;
              const overdueHeight = (Math.max(0, point.overdue) / maxValue) * plotHeight;
              return (
                <g key={`stack-${point.label}-${index}`}>
                  <rect fill="rgba(124,58,237,0.86)" height={receivedHeight} rx="4" width={groupWidth} x={x - groupWidth / 2} y={startY - receivedHeight} />
                  <rect fill="rgba(52,211,153,0.78)" height={openHeight} rx="4" width={groupWidth} x={x - groupWidth / 2} y={startY - receivedHeight - openHeight} />
                  <rect fill="rgba(251,113,133,0.82)" height={overdueHeight} rx="4" width={groupWidth} x={x - groupWidth / 2} y={startY - receivedHeight - openHeight - overdueHeight} />
                </g>
              );
            })}
          </>
        )}
      </svg>

      <div className="pointer-events-none absolute bottom-2 left-0 right-0 grid grid-cols-6 gap-2 px-5 text-center text-[11px] font-semibold text-lm-text-subtle md:text-xs">
        {points.map((point) => (
          <span className="truncate" key={`label-${point.label}`}>
            {point.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function DashboardScreen() {
  const [period, setPeriod] = useState<DashboardPeriod>("6m");
  const [metric] = useState<DashboardMetric>("recebido");
  const [chartView, setChartView] = useState<ChartView>("line");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<BannerMessage | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [lastRefresh, setLastRefresh] = useState("--:--");
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [overduePage, setOverduePage] = useState(1);

  const [selectedPayment, setSelectedPayment] = useState<DashboardPaymentItem | null>(null);
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<SafePaymentMethod>("PIX");
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const [cashAdjustOpen, setCashAdjustOpen] = useState(false);
  const [cashAdjustType, setCashAdjustType] = useState<"income" | "expense">("income");
  const [cashAdjustAmount, setCashAdjustAmount] = useState("");
  const [cashAdjustDate, setCashAdjustDate] = useState(getLocalTodayIso());
  const [cashAdjustDescription, setCashAdjustDescription] = useState("");
  const [cashAdjustSubmitting, setCashAdjustSubmitting] = useState(false);

  const [collectionOpen, setCollectionOpen] = useState(false);
  const [collectionItem, setCollectionItem] = useState<DashboardPaymentItem | null>(null);
  const [collectionTemplate, setCollectionTemplate] = useState(COLLECTION_TEMPLATE);

  const chartPoints = normalizeChartPoints(dashboard?.chart?.points);
  const chartHasData = chartPoints.some((point) => point.received > 0 || point.open > 0 || point.overdue > 0);
  const currentChartPoint = chartPoints.length > 0 ? chartPoints[chartPoints.length - 1] : null;
  const previousChartPoint = chartPoints.length > 1 ? chartPoints[chartPoints.length - 2] : null;
  const currentMonthReceived = currentChartPoint?.received ?? 0;
  const previousMonthReceived = previousChartPoint?.received ?? 0;

  const kpis = dashboard?.kpis ?? {};
  const kpiCards = dashboard?.kpiCards ?? {};
  const cashBalance = toNumber(kpis.cashBalance ?? kpis.totalToReceive);
  const cashAdjustmentNet = toNumber(kpis.cashAdjustmentNet);
  const totalOverdue = toNumber(kpis.openReceivableOverdue ?? kpis.totalOverdue);
  const totalFutureOpen = toNumber(kpis.openReceivableFuture);
  const totalOpenReceivable = toNumber(kpis.totalOpenReceivable);

  const upcomingSource = Array.isArray(dashboard?.upcomingDue) ? dashboard?.upcomingDue : [];
  const overdueSource = Array.isArray(dashboard?.overduePayments) ? dashboard?.overduePayments : [];

  const upcomingPageState = nextPageSlice(upcomingSource, upcomingPage);
  const overduePageState = nextPageSlice(overdueSource, overduePage);

  const summaryDueToday = dashboard?.dailySummary?.dueToday;
  const summaryOverdue = dashboard?.dailySummary?.overdue;
  const summaryNext7 = dashboard?.dailySummary?.next7Days;

  const receivedMoMText = (() => {
    if (!previousChartPoint) return "--";
    if (previousMonthReceived <= 0) {
      return currentMonthReceived > 0 ? "Novo" : "--";
    }
    const pct = ((currentMonthReceived - previousMonthReceived) / previousMonthReceived) * 100;
    return `${pct >= 0 ? "+" : ""}${pct.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  })();

  function showMessage(text: string, tone: BannerTone) {
    setMessage({ text, tone });
  }

  async function loadDashboard(signal?: AbortSignal) {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo";
    const payload = await getDashboard(
      {
        period,
        metric,
        tz: timezone,
      },
      signal,
    );

    setDashboard(payload);
    setLastRefresh(currentTimeLabel());
  }

  useEffect(() => {
    try {
      const savedView = window.localStorage.getItem("dashboardChartView");
      if (savedView === "line" || savedView === "stacked") {
        setChartView(savedView);
      }
    } catch {
      // Ignora falhas de localStorage.
    }
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);

    void loadDashboard(controller.signal)
      .catch((error) => {
        if (!active || controller.signal.aborted) return;
        const text = error instanceof ApiClientError ? error.message || "Falha ao carregar dashboard." : "Erro ao carregar dashboard.";
        showMessage(text, "error");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [period, metric]);

  useEffect(() => {
    if (!message) return undefined;
    const timeoutId = window.setTimeout(() => setMessage(null), 4200);
    return () => window.clearTimeout(timeoutId);
  }, [message]);

  useEffect(() => {
    if (upcomingPage !== upcomingPageState.safePage) {
      setUpcomingPage(upcomingPageState.safePage);
    }
  }, [upcomingPage, upcomingPageState.safePage]);

  useEffect(() => {
    if (overduePage !== overduePageState.safePage) {
      setOverduePage(overduePageState.safePage);
    }
  }, [overduePage, overduePageState.safePage]);

  function onChangeChartView(nextView: ChartView) {
    setChartView(nextView);
    try {
      window.localStorage.setItem("dashboardChartView", nextView);
    } catch {
      // Ignora falhas de localStorage.
    }
  }

  function openPaymentModal(item: DashboardPaymentItem) {
    setSelectedPayment(item);
    setPaymentMethod(normalizePaymentMethod(item.paymentMethod));
    setPaymentDate(getLocalTodayIso());
  }

  function closePaymentModal(force = false) {
    if (paymentSubmitting && !force) return;
    setSelectedPayment(null);
    setPaymentDate("");
    setPaymentMethod("PIX");
    setPaymentSubmitting(false);
  }

  async function submitPaymentConfirmation() {
    if (paymentSubmitting || !selectedPayment) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate.trim())) {
      showMessage("Informe uma data de pagamento valida.", "error");
      return;
    }

    setPaymentSubmitting(true);
    try {
      await createPayment({
        loanId: selectedPayment.loanId,
        installmentId: selectedPayment.installmentId,
        amount: selectedPayment.amount,
        paymentDate,
        method: paymentMethod,
        notes: `Atualizado via dashboard (${paymentMethod})`,
      });
      showMessage("Parcela marcada como paga.", "success");
      closePaymentModal(true);
      await loadDashboard();
    } catch (error) {
      if (error instanceof ApiClientError) {
        showMessage(error.message || "Falha ao marcar parcela como paga.", "error");
      } else {
        showMessage("Erro de conexao ao marcar como pago.", "error");
      }
    } finally {
      setPaymentSubmitting(false);
    }
  }

  function openCashAdjustModal() {
    setCashAdjustOpen(true);
    setCashAdjustType("income");
    setCashAdjustAmount("");
    setCashAdjustDate(getLocalTodayIso());
    setCashAdjustDescription("");
    setCashAdjustSubmitting(false);
  }

  function closeCashAdjustModal(force = false) {
    if (cashAdjustSubmitting && !force) return;
    setCashAdjustOpen(false);
    setCashAdjustSubmitting(false);
  }

  async function submitCashAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (cashAdjustSubmitting) return;

    if (cashAdjustType !== "income" && cashAdjustType !== "expense") {
      showMessage("Tipo de ajuste invalido.", "error");
      return;
    }

    const amount = parseAdjustmentAmount(cashAdjustAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showMessage("Informe um valor maior que zero.", "error");
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(cashAdjustDate.trim())) {
      showMessage("Informe uma data valida.", "error");
      return;
    }

    setCashAdjustSubmitting(true);
    try {
      await createCashAdjustment({
        type: cashAdjustType,
        amount,
        date: cashAdjustDate.trim(),
        description: cashAdjustDescription.trim(),
      });
      showMessage("Ajuste de caixa salvo.", "success");
      closeCashAdjustModal(true);
      await loadDashboard();
    } catch (error) {
      if (error instanceof ApiClientError) {
        showMessage(error.message || "Falha ao salvar ajuste de caixa.", "error");
      } else {
        showMessage("Erro de conexao ao salvar ajuste de caixa.", "error");
      }
    } finally {
      setCashAdjustSubmitting(false);
    }
  }

  function handleWhatsAppCharge(item: DashboardPaymentItem) {
    const url = buildWhatsAppChargeUrl(item);
    if (!url) {
      showMessage("Cliente sem telefone valido para WhatsApp.", "error");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function openCollectionModal(item: DashboardPaymentItem) {
    setCollectionItem(item);
    setCollectionTemplate(COLLECTION_TEMPLATE);
    setCollectionOpen(true);
  }

  function closeCollectionModal() {
    setCollectionOpen(false);
    setCollectionItem(null);
    setCollectionTemplate(COLLECTION_TEMPLATE);
  }

  async function copyCollectionMessage() {
    if (!collectionItem) return;
    const text = replaceCollectionPlaceholders(collectionTemplate, collectionItem);
    try {
      await navigator.clipboard.writeText(text);
      showMessage("Mensagem copiada.", "success");
    } catch {
      showMessage("Nao foi possivel copiar a mensagem.", "error");
    }
  }

  const cashInsight = resolveInsight(kpiCards.cashBalance);
  const receivedInsight = resolveInsight(kpiCards.receivedThisMonth);
  const receivableInsight = resolveInsight(kpiCards.totalOpenReceivable);
  const profitInsight = resolveInsight(kpiCards.profitThisMonth);
  const roiInsight = resolveInsight(kpiCards.roiRate || kpiCards.profitTotal);
  const loanedInsight = resolveInsight(kpiCards.totalLoaned);

  const paymentStatusCode = String(selectedPayment?.status || "").toUpperCase();
  const paymentFallbackByDue = String(selectedPayment?.dueRelative || "").toLowerCase().startsWith("ha ") ? "ATRASADA" : "EM_DIA";
  const paymentResolvedStatus = paymentStatusCode || paymentFallbackByDue;
  const paymentStatusLabel =
    selectedPayment?.statusLabel
    || (paymentResolvedStatus === "ATRASADA" ? "Em atraso" : paymentResolvedStatus === "VENCE_HOJE" ? "Vence hoje" : "Em dia");

  return (
    <div className="w-full">
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-lm-text">Painel financeiro</h1>
          <p className="mt-1 text-sm text-lm-text-muted">Resumo da carteira, risco e lucro em tempo real.</p>
        </div>
        <div className="text-sm text-lm-text-subtle">
          Atualizado: <span className="font-semibold text-lm-text-muted">{lastRefresh}</span>
        </div>
      </header>

      {message ? <div className={`mb-4 rounded-xl px-3 py-2 text-sm ${messageClassName(message.tone)}`}>{message.text}</div> : null}

      <section className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-lm-border/70 bg-lm-card/95 p-5">
          <div className="mb-2 flex items-start justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-lm-text-muted">Saldo / Caixa atual</span>
            <Button
              className="h-7 rounded-lg border border-lm-border bg-lm-sidebar px-2 text-[11px] font-semibold text-lm-text-muted hover:bg-lm-card"
              onClick={openCashAdjustModal}
              size="sm"
              type="button"
              variant="secondary"
            >
              Ajustar caixa
            </Button>
          </div>
          <p className={`text-[1.7rem] font-bold leading-none ${loading ? "animate-pulse text-lm-text-subtle" : "text-lm-text"}`}>
            {loading ? "R$ --,--" : formatCurrency(cashBalance)}
          </p>
          <p className={`mt-2 text-sm font-semibold ${cashAdjustmentNet > 0 ? "text-lm-positive" : cashAdjustmentNet < 0 ? "text-lm-negative" : "text-lm-text-muted"}`}>
            Ajustes: {cashAdjustmentNet > 0 ? "+" : cashAdjustmentNet < 0 ? "-" : ""}
            {formatCurrency(Math.abs(cashAdjustmentNet))}
          </p>
          <p className={`mt-1 text-xs font-semibold ${toneClass(cashInsight.tone)}`}>{cashInsight.text}</p>
          <div className="mt-2">
            <Sparkline series={readSparklineSeries(kpiCards.cashBalance)} tone={cashInsight.tone} />
          </div>
        </article>

        <article className="rounded-2xl border border-lm-border/70 bg-lm-card/95 p-5">
          <div className="mb-2 flex items-start justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-lm-text-muted">Total recebido no mes</span>
          </div>
          <p className={`text-[1.7rem] font-bold leading-none ${loading ? "animate-pulse text-lm-text-subtle" : "text-lm-positive"}`}>
            {loading ? "R$ --,--" : formatCurrency(kpis.receivedThisMonth)}
          </p>
          <p className={`mt-2 text-xs font-semibold ${toneClass(receivedInsight.tone)}`}>{receivedInsight.text}</p>
          <div className="mt-2">
            <Sparkline series={readSparklineSeries(kpiCards.receivedThisMonth)} tone={receivedInsight.tone} />
          </div>
        </article>

        <article className={`rounded-2xl border p-5 ${totalOverdue > 0 ? "border-lm-danger/60 bg-rose-950/25" : "border-lm-border/70 bg-lm-card/95"}`}>
          <div className="mb-2 flex items-start justify-between gap-2">
            <span className={`text-[11px] font-bold uppercase tracking-[0.08em] ${totalOverdue > 0 ? "text-lm-negative" : "text-lm-text-muted"}`}>A Receber</span>
          </div>
          <p className={`text-[1.7rem] font-bold leading-none ${loading ? "animate-pulse text-lm-text-subtle" : totalOverdue > 0 ? "text-lm-negative" : "text-lm-text"}`}>
            {loading ? "R$ --,--" : formatCurrency(totalOpenReceivable)}
          </p>
          <p className={`mt-2 text-sm font-semibold ${totalOverdue > 0 ? "text-lm-negative" : "text-lm-text-muted"}`}>
            Futuras: {formatCurrency(totalFutureOpen)} | {totalOverdue > 0 ? `Atrasadas: ${formatCurrency(totalOverdue)}` : "Sem inadimplencia"}
          </p>
          <p className={`mt-1 text-xs font-semibold ${toneClass(receivableInsight.tone)}`}>{receivableInsight.text}</p>
          <div className="mt-2">
            <Sparkline series={readSparklineSeries(kpiCards.totalOpenReceivable)} tone={receivableInsight.tone} />
          </div>
        </article>
      </section>

      <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-lm-border/70 bg-lm-card/95 p-5">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-lm-text-muted">Lucro do mes</span>
          <p className={`mt-2 text-[1.45rem] font-bold leading-none ${loading ? "animate-pulse text-lm-text-subtle" : toNumber(kpis.profitThisMonth) >= 0 ? "text-lm-positive" : "text-lm-negative"}`}>
            {loading ? "R$ --,--" : formatCurrency(kpis.profitThisMonth)}
          </p>
          <p className={`mt-2 text-xs font-semibold ${toneClass(profitInsight.tone)}`}>{profitInsight.text}</p>
          <div className="mt-2">
            <Sparkline series={readSparklineSeries(kpiCards.profitThisMonth)} tone={profitInsight.tone} />
          </div>
        </article>

        <article className="rounded-2xl border border-lm-border/70 bg-lm-card/95 p-5">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-lm-text-muted">Retorno total</span>
          <p className={`mt-2 text-[1.45rem] font-bold leading-none ${loading ? "animate-pulse text-lm-text-subtle" : "text-lm-text"}`}>
            {loading ? "R$ --,--" : formatCurrency(kpis.profitTotal)}
          </p>
          <p className={`mt-2 text-xs font-semibold ${toNumber(kpis.roiRate) > 0 ? "text-lm-positive" : toNumber(kpis.roiRate) < 0 ? "text-lm-negative" : "text-lm-text-muted"}`}>
            ROI: {formatPercent(kpis.roiRate)}
          </p>
          <p className={`mt-1 text-xs font-semibold ${toneClass(roiInsight.tone)}`}>{roiInsight.text}</p>
          <div className="mt-2">
            <Sparkline series={readSparklineSeries(kpiCards.roiRate || kpiCards.profitTotal)} tone={roiInsight.tone} />
          </div>
        </article>

        <article className="rounded-2xl border border-lm-border/70 bg-lm-card/95 p-5">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-lm-text-muted">Total emprestado</span>
          <p className={`mt-2 text-[1.45rem] font-bold leading-none ${loading ? "animate-pulse text-lm-text-subtle" : "text-lm-text"}`}>
            {loading ? "R$ --,--" : formatCurrency(kpis.totalLoaned)}
          </p>
          <p className={`mt-2 text-xs font-semibold ${toneClass(loanedInsight.tone)}`}>{loanedInsight.text}</p>
          <div className="mt-2">
            <Sparkline series={readSparklineSeries(kpiCards.totalLoaned)} tone={loanedInsight.tone} />
          </div>
        </article>
      </section>

      <section className="mb-6 rounded-2xl border border-lm-border/70 bg-lm-card/92 p-4">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-bold text-lm-text">Resumo do dia</h3>
          <span className="text-xs text-lm-text-subtle">Clique para abrir Parcelas com filtro</span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <a className="block rounded-xl border border-lm-border/70 bg-lm-sidebar/55 p-3 transition hover:bg-lm-sidebar/75" href={summaryDueToday?.href || DEFAULT_SUMMARY_LINKS.dueToday}>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-lm-text-subtle">Vence hoje</p>
            <p className="mt-1 text-2xl font-bold text-lm-text">{toNumber(summaryDueToday?.count)}</p>
            <p className="text-sm font-semibold text-lm-text-muted">{formatCurrency(summaryDueToday?.totalValue || 0)}</p>
          </a>

          <a className="block rounded-xl border border-lm-danger/45 bg-rose-950/30 p-3 transition hover:bg-rose-950/40" href={summaryOverdue?.href || DEFAULT_SUMMARY_LINKS.overdue}>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-lm-negative">Em atraso (mes)</p>
            <p className="mt-1 text-2xl font-bold text-lm-negative">{toNumber(summaryOverdue?.count)}</p>
            <p className="text-sm font-semibold text-lm-negative">{formatCurrency(summaryOverdue?.totalValue || 0)}</p>
          </a>

          <a className="block rounded-xl border border-lm-border/70 bg-lm-sidebar/55 p-3 transition hover:bg-lm-sidebar/75" href={summaryNext7?.href || DEFAULT_SUMMARY_LINKS.next7}>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-lm-text-subtle">Prox. 7 dias</p>
            <p className="mt-1 text-2xl font-bold text-lm-text">{toNumber(summaryNext7?.count)}</p>
            <p className="text-sm font-semibold text-lm-text-muted">{formatCurrency(summaryNext7?.totalValue || 0)}</p>
          </a>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-lm-border/70 bg-lm-card/92 p-5">
          <div className="mb-3">
            <h3 className="text-xl font-bold text-lm-text">Acao rapida: proximos vencimentos</h3>
            <p className="mt-1 text-xs text-lm-text-subtle">Lista operacional para marcar pagamento rapido.</p>
          </div>

          <div className="space-y-3">
            {!upcomingPageState.hasItems ? (
              <div className="rounded-xl border border-lm-border/45 bg-lm-sidebar/45 py-10 text-center text-lm-text-subtle">
                Nenhum vencimento em dia.
              </div>
            ) : (
              upcomingPageState.items.map((item) => (
                <article className="rounded-xl border border-lm-border/55 bg-lm-sidebar/62 p-3" key={`upcoming-${item.installmentId}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-lm-text">{item.debtorName || "-"}</p>
                      <p className="text-xs text-lm-text-subtle">
                        Venc.: {formatDate(item.dueDate)} ({item.dueRelative || "-"})
                      </p>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <div className="text-right">
                        <p className="font-semibold text-lm-text">{formatCurrency(item.amount)}</p>
                        <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] ${statusPillClass(item.statusColor)}`}>
                          {item.statusLabel || "Em dia"}
                        </span>
                      </div>
                      <button
                        className="inline-flex h-8 items-center rounded-lg border border-lm-primary/60 bg-lm-primary/20 px-3 text-xs font-bold text-lm-text hover:bg-lm-primary/35"
                        onClick={() => openPaymentModal(item)}
                        type="button"
                      >
                        Pagar
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-lm-text-subtle">
            <button
              className="rounded-lg border border-lm-border px-2 py-1 text-lm-text-muted hover:bg-lm-sidebar disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!upcomingPageState.hasItems || upcomingPageState.safePage <= 1}
              onClick={() => setUpcomingPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              Anterior
            </button>
            <span>{upcomingPageState.hasItems ? `Pagina ${upcomingPageState.safePage} de ${upcomingPageState.totalPages}` : "Sem registros"}</span>
            <button
              className="rounded-lg border border-lm-border px-2 py-1 text-lm-text-muted hover:bg-lm-sidebar disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!upcomingPageState.hasItems || upcomingPageState.safePage >= upcomingPageState.totalPages}
              onClick={() => setUpcomingPage((current) => Math.min(upcomingPageState.totalPages, current + 1))}
              type="button"
            >
              Proxima
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-lm-border/70 bg-lm-card/92 p-5">
          <div className="mb-3">
            <h3 className="text-xl font-bold text-lm-text">Pagamentos atrasados</h3>
            <p className="mt-1 text-xs text-lm-text-subtle">Lista operacional para cobranca e baixa de atrasos.</p>
          </div>

          <div className="space-y-3">
            {!overduePageState.hasItems ? (
              <div className="rounded-xl border border-lm-border/45 bg-lm-sidebar/45 py-10 text-center text-lm-text-subtle">
                Sem pagamentos atrasados.
              </div>
            ) : (
              overduePageState.items.map((item) => {
                const whatsappUrl = buildWhatsAppChargeUrl(item);
                return (
                  <article className="rounded-xl border border-lm-danger/45 bg-rose-950/20 p-3" key={`overdue-${item.installmentId}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-lm-text">{item.debtorName || "-"}</p>
                        <p className="text-xs text-lm-text-subtle">
                          Venc.: {formatDate(item.dueDate)} ({item.dueRelative || "-"})
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-lm-text">{formatCurrency(item.amount)}</p>
                        <span className="inline-flex rounded-full border border-lm-danger/60 bg-lm-danger/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-lm-negative">
                          Em atraso
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {whatsappUrl ? (
                        <a
                          className="inline-flex h-8 items-center rounded-lg border border-emerald-500/55 bg-emerald-500/16 px-3 text-xs font-bold text-emerald-200 hover:bg-emerald-500/26"
                          href={whatsappUrl}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          Cobrar no WhatsApp
                        </a>
                      ) : (
                        <button
                          className="inline-flex h-8 cursor-not-allowed items-center rounded-lg border border-emerald-500/25 bg-emerald-500/8 px-3 text-xs font-bold text-emerald-200/55"
                          onClick={() => handleWhatsAppCharge(item)}
                          type="button"
                        >
                          Cobrar no WhatsApp
                        </button>
                      )}
                      <button
                        className="inline-flex h-8 items-center rounded-lg border border-lm-primary/60 bg-lm-primary/20 px-3 text-xs font-bold text-lm-text hover:bg-lm-primary/35"
                        onClick={() => openPaymentModal(item)}
                        type="button"
                      >
                        Pagar
                      </button>
                      <button
                        className="inline-flex h-8 items-center rounded-lg border border-lm-border bg-lm-sidebar px-3 text-xs font-bold text-lm-text-muted hover:bg-lm-card"
                        onClick={() => openCollectionModal(item)}
                        type="button"
                      >
                        Mensagem
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-lm-text-subtle">
            <button
              className="rounded-lg border border-lm-border px-2 py-1 text-lm-text-muted hover:bg-lm-sidebar disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!overduePageState.hasItems || overduePageState.safePage <= 1}
              onClick={() => setOverduePage((current) => Math.max(1, current - 1))}
              type="button"
            >
              Anterior
            </button>
            <span>{overduePageState.hasItems ? `Pagina ${overduePageState.safePage} de ${overduePageState.totalPages}` : "Sem registros"}</span>
            <button
              className="rounded-lg border border-lm-border px-2 py-1 text-lm-text-muted hover:bg-lm-sidebar disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!overduePageState.hasItems || overduePageState.safePage >= overduePageState.totalPages}
              onClick={() => setOverduePage((current) => Math.min(overduePageState.totalPages, current + 1))}
              type="button"
            >
              Proxima
            </button>
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-lm-border/70 bg-lm-card/92 p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-bold text-lm-text">Visao mensal da carteira</h3>
            <p className="mt-1 text-xs text-lm-text-subtle">Recebido no mes vs mes anterior.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl border border-lm-border bg-lm-sidebar/65 p-1">
              <button
                aria-pressed={chartView === "line"}
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${chartView === "line" ? "bg-lm-primary text-lm-text" : "text-lm-text-muted hover:bg-lm-card hover:text-lm-text"}`}
                onClick={() => onChangeChartView("line")}
                type="button"
              >
                Linha
              </button>
              <button
                aria-pressed={chartView === "stacked"}
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${chartView === "stacked" ? "bg-lm-primary text-lm-text" : "text-lm-text-muted hover:bg-lm-card hover:text-lm-text"}`}
                onClick={() => onChangeChartView("stacked")}
                type="button"
              >
                Barras empilhadas
              </button>
            </div>

            <select
              className="h-10 rounded-lg border border-lm-border bg-lm-sidebar px-3 text-sm text-lm-text focus:outline-none"
              onChange={(event) => setPeriod(event.target.value as DashboardPeriod)}
              value={period}
            >
              <option value="3m">3 meses</option>
              <option value="6m">6 meses</option>
              <option value="12m">12 meses</option>
            </select>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-lm-border/55 bg-lm-sidebar/55 px-4 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-lm-text-subtle">Recebido no mes</p>
              <p className="text-xl font-bold text-lm-text">{formatCurrency(currentMonthReceived)}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-lm-text-subtle">vs mes anterior</p>
              <p className={`text-xl font-bold ${receivedMoMText.startsWith("+") ? "text-lm-positive" : receivedMoMText.startsWith("-") ? "text-lm-negative" : "text-lm-text-muted"}`}>
                {receivedMoMText}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="h-[300px] animate-pulse rounded-xl border border-lm-border/60 bg-lm-sidebar/45" />
        ) : chartHasData ? (
          <DashboardChartGraphic points={chartPoints} view={chartView} />
        ) : (
          <div className="flex h-[300px] items-center justify-center rounded-xl border border-lm-border/60 bg-lm-sidebar/45 text-lm-text-muted">
            Sem dados no periodo.
          </div>
        )}
      </section>

      {selectedPayment ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-lm-border bg-lm-card p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-2xl font-bold text-lm-text">Confirmar pagamento</h3>
                <p className="text-sm text-lm-text-muted">Revise os dados antes de concluir.</p>
              </div>
              <button
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-lm-border text-lm-text-muted hover:bg-lm-sidebar hover:text-lm-text"
                onClick={() => closePaymentModal()}
                type="button"
              >
                x
              </button>
            </div>

            <section className="mb-4 rounded-xl border border-lm-border/60 bg-lm-sidebar/55 p-3 text-sm">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-lm-text-subtle">Cliente</span>
                  <span className="font-semibold text-lm-text">{selectedPayment.debtorName || "-"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-lm-text-subtle">Parcela</span>
                  <span className="font-semibold text-lm-text">#{selectedPayment.installmentId || "-"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-lm-text-subtle">Vencimento</span>
                  <span className="font-semibold text-lm-text">
                    {formatDate(selectedPayment.dueDate)} ({selectedPayment.dueRelative || "-"})
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-lm-text-subtle">Valor</span>
                  <span className="font-semibold text-lm-text">{formatCurrency(selectedPayment.amount)}</span>
                </div>
                <div className="pt-1 text-xs text-lm-text-subtle">
                  Status atual:{" "}
                  <span className={`font-semibold ${paymentResolvedStatus === "ATRASADA" ? "text-lm-negative" : paymentResolvedStatus === "VENCE_HOJE" ? "text-amber-300" : "text-lm-positive"}`}>
                    {paymentStatusLabel}
                  </span>
                </div>
              </div>
            </section>

            <section className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-lm-text-muted" htmlFor="paymentDateInput">
                  Data do pagamento
                </label>
                <Input
                  className="h-10 border-lm-border bg-lm-sidebar text-lm-text"
                  id="paymentDateInput"
                  onChange={(event) => setPaymentDate(event.target.value)}
                  type="date"
                  value={paymentDate}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-lm-text-muted" htmlFor="paymentMethodSelect">
                  Forma de pagamento
                </label>
                <select
                  className="h-10 w-full rounded-md border border-lm-border bg-lm-sidebar px-3 text-sm text-lm-text"
                  id="paymentMethodSelect"
                  onChange={(event) => setPaymentMethod(normalizePaymentMethod(event.target.value))}
                  value={paymentMethod}
                >
                  <option value="PIX">PIX</option>
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                </select>
              </div>
            </section>

            <div className="flex justify-end gap-2">
              <Button onClick={() => closePaymentModal()} type="button" variant="ghost">
                Cancelar
              </Button>
              <Button disabled={paymentSubmitting} onClick={() => void submitPaymentConfirmation()} type="button">
                {paymentSubmitting ? "Processando..." : "Confirmar pagamento"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {cashAdjustOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-lm-border bg-lm-card p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-2xl font-bold text-lm-text">Ajustar caixa</h3>
                <p className="text-sm text-lm-text-muted">Registre entrada ou retirada para atualizar o saldo atual.</p>
              </div>
              <button
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-lm-border text-lm-text-muted hover:bg-lm-sidebar hover:text-lm-text"
                onClick={() => closeCashAdjustModal()}
                type="button"
              >
                x
              </button>
            </div>

            <form className="space-y-4" onSubmit={(event) => void submitCashAdjustment(event)}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-lm-text-muted" htmlFor="cashAdjustmentType">
                    Tipo
                  </label>
                  <select
                    className="h-10 w-full rounded-md border border-lm-border bg-lm-sidebar px-3 text-sm text-lm-text"
                    id="cashAdjustmentType"
                    onChange={(event) => setCashAdjustType(event.target.value === "expense" ? "expense" : "income")}
                    value={cashAdjustType}
                  >
                    <option value="income">Entrada</option>
                    <option value="expense">Retirada</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-lm-text-muted" htmlFor="cashAdjustmentAmount">
                    Valor (R$)
                  </label>
                  <Input
                    className="h-10 border-lm-border bg-lm-sidebar text-lm-text"
                    id="cashAdjustmentAmount"
                    inputMode="decimal"
                    onChange={(event) => setCashAdjustAmount(event.target.value)}
                    placeholder="0,00"
                    value={cashAdjustAmount}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-lm-text-muted" htmlFor="cashAdjustmentDate">
                    Data
                  </label>
                  <Input
                    className="h-10 border-lm-border bg-lm-sidebar text-lm-text"
                    id="cashAdjustmentDate"
                    onChange={(event) => setCashAdjustDate(event.target.value)}
                    type="date"
                    value={cashAdjustDate}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-lm-text-muted" htmlFor="cashAdjustmentDescription">
                    Observacao
                  </label>
                  <Input
                    className="h-10 border-lm-border bg-lm-sidebar text-lm-text"
                    id="cashAdjustmentDescription"
                    maxLength={300}
                    onChange={(event) => setCashAdjustDescription(event.target.value)}
                    placeholder="Motivo do ajuste (opcional)"
                    type="text"
                    value={cashAdjustDescription}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button onClick={() => closeCashAdjustModal()} type="button" variant="ghost">
                  Cancelar
                </Button>
                <Button disabled={cashAdjustSubmitting} type="submit">
                  {cashAdjustSubmitting ? "Salvando..." : "Salvar ajuste"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {collectionOpen && collectionItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-lm-border bg-lm-card p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-2xl font-bold text-lm-text">Enviar cobranca</h3>
                <p className="text-sm text-lm-text-muted">Mensagem editavel com placeholders.</p>
              </div>
              <button
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-lm-border text-lm-text-muted hover:bg-lm-sidebar hover:text-lm-text"
                onClick={closeCollectionModal}
                type="button"
              >
                x
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs text-lm-text-subtle">Placeholders: {"{nome}"}, {"{valor}"}, {"{vencimento}"}, {"{pix_chave}"}</p>
                <label className="mb-1 block text-sm text-lm-text-muted" htmlFor="collectionMessage">
                  Mensagem
                </label>
                <textarea
                  className="min-h-[140px] w-full rounded-md border border-lm-border bg-lm-sidebar px-3 py-2 text-sm text-lm-text focus:outline-none"
                  id="collectionMessage"
                  onChange={(event) => setCollectionTemplate(event.target.value)}
                  value={collectionTemplate}
                />
              </div>

              <div className="rounded-xl border border-lm-border/60 bg-lm-sidebar/55 p-3">
                <p className="mb-2 text-sm font-semibold text-lm-text">Preview</p>
                <pre className="whitespace-pre-wrap text-sm text-lm-text-muted">{replaceCollectionPlaceholders(collectionTemplate, collectionItem)}</pre>
              </div>

              <div className="flex justify-end gap-2">
                <Button onClick={closeCollectionModal} type="button" variant="ghost">
                  Fechar
                </Button>
                <Button onClick={() => void copyCollectionMessage()} type="button">
                  Copiar mensagem
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
