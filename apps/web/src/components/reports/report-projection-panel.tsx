"use client";

import { useMemo } from "react";
import type { PortfolioReportInstallmentItem } from "@/src/lib/api";

type ReportProjectionPanelProps = {
  rows: PortfolioReportInstallmentItem[];
  metrics: {
    totalExpected: number;
    totalReceived: number;
    totalOverdue: number;
    totalCount: number;
    paidCount: number;
  };
  todayDate: string;
};

function toNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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

function parseDateOnly(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function addDays(value: string, diff: number) {
  const base = parseDateOnly(value);
  if (!base) return null;
  base.setUTCDate(base.getUTCDate() + diff);
  return base;
}

export function ReportProjectionPanel({ rows, metrics, todayDate }: ReportProjectionPanelProps) {
  const projection = useMemo(() => {
    const today = parseDateOnly(todayDate);
    const horizon = addDays(todayDate, 30);
    if (!today || !horizon) {
      return {
        totalDue30: 0,
        adjustedRate: 0,
        projectedReceipt30: 0,
        projectedProfit30: 0,
        projectedInterest30: 0,
        expectedLoss30: 0,
        stressImpactCash30: 0,
        top1ClientName: "Top 1",
        top1Due30: 0,
        top1Share30: 0,
        weekly: [] as Array<{ label: string; totalDue: number; projectedReceipt: number }>,
        hasUpcomingDue: false,
      };
    }

    const projectionItems = rows
      .filter((item) => item.status !== "paid")
      .map((item) => {
        const dueDate = parseDateOnly(item.dueDate);
        if (!dueDate || dueDate < today || dueDate > horizon) return null;

        const amount = Math.max(toNumber(item.amount), 0);
        const principal = Math.max(Math.min(toNumber(item.principalAmount), amount), 0);
        const expectedInterest = Math.max(amount - principal, 0);

        return {
          customerName: String(item.customerName || "").trim(),
          dueDate,
          outstanding: amount,
          expectedInterest,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const totalDue30 = projectionItems.reduce((total, item) => total + item.outstanding, 0);
    const projectedInterest30 = projectionItems.reduce((total, item) => total + item.expectedInterest, 0);
    const historicalRate = metrics.totalExpected > 0
      ? clamp(metrics.totalReceived / metrics.totalExpected, 0, 1.15)
      : metrics.totalCount > 0
        ? clamp(metrics.paidCount / metrics.totalCount, 0.35, 0.9)
        : 0.7;
    const delinquencyRate = metrics.totalExpected > 0 ? metrics.totalOverdue / metrics.totalExpected : 0;
    const riskAdjustment = clamp(1 - (delinquencyRate * 0.55), 0.55, 1);
    const adjustedRate = clamp(historicalRate * riskAdjustment, 0.25, 0.98);
    const expectedLossRate = Math.min(1, Math.max(0.35, delinquencyRate * 2));
    const projectedReceipt30 = totalDue30 * adjustedRate;
    const expectedLoss30 = totalDue30 * expectedLossRate;
    const projectedProfit30 = projectedInterest30 - expectedLoss30;

    const openByClient = new Map<string, number>();
    projectionItems.forEach((item) => {
      if (!item.customerName) return;
      openByClient.set(item.customerName, (openByClient.get(item.customerName) || 0) + item.outstanding);
    });
    const [top1ClientName, top1Due30] = openByClient.size > 0
      ? [...openByClient.entries()].sort((left, right) => right[1] - left[1])[0]
      : ["Top 1", 0];
    const top1Share30 = totalDue30 > 0 ? top1Due30 / totalDue30 : 0;
    const stressImpactCash30 = top1Due30 * adjustedRate;

    const weekly = Array.from({ length: 5 }, (_, index) => ({
      label: index === 4 ? "Sem 5 (D+28-30)" : `Sem ${index + 1} (D+${index * 7}-${(index * 7) + 6})`,
      totalDue: 0,
      projectedReceipt: 0,
    }));
    projectionItems.forEach((item) => {
      const daysAhead = Math.max(0, Math.floor((item.dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)));
      const weekIndex = Math.min(4, Math.floor(daysAhead / 7));
      weekly[weekIndex].totalDue += item.outstanding;
    });
    weekly.forEach((item) => {
      item.projectedReceipt = item.totalDue * adjustedRate;
    });

    return {
      totalDue30,
      adjustedRate,
      projectedReceipt30,
      projectedProfit30,
      projectedInterest30,
      expectedLoss30,
      stressImpactCash30,
      top1ClientName,
      top1Due30,
      top1Share30,
      weekly,
      hasUpcomingDue: projectionItems.length > 0,
    };
  }, [metrics.paidCount, metrics.totalCount, metrics.totalExpected, metrics.totalOverdue, metrics.totalReceived, rows, todayDate]);

  const maxWeekProjected = Math.max(1, ...projection.weekly.map((item) => item.projectedReceipt));

  return (
    <article className="rounded-[22px] border border-slate-700/35 bg-[linear-gradient(180deg,rgba(10,18,34,0.96),rgba(9,16,30,0.84))] p-4 shadow-[0_10px_30px_rgba(2,6,23,0.28)]">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-[1.02rem] font-bold tracking-[-0.02em] text-slate-100">Projecoes (30 dias)</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">Estimativas orientativas de caixa e risco para os proximos 30 dias.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <article className="rounded-[18px] border border-slate-700/45 bg-slate-950/35 p-4">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Projecao de recebimento 30d</p>
            <p className="font-number mt-2 text-[1.55rem] text-slate-100">{formatCurrency(projection.projectedReceipt30)}</p>
            <p className="mt-2 text-xs text-slate-500">A vencer: {formatCurrency(projection.totalDue30)} • taxa ajustada: {formatPercent(projection.adjustedRate)}</p>
          </article>
          <article className="rounded-[18px] border border-slate-700/45 bg-slate-950/35 p-4">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Projecao de lucro 30d</p>
            <p className={`font-number mt-2 text-[1.55rem] ${projection.projectedProfit30 >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
              {formatCurrency(projection.projectedProfit30)}
            </p>
            <p className="mt-2 text-xs text-slate-500">Juros previstos: {formatCurrency(projection.projectedInterest30)} • perdas esperadas: {formatCurrency(projection.expectedLoss30)}</p>
          </article>
          <article className="rounded-[18px] border border-slate-700/45 bg-slate-950/35 p-4">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Cenario de estresse (Top1 +30d)</p>
            <p className="font-number mt-2 text-[1.55rem] text-rose-200">-{formatCurrency(Math.abs(projection.stressImpactCash30))}</p>
            <p className="mt-2 text-xs text-slate-500">{projection.top1ClientName}: {formatCurrency(projection.top1Due30)} • {formatPercent(projection.top1Share30)} do horizonte</p>
          </article>
        </div>

        {projection.hasUpcomingDue ? (
          <div className="rounded-[18px] border border-slate-700/45 bg-slate-950/35 p-4">
            <p className="text-sm font-semibold text-slate-100">Leitura semanal</p>
            <div className="mt-4 space-y-3">
              {projection.weekly.map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{item.label}</p>
                      <p className="text-xs text-slate-500">Vencimento: {formatCurrency(item.totalDue)}</p>
                    </div>
                    <p className="font-number text-sm text-slate-100">{formatCurrency(item.projectedReceipt)}</p>
                  </div>
                  <div className="h-2 rounded-full bg-slate-900/90">
                    <div className="h-2 rounded-full bg-[linear-gradient(90deg,rgba(6,182,212,0.92),rgba(16,185,129,0.9))]" style={{ width: `${(item.projectedReceipt / maxWeekProjected) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-[18px] border border-dashed border-slate-700/55 bg-slate-950/20 px-4 py-6 text-center text-sm text-slate-400">
            Sem vencimentos futuros para projetar nos proximos 30 dias.
          </div>
        )}
      </div>
    </article>
  );
}
