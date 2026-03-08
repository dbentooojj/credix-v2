import type { ReactNode } from "react";
import Link from "next/link";
import { AlertCircle, BadgeDollarSign, CalendarClock, CircleDollarSign, HandCoins, TrendingUp, Wallet } from "lucide-react";
import type { PortfolioOverview } from "@/src/lib/api";
import { PortfolioHealthPanel } from "@/src/components/portfolio/portfolio-health-panel";
import { PortfolioMonthlyChart } from "@/src/components/portfolio/portfolio-monthly-chart";

type PortfolioOverviewPageProps = {
  payload: PortfolioOverview | null;
  error: string | null;
};

type PortfolioMetricTone = "brand" | "positive" | "warning";
type PortfolioOverviewEntry = NonNullable<PortfolioOverview["upcomingDue"]>[number];

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

function metricToneClasses(tone: PortfolioMetricTone) {
  return {
    brand: "border-sky-500/30 bg-[linear-gradient(135deg,rgba(20,42,94,0.94),rgba(10,22,55,0.92))]",
    positive: "border-emerald-500/30 bg-[linear-gradient(135deg,rgba(7,97,75,0.94),rgba(6,65,53,0.92))]",
    warning: "border-amber-500/30 bg-[linear-gradient(135deg,rgba(96,65,17,0.94),rgba(67,46,14,0.92))]",
  }[tone];
}

function buildInstallmentsHref(filters: {
  due?: string;
  quick?: string;
  search?: string;
  status?: string;
}) {
  const searchParams = new URLSearchParams();

  if (filters.status) searchParams.set("status", filters.status);
  if (filters.due) searchParams.set("due", filters.due);
  if (filters.quick) searchParams.set("quick", filters.quick);
  if (filters.search) searchParams.set("search", filters.search);

  const query = searchParams.toString();
  return query ? `/app/parcelas?${query}` : "/app/parcelas";
}

function PortfolioMetricCard({
  icon,
  label,
  value,
  note,
  meta,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  note: string;
  meta: string;
  tone: PortfolioMetricTone;
}) {
  return (
    <article className={`relative overflow-hidden rounded-[20px] border p-5 shadow-[0_16px_34px_rgba(2,6,23,0.24)] ${metricToneClasses(tone)}`}>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_40%)]" />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <p className="text-[0.8rem] font-semibold uppercase tracking-[0.04em] text-slate-100/90">{label}</p>
        <span className="text-slate-100/80">{icon}</span>
      </div>
      <p className="font-number relative z-10 mt-4 text-[2rem] leading-none tracking-[-0.03em] text-white">{value}</p>
      <p className="relative z-10 mt-3 text-[1rem] text-slate-50/95">{note}</p>
      <p className="relative z-10 mt-2 text-sm leading-6 text-slate-200/75">{meta}</p>
    </article>
  );
}

function SummaryCard({
  label,
  count,
  href,
  totalValue,
}: {
  label: string;
  count: number;
  href?: string;
  totalValue: number;
}) {
  const content = (
    <>
      <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="font-number mt-3 text-[1.8rem] tracking-[-0.03em] text-white">{count}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{formatCurrency(totalValue)}</p>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-[18px] border border-slate-700/40 bg-slate-950/30 px-4 py-4 transition hover:border-sky-400/35 hover:bg-slate-950/45"
      >
        {content}
      </Link>
    );
  }

  return <article className="rounded-[18px] border border-slate-700/40 bg-slate-950/30 px-4 py-4">{content}</article>;
}

