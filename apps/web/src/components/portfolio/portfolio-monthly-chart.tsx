import type { PortfolioOverview } from "@/src/lib/api";

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

function formatPeriodLabel(period?: string) {
  return (
    {
      "3m": "Ultimos 3 meses",
      "6m": "Ultimos 6 meses",
      "12m": "Ultimos 12 meses",
    }[period || ""] || "Periodo padrao"
  );
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

export function PortfolioMonthlyChart({ chart }: { chart?: PortfolioOverview["chart"] }) {
  const points = chart?.points || [];
  const maxValue = Math.max(
    1,
    ...points.flatMap((point) => [toNumber(point.received), toNumber(point.open), toNumber(point.overdue)]),
  );
  const currentPoint = points[points.length - 1];
  const previousPoint = points[points.length - 2];
  const flowInsight = buildInsight(currentPoint?.received, previousPoint?.received);

  return (
    <article className="relative overflow-hidden rounded-[22px] border border-slate-700/30 bg-[linear-gradient(180deg,rgba(10,18,34,0.96),rgba(9,16,30,0.84))] p-4 shadow-[0_10px_30px_rgba(2,6,23,0.28)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_30%)] opacity-70" />
      <div className="relative z-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-[1.08rem] font-bold tracking-[-0.02em] text-slate-100">Visao mensal da carteira</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">Recebido no mes versus carteira em aberto e atraso.</p>
          </div>
          <span className="font-menu rounded-full border border-sky-400/15 bg-slate-900/60 px-3 py-1 text-xs text-slate-300">
            {formatPeriodLabel(chart?.period)}
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-[16px] border border-slate-700/40 bg-slate-950/25 px-4 py-4">
            <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-slate-400">Mes atual</p>
            <p className="font-number mt-3 text-[1.5rem] tracking-[-0.03em] text-white">{formatCurrency(currentPoint?.received)}</p>
            <p className={`mt-2 text-sm leading-6 ${flowInsight.tone === "positive" ? "text-emerald-300" : flowInsight.tone === "negative" ? "text-rose-300" : "text-slate-400"}`}>
              {flowInsight.text}
            </p>
          </div>
          <div className="rounded-[16px] border border-slate-700/40 bg-slate-950/25 px-4 py-4">
            <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-slate-400">Comparativo</p>
            <p className="font-number mt-3 text-[1.5rem] tracking-[-0.03em] text-white">{formatCurrency(previousPoint?.received)}</p>
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

        {chart?.hasData ? (
          <div className="mt-5">
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
        ) : (
          <div className="mt-5 flex min-h-[220px] flex-col items-center justify-center rounded-[18px] border border-slate-700/40 bg-slate-950/30 px-6 py-8 text-center">
            <p className="text-xl font-semibold tracking-[-0.03em] text-slate-100">Sem dados no periodo.</p>
            <p className="mt-3 max-w-md text-sm leading-7 text-slate-400">
              {chart?.emptyMessage || "Os dados da carteira vao aparecer aqui conforme a base for alimentada."}
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
