"use client";

import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ApiClientError, getLegacyTableData, replaceLegacyTableData, type LegacyTableRow } from "../../services";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";

type SortField = "name" | "status" | "open_total" | "overdue_count" | "loans_count" | "created_at";
type SortDir = "asc" | "desc";
type StatusFilter = "Todos" | "Ativo" | "Inativo" | "Atrasado" | "Quitado";

type DebtorRow = LegacyTableRow & {
  id?: string | number | null;
  name?: string;
  cpf?: string | null;
  document?: string | null;
  phone?: string;
  email?: string;
  address?: string;
  status?: string;
  created_at?: string;
  createdAt?: string;
};

type LoanRow = LegacyTableRow & {
  debtor_id?: string | number | null;
  debtorId?: string | number | null;
};

type InstallmentRow = LegacyTableRow & {
  debtor_id?: string | number | null;
  debtorId?: string | number | null;
  amount?: number | string | null;
  value?: number | string | null;
  status?: string;
  due_date?: string | null;
  dueDate?: string | null;
  payment_date?: string | null;
  paymentDate?: string | null;
};

type DebtorStats = {
  uiStatus: "Ativo" | "Inativo" | "Atrasado" | "Quitado";
  registrationStatus: "Ativo" | "Inativo";
  financialSituation: "Sem emprestimo" | "Em dia" | "Atrasado";
  loansCount: number;
  overdueCount: number;
  openTotal: number;
  maxOverdueDays: number | null;
  punctualityText: string;
  trendText: string;
  lastPaymentText: string;
  score: number;
};

type DebtorForm = {
  name: string;
  phone: string;
  cpf: string;
  email: string;
  status: "Ativo" | "Inativo";
  address: string;
};

const EMPTY_FORM: DebtorForm = { name: "", phone: "", cpf: "", email: "", status: "Ativo", address: "" };
const STATUS_OPTIONS: StatusFilter[] = ["Todos", "Ativo", "Inativo", "Atrasado", "Quitado"];
const SORT_OPTIONS: Array<{ value: SortField; label: string }> = [
  { value: "name", label: "Nome" },
  { value: "status", label: "Status" },
  { value: "open_total", label: "Maior em aberto" },
  { value: "overdue_count", label: "Parcelas em atraso" },
  { value: "loans_count", label: "Emprestimos" },
  { value: "created_at", label: "Data de cadastro" },
];

function toNumber(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function toDigits(v: unknown) {
  return String(v ?? "").replace(/\D/g, "");
}
function sameId(a: unknown, b: unknown) {
  return String(a ?? "") === String(b ?? "");
}
function startOfDay(v: unknown) {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}
function formatCurrency(v: unknown) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(toNumber(v));
}
function formatDate(v: unknown) {
  const d = startOfDay(v);
  if (!d) return "-";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}
function formatPhone(v: unknown) {
  const d = toDigits(v);
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return String(v ?? "-") || "-";
}
function formatDocument(v: unknown) {
  const d = toDigits(v);
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  return String(v ?? "-") || "-";
}
function normalizeStatus(v: unknown): "Ativo" | "Inativo" | "Atrasado" | "Quitado" {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "ativo") return "Ativo";
  if (s === "inativo") return "Inativo";
  if (s === "atrasado") return "Atrasado";
  if (s === "quitado") return "Quitado";
  return "Inativo";
}
function normalizeEditableStatus(v: unknown): "Ativo" | "Inativo" {
  const s = normalizeStatus(v);
  return s === "Inativo" || s === "Quitado" ? "Inativo" : "Ativo";
}
function defaultSortDir(s: SortField): SortDir {
  return ["open_total", "overdue_count", "loans_count", "created_at"].includes(s) ? "desc" : "asc";
}
function scoreStyles(score: number) {
  if (score >= 850) return { badge: "border-emerald-400/60 bg-emerald-500/15 text-emerald-300", dot: "bg-emerald-400" };
  if (score >= 700) return { badge: "border-amber-400/60 bg-amber-500/15 text-amber-300", dot: "bg-amber-400" };
  if (score >= 550) return { badge: "border-orange-400/60 bg-orange-500/15 text-orange-300", dot: "bg-orange-400" };
  return { badge: "border-rose-400/60 bg-rose-500/15 text-rose-300", dot: "bg-rose-400" };
}