function PortfolioListPanel({
  title,
  note,
  emptyTitle,
  emptyNote,
  itemHrefBuilder,
  items,
}: {
  title: string;
  note: string;
  emptyTitle: string;
  emptyNote: string;
  itemHrefBuilder?: (item: PortfolioOverviewEntry) => string;
  items: PortfolioOverviewEntry[];
}) {
  return (
    <article className="relative overflow-hidden rounded-[22px] border border-slate-700/30 bg-[linear-gradient(180deg,rgba(10,18,34,0.96),rgba(9,16,30,0.84))] p-4 shadow-[0_10px_30px_rgba(2,6,23,0.28)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_30%)] opacity-70" />
      <div className="relative z-10">
        <h3 className="text-[1.08rem] font-bold tracking-[-0.02em] text-slate-100">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-300">{note}</p>

        {items.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {items.map((item) => (
              <Link
                key={item.id}
                href={itemHrefBuilder ? itemHrefBuilder(item) : "/app/parcelas"}
                className="flex items-center gap-4 rounded-[18px] border border-slate-700/40 bg-slate-950/30 px-4 py-3 transition hover:border-sky-400/35 hover:bg-slate-950/45"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-slate-700/50 bg-slate-900/70 text-slate-200">
                  <CalendarClock className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-400">{item.loanLabel}</p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-100">{item.customerName}</p>
                  <p className="mt-1 truncate text-xs text-slate-400">{item.installmentLabel} - {formatDateOnly(item.dueDate)}</p>
                </div>
                <div className="text-right">
                  <p className="font-number text-sm text-slate-100">{formatCurrency(item.amount)}</p>
                  <p className="mt-1 text-xs text-slate-400">{item.timingLabel}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-4 flex min-h-[198px] flex-col items-center justify-center rounded-[18px] border border-slate-700/40 bg-slate-950/30 px-6 py-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-slate-700/50 bg-slate-900/70 text-slate-300">
              <AlertCircle className="size-5" />
            </div>
            <p className="mt-5 text-xl font-semibold tracking-[-0.03em] text-slate-100">{emptyTitle}</p>
            <p className="mt-3 max-w-md text-sm leading-7 text-slate-400">{emptyNote}</p>
          </div>
        )}
      </div>
    </article>
  );
}

export function PortfolioOverviewPage({ payload, error }: PortfolioOverviewPageProps) {
  const highlights = payload?.highlights;
  const kpis = payload?.kpis;
  const dailySummary = payload?.dailySummary;
  const upcomingDue = payload?.upcomingDue || [];
  const overduePayments = payload?.overduePayments || [];

  return (
    <div className="w-full">
      <section className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[clamp(2rem,1.2vw+1.2rem,2.45rem)] font-bold leading-[1.04] tracking-[-0.035em] text-slate-100">
            Painel da carteira
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-8 text-slate-300">
            Resumo da carteira, risco e lucro em tempo real.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <span className="rounded-full border border-slate-700/40 bg-slate-950/35 px-3 py-1 text-xs font-semibold text-slate-300">
              {toNumber(highlights?.activeContracts)} contrato(s) ativo(s)
            </span>
            <span className="rounded-full border border-slate-700/40 bg-slate-950/35 px-3 py-1 text-xs font-semibold text-slate-300">
              {toNumber(highlights?.activeCustomers)} cliente(s) na carteira
            </span>
            <span className="rounded-full border border-amber-400/20 bg-amber-950/25 px-3 py-1 text-xs font-semibold text-amber-100">
              Inadimplencia: {formatPercent(highlights?.delinquencyRate)}
            </span>
          </div>
        </div>

        <div className="grid gap-3 text-left lg:justify-items-end lg:text-right">
          <span className="font-menu inline-flex items-center rounded-full border border-sky-400/15 bg-slate-900/60 px-3 py-[0.34rem] text-[0.69rem] text-slate-300">
            Atualizacao operacional
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <PortfolioMetricCard
          icon={<Wallet className="h-[1.05rem] w-[1.05rem]" />}
          label="Saldo / Caixa atual"
          meta="Disponivel com base no caixa financeiro atual."
          note="Saldo operacional"
          tone="brand"
          value={formatCurrency(kpis?.cashBalance)}
        />
        <PortfolioMetricCard
          icon={<BadgeDollarSign className="h-[1.05rem] w-[1.05rem]" />}
          label="Total recebido no mes"
          meta="Parcelas baixadas no mes corrente."
          note="Entradas confirmadas"
          tone="positive"
          value={formatCurrency(kpis?.receivedThisMonth)}
        />
        <PortfolioMetricCard
          icon={<CircleDollarSign className="h-[1.05rem] w-[1.05rem]" />}
          label="A receber"
          meta={`Futuras: ${formatCurrency(kpis?.openReceivableFuture)} | Atrasadas: ${formatCurrency(kpis?.openReceivableOverdue)}`}
          note="Parcelas em aberto"
          tone="warning"
          value={formatCurrency(kpis?.openReceivableTotal)}
        />
        <PortfolioMetricCard
          icon={<TrendingUp className="h-[1.05rem] w-[1.05rem]" />}
          label="Lucro do mes"
          meta="Juros realizados no mes atual."
          note="Margem ja confirmada"
          tone="positive"
          value={formatCurrency(kpis?.profitThisMonth)}
        />
        <PortfolioMetricCard
          icon={<HandCoins className="h-[1.05rem] w-[1.05rem]" />}
          label="Retorno total"
          meta={`ROI acumulado: ${formatPercent(kpis?.roiRate)}`}
          note="Lucro acumulado da carteira"
          tone="brand"
          value={formatCurrency(kpis?.profitTotal)}
        />
        <PortfolioMetricCard
          icon={<BadgeDollarSign className="h-[1.05rem] w-[1.05rem]" />}
          label="Total emprestado"
          meta="Principal total alocado nos contratos."
          note="Capital em carteira"
          tone="brand"
          value={formatCurrency(kpis?.totalLoaned)}
        />
      </section>

      <section className="mt-6 rounded-[22px] border border-slate-700/30 bg-[linear-gradient(180deg,rgba(10,18,34,0.96),rgba(9,16,30,0.84))] p-4 shadow-[0_10px_30px_rgba(2,6,23,0.28)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[1.08rem] font-bold tracking-[-0.02em] text-slate-100">Resumo do dia</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">Leitura rapida dos vencimentos e pontos de atencao.</p>
          </div>
          <span className="rounded-full border border-slate-700/40 bg-slate-950/35 px-3 py-1 text-xs font-semibold text-slate-300">
            Base de parcelas da carteira
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <SummaryCard
            count={toNumber(dailySummary?.dueToday?.count)}
            href={buildInstallmentsHref({ due: "today" })}
            label="Vence hoje"
            totalValue={toNumber(dailySummary?.dueToday?.totalValue)}
          />
          <SummaryCard
            count={toNumber(dailySummary?.overdue?.count)}
            href={buildInstallmentsHref({ status: "overdue" })}
            label="Em atraso"
            totalValue={toNumber(dailySummary?.overdue?.totalValue)}
          />
          <SummaryCard
            count={toNumber(dailySummary?.next7Days?.count)}
            href={buildInstallmentsHref({ due: "next7" })}
            label="Prox. 7 dias"
            totalValue={toNumber(dailySummary?.next7Days?.totalValue)}
          />
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <PortfolioMonthlyChart chart={payload?.chart} />
        <PortfolioHealthPanel health={payload?.health} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <PortfolioListPanel
          emptyNote="Quando houver novas parcelas pendentes, elas aparecem aqui para acompanhamento rapido."
          emptyTitle="Nenhum vencimento pendente."
          itemHrefBuilder={(item) => buildInstallmentsHref({ search: item.id, status: "pending" })}
          items={upcomingDue}
          note="Lista operacional para monitorar as proximas parcelas."
          title="Proximos vencimentos"
        />
        <PortfolioListPanel
          emptyNote="Nao existem parcelas atrasadas na carteira para cobranca agora."
          emptyTitle="Sem pagamentos atrasados."
          itemHrefBuilder={(item) => buildInstallmentsHref({ search: item.id, status: "overdue" })}
          items={overduePayments}
          note="Fila operacional de cobranca e regularizacao."
          title="Pagamentos atrasados"
        />
      </section>
    </div>
  );
}
