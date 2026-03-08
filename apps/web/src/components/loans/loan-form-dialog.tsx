"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import {
  createPortfolioLoan,
  getPortfolioLoanDetails,
  updatePortfolioLoan,
  type PortfolioLoanDetailsResponse,
  type PortfolioLoanPayload,
  type PortfolioLoanSimulationInterestType,
} from "@/src/lib/api";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";

type LoanFormDialogProps = {
  customerOptions: string[];
  editingLoanId: string | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

type LoanFormState = {
  customerName: string;
  principalAmount: string;
  interestType: PortfolioLoanSimulationInterestType;
  interestRate: string;
  fixedFeeAmount: string;
  installmentsCount: string;
  issuedAt: string;
  firstDueDate: string;
  observations: string;
};

const EMPTY_FORM: LoanFormState = {
  customerName: "",
  principalAmount: "",
  interestType: "composto",
  interestRate: "",
  fixedFeeAmount: "",
  installmentsCount: "",
  issuedAt: "",
  firstDueDate: "",
  observations: "",
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

function addMonths(value: string, diff: number) {
  const base = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(base.getTime())) return "";
  const shifted = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + diff, base.getUTCDate(), 12, 0, 0));
  return shifted.toISOString().slice(0, 10);
}

function buildDefaultDates() {
  const today = new Date();
  const issuedAt = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 12, 0, 0));
  const firstDueDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, today.getUTCDate(), 12, 0, 0));
  return {
    issuedAt: issuedAt.toISOString().slice(0, 10),
    firstDueDate: firstDueDate.toISOString().slice(0, 10),
  };
}

function buildPayload(state: LoanFormState): PortfolioLoanPayload {
  return {
    customerName: state.customerName.trim(),
    principalAmount: toNumber(state.principalAmount),
    interestType: state.interestType,
    interestRate: toNumber(state.interestRate),
    fixedFeeAmount: toNumber(state.fixedFeeAmount),
    installmentsCount: Math.max(1, Math.trunc(toNumber(state.installmentsCount))),
    issuedAt: state.issuedAt,
    firstDueDate: state.firstDueDate,
    observations: state.observations.trim(),
  };
}

function calculatePreview(payload: PortfolioLoanPayload) {
  const principal = payload.principalAmount;
  const installmentsCount = Math.max(1, payload.installmentsCount);
  const totalInterest = payload.interestType === "fixo"
    ? payload.fixedFeeAmount
    : payload.interestType === "composto"
      ? principal * (Math.pow(1 + (payload.interestRate / 100), installmentsCount) - 1)
      : principal * (payload.interestRate / 100);
  const totalAmount = principal + totalInterest;
  const installmentAmount = totalAmount / installmentsCount;
  const principalAmount = principal / installmentsCount;
  const interestAmount = totalInterest / installmentsCount;

  return {
    totalInterest,
    totalAmount,
    installmentAmount,
    schedule: Array.from({ length: installmentsCount }, (_, index) => ({
      installmentNumber: index + 1,
      dueDate: addMonths(payload.firstDueDate, index),
      amount: installmentAmount,
      principalAmount,
      interestAmount,
    })),
  };
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-800/70 py-3 first:border-t-0 first:pt-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-slate-100">{value}</span>
    </div>
  );
}

