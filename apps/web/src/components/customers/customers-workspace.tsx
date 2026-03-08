"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState, type ReactNode } from "react";
import { AlertCircle, BadgeDollarSign, CircleAlert, Search, Users, Wallet } from "lucide-react";
import type {
  PortfolioCustomerDetailsResponse,
  PortfolioCustomerItem,
  PortfolioCustomersResponse,
  PortfolioCustomerStatus,
} from "@/src/lib/api";
import { getPortfolioCustomerDetails } from "@/src/lib/api";
import { cn } from "@/src/lib/utils";
import { CustomerDetailPanel } from "@/src/components/customers/customer-detail-panel";

type CustomersWorkspaceProps = {
  initialPayload: PortfolioCustomersResponse | null;
  initialError: string | null;
};

type StatusFilterKey = "all" | PortfolioCustomerStatus;

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

function statusClasses(status?: PortfolioCustomerStatus) {
  if (status === "overdue") {
    return "border-rose-400/30 bg-rose-500/10 text-rose-200";
  }

  if (status === "watch") {
    return "border-amber-400/30 bg-amber-500/10 text-amber-100";
  }

  return "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";
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

function buildInstallmentsHref(item: PortfolioCustomerItem, status?: "overdue") {
  const searchParams = new URLSearchParams();

  if (item.customerName) searchParams.set("customer", item.customerName);
  if (status) searchParams.set("status", status);

  const query = searchParams.toString();
  return query ? `/app/parcelas?${query}` : "/app/parcelas";
}

export function CustomersWorkspace({ initialPayload, initialError }: CustomersWorkspaceProps) {
  const items = initialPayload?.data || [];
  const summary = initialPayload?.summary;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>("all");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(items[0]?.id || null);
  const [detail, setDetail] = useState<PortfolioCustomerDetailsResponse | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const deferredSearch = useDeferredValue(search);

  const needle = deferredSearch.trim().toLowerCase();
  const filteredItems = items.filter((item) => {
    if (statusFilter !== "all" && item.status !== statusFilter) {
      return false;
    }

    if (!needle) {
      return true;
    }

    const haystack = [
      item.customerName,
      item.id,
    ].join(" ").toLowerCase();

    return haystack.includes(needle);
  });

  useEffect(() => {
    if (filteredItems.length === 0) {
      setSelectedCustomerId(null);
      return;
    }

    if (!selectedCustomerId || !filteredItems.some((item) => item.id === selectedCustomerId)) {
      setSelectedCustomerId(filteredItems[0]?.id || null);
    }
  }, [filteredItems, selectedCustomerId]);

  useEffect(() => {
    let active = true;

    if (!selectedCustomerId) {
      setDetail(null);
      setDetailError(null);
      setDetailLoading(false);
      return () => {
        active = false;
      };
    }

    setDetailLoading(true);
    setDetailError(null);

    void getPortfolioCustomerDetails(selectedCustomerId)
      .then((response) => {
        if (!active) return;
        setDetail(response);
      })
      .catch((requestError) => {
        if (!active) return;
        setDetail(null);
        setDetailError(requestError instanceof Error ? requestError.message : "Falha ao carregar o detalhe do cliente.");
      })
      .finally(() => {
        if (!active) return;
        setDetailLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedCustomerId]);

  const selectedCustomer = detail?.customer || items.find((item) => item.id === selectedCustomerId) || null;

  return (
    <div className="w-full">
      <section className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[clamp(2rem,1.2vw+1.2rem,2.55rem)] font-bold leading-[1.04] tracking-[-0.04em] text-slate-100">
            Clientes
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-8 text-slate-300">
            Base de clientes da carteira com leitura de exposicao, atraso e recebimento.
          </p>
        </div>

        <div className="grid gap-3 text-left lg:justify-items-end lg:text-right">
          <span className="font-menu inline-flex items-center rounded-full border border-sky-400/15 bg-slate-900/60 px-3 py-[0.34rem] text-[0.69rem] text-slate-300">
            Carteira de clientes
          </span>
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
        <KpiCard
          icon={<Users className="size-[1.05rem]" />}
          label="Clientes totais"
          note="Base consolidada de clientes com contratos na carteira."
          tone="brand"
          value={String(toNumber(summary?.totalCustomers))}
        />
        <KpiCard
          icon={<Wallet className="size-[1.05rem]" />}
          label="Clientes ativos"
          note="Clientes com pelo menos um contrato ainda em aberto."
          tone="positive"
          value={String(toNumber(summary?.activeCustomers))}
        />
        <KpiCard
          icon={<AlertCircle className="size-[1.05rem]" />}
          label="Clientes em atraso"
          note={`Exposicao em atraso: ${formatCurrency(summary?.overdueBalance)}`}
          tone="danger"
          value={String(toNumber(summary?.overdueCustomers))}
        />
        <KpiCard
          icon={<BadgeDollarSign className="size-[1.05rem]" />}
          label="Carteira em aberto"
          note={`Recebido no mes: ${formatCurrency(summary?.receivedThisMonth)}`}
          tone="warning"
          value={formatCurrency(summary?.openBalance)}
        />
      </section>

      <section className="mt-5 rounded-[24px] border border-sky-500/14 bg-[linear-gradient(180deg,rgba(8,16,31,0.96),rgba(8,15,28,0.88))] p-4 shadow-[0_18px_38px_rgba(2,6,23,0.22)]">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1.7fr)_240px]">
          <label className="grid gap-2">
            <span className="text-[0.76rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Buscar</span>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                className="h-12 w-full rounded-[14px] border border-slate-700/70 bg-slate-950/35 pl-11 pr-4 text-[0.95rem] text-slate-100 outline-none transition focus:border-sky-400/60 focus:ring-4 focus:ring-sky-500/10"
                placeholder="Buscar por cliente"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </label>

          <label className="grid gap-2">
            <span className="text-[0.76rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Status</span>
            <select
              className="h-12 rounded-[14px] border border-slate-700/70 bg-slate-950/35 px-4 text-[0.95rem] text-slate-100 outline-none transition focus:border-sky-400/60 focus:ring-4 focus:ring-sky-500/10"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilterKey)}
            >
              <option value="all">Todos</option>
              <option value="healthy">Em dia</option>
              <option value="watch">Atencao</option>
              <option value="overdue">Em atraso</option>
            </select>
          </label>
        </div>
      </section>

      <CustomerDetailPanel
        detail={detail}
        error={detailError}
        loading={detailLoading}
        selectedCustomer={selectedCustomer}
      />

      <section className="mt-5 overflow-hidden rounded-[24px] border border-sky-500/14 bg-[linear-gradient(180deg,rgba(8,16,31,0.96),rgba(8,15,28,0.88))] shadow-[0_22px_52px_rgba(2,6,23,0.28)]">
        <div className="flex flex-col gap-2 px-5 pb-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[1.08rem] font-bold tracking-[-0.02em] text-slate-100">Base de clientes</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">Selecione um cliente para carregar o detalhe operacional na parte superior.</p>
          </div>
          <span className="rounded-full border border-slate-700/40 bg-slate-950/35 px-3 py-1 text-xs font-semibold text-slate-300">
            Resultados: {filteredItems.length}
          </span>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-[1120px] w-full border-collapse">
            <thead>
              <tr className="border-y border-slate-700/60">
                <th className="px-5 py-4 text-left text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Cliente</th>
                <th className="px-5 py-4 text-left text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Contratos</th>
                <th className="px-5 py-4 text-left text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Carteira</th>
                <th className="px-5 py-4 text-left text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Parcelas</th>
                <th className="px-5 py-4 text-left text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Agenda</th>
                <th className="px-5 py-4 text-left text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Status</th>
                <th className="px-5 py-4 text-right text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-10 text-center">
                      <div className="flex size-12 items-center justify-center rounded-2xl border border-slate-700/50 bg-slate-950/35 text-slate-300">
                        <CircleAlert className="size-5" />
                      </div>
                      <p className="mt-5 text-xl font-semibold tracking-[-0.03em] text-slate-100">Nenhum cliente encontrado</p>
                      <p className="mt-3 max-w-md text-sm leading-7 text-slate-400">Ajuste a busca ou o status para visualizar registros.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className={cn(
                      "border-t border-slate-800/80 align-top transition hover:bg-slate-950/25",
                      item.id === selectedCustomerId && "bg-slate-900/35",
                    )}
                  >
                    <td className="px-5 py-4">
                      <p className="text-[0.98rem] font-semibold text-slate-100">{item.customerName || "Cliente nao informado"}</p>
                      <p className="mt-1 text-xs text-slate-500">ID {item.id || "--"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-slate-100">{toNumber(item.activeContracts)} ativo(s) / {toNumber(item.contractCount)} total</p>
                      <p className="mt-1 text-xs text-slate-400">Tomado: {formatCurrency(item.totalLoaned)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-number text-sm text-slate-100">Aberto: {formatCurrency(item.openBalance)}</p>
                      <p className="mt-1 text-xs text-slate-400">Atrasado: {formatCurrency(item.overdueBalance)}</p>
                      <p className="mt-1 text-xs text-slate-500">Recebido mes: {formatCurrency(item.receivedThisMonth)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-slate-100">Abertas: {toNumber(item.openInstallments)}</p>
                      <p className="mt-1 text-xs text-slate-400">Pagas: {toNumber(item.paidInstallments)}</p>
                      <p className="mt-1 text-xs text-slate-500">Em atraso: {toNumber(item.overdueInstallments)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-slate-100">Prox.: {formatDateOnly(item.nextDueDate)}</p>
                      <p className="mt-1 text-xs text-slate-400">Ult. pagamento: {formatDateOnly(item.lastPaymentDate)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex min-h-7 items-center rounded-full border px-3 text-[0.72rem] font-semibold uppercase tracking-[0.08em] ${statusClasses(item.status)}`}>
                        {item.statusLabel || "Em dia"}
                      </span>
                      <p className="mt-2 text-xs leading-5 text-slate-400">{item.statusNote || "--"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className={cn(
                            "inline-flex min-h-[2.35rem] items-center rounded-[12px] border px-4 text-sm font-medium transition",
                            item.id === selectedCustomerId
                              ? "border-sky-400/35 bg-sky-500/12 text-sky-100"
                              : "border-slate-700/70 bg-slate-900/65 text-slate-200 hover:border-sky-400/35 hover:bg-slate-900",
                          )}
                          onClick={() => setSelectedCustomerId(item.id || null)}
                        >
                          {item.id === selectedCustomerId ? "Selecionado" : "Resumo"}
                        </button>
                        <Link
                          href={buildInstallmentsHref(item)}
                          className="inline-flex min-h-[2.35rem] items-center rounded-[12px] border border-slate-700/70 bg-slate-900/65 px-4 text-sm font-medium text-slate-200 transition hover:border-sky-400/35 hover:bg-slate-900"
                        >
                          Parcelas
                        </Link>
                        {item.status === "overdue" ? (
                          <Link
                            href={buildInstallmentsHref(item, "overdue")}
                            className="inline-flex min-h-[2.35rem] items-center rounded-[12px] border border-amber-500/25 bg-amber-950/50 px-4 text-sm font-medium text-amber-50 transition hover:border-amber-400/35 hover:bg-amber-900/60"
                          >
                            Atrasos
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 px-4 pb-4 md:hidden">
          {filteredItems.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center px-6 py-10 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl border border-slate-700/50 bg-slate-950/35 text-slate-300">
                <CircleAlert className="size-5" />
              </div>
              <p className="mt-5 text-xl font-semibold tracking-[-0.03em] text-slate-100">Nenhum cliente encontrado</p>
              <p className="mt-3 max-w-md text-sm leading-7 text-slate-400">Ajuste a busca ou o status para visualizar registros.</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <article
                key={item.id}
                className={cn(
                  "rounded-[20px] border border-slate-700/50 bg-slate-950/35 p-4",
                  item.id === selectedCustomerId && "border-sky-400/35 bg-sky-950/20",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{item.customerName || "Cliente nao informado"}</p>
                    <p className="mt-1 text-xs text-slate-500">ID {item.id || "--"}</p>
                  </div>
                  <span className={`inline-flex min-h-7 items-center rounded-full border px-3 text-[0.72rem] font-semibold uppercase tracking-[0.08em] ${statusClasses(item.status)}`}>
                    {item.statusLabel || "Em dia"}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-500">Em aberto</p>
                    <p className="font-number mt-1 text-sm text-slate-100">{formatCurrency(item.openBalance)}</p>
                  </div>
                  <div>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-500">Atrasado</p>
                    <p className="font-number mt-1 text-sm text-slate-100">{formatCurrency(item.overdueBalance)}</p>
                  </div>
                  <div>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-500">Proximo venc.</p>
                    <p className="mt-1 text-sm text-slate-100">{formatDateOnly(item.nextDueDate)}</p>
                  </div>
                  <div>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-500">Contratos</p>
                    <p className="mt-1 text-sm text-slate-100">{toNumber(item.activeContracts)} ativo(s)</p>
                  </div>
                </div>

                <p className="mt-4 text-xs leading-6 text-slate-400">{item.statusNote || "--"}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={cn(
                      "inline-flex min-h-[2.35rem] items-center rounded-[12px] border px-4 text-sm font-medium",
                      item.id === selectedCustomerId
                        ? "border-sky-400/35 bg-sky-500/12 text-sky-100"
                        : "border-slate-700/70 bg-slate-900/65 text-slate-200",
                    )}
                    onClick={() => setSelectedCustomerId(item.id || null)}
                  >
                    {item.id === selectedCustomerId ? "Selecionado" : "Resumo"}
                  </button>
                  <Link
                    href={buildInstallmentsHref(item)}
                    className="inline-flex min-h-[2.35rem] items-center rounded-[12px] border border-slate-700/70 bg-slate-900/65 px-4 text-sm font-medium text-slate-200"
                  >
                    Parcelas
                  </Link>
                  {item.status === "overdue" ? (
                    <Link
                      href={buildInstallmentsHref(item, "overdue")}
                      className="inline-flex min-h-[2.35rem] items-center rounded-[12px] border border-amber-500/25 bg-amber-950/50 px-4 text-sm font-medium text-amber-50"
                    >
                      Atrasos
                    </Link>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
