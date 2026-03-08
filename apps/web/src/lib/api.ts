export type ApiHealth = {
  status: string;
  service: string;
  timestamp: string;
};

export type ApiMeta = {
  name: string;
  version: string;
  architecture: string;
};

export type FinanceTransactionType = "income" | "expense";
export type FinanceTransactionStatus = "completed" | "scheduled" | "pending";

export type FinanceTransaction = {
  id: string;
  type: FinanceTransactionType;
  amount: number;
  category: string;
  date: string;
  description: string;
  status: FinanceTransactionStatus;
};

export type FinanceTransactionFilters = {
  type?: FinanceTransactionType;
  status?: FinanceTransactionStatus;
  search?: string;
};

export type FinanceTransactionPayload = {
  type: FinanceTransactionType;
  amount: number;
  category: string;
  date: string;
  description: string;
  status: FinanceTransactionStatus;
};

export type ApiSnapshot = {
  baseUrl: string;
  health: ApiHealth | null;
  meta: ApiMeta | null;
};

export type DashboardSummaryCard = {
  value?: number;
  note?: string;
  href?: string;
};

export type DashboardOperationItem = {
  href?: string;
  typeLabel?: string;
  moduleLabel?: string;
  title?: string;
  subtitle?: string;
  amount?: number;
  date?: string;
};

export type DashboardMonthlyPoint = {
  label?: string;
  value?: number;
  received?: number;
  open?: number;
  overdue?: number;
};

export type DashboardRecentMovement = {
  id?: string;
  href?: string;
  direction?: "in" | "out";
  typeLabel?: string;
  moduleLabel?: string;
  title?: string;
  subtitle?: string;
  amount?: number;
  date?: string;
};

export type DashboardOverview = {
  meta?: {
    generatedAt?: string;
    timezone?: string;
    period?: string;
    metric?: string;
  };
  cashAdjustment?: {
    net?: number;
  };
  overviewSummary?: {
    cashBalance?: DashboardSummaryCard;
    accountsReceivable?: DashboardSummaryCard & {
      loanValue?: number;
      financeValue?: number;
    };
    accountsPayable?: DashboardSummaryCard & {
      itemsCount?: number;
    };
    projectedBalance?: DashboardSummaryCard & {
      receivableValue?: number;
      payableValue?: number;
    };
  };
  dailyOperations?: {
    receiptsToday?: {
      totalValue?: number;
      items?: DashboardOperationItem[];
    };
    paymentsToday?: {
      totalValue?: number;
      items?: DashboardOperationItem[];
    };
    alerts?: {
      overdueIncomingCount?: number;
      overdueOutgoingCount?: number;
      incomingHref?: string;
      outgoingHref?: string;
      dueTodayCount?: number;
      projectedBalance?: number;
      currentMonthExposure?: number;
    };
  };
  chart?: {
    metric?: string;
    period?: string;
    points?: DashboardMonthlyPoint[];
    hasData?: boolean;
    emptyMessage?: string;
    currentMonthKey?: string;
  };
  recentMovements?: DashboardRecentMovement[];
};

export type PortfolioOverviewItem = {
  id?: string;
  customerName?: string;
  loanLabel?: string;
  installmentLabel?: string;
  amount?: number;
  dueDate?: string;
  timingLabel?: string;
};

export type PortfolioMonthlyPoint = {
  label?: string;
  monthKey?: string;
  received?: number;
  open?: number;
  overdue?: number;
};

export type PortfolioInstallmentDisplayStatus = "paid" | "pending" | "overdue" | "due-today";
export type PortfolioCustomerStatus = "healthy" | "watch" | "overdue";
export type PortfolioLoanStatus = "active" | "inactive";
export type PortfolioLoanFinancialStatus = "healthy" | "overdue" | "settled";
export type PortfolioLoanSimulationStatus = "DRAFT" | "SENT" | "ACCEPTED" | "EXPIRED" | "CANCELED";
export type PortfolioLoanSimulationInterestType = "simples" | "composto" | "fixo";

