import "dotenv/config";
import "express-async-errors";
import cookieParser from "cookie-parser";
import express from "express";
import morgan from "morgan";
import path from "path";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { optionalAuth } from "./middleware/auth";
import { authRoutes } from "./routes/auth.routes";
import { dashboardRoutes } from "./routes/dashboard.routes";
import { notificationsRoutes } from "./routes/notifications.routes";
import { pageRoutes } from "./routes/page.routes";
import { paymentsRoutes } from "./routes/payments.routes";
import { tablesRoutes } from "./routes/tables.routes";
import { startDueTomorrowEmailScheduler } from "./services/email-reminder.service";

const app = express();

app.disable("x-powered-by");
app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "src", "views"));

app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(optionalAuth);
app.use(express.static(path.join(process.cwd(), "src", "public")));
app.use((_req, res, next) => {
  res.locals.sessionIdleMinutes = env.SESSION_IDLE_MINUTES;
  next();
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/tables", tablesRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use(pageRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: "Rota nao encontrada" });
});

app.use(errorHandler);

startDueTomorrowEmailScheduler();

app.listen(env.PORT, () => {
  console.log(`Servidor iniciado na porta ${env.PORT}`);
});
