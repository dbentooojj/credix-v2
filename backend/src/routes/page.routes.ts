import { Router } from "express";
import { requireAuthPage } from "../middleware/auth";
import { env } from "../config/env";
const router = Router();

function extractCurrentUser(req: { user?: { sub: string; email: string; name: string; role: string } }) {
  if (!req.user) return null;

  return {
    id: Number(req.user.sub),
    email: req.user.email,
    name: req.user.name,
    role: req.user.role,
  };
}

function extractEmail(raw?: string): string | null {
  const value = raw?.trim();
  if (!value) return null;

  const angleMatch = value.match(/<([^<>]+)>/);
  const candidate = (angleMatch?.[1] || value).replace(/^mailto:/i, "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)) return null;

  return candidate;
}

function resolveSupportEmail(): string {
  const notifyFirst = env.EMAIL_NOTIFY_TO
    ?.split(/[;,]/)
    .map((item) => item.trim())
    .find(Boolean);

  const candidates = [
    env.SMTP_FROM,
    env.SMTP_USER,
    notifyFirst,
    process.env.ADMIN_EMAIL,
  ];

  for (const item of candidates) {
    const email = extractEmail(item);
    if (email) return email;
  }

  return "usecredix@gmail.com";
}

router.get(["/", "/login", "/index.html"], (req, res) => {
  if (req.user) {
    return res.redirect("/admin/dashboard.html");
  }

  return res.render("index", { currentUser: null });
});

router.use("/admin", requireAuthPage);

router.get("/admin", requireAuthPage, (_req, res) => {
  return res.redirect("/admin/dashboard.html");
});

router.get("/admin/dashboard.html", requireAuthPage, (req, res) => {
  return res.render("dashboard", { currentUser: extractCurrentUser(req) });
});

router.get("/admin/debtors.html", requireAuthPage, (req, res) => {
  return res.render("debtors", { currentUser: extractCurrentUser(req) });
});

router.get("/admin/loans.html", requireAuthPage, (req, res) => {
  return res.render("loans", { currentUser: extractCurrentUser(req) });
});

router.get("/admin/installments.html", requireAuthPage, (req, res) => {
  return res.render("installments", { currentUser: extractCurrentUser(req) });
});

router.get("/admin/reports.html", requireAuthPage, (req, res) => {
  return res.render("reports", { currentUser: extractCurrentUser(req) });
});

router.get("/admin/dashboard-advanced.html", requireAuthPage, (req, res) => {
  return res.render("dashboard-advanced", { currentUser: extractCurrentUser(req) });
});

router.get("/admin/account.html", requireAuthPage, (req, res) => {
  return res.render("account", {
    currentUser: extractCurrentUser(req),
    supportEmail: resolveSupportEmail(),
  });
});

router.get("/dashboard", requireAuthPage, (_req, res) => res.redirect("/admin/dashboard-advanced.html"));
router.get("/dashboard.html", (_req, res) => res.redirect("/admin/dashboard.html"));
router.get("/dashboard-advanced.html", (_req, res) => res.redirect("/admin/dashboard-advanced.html"));
router.get("/debtors.html", (_req, res) => res.redirect("/admin/debtors.html"));
router.get("/loans.html", (_req, res) => res.redirect("/admin/loans.html"));
router.get("/installments.html", (_req, res) => res.redirect("/admin/installments.html"));
router.get("/reports.html", (_req, res) => res.redirect("/admin/reports.html"));
router.get("/account.html", (_req, res) => res.redirect("/admin/account.html"));

export { router as pageRoutes };
