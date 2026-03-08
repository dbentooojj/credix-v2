"use client";

import { useDeferredValue, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  CalendarClock,
  CheckCircle2,
  LoaderCircle,
  PencilLine,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  createFinanceTransaction,
  deleteFinanceTransaction,
  listFinanceTransactions,
  type FinanceTransaction,
  type FinanceTransactionStatus,
  type FinanceTransactionType,
  updateFinanceTransaction,
} from "@/src/lib/api";
import {
  formatFinanceCurrency,
  formatFinanceDate,
  getFinanceStatusLabel,
  getFinanceStatusVariant,
  getFinanceTodayDate,
  getFinanceViewConfig,
  isFinanceTransactionOpen,
  isFinanceTransactionOverdue,
} from "@/src/lib/finance";
import { cn } from "@/src/lib/utils";
import { StatCard } from "@/src/components/admin/stat-card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";

type FinanceWorkspaceProps = {
  mode: FinanceTransactionType;
};

type FinanceFormState = {
  description: string;
  category: string;
  amount: string;
  date: string;
  status: FinanceTransactionStatus;
};

const selectClassName =
  "flex h-11 w-full rounded-2xl border border-border/70 bg-background/40 px-4 py-2 text-sm text-foreground outline-none transition-colors focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/40";

function createEmptyForm(): FinanceFormState {
  return {
    description: "",
    category: "",
    amount: "",
    date: getFinanceTodayDate(),
    status: "pending",
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Falha ao concluir a operacao.";
}

export function FinanceWorkspace({ mode }: FinanceWorkspaceProps) {
  const config = getFinanceViewConfig(mode);
  const deferredMode = useDeferredValue(mode);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [statusFilter, setStatusFilter] = useState<FinanceTransactionStatus | "all">("all");
  const [form, setForm] = useState<FinanceFormState>(createEmptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function loadTransactions() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await listFinanceTransactions({ type: deferredMode });
      setTransactions(response.data);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadTransactions();
  }, [deferredMode]);

  const today = getFinanceTodayDate();
  const filteredTransactions = transactions.filter((transaction) => {
    if (statusFilter !== "all" && transaction.status !== statusFilter) {
      return false;
    }

    if (deferredSearch) {
      const haystack = `${transaction.description} ${transaction.category}`.toLowerCase();
      const needle = deferredSearch.trim().toLowerCase();
      if (!haystack.includes(needle)) {
        return false;
      }
    }

    return true;
  });

  const openTransactions = filteredTransactions.filter((transaction) => isFinanceTransactionOpen(transaction));
  const overdueTransactions = filteredTransactions.filter((transaction) => isFinanceTransactionOverdue(transaction, today));
  const dueTodayTransactions = filteredTransactions.filter((transaction) => {
    return isFinanceTransactionOpen(transaction) && transaction.date === today;
  });
  const totalVisibleAmount = filteredTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const openVisibleAmount = openTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);

  function resetForm() {
    setForm(createEmptyForm());
    setEditingId(null);
  }

  function startEditing(transaction: FinanceTransaction) {
    setEditingId(transaction.id);
    setForm({
      description: transaction.description,
      category: transaction.category,
      amount: String(transaction.amount),
      date: transaction.date,
      status: transaction.status,
    });
    setFeedback(null);
    setError(null);
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setFeedback(null);

    const amount = Number(form.amount.replace(",", "."));

    if (!Number.isFinite(amount) || amount <= 0) {
      setIsSaving(false);
      setError("Informe um valor valido maior que zero.");
      return;
    }

    try {
      const payload = {
        type: mode,
        amount,
        category: form.category.trim(),
        date: form.date,
        description: form.description.trim(),
        status: form.status,
      };

      if (editingId) {
        await updateFinanceTransaction(editingId, payload);
        setFeedback(mode === "expense" ? "Conta atualizada." : "Recebimento atualizado.");
      } else {
        await createFinanceTransaction(payload);
        setFeedback(mode === "expense" ? "Conta criada." : "Recebimento criado.");
      }

      resetForm();
      await loadTransactions();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsSaving(false);
    }
  }

  async function completeTransaction(transaction: FinanceTransaction) {
    setError(null);
    setFeedback(null);

    try {
      await updateFinanceTransaction(transaction.id, { status: "completed" });
      setFeedback(mode === "expense" ? "Conta baixada." : "Recebimento confirmado.");
      await loadTransactions();
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    }
  }

  async function removeTransaction(transaction: FinanceTransaction) {
    const confirmed = window.confirm(
      mode === "expense"
        ? "Excluir esta conta a pagar?"
        : "Excluir este valor a receber?",
    );

    if (!confirmed) return;

    setError(null);
    setFeedback(null);

    try {
      await deleteFinanceTransaction(transaction.id);

      if (editingId === transaction.id) {
        resetForm();
      }

      setFeedback(mode === "expense" ? "Conta excluida." : "Recebimento excluido.");
      await loadTransactions();
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge className="gap-2">
            {mode === "expense" ? <ArrowUpFromLine className="size-3.5" /> : <ArrowDownToLine className="size-3.5" />}
            {config.kicker}
          </Badge>
          <Badge variant={mode === "expense" ? "warning" : "success"}>Slice funcional</Badge>
        </div>
        <div className="space-y-3">
          <h2 className="max-w-4xl font-display text-4xl leading-[0.95] tracking-[-0.08em] text-foreground sm:text-5xl">
            {config.title}
          </h2>
          <p className="max-w-3xl text-base leading-8 text-muted-foreground">{config.summary}</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          eyebrow="Volume visivel"
          value={formatFinanceCurrency(totalVisibleAmount)}
          title={config.focusLabel}
          note={`${filteredTransactions.length} ${filteredTransactions.length === 1 ? "registro" : "registros"} no recorte atual.`}
        />
        <StatCard
          eyebrow="Em aberto"
          value={formatFinanceCurrency(openVisibleAmount)}
          title="Pendentes e agendadas"
          note={`${openTransactions.length} itens aguardando conclusao.`}
        />
        <StatCard
          eyebrow="Vence hoje"
          value={String(dueTodayTransactions.length).padStart(2, "0")}
          title="Prioridade imediata"
          note="Itens abertos com vencimento no dia atual."
        />
        <StatCard
          eyebrow="Atrasadas"
          value={String(overdueTransactions.length).padStart(2, "0")}
          title="Atencao"
          note="Lancamentos em aberto com vencimento anterior a hoje."
        />
      </section>

      {(error || feedback) ? (
        <Card className={cn(
          "border-border/60 bg-card/75",
          error ? "border-destructive/40" : "border-success/30",
        )}>
          <CardContent className="flex items-start gap-3 p-5">
            {error ? (
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
            ) : (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
            )}
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">{error ? "Falha na operacao" : "Atualizado"}</p>
              <p className="text-sm leading-7 text-muted-foreground">{error || feedback}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_380px]">
        <Card className="border-border/60 bg-card/75">
          <CardHeader className="gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{config.listTitle}</Badge>
                <Badge variant={mode === "expense" ? "warning" : "success"}>{config.focusLabel}</Badge>
              </div>
              <CardTitle className="text-2xl">{config.listTitle}</CardTitle>
              <CardDescription className="text-sm leading-7 text-muted-foreground md:text-base">
                {config.listDescription}
              </CardDescription>
            </div>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por descricao ou categoria"
                  className="pl-11"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as FinanceTransactionStatus | "all")}
                className={selectClassName}
              >
                <option value="all">Todos os status</option>
                <option value="pending">Pendentes</option>
                <option value="scheduled">Agendados</option>
                <option value="completed">{config.completeStatusLabel}</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-32 animate-pulse rounded-[26px] border border-border/50 bg-background/25"
                  />
                ))}
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-border/70 bg-background/25 p-8 text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-border/70 bg-background/40">
                  <CalendarClock className="size-6 text-muted-foreground" />
                </div>
                <div className="mt-4 space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">{config.emptyTitle}</h3>
                  <p className="mx-auto max-w-md text-sm leading-7 text-muted-foreground">{config.emptyText}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTransactions.map((transaction) => {
                  const isOverdue = isFinanceTransactionOverdue(transaction, today);

                  return (
                    <article
                      key={transaction.id}
                      className={cn(
                        "rounded-[28px] border border-border/60 bg-background/30 p-5 transition-colors",
                        isOverdue && "border-destructive/40 bg-destructive/5",
                      )}
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-4">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">{transaction.category}</Badge>
                            <Badge variant={getFinanceStatusVariant(transaction.status)}>
                              {getFinanceStatusLabel(transaction.status, mode)}
                            </Badge>
                            {isOverdue ? <Badge variant="destructive">Atrasada</Badge> : null}
                          </div>

                          <div className="space-y-1">
                            <h3 className="text-lg font-semibold text-foreground">{transaction.description}</h3>
                            <p className="text-sm leading-7 text-muted-foreground">
                              Vencimento em {formatFinanceDate(transaction.date)}.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 lg:items-end">
                          <div className="text-3xl font-semibold tracking-[-0.08em] text-foreground">
                            {formatFinanceCurrency(transaction.amount)}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {transaction.status !== "completed" ? (
                              <Button
                                type="button"
                                size="sm"
                                variant={mode === "expense" ? "warning" : "success"}
                                onClick={() => void completeTransaction(transaction)}
                              >
                                {config.completeActionLabel}
                              </Button>
                            ) : null}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => startEditing(transaction)}
                            >
                              <PencilLine className="size-4" />
                              Editar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => void removeTransaction(transaction)}
                            >
                              <Trash2 className="size-4" />
                              Excluir
                            </Button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/60 bg-card/75">
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant={editingId ? "outline" : mode === "expense" ? "warning" : "success"}>
                  {editingId ? "Modo edicao" : "Acao principal"}
                </Badge>
                <Badge variant="outline">{config.focusLabel}</Badge>
              </div>
              <CardTitle className="text-2xl">{config.createTitle}</CardTitle>
              <CardDescription className="text-sm leading-7 text-muted-foreground">
                {config.createDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={submitForm}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor={`${mode}-description`}>
                    Descricao
                  </label>
                  <Input
                    id={`${mode}-description`}
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Descreva o lancamento"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor={`${mode}-category`}>
                    Categoria
                  </label>
                  <Input
                    id={`${mode}-category`}
                    value={form.category}
                    onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                    placeholder="Ex.: fornecedores, servicos, recebiveis"
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor={`${mode}-amount`}>
                      Valor
                    </label>
                    <Input
                      id={`${mode}-amount`}
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={form.amount}
                      onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor={`${mode}-date`}>
                      Vencimento
                    </label>
                    <Input
                      id={`${mode}-date`}
                      type="date"
                      value={form.date}
                      onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor={`${mode}-status`}>
                    Status inicial
                  </label>
                  <select
                    id={`${mode}-status`}
                    value={form.status}
                    onChange={(event) => setForm((current) => ({
                      ...current,
                      status: event.target.value as FinanceTransactionStatus,
                    }))}
                    className={selectClassName}
                  >
                    <option value="pending">Pendente</option>
                    <option value="scheduled">Agendada</option>
                    <option value="completed">{config.completeStatusLabel}</option>
                  </select>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <Button type="submit" variant={mode === "expense" ? "warning" : "success"} disabled={isSaving}>
                    {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    {editingId ? config.updateActionLabel : config.createActionLabel}
                  </Button>
                  {editingId ? (
                    <Button type="button" variant="outline" onClick={resetForm} disabled={isSaving}>
                      Cancelar edicao
                    </Button>
                  ) : null}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/75">
            <CardHeader className="space-y-3">
              <Badge variant="outline" className="w-fit">
                Padrao da migracao
              </Badge>
              <CardTitle className="text-2xl">O que esta consolidado aqui</CardTitle>
              <CardDescription className="text-sm leading-7 text-muted-foreground">
                A mesma base visual e de dados serve para `pagar` e `receber`, mudando so o contexto.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                "Backend novo respondendo apenas com JSON.",
                "Frontend dono da experiencia e dos estados de tela.",
                "Componentes reutilizaveis para os dois fluxos financeiros.",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[22px] border border-border/60 bg-background/30 px-4 py-4 text-sm leading-7 text-muted-foreground"
                >
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
