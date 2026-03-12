export type ApiPrimitive = string | number | boolean | null | undefined;

export type ApiQueryValue = ApiPrimitive | ApiPrimitive[];

export type ApiQueryParams = Record<string, ApiQueryValue>;

export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiMessagePayload = {
  message?: string;
} & Record<string, unknown>;
