import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { verifyToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";

function readToken(req: Request): string | null {
  const raw = req.cookies?.[env.COOKIE_NAME];
  if (!raw || typeof raw !== "string") {
    return null;
  }
  return raw;
}

async function doesUserExist(userIdRaw: unknown): Promise<boolean> {
  const userId = Number(userIdRaw);
  if (!Number.isFinite(userId) || userId <= 0) {
    return false;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  return Boolean(user);
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readToken(req);
  if (!token) {
    return next();
  }

  try {
    req.user = verifyToken(token);
  } catch {
    // Cookie invalido, segue sem usuario
  }

  return next();
}

export async function requireAuthApi(req: Request, res: Response, next: NextFunction) {
  const token = readToken(req);
  if (!token) {
    return res.status(401).json({ message: "Nao autenticado" });
  }

  try {
    req.user = verifyToken(token);
    const userExists = await doesUserExist(req.user?.sub);
    if (!userExists) {
      return res.status(401).json({ message: "Sessao invalida ou expirada" });
    }

    return next();
  } catch {
    return res.status(401).json({ message: "Sessao invalida ou expirada" });
  }
}

export async function requireAuthPage(req: Request, res: Response, next: NextFunction) {
  const token = readToken(req);
  if (!token) {
    return res.redirect("/login");
  }

  try {
    req.user = verifyToken(token);
    const userExists = await doesUserExist(req.user?.sub);
    if (!userExists) {
      return res.redirect("/login");
    }

    return next();
  } catch {
    return res.redirect("/login");
  }
}
