import { apiClient } from "./api-client";

export type DashboardMetric = "recebido" | "emprestado" | "lucro";
export type DashboardPeriod = "3m" | "6m" | "12m";

export type DashboardQuery = {
  period?: DashboardPeriod;
  metric?: DashboardMetric;
  tz?: string;
  recentMovementsPage?: number;
  recentMovementsPageSize?: number;
};

export type DashboardMeta = {
  generatedAt?: string;
  timezone?: string;
  period?: DashboardPeriod;
  metric?: DashboardMetric;
};

export type DashboardKpiCardMetric = {
  currentValue?: number;
  value?: number;
  previousValue?: number;
  insight?: {
    text?: string;
    tone?: "positive" | "negative" | "neutral";
  };
  series?: Array<number | DashboardSparklinePoint>;
};

export type DashboardSparklinePoint = {
  month?: string;
  label?: string;
  value?: number;
};

export type DashboardKpis = {
  cashBalance?: number;
  totalToReceive?: number;
  totalOpenReceivable?: number;
  openReceivableFuture?: number;
  openReceivableOverdue?: number;
  receivedThisMonth?: number;
  profitThisMonth?: number;
  profitTotal?: number;
  roiRate?: number;
  totalLoaned?: number;
  cashAdjustmentNet?: number;
  [key: string]: number | undefined;
};

export type DashboardSummaryCard = {
  value?: number;
  note?: string;
  href?: string;
  loanValue?: number;
  financeValue?: number;
  receivableValue?: number;
  payableValue?: number;
  itemsCount?: number;
};

export type DashboardDailySummaryEntry = {
  count?: number;
  totalValue?: number;
  href?: string;
};

export type DashboardChartPoint = {
  month?: string;
  label?: string;
  value?: number;
  received?: number;
  open?: number;
  overdue?: number;
};

export type DashboardChart = {
  metric?: DashboardMetric;
  period?: DashboardPeriod;
  points?: DashboardChartPoint[];
  hasData?: boolean;
  emptyMessage?: string;
};

export type DashboardPaymentItem = {
  installmentId: number;
  loanId: number;
  debtorId?: number;
  debtorName?: string;
  amount: number;
  dueDate: string;
  dueRelative?: string;
  status?: string;
  statusLabel?: string;
  statusColor?: "green" | "yellow" | "red";
  paymentMethod?: "PIX" | "DINHEIRO" | "TRANSFERENCIA" | "CARTAO";
  phone?: string | null;
  whatsappPhone?: string | null;
};

export type DashboardResponse = {
  meta?: DashboardMeta;
  kpis?: DashboardKpis;
  kpiCards?: Record<string, DashboardKpiCardMetric>;
  cashAdjustment?: {
    net?: number;
  };
  overviewSummary?: {
    cashBalance?: DashboardSummaryCard;
    accountsReceivable?: DashboardSummaryCard;
    accountsPayable?: DashboardSummaryCard;
    projectedBalance?: DashboardSummaryCard;
  };
  dailySummary?: {
    dueToday?: DashboardDailySummaryEntry;
    overdue?: DashboardDailySummaryEntry;
    next7Days?: DashboardDailySummaryEntry;
  };
  dailyOperations?: {
    receiptsToday?: {
      totalValue?: number;
      items?: Array<Record<string, unknown>>;
    };
    paymentsToday?: {
      totalValue?: number;
      items?: Array<Record<string, unknown>>;
    };
    alerts?: {
      overdueIncomingCount?: number;
      overdueOutgoingCount?: number;
      incomingHref?: string;
      outgoingHref?: string;
    };
  };
  chart?: DashboardChart;
  recentMovements?: Array<Record<string, unknown>>;
  recentMovementsPagination?: {
    page?: number;
    pageSize?: number;
    totalItems?: number;
    totalPages?: number;
  };
  upcomingDue?: DashboardPaymentItem[];
  overduePayments?: DashboardPaymentItem[];
  ranking?: Array<Record<string, unknown>>;
};

export type CashAdjustmentPayload = {
  type: "income" | "expense";
  amount: number;
  date?: string;
  description?: string;
};

export type CashAdjustmentResponse = {
  data: {
    id: number;
    type: "income" | "expense";
    amount: number;
    date: string;
    description: string;
  };
};

export async function getDashboard(query: DashboardQuery = {}, signal?: AbortSignal) {
  return apiClient.get<DashboardResponse>("/api/dashboard", { query, signal });
}

export async function createCashAdjustment(payload: CashAdjustmentPayload) {
  return apiClient.post<CashAdjustmentResponse, CashAdjustmentPayload>("/api/dashboard/cash-adjustments", payload);
}
