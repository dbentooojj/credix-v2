import type { FinanceTransactionType } from "@/src/lib/api";

export type FinanceViewConfig = {
  mode: FinanceTransactionType;
  itemType: FinanceTransactionType;
  pageTitle: string;
  pageSubtitle: string;
  primaryButtonLabel: string;
  searchAriaLabel: string;
  searchPlaceholder: string;
  summaryOverdueSuffix: string;
  summaryTodaySuffix: string;
  summaryPendingSuffix: string;
  tablePrimaryHeader: string;
  tableDateHeader: string;
  tableNotesHeader: string;
  tableActionsHeader: string;
  paginationSingular: string;
  paginationPlural: string;
  modalNewTitle: string;
  modalEditTitle: string;
  modalNewSubtitle: string;
  modalEditSubtitle: string;
  modalDescriptionLabel: string;
  modalDescriptionPlaceholder: string;
  modalCategoryPlaceholder: string;
  modalDateLabel: string;
  modalSaveNewLabel: string;
  modalSaveEditLabel: string;
  completedOptionLabel: string;
  statusFilterPaidLabel: string;
  actionCompleteLabel: string;
  emptyTitle: string;
  emptyNote: string;
  loadError: string;
  saveError: string;
  saveSuccessCreate: string;
  saveSuccessEdit: string;
  completeError: string;
  completeSuccess: string;
  deleteConfirm: string;
  deleteError: string;
  deleteSuccess: string;
  observationPaid: string;
  observationToday: string;
  observationScheduled: string;
  observationPending: string;
  statusPaidLabel: string;
  statusOverdueLabel: string;
  statusTodayLabel: string;
  statusScheduledLabel: string;
  statusPendingLabel: string;
};

const financeViewConfigs: Record<FinanceTransactionType, FinanceViewConfig> = {
  income: {
    mode: "income",
    itemType: "income",
    pageTitle: "Valores a receber",
    pageSubtitle: "Acompanhe valores previstos, atrasos e recebimentos de forma eficiente.",
    primaryButtonLabel: "Nova conta",
    searchAriaLabel: "Buscar contas a receber",
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
    modalNewTitle: "Nova conta a receber",
    modalEditTitle: "Editar conta a receber",
    modalNewSubtitle: "Cadastre um valor previsto para recebimento.",
    modalEditSubtitle: "Ajuste os dados do recebimento antes de salvar a alteracao.",
    modalDescriptionLabel: "Conta",
    modalDescriptionPlaceholder: "Ex: Parcela cliente Joao",
    modalCategoryPlaceholder: "Ex: Receita recorrente",
    modalDateLabel: "Vencimento",
    modalSaveNewLabel: "Salvar conta",
    modalSaveEditLabel: "Salvar alteracoes",
    completedOptionLabel: "Recebida",
    statusFilterPaidLabel: "Recebidas",
    actionCompleteLabel: "Receber",
    emptyTitle: "Nenhuma conta encontrada.",
    emptyNote: "Ajuste os filtros ou cadastre uma nova conta para preencher esta lista.",
    loadError: "Falha ao carregar as contas a receber.",
    saveError: "Falha ao salvar a conta.",
    saveSuccessCreate: "Conta cadastrada com sucesso.",
    saveSuccessEdit: "Conta atualizada com sucesso.",
    completeError: "Falha ao receber a conta.",
    completeSuccess: "Conta recebida com sucesso.",
    deleteConfirm: "Deseja excluir esta conta?",
    deleteError: "Falha ao excluir a conta.",
    deleteSuccess: "Conta excluida com sucesso.",
    observationPaid: "Recebimento registrado no sistema.",
    observationToday: "Recebimento previsto para hoje.",
    observationScheduled: "Recebimento agendado para esta data.",
    observationPending: "Aguardando confirmacao financeira.",
    statusPaidLabel: "Recebida",
    statusOverdueLabel: "Vencida",
    statusTodayLabel: "Vence hoje",
    statusScheduledLabel: "Agendada",
    statusPendingLabel: "Pendente",
  },
  expense: {
    mode: "expense",
    itemType: "expense",
    pageTitle: "Contas a pagar",
    pageSubtitle: "Gerencie suas obrigacoes financeiras de forma eficiente.",
    primaryButtonLabel: "Nova conta",
    searchAriaLabel: "Buscar contas",
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
    modalNewTitle: "Nova conta",
    modalEditTitle: "Editar conta",
    modalNewSubtitle: "Cadastre uma obrigacao financeira do modulo.",
    modalEditSubtitle: "Ajuste os dados financeiros antes de salvar a alteracao.",
    modalDescriptionLabel: "Conta",
    modalDescriptionPlaceholder: "Ex: Aluguel escritorio",
    modalCategoryPlaceholder: "Ex: Operacional",
    modalDateLabel: "Vencimento",
    modalSaveNewLabel: "Salvar conta",
    modalSaveEditLabel: "Salvar alteracoes",
    completedOptionLabel: "Paga",
    statusFilterPaidLabel: "Pagas",
    actionCompleteLabel: "Baixar",
    emptyTitle: "Nenhuma conta encontrada.",
    emptyNote: "Ajuste os filtros ou cadastre uma nova conta para preencher esta lista.",
    loadError: "Falha ao carregar as contas a pagar.",
    saveError: "Falha ao salvar a conta.",
    saveSuccessCreate: "Conta cadastrada com sucesso.",
    saveSuccessEdit: "Conta atualizada com sucesso.",
    completeError: "Falha ao baixar a conta.",
    completeSuccess: "Conta baixada com sucesso.",
    deleteConfirm: "Deseja excluir esta conta?",
    deleteError: "Falha ao excluir a conta.",
    deleteSuccess: "Conta excluida com sucesso.",
    observationPaid: "Pagamento registrado no sistema.",
    observationToday: "Compromisso previsto para hoje.",
    observationScheduled: "Pagamento agendado para esta data.",
    observationPending: "Aguardando baixa financeira.",
    statusPaidLabel: "Paga",
    statusOverdueLabel: "Vencida",
    statusTodayLabel: "Vence hoje",
    statusScheduledLabel: "Agendada",
    statusPendingLabel: "Pendente",
  },
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const amountFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function getFinanceViewConfig(mode: FinanceTransactionType) {
  return financeViewConfigs[mode];
}

export function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function toDateInputValue(date: Date) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addMonths(date: Date, diff: number) {
  return new Date(date.getFullYear(), date.getMonth() + diff, 1);
}

export function sameMonth(date: Date, monthCursor: Date) {
  return date.getFullYear() === monthCursor.getFullYear() && date.getMonth() === monthCursor.getMonth();
}

export function formatFinanceCurrency(value: number) {
  return currencyFormatter.format(Number(value) || 0);
}

export function formatFinanceAmountPlain(value: number) {
  return amountFormatter.format(Number(value) || 0);
}

export function formatFinanceDate(value: string) {
  return dateFormatter.format(parseDateOnly(value));
}

export function formatFinanceMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long" })
    .format(date)
    .replace(/^\p{L}/u, (character) => character.toUpperCase());
}

export function getFinanceTodayDate() {
  return toDateInputValue(new Date());
}