export type PortfolioLoanItem = {
  id?: string;
  customerName?: string;
  principalAmount?: number;
  totalAmount?: number;
  installmentCount?: number;
  paidInstallments?: number;
  openInstallments?: number;
  overdueInstallments?: number;
  interestAmount?: number;
  interestRate?: number;
  interestType?: PortfolioLoanSimulationInterestType;
  fixedFeeAmount?: number;
  issuedAt?: string;
  firstDueDate?: string | null;
  nextDueDate?: string | null;
  observations?: string;
  status?: PortfolioLoanStatus;
  statusLabel?: string;
  financialStatus?: PortfolioLoanFinancialStatus;
  financialStatusLabel?: string;
  statusNote?: string;
};

export type PortfolioLoansResponse = {
  meta?: {
    generatedAt?: string;
    timezone?: string;
    currentMonthKey?: string;
    todayDate?: string;
  };
  summary?: {
    totalLoans?: number;
    activeLoans?: number;
    inactiveLoans?: number;
    overdueLoans?: number;
    principalTotal?: number;
    contractedTotal?: number;
    overdueBalance?: number;
  };
  data?: PortfolioLoanItem[];
};

export type PortfolioLoanDetailsResponse = {
  meta?: {
    generatedAt?: string;
    timezone?: string;
    currentMonthKey?: string;
    todayDate?: string;
  };
  loan?: PortfolioLoanItem & {
    loanLabel?: string;
    firstDueDate?: string | null;
    nextInstallmentLabel?: string | null;
    nextInstallmentAmount?: number | null;
  };
  installments?: PortfolioInstallmentItem[];
};

export type PortfolioLoanPayload = {
  customerName: string;
  principalAmount: number;
  interestType: PortfolioLoanSimulationInterestType;
  interestRate: number;
  fixedFeeAmount: number;
  installmentsCount: number;
  issuedAt: string;
  firstDueDate: string;
  observations?: string;
};

export type PortfolioReportLoanItem = PortfolioLoanItem & {
  frequency?: "mensal" | "quinzenal";
};

export type PortfolioReportInstallmentItem = PortfolioInstallmentItem & {
  interestType?: PortfolioLoanSimulationInterestType;
  frequency?: "mensal" | "quinzenal";
  loanPrincipalAmount?: number;
  loanStatus?: PortfolioLoanStatus;
  loanStatusLabel?: string;
};

export type PortfolioReportsResponse = {
  meta?: {
    generatedAt?: string;
    timezone?: string;
    todayDate?: string;
  };
  filters?: {
    customers?: Array<{
      value?: string;
      label?: string;
    }>;
  };
  loans?: PortfolioReportLoanItem[];
  installments?: PortfolioReportInstallmentItem[];
};

export type PortfolioLoanSimulationItem = {
  id?: string;
  displayId?: number;
  customerName?: string;
  principalAmount?: number;
  totalAmount?: number;
  installmentsCount?: number;
  interestType?: PortfolioLoanSimulationInterestType;
  interestRate?: number;
  fixedFeeAmount?: number;
  status?: PortfolioLoanSimulationStatus;
  statusLabel?: string;
  expiresAt?: string;
};

export type PortfolioLoanSimulationsResponse = {
  meta?: {
    generatedAt?: string;
    timezone?: string;
  };
  summary?: {
    total?: number;
    pending?: number;
  };
  data?: PortfolioLoanSimulationItem[];
};

export type PortfolioInstallmentItem = {
  id?: string;
  loanId?: string;
  customerName?: string;
  loanLabel?: string;
  installmentLabel?: string;
  installmentNumber?: number;
  totalInstallments?: number;
  dueDate?: string;
  paidDate?: string | null;
  amount?: number;
  principalAmount?: number;
  interestAmount?: number;
  status?: PortfolioInstallmentDisplayStatus;
  statusLabel?: string;
  timingLabel?: string;
};

export type PortfolioInstallmentsResponse = {
  meta?: {
    generatedAt?: string;
    timezone?: string;
    currentMonthKey?: string;
    todayDate?: string;
  };
  summary?: {
    receivedMonth?: {
      value?: number;
      count?: number;
    };
    pendingTotal?: {
      value?: number;
      count?: number;
    };
    overdueTotal?: {
      value?: number;
      count?: number;
    };
  };
  filters?: {
    customers?: Array<{
      value?: string;
      label?: string;
    }>;
  };
  data?: PortfolioInstallmentItem[];
};

type PortfolioInstallmentResponse = {
  data: PortfolioInstallmentItem;
};

