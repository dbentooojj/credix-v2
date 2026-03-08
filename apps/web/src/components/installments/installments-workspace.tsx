"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarCheck2, Check, Eye, LoaderCircle, PencilLine, RotateCcw, Search } from "lucide-react";
import {
  updatePortfolioInstallment,
  type PortfolioInstallmentDisplayStatus,
  type PortfolioInstallmentItem,
  type PortfolioInstallmentsResponse,
} from "@/src/lib/api";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import styles from "@/src/components/installments/installments-workspace.module.css";

type InstallmentsWorkspaceProps = {
  initialPayload: PortfolioInstallmentsResponse | null;
  initialError: string | null;
};

type QuickFilterKey = "all" | "paid_month" | "pending_total" | "overdue_total";
type StatusFilterKey = "all" | PortfolioInstallmentDisplayStatus;
type DueFilterKey = "all" | "today" | "next7" | "month_current" | "last30";

const PAGE_SIZE = 12;

function parseQuickFilter(value: string | null): QuickFilterKey {
  if (value === "paid_month" || value === "pending_total" || value === "overdue_total") {
    return value;
  }

  return "all";
}

function parseStatusFilter(value: string | null): StatusFilterKey {
  if (value === "paid" || value === "pending" || value === "overdue" || value === "due-today") {
    return value;
  }

  return "all";
}

function parseDueFilter(value: string | null): DueFilterKey {
  if (value === "today" || value === "next7" || value === "month_current" || value === "last30") {
    return value;
  }

  return "all";
}

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

function parseDateOnly(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0));
}

function buildPaginationSequence(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);

  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }

  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
  }

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

function dueDiffInDays(dueDate?: string | null, todayDate?: string) {
  const due = parseDateOnly(dueDate);
  const today = parseDateOnly(todayDate);
  if (!due || !today) return null;

  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

function statusClassName(status?: PortfolioInstallmentDisplayStatus) {
  if (status === "paid") return styles.statusPaid;
  if (status === "overdue") return styles.statusOverdue;
  if (status === "due-today") return styles.statusToday;
  return styles.statusPending;
}

function rowClassName(status?: PortfolioInstallmentDisplayStatus) {
  if (status === "paid") return styles.rowPaid;
  if (status === "overdue") return styles.rowOverdue;
  if (status === "due-today") return styles.rowToday;
  return styles.rowPending;
}

function KpiCard({
  active,
  count,
  label,
  meta,
  tone,
  value,
  onClick,
}: {
  active: boolean;
  count: number;
  label: string;
  meta: string;
  tone: "paid" | "pending" | "overdue";
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        styles.kpiCard,
        tone === "paid" && styles.kpiCardPaid,
        tone === "pending" && styles.kpiCardPending,
        tone === "overdue" && styles.kpiCardOverdue,
        active && styles.kpiCardActive,
      )}
      onClick={onClick}
    >
      <span className={styles.kpiLabel}>{label}</span>
      <span className={styles.kpiValue}>{value}</span>
      <span className={styles.kpiMeta}>{meta}</span>
      <span className={styles.kpiCount}>{count} parcela(s)</span>
    </button>
  );
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className={styles.dialogField}>
      <span className={styles.dialogLabel}>{label}</span>
      <span className={styles.dialogValue}>{value}</span>
    </div>
  );
}

