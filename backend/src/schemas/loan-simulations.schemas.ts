import { z } from "zod";

const dateOnlySchema = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato YYYY-MM-DD");

export const loanSimulationInterestTypeSchema = z.enum(["simples", "composto", "fixo"]);

export const createOrUpdateLoanSimulationSchema = z.object({
  id: z.string().uuid().optional(),
  clientId: z.coerce.number().int().positive(),
  principalAmount: z.coerce.number().positive(),
  interestType: loanSimulationInterestTypeSchema,
  interestRate: z.coerce.number().min(0).default(0),
  fixedFeeAmount: z.coerce.number().min(0).optional(),
  installmentsCount: z.coerce.number().int().min(1).max(120),
  startDate: dateOnlySchema,
  firstDueDate: dateOnlySchema,
  dueDates: z.array(dateOnlySchema).max(120).optional(),
  observations: z.string().trim().max(5000).optional(),
  expiresAt: z
    .string()
    .trim()
    .optional(),
});

export const loanSimulationListQuerySchema = z.object({
  status: z.string().trim().optional(),
  clientId: z.coerce.number().int().positive().optional(),
  createdFrom: dateOnlySchema.optional(),
  createdTo: dateOnlySchema.optional(),
});

export const loanSimulationIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type CreateOrUpdateLoanSimulationInput = z.infer<typeof createOrUpdateLoanSimulationSchema>;
export type LoanSimulationListQueryInput = z.infer<typeof loanSimulationListQuerySchema>;
