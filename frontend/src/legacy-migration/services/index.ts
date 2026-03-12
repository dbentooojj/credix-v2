export { ApiClientError, apiClient, createApiClient, toApiDate, toApiNumber } from "./api-client";

export {
  forgotPassword,
  getCurrentSession,
  login,
  logout,
  resetPassword,
  updatePassword,
  updateProfile,
} from "./auth-service";
export type {
  AuthMeResponse,
  AuthMessageResponse,
  AuthUser,
  LoginPayload,
  LoginResponse,
  UpdatePasswordPayload,
  UpdateProfilePayload,
} from "./auth-service";

export { createCashAdjustment, getDashboard } from "./dashboard-service";
export type {
  CashAdjustmentPayload,
  CashAdjustmentResponse,
  DashboardChart,
  DashboardChartPoint,
  DashboardDailySummaryEntry,
  DashboardKpiCardMetric,
  DashboardKpis,
  DashboardMeta,
  DashboardMetric,
  DashboardPaymentItem,
  DashboardPeriod,
  DashboardQuery,
  DashboardResponse,
  DashboardSparklinePoint,
  DashboardSummaryCard,
} from "./dashboard-service";

export {
  createFinanceTransaction,
  deleteFinanceTransaction,
  listFinanceTransactions,
  updateFinanceTransaction,
} from "./finance-service";
export type {
  FinanceTransaction,
  FinanceTransactionResponse,
  FinanceTransactionStatus,
  FinanceTransactionType,
  FinanceTransactionsResponse,
  UpdateFinanceTransactionPayload,
  UpsertFinanceTransactionPayload,
} from "./finance-service";

export {
  createPayment,
  deleteInstallment,
  listPayments,
  revertInstallmentPayment,
} from "./payments-service";
export type {
  CreatePaymentPayload,
  CreatePaymentResponse,
  DeleteInstallmentResponse,
  PaymentItem,
  PaymentMethod,
  PaymentsResponse,
  RevertPaymentResponse,
} from "./payments-service";

export { sendWhatsAppBatch } from "./notifications-service";
export type {
  WhatsAppBatchPayload,
  WhatsAppBatchRecipient,
  WhatsAppBatchResponse,
  WhatsAppBatchResult,
} from "./notifications-service";

export { getLegacyTableData, replaceLegacyTableData } from "./tables-service";
export type {
  LegacyTableName,
  LegacyTableResponse,
  LegacyTableRow,
  ReplaceLegacyTablePayload,
  ReplaceLegacyTableResponse,
} from "./tables-service";

export type { ApiMessagePayload, ApiMethod, ApiPrimitive, ApiQueryParams, ApiQueryValue } from "./types";
