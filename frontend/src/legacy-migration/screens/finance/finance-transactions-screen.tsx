"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ApiClientError,
  createFinanceTransaction,
  deleteFinanceTransaction,
  listFinanceTransactions,
  type FinanceTransaction,
  type FinanceTransactionStatus,
  type FinanceTransactionType,
  updateFinanceTransaction,
} from "../../services";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";

type FinanceMode = "expense" | "income";
type Filter = "all" | "pending" | "paid" | "overdue" | "due-today";
type Tone = "success" | "error";
type DisplayKey = "paid" | "overdue" | "due-today" | "scheduled" | "pending";
type DisplayGroup = "paid" | "overdue" | "due-today" | "pending";

type Props = { mode: FinanceMode };
type Msg = { tone: Tone; text: string };
type FormState = {
  description: string;
  category: string;
  amount: string;
  date: string;
  status: FinanceTransactionStatus;
};

const PAGE_SIZE = 15;

const shared = {
  primaryButtonLabel: "Nova conta",
  searchPlaceholder: "Buscar contas ou categorias",
  summaryOverdueSuffix: "vencidas",
  summaryTodaySuffix: "vence hoje",
  summaryPendingSuffix: "pendentes",
  tablePrimaryHeader: "Conta",
  tableDateHeader: "Vencimento",
  tableNotesHeader: "Observacoes",
  tableActionsHeader: "Acoes",
  paginationSingular: "conta",
  paginationPlural: "contas",
  modalDescriptionLabel: "Conta",
  modalDateLabel: "Vencimento",
  modalSaveNewLabel: "Salvar conta",
  modalSaveEditLabel: "Salvar alteracoes",
  emptyTitle: "Nenhuma conta encontrada.",
  emptyNote: "Ajuste os filtros ou cadastre uma nova conta para preencher esta lista.",
  saveError: "Falha ao salvar a conta.",
  saveSuccessCreate: "Conta cadastrada com sucesso.",
  saveSuccessEdit: "Conta atualizada com sucesso.",
  deleteConfirm: "Deseja excluir esta conta?",
  deleteError: "Falha ao excluir a conta.",
  deleteSuccess: "Conta excluida com sucesso.",
  statusOverdueLabel: "Vencida",
  statusTodayLabel: "Vence hoje",
  statusScheduledLabel: "Agendada",
  statusPendingLabel: "Pendente",
};

const copyByMode = {
  expense: {
    ...shared,
    itemType: "expense" as FinanceTransactionType,
    pageTitle: "Contas a pagar",
    pageSubtitle: "Gerencie suas obrigacoes financeiras de forma eficiente.",
    searchAriaLabel: "Buscar contas",
    modalNewTitle: "Nova conta",
    modalEditTitle: "Editar conta",
    modalNewSubtitle: "Cadastre uma obrigacao financeira do modulo.",
    modalEditSubtitle: "Ajuste os dados financeiros antes de salvar a alteracao.",
    modalDescriptionPlaceholder: "Ex: Aluguel escritorio",
    modalCategoryPlaceholder: "Ex: Operacional",
    completedOptionLabel: "Paga",
    statusFilterPaidLabel: "Pagas",
    actionCompleteLabel: "Baixar",
    loadError: "Falha ao carregar as contas a pagar.",
    completeError: "Falha ao baixar a conta.",
    completeSuccess: "Conta baixada com sucesso.",
    observationPaid: "Pagamento registrado no sistema.",
    observationToday: "Compromisso previsto para hoje.",
    observationScheduled: "Pagamento agendado para esta data.",
    observationPending: "Aguardando baixa financeira.",
    statusPaidLabel: "Paga",
    systemCategories: ["Ajuste de caixa", "Desembolso de emprestimo"],
  },
  income: {
    ...shared,
    itemType: "income" as FinanceTransactionType,
    pageTitle: "Valores a receber",
    pageSubtitle: "Acompanhe valores previstos, atrasos e recebimentos de forma eficiente.",
    searchAriaLabel: "Buscar contas a receber",
    modalNewTitle: "Nova conta a receber",
    modalEditTitle: "Editar conta a receber",
    modalNewSubtitle: "Cadastre um valor previsto para recebimento.",
    modalEditSubtitle: "Ajuste os dados do recebimento antes de salvar a alteracao.",
    modalDescriptionPlaceholder: "Ex: Parcela cliente Joao",
    modalCategoryPlaceholder: "Ex: Receita recorrente",
    completedOptionLabel: "Recebida",
    statusFilterPaidLabel: "Recebidas",
    actionCompleteLabel: "Receber",
    loadError: "Falha ao carregar as contas a receber.",
    completeError: "Falha ao receber a conta.",
    completeSuccess: "Conta recebida com sucesso.",
    observationPaid: "Recebimento registrado no sistema.",
    observationToday: "Recebimento previsto para hoje.",
    observationScheduled: "Recebimento agendado para esta data.",
    observationPending: "Aguardando confirmacao financeira.",
    statusPaidLabel: "Recebida",
    systemCategories: ["Ajuste de caixa", "Recebimento de parcela"],
  },
};

