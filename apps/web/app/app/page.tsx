import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  CalendarCheck2,
  ChevronRight,
  CircleAlert,
  Clock3,
  LineChart,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  getDashboardOverview,
  type DashboardMonthlyPoint,
  type DashboardOperationItem,
  type DashboardOverview,
  type DashboardRecentMovement,
} from "@/src/lib/api";

export const metadata = {
  title: "Visao geral",
};

type MetricTone = "cash" | "receivable" | "payable" | "projected";
type SummaryTone = "incoming" | "outgoing" | "projected";
type AlertTone = "slate" | "rose" | "amber" | "sky";

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

function formatDateOnly(value?: string) {
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

function formatPeriodLabel(period?: string) {
  return (
    {
      "3m": "Ultimos 3 meses",
      "6m": "Ultimos 6 meses",
      "12m": "Ultimos 12 meses",
    }[period || ""] || "Periodo padrao"
  );
}

function normalizeHref(href?: string) {
  if (!href || href === "/app/visao-geral") return "/app";
  return href;
}

function buildInsight(currentValue: unknown, previousValue: unknown) {
  const current = toNumber(currentValue);
  const previous = toNumber(previousValue);

  if (Math.abs(previous) < 0.00001) {
    if (Math.abs(current) < 0.00001) return { tone: "neutral", text: "0,00% vs mes anterior." } as const;
    return { tone: current >= 0 ? "positive" : "negative", text: "Sem base anterior." } as const;
  }

  const percentage = ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(percentage) < 0.005) {
    return { tone: "neutral", text: "0,00% vs mes anterior." } as const;
  }

  const percentageText = Math.abs(percentage).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return {
    tone: percentage > 0 ? "positive" : "negative",
    text: `${percentage > 0 ? "+" : "-"}${percentageText}% vs mes anterior.`,
  } as const;
}

function metricCardToneClasses(tone: MetricTone) {
  return {
    cash: "border-sky-500/35 bg-[linear-gradient(135deg,rgba(19,52,128,0.96),rgba(15,33,83,0.94))]",
    receivable: "border-emerald-500/35 bg-[linear-gradient(135deg,rgba(5,106,84,0.96),rgba(4,71,56,0.94))]",
    payable: "border-rose-500/35 bg-[linear-gradient(135deg,rgba(130,11,44,0.96),rgba(89,8,34,0.94))]",
    projected: "border-violet-500/35 bg-[linear-gradient(135deg,rgba(94,25,159,0.96),rgba(70,22,117,0.94))]",
  }[tone];
}

function summaryCardToneClasses(tone: SummaryTone) {
  return {
    incoming: "border-emerald-400/25 bg-[linear-gradient(135deg,rgba(9,97,99,0.92),rgba(9,68,72,0.9))]",
    outgoing: "border-rose-400/25 bg-[linear-gradient(135deg,rgba(101,19,63,0.92),rgba(69,16,49,0.9))]",
    projected: "border-sky-400/25 bg-[linear-gradient(135deg,rgba(24,60,122,0.92),rgba(23,49,94,0.9))]",
  }[tone];
}

function alertToneClasses(tone: AlertTone) {
  return {
    slate: "border-slate-700/50 bg-slate-950/35 text-slate-100",
    rose: "border-rose-500/20 bg-rose-950/30 text-rose-100",
    amber: "border-amber-500/20 bg-amber-950/25 text-amber-100",
    sky: "border-sky-500/20 bg-sky-950/30 text-sky-100",
  }[tone];
}

function ChartBar({
  value,
  maxValue,
  toneClassName,
}: {
  value: number;
  maxValue: number;
  toneClassName: string;
}) {
  const height = value > 0 ? Math.max((value / maxValue) * 188, 12) : 4;

  return (
    <div
      className={`w-3 rounded-t-full ${toneClassName}`}
      style={{ height }}
      title={formatCurrency(value)}
    />
  );
}

