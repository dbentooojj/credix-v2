"use client";

import { useDeferredValue, useEffect, useState, type ReactNode } from "react";
import { BadgeDollarSign, Eye, HandCoins, PencilLine, Search, TrendingUp } from "lucide-react";
import type {
  PortfolioLoanDetailsResponse,
  PortfolioLoanItem,
  PortfolioLoanSimulationsResponse,
  PortfolioLoansResponse,
  PortfolioLoanStatus,
} from "@/src/lib/api";
import { getPortfolioLoanDetails } from "@/src/lib/api";
import { Button } from "@/src/components/ui/button";
import { LoanDetailDialog } from "@/src/components/loans/loan-detail-dialog";
import { LoanFormDialog } from "@/src/components/loans/loan-form-dialog";
import { Input } from "@/src/components/ui/input";
import { LoanSimulationsPanel } from "@/src/components/loans/loan-simulations-panel";

type LoansWorkspaceProps = {
  initialPayload: PortfolioLoansResponse | null;
  initialError: string | null;
  initialSimulationsPayload: PortfolioLoanSimulationsResponse | null;
  initialSimulationsError: string | null;
};

type StatusFilterKey = "all" | PortfolioLoanStatus;

const PAGE_SIZE = 10;

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

function formatDateOnly(value?: string | null) {
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

function buildPaginationSequence(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  const sorted = [...pages].filter((page) => page >= 1 && page <= totalPages).sort((left, right) => left - right);
  const sequence: Array<number | "..."> = [];

  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) {
      sequence.push("...");
    }

    sequence.push(page);
  });

  return sequence;
}

function statusClasses(status?: PortfolioLoanStatus) {
  return status === "inactive"
    ? "border-slate-500/30 bg-slate-500/10 text-slate-200"
    : "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";
}

function financialStatusClasses(status?: PortfolioLoanItem["financialStatus"]) {
  if (status === "overdue") return "border-rose-400/30 bg-rose-500/10 text-rose-200";
  if (status === "settled") return "border-slate-500/30 bg-slate-500/10 text-slate-200";
  return "border-sky-400/30 bg-sky-500/10 text-sky-100";
}

function KpiCard({
  icon,
  label,
  note,
  tone,
  value,
}: {
  icon: ReactNode;
  label: string;
  note: string;
  tone: "brand" | "positive" | "warning" | "danger";
  value: string;
}) {
  const toneClasses = {
    brand: "border-sky-500/30 bg-[linear-gradient(135deg,rgba(20,42,94,0.96),rgba(10,22,55,0.92))]",
    positive: "border-emerald-500/30 bg-[linear-gradient(135deg,rgba(7,97,75,0.96),rgba(6,65,53,0.92))]",
    warning: "border-amber-500/30 bg-[linear-gradient(135deg,rgba(96,65,17,0.96),rgba(67,46,14,0.92))]",
    danger: "border-rose-500/30 bg-[linear-gradient(135deg,rgba(124,18,39,0.96),rgba(88,13,28,0.92))]",
  }[tone];

  return (
    <article className={`relative overflow-hidden rounded-[22px] border px-5 py-5 shadow-[0_18px_36px_rgba(2,6,23,0.24)] ${toneClasses}`}>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_40%)]" />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <p className="text-[0.8rem] font-semibold uppercase tracking-[0.04em] text-slate-100/90">{label}</p>
        <span className="text-slate-100/80">{icon}</span>
      </div>
      <p className="font-number relative z-10 mt-4 text-[2rem] leading-none tracking-[-0.03em] text-white">{value}</p>
      <p className="relative z-10 mt-3 text-sm leading-6 text-slate-100/80">{note}</p>
    </article>
  );
}