function dIso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseDate(v: string) {
  const [y, m, d] = v.split("-").map(Number);
  if (!y || !m || !d) return new Date(Number.NaN);
  return new Date(y, m - 1, d);
}
function sod(d: Date) {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}
function som(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function sameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}
function monthLabel(d: Date) {
  const l = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(d);
  return l.charAt(0).toUpperCase() + l.slice(1);
}
function dateLabel(iso: string) {
  const d = parseDate(iso);
  if (Number.isNaN(d.getTime())) return "--";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}
function money(v: number) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v) || 0);
}
function msgClass(t: Tone) {
  return t === "success"
    ? "border border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
    : "border border-rose-400/35 bg-rose-500/10 text-rose-200";
}
function defaultForm(todayIso: string): FormState {
  return { description: "", category: "", amount: "", date: todayIso, status: "pending" };
}
function normalize(item: FinanceTransaction): FinanceTransaction {
  return {
    id: String(item.id || ""),
    type: item.type === "expense" ? "expense" : "income",
    amount: Number(item.amount || 0),
    category: String(item.category || "").trim(),
    date: String(item.date || ""),
    description: String(item.description || "").trim(),
    status: item.status === "completed" || item.status === "scheduled" ? item.status : "pending",
  };
}
function statusPillClass(k: DisplayKey) {
  if (k === "paid") return "border-emerald-400/35 bg-emerald-500/10 text-emerald-300";
  if (k === "overdue") return "border-rose-400/35 bg-rose-500/10 text-rose-300";
  if (k === "due-today") return "border-amber-400/35 bg-amber-500/10 text-amber-300";
  if (k === "scheduled") return "border-sky-400/35 bg-sky-500/10 text-sky-300";
  return "border-slate-500/40 bg-slate-700/40 text-slate-200";
}
function dueTextClass(g: DisplayGroup) {
  if (g === "overdue") return "text-rose-300";
  if (g === "due-today") return "text-amber-300";
  return "text-lm-text-muted";
}
function pageStatus(item: FinanceTransaction, today: Date, copy: (typeof copyByMode)[FinanceMode]) {
  const due = sod(parseDate(item.date));
  if (item.status === "completed") return { key: "paid", group: "paid", label: copy.statusPaidLabel } as const;
  if (due.getTime() < today.getTime()) return { key: "overdue", group: "overdue", label: copy.statusOverdueLabel } as const;
  if (due.getTime() === today.getTime()) return { key: "due-today", group: "due-today", label: copy.statusTodayLabel } as const;
  if (item.status === "scheduled") return { key: "scheduled", group: "pending", label: copy.statusScheduledLabel } as const;
  return { key: "pending", group: "pending", label: copy.statusPendingLabel } as const;
}
function observation(item: FinanceTransaction, st: { key: DisplayKey }, today: Date, copy: (typeof copyByMode)[FinanceMode]) {
  const due = sod(parseDate(item.date));
  const days = Math.floor((due.getTime() - today.getTime()) / 86400000);
  if (st.key === "paid") return copy.observationPaid;
  if (st.key === "overdue") return `Em atraso ha ${Math.abs(days)} dia(s).`;
  if (st.key === "due-today") return copy.observationToday;
  if (st.key === "scheduled") return copy.observationScheduled;
  return copy.observationPending;
}
function paginationSequence(currentPage: number, totalPages: number): Array<number | "..."> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  if (currentPage <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (currentPage >= totalPages - 2) [totalPages - 1, totalPages - 2, totalPages - 3].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const seq: Array<number | "..."> = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) seq.push("...");
    seq.push(p);
  });
  return seq;
}

