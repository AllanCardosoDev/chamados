import express from "express";
import { getDb } from "../db/database.js";
import { authRequired, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.get("/", authRequired, async (req, res) => {
  const db = await getDb();
  res.json(await db.all("SELECT * FROM categories WHERE active=1 ORDER BY name"));
});

router.post("/", authRequired, requireRole("ADMIN", "ANALYST"), async (req, res) => {
  const { name, type, sla_response_hours, sla_resolution_hours } = req.body;
  const db = await getDb();
  await db.run(
    "INSERT INTO categories(name,type,sla_response_hours,sla_resolution_hours) VALUES (?,?,?,?)",
    [name, type, sla_response_hours || 4, sla_resolution_hours || 24]
  );
  res.status(201).json({ message: "Categoria criada" });
});

router.patch("/:id", authRequired, requireRole("ADMIN", "ANALYST"), async (req, res) => {
  const { sla_response_hours, sla_resolution_hours } = req.body;
  const db = await getDb();
  await db.run(
    "UPDATE categories SET sla_response_hours=?, sla_resolution_hours=? WHERE id=?",
    [sla_response_hours, sla_resolution_hours, req.params.id]
  );
  res.json({ message: "SLA atualizado" });
});

router.delete("/:id", authRequired, requireRole("ADMIN", "ANALYST"), async (req, res) => {
  const db = await getDb();
  await db.run("UPDATE categories SET active=0 WHERE id=?", [req.params.id]);
  res.json({ message: "Categoria inativada" });
});

export default router;
