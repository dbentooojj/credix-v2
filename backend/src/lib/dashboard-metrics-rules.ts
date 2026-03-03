export type DashboardTransactionType = "revenue" | "expense" | "adjustment" | "loan" | "repayment";

export type DashboardTransactionImpact = {
  isAdjustment: boolean;
  affectsRevenue: boolean;
  affectsProfit: boolean;
  affectsBalance: boolean;
};

export type DashboardTransaction = {
  type: DashboardTransactionType;
  amountSigned: number;
};

export type DashboardMetricsBase = {
  cashBalanceBase: number;
  receivedThisMonth: number;
  profitThisMonth: number;
  profitTotal: number;
  roiRate: number;
  totalOverdue: number;
  totalLoaned: number;
};

export type DashboardMetricsWithAdjustments = DashboardMetricsBase & {
  cashAdjustmentNet: number;
  cashBalance: number;
};

const DASHBOARD_TRANSACTION_IMPACT_MAP: Record<DashboardTransactionType, DashboardTransactionImpact> = {
  revenue: {
    isAdjustment: false,
    affectsRevenue: true,
    affectsProfit: true,
    affectsBalance: true,
  },
  expense: {
    isAdjustment: false,
    affectsRevenue: false,
    affectsProfit: true,
    affectsBalance: true,
  },
  adjustment: {
    isAdjustment: true,
    affectsRevenue: false,
    affectsProfit: false,
    affectsBalance: true,
  },
  loan: {
    isAdjustment: false,
    affectsRevenue: false,
    affectsProfit: false,
    affectsBalance: false,
  },
  repayment: {
    isAdjustment: false,
    affectsRevenue: true,
    affectsProfit: false,
    affectsBalance: false,
  },
};

export function getDashboardTransactionImpact(type: DashboardTransactionType): DashboardTransactionImpact {
  return DASHBOARD_TRANSACTION_IMPACT_MAP[type];
}

export function applyDashboardAdjustments(
  baseMetrics: DashboardMetricsBase,
  transactions: DashboardTransaction[],
): DashboardMetricsWithAdjustments {
  let cashAdjustmentNet = 0;
  let balanceDelta = 0;

  transactions.forEach((transaction) => {
    const { isAdjustment, affectsBalance } = getDashboardTransactionImpact(transaction.type);
    if (!Number.isFinite(transaction.amountSigned)) return;

    if (isAdjustment) {
      cashAdjustmentNet += transaction.amountSigned;
      if (affectsBalance) {
        balanceDelta += transaction.amountSigned;
      }
    }
  });

  return {
    ...baseMetrics,
    cashAdjustmentNet,
    cashBalance: baseMetrics.cashBalanceBase + balanceDelta,
  };
}
