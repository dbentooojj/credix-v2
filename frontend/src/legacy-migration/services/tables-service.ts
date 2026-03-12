import { apiClient } from "./api-client";

export type LegacyTableName = "debtors" | "loans" | "installments";

export type LegacyTableRow = Record<string, unknown>;

export type LegacyTableResponse<T extends LegacyTableRow = LegacyTableRow> = {
  data: T[];
};

export type ReplaceLegacyTablePayload<T extends LegacyTableRow = LegacyTableRow> = {
  rows: T[];
};

export type ReplaceLegacyTableResponse<T extends LegacyTableRow = LegacyTableRow> = {
  message: string;
  data: T[];
};

export async function getLegacyTableData<T extends LegacyTableRow = LegacyTableRow>(
  tableName: LegacyTableName,
  signal?: AbortSignal,
) {
  return apiClient.get<LegacyTableResponse<T>>(`/api/tables/${tableName}`, { signal });
}

export async function replaceLegacyTableData<T extends LegacyTableRow = LegacyTableRow>(
  tableName: LegacyTableName,
  rows: T[],
) {
  return apiClient.put<ReplaceLegacyTableResponse<T>, ReplaceLegacyTablePayload<T>>(`/api/tables/${tableName}`, {
    rows,
  });
}
