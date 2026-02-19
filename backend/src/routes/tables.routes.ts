import { Router } from "express";
import { requireAuthApi } from "../middleware/auth";
import { replaceTableSchema, tableNameSchema } from "../schemas/tables.schemas";
import { getTableData, replaceTableData } from "../services/table-sync.service";

const router = Router();

router.use(requireAuthApi);

function readUserId(req: { user?: { sub?: string } }): number {
  const parsed = Number(req.user?.sub);
  if (!Number.isFinite(parsed)) {
    return Number.NaN;
  }
  return parsed;
}

router.get("/:tableName", async (req, res) => {
  const userId = readUserId(req);
  if (!Number.isFinite(userId)) return res.status(401).json({ message: "Nao autenticado" });
  const tableName = tableNameSchema.parse(req.params.tableName);
  const data = await getTableData(tableName, userId);
  return res.json({ data });
});

router.put("/:tableName", async (req, res) => {
  const userId = readUserId(req);
  if (!Number.isFinite(userId)) return res.status(401).json({ message: "Nao autenticado" });
  const tableName = tableNameSchema.parse(req.params.tableName);
  const { rows } = replaceTableSchema.parse(req.body);

  const data = await replaceTableData(tableName, rows, userId);
  return res.json({ message: "Tabela atualizada", data });
});

export { router as tablesRoutes };
