import "dotenv/config";
import cors from "cors";
import express from "express";
import { z } from "zod";
import { handleAsync } from "./lib/async-route";
import { initializeDatabase, pingDatabase } from "./lib/database";
import { dashboardRoutes } from "./routes/dashboard";
import { financeRoutes } from "./routes/finance";
import { portfolioRoutes } from "./routes/portfolio";

const envSchema = z.object({
  API_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().trim().min(1).default("postgresql://postgres:postgres@localhost:5432/credix_v2"),
  NEXT_PUBLIC_API_BASE_URL: z.string().url().optional(),
});

const env = envSchema.parse(process.env);
const app = express();

app.disable("x-powered-by");
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/portfolio", portfolioRoutes);

app.get("/health", handleAsync(async (_req, res) => {
  await pingDatabase();

  res.status(200).json({
    status: "ok",
    service: "api",
    database: "ok",
    timestamp: new Date().toISOString(),
  });
}));

app.get("/api/meta", (_req, res) => {
  res.status(200).json({
    name: "Credix API",
    version: "0.1.0",
    architecture: "api-only",
  });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      message: "Dados invalidos.",
      issues: error.flatten(),
    });
  }

  console.error(error);

  return res.status(500).json({
    message: "Falha interna na API.",
  });
});

async function startServer() {
  await initializeDatabase();

  app.listen(env.API_PORT, () => {
    console.log(`API listening on port ${env.API_PORT}`);
  });
}

void startServer().catch((error) => {
  console.error("Failed to start API", error);
  process.exit(1);
});