export type PortfolioCustomerItem = {
  id?: string;
  customerName?: string;
  contractCount?: number;
  activeContracts?: number;
  totalLoaned?: number;
  openBalance?: number;
  overdueBalance?: number;
  receivedThisMonth?: number;
  receivedTotal?: number;
  openInstallments?: number;
  overdueInstallments?: number;
  paidInstallments?: number;
  nextDueDate?: string | null;
  lastPaymentDate?: string | null;
  status?: PortfolioCustomerStatus;
  statusLabel?: string;
  statusNote?: string;
};

export type PortfolioCustomersResponse = {
  meta?: {
    generatedAt?: string;
    timezone?: string;
    currentMonthKey?: string;
    todayDate?: string;
  };
  summary?: {
    totalCustomers?: number;
    activeCustomers?: number;
    overdueCustomers?: number;
    watchCustomers?: number;
    totalLoaned?: number;
    openBalance?: number;
    overdueBalance?: number;
    receivedThisMonth?: number;
  };
  data?: PortfolioCustomerItem[];
};

export type PortfolioCustomerContractItem = {
  id?: string;
  loanLabel?: string;
  issuedAt?: string;
  principalAmount?: number;
  installmentCount?: number;
  openInstallments?: number;
  paidInstallments?: number;
  overdueInstallments?: number;
  openBalance?: number;
  overdueBalance?: number;
  nextDueDate?: string | null;
};

export type PortfolioCustomerDetailsResponse = {
  meta?: {
    generatedAt?: string;
    timezone?: string;
    currentMonthKey?: string;
    todayDate?: string;
  };
  customer?: PortfolioCustomerItem;
  contracts?: PortfolioCustomerContractItem[];
  upcomingInstallments?: PortfolioInstallmentItem[];
  overdueInstallments?: PortfolioInstallmentItem[];
};

export type PortfolioOverview = {
  meta?: {
    generatedAt?: string;
    timezone?: string;
  };
  highlights?: {
    activeContracts?: number;
    activeCustomers?: number;
    delinquencyRate?: number;
  };
  kpis?: {
    cashBalance?: number;
    receivedThisMonth?: number;
    openReceivableTotal?: number;
    openReceivableFuture?: number;
    openReceivableOverdue?: number;
    profitThisMonth?: number;
    profitTotal?: number;
    roiRate?: number;
    totalLoaned?: number;
  };
  health?: {
    score?: number;
    scoreLabel?: string;
    healthyContracts?: number;
    contractsAtRisk?: number;
    overdueCustomers?: number;
    averageTicket?: number;
    averageInstallment?: number;
    openInterestPotential?: number;
    collectionRateThisMonth?: number;
    overdueExposure?: number;
  };
  chart?: {
    period?: string;
    points?: PortfolioMonthlyPoint[];
    hasData?: boolean;
    emptyMessage?: string;
    currentMonthKey?: string;
  };
  dailySummary?: {
    dueToday?: {
      count?: number;
      totalValue?: number;
    };
    overdue?: {
      count?: number;
      totalValue?: number;
    };
    next7Days?: {
      count?: number;
      totalValue?: number;
    };
  };
  upcomingDue?: PortfolioOverviewItem[];
  overduePayments?: PortfolioOverviewItem[];
};

type FinanceTransactionListResponse = {
  data: FinanceTransaction[];
  meta: {
    total: number;
  };
};

type FinanceTransactionResponse = {
  data: FinanceTransaction;
};

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export function getApiBaseUrl() {
  const isServer = typeof window === "undefined";
  const baseUrl = isServer
    ? (process.env.API_INTERNAL_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000")
    : (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000");

  return normalizeBaseUrl(baseUrl);
}

async function fetchApiJson<T>(path: string): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Falha ao consultar ${path}. Status ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

async function requestApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const message = payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string"
      ? payload.message
      : `Falha ao consultar ${path}. Status ${response.status}.`;

    throw new Error(message);
  }

  return payload as T;
}

export async function getApiSnapshot(): Promise<ApiSnapshot> {
  const [health, meta] = await Promise.allSettled([
    fetchApiJson<ApiHealth>("/health"),
    fetchApiJson<ApiMeta>("/api/meta"),
  ]);

  return {
    baseUrl: getApiBaseUrl(),
    health: health.status === "fulfilled" ? health.value : null,
    meta: meta.status === "fulfilled" ? meta.value : null,
  };
}

