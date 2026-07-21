import express from "express";
import { getDb } from "../db/database.js";
import { authRequired, requireRole } from "../middleware/auth.js";

const router = express.Router();

// GET /api/services/status – status de todos os serviços
router.get("/status", authRequired, async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(`
      SELECT 
        s.id,
        s.name, 
        s.status, 
        s.description, 
        s.category,
        s.category_id,
        COUNT(t.id) AS active_incidents
      FROM services s
      LEFT JOIN tickets t ON t.category_id = s.category_id AND t.status NOT IN ('RESOLVIDO', 'FECHADO')
      GROUP BY s.id
      ORDER BY s.category, s.name
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao carregar status dos serviços" });
  }
});

// GET /api/services/history – histórico de alterações recentes
router.get("/history", authRequired, async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(`
      SELECT service_name, status, description, created_at 
      FROM service_status_history 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao carregar histórico dos serviços" });
  }
});

// PATCH /api/services/:name/status – atualizar status (ADMIN ou ANALYST)
router.patch("/:name/status", authRequired, requireRole("ADMIN", "ANALYST"), async (req, res) => {
  try {
    const { status, description } = req.body;
    if (!["OPERATIONAL", "DEGRADED", "OUTAGE"].includes(status))
      return res.status(400).json({ message: "Status inválido" });

    const db = await getDb();
    await db.run(
      `INSERT INTO services(name, status, description) VALUES(?,?,?)
       ON DUPLICATE KEY UPDATE status=VALUES(status),
       description=COALESCE(VALUES(description), description)`,
      [req.params.name, status, description || null]
    );

    // Grava no histórico
    await db.run(
      `INSERT INTO service_status_history(service_name, status, description) VALUES(?,?,?)`,
      [req.params.name, status, description || null]
    );

    res.json({ message: "Status atualizado com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao atualizar status do serviço" });
  }
});

export default router;
