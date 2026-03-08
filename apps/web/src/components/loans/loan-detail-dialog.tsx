"use client";

import type { ReactNode } from "react";
import { CircleAlert, LoaderCircle } from "lucide-react";
import type { PortfolioInstallmentItem, PortfolioLoanDetailsResponse, PortfolioLoanItem } from "@/src/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";

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

function loanStatusClasses(status?: PortfolioLoanItem["status"]) {
  return status === "inactive"
    ? "border-slate-500/30 bg-slate-500/10 text-slate-200"
    : "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";
}

function financialStatusClasses(status?: PortfolioLoanItem["financialStatus"]) {
  if (status === "overdue") return "border-rose-400/30 bg-rose-500/10 text-rose-200";
  if (status === "settled") return "border-slate-500/30 bg-slate-500/10 text-slate-200";
  return "border-sky-400/30 bg-sky-500/10 text-sky-100";
}

function installmentStatusClasses(status?: PortfolioInstallmentItem["status"]) {
  if (status === "overdue") return "border-rose-400/30 bg-rose-500/10 text-rose-200";
  if (status === "due-today") return "border-amber-400/30 bg-amber-500/10 text-amber-100";
  if (status === "paid") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";
  return "border-sky-400/30 bg-sky-500/10 text-sky-100";
}

function DetailCard({
  accent = false,
  children,
  full = false,
}: {
  accent?: boolean;
  children: ReactNode;
  full?: boolean;
}) {
  return (
    <article className={`${full ? "lg:col-span-2" : ""} rounded-[18px] border px-4 py-4 ${accent ? "border-sky-500/25 bg-sky-500/10" : "border-slate-700/45 bg-slate-950/35"}`}>
      {children}
    </article>
  );
}