function MetricCard({
  href,
  icon,
  label,
  value,
  note,
  meta,
  tone,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  value: string;
  note: string;
  meta: string;
  tone: MetricTone;
}) {
  return (
    <Link
      href={normalizeHref(href)}
      className={`group relative overflow-hidden rounded-[20px] border p-5 shadow-[0_16px_34px_rgba(2,6,23,0.24)] transition duration-200 hover:-translate-y-0.5 ${metricCardToneClasses(tone)}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_42%)]" />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <p className="text-[0.8rem] font-semibold uppercase tracking-[0.04em] text-slate-100/90">{label}</p>
        <span className="text-slate-100/80">{icon}</span>
      </div>
      <p className="font-number relative z-10 mt-4 text-[2rem] leading-none tracking-[-0.03em] text-white">{value}</p>
      <p className="relative z-10 mt-3 text-[1rem] text-slate-50/95">{note}</p>
      <p className="relative z-10 mt-2 text-sm leading-6 text-slate-200/75">{meta}</p>
    </Link>
  );
}

function OperationPanel({
  title,
  note,
  totalValue,
  items,
  emptyTitle,
  emptyNote,
  hrefFallback,
  icon,
  amountClassName,
}: {
  title: string;
  note: string;
  totalValue: number;
  items: DashboardOperationItem[];
  emptyTitle: string;
  emptyNote: string;
  hrefFallback: string;
  icon: ReactNode;
  amountClassName: string;
}) {
  return (
    <article className="relative overflow-hidden rounded-[22px] border border-slate-700/30 bg-[linear-gradient(180deg,rgba(10,18,34,0.96),rgba(9,16,30,0.84))] p-4 shadow-[0_10px_30px_rgba(2,6,23,0.28)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_30%)] opacity-70" />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[1.08rem] font-bold tracking-[-0.02em] text-slate-100">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">{note}</p>
          </div>
          <span className="font-number rounded-full border border-sky-400/15 bg-slate-900/60 px-3 py-1 text-xs text-slate-300">
            Total: {formatCurrency(totalValue)}
          </span>
        </div>

        {items.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {items.map((item, index) => (
              <Link
                key={`${item.title || "item"}-${index}`}
                href={normalizeHref(item.href || hrefFallback)}
                className="group flex items-center gap-4 rounded-[18px] border border-slate-700/40 bg-slate-950/30 px-4 py-3 transition duration-200 hover:border-sky-400/30 hover:bg-slate-950/50"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-slate-700/50 bg-slate-900/70 text-slate-200">
                  {icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {item.moduleLabel || "Financeiro"} • {item.typeLabel || title}
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-100">{item.title || "Lancamento"}</p>
                  <p className="mt-1 truncate text-xs text-slate-400">
                    {item.subtitle || "Sem categoria"} • {formatDateOnly(item.date)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-number text-sm ${amountClassName}`}>{formatCurrency(item.amount)}</span>
                  <ChevronRight className="size-4 text-slate-500 transition group-hover:text-slate-200" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-4 flex min-h-[198px] flex-col items-center justify-center rounded-[18px] border border-slate-700/40 bg-slate-950/30 px-6 py-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-slate-700/50 bg-slate-900/70 text-slate-300">
              <CalendarCheck2 className="size-5" />
            </div>
            <p className="mt-5 text-xl font-semibold tracking-[-0.03em] text-slate-100">{emptyTitle}</p>
            <p className="mt-3 max-w-md text-sm leading-7 text-slate-400">{emptyNote}</p>
          </div>
        )}
      </div>
    </article>
  );
}