export function InstallmentsWorkspace({ initialPayload, initialError }: InstallmentsWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const items = initialPayload?.data || [];
  const customers = initialPayload?.filters?.customers || [];
  const currentMonthKey = initialPayload?.meta?.currentMonthKey || "";
  const todayDate = initialPayload?.meta?.todayDate || "";
  const queryString = searchParams.toString();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [customerFilter, setCustomerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>("all");
  const [dueFilter, setDueFilter] = useState<DueFilterKey>("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilterKey>("all");
  const [page, setPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<PortfolioInstallmentItem | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [reversalOpen, setReversalOpen] = useState(false);
  const [paymentDate, setPaymentDate] = useState(todayDate);
  const [editDueDate, setEditDueDate] = useState(todayDate);
  const [editPrincipalAmount, setEditPrincipalAmount] = useState("");
  const [editInterestAmount, setEditInterestAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  function toggleQuickFilter(filter: QuickFilterKey) {
    setQuickFilter((current) => (current === filter ? "all" : filter));
  }

  function clearFilters() {
    setSearch("");
    setCustomerFilter("all");
    setStatusFilter("all");
    setDueFilter("all");
    setQuickFilter("all");
  }

  function openDetails(item: PortfolioInstallmentItem) {
    setActionError(null);
    setSelectedItem(item);
    setDetailsOpen(true);
  }

  function openPayment(item: PortfolioInstallmentItem) {
    setActionError(null);
    setSelectedItem(item);
    setPaymentDate(todayDate || item.dueDate || "");
    setPaymentOpen(true);
  }

  function openEdit(item: PortfolioInstallmentItem) {
    setActionError(null);
    setSelectedItem(item);
    setEditDueDate(item.dueDate || todayDate);
    setEditPrincipalAmount(toNumber(item.principalAmount).toFixed(2));
    setEditInterestAmount(toNumber(item.interestAmount).toFixed(2));
    setEditOpen(true);
  }

  function openReversal(item: PortfolioInstallmentItem) {
    setActionError(null);
    setSelectedItem(item);
    setReversalOpen(true);
  }

  function closeDetails(open: boolean) {
    setDetailsOpen(open);
    if (!open) {
      setSelectedItem(null);
    }
  }

  function closePayment(open: boolean) {
    setPaymentOpen(open);
    if (!open) {
      setSelectedItem(null);
      setPaymentDate(todayDate);
      setIsSubmitting(false);
    }
  }

  function closeEdit(open: boolean) {
    setEditOpen(open);
    if (!open) {
      setSelectedItem(null);
      setEditDueDate(todayDate);
      setEditPrincipalAmount("");
      setEditInterestAmount("");
      setIsSubmitting(false);
    }
  }

  function closeReversal(open: boolean) {
    setReversalOpen(open);
    if (!open) {
      setSelectedItem(null);
      setIsSubmitting(false);
    }
  }

  async function submitPayment() {
    if (!selectedItem?.id || !paymentDate) return;

    setIsSubmitting(true);
    setActionError(null);

    try {
      await updatePortfolioInstallment(selectedItem.id, {
        status: "completed",
        paidDate: paymentDate,
      });
      setPaymentOpen(false);
      setSelectedItem(null);
      router.refresh();
    } catch (submitError) {
      setActionError(submitError instanceof Error ? submitError.message : "Falha ao registrar o pagamento.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitEdit() {
    if (!selectedItem?.id || !editDueDate) return;

    const principalAmount = Number(editPrincipalAmount);
    const interestAmount = Number(editInterestAmount);

    if (!Number.isFinite(principalAmount) || principalAmount < 0 || !Number.isFinite(interestAmount) || interestAmount < 0) {
      setActionError("Informe principal e juros com valores validos.");
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    try {
      await updatePortfolioInstallment(selectedItem.id, {
        dueDate: editDueDate,
        principalAmount,
        interestAmount,
      });
      setEditOpen(false);
      setSelectedItem(null);
      router.refresh();
    } catch (submitError) {
      setActionError(submitError instanceof Error ? submitError.message : "Falha ao atualizar a parcela.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitReversal() {
    if (!selectedItem?.id) return;

    setIsSubmitting(true);
    setActionError(null);

    try {
      await updatePortfolioInstallment(selectedItem.id, {
        status: "pending",
        paidDate: null,
      });
      setReversalOpen(false);
      setSelectedItem(null);
      router.refresh();
    } catch (submitError) {
      setActionError(submitError instanceof Error ? submitError.message : "Falha ao estornar a baixa.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function matchesQuickFilter(item: PortfolioInstallmentItem) {
    if (quickFilter === "all") return true;
    if (quickFilter === "paid_month") return item.status === "paid" && item.paidDate?.startsWith(currentMonthKey);
    if (quickFilter === "pending_total") return item.status !== "paid";
    return item.status === "overdue";
  }

  function matchesStatus(item: PortfolioInstallmentItem) {
    if (statusFilter === "all") return true;
    return item.status === statusFilter;
  }

  function matchesCustomer(item: PortfolioInstallmentItem) {
    if (customerFilter === "all") return true;
    return item.customerName === customerFilter;
  }

  function matchesDueFilter(item: PortfolioInstallmentItem) {
    if (dueFilter === "all") return true;

    const diff = dueDiffInDays(item.dueDate, todayDate);
    if (diff === null) return false;

    if (dueFilter === "today") return item.status !== "paid" && diff === 0;
    if (dueFilter === "next7") return item.status !== "paid" && diff >= 0 && diff <= 7;
    if (dueFilter === "month_current") return item.dueDate?.startsWith(currentMonthKey);

    const dueDateValue = parseDateOnly(item.dueDate);
    const today = parseDateOnly(todayDate);
    if (!dueDateValue || !today) return false;

    const start = new Date(today.getTime());
    start.setUTCDate(start.getUTCDate() - 29);
    return startOfDay(dueDateValue) >= startOfDay(start) && startOfDay(dueDateValue) <= startOfDay(today);
  }

  function matchesSearch(item: PortfolioInstallmentItem) {
    const needle = deferredSearch.trim().toLowerCase();
    if (!needle) return true;

    const haystack = [
      item.customerName,
      item.loanId,
      item.loanLabel,
      item.installmentLabel,
      item.id,
    ].join(" ").toLowerCase();

    return haystack.includes(needle);
  }

  const filteredItems = items.filter((item) =>
    matchesQuickFilter(item)
    && matchesStatus(item)
    && matchesCustomer(item)
    && matchesDueFilter(item)
    && matchesSearch(item));

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, customerFilter, statusFilter, dueFilter, quickFilter]);

  useEffect(() => {
    const params = new URLSearchParams(queryString);
    const nextSearch = params.get("search")?.trim() || params.get("focus")?.trim() || "";
    const nextCustomer = params.get("customer")?.trim() || "all";

    setSearch(nextSearch);
    setCustomerFilter(customers.some((customer) => customer.value === nextCustomer) ? nextCustomer : "all");
    setStatusFilter(parseStatusFilter(params.get("status")));
    setDueFilter(parseDueFilter(params.get("due")));
    setQuickFilter(parseQuickFilter(params.get("quick")));
    setPage(1);
  }, [customers, queryString]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = filteredItems.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE;
  const endIndex = filteredItems.length === 0 ? 0 : Math.min(startIndex + PAGE_SIZE, filteredItems.length);
  const visibleItems = filteredItems.slice(startIndex, endIndex);
  const paginationSequence = buildPaginationSequence(currentPage, totalPages);
  const summary = initialPayload?.summary;
  const editTotalValue = toNumber(editPrincipalAmount) + toNumber(editInterestAmount);
  const errorMessage = initialError;

  return (
    <div className={styles.root}>
      <section className={styles.header}>
        <div className={styles.headerCopy}>
          <h1 className={styles.pageTitle}>Parcelas</h1>
          <p className={styles.pageSubtitle}>Acompanhe pendencias, atrasos e recebimentos da carteira com leitura operacional.</p>
        </div>

        <div className={styles.headerMeta}>
          <span className={styles.headerBadge}>Cobranca operacional</span>
          <p className={styles.timestamp}>
            Atualizado: <strong>{formatDateTime(initialPayload?.meta?.generatedAt, initialPayload?.meta?.timezone)}</strong>
          </p>
        </div>
      </section>

      {errorMessage ? <div className={styles.errorBanner}>{errorMessage}</div> : null}

      <section className={styles.kpiGrid}>
        <KpiCard
          active={quickFilter === "paid_month"}
          count={toNumber(summary?.receivedMonth?.count)}
          label="Recebido no mes"
          meta="Parcelas baixadas no mes corrente."
          onClick={() => toggleQuickFilter("paid_month")}
          tone="paid"
          value={formatCurrency(summary?.receivedMonth?.value)}
        />
        <KpiCard
          active={quickFilter === "pending_total"}
          count={toNumber(summary?.pendingTotal?.count)}
          label="Total pendente"
          meta="Parcelas em aberto na carteira."
          onClick={() => toggleQuickFilter("pending_total")}
          tone="pending"
          value={formatCurrency(summary?.pendingTotal?.value)}
        />
        <KpiCard
          active={quickFilter === "overdue_total"}
          count={toNumber(summary?.overdueTotal?.count)}
          label="Total atrasado"
          meta="Parcelas vencidas e ainda nao pagas."
          onClick={() => toggleQuickFilter("overdue_total")}
          tone="overdue"
          value={formatCurrency(summary?.overdueTotal?.value)}
        />
      </section>

      <section className={styles.toolbar}>
        <div className={styles.toolbarGrid}>
          <label className={styles.filterField}>
            <span className={styles.filterLabel}>Buscar</span>
            <div className={styles.searchWrap}>
              <Search className={cn("size-4", styles.searchIcon)} />
              <input
                type="text"
                className={styles.filterInput}
                placeholder="Cliente, contrato, parcela ou id"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </label>

          <label className={styles.filterField}>
            <span className={styles.filterLabel}>Status</span>
            <select className={styles.filterSelect} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilterKey)}>
              <option value="all">Todos</option>
              <option value="paid">Pago</option>
              <option value="pending">Pendente</option>
              <option value="due-today">Vence hoje</option>
              <option value="overdue">Em atraso</option>
            </select>
          </label>

          <label className={styles.filterField}>
            <span className={styles.filterLabel}>Cliente</span>
            <select className={styles.filterSelect} value={customerFilter} onChange={(event) => setCustomerFilter(event.target.value)}>
              <option value="all">Todos os clientes</option>
              {customers.map((customer) => (
                <option key={customer.value} value={customer.value}>
                  {customer.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.filterField}>
            <span className={styles.filterLabel}>Periodo</span>
            <select className={styles.filterSelect} value={dueFilter} onChange={(event) => setDueFilter(event.target.value as DueFilterKey)}>
              <option value="all">Todos</option>
              <option value="today">Hoje</option>
              <option value="next7">Proximos 7 dias</option>
              <option value="month_current">Mes atual</option>
              <option value="last30">Ultimos 30 dias</option>
            </select>
          </label>

          <div className={styles.toolbarActions}>
            <button type="button" className={styles.clearButton} onClick={clearFilters}>
              Limpar filtros
            </button>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Parcelas da cobranca</h2>
          <p className={styles.panelMeta}>
            Resultados: <strong>{filteredItems.length}</strong>
          </p>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contrato</th>
                <th>Parcela</th>
                <th>Vencimento</th>
                <th>Valor</th>
                <th>Status</th>
                <th className={styles.actionsHeader}>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className={styles.empty}>
                      <div className={styles.emptyIcon}>
                        <CalendarCheck2 className="size-5" />
                      </div>
                      <p className={styles.emptyTitle}>Nenhuma parcela encontrada</p>
                      <p className={styles.emptyNote}>Ajuste os filtros para visualizar resultados.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleItems.map((item) => (
                  <tr key={item.id} className={cn(styles.row, rowClassName(item.status))}>
                    <td>
                      <p className={styles.customer}>{item.customerName || "Cliente nao informado"}</p>
                      <p className={styles.subtle}>ID {item.id || "--"}</p>
                    </td>
                    <td>
                      <p className={styles.loan}>{item.loanLabel || `Contrato #${item.loanId || "--"}`}</p>
                      <p className={styles.subtle}>Principal {formatCurrency(item.principalAmount)}</p>
                    </td>
                    <td>
                      <p className={styles.loan}>{item.installmentLabel || "Parcela"}</p>
                      <p className={styles.subtle}>Juros {formatCurrency(item.interestAmount)}</p>
                    </td>
                    <td>
                      <p className={styles.dateValue}>{formatDateOnly(item.dueDate)}</p>
                      <p className={styles.subtle}>{item.paidDate ? `Baixa ${formatDateOnly(item.paidDate)}` : item.timingLabel}</p>
                    </td>
                    <td>
                      <p className={styles.value}>{formatCurrency(item.amount)}</p>
                    </td>
                    <td>
                      <span className={cn(styles.statusPill, statusClassName(item.status))}>{item.statusLabel || "Pendente"}</span>
                      <p className={styles.timing}>{item.timingLabel || "--"}</p>
                    </td>
                    <td className={styles.actionsCell}>
                      <div className={styles.actionsGroup}>
                        <Button type="button" variant="outline" size="sm" className={styles.actionButtonSecondary} onClick={() => openDetails(item)}>
                          <Eye className="size-4" />
                          Detalhes
                        </Button>
                        <Button type="button" variant="outline" size="sm" className={styles.actionButtonSecondary} onClick={() => openEdit(item)}>
                          <PencilLine className="size-4" />
                          Editar
                        </Button>
                        {item.status !== "paid" ? (
                          <Button type="button" size="sm" className={styles.actionButtonPrimary} onClick={() => openPayment(item)}>
                            <Check className="size-4" />
                            Dar baixa
                          </Button>
                        ) : (
                          <Button type="button" size="sm" className={styles.actionButtonWarning} onClick={() => openReversal(item)}>
                            <RotateCcw className="size-4" />
                            Estornar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.mobileList}>
          {visibleItems.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>
                <CalendarCheck2 className="size-5" />
              </div>
              <p className={styles.emptyTitle}>Nenhuma parcela encontrada</p>
              <p className={styles.emptyNote}>Ajuste os filtros para visualizar resultados.</p>
            </div>
          ) : (
            visibleItems.map((item) => (
              <article key={item.id} className={cn(styles.mobileCard, rowClassName(item.status))}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={styles.customer}>{item.customerName || "Cliente nao informado"}</p>
                    <p className={styles.subtle}>{item.loanLabel || `Contrato #${item.loanId || "--"}`}</p>
                  </div>
                  <span className={cn(styles.statusPill, statusClassName(item.status))}>{item.statusLabel || "Pendente"}</span>
                </div>

                <div className={styles.mobileGrid}>
                  <div>
                    <p className={styles.mobileLabel}>Parcela</p>
                    <p className={styles.mobileValue}>{item.installmentLabel || "--"}</p>
                  </div>
                  <div>
                    <p className={styles.mobileLabel}>Valor</p>
                    <p className={styles.mobileValue}>{formatCurrency(item.amount)}</p>
                  </div>
                  <div>
                    <p className={styles.mobileLabel}>Vencimento</p>
                    <p className={styles.mobileValue}>{formatDateOnly(item.dueDate)}</p>
                  </div>
                  <div>
                    <p className={styles.mobileLabel}>Baixa</p>
                    <p className={styles.mobileValue}>{item.paidDate ? formatDateOnly(item.paidDate) : "--"}</p>
                  </div>
                  <div className={styles.mobileWide}>
                    <p className={styles.mobileLabel}>Observacao</p>
                    <p className={styles.mobileValue}>{item.timingLabel || "--"}</p>
                  </div>
                </div>

                <div className={styles.mobileActions}>
                  <Button type="button" variant="outline" size="sm" className={styles.actionButtonSecondary} onClick={() => openDetails(item)}>
                    <Eye className="size-4" />
                    Detalhes
                  </Button>
                  <Button type="button" variant="outline" size="sm" className={styles.actionButtonSecondary} onClick={() => openEdit(item)}>
                    <PencilLine className="size-4" />
                    Editar
                  </Button>
                  {item.status !== "paid" ? (
                    <Button type="button" size="sm" className={styles.actionButtonPrimary} onClick={() => openPayment(item)}>
                      <Check className="size-4" />
                      Dar baixa
                    </Button>
                  ) : (
                    <Button type="button" size="sm" className={styles.actionButtonWarning} onClick={() => openReversal(item)}>
                      <RotateCcw className="size-4" />
                      Estornar
                    </Button>
                  )}
                </div>
              </article>
            ))
          )}
        </div>

        <div className={styles.footer}>
          <p className={styles.footerInfo}>
            Mostrando <strong>{filteredItems.length === 0 ? 0 : startIndex + 1}</strong> ate <strong>{endIndex}</strong> de <strong>{filteredItems.length}</strong> resultados
          </p>
          <div className={styles.pagination}>
            <button
              type="button"
              className={cn(styles.pageButton, currentPage <= 1 && styles.pageButtonDisabled)}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={currentPage <= 1}
            >
              Anterior
            </button>

            {paginationSequence.map((item, index) =>
              item === "..." ? (
                <span key={`ellipsis-${index}`} className={styles.pageEllipsis}>...</span>
              ) : (
                <button
                  key={item}
                  type="button"
                  className={cn(styles.pageButton, currentPage === item && styles.pageButtonActive)}
                  onClick={() => setPage(item)}
                >
                  {item}
                </button>
              ))}

            <button
              type="button"
              className={cn(styles.pageButton, currentPage >= totalPages && styles.pageButtonDisabled)}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={currentPage >= totalPages}
            >
              Proxima
            </button>
          </div>
        </div>
      </section>

      <Dialog open={detailsOpen} onOpenChange={closeDetails}>
        <DialogContent className={styles.dialogContent}>
          <div className={styles.dialogHeaderWrap}>
            <DialogHeader className={styles.dialogHeader}>
              <DialogTitle>Detalhes da parcela</DialogTitle>
              <DialogDescription>
                Leitura completa da parcela selecionada para consulta operacional.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className={styles.dialogBody}>
            <div className={styles.dialogGrid}>
              <DetailField label="Cliente" value={selectedItem?.customerName || "--"} />
              <DetailField label="Contrato" value={selectedItem?.loanLabel || "--"} />
              <DetailField label="Parcela" value={selectedItem?.installmentLabel || "--"} />
              <DetailField label="Status" value={selectedItem?.statusLabel || "--"} />
              <DetailField label="Vencimento" value={formatDateOnly(selectedItem?.dueDate)} />
              <DetailField label="Baixa" value={formatDateOnly(selectedItem?.paidDate)} />
              <DetailField label="Valor total" value={formatCurrency(selectedItem?.amount)} />
              <DetailField label="Principal" value={formatCurrency(selectedItem?.principalAmount)} />
              <DetailField label="Juros" value={formatCurrency(selectedItem?.interestAmount)} />
              <DetailField label="Observacao" value={selectedItem?.timingLabel || "--"} />
            </div>
          </div>
          <DialogFooter className={styles.dialogFooter}>
            <Button type="button" variant="outline" className={styles.dialogSecondaryButton} onClick={() => closeDetails(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentOpen} onOpenChange={closePayment}>
        <DialogContent className={styles.dialogContent}>
          <div className={styles.dialogHeaderWrap}>
            <DialogHeader className={styles.dialogHeader}>
              <DialogTitle>Registrar pagamento</DialogTitle>
              <DialogDescription>
                Confirme a baixa da parcela e informe a data do pagamento.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className={styles.dialogBody}>
            <div className={styles.dialogSummary}>
              <p className={styles.dialogSummaryTitle}>{selectedItem?.customerName || "Parcela selecionada"}</p>
              <p className={styles.dialogSummaryText}>{selectedItem?.loanLabel || "--"} - {selectedItem?.installmentLabel || "--"}</p>
              <p className={styles.dialogSummaryValue}>{formatCurrency(selectedItem?.amount)}</p>
            </div>

            <div className={styles.dialogField}>
              <label className={styles.dialogLabel} htmlFor="installment-payment-date">Data do pagamento</label>
              <input
                id="installment-payment-date"
                type="date"
                className={styles.dialogInput}
                value={paymentDate}
                onChange={(event) => setPaymentDate(event.target.value)}
              />
            </div>

            {actionError ? <div className={styles.dialogError}>{actionError}</div> : null}
          </div>
          <DialogFooter className={styles.dialogFooter}>
            <Button type="button" variant="outline" className={styles.dialogSecondaryButton} onClick={() => closePayment(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="button" className={styles.dialogPrimaryButton} onClick={() => void submitPayment()} disabled={isSubmitting || !paymentDate}>
              {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
              Confirmar baixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={closeEdit}>
        <DialogContent className={styles.dialogContent}>
          <div className={styles.dialogHeaderWrap}>
            <DialogHeader className={styles.dialogHeader}>
              <DialogTitle>Editar parcela</DialogTitle>
              <DialogDescription>
                Ajuste vencimento, principal e juros da parcela selecionada.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className={styles.dialogBody}>
            <div className={styles.dialogSummary}>
              <p className={styles.dialogSummaryTitle}>{selectedItem?.customerName || "Parcela selecionada"}</p>
              <p className={styles.dialogSummaryText}>{selectedItem?.loanLabel || "--"} - {selectedItem?.installmentLabel || "--"}</p>
              <p className={styles.dialogSummaryValue}>{formatCurrency(editTotalValue)}</p>
            </div>

            <div className={styles.dialogGrid}>
              <div className={styles.dialogField}>
                <label className={styles.dialogLabel} htmlFor="installment-due-date">Vencimento</label>
                <input
                  id="installment-due-date"
                  type="date"
                  className={styles.dialogInput}
                  value={editDueDate}
                  onChange={(event) => setEditDueDate(event.target.value)}
                />
              </div>

              <div className={styles.dialogField}>
                <label className={styles.dialogLabel} htmlFor="installment-principal-amount">Principal</label>
                <input
                  id="installment-principal-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  className={styles.dialogInput}
                  value={editPrincipalAmount}
                  onChange={(event) => setEditPrincipalAmount(event.target.value)}
                />
              </div>

              <div className={styles.dialogField}>
                <label className={styles.dialogLabel} htmlFor="installment-interest-amount">Juros</label>
                <input
                  id="installment-interest-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  className={styles.dialogInput}
                  value={editInterestAmount}
                  onChange={(event) => setEditInterestAmount(event.target.value)}
                />
              </div>

              <div className={styles.dialogField}>
                <span className={styles.dialogLabel}>Valor recalculado</span>
                <span className={styles.dialogValue}>{formatCurrency(editTotalValue)}</span>
              </div>
            </div>

            {actionError ? <div className={styles.dialogError}>{actionError}</div> : null}
          </div>
          <DialogFooter className={styles.dialogFooter}>
            <Button type="button" variant="outline" className={styles.dialogSecondaryButton} onClick={() => closeEdit(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="button" className={styles.dialogPrimaryButton} onClick={() => void submitEdit()} disabled={isSubmitting || !editDueDate}>
              {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
              Salvar ajustes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reversalOpen} onOpenChange={closeReversal}>
        <DialogContent className={styles.dialogContent}>
          <div className={styles.dialogHeaderWrap}>
            <DialogHeader className={styles.dialogHeader}>
              <DialogTitle>Estornar baixa</DialogTitle>
              <DialogDescription>
                A parcela volta para a cobranca e o status sera recalculado pelo vencimento.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className={styles.dialogBody}>
            <div className={styles.dialogSummary}>
              <p className={styles.dialogSummaryTitle}>{selectedItem?.customerName || "Parcela selecionada"}</p>
              <p className={styles.dialogSummaryText}>{selectedItem?.loanLabel || "--"} - {selectedItem?.installmentLabel || "--"}</p>
              <p className={styles.dialogSummaryValue}>{formatCurrency(selectedItem?.amount)}</p>
            </div>

            <div className={styles.dialogField}>
              <span className={styles.dialogLabel}>Baixa atual</span>
              <span className={styles.dialogValue}>{formatDateOnly(selectedItem?.paidDate)}</span>
            </div>

            {actionError ? <div className={styles.dialogError}>{actionError}</div> : null}
          </div>
          <DialogFooter className={styles.dialogFooter}>
            <Button type="button" variant="outline" className={styles.dialogSecondaryButton} onClick={() => closeReversal(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="button" className={styles.dialogDangerButton} onClick={() => void submitReversal()} disabled={isSubmitting}>
              {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
              Confirmar estorno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