export function FinanceTransactionsScreen({ mode }: Props) {
  const copy = copyByMode[mode];
  const todayIso = useMemo(() => dIso(new Date()), []);
  const today = useMemo(() => sod(new Date()), []);
  const systemCategories = useMemo(() => new Set(copy.systemCategories), [copy]);

  const [items, setItems] = useState<FinanceTransaction[]>([]);
  const [monthCursor, setMonthCursor] = useState(som(new Date()));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm(todayIso));
  const [saving, setSaving] = useState(false);

  const monthButtons = useMemo(() => [-1, 0, 1].map((n) => addMonths(monthCursor, n)), [monthCursor]);

  const scoped = useMemo(
    () => items.filter((item) => item.type === copy.itemType && !systemCategories.has(item.category)),
    [items, copy.itemType, systemCategories],
  );

  const monthItems = useMemo(() => scoped.filter((item) => sameMonth(parseDate(item.date), monthCursor)), [scoped, monthCursor]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const visible = monthItems
      .filter((item) => !term || item.description.toLowerCase().includes(term) || item.category.toLowerCase().includes(term))
      .filter((item) => {
        if (statusFilter === "all") return true;
        const st = pageStatus(item, today, copy);
        if (statusFilter === "pending") return st.group === "pending";
        return st.group === statusFilter;
      });
    const order: Record<DisplayKey, number> = { overdue: 0, "due-today": 1, scheduled: 2, pending: 3, paid: 4 };
    return [...visible].sort((a, b) => {
      const sa = pageStatus(a, today, copy);
      const sb = pageStatus(b, today, copy);
      const rank = order[sa.key] - order[sb.key];
      if (rank !== 0) return rank;
      const da = parseDate(a.date).getTime();
      const db = parseDate(b.date).getTime();
      if (sa.group === "paid" && sb.group === "paid") return db - da;
      if (da !== db) return da - db;
      return b.amount - a.amount;
    });
  }, [monthItems, search, statusFilter, today, copy]);

  const summary = useMemo(
    () =>
      monthItems.reduce(
        (acc, item) => {
          const g = pageStatus(item, today, copy).group;
          if (g === "overdue") acc.overdue += 1;
          if (g === "due-today") acc.dueToday += 1;
          if (g === "pending") acc.pending += 1;
          return acc;
        },
        { overdue: 0, dueToday: 0, pending: 0 },
      ),
    [monthItems, today, copy],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const end = filtered.length === 0 ? 0 : Math.min(currentPage * PAGE_SIZE, filtered.length);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  async function load(preserve: boolean) {
    const response = await listFinanceTransactions();
    const next = Array.isArray(response.data) ? response.data.map(normalize) : [];
    setItems(next);
    const pageItems = next.filter((item) => item.type === copy.itemType && !systemCategories.has(item.category));
    if (!preserve) {
      if (pageItems.length > 0) {
        const latest = [...pageItems].sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime())[0];
        setMonthCursor(som(parseDate(latest.date)));
      } else {
        setMonthCursor(som(new Date()));
      }
    } else if (!pageItems.length) {
      setMonthCursor(som(new Date()));
    }
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    void load(false)
      .catch((error) => {
        if (!active) return;
        setMsg({ tone: "error", text: error instanceof ApiClientError ? error.message || copy.loadError : copy.loadError });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [copy.loadError, copy.itemType, systemCategories]);

  function openNew() {
    setEditingId(null);
    setForm(defaultForm(todayIso));
    setModalOpen(true);
  }
  function openEdit(item: FinanceTransaction) {
    setEditingId(item.id);
    setForm({ description: item.description, category: item.category, amount: String(Number(item.amount || 0)), date: item.date, status: item.status });
    setModalOpen(true);
  }
  function close() {
    setModalOpen(false);
    setEditingId(null);
    setSaving(false);
    setForm(defaultForm(todayIso));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const description = form.description.trim();
    const category = form.category.trim();
    const amount = Number(String(form.amount).replace(",", "."));
    if (!description || !category) return setMsg({ tone: "error", text: "Preencha descricao e categoria." });
    if (!Number.isFinite(amount) || amount <= 0) return setMsg({ tone: "error", text: "Informe um valor maior que zero." });
    if (!form.date) return setMsg({ tone: "error", text: "Informe uma data de vencimento valida." });
    if (!["pending", "scheduled", "completed"].includes(form.status)) return setMsg({ tone: "error", text: "Situacao invalida." });
    setSaving(true);
    try {
      const payload = { type: copy.itemType, amount, category, date: form.date, description, status: form.status };
      if (editingId) {
        await updateFinanceTransaction(editingId, payload);
        setMsg({ tone: "success", text: copy.saveSuccessEdit });
      } else {
        await createFinanceTransaction(payload);
        setMsg({ tone: "success", text: copy.saveSuccessCreate });
      }
      setMonthCursor(som(parseDate(form.date)));
      setPage(1);
      setStatusFilter("all");
      setSearch("");
      close();
      await load(true);
    } catch (error) {
      setMsg({ tone: "error", text: error instanceof ApiClientError ? error.message || copy.saveError : copy.saveError });
    } finally {
      setSaving(false);
    }
  }

  async function complete(id: string) {
    try {
      await updateFinanceTransaction(id, { status: "completed" });
      await load(true);
      setMsg({ tone: "success", text: copy.completeSuccess });
    } catch (error) {
      setMsg({ tone: "error", text: error instanceof ApiClientError ? error.message || copy.completeError : copy.completeError });
    }
  }

  async function remove(id: string) {
    if (!window.confirm(copy.deleteConfirm)) return;
    try {
      await deleteFinanceTransaction(id);
      await load(true);
      setMsg({ tone: "success", text: copy.deleteSuccess });
    } catch (error) {
      setMsg({ tone: "error", text: error instanceof ApiClientError ? error.message || copy.deleteError : copy.deleteError });
    }
  }

  return (
    <div className="w-full">
      <header className="mb-6">
        <h1 className="text-[clamp(2rem,1.3vw+1.2rem,2.85rem)] font-extrabold tracking-[-0.04em] text-lm-text">{copy.pageTitle}</h1>
        <p className="mt-1 text-base text-lm-text-muted">{copy.pageSubtitle}</p>
      </header>
      <section className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
        <label aria-label={copy.searchAriaLabel} className="flex min-h-[56px] items-center rounded-2xl border border-sky-500/20 bg-slate-950/70 px-4">
          <Input className="h-auto border-0 bg-transparent p-0 text-base text-lm-text placeholder:text-lm-text-subtle focus-visible:ring-0 focus-visible:ring-offset-0" onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder={copy.searchPlaceholder} type="search" value={search} />
        </label>
        <div className="inline-flex items-center gap-1 rounded-2xl border border-sky-500/20 bg-slate-950/70 p-1">
          {monthButtons.map((m) => {
            const active = sameMonth(m, monthCursor);
            return (
              <button aria-current={active ? "true" : undefined} className={`min-h-[44px] min-w-[112px] rounded-xl px-3 text-sm font-bold transition ${active ? "border border-sky-400/50 bg-[linear-gradient(135deg,rgba(37,99,235,.94),rgba(59,130,246,.9))] text-white" : "text-lm-text-muted hover:bg-slate-800 hover:text-lm-text"}`} key={`${m.getFullYear()}-${m.getMonth()}`} onClick={() => { setMonthCursor(som(m)); setPage(1); }} type="button">{monthLabel(m)}</button>
            );
          })}
        </div>
        <Button className="min-h-[56px] rounded-2xl border border-sky-400/60 bg-[linear-gradient(135deg,rgba(37,99,235,.96),rgba(59,130,246,.92))] px-5 text-base font-extrabold text-lm-text" onClick={openNew} type="button">{copy.primaryButtonLabel}</Button>
      </section>
      <div className="mb-4 flex flex-wrap gap-2">
        {[{ key: "all" as const, label: "Todas" }, { key: "pending" as const, label: "Pendentes" }, { key: "paid" as const, label: copy.statusFilterPaidLabel }, { key: "overdue" as const, label: "Vencidas" }, { key: "due-today" as const, label: "Vencendo hoje" }].map((chip) => (
          <button aria-current={statusFilter === chip.key ? "true" : undefined} className={`min-h-[38px] rounded-full border px-4 text-sm font-bold transition ${statusFilter === chip.key ? "border-sky-400/50 bg-[linear-gradient(135deg,rgba(37,99,235,.92),rgba(59,130,246,.9))] text-white" : "border-slate-600 bg-slate-900/70 text-lm-text-muted hover:bg-slate-800 hover:text-lm-text"}`} key={chip.key} onClick={() => { setStatusFilter(chip.key); setPage(1); }} type="button">{chip.label}</button>
        ))}
      </div>
      {msg ? <div className={`mb-4 rounded-xl px-3 py-2 text-sm ${msgClass(msg.tone)}`}>{msg.text}</div> : null}
      <section className="overflow-hidden rounded-3xl border border-sky-500/20 bg-[linear-gradient(180deg,rgba(8,16,31,.96),rgba(8,15,28,.88))]">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-700 px-5 py-4 text-xs font-extrabold uppercase tracking-[0.08em]">
          <span className="text-rose-300">{summary.overdue} {copy.summaryOverdueSuffix}</span><span className="text-slate-500">|</span><span className="text-amber-300">{summary.dueToday} {copy.summaryTodaySuffix}</span><span className="text-slate-500">|</span><span className="text-sky-300">{summary.pending} {copy.summaryPendingSuffix}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-collapse">
            <thead><tr><th className="border-b border-slate-700 px-4 py-3 text-left text-xs font-extrabold uppercase tracking-[0.08em] text-sky-200">{copy.tablePrimaryHeader}</th><th className="border-b border-slate-700 px-4 py-3 text-left text-xs font-extrabold uppercase tracking-[0.08em] text-sky-200">Valor (R$)</th><th className="border-b border-slate-700 px-4 py-3 text-left text-xs font-extrabold uppercase tracking-[0.08em] text-sky-200">{copy.tableDateHeader}</th><th className="border-b border-slate-700 px-4 py-3 text-left text-xs font-extrabold uppercase tracking-[0.08em] text-sky-200">Status</th><th className="border-b border-slate-700 px-4 py-3 text-left text-xs font-extrabold uppercase tracking-[0.08em] text-sky-200">{copy.tableNotesHeader}</th><th className="border-b border-slate-700 px-4 py-3 text-right text-xs font-extrabold uppercase tracking-[0.08em] text-sky-200">{copy.tableActionsHeader}</th></tr></thead>
            <tbody>
              {loading ? <tr><td className="px-5 py-10 text-center text-lm-text-muted" colSpan={6}>Carregando...</td></tr> : null}
              {!loading && visible.length === 0 ? <tr><td className="px-5 py-14 text-center text-lm-text-muted" colSpan={6}><p className="text-base font-extrabold text-lm-text">{copy.emptyTitle}</p><p className="mt-1 text-sm">{copy.emptyNote}</p></td></tr> : null}
              {!loading ? visible.map((item) => {
                const st = pageStatus(item, today, copy);
                return (
                  <tr className="border-t border-slate-800/70 hover:bg-slate-900/40" key={item.id}>
                    <td className="px-4 py-4"><p className="text-base font-extrabold text-lm-text">{item.description || "Conta sem descricao"}</p><p className="mt-1 text-sm text-lm-text-subtle">{item.category || "Sem categoria"}</p></td>
                    <td className="px-4 py-4"><p className="text-base font-extrabold text-lm-text">{money(item.amount)}</p></td>
                    <td className="px-4 py-4"><p className={`text-sm font-semibold ${dueTextClass(st.group)}`}>{dateLabel(item.date)}</p></td>
                    <td className="px-4 py-4"><span className={`inline-flex min-h-[28px] items-center rounded-full border px-3 text-[0.72rem] font-extrabold uppercase tracking-[0.08em] ${statusPillClass(st.key)}`}>{st.label}</span></td>
                    <td className="px-4 py-4"><p className="text-sm text-lm-text-muted">{observation(item, st, today, copy)}</p></td>
                    <td className="px-4 py-4"><div className="flex items-center justify-end gap-2">{st.group !== "paid" ? <button className="inline-flex min-h-[36px] items-center rounded-xl border border-sky-400/50 bg-[linear-gradient(135deg,rgba(37,99,235,.94),rgba(59,130,246,.9))] px-3 text-sm font-extrabold text-lm-text" onClick={() => void complete(item.id)} type="button">{copy.actionCompleteLabel}</button> : null}<button className="inline-flex min-h-[36px] items-center rounded-xl border border-slate-600 bg-slate-800 px-3 text-sm font-bold text-lm-text-muted hover:text-lm-text" onClick={() => openEdit(item)} type="button">Editar</button><button className="inline-flex min-h-[36px] items-center rounded-xl border border-rose-500/40 bg-rose-950/30 px-3 text-sm font-bold text-rose-300 hover:text-rose-200" onClick={() => void remove(item.id)} type="button">Excluir</button></div></td>
                  </tr>
                );
              }) : null}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-700 px-4 py-3">
          <p className="text-sm text-lm-text-muted">Mostrando {start}-{end} de {filtered.length} {filtered.length === 1 ? copy.paginationSingular : copy.paginationPlural}</p>
          {filtered.length > PAGE_SIZE ? <div className="flex flex-wrap items-center justify-end gap-1"><button className="min-h-[34px] rounded-lg border border-slate-600 px-3 text-sm text-lm-text-muted hover:border-slate-500 hover:text-lm-text disabled:cursor-not-allowed disabled:opacity-50" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} type="button">Anterior</button>{paginationSequence(currentPage, totalPages).map((entry, index) => entry === "..." ? <span className="px-2 text-sm text-lm-text-subtle" key={`ellipsis-${index}`}>...</span> : <button aria-current={entry === currentPage ? "page" : undefined} className={`min-h-[34px] rounded-lg border px-3 text-sm ${entry === currentPage ? "border-sky-400/50 bg-[linear-gradient(135deg,rgba(37,99,235,.92),rgba(59,130,246,.9))] font-bold text-white" : "border-slate-600 text-lm-text-muted hover:border-slate-500 hover:text-lm-text"}`} key={`page-${entry}`} onClick={() => setPage(entry)} type="button">{entry}</button>)}<button className="min-h-[34px] rounded-lg border border-slate-600 px-3 text-sm text-lm-text-muted hover:border-slate-500 hover:text-lm-text disabled:cursor-not-allowed disabled:opacity-50" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} type="button">Proxima</button></div> : null}
        </div>
      </section>
      {modalOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"><div className="w-full max-w-xl rounded-2xl border border-lm-border bg-lm-card p-5 shadow-2xl"><h2 className="text-xl font-extrabold text-lm-text">{editingId ? copy.modalEditTitle : copy.modalNewTitle}</h2><p className="mt-1 text-sm text-lm-text-muted">{editingId ? copy.modalEditSubtitle : copy.modalNewSubtitle}</p><form className="mt-4 grid grid-cols-1 gap-4" onSubmit={save}><div><label className="mb-1 block text-sm text-lm-text-muted" htmlFor="financeDescription">{copy.modalDescriptionLabel}</label><Input className="h-11 border-lm-border bg-lm-sidebar text-lm-text" id="financeDescription" maxLength={300} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} placeholder={copy.modalDescriptionPlaceholder} required type="text" value={form.description} /></div><div className="grid grid-cols-1 gap-4 md:grid-cols-2"><div><label className="mb-1 block text-sm text-lm-text-muted" htmlFor="financeCategory">Categoria</label><Input className="h-11 border-lm-border bg-lm-sidebar text-lm-text" id="financeCategory" maxLength={120} onChange={(e) => setForm((c) => ({ ...c, category: e.target.value }))} placeholder={copy.modalCategoryPlaceholder} required type="text" value={form.category} /></div><div><label className="mb-1 block text-sm text-lm-text-muted" htmlFor="financeAmount">Valor (R$)</label><Input className="h-11 border-lm-border bg-lm-sidebar text-lm-text" id="financeAmount" min="0.01" onChange={(e) => setForm((c) => ({ ...c, amount: e.target.value }))} required step="0.01" type="number" value={form.amount} /></div></div><div className="grid grid-cols-1 gap-4 md:grid-cols-2"><div><label className="mb-1 block text-sm text-lm-text-muted" htmlFor="financeDate">{copy.modalDateLabel}</label><Input className="h-11 border-lm-border bg-lm-sidebar text-lm-text" id="financeDate" onChange={(e) => setForm((c) => ({ ...c, date: e.target.value }))} required type="date" value={form.date} /></div><div><label className="mb-1 block text-sm text-lm-text-muted" htmlFor="financeStatus">Situacao</label><select className="h-11 w-full rounded-md border border-lm-border bg-lm-sidebar px-3 text-sm text-lm-text" id="financeStatus" onChange={(e) => setForm((c) => ({ ...c, status: e.target.value as FinanceTransactionStatus }))} value={form.status}><option value="pending">Pendente</option><option value="scheduled">Agendada</option><option value="completed">{copy.completedOptionLabel}</option></select></div></div><div className="mt-2 flex items-center justify-end gap-2"><Button onClick={close} type="button" variant="ghost">Cancelar</Button><Button disabled={saving} type="submit">{saving ? "Salvando..." : editingId ? copy.modalSaveEditLabel : copy.modalSaveNewLabel}</Button></div></form></div></div> : null}
    </div>
  );
}
