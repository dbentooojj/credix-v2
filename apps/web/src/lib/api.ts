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

export type ApiSnapshot = {
  baseUrl: string;
  health: ApiHealth | null;
  meta: ApiMeta | null;
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
