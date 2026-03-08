"use client";

import { useDeferredValue, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  Check,
  Circle,
  CircleAlert,
  Clock3,
  FileText,
  MoreVertical,
  Pencil,
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
  addMonths,
  formatFinanceAmountPlain,
  formatFinanceCurrency,
  formatFinanceDate,
  formatFinanceMonthLabel,
  getFinanceTodayDate,
  getFinanceViewConfig,
  parseDateOnly,
  sameMonth,
  startOfDay,
  startOfMonth,
  toDateInputValue,
} from "@/src/lib/finance";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { Input } from "@/src/components/ui/input";
import styles from "@/src/components/finance/finance-workspace.module.css";

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

type FinanceFilterKey = "all" | "pending" | "paid" | "overdue" | "due-today";
type DisplayStatusKey = "paid" | "overdue" | "due-today" | "scheduled" | "pending";

type DisplayStatus = {
  key: DisplayStatusKey;
  group: Exclude<FinanceFilterKey, "all">;
  label: string;
  icon: LucideIcon;
};

const PAGE_SIZE = 15;
const DISPLAY_ORDER: Record<DisplayStatusKey, number> = {
  overdue: 0,
  "due-today": 1,
  scheduled: 2,
  pending: 3,
  paid: 4,
};

function createEmptyForm(): FinanceFormState {
  return {
    description: "",
    category: "",
    amount: "",
    date: getFinanceTodayDate(),
    status: "pending",
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
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

export function FinanceWorkspace({ mode }: FinanceWorkspaceProps) {
  const config = getFinanceViewConfig(mode);
  const deferredMode = useDeferredValue(mode);
  const [items, setItems] = useState<FinanceTransaction[]>([]);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [statusFilter, setStatusFilter] = useState<FinanceFilterKey>("all");
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FinanceFormState>(createEmptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  async function loadTransactions(preserveMonthCursor = false) {
    setIsLoading(true);
    setError(null);

    try {
      const response = await listFinanceTransactions({ type: deferredMode });
      const nextItems = response.data;
      setItems(nextItems);

      if (!preserveMonthCursor) {
        setMonthCursor(nextItems.length > 0 ? startOfMonth(parseDateOnly(nextItems[0].date)) : startOfMonth(new Date()));
      } else if (nextItems.length === 0) {
        setMonthCursor(startOfMonth(new Date()));
      }

      setPage(1);
    } catch (loadError) {
      setError(getErrorMessage(loadError, config.loadError));
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadTransactions();
  }, [deferredMode]);

  function resetForm() {
    setForm(createEmptyForm());
    setEditingId(null);
  }

  function handleOpenChange(open: boolean) {
    setModalOpen(open);

    if (!open) {
      resetForm();
    }
  }

  function openCreateModal() {
    resetForm();
    setModalOpen(true);
    setError(null);
  }

  function openEditModal(item: FinanceTransaction) {
    setEditingId(item.id);
    setForm({
      description: item.description,
      category: item.category,
      amount: String(item.amount),
      date: item.date,
      status: item.status,
    });
    setModalOpen(true);
    setError(null);
  }

  function getDisplayStatus(item: FinanceTransaction): DisplayStatus {
    const dueDate = startOfDay(parseDateOnly(item.date));
    const today = startOfDay(new Date());

    if (item.status === "completed") {
      return { key: "paid", group: "paid", label: config.statusPaidLabel, icon: Check };
    }

    if (dueDate.getTime() < today.getTime()) {
      return { key: "overdue", group: "overdue", label: config.statusOverdueLabel, icon: CircleAlert };
    }

    if (dueDate.getTime() === today.getTime()) {
      return { key: "due-today", group: "due-today", label: config.statusTodayLabel, icon: Clock3 };
    }

    if (item.status === "scheduled") {
      return { key: "scheduled", group: "pending", label: config.statusScheduledLabel, icon: CalendarDays };
    }

    return { key: "pending", group: "pending", label: config.statusPendingLabel, icon: Circle };
  }

  function buildObservation(item: FinanceTransaction, displayStatus: DisplayStatus) {
    const dueDate = parseDateOnly(item.date);
    const today = startOfDay(new Date());
    const diffDays = Math.floor((startOfDay(dueDate).getTime() - today.getTime()) / 86400000);

    if (displayStatus.key === "paid") return config.observationPaid;
    if (displayStatus.key === "overdue") return `Em atraso ha ${Math.abs(diffDays)} dia(s).`;
    if (displayStatus.key === "due-today") return config.observationToday;
    if (displayStatus.key === "scheduled") return config.observationScheduled;
    return config.observationPending;
  }

  function matchesSearch(item: FinanceTransaction) {
    if (!deferredSearch.trim()) return true;

    const haystack = `${item.description} ${item.category}`.toLowerCase();
    return haystack.includes(deferredSearch.trim().toLowerCase());
  }

  function matchesStatusFilter(item: FinanceTransaction) {
    if (statusFilter === "all") return true;

    const displayStatus = getDisplayStatus(item);

    if (statusFilter === "pending") {
      return displayStatus.group === "pending";
    }

    return displayStatus.group === statusFilter;
  }

  function sortItems(sourceItems: FinanceTransaction[]) {
    return [...sourceItems].sort((left, right) => {
      const leftStatus = getDisplayStatus(left);
      const rightStatus = getDisplayStatus(right);
      const statusDiff = DISPLAY_ORDER[leftStatus.key] - DISPLAY_ORDER[rightStatus.key];

      if (statusDiff !== 0) return statusDiff;

      const leftDate = parseDateOnly(left.date).getTime();
      const rightDate = parseDateOnly(right.date).getTime();

      if (leftStatus.group === "paid" && rightStatus.group === "paid") {
        if (leftDate !== rightDate) return rightDate - leftDate;
      } else if (leftDate !== rightDate) {
        return leftDate - rightDate;
      }

      return right.amount - left.amount;
    });
  }

  const statusFilters: Array<{ key: FinanceFilterKey; label: string }> = [
    { key: "all", label: "Todas" },
    { key: "pending", label: "Pendentes" },
    { key: "paid", label: config.statusFilterPaidLabel },
    { key: "overdue", label: "Vencidas" },
    { key: "due-today", label: "Vencendo hoje" },
  ];

  const monthBaseItems = items.filter((item) => sameMonth(parseDateOnly(item.date), monthCursor));
  const filteredItems = sortItems(monthBaseItems.filter(matchesSearch).filter(matchesStatusFilter));
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleItems = filteredItems.slice(startIndex, startIndex + PAGE_SIZE);
  const paginationSequence = buildPaginationSequence(currentPage, totalPages);
  const start = filteredItems.length === 0 ? 0 : startIndex + 1;
  const end = filteredItems.length === 0 ? 0 : Math.min(startIndex + PAGE_SIZE, filteredItems.length);
  const noun = filteredItems.length === 1 ? config.paginationSingular : config.paginationPlural;

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const summaryCounts = monthBaseItems.reduce(
    (accumulator, item) => {
      const group = getDisplayStatus(item).group;
      if (group === "overdue") accumulator.overdue += 1;
      if (group === "due-today") accumulator.dueToday += 1;
      if (group === "pending") accumulator.pending += 1;
      return accumulator;
    },
    { overdue: 0, dueToday: 0, pending: 0 },
  );

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    const amount = Number(form.amount.replace(",", "."));

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Informe um valor valido maior que zero.");
      setIsSaving(false);
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
      } else {
        await createFinanceTransaction(payload);
      }

      setMonthCursor(startOfMonth(parseDateOnly(form.date)));
      setStatusFilter("all");
      setSearch("");
      setModalOpen(false);
      resetForm();
      await loadTransactions(true);
    } catch (submitError) {
      setError(getErrorMessage(submitError, config.saveError));
    } finally {
      setIsSaving(false);
    }
  }

  async function completeTransaction(item: FinanceTransaction) {
    setError(null);

    try {
      await updateFinanceTransaction(item.id, { status: "completed" });
      await loadTransactions(true);
    } catch (actionError) {
      setError(getErrorMessage(actionError, config.completeError));
    }
  }

  async function deleteTransaction(item: FinanceTransaction) {
    const confirmed = window.confirm(config.deleteConfirm);
    if (!confirmed) return;

    setError(null);

    try {
      await deleteFinanceTransaction(item.id);
      await loadTransactions(true);
    } catch (actionError) {
      setError(getErrorMessage(actionError, config.deleteError));
    }
  }

  function renderStatusIcon(displayStatus: DisplayStatus) {
    const Icon = displayStatus.icon;

    return (
      <span
        className={cn(
          styles.statusIcon,
          displayStatus.key === "paid" && styles.statusIconPaid,
          displayStatus.key === "overdue" && styles.statusIconOverdue,
          displayStatus.key === "due-today" && styles.statusIconToday,
          displayStatus.key === "scheduled" && styles.statusIconScheduled,
          displayStatus.key === "pending" && styles.statusIconPending,
        )}
      >
        <Icon className="size-3.5" />
      </span>
    );
  }

  function renderStatusPill(displayStatus: DisplayStatus) {
    return (
      <span
        className={cn(
          styles.statusPill,
          displayStatus.key === "paid" && styles.statusPillPaid,
          displayStatus.key === "overdue" && styles.statusPillOverdue,
          displayStatus.key === "due-today" && styles.statusPillToday,
          displayStatus.key === "scheduled" && styles.statusPillScheduled,
          displayStatus.key === "pending" && styles.statusPillPending,
        )}
      >
        {displayStatus.label}
      </span>
    );
  }

  return (
    <div className={cn(styles.root, isLoading && styles.screenLoading)}>
      <section className={styles.header}>
        <div className={styles.headerCopy}>
          <h1 className={styles.pageTitle}>{config.pageTitle}</h1>
          <p className={styles.pageSubtitle}>{config.pageSubtitle}</p>
        </div>

        <Button type="button" className={styles.primaryButton} onClick={openCreateModal}>
          <Plus className="size-4" />
          <span>{config.primaryButtonLabel}</span>
        </Button>
      </section>

      {error ? <div className={styles.errorBanner}>{error}</div> : null}

      <section className={styles.toolbarGrid}>
        <label className={styles.toolbarSearch} aria-label={config.searchAriaLabel}>
          <Search className={styles.searchIcon} />
          <Input
            type="search"
            autoComplete="off"
            placeholder={config.searchPlaceholder}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className={styles.toolbarInput}
          />
        </label>

        <div className={styles.monthSwitcher}>
          {[-1, 0, 1].map((offset) => {
            const month = addMonths(monthCursor, offset);
            const active = sameMonth(month, monthCursor);

            return (
              <Button
                key={toDateInputValue(month)}
                type="button"
                variant="ghost"
                className={cn(styles.monthButton, active && styles.monthButtonActive)}
                onClick={() => {
                  setMonthCursor(startOfMonth(month));
                  setPage(1);
                }}
              >
                {formatFinanceMonthLabel(month)}
              </Button>
            );
          })}
        </div>
      </section>

      <section className={styles.filterRow}>
        {statusFilters.map((filter) => (
          <Button
            key={filter.key}
            type="button"
            variant="ghost"
            className={cn(styles.filterChip, statusFilter === filter.key && styles.filterChipActive)}
            onClick={() => {
              setStatusFilter(filter.key);
              setPage(1);
            }}
          >
            {filter.label}
          </Button>
        ))}
      </section>

      <section className={styles.panel}>
        <div className={styles.summary}>
          <span className={styles.summaryOverdue}>{summaryCounts.overdue} {config.summaryOverdueSuffix}</span>
          <span className={styles.summaryDot}>•</span>
          <span className={styles.summaryToday}>{summaryCounts.dueToday} {config.summaryTodaySuffix}</span>
          <span className={styles.summaryDot}>•</span>
          <span className={styles.summaryPending}>{summaryCounts.pending} {config.summaryPendingSuffix}</span>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{config.tablePrimaryHeader}</th>
                <th>Valor (R$)</th>
                <th>{config.tableDateHeader}</th>
                <th>Status</th>
                <th>{config.tableNotesHeader}</th>
                <th>{config.tableActionsHeader}</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className={styles.empty}>
                      <div className={styles.emptyIcon}>
                        <FileText className="size-5" />
                      </div>
                      <p className={styles.emptyTitle}>{config.emptyTitle}</p>
                      <p className={styles.emptyNote}>{config.emptyNote}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleItems.map((item) => {
                  const displayStatus = getDisplayStatus(item);
                  const note = buildObservation(item, displayStatus);

                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        styles.row,
                        displayStatus.key === "paid" && styles.rowPaid,
                        displayStatus.key === "overdue" && styles.rowOverdue,
                        displayStatus.key === "due-today" && styles.rowToday,
                        displayStatus.key === "scheduled" && styles.rowScheduled,
                        displayStatus.key === "pending" && styles.rowPending,
                      )}
                    >
                      <td>
                        <div className={styles.mainCell}>
                          {renderStatusIcon(displayStatus)}
                          <div>
                            <p className={styles.title}>{item.description || "Conta sem descricao"}</p>
                            <p className={styles.subtitle}>{item.category || "Sem categoria"}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={styles.amount}>{formatFinanceAmountPlain(item.amount)}</span>
                      </td>
                      <td>
                        <span
                          className={cn(
                            styles.due,
                            displayStatus.key === "overdue" && styles.dueOverdue,
                            displayStatus.key === "due-today" && styles.dueToday,
                          )}
                        >
                          {formatFinanceDate(item.date)}
                        </span>
                      </td>
                      <td>{renderStatusPill(displayStatus)}</td>
                      <td>
                        <p className={styles.note}>{note}</p>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          {displayStatus.group !== "paid" ? (
                            <Button
                              type="button"
                              className={styles.completeButton}
                              onClick={() => void completeTransaction(item)}
                            >
                              {config.actionCompleteLabel}
                            </Button>
                          ) : null}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="ghost" size="icon" className={styles.menuTrigger}>
                                <MoreVertical className="size-4" />
                                <span className="sr-only">Abrir menu da conta</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className={styles.menuContent}>
                              <DropdownMenuItem onSelect={() => openEditModal(item)}>
                                <Pencil className="size-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem className={styles.menuDanger} onSelect={() => void deleteTransaction(item)}>
                                <Trash2 className="size-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.mobileList}>
          {visibleItems.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>
                <FileText className="size-5" />
              </div>
              <p className={styles.emptyTitle}>{config.emptyTitle}</p>
              <p className={styles.emptyNote}>{config.emptyNote}</p>
            </div>
          ) : (
            visibleItems.map((item) => {
              const displayStatus = getDisplayStatus(item);
              const note = buildObservation(item, displayStatus);

              return (
                <article
                  key={item.id}
                  className={cn(
                    styles.mobileCard,
                    displayStatus.key === "paid" && styles.mobileCardPaid,
                    displayStatus.key === "overdue" && styles.mobileCardOverdue,
                    displayStatus.key === "due-today" && styles.mobileCardToday,
                    displayStatus.key === "scheduled" && styles.mobileCardScheduled,
                    displayStatus.key === "pending" && styles.mobileCardPending,
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={styles.mainCell}>
                      {renderStatusIcon(displayStatus)}
                      <div>
                        <p className={styles.title}>{item.description || "Conta sem descricao"}</p>
                        <p className={styles.subtitle}>{item.category || "Sem categoria"}</p>
                      </div>
                    </div>
                    {renderStatusPill(displayStatus)}
                  </div>

                  <div className={styles.mobileGrid}>
                    <div>
                      <p className={styles.mobileLabel}>Valor</p>
                      <p className={styles.mobileValue}>{formatFinanceCurrency(item.amount)}</p>
                    </div>
                    <div>
                      <p className={styles.mobileLabel}>{config.tableDateHeader}</p>
                      <p className={styles.mobileValue}>{formatFinanceDate(item.date)}</p>
                    </div>
                    <div className={styles.mobileWide}>
                      <p className={styles.mobileLabel}>Observacoes</p>
                      <p className={styles.mobileValue}>{note}</p>
                    </div>
                  </div>

                  <div className={styles.mobileActions}>
                    {displayStatus.group !== "paid" ? (
                      <Button
                        type="button"
                        className={styles.completeButton}
                        onClick={() => void completeTransaction(item)}
                      >
                        {config.actionCompleteLabel}
                      </Button>
                    ) : null}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className={styles.menuTrigger}>
                          <MoreVertical className="size-4" />
                          <span className="sr-only">Abrir menu da conta</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className={styles.menuContent}>
                        <DropdownMenuItem onSelect={() => openEditModal(item)}>
                          <Pencil className="size-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className={styles.menuDanger} onSelect={() => void deleteTransaction(item)}>
                          <Trash2 className="size-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <div className={styles.footer}>
          <p className={styles.footerInfo}>Mostrando {start}-{end} de {filteredItems.length} {noun}</p>
          <div className={styles.pagination}>
            {filteredItems.length > PAGE_SIZE ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  className={cn(styles.pageButton, currentPage <= 1 && styles.pageButtonDisabled)}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={currentPage <= 1}
                >
                  Anterior
                </Button>
                {paginationSequence.map((item, index) => (
                  item === "..." ? (
                    <span key={`ellipsis-${index}`} className={styles.pageEllipsis}>...</span>
                  ) : (
                    <Button
                      key={item}
                      type="button"
                      variant="ghost"
                      className={cn(styles.pageButton, item === currentPage && styles.pageButtonActive)}
                      onClick={() => setPage(item)}
                    >
                      {item}
                    </Button>
                  )
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  className={cn(styles.pageButton, currentPage >= totalPages && styles.pageButtonDisabled)}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Proxima
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </section>

      <Dialog open={modalOpen} onOpenChange={handleOpenChange}>
        <DialogContent className={styles.dialogContent}>
          <form onSubmit={submitForm}>
            <DialogHeader className={styles.dialogHeader}>
              <DialogTitle>{editingId ? config.modalEditTitle : config.modalNewTitle}</DialogTitle>
              <DialogDescription>
                {editingId ? config.modalEditSubtitle : config.modalNewSubtitle}
              </DialogDescription>
            </DialogHeader>

            <div className={styles.dialogBody}>
              <section className={styles.dialogSection}>
                <h3 className={styles.dialogSectionTitle}>Dados principais</h3>
                <div className={styles.dialogGrid}>
                  <div className={cn(styles.dialogField, styles.dialogFieldWide)}>
                    <label className={styles.dialogLabel} htmlFor={`${mode}-description`}>
                      {config.modalDescriptionLabel}
                    </label>
                    <Input
                      id={`${mode}-description`}
                      className={styles.dialogInput}
                      maxLength={300}
                      placeholder={config.modalDescriptionPlaceholder}
                      value={form.description}
                      onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                      required
                    />
                  </div>

                  <div className={styles.dialogField}>
                    <label className={styles.dialogLabel} htmlFor={`${mode}-category`}>
                      Categoria
                    </label>
                    <Input
                      id={`${mode}-category`}
                      className={styles.dialogInput}
                      maxLength={120}
                      placeholder={config.modalCategoryPlaceholder}
                      value={form.category}
                      onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                      required
                    />
                  </div>

                  <div className={styles.dialogField}>
                    <label className={styles.dialogLabel} htmlFor={`${mode}-amount`}>
                      Valor (R$)
                    </label>
                    <Input
                      id={`${mode}-amount`}
                      type="number"
                      min="0.01"
                      step="0.01"
                      inputMode="decimal"
                      className={styles.dialogInput}
                      placeholder="0,00"
                      value={form.amount}
                      onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                      required
                    />
                  </div>
                </div>
              </section>

              <section className={styles.dialogSection}>
                <h3 className={styles.dialogSectionTitle}>Agenda</h3>
                <div className={styles.dialogGrid}>
                  <div className={styles.dialogField}>
                    <label className={styles.dialogLabel} htmlFor={`${mode}-date`}>
                      {config.modalDateLabel}
                    </label>
                    <Input
                      id={`${mode}-date`}
                      type="date"
                      className={styles.dialogInput}
                      value={form.date}
                      onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                      required
                    />
                  </div>

                  <div className={styles.dialogField}>
                    <label className={styles.dialogLabel} htmlFor={`${mode}-status`}>
                      Situacao
                    </label>
                    <select
                      id={`${mode}-status`}
                      className={styles.dialogSelect}
                      value={form.status}
                      onChange={(event) => setForm((current) => ({
                        ...current,
                        status: event.target.value as FinanceTransactionStatus,
                      }))}
                    >
                      <option value="pending">Pendente</option>
                      <option value="scheduled">Agendada</option>
                      <option value="completed">{config.completedOptionLabel}</option>
                    </select>
                  </div>
                </div>
              </section>
            </div>

            <DialogFooter className={styles.dialogFooter}>
              <DialogClose asChild>
                <Button type="button" variant="ghost" className={styles.dialogCancelButton}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" className={styles.dialogPrimaryButton} disabled={isSaving}>
                {isSaving ? "Salvando..." : editingId ? config.modalSaveEditLabel : config.modalSaveNewLabel}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
