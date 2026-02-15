import bcrypt from "bcryptjs";
import { Router } from "express";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/jwt";
import { requireAuthApi } from "../middleware/auth";
import { loginSchema } from "../schemas/auth.schemas";

const router = Router();

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.COOKIE_SECURE,
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const clearCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.COOKIE_SECURE,
  path: "/",
};

router.post("/auth/login", async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user) {
    return res.status(401).json({ message: "E-mail ou senha invalidos" });
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    return res.status(401).json({ message: "E-mail ou senha invalidos" });
  }

  const token = signToken({
    sub: String(user.id),
    name: user.name,
    email: user.email,
    role: user.role,
  });

  res.cookie(env.COOKIE_NAME, token, cookieOptions);

  return res.json({
    message: "Login realizado com sucesso",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

router.post("/auth/logout", (_req, res) => {
  res.clearCookie(env.COOKIE_NAME, clearCookieOptions);
  return res.json({ message: "Logout realizado" });
});

router.get("/auth/me", requireAuthApi, (req, res) => {
  return res.json({ user: req.user });
});

export { router as authRoutes };
