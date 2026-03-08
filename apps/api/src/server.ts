import "dotenv/config";
import cors from "cors";
import express from "express";
import { z } from "zod";
import { financeRoutes } from "./routes/finance";

const envSchema = z.object({
  API_PORT: z.coerce.number().int().positive().default(4000),
  NEXT_PUBLIC_API_BASE_URL: z.string().url().optional(),
});

const env = envSchema.parse(process.env);
const app = express();

app.disable("x-powered-by");
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use("/api/finance", financeRoutes);

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "api",
    timestamp: new Date().toISOString(),
  });
});

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

app.listen(env.API_PORT, () => {
  console.log(`API listening on port ${env.API_PORT}`);
});
