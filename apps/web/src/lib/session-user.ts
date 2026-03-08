export type SessionUser = {
  name: string;
  email: string;
  role: string;
  source: "fallback" | "storage";
};

const STORAGE_KEYS = ["credix:v2:user", "credix_v2_user", "currentUser"] as const;

function buildFallbackUser(): SessionUser {
  return {
    name: process.env.NEXT_PUBLIC_DEFAULT_USER_NAME?.trim() || "Administrador",
    email: process.env.NEXT_PUBLIC_DEFAULT_USER_EMAIL?.trim() || "admin@credix.app.br",
    role: process.env.NEXT_PUBLIC_DEFAULT_USER_ROLE?.trim() || "Administrador",
    source: "fallback",
  };
}

function readObjectField(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function normalizeSessionPayload(value: unknown): Omit<SessionUser, "source"> | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  if (record.user && typeof record.user === "object") {
    return normalizeSessionPayload(record.user);
  }

  const name = readObjectField(record, ["name", "full_name", "fullName"]);
  const email = readObjectField(record, ["email"]);
  const role = readObjectField(record, ["role"]);

  if (!name && !email && !role) return null;

  const fallback = buildFallbackUser();
  return {
    name: name || fallback.name,
    email: email || fallback.email,
    role: role || fallback.role,
  };
}

export function getFallbackSessionUser() {
  return buildFallbackUser();
}

export function readSessionUser(): SessionUser {
  const fallback = buildFallbackUser();

  if (typeof window === "undefined") {
    return fallback;
  }

  for (const key of STORAGE_KEYS) {
    const rawValue = window.localStorage.getItem(key);
    if (!rawValue) continue;

    try {
      const parsedValue = JSON.parse(rawValue) as unknown;
      const user = normalizeSessionPayload(parsedValue);
      if (!user) continue;

      return {
        ...user,
        source: "storage",
      };
    } catch {
      continue;
    }
  }

  return fallback;
}

export function clearStoredSessionUser() {
  if (typeof window === "undefined") return;

  for (const key of STORAGE_KEYS) {
    window.localStorage.removeItem(key);
  }
}
