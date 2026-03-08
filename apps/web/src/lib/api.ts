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
