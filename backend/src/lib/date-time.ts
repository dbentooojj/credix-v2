const DEFAULT_TIME_ZONE = "America/Sao_Paulo";

export function normalizeTimeZone(rawTimeZone?: string, fallback = DEFAULT_TIME_ZONE): string {
  const value = rawTimeZone?.trim();
  if (!value) return fallback;

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return value;
  } catch {
    return fallback;
  }
}

export function dateToIso(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function dateToMonthKey(value: Date): string {
  return value.toISOString().slice(0, 7);
}

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return dateToIso(date);
}

export function getIsoTodayInTimeZone(timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(new Date());
  const year = parts.find((item) => item.type === "year")?.value ?? "1970";
  const month = parts.find((item) => item.type === "month")?.value ?? "01";
  const day = parts.find((item) => item.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

export function getHourMinuteInTimeZone(timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());
  const hour = parts.find((item) => item.type === "hour")?.value ?? "00";
  const minute = parts.find((item) => item.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}
