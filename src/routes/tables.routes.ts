import { Router } from "express";
import { requireAuthApi } from "../middleware/auth";
import { replaceTableSchema, tableNameSchema } from "../schemas/tables.schemas";
import { getTableData, replaceTableData } from "../services/table-sync.service";

const router = Router();

router.use(requireAuthApi);

router.get("/:tableName", async (req, res) => {
  const tableName = tableNameSchema.parse(req.params.tableName);
  const data = await getTableData(tableName);
  return res.json({ data });
});

router.put("/:tableName", async (req, res) => {
  const tableName = tableNameSchema.parse(req.params.tableName);
  const { rows } = replaceTableSchema.parse(req.body);

  const data = await replaceTableData(tableName, rows);
  return res.json({ message: "Tabela atualizada", data });
});

export { router as tablesRoutes };
