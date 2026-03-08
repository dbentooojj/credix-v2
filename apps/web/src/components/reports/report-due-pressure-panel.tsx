"use client";

import { useMemo, useState } from "react";
import type { PortfolioReportInstallmentItem } from "@/src/lib/api";

type ReportDuePressurePanelProps = {
  rows: PortfolioReportInstallmentItem[];
  totalExpected: number;
  todayDate: string;
};

type DueWindow = 7 | 15 | 30;

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

function addDays(value: string, diff: number) {
  const base = parseDateOnly(value);
  if (!base) return null;
  base.setUTCDate(base.getUTCDate() + diff);
  return base;
}

export function ReportDuePressurePanel({ rows, totalExpected, todayDate }: ReportDuePressurePanelProps) {
  const [windowDays, setWindowDays] = useState<DueWindow>(7);

  const summary = useMemo(() => {
    const today = parseDateOnly(todayDate);
    const horizon = addDays(todayDate, windowDays);
    if (!today || !horizon) {
      return {
        totalDueRange: 0,
        pctOfPeriod: 0,
        clientsInvolved: 0,
        dayRows: [] as Array<{
          dueDate: string;
          dateLabel: string;
          installmentsCount: number;
          clientsCount: number;
          totalAmount: number;
          overdueCount: number;
          pendingCount: number;
          dayConcentration: number;
        }>,
      };
    }

    const grouped = new Map<string, {
      dueDate: string;
      installmentsCount: number;
      uniqueClients: Set<string>;
      totalAmount: number;
      overdueCount: number;
      pendingCount: number;
    }>();

    rows
      .filter((item) => item.status !== "paid")
      .forEach((item) => {
        const dueDate = parseDateOnly(item.dueDate);
        if (!dueDate || dueDate < today || dueDate > horizon) return;

        const key = item.dueDate || "";
        const current = grouped.get(key) || {
          dueDate: key,
          installmentsCount: 0,
          uniqueClients: new Set<string>(),
          totalAmount: 0,
          overdueCount: 0,
          pendingCount: 0,
        };

        current.installmentsCount += 1;
        current.totalAmount += toNumber(item.amount);
        if (item.customerName) current.uniqueClients.add(item.customerName);
        if (item.status === "overdue") current.overdueCount += 1;
        if (item.status === "pending" || item.status === "due-today") current.pendingCount += 1;

        grouped.set(key, current);
      });

    const dayRows = [...grouped.values()]
      .filter((item) => item.totalAmount > 0)
      .sort((left, right) => left.dueDate.localeCompare(right.dueDate))
      .slice(0, 10);
    const totalDueRange = dayRows.reduce((total, item) => total + item.totalAmount, 0);
    const clientsInvolved = new Set(dayRows.flatMap((item) => [...item.uniqueClients])).size;
    const periodBase = totalExpected > 0 ? totalExpected : Math.max(totalDueRange, 0);
    const pctOfPeriod = periodBase > 0 ? (totalDueRange / periodBase) * 100 : 0;

    return {
      totalDueRange,
      pctOfPeriod,
      clientsInvolved,
      dayRows: dayRows.map((item) => {
        const labelDate = parseDateOnly(item.dueDate);
        const dateLabel = labelDate
          ? new Intl.DateTimeFormat("pt-BR", {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
            timeZone: "UTC",
          }).format(labelDate)
          : item.dueDate;

        return {
          dueDate: item.dueDate,
          dateLabel,
          installmentsCount: item.installmentsCount,
          clientsCount: item.uniqueClients.size,
          totalAmount: item.totalAmount,
          overdueCount: item.overdueCount,
          pendingCount: item.pendingCount,
          dayConcentration: periodBase > 0 ? (item.totalAmount / periodBase) * 100 : 0,
        };
      }),
    };
  }, [rows, todayDate, totalExpected, windowDays]);

  return (
    <article className="rounded-[22px] border border-slate-700/35 bg-[linear-gradient(180deg,rgba(10,18,34,0.96),rgba(9,16,30,0.84))] p-4 shadow-[0_10px_30px_rgba(2,6,23,0.28)]">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-[1.02rem] font-bold tracking-[-0.02em] text-slate-100">Pressao de vencimentos</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">Leitura agregada por dia para decisao rapida.</p>
          </div>
          <div className="inline-flex rounded-2xl border border-slate-700/55 bg-slate-950/35 p-1 text-xs font-semibold">
            {[7, 15, 30].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setWindowDays(value as DueWindow)}
                className={`rounded-xl px-3 py-1.5 transition ${windowDays === value ? "bg-slate-100 text-slate-950" : "text-slate-300 hover:bg-slate-900/60"}`}
              >
                Prox. {value} dias
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-[16px] border border-slate-700/45 bg-slate-950/35 px-4 py-4">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Total a vencer ({windowDays}d)</p>
            <p className="font-number mt-2 text-[1.25rem] text-slate-100">{formatCurrency(summary.totalDueRange)}</p>
          </article>
          <article className="rounded-[16px] border border-slate-700/45 bg-slate-950/35 px-4 py-4">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">% do previsto no periodo</p>
            <p className="font-number mt-2 text-[1.25rem] text-slate-100">{formatPercent(summary.pctOfPeriod)}</p>
          </article>
          <article className="rounded-[16px] border border-slate-700/45 bg-slate-950/35 px-4 py-4">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Clientes envolvidos</p>
            <p className="font-number mt-2 text-[1.25rem] text-slate-100">{summary.clientsInvolved.toLocaleString("pt-BR")}</p>
          </article>
        </div>

        {summary.dayRows.length > 0 ? (
          <div className="space-y-3">
            {summary.dayRows.map((item) => (
              <article key={item.dueDate} className="rounded-[18px] border border-slate-700/45 bg-slate-950/35 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{item.dateLabel}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.installmentsCount} parcela(s) • {item.clientsCount} cliente(s)</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${item.overdueCount > 0 ? "border-rose-400/25 bg-rose-500/10 text-rose-100" : "border-amber-400/25 bg-amber-500/10 text-amber-100"}`}>
                    {item.overdueCount > 0 ? `${item.overdueCount} em atraso` : `${item.pendingCount} pendente(s)`}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-sm text-slate-400">
                  <p>Valor concentrado no dia</p>
                  <p className="font-number text-slate-100">{formatCurrency(item.totalAmount)}</p>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                  <p>Concentracao do dia no periodo</p>
                  <p className="font-semibold text-slate-300">{formatPercent(item.dayConcentration)}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[18px] border border-dashed border-slate-700/55 bg-slate-950/20 px-4 py-6 text-center text-sm text-slate-400">
            Sem pressao de vencimentos nos proximos {windowDays} dias.
          </div>
        )}
      </div>
    </article>
  );
}
