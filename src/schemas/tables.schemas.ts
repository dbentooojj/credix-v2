import { z } from "zod";

export const tableNameSchema = z.enum(["debtors", "loans", "installments"]);

export const replaceTableSchema = z.object({
  rows: z.array(z.record(z.any())).default([]),
});
