"use client";

import { useMemo, useState } from "react";
import { BellRing, CalendarDays, Gauge, TrendingUp, TriangleAlert, Users } from "lucide-react";
import type { PortfolioReportInstallmentItem } from "@/src/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";

type ReportInsightMetrics = {
  totalExpected: number;
  totalReceived: number;
  totalOpen: number;
  totalOverdue: number;
};

type ReportInsightsPanelProps = {
  rows: PortfolioReportInstallmentItem[];
  previousRows: PortfolioReportInstallmentItem[];
  metrics: ReportInsightMetrics;
  previousMetrics: ReportInsightMetrics;
  todayDate: string;
};

type InsightDetail = {
  title: string;
  summary: string;
  hint: string;
  rows: Array<{ label: string; value: string }>;
  chart?: {
    currentValue: number;
    previousValue: number;
    changePct: number | null;
  };
};

type ReportInsight = {
  id: string;
  icon: "growth" | "concentration" | "risk" | "pressure" | "efficiency" | "alert";
  text: string;
  detail?: InsightDetail;
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
  return `${(value * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function formatSignedPercent(value: number) {
  const absolute = Math.abs(value * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (value === 0) return "0,00%";
  return `${value > 0 ? "+" : "-"}${absolute}%`;
}

function formatSignedCurrency(value: number) {
  const absolute = formatCurrency(Math.abs(value));
  if (value === 0) return absolute;
  return `${value > 0 ? "+" : "-"}${absolute}`;
}

function parseDateOnly(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function averageOverdueDays(rows: PortfolioReportInstallmentItem[], todayDate: string) {
  const today = parseDateOnly(todayDate);
  if (!today) return { averageDays: 0, count: 0 };

  let total = 0;
  let count = 0;
  rows.forEach((item) => {
    if (item.status !== "overdue") return;
    const dueDate = parseDateOnly(item.dueDate);
    if (!dueDate) return;
    total += Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000)));
    count += 1;
  });

  return {
    averageDays: count > 0 ? total / count : 0,
    count,
  };
}

function iconForInsight(kind: ReportInsight["icon"]) {
  if (kind === "growth") return TrendingUp;
  if (kind === "concentration") return Users;
  if (kind === "risk") return TriangleAlert;
  if (kind === "pressure") return CalendarDays;
  if (kind === "efficiency") return Gauge;
  return BellRing;
}

export function ReportInsightsPanel({
  rows,
  previousRows,
  metrics,
  previousMetrics,
  todayDate,
}: ReportInsightsPanelProps) {
  const [selectedInsight, setSelectedInsight] = useState<ReportInsight | null>(null);

  const insights = useMemo(() => {
    const entries: ReportInsight[] = [];
    const currentReceived = metrics.totalReceived;
    const previousReceived = previousMetrics.totalReceived;
    const hasGrowthBase = previousReceived >= 50 && previousRows.length >= 3;

    if (hasGrowthBase) {
      const growthPct = previousReceived !== 0 ? (currentReceived - previousReceived) / Math.abs(previousReceived) : 0;
      const growthAmount = currentReceived - previousReceived;
      entries.push({
        id: "growth",
        icon: "growth",
        text: `Crescimento: recebido variou ${formatSignedPercent(growthPct)} vs periodo anterior.`,
        detail: {
          title: "Detalhes do crescimento",
          summary: "Comparativo de recebimento do periodo atual versus o periodo anterior do filtro.",
          hint: "A leitura considera o mesmo intervalo imediatamente anterior ao recorte aplicado.",
          rows: [
            { label: "Recebido no periodo atual", value: formatCurrency(currentReceived) },
            { label: "Recebido no periodo anterior", value: formatCurrency(previousReceived) },
            { label: "Variacao percentual", value: formatSignedPercent(growthPct) },
            { label: "Variacao em valor", value: formatSignedCurrency(growthAmount) },
            { label: "Base do periodo anterior", value: `${previousRows.length} parcela(s)` },
          ],
          chart: {
            currentValue: currentReceived,
            previousValue: previousReceived,
            changePct: growthPct,
          },
        },
      });
    } else {
      entries.push({
        id: "growth",
        icon: "growth",
        text: "Crescimento: base insuficiente para comparar recebido vs periodo anterior.",
        detail: {
          title: "Detalhes do crescimento",
          summary: "Nao foi possivel comparar por falta de base robusta no periodo anterior.",
          hint: "Para uma comparacao robusta, o periodo anterior precisa ter volume minimo de dados.",
          rows: [
            { label: "Recebido no periodo atual", value: formatCurrency(currentReceived) },
            { label: "Recebido no periodo anterior", value: formatCurrency(previousReceived) },
            { label: "Parcelas no periodo anterior", value: `${previousRows.length}` },
          ],
          chart: {
            currentValue: currentReceived,
            previousValue: previousReceived,
            changePct: null,
          },
        },
      });
    }

    const openByCustomer = new Map<string, number>();
    rows.forEach((item) => {
      if (item.status === "paid" || !item.customerName) return;
      openByCustomer.set(item.customerName, (openByCustomer.get(item.customerName) || 0) + toNumber(item.amount));
    });
    if (metrics.totalOpen > 0 && openByCustomer.size > 0) {
      const [topCustomer, topOpen] = [...openByCustomer.entries()].sort((left, right) => right[1] - left[1])[0];
      entries.push({
        id: "concentration",
        icon: "concentration",
        text: `Concentracao: ${topCustomer} representa ${formatPercent(topOpen / metrics.totalOpen)} do valor em aberto.`,
      });
    } else {
      entries.push({
        id: "concentration",
        icon: "concentration",
        text: "Concentracao: sem saldo em aberto relevante no filtro atual.",
      });
    }

    const overdueByCustomer = new Map<string, number>();
    rows.forEach((item) => {
      if (item.status !== "overdue" || !item.customerName) return;
      overdueByCustomer.set(item.customerName, (overdueByCustomer.get(item.customerName) || 0) + toNumber(item.amount));
    });
    if (metrics.totalOverdue > 0 && overdueByCustomer.size > 0) {
      const ranked = [...overdueByCustomer.values()].sort((left, right) => right - left);
      const topClientsCount = Math.min(3, ranked.length);
      const topOverdue = ranked.slice(0, topClientsCount).reduce((total, value) => total + value, 0);
      entries.push({
        id: "risk",
        icon: "risk",
        text: `Risco: ${topClientsCount} cliente(s) concentram ${formatPercent(topOverdue / metrics.totalOverdue)} do saldo em atraso.`,
      });
    } else {
      entries.push({
        id: "risk",
        icon: "risk",
        text: "Risco: sem saldo em atraso relevante para concentracao no periodo.",
      });
    }

    const today = parseDateOnly(todayDate);
    const next7 = parseDateOnly(todayDate);
    if (next7) next7.setUTCDate(next7.getUTCDate() + 7);
    let dueNext7Total = 0;
    if (today && next7) {
      rows.forEach((item) => {
        if (item.status === "paid") return;
        const dueDate = parseDateOnly(item.dueDate);
        if (!dueDate || dueDate < today || dueDate > next7) return;
        dueNext7Total += toNumber(item.amount);
      });
    }
    if (metrics.totalExpected > 0) {
      entries.push({
        id: "pressure",
        icon: "pressure",
        text: `Pressao: proximos 7 dias concentram ${formatPercent(dueNext7Total / metrics.totalExpected)} dos vencimentos.`,
      });
    } else {
      entries.push({
        id: "pressure",
        icon: "pressure",
        text: "Pressao: base insuficiente para calcular vencimentos do periodo.",
      });
    }

    const paidRows = rows.filter((item) => item.status === "paid" && item.paidDate && item.dueDate);
    if (paidRows.length >= 3) {
      let onTimeCount = 0;
      paidRows.forEach((item) => {
        const paidDate = parseDateOnly(item.paidDate);
        const dueDate = parseDateOnly(item.dueDate);
        if (paidDate && dueDate && paidDate <= dueDate) onTimeCount += 1;
      });
      entries.push({
        id: "efficiency",
        icon: "efficiency",
        text: `Eficiencia: taxa de recebimento no prazo em ${formatPercent(onTimeCount / paidRows.length)}.`,
      });
    } else {
      entries.push({
        id: "efficiency",
        icon: "efficiency",
        text: "Eficiencia: base insuficiente para medir recebimento no prazo.",
      });
    }

    const currentAging = averageOverdueDays(rows, todayDate);
    const previousAging = averageOverdueDays(previousRows, todayDate);
    if (previousAging.count >= 2 && currentAging.count >= 1) {
      const deltaDays = currentAging.averageDays - previousAging.averageDays;
      const deltaText = Math.abs(deltaDays).toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });
      const verb = deltaDays > 0 ? "subiu" : deltaDays < 0 ? "caiu" : "permaneceu estavel em";
      const suffix = deltaDays === 0 ? `${deltaText} dia(s)` : `${deltaText} dia(s) vs periodo anterior`;
      entries.push({
        id: "alert",
        icon: "alert",
        text: `Alerta: atraso medio ${verb} ${suffix}.`,
      });
    } else {
      entries.push({
        id: "alert",
        icon: "alert",
        text: "Alerta: base insuficiente para comparar atraso medio com periodo anterior.",
      });
    }

    return entries;
  }, [metrics.totalExpected, metrics.totalOpen, metrics.totalOverdue, metrics.totalReceived, previousMetrics.totalReceived, previousRows, rows, todayDate]);

  const chartMax = selectedInsight?.detail?.chart
    ? Math.max(1, selectedInsight.detail.chart.currentValue, selectedInsight.detail.chart.previousValue)
    : 1;

  return (
    <>
      <article className="rounded-[22px] border border-slate-700/35 bg-[linear-gradient(180deg,rgba(10,18,34,0.96),rgba(9,16,30,0.84))] p-4 shadow-[0_10px_30px_rgba(2,6,23,0.28)]">
        <div>
          <h3 className="text-[1.02rem] font-bold tracking-[-0.02em] text-slate-100">Secao D: Diagnostico da carteira</h3>
        </div>
        <div className="mt-4 space-y-3">
          {insights.map((item) => {
            const Icon = iconForInsight(item.icon);
            return (
              <article key={item.id} className="flex items-start justify-between gap-3 rounded-[18px] border border-slate-700/45 bg-slate-950/35 px-4 py-4">
                <div className="flex min-w-0 gap-3">
                  <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-2xl border border-slate-700/45 bg-slate-900/70 text-sky-300">
                    <Icon className="size-4" />
                  </div>
                  <p className="text-sm leading-6 text-slate-200">{item.text}</p>
                </div>
                {item.detail ? (
                  <button
                    type="button"
                    onClick={() => setSelectedInsight(item)}
                    className="shrink-0 rounded-xl border border-slate-700/55 bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-sky-400/35 hover:bg-slate-900"
                  >
                    Detalhes
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
      </article>

      <Dialog open={selectedInsight !== null} onOpenChange={(open) => { if (!open) setSelectedInsight(null); }}>
        <DialogContent className="max-w-3xl border-slate-700 bg-slate-950/95">
          <DialogHeader className="border-b border-slate-800 px-6 py-5">
            <DialogTitle>{selectedInsight?.detail?.title || "Detalhes do insight"}</DialogTitle>
            <DialogDescription>{selectedInsight?.detail?.summary || "Resumo do insight selecionado."}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 px-6 pb-6 pt-1">
            {selectedInsight?.detail?.hint ? (
              <div className="rounded-2xl border border-slate-700/45 bg-slate-900/55 px-4 py-3 text-sm text-slate-300">
                {selectedInsight.detail.hint}
              </div>
            ) : null}

            {selectedInsight?.detail?.chart ? (
              <div className="rounded-2xl border border-slate-700/45 bg-slate-900/55 p-4">
                <div className="mb-3 flex flex-wrap gap-2">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${selectedInsight.detail.chart.changePct !== null && selectedInsight.detail.chart.changePct > 0 ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100" : "border-slate-600 bg-slate-800/70 text-slate-200"}`}>
                    {selectedInsight.detail.chart.changePct !== null
                      ? `${selectedInsight.detail.chart.changePct > 0 ? "Alta" : selectedInsight.detail.chart.changePct < 0 ? "Queda" : "Estavel"} ${formatSignedPercent(selectedInsight.detail.chart.changePct)}`
                      : "Variacao sem base robusta"}
                  </span>
                  <span className="inline-flex rounded-full border border-slate-700/45 bg-slate-800/70 px-3 py-1 text-xs font-semibold text-slate-300">
                    Atual x Anterior
                  </span>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                      <span>Anterior</span>
                      <span>{formatCurrency(selectedInsight.detail.chart.previousValue)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-950/90">
                      <div className="h-2 rounded-full bg-slate-500" style={{ width: `${(selectedInsight.detail.chart.previousValue / chartMax) * 100}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                      <span>Atual</span>
                      <span>{formatCurrency(selectedInsight.detail.chart.currentValue)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-950/90">
                      <div className="h-2 rounded-full bg-[linear-gradient(90deg,rgba(99,102,241,0.9),rgba(6,182,212,0.92))]" style={{ width: `${(selectedInsight.detail.chart.currentValue / chartMax) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              {selectedInsight?.detail?.rows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/45 bg-slate-900/55 px-4 py-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">{row.label}</span>
                  <strong className="text-sm text-slate-100">{row.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
