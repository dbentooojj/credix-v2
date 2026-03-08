import "dotenv/config";
import cors from "cors";
import express from "express";
import { z } from "zod";

const envSchema = z.object({
  API_PORT: z.coerce.number().int().positive().default(4000),
  NEXT_PUBLIC_API_BASE_URL: z.string().url().optional(),
});

const env = envSchema.parse(process.env);
const app = express();

app.disable("x-powered-by");
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

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

app.listen(env.API_PORT, () => {
  console.log(`API listening on port ${env.API_PORT}`);
});
