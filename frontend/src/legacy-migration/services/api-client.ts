import type { ApiMessagePayload, ApiMethod, ApiQueryParams, ApiPrimitive } from "./types";

type RequestOptions<TBody = unknown> = {
  method?: ApiMethod;
  query?: ApiQueryParams;
  body?: TBody;
  signal?: AbortSignal;
  headers?: HeadersInit;
  cache?: RequestCache;
  credentials?: RequestCredentials;
};

type ApiClientConfig = {
  baseUrl?: string;
};

export class ApiClientError<TPayload = unknown> extends Error {
  readonly status: number;
  readonly payload: TPayload | null;

  constructor(message: string, status: number, payload: TPayload | null) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.payload = payload;
  }
}

function normalizePath(path: string) {
  if (!path.startsWith("/")) return `/${path}`;
  return path;
}

function appendQuery(path: string, query?: ApiQueryParams) {
  if (!query) return path;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null) search.append(key, String(item));
      });
      continue;
    }

    if (value !== undefined && value !== null) search.append(key, String(value));
  }

  const serialized = search.toString();
  if (!serialized) return path;
  return `${path}?${serialized}`;
}

async function readPayload(response: Response): Promise<unknown | null> {
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return response.json().catch(() => null);
  }

  const text = await response.text().catch(() => "");
  if (!text) return null;
  return { message: text };
}

function isBodyAllowed(method: ApiMethod) {
  return method !== "GET" && method !== "DELETE";
}

function messageFromPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const maybeMessage = (payload as ApiMessagePayload).message;
  return typeof maybeMessage === "string" && maybeMessage.trim() ? maybeMessage : null;
}

export function createApiClient(config: ApiClientConfig = {}) {
  const baseUrl = (config.baseUrl ?? "").replace(/\/+$/, "");

  async function request<TResponse, TBody = unknown>(
    path: string,
    options: RequestOptions<TBody> = {},
  ): Promise<TResponse> {
    const method = options.method ?? "GET";
    const normalizedPath = appendQuery(normalizePath(path), options.query);
    const url = `${baseUrl}${normalizedPath}`;
    const headers = new Headers(options.headers);

    if (isBodyAllowed(method) && options.body !== undefined && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(url, {
      method,
      headers,
      body: isBodyAllowed(method) && options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
      cache: options.cache ?? "no-store",
      credentials: options.credentials ?? "include",
    });

    if (response.status === 204) {
      return undefined as TResponse;
    }

    const payload = await readPayload(response);
    if (!response.ok) {
      const fallbackMessage = `Falha na requisicao (${response.status}).`;
      const message = messageFromPayload(payload) ?? fallbackMessage;
      throw new ApiClientError(message, response.status, payload);
    }

    return payload as TResponse;
  }

  return {
    request,
    get<TResponse>(path: string, options: Omit<RequestOptions<never>, "method" | "body"> = {}) {
      return request<TResponse>(path, { ...options, method: "GET" });
    },
    post<TResponse, TBody = unknown>(path: string, body?: TBody, options: Omit<RequestOptions<TBody>, "method" | "body"> = {}) {
      return request<TResponse, TBody>(path, { ...options, method: "POST", body });
    },
    put<TResponse, TBody = unknown>(path: string, body?: TBody, options: Omit<RequestOptions<TBody>, "method" | "body"> = {}) {
      return request<TResponse, TBody>(path, { ...options, method: "PUT", body });
    },
    patch<TResponse, TBody = unknown>(path: string, body?: TBody, options: Omit<RequestOptions<TBody>, "method" | "body"> = {}) {
      return request<TResponse, TBody>(path, { ...options, method: "PATCH", body });
    },
    delete<TResponse>(path: string, options: Omit<RequestOptions<never>, "method" | "body"> = {}) {
      return request<TResponse>(path, { ...options, method: "DELETE" });
    },
  };
}

export const apiClient = createApiClient();

export function toApiDate(value: Date | string) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toISOString().slice(0, 10);
}

export function toApiNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value as ApiPrimitive);
  return Number.isFinite(parsed) ? parsed : fallback;
}
