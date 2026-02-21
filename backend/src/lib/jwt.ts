import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export type AppJwtPayload = {
  sub: string;
  email: string;
  name: string;
  role: "ADMIN";
};

export type PasswordResetJwtPayload = {
  sub: string;
  email: string;
  purpose: "password-reset";
  phv: string;
};

const signOptions: SignOptions = {
  expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
};

const passwordResetSignOptions: SignOptions = {
  expiresIn: env.RESET_PASSWORD_EXPIRES_IN as SignOptions["expiresIn"],
};

const passwordResetSecret = env.RESET_PASSWORD_SECRET || env.JWT_SECRET;

export function signToken(payload: AppJwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, signOptions);
}

export function verifyToken(token: string): AppJwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as AppJwtPayload;
}

export function signPasswordResetToken(payload: PasswordResetJwtPayload): string {
  return jwt.sign(payload, passwordResetSecret, passwordResetSignOptions);
}

export function verifyPasswordResetToken(token: string): PasswordResetJwtPayload {
  const decoded = jwt.verify(token, passwordResetSecret) as PasswordResetJwtPayload;
  if (decoded.purpose !== "password-reset") {
    throw new Error("Token de recuperacao invalido");
  }
  return decoded;
}