export function LoanFormDialog({ customerOptions, editingLoanId, onOpenChange, open }: LoanFormDialogProps) {
  const router = useRouter();
  const [form, setForm] = useState<LoanFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const defaults = buildDefaultDates();

    if (!editingLoanId) {
      setForm({
        ...EMPTY_FORM,
        customerName: customerOptions[0] || "",
        issuedAt: defaults.issuedAt,
        firstDueDate: defaults.firstDueDate,
      });
      setError(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    void getPortfolioLoanDetails(editingLoanId)
      .then((response: PortfolioLoanDetailsResponse) => {
        if (!active) return;
        const loan = response.loan;
        setForm({
          customerName: loan?.customerName || "",
          principalAmount: String(toNumber(loan?.principalAmount) || ""),
          interestType: loan?.interestType || "composto",
          interestRate: String(toNumber(loan?.interestRate) || ""),
          fixedFeeAmount: String(toNumber(loan?.fixedFeeAmount) || ""),
          installmentsCount: String(toNumber(loan?.installmentCount) || ""),
          issuedAt: loan?.issuedAt || defaults.issuedAt,
          firstDueDate: loan?.firstDueDate || defaults.firstDueDate,
          observations: loan?.observations || "",
        });
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError instanceof Error ? requestError.message : "Falha ao carregar o emprestimo.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [customerOptions, editingLoanId, open]);

  const payload = useMemo(() => buildPayload(form), [form]);
  const preview = useMemo(() => calculatePreview(payload), [payload]);

  function updateField<Key extends keyof LoanFormState>(key: Key, value: LoanFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!payload.customerName) {
      setError("Selecione um cliente.");
      return;
    }

    if (payload.principalAmount <= 0) {
      setError("Informe um valor principal maior que zero.");
      return;
    }

    if (payload.interestType === "fixo") {
      if (payload.fixedFeeAmount < 0) {
        setError("O acrescimo fixo nao pode ser negativo.");
        return;
      }
    } else if (payload.interestRate <= 0) {
      setError("Informe uma taxa maior que zero.");
      return;
    }

    if (!payload.issuedAt || !payload.firstDueDate || payload.firstDueDate <= payload.issuedAt) {
      setError("O primeiro vencimento deve ser maior que a data de inicio.");
      return;
    }

    setSubmitting(true);

    try {
      if (editingLoanId) {
        await updatePortfolioLoan(editingLoanId, payload);
      } else {
        await createPortfolioLoan(payload);
      }

      router.refresh();
      onOpenChange(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao salvar o emprestimo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl overflow-hidden border-slate-700/70 bg-[linear-gradient(180deg,rgba(7,13,24,0.98),rgba(7,12,22,0.94))] p-0">
        <div className="max-h-[88vh] overflow-y-auto px-6 py-6">
          <DialogHeader className="pr-10">
            <DialogTitle>{editingLoanId ? "Editar emprestimo" : "Novo emprestimo"}</DialogTitle>
            <DialogDescription>
              Defina as informacoes, condicoes e agenda do contrato.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 text-center">
              <LoaderCircle className="size-6 animate-spin text-slate-300" />
              <p className="text-base font-semibold text-slate-100">Carregando emprestimo</p>
              <p className="text-sm leading-6 text-slate-400">Buscando dados do contrato para edicao.</p>
            </div>
          ) : (
            <form className="mt-6 grid gap-6" onSubmit={handleSubmit}>
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_320px]">
                <div className="grid gap-5">
                  <section className="rounded-[22px] border border-slate-700/35 bg-slate-950/30 p-5">
                    <h3 className="text-[0.82rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Informacoes basicas</h3>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <label className="grid gap-2">
                        <span className="text-sm text-slate-300">Cliente</span>
                        <select value={form.customerName} onChange={(event) => updateField("customerName", event.target.value)} className="h-11 rounded-2xl border border-border/70 bg-background/40 px-4 text-sm text-foreground outline-none transition focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/40">
                          <option value="" disabled>Selecione o cliente</option>
                          {customerOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-2">
                        <span className="text-sm text-slate-300">Valor principal (R$)</span>
                        <Input type="number" min="0.01" step="0.01" value={form.principalAmount} onChange={(event) => updateField("principalAmount", event.target.value)} placeholder="0.00" />
                      </label>
                    </div>
                  </section>

                  <section className="rounded-[22px] border border-slate-700/35 bg-slate-950/30 p-5">
                    <h3 className="text-[0.82rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Condicoes</h3>
                    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <label className="grid gap-2">
                        <span className="text-sm text-slate-300">Tipo de juros</span>
                        <select value={form.interestType} onChange={(event) => updateField("interestType", event.target.value as PortfolioLoanSimulationInterestType)} className="h-11 rounded-2xl border border-border/70 bg-background/40 px-4 text-sm text-foreground outline-none transition focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/40">
                          <option value="simples">Simples %</option>
                          <option value="composto">Composto %</option>
                          <option value="fixo">Fixo (valor total)</option>
                        </select>
                      </label>

                      {form.interestType === "fixo" ? (
                        <label className="grid gap-2">
                          <span className="text-sm text-slate-300">Acrescimo fixo (R$)</span>
                          <Input type="number" min="0" step="0.01" value={form.fixedFeeAmount} onChange={(event) => updateField("fixedFeeAmount", event.target.value)} placeholder="0.00" />
                        </label>
                      ) : (
                        <label className="grid gap-2">
                          <span className="text-sm text-slate-300">Taxa (%)</span>
                          <Input type="number" min="0.01" step="0.01" value={form.interestRate} onChange={(event) => updateField("interestRate", event.target.value)} placeholder="8" />
                        </label>
                      )}

                      <label className="grid gap-2">
                        <span className="text-sm text-slate-300">Parcelas</span>
                        <Input type="number" min="1" max="96" step="1" value={form.installmentsCount} onChange={(event) => updateField("installmentsCount", event.target.value)} placeholder="12" />
                      </label>
                    </div>
                  </section>

                  <section className="rounded-[22px] border border-slate-700/35 bg-slate-950/30 p-5">
                    <h3 className="text-[0.82rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Datas</h3>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <label className="grid gap-2">
                        <span className="text-sm text-slate-300">Data de inicio</span>
                        <Input type="date" value={form.issuedAt} onChange={(event) => updateField("issuedAt", event.target.value)} />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-sm text-slate-300">1o vencimento</span>
                        <Input type="date" value={form.firstDueDate} onChange={(event) => updateField("firstDueDate", event.target.value)} />
                      </label>
                    </div>
                  </section>

                  <section className="rounded-[22px] border border-slate-700/35 bg-slate-950/30 p-5">
                    <h3 className="text-[0.82rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Observacoes</h3>
                    <textarea value={form.observations} onChange={(event) => updateField("observations", event.target.value)} rows={4} className="mt-4 w-full rounded-2xl border border-border/70 bg-background/40 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/40" placeholder="Observacoes sobre o emprestimo" />
                  </section>
                </div>

                <aside className="rounded-[22px] border border-slate-700/35 bg-slate-950/30 p-5">
                  <h3 className="text-[0.82rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Resumo do emprestimo</h3>
                  <div className="mt-4 grid gap-3">
                    <SummaryRow label="Valor" value={formatCurrency(preview.totalAmount)} />
                    <SummaryRow label="Valor da parcela" value={formatCurrency(preview.installmentAmount)} />
                    <SummaryRow label="Parcelas" value={`${payload.installmentsCount}x`} />
                    <SummaryRow label="Taxa" value={payload.interestType === "fixo" ? formatCurrency(payload.fixedFeeAmount) : `${payload.interestRate}%`} />
                    <SummaryRow label="1o vencimento" value={payload.firstDueDate || "--"} />
                  </div>
                </aside>
              </div>

              <section className="rounded-[22px] border border-slate-700/35 bg-slate-950/30 p-5">
                <h3 className="text-[0.82rem] font-semibold uppercase tracking-[0.08em] text-slate-400">Agenda das parcelas</h3>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="border-y border-slate-800/70 text-left text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-400">
                        <th className="px-3 py-2">Parcela</th>
                        <th className="px-3 py-2">Data</th>
                        <th className="px-3 py-2 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.schedule.map((item) => (
                        <tr key={item.installmentNumber} className="border-t border-slate-800/70 text-sm text-slate-200">
                          <td className="px-3 py-3 font-semibold">#{item.installmentNumber}</td>
                          <td className="px-3 py-3">{item.dueDate || "--"}</td>
                          <td className="px-3 py-3 text-right font-number">{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {error ? (
                <div className="rounded-2xl border border-rose-400/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              ) : null}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Salvando..." : editingLoanId ? "Salvar alteracoes" : "Salvar emprestimo"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