function MonthlyFlowChart({
  points,
  hasData,
  emptyMessage,
}: {
  points: DashboardMonthlyPoint[];
  hasData: boolean;
  emptyMessage: string;
}) {
  if (!hasData || points.length === 0) {
    return (
      <div className="relative mt-4 min-h-[320px] overflow-hidden rounded-[18px] border border-slate-700/40 bg-slate-950/30 p-4">
        <div className="absolute inset-4 flex items-center justify-center rounded-[14px] bg-slate-950/70 text-center text-sm leading-6 text-slate-400">
          <div>
            <LineChart className="mx-auto mb-2 h-8 w-8 opacity-60" />
            <p className="font-semibold">{emptyMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(
    ...points.flatMap((point) => [
      toNumber(point.received),
      toNumber(point.open),
      toNumber(point.overdue),
    ]),
    1,
  );

  return (
    <div className="mt-4 rounded-[18px] border border-slate-700/40 bg-slate-950/30 p-4">
      <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-400">
        <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-emerald-400" />Recebido</span>
        <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-sky-400" />Em aberto</span>
        <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-amber-400" />Atrasado</span>
      </div>

      <div className="mt-6 grid min-h-[240px] grid-cols-3 gap-3 sm:grid-cols-6">
        {points.map((point, index) => (
          <div key={`${point.label || "mes"}-${index}`} className="flex min-h-[240px] flex-col justify-end">
            <div className="flex h-[188px] items-end justify-center gap-1.5 rounded-[16px] border border-slate-800/70 bg-slate-950/40 px-3 pb-3 pt-6">
              <ChartBar maxValue={maxValue} toneClassName="bg-emerald-400/90" value={toNumber(point.received)} />
              <ChartBar maxValue={maxValue} toneClassName="bg-sky-400/90" value={toNumber(point.open)} />
              <ChartBar maxValue={maxValue} toneClassName="bg-amber-400/90" value={toNumber(point.overdue)} />
            </div>
            <div className="mt-3 text-center">
              <p className="text-sm font-semibold text-slate-200">{point.label || "--"}</p>
              <p className="font-number mt-1 text-[0.72rem] text-slate-500">{formatCurrency(point.received)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DailySummaryCard({
  href,
  title,
  value,
  meta,
  tone,
  icon,
}: {
  href: string;
  title: string;
  value: string;
  meta: string;
  tone: SummaryTone;
  icon: ReactNode;
}) {
  return (
    <Link
      href={normalizeHref(href)}
      className={`group relative overflow-hidden rounded-[18px] border px-4 py-4 transition duration-200 hover:-translate-y-0.5 ${summaryCardToneClasses(tone)}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_42%)] opacity-80" />
      <div className="relative z-10 flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] text-slate-100">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-100">{title}</p>
          <p className="font-number mt-3 text-[2rem] leading-none tracking-[-0.03em] text-white">{value}</p>
          <p className="mt-3 text-sm leading-6 text-slate-200/80">{meta}</p>
        </div>
      </div>
    </Link>
  );
}

function RecentMovementsSection({ items }: { items: DashboardRecentMovement[] }) {
  return (
    <section className="mt-4">
      <article className="relative overflow-hidden rounded-[22px] border border-slate-700/30 bg-[linear-gradient(180deg,rgba(10,18,34,0.96),rgba(9,16,30,0.84))] p-4 shadow-[0_10px_30px_rgba(2,6,23,0.28)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_30%)] opacity-70" />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[1.08rem] font-bold tracking-[-0.02em] text-slate-100">Ultimos lancamentos</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">Movimentacoes mais recentes registradas no financeiro.</p>
            </div>
            <span className="font-number rounded-full border border-sky-400/15 bg-slate-900/60 px-3 py-1 text-xs text-slate-300">
              {items.length} registro(s)
            </span>
          </div>

          {items.length > 0 ? (
            <div className="mt-5 grid gap-3">
              {items.map((item, index) => {
                const incoming = item.direction === "in";

                return (
                  <Link
                    key={`${item.id || "movement"}-${index}`}
                    href={normalizeHref(item.href || "/app")}
                    className="group flex items-center gap-4 rounded-[18px] border border-slate-700/40 bg-slate-950/30 px-4 py-4 transition duration-200 hover:border-sky-400/30 hover:bg-slate-950/45"
                  >
                    <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl border ${incoming ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-rose-500/20 bg-rose-500/10 text-rose-300"}`}>
                      {incoming ? <ArrowUpRight className="size-4" /> : <ArrowDownLeft className="size-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        {item.moduleLabel || "Financeiro"} - {item.typeLabel || "Lancamento"}
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-100">{item.title || "Lancamento sem descricao"}</p>
                      <p className="mt-1 truncate text-xs text-slate-400">
                        {item.subtitle || "Sem categoria"} - {formatDateOnly(item.date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-number text-sm ${incoming ? "text-emerald-200" : "text-rose-200"}`}>
                        {formatCurrency(item.amount)}
                      </p>
                      <p className="mt-1 text-[0.72rem] text-slate-500">{item.id ? `ID ${item.id}` : "--"}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 flex min-h-[180px] flex-col items-center justify-center rounded-[18px] border border-slate-700/40 bg-slate-950/30 px-6 py-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl border border-slate-700/50 bg-slate-900/70 text-slate-300">
                <Clock3 className="size-5" />
              </div>
              <p className="mt-5 text-xl font-semibold tracking-[-0.03em] text-slate-100">Sem lancamentos recentes.</p>
              <p className="mt-3 max-w-md text-sm leading-7 text-slate-400">
                Os ultimos registros do financeiro vao aparecer aqui conforme a base for alimentada.
              </p>
            </div>
          )}
        </div>
      </article>
    </section>
  );
}

export default async function AdminHomePage() {
  let payload: DashboardOverview | null = null;
  let error: string | null = null;

  try {
    payload = await getDashboardOverview("6m");
  } catch (requestError) {
    error = requestError instanceof Error ? requestError.message : "Falha ao carregar a visao geral.";
  }

  const overview = payload?.overviewSummary;
  const operations = payload?.dailyOperations;
  const chart = payload?.chart;
  const receiptsTodayItems = operations?.receiptsToday?.items || [];
  const paymentsTodayItems = operations?.paymentsToday?.items || [];
  const incomingValue = toNumber(operations?.receiptsToday?.totalValue);
  const outgoingValue = toNumber(operations?.paymentsToday?.totalValue);
  const cashBalance = toNumber(overview?.cashBalance?.value);
  const projectedDayValue = cashBalance + incomingValue - outgoingValue;
  const projectedValue = toNumber(overview?.projectedBalance?.value);
  const dueTodayCount = toNumber(operations?.alerts?.dueTodayCount);
  const overdueIncomingCount = toNumber(operations?.alerts?.overdueIncomingCount);
  const overdueOutgoingCount = toNumber(operations?.alerts?.overdueOutgoingCount);
  const chartPoints = chart?.points || [];
  const recentMovements = payload?.recentMovements || [];
  const currentPoint = chartPoints[chartPoints.length - 1];
  const previousPoint = chartPoints[chartPoints.length - 2];
  const flowInsight = buildInsight(currentPoint?.received, previousPoint?.received);

  const alerts: Array<{ href: string; icon: ReactNode; label: string; tone: AlertTone }> = [
    {
      href: normalizeHref(operations?.alerts?.outgoingHref || "/app/finance/payables"),
      icon: <Bell className="size-4" />,
      label: dueTodayCount > 0 ? `${dueTodayCount} conta(s) vence(m) hoje` : "Nenhuma conta vence hoje",
      tone: dueTodayCount > 0 ? "rose" : "slate",
    },
    {
      href: normalizeHref(operations?.alerts?.outgoingHref || "/app/finance/payables"),
      icon: <CircleAlert className="size-4" />,
      label: overdueOutgoingCount > 0 ? `${overdueOutgoingCount} conta(s) atrasada(s)` : "Nenhuma conta atrasada",
      tone: overdueOutgoingCount > 0 ? "rose" : "slate",
    },
    {
      href: normalizeHref(operations?.alerts?.incomingHref || "/app/finance/receivables"),
      icon: <Clock3 className="size-4" />,
      label: overdueIncomingCount > 0 ? `${overdueIncomingCount} recebimento(s) atrasado(s)` : "Nenhum recebimento atrasado",
      tone: overdueIncomingCount > 0 ? "amber" : "slate",
    },
    {
      href: normalizeHref(overview?.projectedBalance?.href || "/app"),
      icon: <Activity className="size-4" />,
      label: projectedValue < 1000 ? `Saldo projetado abaixo de ${formatCurrency(1000)}` : `Saldo projetado: ${formatCurrency(projectedValue)}`,
      tone: "sky",
    },
  ];

  return (
    <div className="w-full">
      <section className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[clamp(2rem,1.2vw+1.2rem,2.45rem)] font-bold leading-[1.04] tracking-[-0.035em] text-slate-100">
            Visao geral
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-8 text-slate-300">
            Resumo do caixa, recebimentos e compromissos financeiros.
          </p>
        </div>

        <div className="grid gap-3 text-left lg:justify-items-end lg:text-right">
          <span className="inline-flex items-center rounded-full border border-sky-400/15 bg-slate-900/60 px-3 py-[0.34rem] text-[0.69rem] font-semibold text-slate-300">
            Periodo: {formatPeriodLabel(payload?.meta?.period)}
          </span>
          <div className="text-sm text-slate-400">
            Atualizado: <span className="font-number text-slate-200">{formatDateTime(payload?.meta?.generatedAt, payload?.meta?.timezone)}</span>
          </div>
        </div>
      </section>

      {error ? (
        <div className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          href={overview?.cashBalance?.href || "/app"}
          icon={<Wallet className="h-[1.05rem] w-[1.05rem]" />}
          label="Saldo em caixa"
          meta={`Ajustes: ${formatCurrency(payload?.cashAdjustment?.net)}`}
          note={overview?.cashBalance?.note || "Disponivel agora"}
          tone="cash"
          value={formatCurrency(overview?.cashBalance?.value)}
        />
        <MetricCard
          href={overview?.accountsReceivable?.href || "/app/finance/receivables"}
          icon={<ArrowUpRight className="h-[1.05rem] w-[1.05rem]" />}
          label="Contas a receber"
          meta={`Emprestimos: ${formatCurrency(overview?.accountsReceivable?.loanValue)} | Financeiro: ${formatCurrency(overview?.accountsReceivable?.financeValue)}`}
          note={overview?.accountsReceivable?.note || "Emprestimos + Financeiro"}
          tone="receivable"
          value={formatCurrency(overview?.accountsReceivable?.value)}
        />
        <MetricCard
          href={overview?.accountsPayable?.href || "/app/finance/payables"}
          icon={<ArrowDownLeft className="h-[1.05rem] w-[1.05rem]" />}
          label="Contas a pagar"
          meta={`${toNumber(overview?.accountsPayable?.itemsCount)} lancamento(s) pendente(s)`}
          note={overview?.accountsPayable?.note || "Compromissos pendentes"}
          tone="payable"
          value={formatCurrency(overview?.accountsPayable?.value)}
        />
        <MetricCard
          href={overview?.projectedBalance?.href || "/app"}
          icon={<TrendingUp className="h-[1.05rem] w-[1.05rem]" />}
          label="Saldo previsto"
          meta={`Entradas: ${formatCurrency(overview?.projectedBalance?.receivableValue)} | Saidas: ${formatCurrency(overview?.projectedBalance?.payableValue)}`}
          note={overview?.projectedBalance?.note || "Apos entradas e saidas"}
          tone="projected"
          value={formatCurrency(overview?.projectedBalance?.value)}
        />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_1.15fr_.8fr]">
        <OperationPanel
          amountClassName="text-emerald-100"
          emptyNote="Quando houver parcelas ou contas a receber no dia, elas aparecem aqui."
          emptyTitle="Sem recebimentos previstos para hoje."
          hrefFallback="/app/finance/receivables"
          icon={<ArrowUpRight className="size-4" />}
          items={receiptsTodayItems}
          note="Titulos previstos para entrada no dia atual."
          title="Recebimentos de hoje"
          totalValue={incomingValue}
        />
        <OperationPanel
          amountClassName="text-rose-100"
          emptyNote="Quando houver contas a pagar no dia, elas aparecem aqui."
          emptyTitle="Sem pagamentos previstos para hoje."
          hrefFallback="/app/finance/payables"
          icon={<ArrowDownLeft className="size-4" />}
          items={paymentsTodayItems}
          note="Saidas financeiras previstas para hoje."
          title="Pagamentos de hoje"
          totalValue={outgoingValue}
        />

        <article className="relative overflow-hidden rounded-[22px] border border-slate-700/30 bg-[linear-gradient(180deg,rgba(10,18,34,0.96),rgba(9,16,30,0.84))] p-4 shadow-[0_10px_30px_rgba(2,6,23,0.28)]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_30%)] opacity-70" />
          <div className="relative z-10 grid gap-4">
            <div>
              <h3 className="text-[1.08rem] font-bold tracking-[-0.02em] text-slate-100">Alertas financeiros</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">Leitura rapida dos compromissos e riscos do dia.</p>
            </div>
            <div className="grid gap-3">
              {alerts.map((alert, index) => (
                <Link
                  key={`${alert.label}-${index}`}
                  href={alert.href}
                  className={`group flex items-center gap-3 rounded-[18px] border px-4 py-4 transition duration-200 hover:-translate-y-0.5 ${alertToneClasses(alert.tone)}`}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.06]">
                    {alert.icon}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-semibold leading-6">{alert.label}</span>
                  <ChevronRight className="size-4 text-slate-500 transition group-hover:text-slate-200" />
                </Link>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.45fr_.75fr]">
        <article className="relative overflow-hidden rounded-[22px] border border-slate-700/30 bg-[linear-gradient(180deg,rgba(10,18,34,0.96),rgba(9,16,30,0.84))] p-4 shadow-[0_10px_30px_rgba(2,6,23,0.28)]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_30%)] opacity-70" />
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[1.08rem] font-bold tracking-[-0.02em] text-slate-100">Fluxo mensal</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">Leitura dos ultimos meses com recebido, em aberto e atraso.</p>
              </div>
              <span className="rounded-full border border-sky-400/15 bg-slate-900/60 px-3 py-1 text-xs font-semibold text-slate-300">
                {formatPeriodLabel(chart?.period)}
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-[16px] border border-slate-700/40 bg-slate-950/25 px-4 py-4">
                <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-slate-400">Mes atual</p>
                <p className="font-number mt-3 text-[1.5rem] tracking-[-0.03em] text-white">{formatCurrency(currentPoint?.received)}</p>
                <p className={`mt-2 text-sm leading-6 ${flowInsight.tone === "positive" ? "text-emerald-300" : flowInsight.tone === "negative" ? "text-rose-300" : "text-slate-400"}`}>
                  {flowInsight.text}
                </p>
              </div>
              <div className="rounded-[16px] border border-slate-700/40 bg-slate-950/25 px-4 py-4">
                <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-slate-400">Comparativo</p>
                <p className="font-number mt-3 text-[1.5rem] tracking-[-0.03em] text-white">{previousPoint ? formatCurrency(previousPoint.received) : "--"}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {previousPoint ? `Base de ${previousPoint.label}.` : "Sem base anterior para comparativo."}
                </p>
              </div>
              <div className="rounded-[16px] border border-slate-700/40 bg-slate-950/25 px-4 py-4">
                <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-slate-400">Carteira do mes</p>
                <p className="font-number mt-3 text-[1.5rem] tracking-[-0.03em] text-white">
                  {formatCurrency(toNumber(currentPoint?.open) + toNumber(currentPoint?.overdue))}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Em aberto: {formatCurrency(currentPoint?.open)} | Atrasado: {formatCurrency(currentPoint?.overdue)}
                </p>
              </div>
            </div>

            <MonthlyFlowChart
              emptyMessage={chart?.emptyMessage || "Sem dados no periodo."}
              hasData={Boolean(chart?.hasData)}
              points={chartPoints}
            />
          </div>
        </article>

        <article className="relative overflow-hidden rounded-[22px] border border-slate-700/30 bg-[linear-gradient(180deg,rgba(10,18,34,0.96),rgba(9,16,30,0.84))] p-4 shadow-[0_10px_30px_rgba(2,6,23,0.28)]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_30%)] opacity-70" />
          <div className="relative z-10">
            <div>
              <h3 className="text-[1.08rem] font-bold tracking-[-0.02em] text-slate-100">Resumo do dia</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">Entradas, saidas e projecao imediata do caixa.</p>
            </div>
            <div className="mt-5 grid gap-4">
              <DailySummaryCard
                href={overview?.accountsReceivable?.href || "/app/finance/receivables"}
                icon={<ArrowUpRight className="h-4 w-4" />}
                meta={receiptsTodayItems.length ? `${receiptsTodayItems.length} ${receiptsTodayItems.length === 1 ? "entrada prevista para hoje." : "entradas previstas para hoje."}` : "Nenhuma entrada prevista para hoje."}
                title="Entradas previstas hoje"
                tone="incoming"
                value={formatCurrency(incomingValue)}
              />
              <DailySummaryCard
                href={overview?.accountsPayable?.href || "/app/finance/payables"}
                icon={<ArrowDownLeft className="h-4 w-4" />}
                meta={paymentsTodayItems.length ? `${paymentsTodayItems.length} ${paymentsTodayItems.length === 1 ? "saida prevista para hoje." : "saidas previstas para hoje."}` : "Nenhuma saida prevista para hoje."}
                title="Saidas previstas hoje"
                tone="outgoing"
                value={formatCurrency(outgoingValue)}
              />
              <DailySummaryCard
                href={overview?.projectedBalance?.href || "/app"}
                icon={<Wallet className="h-4 w-4" />}
                meta={`Caixa atual ${formatCurrency(cashBalance)} + entradas - saidas do dia.`}
                title="Saldo projetado do dia"
                tone="projected"
                value={formatCurrency(projectedDayValue)}
              />
            </div>
          </div>
        </article>
      </section>

      <RecentMovementsSection items={recentMovements} />
    </div>
  );
}
