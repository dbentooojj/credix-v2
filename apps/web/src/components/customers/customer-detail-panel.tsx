"use client";

import Link from "next/link";
import { CircleAlert, LoaderCircle } from "lucide-react";
import type {
  PortfolioCustomerContractItem,
  PortfolioCustomerDetailsResponse,
  PortfolioCustomerItem,
  PortfolioCustomerStatus,
  PortfolioInstallmentItem,
} from "@/src/lib/api";

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

function customerStatusClasses(status?: PortfolioCustomerStatus) {
  if (status === "overdue") return "border-rose-400/30 bg-rose-500/10 text-rose-200";
  if (status === "watch") return "border-amber-400/30 bg-amber-500/10 text-amber-100";
  return "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";
}

function installmentStatusClasses(status?: PortfolioInstallmentItem["status"]) {
  if (status === "overdue") return "border-rose-400/30 bg-rose-500/10 text-rose-200";
  if (status === "due-today") return "border-amber-400/30 bg-amber-500/10 text-amber-100";
  if (status === "paid") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";
  return "border-sky-400/30 bg-sky-500/10 text-sky-100";
}

function buildInstallmentsHref(item: PortfolioCustomerItem, status?: "overdue") {
  const searchParams = new URLSearchParams();
  if (item.customerName) searchParams.set("customer", item.customerName);
  if (status) searchParams.set("status", status);
  const query = searchParams.toString();
  return query ? `/app/parcelas?${query}` : "/app/parcelas";
}

function DetailMetric({ label, note, value }: { label: string; note: string; value: string }) {
  return (
    <article className="rounded-[18px] border border-slate-700/45 bg-slate-950/35 px-4 py-4">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">{label}</p>
      <p className="font-number mt-3 text-[1.65rem] tracking-[-0.03em] text-slate-100">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-400">{note}</p>
    </article>
  );
}

