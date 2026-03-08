"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Ban, Check, MessageCircleMore, PencilLine, Search } from "lucide-react";
import type { PortfolioLoanSimulationItem, PortfolioLoanSimulationsResponse } from "@/src/lib/api";
import { Input } from "@/src/components/ui/input";

type LoanSimulationsPanelProps = {
  payload: PortfolioLoanSimulationsResponse | null;
  error: string | null;
};

type StatusFilterKey = "DRAFT,SENT,EXPIRED" | "DRAFT" | "SENT" | "EXPIRED" | "CANCELED" | "ACCEPTED" | "ALL";

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

function formatDateOnly(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatInterestLabel(item: PortfolioLoanSimulationItem) {
  if (item.interestType === "fixo") {
    return formatCurrency(item.fixedFeeAmount);
  }

  return `${toNumber(item.interestRate).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
}

function formatInterestTypeLabel(item: PortfolioLoanSimulationItem) {
  if (item.interestType === "fixo") return "Fixo";
  if (item.interestType === "simples") return "Simples";
  return "Composto";
}

function statusClasses(status?: PortfolioLoanSimulationItem["status"]) {
  if (status === "ACCEPTED") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";
  if (status === "CANCELED") return "border-rose-400/30 bg-rose-500/10 text-rose-200";
  if (status === "EXPIRED") return "border-amber-400/30 bg-amber-500/10 text-amber-100";
  if (status === "SENT") return "border-sky-400/30 bg-sky-500/10 text-sky-100";
  return "border-slate-500/30 bg-slate-500/10 text-slate-200";
}

function rowMatchesStatus(item: PortfolioLoanSimulationItem, statusFilter: StatusFilterKey) {
  if (statusFilter === "ALL") return true;
  if (statusFilter === "DRAFT,SENT,EXPIRED") {
    return item.status === "DRAFT" || item.status === "SENT" || item.status === "EXPIRED";
  }

  return item.status === statusFilter;
}

function ActionButtons({ item }: { item: PortfolioLoanSimulationItem }) {
  const canEdit = item.status !== "ACCEPTED";
  const canOperate = item.status !== "ACCEPTED" && item.status !== "CANCELED";

  return (
    <div className="flex items-center gap-1">
      {canEdit ? (
        <button type="button" disabled className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-700/50 bg-slate-900/50 text-slate-500">
          <PencilLine className="size-4" />
        </button>
      ) : null}
      {canOperate ? (
        <>
          <button type="button" disabled className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-700/50 bg-slate-900/50 text-slate-500">
            <MessageCircleMore className="size-4" />
          </button>
          <button type="button" disabled className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-700/50 bg-slate-900/50 text-slate-500">
            <Check className="size-4" />
          </button>
          <button type="button" disabled className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-700/50 bg-slate-900/50 text-slate-500">
            <Ban className="size-4" />
          </button>
        </>
      ) : null}
      {!canEdit && !canOperate ? <span className="text-xs text-slate-500">-</span> : null}
    </div>
  );
}

export function LoanSimulationsPanel({ payload, error }: LoanSimulationsPanelProps) {
  const items = payload?.data || [];
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>("DRAFT,SENT,EXPIRED");
  const deferredSearch = useDeferredValue(search);

  const filteredItems = useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();

    return items.filter((item) => {
      if (!rowMatchesStatus(item, statusFilter)) {
        return false;
      }

      if (!needle) return true;

      const haystack = [item.id, item.displayId, item.customerName].join(" ").toLowerCase();
      return haystack.includes(needle);
    });
  }, [deferredSearch, items, statusFilter]);

  return (
    <section className="mt-6 rounded-[24px] border border-sky-500/14 bg-[linear-gradient(180deg,rgba(8,16,31,0.96),rgba(8,15,28,0.88))] p-4 shadow-[0_18px_38px_rgba(2,6,23,0.22)]">
      <div className="mb-4">
        <h2 className="text-[1.16rem] font-bold tracking-[-0.02em] text-slate-100">Simulacoes pendentes</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.7fr)_240px]">
        <label className="grid gap-2">
          <span className="text-[0.76rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Buscar</span>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cliente ou ID da simulacao" className="pl-11" />
          </div>
        </label>

        <label className="grid gap-2">
          <span className="text-[0.76rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilterKey)} className="h-11 rounded-2xl border border-border/70 bg-background/40 px-4 text-sm text-foreground outline-none transition focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/40">
            <option value="DRAFT,SENT,EXPIRED">Pendentes</option>
            <option value="DRAFT">Rascunho</option>
            <option value="SENT">Enviada</option>
            <option value="EXPIRED">Expirada</option>
            <option value="CANCELED">Cancelada</option>
            <option value="ACCEPTED">Aceita</option>
            <option value="ALL">Todos</option>
          </select>
        </label>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="mt-5 space-y-3 sm:hidden">
        {filteredItems.length > 0 ? filteredItems.map((item) => (
          <article key={item.id} className="rounded-[20px] border border-slate-700/40 bg-slate-950/30 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-slate-500">Simulacao #{item.displayId}</p>
                <p className="mt-1 truncate text-base font-semibold text-slate-100">{item.customerName}</p>
              </div>
              <p className="font-number text-right text-base text-slate-100">{formatCurrency(item.totalAmount)}</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-300">
              <div><span className="text-slate-500">Principal:</span> {formatCurrency(item.principalAmount)}</div>
              <div><span className="text-slate-500">Parcelas:</span> {toNumber(item.installmentsCount)}x</div>
              <div><span className="text-slate-500">Juros:</span> {formatInterestLabel(item)}</div>
              <div><span className="text-slate-500">Validade:</span> {formatDateOnly(item.expiresAt)}</div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${statusClasses(item.status)}`}>{item.statusLabel}</span>
            </div>
            <div className="mt-4 flex justify-end">
              <ActionButtons item={item} />
            </div>
          </article>
        )) : (
          <div className="rounded-[20px] border border-dashed border-slate-700/50 bg-slate-950/20 px-4 py-8 text-center text-sm text-slate-400">
            Nenhuma simulacao encontrada para os filtros aplicados.
          </div>
        )}
      </div>

      <div className="mt-5 hidden overflow-hidden rounded-[22px] border border-slate-700/40 sm:block">
        <table className="min-w-full border-collapse">
          <thead className="bg-slate-950/50">
            <tr className="text-left text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Principal</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Parcelas</th>
              <th className="px-4 py-3">Juros</th>
              <th className="px-4 py-3">Situacao</th>
              <th className="px-4 py-3">Validade</th>
              <th className="px-4 py-3 text-right">Acoes</th>
            </tr>
          </thead>
          <tbody className="bg-slate-950/25">
            {filteredItems.length > 0 ? filteredItems.map((item) => (
              <tr key={item.id} className="border-t border-slate-800/70 text-sm text-slate-200">
                <td className="px-4 py-4 font-mono text-xs text-slate-300">#{item.displayId}</td>
                <td className="px-4 py-4">{item.customerName}</td>
                <td className="px-4 py-4 font-number">{formatCurrency(item.principalAmount)}</td>
                <td className="px-4 py-4 font-number">{formatCurrency(item.totalAmount)}</td>
                <td className="px-4 py-4">{toNumber(item.installmentsCount)}x</td>
                <td className="px-4 py-4">
                  <div className="font-number">{formatInterestLabel(item)}</div>
                  <div className="text-xs text-slate-500">{formatInterestTypeLabel(item)}</div>
                </td>
                <td className="px-4 py-4">
                  <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${statusClasses(item.status)}`}>
                    {item.statusLabel}
                  </span>
                </td>
                <td className="px-4 py-4">{formatDateOnly(item.expiresAt)}</td>
                <td className="px-4 py-4">
                  <div className="flex justify-end">
                    <ActionButtons item={item} />
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-400">
                  Nenhuma simulacao encontrada para os filtros aplicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