export async function getDashboardOverview(period: "3m" | "6m" | "12m" = "6m") {
  const searchParams = new URLSearchParams({
    period,
    metric: "recebido",
    tz: "America/Sao_Paulo",
  });

  return requestApi<DashboardOverview>(`/api/dashboard?${searchParams.toString()}`);
}

export async function getPortfolioOverview(period: "3m" | "6m" | "12m" = "6m") {
  const searchParams = new URLSearchParams({
    period,
    tz: "America/Sao_Paulo",
  });

  return requestApi<PortfolioOverview>(`/api/portfolio/overview?${searchParams.toString()}`);
}

export async function getPortfolioLoans() {
  const searchParams = new URLSearchParams({
    period: "6m",
    tz: "America/Sao_Paulo",
  });

  return requestApi<PortfolioLoansResponse>(`/api/portfolio/loans?${searchParams.toString()}`);
}

export async function getPortfolioLoanDetails(id: string) {
  const searchParams = new URLSearchParams({
    period: "6m",
    tz: "America/Sao_Paulo",
  });

  return requestApi<PortfolioLoanDetailsResponse>(`/api/portfolio/loans/${encodeURIComponent(id)}?${searchParams.toString()}`);
}

export async function createPortfolioLoan(payload: PortfolioLoanPayload) {
  return requestApi<PortfolioLoanDetailsResponse>("/api/portfolio/loans", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updatePortfolioLoan(id: string, payload: PortfolioLoanPayload) {
  return requestApi<PortfolioLoanDetailsResponse>(`/api/portfolio/loans/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function getPortfolioLoanSimulations() {
  const searchParams = new URLSearchParams({
    period: "6m",
    tz: "America/Sao_Paulo",
  });

  return requestApi<PortfolioLoanSimulationsResponse>(`/api/portfolio/loan-simulations?${searchParams.toString()}`);
}

export async function getPortfolioReports() {
  const searchParams = new URLSearchParams({
    period: "6m",
    tz: "America/Sao_Paulo",
  });

  return requestApi<PortfolioReportsResponse>(`/api/portfolio/reports?${searchParams.toString()}`);
}

export async function getPortfolioInstallments() {
  const searchParams = new URLSearchParams({
    period: "6m",
    tz: "America/Sao_Paulo",
  });

  return requestApi<PortfolioInstallmentsResponse>(`/api/portfolio/installments?${searchParams.toString()}`);
}

export async function getPortfolioCustomers() {
  const searchParams = new URLSearchParams({
    period: "6m",
    tz: "America/Sao_Paulo",
  });

  return requestApi<PortfolioCustomersResponse>(`/api/portfolio/customers?${searchParams.toString()}`);
}

export async function getPortfolioCustomerDetails(id: string) {
  const searchParams = new URLSearchParams({
    period: "6m",
    tz: "America/Sao_Paulo",
  });

  return requestApi<PortfolioCustomerDetailsResponse>(`/api/portfolio/customers/${encodeURIComponent(id)}?${searchParams.toString()}`);
}

export async function updatePortfolioInstallment(
  id: string,
  payload: {
    status?: "pending" | "completed";
    paidDate?: string | null;
    dueDate?: string;
    principalAmount?: number;
    interestAmount?: number;
  },
) {
  return requestApi<PortfolioInstallmentResponse>(`/api/portfolio/installments/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function listFinanceTransactions(filters: FinanceTransactionFilters = {}) {
  const searchParams = new URLSearchParams();

  if (filters.type) searchParams.set("type", filters.type);
  if (filters.status) searchParams.set("status", filters.status);
  if (filters.search) searchParams.set("search", filters.search);

  const query = searchParams.toString();
  const path = query ? `/api/finance/transactions?${query}` : "/api/finance/transactions";

  return requestApi<FinanceTransactionListResponse>(path);
}

export async function createFinanceTransaction(payload: FinanceTransactionPayload) {
  return requestApi<FinanceTransactionResponse>("/api/finance/transactions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateFinanceTransaction(id: string, payload: Partial<FinanceTransactionPayload>) {
  return requestApi<FinanceTransactionResponse>(`/api/finance/transactions/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteFinanceTransaction(id: string) {
  await requestApi<null>(`/api/finance/transactions/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
