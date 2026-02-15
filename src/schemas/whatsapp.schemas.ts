import { z } from "zod";

const whatsappRecipientSchema = z.object({
  phone: z.string().min(8).max(32),
  message: z.string().trim().min(1).max(4096),
  debtorId: z.coerce.number().int().positive().optional(),
  installmentIds: z.array(z.coerce.number().int().positive()).max(200).optional(),
});

export const whatsappBatchSchema = z.object({
  recipients: z.array(whatsappRecipientSchema).min(1).max(100),
});

export type WhatsAppBatchInput = z.infer<typeof whatsappBatchSchema>;