export function LoansWorkspace({
  initialPayload,
  initialError,
  initialSimulationsPayload,
  initialSimulationsError,
}: LoansWorkspaceProps) {
  const items = initialPayload?.data || [];
  const summary = initialPayload?.summary;
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>("all");
  const [page, setPage] = useState(1);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<PortfolioLoanDetailsResponse | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null);

  const needle = deferredSearch.trim().toLowerCase();
  const filteredItems = items.filter((item) => {
    if (statusFilter !== "all" && item.status !== statusFilter) {
      return false;
    }

    if (!needle) return true;

    const haystack = [item.id, item.customerName].join(" ").toLowerCase();
    return haystack.includes(needle);
  });

  useEffect(() => {
    setPage(1);
  }, [needle, statusFilter]);

  useEffect(() => {
    let active = true;

    if (!detailOpen || !selectedLoanId) {
      if (!detailOpen) {
        setDetailLoading(false);
        setDetailError(null);
      }

      return () => {
        active = false;
      };
    }

    setDetailLoading(true);
    setDetailError(null);

    void getPortfolioLoanDetails(selectedLoanId)
      .then((response) => {
        if (!active) return;
        setDetail(response);
      })
      .catch((requestError) => {
        if (!active) return;
        setDetail(null);
        setDetailError(requestError instanceof Error ? requestError.message : "Falha ao carregar o detalhe do emprestimo.");
      })
      .finally(() => {
        if (!active) return;
        setDetailLoading(false);
      });

    return () => {
      active = false;
    };
  }, [detailOpen, selectedLoanId]);

  function openDetails(loanId?: string) {
    if (!loanId) return;
    setSelectedLoanId(loanId);
    setDetailOpen(true);
  }

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filteredItems.slice(startIndex, startIndex + PAGE_SIZE);
  const showingStart = filteredItems.length === 0 ? 0 : startIndex + 1;
  const showingEnd = filteredItems.length === 0 ? 0 : startIndex + pageItems.length;
  const totalInterest = toNumber(summary?.contractedTotal) - toNumber(summary?.principalTotal);
  const averagePrincipal = toNumber(summary?.totalLoans) > 0
    ? toNumber(summary?.principalTotal) / toNumber(summary?.totalLoans)
    : 0;
  const customerOptions = Array.from(new Set([
    ...items.map((item) => item.customerName || "").filter(Boolean),
    ...(initialSimulationsPayload?.data || []).map((item) => item.customerName || "").filter(Boolean),
  ])).sort((left, right) => left.localeCompare(right, "pt-BR"));

  return (
    <div className="w-full">
      <section className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[clamp(2rem,1.2vw+1.2rem,2.55rem)] font-bold leading-[1.04] tracking-[-0.04em] text-slate-100">
            Emprestimos
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-8 text-slate-300">
            Acompanhe contratos, valores e status da carteira ativa.
          </p>
        </div>

        <div className="grid gap-3 text-left lg:justify-items-end lg:text-right">
          <div className="flex flex-wrap gap-2">
            <Button disabled variant="outline" className="rounded-2xl border-slate-700/70 bg-slate-950/30 text-slate-300">
              Nova simulacao
            </Button>
            <Button onClick={() => {
              setEditingLoanId(null);
              setFormOpen(true);
            }} className="rounded-2xl bg-[linear-gradient(135deg,#1d4ed8,#2563eb)] text-white">
              Novo emprestimo
            </Button>
          </div>
          <div className="text-sm text-slate-400">
            Atualizado: <span className="font-number text-slate-200">{formatDateTime(initialPayload?.meta?.generatedAt, initialPayload?.meta?.timezone)}</span>
          </div>
        </div>
      </section>

      {initialError ? (
        <div className="mb-5 rounded-2xl border border-rose-400/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
          {initialError}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={<HandCoins className="size-[1.05rem]" />} label="Qtd. emprestimos" note={`${toNumber(summary?.activeLoans)} ativo(s) | ${toNumber(summary?.inactiveLoans)} inativo(s)`} tone="brand" value={String(toNumber(summary?.totalLoans))} />
        <KpiCard icon={<BadgeDollarSign className="size-[1.05rem]" />} label="Principal total" note={`Ticket medio: ${formatCurrency(averagePrincipal)}`} tone="positive" value={formatCurrency(summary?.principalTotal)} />
        <KpiCard icon={<TrendingUp className="size-[1.05rem]" />} label="Total contratado" note={`Juros projetados: ${formatCurrency(totalInterest)}`} tone="warning" value={formatCurrency(summary?.contractedTotal)} />
        <KpiCard icon={<BadgeDollarSign className="size-[1.05rem]" />} label="Emprestimos ativos" note={`${toNumber(summary?.overdueLoans)} contrato(s) com atraso`} tone="danger" value={String(toNumber(summary?.activeLoans))} />
      </section>

      <section className="mt-5 rounded-[24px] border border-sky-500/14 bg-[linear-gradient(180deg,rgba(8,16,31,0.96),rgba(8,15,28,0.88))] p-4 shadow-[0_18px_38px_rgba(2,6,23,0.22)]">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1.7fr)_240px]">
          <label className="grid gap-2">
            <span className="text-[0.76rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Buscar</span>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cliente ou ID do emprestimo" className="pl-11" />
            </div>
          </label>

          <label className="grid gap-2">
            <span className="text-[0.76rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilterKey)} className="h-11 rounded-2xl border border-border/70 bg-background/40 px-4 text-sm text-foreground outline-none transition focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/40">
              <option value="all">Todos</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </label>
        </div>

        <div className="mt-5 space-y-3 sm:hidden">
          {pageItems.length > 0 ? pageItems.map((item) => (
            <article key={item.id} className="rounded-[20px] border border-slate-700/40 bg-slate-950/30 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-slate-500">Emprestimo #{item.id}</p>
                  <p className="mt-1 truncate text-base font-semibold text-slate-100">{item.customerName}</p>
                </div>
                <p className="font-number text-right text-base text-slate-100">{formatCurrency(item.totalAmount)}</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-300">
                <div><span className="text-slate-500">Principal:</span> {formatCurrency(item.principalAmount)}</div>
                <div><span className="text-slate-500">Parcelas:</span> {toNumber(item.installmentCount)}</div>
                <div><span className="text-slate-500">Juros:</span> {formatPercent(item.interestRate)}</div>
                <div><span className="text-slate-500">Inicio:</span> {formatDateOnly(item.issuedAt)}</div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${statusClasses(item.status)}`}>{item.statusLabel}</span>
                <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${financialStatusClasses(item.financialStatus)}`}>{item.financialStatusLabel}</span>
              </div>
              <p className="mt-3 text-sm text-slate-400">{item.statusNote}</p>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => openDetails(item.id)} className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-700/50 bg-slate-900/50 text-slate-200 transition hover:border-sky-400/35 hover:text-white">
                  <Eye className="size-4" />
                </button>
                <button type="button" disabled={toNumber(item.paidInstallments) > 0} onClick={() => {
                  setEditingLoanId(item.id || null);
                  setFormOpen(true);
                }} className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-700/50 bg-slate-900/50 text-slate-200 transition hover:border-emerald-400/35 hover:text-white disabled:text-slate-500 disabled:hover:border-slate-700/50 disabled:hover:text-slate-500">
                  <PencilLine className="size-4" />
                </button>
              </div>
            </article>
          )) : (
            <div className="rounded-[20px] border border-slate-700/40 bg-slate-950/30 px-4 py-8 text-center text-sm text-slate-400">
              Nenhum emprestimo encontrado.
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
                <th className="px-4 py-3">Data de inicio</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody className="bg-slate-950/25">
              {pageItems.length > 0 ? pageItems.map((item) => (
                <tr key={item.id} className="border-t border-slate-800/70 text-sm text-slate-200">
                  <td className="px-4 py-4 font-semibold text-slate-100">#{item.id}</td>
                  <td className="px-4 py-4">{item.customerName}</td>
                  <td className="px-4 py-4 font-number">{formatCurrency(item.principalAmount)}</td>
                  <td className="px-4 py-4 font-number">{formatCurrency(item.totalAmount)}</td>
                  <td className="px-4 py-4">
                    <div>{toNumber(item.installmentCount)}</div>
                    <div className="text-xs text-slate-500">{toNumber(item.paidInstallments)} pagas | {toNumber(item.openInstallments)} abertas</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-number">{formatPercent(item.interestRate)}</div>
                    <div className="text-xs text-slate-500">{formatCurrency(item.interestAmount)}</div>
                  </td>
                  <td className="px-4 py-4">{formatDateOnly(item.issuedAt)}</td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${statusClasses(item.status)}`}>
                      {item.statusLabel}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => openDetails(item.id)} className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-700/50 bg-slate-900/50 text-slate-200 transition hover:border-sky-400/35 hover:text-white">
                        <Eye className="size-4" />
                      </button>
                      <button type="button" disabled={toNumber(item.paidInstallments) > 0} onClick={() => {
                        setEditingLoanId(item.id || null);
                        setFormOpen(true);
                      }} className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-700/50 bg-slate-900/50 text-slate-200 transition hover:border-emerald-400/35 hover:text-white disabled:text-slate-500 disabled:hover:border-slate-700/50 disabled:hover:text-slate-500">
                        <PencilLine className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">Nenhum emprestimo encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-400">
            Mostrando <span className="font-number text-slate-200">{showingStart}</span> ate <span className="font-number text-slate-200">{showingEnd}</span> de <span className="font-number text-slate-200">{filteredItems.length}</span> resultados
          </p>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              Anterior
            </Button>
            {buildPaginationSequence(currentPage, totalPages).map((entry, index) => (
              entry === "..." ? (
                <span key={`ellipsis-${index}`} className="px-1 text-sm text-slate-500">...</span>
              ) : (
                <button key={entry} type="button" onClick={() => setPage(entry)} className={`inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-sm transition ${entry === currentPage ? "border-sky-400/60 bg-sky-500/15 text-sky-100" : "border-slate-700/50 bg-slate-950/30 text-slate-300 hover:border-slate-600/60"}`}>
                  {entry}
                </button>
              )
            ))}
            <Button type="button" variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
              Proxima
            </Button>
          </div>
        </div>
      </section>

      <LoanSimulationsPanel payload={initialSimulationsPayload} error={initialSimulationsError} />
      <LoanDetailDialog detail={detail} error={detailError} loading={detailLoading} open={detailOpen} onOpenChange={setDetailOpen} />
      <LoanFormDialog
        customerOptions={customerOptions}
        editingLoanId={editingLoanId}
        onOpenChange={(nextOpen) => {
          setFormOpen(nextOpen);
          if (!nextOpen) setEditingLoanId(null);
        }}
        open={formOpen}
      />
    </div>
  );
}
