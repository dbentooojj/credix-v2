import { Router } from "express";
import { requireAuthPage } from "../middleware/auth";

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

router.get("/dashboard.html", (_req, res) => res.redirect("/admin/dashboard.html"));
router.get("/debtors.html", (_req, res) => res.redirect("/admin/debtors.html"));
router.get("/loans.html", (_req, res) => res.redirect("/admin/loans.html"));
router.get("/installments.html", (_req, res) => res.redirect("/admin/installments.html"));
router.get("/reports.html", (_req, res) => res.redirect("/admin/reports.html"));

export { router as pageRoutes };
