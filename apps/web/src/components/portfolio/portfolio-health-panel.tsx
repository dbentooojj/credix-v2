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

function formatPercent(value: unknown) {
  return `${toNumber(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function scoreClasses(score: number) {
  if (score >= 80) {
    return {
      ring: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
      badge: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100",
    };
  }

  if (score >= 60) {
    return {
      ring: "border-amber-400/30 bg-amber-500/10 text-amber-100",
      badge: "border-amber-400/25 bg-amber-500/10 text-amber-100",
    };
  }

  return {
    ring: "border-rose-400/30 bg-rose-500/10 text-rose-100",
    badge: "border-rose-400/25 bg-rose-500/10 text-rose-100",
  };
}

function HealthMiniCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-[16px] border border-slate-700/40 bg-slate-950/25 px-4 py-4">
      <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="font-number mt-3 text-[1.35rem] tracking-[-0.03em] text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{note}</p>
    </div>
  );
}

export function PortfolioHealthPanel({ health }: { health?: PortfolioOverview["health"] }) {
  const score = toNumber(health?.score);
  const scoreTone = scoreClasses(score);

  return (
    <article className="relative overflow-hidden rounded-[22px] border border-slate-700/30 bg-[linear-gradient(180deg,rgba(10,18,34,0.96),rgba(9,16,30,0.84))] p-4 shadow-[0_10px_30px_rgba(2,6,23,0.28)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_30%)] opacity-70" />
      <div className="relative z-10">
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-[1.08rem] font-bold tracking-[-0.02em] text-slate-100">Saude da carteira</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">Leitura rapida de risco, qualidade da carteira e potencial ainda a realizar.</p>
          </div>

          <div className="flex flex-col gap-4 rounded-[20px] border border-slate-700/40 bg-slate-950/25 p-4">
            <div className="flex items-center gap-4">
              <div className={`flex size-24 shrink-0 items-center justify-center rounded-full border-[8px] ${scoreTone.ring}`}>
                <div className="text-center">
                  <p className="font-number text-[1.45rem] tracking-[-0.04em]">{Math.round(score)}</p>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em]">{health?.scoreLabel || "Base"}</p>
                </div>
              </div>
              <div className="min-w-0">
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${scoreTone.badge}`}>
                  Score da carteira
                </span>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Baseado em inadimplencia, contratos em risco e ritmo de recebimento do mes.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-slate-700/40 bg-slate-900/60 px-3 py-1 text-xs font-semibold text-slate-300">
                    Adimplentes: {toNumber(health?.healthyContracts)}
                  </span>
                  <span className="rounded-full border border-amber-400/20 bg-amber-950/20 px-3 py-1 text-xs font-semibold text-amber-100">
                    Em risco: {toNumber(health?.contractsAtRisk)}
                  </span>
                  <span className="rounded-full border border-rose-400/20 bg-rose-950/20 px-3 py-1 text-xs font-semibold text-rose-100">
                    Clientes em atraso: {toNumber(health?.overdueCustomers)}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                <span>Recebimento do mes</span>
                <span>{formatPercent(health?.collectionRateThisMonth)}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-900/80">
                <div
                  className="h-2 rounded-full bg-[linear-gradient(90deg,rgba(16,185,129,0.95),rgba(56,189,248,0.92))]"
                  style={{ width: `${Math.min(Math.max(toNumber(health?.collectionRateThisMonth), 0), 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <HealthMiniCard
              label="Ticket medio"
              note="Principal medio por contrato."
              value={formatCurrency(health?.averageTicket)}
            />
            <HealthMiniCard
              label="Parcela media"
              note="Valor medio ainda aberto."
              value={formatCurrency(health?.averageInstallment)}
            />
            <HealthMiniCard
              label="Juros a realizar"
              note="Potencial ainda pendente na carteira."
              value={formatCurrency(health?.openInterestPotential)}
            />
            <HealthMiniCard
              label="Exposicao em atraso"
              note="Volume vencido e ainda nao regularizado."
              value={formatCurrency(health?.overdueExposure)}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
