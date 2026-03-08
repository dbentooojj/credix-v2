"use client";

import Link from "next/link";
import type { PortfolioReportInstallmentItem } from "@/src/lib/api";

type ReportRiskMapPanelProps = {
  rows: PortfolioReportInstallmentItem[];
  metrics: {
    totalLoaned: number;
    totalExpected: number;
    totalOpen: number;
    totalOverdue: number;
    expectedRiskLoss: number;
    paidCount: number;
    pendingCount: number;
    overdueCount: number;
    uniqueLoanCount: number;
  };
  todayDate: string;
};

type RiskClientRow = {
  customerName: string;
  openAmount: number;
  overdueAmount: number;
  avgOverdueDays: number;
  score: number;
};

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

function formatPercent(value: number) {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function parseDateOnly(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function diffDays(todayDate: string, dueDate?: string | null) {
  const today = parseDateOnly(todayDate);
  const due = parseDateOnly(dueDate);
  if (!today || !due) return 0;

  return Math.max(0, Math.floor((today.getTime() - due.getTime()) / (24 * 60 * 60 * 1000)));
}

function buildRiskClientRows(rows: PortfolioReportInstallmentItem[], todayDate: string) {
  const grouped = new Map<string, RiskClientRow & { overdueCount: number }>();

  rows.forEach((item) => {
    const customerName = String(item.customerName || "").trim();
    if (!customerName) return;

    const current = grouped.get(customerName) || {
      customerName,
      openAmount: 0,
      overdueAmount: 0,
      avgOverdueDays: 0,
      overdueCount: 0,
      score: 0,
    };

    const amount = toNumber(item.amount);
    if (item.status !== "paid") current.openAmount += amount;
    if (item.status === "overdue") {
      current.overdueAmount += amount;
      current.avgOverdueDays += diffDays(todayDate, item.dueDate);
      current.overdueCount += 1;
    }

    grouped.set(customerName, current);
  });

  return [...grouped.values()]
    .map((item) => {
      const averageDays = item.overdueCount > 0 ? item.avgOverdueDays / item.overdueCount : 0;
      const score = (item.overdueAmount * 2) + item.openAmount + (averageDays * 0.5);

      return {
        customerName: item.customerName,
        openAmount: item.openAmount,
        overdueAmount: item.overdueAmount,
        avgOverdueDays: averageDays,
        score,
      };
    })
    .filter((item) => item.overdueAmount > 0 || item.openAmount > 0 || item.avgOverdueDays > 0)
    .sort((left, right) => right.score - left.score || right.overdueAmount - left.overdueAmount);
}

function progressTone(status: "paid" | "pending" | "overdue") {
  if (status === "paid") return "bg-emerald-400";
  if (status === "pending") return "bg-amber-400";
  return "bg-rose-400";
}

export function ReportRiskMapPanel({ rows, metrics, todayDate }: ReportRiskMapPanelProps) {
  const totalRows = rows.length;
  const overduePercent = totalRows > 0 ? (metrics.overdueCount / totalRows) * 100 : 0;
  const paidPercent = totalRows > 0 ? (metrics.paidCount / totalRows) * 100 : 0;
  const pendingPercent = totalRows > 0 ? (metrics.pendingCount / totalRows) * 100 : 0;
  const openCount = metrics.pendingCount + metrics.overdueCount;
  const distributionRows = [
    { label: "Pago", status: "paid" as const, count: metrics.paidCount, percentage: paidPercent },
    { label: "Pendente", status: "pending" as const, count: metrics.pendingCount, percentage: pendingPercent },
    { label: "Atrasado", status: "overdue" as const, count: metrics.overdueCount, percentage: overduePercent },
  ];
  const gradient = `conic-gradient(rgba(16,185,129,0.78) 0% ${paidPercent}%, rgba(245,158,11,0.78) ${paidPercent}% ${paidPercent + pendingPercent}%, rgba(244,63,94,0.76) ${paidPercent + pendingPercent}% 100%)`;
  const riskRows = buildRiskClientRows(rows, todayDate);
  const criticalRows = riskRows.slice(0, 5);
  const concentrationBase = Math.max(metrics.totalExpected, riskRows.reduce((total, item) => total + item.openAmount, 0), 1);
  const top1Amount = riskRows[0]?.openAmount || 0;
  const top3Amount = riskRows.slice(0, 3).reduce((total, item) => total + item.openAmount, 0);
  const top1Pct = top1Amount / concentrationBase;
  const top3Pct = top3Amount / concentrationBase;
  const isHighConcentration = top1Pct > 0.35;

  return (
    <article className="rounded-[22px] border border-slate-700/35 bg-[linear-gradient(180deg,rgba(10,18,34,0.96),rgba(9,16,30,0.84))] p-4 shadow-[0_10px_30px_rgba(2,6,23,0.28)]">
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="text-[1.02rem] font-bold tracking-[-0.02em] text-slate-100">Secao C: Mapa de risco</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">Concentracao de atraso, exposicao e inadimplencia ativa.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <article className="rounded-[18px] border border-amber-400/20 bg-amber-500/10 px-4 py-4">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-amber-100/80">Pressao em aberto</p>
            <p className="font-number mt-2 text-[1.55rem] text-amber-50">{formatCurrency(metrics.totalOpen)}</p>
            <p className="mt-2 text-sm text-amber-100/80">{openCount.toLocaleString("pt-BR")} parcela(s) em aberto</p>
          </article>
          <article className="rounded-[18px] border border-rose-400/20 bg-rose-500/10 px-4 py-4">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-rose-100/80">Exposicao atrasada</p>
            <p className="font-number mt-2 text-[1.55rem] text-rose-50">{formatCurrency(metrics.totalOverdue)}</p>
            <p className="mt-2 text-sm text-rose-100/80">Saldo total em atraso</p>
          </article>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <section className="rounded-[18px] border border-slate-700/45 bg-slate-950/35 p-4">
            <p className="text-sm font-semibold text-slate-100">Distribuicao de status</p>
            {totalRows > 0 ? (
              <div className="mt-4 grid gap-4 md:grid-cols-[160px_minmax(0,1fr)]">
                <div className="relative mx-auto size-40 rounded-full" style={{ background: gradient }}>
                  <div className="absolute inset-[14px] flex flex-col items-center justify-center rounded-full bg-slate-950 text-center">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Atraso</p>
                    <p className="font-number mt-1 text-[1.4rem] text-slate-100">{formatPercent(overduePercent)}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {distributionRows.map((item) => (
                    <div key={item.label}>
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <span className="rounded-full border border-slate-700/45 bg-slate-900/70 px-3 py-1 text-xs font-semibold text-slate-200">
                          {item.label}
                        </span>
                        <span className="text-sm text-slate-400">
                          {item.count.toLocaleString("pt-BR")} ({formatPercent(item.percentage)})
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-900/90">
                        <div className={`h-2 rounded-full ${progressTone(item.status)}`} style={{ width: `${item.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-[16px] border border-dashed border-slate-700/55 bg-slate-950/20 px-4 py-8 text-center text-sm text-slate-400">
                Sem parcelas no filtro atual para distribuicao.
              </div>
            )}
          </section>

          <section className="rounded-[18px] border border-slate-700/45 bg-slate-950/35 p-4">
            <p className="text-sm font-semibold text-slate-100">Concentracao</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <article className="rounded-[16px] border border-slate-700/40 bg-slate-900/60 px-4 py-4">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Top 1 cliente</p>
                <p className="font-number mt-2 text-[1.35rem] text-slate-100">{formatPercent(top1Pct * 100)}</p>
                <p className="mt-2 text-sm text-slate-400">{formatCurrency(top1Amount)} do total</p>
              </article>
              <article className="rounded-[16px] border border-slate-700/40 bg-slate-900/60 px-4 py-4">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Top 3 clientes</p>
                <p className="font-number mt-2 text-[1.35rem] text-slate-100">{formatPercent(top3Pct * 100)}</p>
                <p className="mt-2 text-sm text-slate-400">{formatCurrency(top3Amount)} do total</p>
              </article>
            </div>
            <div className="mt-4">
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${isHighConcentration ? "border-rose-400/25 bg-rose-500/10 text-rose-100" : "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"}`}>
                {isHighConcentration ? "Concentracao alta" : "Concentracao controlada"}
              </span>
            </div>
          </section>
        </div>

        <section className="rounded-[18px] border border-slate-700/45 bg-slate-950/35 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-100">Clientes criticos</p>
            <span className="text-xs font-semibold text-slate-500">Top 5</span>
          </div>
          <div className="mt-4 space-y-3">
            {criticalRows.length > 0 ? criticalRows.map((item, index) => (
              <article key={item.customerName} className="flex items-center justify-between gap-3 rounded-[16px] border border-slate-700/40 bg-slate-900/60 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-100">{index + 1}. {item.customerName}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Atraso {formatCurrency(item.overdueAmount)} | {item.avgOverdueDays.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} dias | Score {item.score.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                  </p>
                </div>
                <Link href="/app/clientes" className="inline-flex min-h-[2rem] items-center rounded-[10px] border border-slate-700/60 bg-slate-950/40 px-3 text-xs font-medium text-slate-200 transition hover:border-sky-400/35 hover:bg-slate-900/80">
                  Ver cliente
                </Link>
              </article>
            )) : (
              <div className="rounded-[16px] border border-dashed border-slate-700/55 bg-slate-950/20 px-4 py-5 text-sm text-slate-400">
                Sem clientes criticos no filtro atual.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[18px] border border-slate-700/45 bg-slate-950/35 p-4">
          <p className="text-sm font-semibold text-slate-100">Acoes rapidas</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Link href="/app/parcelas?status=overdue" className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-700/60 bg-slate-900/70 px-4 text-sm font-semibold text-slate-200 transition hover:border-sky-400/35 hover:bg-slate-900">
              Ver parcelas em atraso
            </Link>
            <Link href="/app/parcelas?status=overdue" className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 text-sm font-semibold text-amber-50 transition hover:border-amber-300/35 hover:bg-amber-500/15">
              Cobrar agora
            </Link>
            <button type="button" disabled className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-700/45 bg-slate-900/40 px-4 text-sm font-semibold text-slate-500">
              Exportar lista de risco
            </button>
          </div>
        </section>

        <details className="rounded-[18px] border border-slate-700/45 bg-slate-950/35 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-100">Detalhes do periodo</summary>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <article className="rounded-[16px] border border-slate-700/40 bg-slate-900/60 px-4 py-4">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Principal emprestado</p>
              <p className="font-number mt-2 text-[1.2rem] text-slate-100">{formatCurrency(metrics.totalLoaned)}</p>
            </article>
            <article className="rounded-[16px] border border-slate-700/40 bg-slate-900/60 px-4 py-4">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Total previsto</p>
              <p className="font-number mt-2 text-[1.2rem] text-slate-100">{formatCurrency(metrics.totalExpected)}</p>
            </article>
            <article className="rounded-[16px] border border-slate-700/40 bg-slate-900/60 px-4 py-4">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Total em aberto</p>
              <p className="font-number mt-2 text-[1.2rem] text-slate-100">{formatCurrency(metrics.totalOpen)}</p>
            </article>
            <article className="rounded-[16px] border border-slate-700/40 bg-slate-900/60 px-4 py-4">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Total em atraso</p>
              <p className="font-number mt-2 text-[1.2rem] text-rose-100">{formatCurrency(metrics.totalOverdue)}</p>
            </article>
            <article className="rounded-[16px] border border-slate-700/40 bg-slate-900/60 px-4 py-4">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Perda esperada por risco</p>
              <p className="font-number mt-2 text-[1.2rem] text-rose-100">{formatCurrency(metrics.expectedRiskLoss)}</p>
            </article>
            <article className="rounded-[16px] border border-slate-700/40 bg-slate-900/60 px-4 py-4">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Emprestimos no filtro</p>
              <p className="font-number mt-2 text-[1.2rem] text-slate-100">{metrics.uniqueLoanCount.toLocaleString("pt-BR")}</p>
            </article>
          </div>
        </details>
      </div>
    </article>
  );
}
