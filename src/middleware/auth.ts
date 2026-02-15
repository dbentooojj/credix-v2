import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { verifyToken } from "../lib/jwt";

function readToken(req: Request): string | null {
  const raw = req.cookies?.[env.COOKIE_NAME];
  if (!raw || typeof raw !== "string") {
    return null;
  }
  return raw;
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

export function requireAuthApi(req: Request, res: Response, next: NextFunction) {
  const token = readToken(req);
  if (!token) {
    return res.status(401).json({ message: "Nao autenticado" });
  }

  try {
    req.user = verifyToken(token);
    return next();
  } catch {
    return res.status(401).json({ message: "Sessao invalida ou expirada" });
  }
}

export function requireAuthPage(req: Request, res: Response, next: NextFunction) {
  const token = readToken(req);
  if (!token) {
    return res.redirect("/login");
  }

  try {
    req.user = verifyToken(token);
    return next();
  } catch {
    return res.redirect("/login");
  }
}