export function LoanDetailDialog({
  detail,
  error,
  loading,
  onOpenChange,
  open,
}: {
  detail: PortfolioLoanDetailsResponse | null;
  error: string | null;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const loan = detail?.loan || null;
  const installments = detail?.installments || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl overflow-hidden border-slate-700/70 bg-[linear-gradient(180deg,rgba(7,13,24,0.98),rgba(7,12,22,0.94))] p-0">
        <div className="max-h-[88vh] overflow-y-auto px-6 py-6">
          <DialogHeader className="pr-10">
            <DialogTitle>Detalhes do emprestimo</DialogTitle>
            <DialogDescription>
              Resumo do contrato, leitura financeira e andamento das parcelas.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 text-center">
              <LoaderCircle className="size-6 animate-spin text-slate-300" />
              <p className="text-base font-semibold text-slate-100">Carregando detalhe do emprestimo</p>
              <p className="text-sm leading-6 text-slate-400">Buscando contrato e parcelas vinculadas.</p>
            </div>
          ) : error ? (
            <div className="mt-6 rounded-2xl border border-rose-400/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : loan ? (
            <div className="mt-6 grid gap-6">
              <section>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-[1.08rem] font-bold tracking-[-0.02em] text-slate-100">1. Resumo do emprestimo</h3>
                  <span className="text-sm text-slate-400">Cliente: <span className="font-semibold text-slate-200">{loan.customerName || "--"}</span></span>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
                  <DetailCard accent>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Valor total</p>
                    <p className="font-number mt-3 text-[1.8rem] tracking-[-0.03em] text-slate-50">{formatCurrency(loan.totalAmount)}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-400">Total contratado no emprestimo</p>
                  </DetailCard>
                  <DetailCard>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Status</p>
                    <div className="mt-3">
                      <span className={`inline-flex min-h-7 items-center rounded-full border px-3 text-[0.68rem] font-semibold uppercase tracking-[0.08em] ${loanStatusClasses(loan.status)}`}>
                        {loan.statusLabel || "Ativo"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-400">Status administrativo do contrato</p>
                  </DetailCard>
                  <DetailCard>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Situacao</p>
                    <div className="mt-3">
                      <span className={`inline-flex min-h-7 items-center rounded-full border px-3 text-[0.68rem] font-semibold uppercase tracking-[0.08em] ${financialStatusClasses(loan.financialStatus)}`}>
                        {loan.financialStatusLabel || "Em dia"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-400">Comportamento financeiro atual</p>
                  </DetailCard>
                  <DetailCard accent>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Parcelas em aberto</p>
                    <p className="font-number mt-3 text-[1.8rem] tracking-[-0.03em] text-slate-50">{toNumber(loan.openInstallments)}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-400">{toNumber(loan.openInstallments)} pendente(s) | {toNumber(loan.overdueInstallments)} atrasada(s)</p>
                  </DetailCard>
                </div>
              </section>

              <section>
                <h3 className="text-[1.08rem] font-bold tracking-[-0.02em] text-slate-100">2. Informacoes financeiras</h3>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <DetailCard>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Principal</p>
                    <p className="font-number mt-3 text-[1.45rem] tracking-[-0.03em] text-slate-100">{formatCurrency(loan.principalAmount)}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-400">Capital inicial liberado</p>
                  </DetailCard>
                  <DetailCard>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Juros</p>
                    <p className="mt-3 text-[1.1rem] font-semibold text-slate-100">Taxa efetiva</p>
                    <p className="mt-1 text-sm text-slate-300">{formatPercent(loan.interestRate)}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-400">Acrescimo total de {formatCurrency(loan.interestAmount)}</p>
                  </DetailCard>
                  <DetailCard>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Data de inicio</p>
                    <p className="mt-3 text-[1.1rem] font-semibold text-slate-100">{formatDateOnly(loan.issuedAt)}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-400">Inicio do contrato</p>
                  </DetailCard>
                  <DetailCard>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">1o vencimento</p>
                    <p className="mt-3 text-[1.1rem] font-semibold text-slate-100">{formatDateOnly(loan.firstDueDate)}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-400">Primeira data de cobranca</p>
                  </DetailCard>
                  <DetailCard>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Parcelas pagas</p>
                    <p className="font-number mt-3 text-[1.45rem] tracking-[-0.03em] text-slate-100">{toNumber(loan.paidInstallments)}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-400">de {toNumber(loan.installmentCount)} parcela(s)</p>
                  </DetailCard>
                  <DetailCard>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Em atraso</p>
                    <p className="font-number mt-3 text-[1.45rem] tracking-[-0.03em] text-slate-100">{toNumber(loan.overdueInstallments)}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-400">{loan.statusNote || "Sem alertas adicionais."}</p>
                  </DetailCard>
                  <DetailCard full>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Prox. vencimento | parcela</p>
                    <p className="mt-3 text-[1.1rem] font-semibold text-slate-100">
                      {loan.nextDueDate ? `${formatDateOnly(loan.nextDueDate)} | ${loan.nextInstallmentLabel || "--"}` : "--"}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-400">
                      {loan.nextInstallmentAmount ? `Valor previsto: ${formatCurrency(loan.nextInstallmentAmount)}` : "Sem compromisso financeiro em aberto."}
                    </p>
                  </DetailCard>
                </div>
              </section>

              <section>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-[1.08rem] font-bold tracking-[-0.02em] text-slate-100">3. Parcelas</h3>
                  <span className="text-sm text-slate-400">{installments.length} registro(s)</span>
                </div>
                {installments.length > 0 ? (
                  <div className="mt-4 grid gap-3">
                    {installments.map((item) => (
                      <article key={item.id} className="rounded-[18px] border border-slate-700/45 bg-slate-950/35 px-4 py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-100">{item.installmentLabel || "--"}</p>
                            <p className="mt-1 text-xs text-slate-400">{formatDateOnly(item.dueDate)}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-number text-sm text-slate-100">{formatCurrency(item.amount)}</span>
                            <span className={`inline-flex min-h-7 items-center rounded-full border px-3 text-[0.68rem] font-semibold uppercase tracking-[0.08em] ${installmentStatusClasses(item.status)}`}>
                              {item.statusLabel || "Pendente"}
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                          <div>
                            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-500">Principal</p>
                            <p className="mt-1 text-sm text-slate-200">{formatCurrency(item.principalAmount)}</p>
                          </div>
                          <div>
                            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-500">Juros</p>
                            <p className="mt-1 text-sm text-slate-200">{formatCurrency(item.interestAmount)}</p>
                          </div>
                          <div>
                            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-500">Leitura</p>
                            <p className="mt-1 text-sm text-slate-200">{item.timingLabel || "--"}</p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-[18px] border border-slate-700/45 bg-slate-950/35 px-5 py-7 text-center">
                    <p className="text-base font-semibold text-slate-100">Nenhuma parcela vinculada</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">Esse emprestimo ainda nao possui parcelas associadas.</p>
                  </div>
                )}
              </section>
            </div>
          ) : (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center">
              <CircleAlert className="size-6 text-slate-300" />
              <p className="text-base font-semibold text-slate-100">Nenhum emprestimo selecionado</p>
              <p className="text-sm leading-6 text-slate-400">Selecione um contrato para visualizar o detalhe.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
