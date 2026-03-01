import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const strongPasswordSchema = z
  .string()
  .min(8, "A nova senha precisa ter pelo menos 8 caracteres")
  .max(72, "A nova senha pode ter no maximo 72 caracteres")
  .refine((value) => /[A-Z]/.test(value), "Use ao menos 1 letra maiuscula")
  .refine((value) => /[a-z]/.test(value), "Use ao menos 1 letra minuscula")
  .refine((value) => /\d/.test(value), "Use ao menos 1 numero")
  .refine((value) => /[^A-Za-z0-9]/.test(value), "Use ao menos 1 simbolo")
  .refine((value) => !/\s/.test(value), "Nao use espacos");

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: strongPasswordSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(16).max(4096),
    newPassword: strongPasswordSchema,
    confirmPassword: z.string().min(1),
  })
  .superRefine((value, ctx) => {
    if (value.newPassword !== value.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "A confirmacao da nova senha nao confere",
      });
    }
  });