function ContractPanel({ contracts }: { contracts: PortfolioCustomerContractItem[] }) {
  return (
    <article className="rounded-[22px] border border-slate-700/35 bg-[linear-gradient(180deg,rgba(10,18,34,0.96),rgba(9,16,30,0.84))] p-4 shadow-[0_10px_30px_rgba(2,6,23,0.28)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-[1.02rem] font-bold tracking-[-0.02em] text-slate-100">Contratos do cliente</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">Resumo operacional dos contratos ligados ao cliente selecionado.</p>
        </div>
        <span className="rounded-full border border-slate-700/45 bg-slate-950/35 px-3 py-1 text-xs font-semibold text-slate-300">
          {contracts.length} contrato(s)
        </span>
      </div>

      {contracts.length === 0 ? (
        <div className="mt-4 rounded-[18px] border border-slate-700/45 bg-slate-950/35 px-5 py-7 text-center">
          <p className="text-base font-semibold text-slate-100">Nenhum contrato encontrado</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">Esse cliente ainda nao possui contratos na carteira.</p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[760px] w-full border-collapse">
            <thead>
              <tr className="border-y border-slate-700/55">
                <th className="px-4 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Contrato</th>
                <th className="px-4 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Emissao</th>
                <th className="px-4 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Principal</th>
                <th className="px-4 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Carteira</th>
                <th className="px-4 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Parcelas</th>
                <th className="px-4 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Proximo venc.</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract) => (
                <tr key={contract.id} className="border-t border-slate-800/80">
                  <td className="px-4 py-4 text-sm font-semibold text-slate-100">{contract.loanLabel || "--"}</td>
                  <td className="px-4 py-4 text-sm text-slate-300">{formatDateOnly(contract.issuedAt)}</td>
                  <td className="font-number px-4 py-4 text-sm text-slate-100">{formatCurrency(contract.principalAmount)}</td>
                  <td className="px-4 py-4">
                    <p className="font-number text-sm text-slate-100">{formatCurrency(contract.openBalance)}</p>
                    <p className="mt-1 text-xs text-slate-400">Atrasado: {formatCurrency(contract.overdueBalance)}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-slate-100">Abertas: {toNumber(contract.openInstallments)}</p>
                    <p className="mt-1 text-xs text-slate-400">Pagas: {toNumber(contract.paidInstallments)} | Atrasadas: {toNumber(contract.overdueInstallments)}</p>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-300">{formatDateOnly(contract.nextDueDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

function InstallmentPanel({
  emptyNote,
  emptyTitle,
  items,
  title,
}: {
  emptyNote: string;
  emptyTitle: string;
  items: PortfolioInstallmentItem[];
  title: string;
}) {
  return (
    <article className="rounded-[22px] border border-slate-700/35 bg-[linear-gradient(180deg,rgba(10,18,34,0.96),rgba(9,16,30,0.84))] p-4 shadow-[0_10px_30px_rgba(2,6,23,0.28)]">
      <h3 className="text-[1.02rem] font-bold tracking-[-0.02em] text-slate-100">{title}</h3>
      {items.length === 0 ? (
        <div className="mt-4 rounded-[18px] border border-slate-700/45 bg-slate-950/35 px-5 py-7 text-center">
          <p className="text-base font-semibold text-slate-100">{emptyTitle}</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">{emptyNote}</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-[18px] border border-slate-700/45 bg-slate-950/35 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-100">{item.loanLabel || "--"}</p>
                  <p className="mt-1 text-xs text-slate-400">{item.installmentLabel || "--"}</p>
                </div>
                <span className={`inline-flex min-h-7 items-center rounded-full border px-3 text-[0.68rem] font-semibold uppercase tracking-[0.08em] ${installmentStatusClasses(item.status)}`}>
                  {item.statusLabel || "Pendente"}
                </span>
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Vencimento</p>
                  <p className="mt-1 text-sm text-slate-200">{formatDateOnly(item.dueDate)}</p>
                </div>
                <div className="text-right">
                  <p className="font-number text-sm text-slate-100">{formatCurrency(item.amount)}</p>
                  <p className="mt-1 text-xs text-slate-400">{item.timingLabel || "--"}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

export function CustomerDetailPanel({
  detail,
  error,
  loading,
  selectedCustomer,
}: {
  detail: PortfolioCustomerDetailsResponse | null;
  error: string | null;
  loading: boolean;
  selectedCustomer: PortfolioCustomerItem | null;
}) {
  const contracts = detail?.contracts || [];
  const upcomingInstallments = detail?.upcomingInstallments || [];
  const overdueInstallments = detail?.overdueInstallments || [];

  return (
    <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]">
      <div className="grid gap-5">
        <article className="rounded-[24px] border border-sky-500/14 bg-[linear-gradient(180deg,rgba(8,16,31,0.96),rgba(8,15,28,0.88))] p-5 shadow-[0_22px_52px_rgba(2,6,23,0.28)]">
          {loading ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-center">
              <LoaderCircle className="size-6 animate-spin text-slate-300" />
              <p className="text-base font-semibold text-slate-100">Carregando detalhe do cliente</p>
              <p className="text-sm leading-6 text-slate-400">Buscando contratos, vencimentos e exposicao operacional.</p>
            </div>
          ) : selectedCustomer ? (
            <>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-[1.35rem] font-bold tracking-[-0.03em] text-slate-100">{selectedCustomer.customerName || "Cliente selecionado"}</h2>
                    <span className={`inline-flex min-h-7 items-center rounded-full border px-3 text-[0.72rem] font-semibold uppercase tracking-[0.08em] ${customerStatusClasses(selectedCustomer.status)}`}>
                      {selectedCustomer.statusLabel || "Em dia"}
                    </span>
                  </div>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{selectedCustomer.statusNote || "Leitura operacional do cliente selecionado."}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link href={buildInstallmentsHref(selectedCustomer)} className="inline-flex min-h-[2.35rem] items-center rounded-[12px] border border-slate-700/70 bg-slate-900/65 px-4 text-sm font-medium text-slate-200 transition hover:border-sky-400/35 hover:bg-slate-900">
                    Ver parcelas
                  </Link>
                  {selectedCustomer.status === "overdue" ? (
                    <Link href={buildInstallmentsHref(selectedCustomer, "overdue")} className="inline-flex min-h-[2.35rem] items-center rounded-[12px] border border-amber-500/25 bg-amber-950/50 px-4 text-sm font-medium text-amber-50 transition hover:border-amber-400/35 hover:bg-amber-900/60">
                      Ver atrasos
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <DetailMetric label="Em aberto" note={`Parcelas abertas: ${toNumber(selectedCustomer.openInstallments)}`} value={formatCurrency(selectedCustomer.openBalance)} />
                <DetailMetric label="Em atraso" note={`Parcelas em atraso: ${toNumber(selectedCustomer.overdueInstallments)}`} value={formatCurrency(selectedCustomer.overdueBalance)} />
                <DetailMetric label="Recebido total" note={`Ultimo pagamento: ${formatDateOnly(selectedCustomer.lastPaymentDate)}`} value={formatCurrency(selectedCustomer.receivedTotal)} />
                <DetailMetric label="Total tomado" note={`Contratos ativos: ${toNumber(selectedCustomer.activeContracts)} / ${toNumber(selectedCustomer.contractCount)}`} value={formatCurrency(selectedCustomer.totalLoaned)} />
              </div>

              <div className="mt-5 rounded-[18px] border border-slate-700/45 bg-slate-950/30 px-4 py-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-500">Proximo vencimento</p>
                    <p className="mt-2 text-sm font-semibold text-slate-100">{formatDateOnly(selectedCustomer.nextDueDate)}</p>
                  </div>
                  <div>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-500">Ultimo pagamento</p>
                    <p className="mt-2 text-sm font-semibold text-slate-100">{formatDateOnly(selectedCustomer.lastPaymentDate)}</p>
                  </div>
                  <div>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-500">Recebido no mes</p>
                    <p className="font-number mt-2 text-sm font-semibold text-slate-100">{formatCurrency(selectedCustomer.receivedThisMonth)}</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-center">
              <CircleAlert className="size-6 text-slate-300" />
              <p className="text-base font-semibold text-slate-100">Nenhum cliente selecionado</p>
              <p className="text-sm leading-6 text-slate-400">Escolha um cliente na listagem para ver o resumo operacional.</p>
            </div>
          )}

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}
        </article>

        <ContractPanel contracts={contracts} />
      </div>

      <div className="grid gap-5">
        <InstallmentPanel emptyNote="Quando houver parcelas futuras em aberto, elas aparecem aqui para acompanhamento." emptyTitle="Sem proximos vencimentos." items={upcomingInstallments} title="Proximos vencimentos" />
        <InstallmentPanel emptyNote="Nao existem parcelas atrasadas para o cliente selecionado." emptyTitle="Sem atrasos." items={overdueInstallments} title="Parcelas em atraso" />
      </div>
    </section>
  );
}
