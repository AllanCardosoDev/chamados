import express from "express";
import { getDb } from "../db/database.js";
import { authRequired, requireRole } from "../middleware/auth.js";
import jwt from "jsonwebtoken";

const router = express.Router();
const getJwtSecret = () => process.env.JWT_SECRET || "cbmam-chamados-secret-dev-key-2026";

function canSeeAll(user) {
  return ["ADMIN", "ANALYST"].includes(user.role);
}

router.get("/summary", authRequired, requireRole("ADMIN", "ANALYST"), async (req, res) => {
  const db = await getDb();

  const total      = await db.get("SELECT COUNT(*) AS value FROM tickets");
  const open       = await db.get("SELECT COUNT(*) AS value FROM tickets WHERE status IN ('ABERTO','EM_ATENDIMENTO','AGUARDANDO_USUARIO')");
  const resolved   = await db.get("SELECT COUNT(*) AS value FROM tickets WHERE status = 'FECHADO'");
  const high       = await db.get("SELECT COUNT(*) AS value FROM tickets WHERE priority IN ('ALTA','CRITICA')");
  const byCategory = await db.all(
    `SELECT c.name, COUNT(t.id) AS total
     FROM categories c
     LEFT JOIN tickets t ON t.category_id = c.id
     GROUP BY c.id, c.name
     ORDER BY total DESC`
  );

  res.json({
    total:       total.value,
    open:        open.value,
    resolved:    resolved.value,
    highPriority:high.value,
    byCategory,
  });
});

router.get("/analysts", authRequired, requireRole("ADMIN", "ANALYST"), async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(`
      SELECT
        u.id, u.name, u.unit,
        COUNT(t.id)                                                        AS total,
        SUM(t.status = 'FECHADO')                           AS resolved,
        SUM(t.status IN ('ABERTO','EM_ATENDIMENTO','AGUARDANDO_USUARIO'))  AS open,
        ROUND(AVG(CASE WHEN t.resolved_at IS NOT NULL
          THEN TIMESTAMPDIFF(HOUR, t.created_at, t.resolved_at) END), 1)  AS avg_hours
      FROM users u
      LEFT JOIN tickets t ON t.analyst_id = u.id
      WHERE u.role IN ('ANALYST','ADMIN')
      GROUP BY u.id, u.name, u.unit
      ORDER BY total DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao gerar relatório de analistas" });
  }
});

router.get("/calendar", authRequired, requireRole("ADMIN", "ANALYST"), async (req, res) => {
  try {
    const db    = await getDb();
    const month = req.query.month || new Date().toISOString().slice(0, 7); // YYYY-MM
    const rows  = await db.all(
      `SELECT DATE(created_at) AS day, COUNT(*) AS total,
        SUM(status = 'FECHADO') AS resolved
       FROM tickets
       WHERE DATE_FORMAT(created_at,'%Y-%m') = ?
       GROUP BY DATE(created_at) ORDER BY day`,
      [month]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao gerar calendário" });
  }
});

router.get("/tickets-detail", authRequired, requireRole("ADMIN", "ANALYST"), async (req, res) => {
  try {
    const db = await getDb();
    const { day, analyst_id } = req.query;
    const where = [], params = [];
    if (day)        { where.push("DATE(t.created_at) = ?"); params.push(day); }
    if (analyst_id) { where.push("t.analyst_id = ?");       params.push(analyst_id); }

    const sql = `
      SELECT t.protocol, t.subject, t.status, t.priority,
             t.created_at, t.resolved_at,
             requester.name AS requester_name, analyst.name AS analyst_name,
             c.name AS category_name
      FROM tickets t
      JOIN users requester ON requester.id = t.requester_id
      LEFT JOIN users analyst ON analyst.id = t.analyst_id
      LEFT JOIN categories c ON c.id = t.category_id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY t.created_at DESC LIMIT 200
    `;
    res.json(await db.all(sql, params));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao listar detalhes" });
  }
});

router.get("/export", async (req, res) => {
  const token = (req.headers.authorization || "").replace("Bearer ", "") || (req.query.token || "");
  if (!token) return res.status(401).json({ message: "Token não informado" });

  let user;
  try {
    user = jwt.verify(token, getJwtSecret());
  } catch {
    return res.status(401).json({ message: "Token inválido ou expirado" });
  }

  if (!canSeeAll(user)) return res.status(403).json({ message: "Acesso não autorizado" });

  try {
    const db = await getDb();
    const tickets = await db.all(`
      SELECT t.protocol, t.subject, t.type, t.priority, t.status,
             t.unit, t.asset_tag, t.created_at, t.updated_at, t.resolved_at,
             u.name AS requester_name, u.cpf AS requester_cpf,
             a.name AS analyst_name, c.name AS category_name,
             t.satisfaction_score
      FROM tickets t
      JOIN users u ON u.id = t.requester_id
      LEFT JOIN users a ON a.id = t.analyst_id
      LEFT JOIN categories c ON c.id = t.category_id
      ORDER BY t.created_at DESC
    `);

    const esc = v => v ? `"${String(v).replace(/"/g, '""')}"` : '""';
    const fmt = d => d ? new Date(d).toLocaleString("pt-BR") : "";

    const header = [
      "Protocolo", "Assunto", "Tipo", "Prioridade", "Status", "Unidade",
      "Patrimônio", "Abertura", "Atualização", "Resolução", "Solicitante", "CPF",
      "Analista", "Categoria", "Avaliação (1-5)"
    ].join(";");

    const rows = tickets.map(t => [
      t.protocol, esc(t.subject), t.type, t.priority, t.status,
      esc(t.unit), esc(t.asset_tag),
      fmt(t.created_at), fmt(t.updated_at), fmt(t.resolved_at),
      esc(t.requester_name), t.requester_cpf || "",
      esc(t.analyst_name), esc(t.category_name),
      t.satisfaction_score || ""
    ].join(";"));

    const csv = "\uFEFF" + [header, ...rows].join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="chamados-cbmam-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao exportar CSV" });
  }
});

export default router;