export function DebtorsScreen() {
  const [debtors, setDebtors] = useState<DebtorRow[]>([]);
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [installments, setInstallments] = useState<InstallmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Todos");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>(defaultSortDir("name"));
  const [pageSize, setPageSize] = useState(8);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [form, setForm] = useState<DebtorForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const today = useMemo(() => startOfDay(new Date()) || new Date(), []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const sync = () => setPageSize(media.matches ? 6 : 8);
    sync();
    media.addEventListener?.("change", sync);
    return () => media.removeEventListener?.("change", sync);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => banner && setBanner(null), 4200);
    return () => window.clearTimeout(id);
  }, [banner]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const [d, l, i] = await Promise.all([
          getLegacyTableData<DebtorRow>("debtors"),
          getLegacyTableData<LoanRow>("loans"),
          getLegacyTableData<InstallmentRow>("installments"),
        ]);
        setDebtors(Array.isArray(d.data) ? d.data : []);
        setLoans(Array.isArray(l.data) ? l.data : []);
        setInstallments(Array.isArray(i.data) ? i.data : []);
      } catch (error) {
        setBanner({ tone: "error", text: error instanceof ApiClientError ? error.message : "Erro ao carregar dados." });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const statsByDebtor = useMemo(() => {
    const map = new Map<string, DebtorStats>();
    debtors.forEach((debtor) => {
      const id = String(debtor.id ?? "");
      const debtorLoans = loans.filter((l) => sameId(l.debtor_id ?? l.debtorId, debtor.id));
      const debtorInstallments = installments.filter((ins) => sameId(ins.debtor_id ?? ins.debtorId, debtor.id));
      let overdueCount = 0;
      let openTotal = 0;
      let maxOverdueDays: number | null = null;
      let onTimePaid = 0;
      let paidLate = 0;
      let lateOpen = 0;
      let lastPayment: Date | null = null;
      let recent = 0;
      let previous = 0;
      const recentStart = new Date(today.getTime());
      recentStart.setDate(recentStart.getDate() - 90);
      const prevEnd = new Date(recentStart.getTime());
      prevEnd.setDate(prevEnd.getDate() - 1);
      const prevStart = new Date(prevEnd.getTime());
      prevStart.setDate(prevStart.getDate() - 90);
      debtorInstallments.forEach((ins) => {
        const due = startOfDay(ins.due_date ?? ins.dueDate);
        const payment = startOfDay(ins.payment_date ?? ins.paymentDate);
        const status = String(ins.status ?? "").trim().toLowerCase();
        const amount = toNumber(ins.amount ?? ins.value);
        if (payment && (!lastPayment || payment > lastPayment)) lastPayment = payment;
        if (payment && payment >= recentStart && payment <= today) recent += amount;
        if (payment && payment >= prevStart && payment <= prevEnd) previous += amount;
        const paid = status === "pago" || Boolean(payment);
        if (due && !paid && (status === "atrasado" || due < today)) {
          overdueCount += 1;
          lateOpen += 1;
          const days = Math.max(0, Math.floor((today.getTime() - due.getTime()) / 86400000));
          if (maxOverdueDays === null || days > maxOverdueDays) maxOverdueDays = days;
        }
        if (due && !paid && status !== "atrasado" && due >= today) openTotal += amount;
        if (due && paid) {
          const late = payment ? Math.max(Math.floor((payment.getTime() - due.getTime()) / 86400000), 0) : 0;
          if (late === 0) onTimePaid += 1;
          else paidLate += 1;
        }
      });
      const totalHistory = onTimePaid + paidLate + lateOpen;
      const onTimePct = totalHistory > 0 ? (onTimePaid / totalHistory) * 100 : null;
      const trend = previous <= 0 ? (recent > 0 ? 100 : 0) : ((recent - previous) / Math.abs(previous)) * 100;
      const uiStatus = overdueCount > 0 ? "Atrasado" : normalizeStatus(debtor.status);
      const score = Math.max(0, Math.min(1000, Math.round(700 + onTimePaid * 12 - paidLate * 20 - lateOpen * 55)));
      map.set(id, {
        uiStatus,
        registrationStatus: normalizeEditableStatus(debtor.status),
        loansCount: debtorLoans.length,
        overdueCount,
        openTotal,
        maxOverdueDays,
        financialSituation: debtorLoans.length <= 0 ? "Sem emprestimo" : overdueCount > 0 ? "Atrasado" : "Em dia",
        punctualityText: onTimePct === null ? "Pontualidade 90d: sem vencimentos" : `Pontualidade 90d: ${onTimePct.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`,
        trendText: previous <= 0 && recent > 0 ? "Tendencia 3M: up sem base comparativa" : `Tendencia 3M: ${Math.abs(trend) < 0.05 ? "estavel" : `${trend > 0 ? "up" : "down"} ${Math.abs(trend).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`}`,
        lastPaymentText: lastPayment ? `Ultimo pagamento: ${formatDate(lastPayment)}` : "Ultimo pagamento: sem registro",
        score,
      });
    });
    return map;
  }, [debtors, installments, loans, today]);

  const metrics = useMemo(() => {
    const total = debtors.length;
    const active = debtors.filter((d) => statsByDebtor.get(String(d.id ?? ""))?.uiStatus === "Ativo").length;
    const inactive = debtors.filter((d) => ["Inativo", "Quitado"].includes(statsByDebtor.get(String(d.id ?? ""))?.uiStatus || "")).length;
    const overdue = debtors.filter((d) => statsByDebtor.get(String(d.id ?? ""))?.uiStatus === "Atrasado").length;
    return { total, active, inactive, overdue };
  }, [debtors, statsByDebtor]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...debtors]
      .filter((debtor) => {
        const stats = statsByDebtor.get(String(debtor.id ?? ""));
        const uiStatus = stats?.uiStatus || "Inativo";
        if (statusFilter !== "Todos" && uiStatus !== statusFilter) return false;
        if (!q) return true;
        const haystack = `${debtor.name || ""} ${debtor.phone || ""} ${debtor.document || debtor.cpf || ""} ${debtor.email || ""}`.toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => {
        const dir = sortDir === "desc" ? -1 : 1;
        const sa = statsByDebtor.get(String(a.id ?? ""));
        const sb = statsByDebtor.get(String(b.id ?? ""));
        const nameCmp = String(a.name || "").localeCompare(String(b.name || ""), "pt-BR");
        if (sortField === "open_total") return ((sa?.openTotal || 0) - (sb?.openTotal || 0)) * dir || nameCmp;
        if (sortField === "overdue_count") return ((sa?.overdueCount || 0) - (sb?.overdueCount || 0)) * dir || nameCmp;
        if (sortField === "loans_count") return ((sa?.loansCount || 0) - (sb?.loansCount || 0)) * dir || nameCmp;
        if (sortField === "created_at") {
          const da = Date.parse(String(a.created_at ?? a.createdAt ?? "")) || 0;
          const db = Date.parse(String(b.created_at ?? b.createdAt ?? "")) || 0;
          return (da - db) * dir || nameCmp;
        }
        if (sortField === "status") {
          const ca = String(sa?.registrationStatus || "Inativo");
          const cb = String(sb?.registrationStatus || "Inativo");
          return ca.localeCompare(cb, "pt-BR") * dir || nameCmp;
        }
        return nameCmp * dir;
      });
  }, [debtors, search, sortDir, sortField, statsByDebtor, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const start = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = filtered.length === 0 ? 0 : Math.min(page * pageSize, filtered.length);

  function toggleDetails(id: unknown) {
    const key = String(id ?? "");
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("Todos");
    setSortField("name");
    setSortDir(defaultSortDir("name"));
    setPage(1);
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setModalOpen(true);
  }

  function openEdit(row: DebtorRow) {
    setEditingId(row.id ?? null);
    setFormErrors({});
    setForm({
      name: String(row.name || ""),
      phone: formatPhone(row.phone || ""),
      cpf: formatDocument(row.document || row.cpf || ""),
      email: String(row.email || ""),
      status: normalizeEditableStatus(row.status),
      address: String(row.address || ""),
    });
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function saveDebtor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const errors: Record<string, string> = {};
    const name = form.name.trim();
    const phoneDigits = toDigits(form.phone);
    const cpfDigits = toDigits(form.cpf);
    const email = form.email.trim();
    if (!name) errors.name = "Informe o nome.";
    if (!phoneDigits || (phoneDigits.length !== 10 && phoneDigits.length !== 11)) errors.phone = "Informe um telefone valido (10 ou 11 digitos).";
    if (cpfDigits && cpfDigits.length !== 11) errors.cpf = "CPF invalido.";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "E-mail invalido.";
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      const payload: DebtorRow = {
        name,
        phone: phoneDigits,
        cpf: cpfDigits || null,
        document: cpfDigits || null,
        email,
        status: form.status,
        address: form.address.trim(),
      };
      const nextRows: DebtorRow[] = editingId
        ? debtors.map((d) => (sameId(d.id, editingId) ? { ...d, ...payload } : d))
        : [payload, ...debtors];
      const response = await replaceLegacyTableData<DebtorRow>("debtors", nextRows);
      setDebtors(Array.isArray(response.data) ? response.data : nextRows);
      setBanner({ tone: "success", text: editingId ? "Cliente atualizado com sucesso." : "Cliente cadastrado com sucesso." });
      setPage(1);
      closeModal();
    } catch (error) {
      setBanner({ tone: "error", text: error instanceof ApiClientError ? error.message : "Erro ao salvar cliente." });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (deleting || deleteId === null) return;
    setDeleting(true);
    try {
      const nextDebtors = debtors.filter((d) => !sameId(d.id, deleteId));
      const nextLoans = loans.filter((l) => !sameId(l.debtor_id ?? l.debtorId, deleteId));
      const nextInstallments = installments.filter((i) => !sameId(i.debtor_id ?? i.debtorId, deleteId));
      const [d, l, i] = await Promise.all([
        replaceLegacyTableData<DebtorRow>("debtors", nextDebtors),
        replaceLegacyTableData<LoanRow>("loans", nextLoans),
        replaceLegacyTableData<InstallmentRow>("installments", nextInstallments),
      ]);
      setDebtors(Array.isArray(d.data) ? d.data : nextDebtors);
      setLoans(Array.isArray(l.data) ? l.data : nextLoans);
      setInstallments(Array.isArray(i.data) ? i.data : nextInstallments);
      setBanner({ tone: "success", text: "Cliente excluido com sucesso." });
      setDeleteOpen(false);
      setDeleteId(null);
    } catch (error) {
      setBanner({ tone: "error", text: error instanceof ApiClientError ? error.message : "Erro ao excluir cliente." });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="w-full">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[clamp(2rem,1.25vw+1.2rem,2.8rem)] font-extrabold tracking-[-0.035em] text-lm-text">Clientes</h1>
          <p className="mt-1 text-sm text-lm-text-muted">Consulte perfil, contato e situacao de cada cliente.</p>
        </div>
        <Button className="h-11 rounded-xl px-5 text-sm font-bold" onClick={openCreate} type="button">
          Novo cliente
        </Button>
      </header>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-lm-border/80 bg-lm-card/92 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-lm-text-subtle">Total de clientes</p>
          <p className="mt-3 text-3xl font-extrabold text-lm-text">{metrics.total}</p>
        </article>
        <article className="rounded-2xl border border-lm-border/80 bg-lm-card/92 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-lm-text-subtle">Clientes ativos</p>
          <p className="mt-3 text-3xl font-extrabold text-lm-positive">{metrics.active}</p>
        </article>
        <article className="rounded-2xl border border-lm-border/80 bg-lm-card/92 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-lm-text-subtle">Clientes inativos</p>
          <p className="mt-3 text-3xl font-extrabold text-lm-text">{metrics.inactive}</p>
        </article>
        <article className="rounded-2xl border border-lm-border/80 bg-lm-card/92 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-lm-text-subtle">Clientes com atraso</p>
          <p className="mt-3 text-3xl font-extrabold text-lm-negative">{metrics.overdue}</p>
        </article>
      </section>

      <section className="rounded-2xl border border-lm-border/80 bg-lm-card/92 p-4 sm:p-5 lg:p-6">
        <div className="mb-5 grid gap-3 md:grid-cols-12 md:gap-4">
          <label className="md:col-span-4">
            <span className="mb-1 block text-xs font-bold uppercase tracking-[0.08em] text-lm-text-subtle">Buscar</span>
            <Input className="h-11" onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Nome, telefone ou documento" type="search" value={search} />
          </label>
          <label className="md:col-span-3">
            <span className="mb-1 block text-xs font-bold uppercase tracking-[0.08em] text-lm-text-subtle">Status</span>
            <select className="h-11 w-full rounded-md border border-lm-border bg-lm-sidebar px-3 text-sm text-lm-text" onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(1); }} value={statusFilter}>
              {STATUS_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <label className="md:col-span-3">
            <span className="mb-1 block text-xs font-bold uppercase tracking-[0.08em] text-lm-text-subtle">Ordenar por</span>
            <select className="h-11 w-full rounded-md border border-lm-border bg-lm-sidebar px-3 text-sm text-lm-text" onChange={(e) => { const s = e.target.value as SortField; setSortField(s); setSortDir(defaultSortDir(s)); setPage(1); }} value={sortField}>
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <div className="md:col-span-2 md:self-end">
            <Button className="h-11 w-full" onClick={clearFilters} type="button" variant="secondary">Limpar filtros</Button>
          </div>
        </div>

        {banner ? <div className={`mb-4 rounded-xl px-3 py-2 text-sm ${banner.tone === "success" ? "border border-emerald-400/35 bg-emerald-500/10 text-emerald-200" : "border border-rose-400/35 bg-rose-500/10 text-rose-200"}`}>{banner.text}</div> : null}

        <div className="overflow-x-auto rounded-2xl border border-lm-border/80">
          <table className="w-full min-w-[1080px] border-collapse">
            <thead className="bg-lm-sidebar/75">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.09em] text-lm-text-subtle">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.09em] text-lm-text-subtle">Status</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.09em] text-lm-text-subtle">Situacao</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.09em] text-lm-text-subtle">Indice Credix</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.09em] text-lm-text-subtle">Atrasos</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.09em] text-lm-text-subtle">Total em aberto</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.09em] text-lm-text-subtle">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td className="px-4 py-10 text-center text-lm-text-muted" colSpan={7}>Carregando clientes...</td></tr> : null}
              {!loading && pageRows.length === 0 ? <tr><td className="px-4 py-10 text-center text-lm-text-muted" colSpan={7}>Nenhum cliente encontrado.</td></tr> : null}
              {!loading ? pageRows.map((row, idx) => {
                const k = String(row.id ?? idx);
                const s = statsByDebtor.get(String(row.id ?? "")); if (!s) return null;
                const isExpanded = expanded.has(String(row.id ?? ""));
                const scoreStyle = scoreStyles(s.score);
                return (
                  <>
                    <tr className={`border-t border-lm-border/70 ${s.overdueCount > 0 ? "bg-rose-950/20" : "bg-lm-sidebar/45"}`} key={`row-${k}`}>
                      <td className="px-4 py-4"><p className="text-base font-semibold text-lm-text">{row.name || "-"}</p><p className="mt-1 text-sm text-lm-text-muted">{formatPhone(row.phone)}</p></td>
                      <td className="px-4 py-4"><span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${s.registrationStatus === "Ativo" ? "border-emerald-400/55 bg-emerald-500/15 text-emerald-300" : "border-slate-500/60 bg-slate-500/15 text-slate-300"}`}>{s.registrationStatus}</span></td>
                      <td className="px-4 py-4"><span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${s.financialSituation === "Atrasado" ? "border-rose-400/55 bg-rose-500/15 text-rose-300" : s.financialSituation === "Em dia" ? "border-emerald-400/55 bg-emerald-500/15 text-emerald-300" : "border-slate-500/60 bg-slate-500/15 text-slate-300"}`}>{s.financialSituation}</span></td>
                      <td className="px-4 py-4 text-center"><span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${scoreStyle.badge}`}><span className={`h-1.5 w-1.5 rounded-full ${scoreStyle.dot}`} />{s.score}/1000</span></td>
                      <td className="px-4 py-4 text-right"><span className={`text-sm font-bold ${s.overdueCount > 0 ? "text-amber-300" : "text-lm-text-muted"}`}>{s.overdueCount}</span></td>
                      <td className="px-4 py-4 text-right"><span className={`text-sm font-extrabold ${s.overdueCount > 0 ? "text-amber-300" : "text-lm-text"}`}>{formatCurrency(s.openTotal)}</span></td>
                      <td className="px-4 py-4"><div className="flex items-center justify-end gap-2"><button className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-lm-border bg-lm-card text-lm-text-muted hover:text-lm-text" onClick={() => toggleDetails(row.id)} type="button">{isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button><button className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-400/60 bg-emerald-500/15 text-emerald-300 hover:text-emerald-200" onClick={() => openEdit(row)} type="button"><Pencil className="h-4 w-4" /></button><button className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-400/60 bg-rose-500/15 text-rose-300 hover:text-rose-200" onClick={() => { setDeleteId(row.id ?? null); setDeleteOpen(true); }} type="button"><Trash2 className="h-4 w-4" /></button></div></td>
                    </tr>
                    <tr className={isExpanded ? "border-t border-lm-border/70 bg-lm-card/70" : "hidden"} key={`detail-${k}`}>
                      <td className="px-4 pb-4 pt-1" colSpan={7}>
                        <div className="rounded-xl border border-lm-border/70 bg-lm-sidebar/65 p-4">
                          <div className="grid grid-cols-1 gap-3 text-xs text-lm-text-muted md:grid-cols-2 lg:grid-cols-3">
                            <div><p className="text-[11px] uppercase tracking-[0.08em] text-lm-text-subtle">Documento</p><p className="mt-1 text-sm font-semibold text-lm-text">{formatDocument(row.document || row.cpf || "")}</p></div>
                            <div><p className="text-[11px] uppercase tracking-[0.08em] text-lm-text-subtle">E-mail</p><p className="mt-1 text-sm font-semibold text-lm-text">{row.email || "-"}</p></div>
                            <div><p className="text-[11px] uppercase tracking-[0.08em] text-lm-text-subtle">Dias em atraso (max.)</p><p className={`mt-1 text-sm font-semibold ${s.maxOverdueDays ? "text-amber-300" : "text-lm-text-muted"}`}>{s.maxOverdueDays ?? "-"}</p></div>
                            <div><p className="text-[11px] uppercase tracking-[0.08em] text-lm-text-subtle">Emprestimos</p><p className="mt-1 text-sm font-semibold text-lm-text">{s.loansCount}</p></div>
                            <div><p className="text-[11px] uppercase tracking-[0.08em] text-lm-text-subtle">Pontualidade 90d</p><p className="mt-1 text-sm font-semibold text-lm-text">{s.punctualityText.replace(/^Pontualidade 90d:\s*/i, "")}</p></div>
                            <div><p className="text-[11px] uppercase tracking-[0.08em] text-lm-text-subtle">Ultimo pagamento</p><p className="mt-1 text-sm font-semibold text-lm-text">{s.lastPaymentText.replace(/^Ultimo pagamento:\s*/i, "")}</p></div>
                            <div className="md:col-span-2 lg:col-span-3"><p className="text-[11px] uppercase tracking-[0.08em] text-lm-text-subtle">Tendencia 3M</p><p className="mt-1 text-sm font-semibold text-lm-text">{s.trendText.replace(/^Tendencia 3M:\s*/i, "")}</p></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </>
                );
              }) : null}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-lm-text-muted">Mostrando {start} ate {end} de {filtered.length} resultados</p>
          <div className="flex items-center gap-2">
            <button className="inline-flex h-9 items-center rounded-lg border border-lm-border bg-lm-sidebar px-3 text-sm text-lm-text-muted hover:text-lm-text disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} type="button">Anterior</button>
            <span className="text-sm text-lm-text-muted">Pagina {page} de {totalPages}</span>
            <button className="inline-flex h-9 items-center rounded-lg border border-lm-border bg-lm-sidebar px-3 text-sm text-lm-text-muted hover:text-lm-text disabled:opacity-50" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} type="button">Proxima</button>
          </div>
        </div>
      </section>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-lm-border bg-lm-card p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3"><div><h3 className="text-2xl font-bold text-lm-text">{editingId ? "Editar cliente" : "Novo cliente"}</h3><p className="mt-1 text-sm text-lm-text-muted">Preencha os dados do cliente.</p></div><button className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-lm-border text-lm-text-muted hover:bg-lm-sidebar hover:text-lm-text" onClick={closeModal} type="button">x</button></div>
            <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={saveDebtor}>
              <div className="md:col-span-2"><label className="mb-1 block text-sm text-lm-text-muted">Nome *</label><Input onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} value={form.name} />{formErrors.name ? <p className="mt-1 text-xs text-rose-300">{formErrors.name}</p> : null}</div>
              <div><label className="mb-1 block text-sm text-lm-text-muted">Telefone *</label><Input onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} value={form.phone} />{formErrors.phone ? <p className="mt-1 text-xs text-rose-300">{formErrors.phone}</p> : null}</div>
              <div><label className="mb-1 block text-sm text-lm-text-muted">CPF</label><Input onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value }))} value={form.cpf} />{formErrors.cpf ? <p className="mt-1 text-xs text-rose-300">{formErrors.cpf}</p> : null}</div>
              <div><label className="mb-1 block text-sm text-lm-text-muted">E-mail</label><Input onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} value={form.email} />{formErrors.email ? <p className="mt-1 text-xs text-rose-300">{formErrors.email}</p> : null}</div>
              <div><label className="mb-1 block text-sm text-lm-text-muted">Status</label><select className="h-10 w-full rounded-md border border-lm-border bg-lm-sidebar px-3 text-sm text-lm-text" onChange={(e) => setForm((f) => ({ ...f, status: e.target.value === "Inativo" ? "Inativo" : "Ativo" }))} value={form.status}><option value="Ativo">Ativo</option><option value="Inativo">Inativo</option></select></div>
              <div className="md:col-span-2"><label className="mb-1 block text-sm text-lm-text-muted">Endereco</label><Input onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} value={form.address} /></div>
              <div className="mt-2 flex items-center justify-end gap-2 md:col-span-2"><Button onClick={closeModal} type="button" variant="ghost">Cancelar</Button><Button disabled={saving} type="submit">{saving ? "Salvando..." : "Salvar cliente"}</Button></div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-lm-border bg-lm-card p-5 shadow-2xl">
            <h3 className="text-2xl font-bold text-lm-text">Confirmar exclusao</h3>
            <p className="mt-2 text-sm text-lm-text-muted">Tem certeza que deseja excluir este cliente?</p>
            <div className="mt-5 flex items-center justify-end gap-2"><Button onClick={() => { if (!deleting) { setDeleteOpen(false); setDeleteId(null); } }} type="button" variant="ghost">Cancelar</Button><Button disabled={deleting} onClick={() => void confirmDelete()} type="button" variant="danger">{deleting ? "Excluindo..." : "Excluir"}</Button></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
