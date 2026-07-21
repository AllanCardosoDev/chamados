import express from "express";
import { getDb } from "../db/database.js";
import { authRequired, requireRole } from "../middleware/auth.js";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import { sendTicketClosedEmail } from "../services/mail.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const router = express.Router();

const getJwtSecret = () => process.env.JWT_SECRET || "cbmam-chamados-secret-dev-key-2026";

const UPLOADS     = path.resolve(__dirname, "..", "..", "uploads");
const SCREENSHOTS = path.resolve(__dirname, "..", "..", "screenshots");

if (!fs.existsSync(UPLOADS))     fs.mkdirSync(UPLOADS, { recursive: true });
if (!fs.existsSync(SCREENSHOTS)) fs.mkdirSync(SCREENSHOTS, { recursive: true });

const ALLOWED_MIME = new Set([
  'image/jpeg','image/png','image/gif','image/webp','image/bmp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]);

function canSeeAll(user) {
  return ["ADMIN", "ANALYST"].includes(user.role);
}

function canChat(user, ticket) {
  if (!ticket.analyst_id) return false;
  return user.id === ticket.requester_id || user.id === ticket.analyst_id;
}

function generateProtocol() {
  const year   = new Date().getFullYear();
  const random = Math.floor(10000 + Math.random() * 89999);
  return `CHM-${year}-${random}`;
}

// ── GET /api/tickets/mine/stats ───────────────────────────────────────────────
// Estatísticas dos chamados do usuário logado (para o dashboard)
router.get("/mine/stats", authRequired, async (req, res) => {
  const db = await getDb();
  const uid = req.user.id;
  const row = await db.get(
    `SELECT
       COUNT(*)                                                                                            AS total,
       SUM(status IN ('ABERTO','EM_ATENDIMENTO','AGUARDANDO_USUARIO'))                                     AS open,
       SUM(status = 'FECHADO')                                                                             AS resolved,
       SUM(status = 'AGUARDANDO_USUARIO' AND requester_id = ?)                                              AS waiting
     FROM tickets
     WHERE requester_id = ? OR analyst_id = ?`,
    [uid, uid, uid]
  );
  res.json({
    total:    Number(row?.total    || 0),
    open:     Number(row?.open     || 0),
    resolved: Number(row?.resolved || 0),
    waiting:  Number(row?.waiting  || 0),
  });
});

// ── GET /api/tickets/recent e /api/tickets/poll/tickets ────────────────────────
// Endpoint otimizado para polling: retorna contagem total e lista apenas dos
// chamados modificados desde `since` (ISO 8601). Reduz tráfego de rede.
router.get(["/recent", "/poll/tickets"], authRequired, async (req, res) => {
  const db = await getDb();
  const since = req.query.since; // ex.: "2026-06-22T07:00:00.000Z"
  const canAll = canSeeAll(req.user);

  const totalRow = await db.get(
    canAll
      ? "SELECT COUNT(*) AS value, MAX(updated_at) AS last_update FROM tickets"
      : "SELECT COUNT(*) AS value, MAX(updated_at) AS last_update FROM tickets WHERE requester_id = ?",
    canAll ? [] : [req.user.id]
  );

  let changed = [];
  if (since) {
    const sql = `
      SELECT
        t.id, t.protocol, t.subject, t.status, t.priority, t.updated_at,
        requester.name AS requester_name, analyst.name AS analyst_name,
        c.name AS category_name
      FROM tickets t
      JOIN users requester ON requester.id = t.requester_id
      LEFT JOIN users analyst ON analyst.id = t.analyst_id
      LEFT JOIN categories c  ON c.id = t.category_id
      WHERE t.updated_at > ?
      ${canAll ? "" : "AND t.requester_id = ?"}
      ORDER BY t.updated_at DESC
      LIMIT 50
    `;
    const params = canAll ? [since] : [since, req.user.id];
    changed = await db.all(sql, params);
  }

  res.json({
    total:      Number(totalRow?.value || 0),
    lastUpdate: totalRow?.last_update || null,
    changed,
    serverTime: new Date().toISOString(),
  });
});

// ── GET /api/tickets ─────────────────────────────────────────────────────────
router.get("/", authRequired, async (req, res) => {
  const db = await getDb();

  const where  = [];
  const params = [];

  if (!canSeeAll(req.user)) {
    where.push("t.requester_id = ?");
    params.push(req.user.id);
  }

  if (req.query.status) {
    where.push("t.status = ?");
    params.push(req.query.status);
  }

  if (req.query.priority) {
    where.push("t.priority = ?");
    params.push(req.query.priority);
  }

  const sql = `
    SELECT
      t.*,
      requester.name AS requester_name,
      analyst.name   AS analyst_name,
      c.name         AS category_name
    FROM tickets t
    JOIN users requester ON requester.id = t.requester_id
    LEFT JOIN users analyst ON analyst.id = t.analyst_id
    LEFT JOIN categories c  ON c.id = t.category_id
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY t.created_at DESC
  `;

  const rows = await db.all(sql, params);
  res.json(rows);
});

// ── GET /api/tickets/:id ──────────────────────────────────────────────────────
router.get("/:id", authRequired, async (req, res) => {
  const db = await getDb();

  const ticket = await db.get(
    `SELECT
       t.*,
       requester.name  AS requester_name,
       requester.email AS requester_email,
       analyst.name    AS analyst_name,
       c.name          AS category_name
     FROM tickets t
     JOIN users requester ON requester.id = t.requester_id
     LEFT JOIN users analyst ON analyst.id = t.analyst_id
     LEFT JOIN categories c  ON c.id = t.category_id
     WHERE t.id = ? OR t.protocol = ?`,
    [req.params.id, req.params.id]
  );

  if (!ticket) {
    return res.status(404).json({ message: "Chamado não encontrado" });
  }

  if (!canSeeAll(req.user) && ticket.requester_id !== req.user.id) {
    return res.status(403).json({ message: "Acesso não autorizado" });
  }

  const comments = await db.all(
    `SELECT
       tc.*,
       u.name AS author_name,
       u.role AS author_role
     FROM ticket_comments tc
     JOIN users u ON u.id = tc.author_id
     WHERE tc.ticket_id = ?
       AND (tc.visibility = 'PUBLIC' OR ? IN ('ADMIN','ANALYST'))
     ORDER BY tc.created_at ASC`,
    [ticket.id, req.user.role]
  );

  const history = await db.all(
    `SELECT
       th.*,
       u.name AS actor_name
     FROM ticket_history th
     LEFT JOIN users u ON u.id = th.actor_id
     WHERE th.ticket_id = ?
     ORDER BY th.created_at ASC`,
    [ticket.id]
  );

  res.json({ ticket, comments, history });
});

// ── POST /api/tickets ─────────────────────────────────────────────────────────
router.post("/", authRequired, async (req, res) => {
  const { category_id, type, subject, description, priority, unit, asset_tag, requester_id } = req.body;

  if (!subject || !description || !priority || !type) {
    return res.status(400).json({ message: "Campos obrigatórios não preenchidos" });
  }

  const db       = await getDb();
  const protocol = generateProtocol();

  const finalRequesterId = (requester_id && canSeeAll(req.user)) ? requester_id : req.user.id;

  const category = category_id
    ? await db.get("SELECT * FROM categories WHERE id = ?", [category_id])
    : null;

  const safeResHours  = parseInt(category?.sla_resolution_hours, 10) || 8;
  const safeRespHours = parseInt(category?.sla_response_hours, 10)   || 2;

  const result = await db.run(
    `INSERT INTO tickets
       (protocol, requester_id, category_id, type, subject, description,
        priority, status, unit, asset_tag, sla_due_at, sla_response_due_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'ABERTO', ?, ?, DATE_ADD(NOW(), INTERVAL ${safeResHours} HOUR), DATE_ADD(NOW(), INTERVAL ${safeRespHours} HOUR))`,
    [protocol, finalRequesterId, category_id || null, type, subject, description,
     priority, unit, asset_tag]
  );

  await db.run(
    `INSERT INTO ticket_history (ticket_id, actor_id, event_type, new_value)
     VALUES (?, ?, 'CREATED', ?)`,
    [result.lastID, req.user.id, protocol]
  );

  res.status(201).json({ message: "Chamado aberto com sucesso", id: result.lastID, protocol });
});

// ── POST /api/tickets/:id/comments ───────────────────────────────────────────
router.post("/:id/comments", authRequired, async (req, res) => {
  const { body, visibility = "PUBLIC" } = req.body;
  const db = await getDb();

  const ticket = await db.get(
    "SELECT * FROM tickets WHERE id = ? OR protocol = ?",
    [req.params.id, req.params.id]
  );

  if (!ticket) {
    return res.status(404).json({ message: "Chamado não encontrado" });
  }

  if (visibility === "INTERNAL" && !canSeeAll(req.user)) {
    return res.status(403).json({ message: "Comentário interno permitido apenas para BM-6" });
  }

  if (!canSeeAll(req.user) && ticket.requester_id !== req.user.id) {
    return res.status(403).json({ message: "Acesso não autorizado" });
  }

  await db.run(
    `INSERT INTO ticket_comments (ticket_id, author_id, body, visibility)
     VALUES (?, ?, ?, ?)`,
    [ticket.id, req.user.id, body, visibility]
  );

  await db.run(
    "UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [ticket.id]
  );

  res.status(201).json({ message: "Comentário registrado" });
});

// ── PATCH /api/tickets/:id/status ────────────────────────────────────────────
router.patch("/:id/status", authRequired, requireRole("ADMIN", "ANALYST"), async (req, res) => {
  const { status } = req.body;
  const db = await getDb();

  const ticket = await db.get(
    `SELECT t.*, u.name AS requester_name, u.email AS requester_email
     FROM tickets t
     JOIN users u ON u.id = t.requester_id
     WHERE t.id = ? OR t.protocol = ?`,
    [req.params.id, req.params.id]
  );

  if (!ticket) {
    return res.status(404).json({ message: "Chamado não encontrado" });
  }

  await db.run(
    `UPDATE tickets
     SET
       status      = ?,
       updated_at  = CURRENT_TIMESTAMP,
       closed_at   = CASE WHEN ? = 'FECHADO' THEN CURRENT_TIMESTAMP ELSE closed_at END,
       resolved_at = CASE WHEN ? IN ('FECHADO', 'RESOLVIDO') THEN CURRENT_TIMESTAMP ELSE resolved_at END
     WHERE id = ?`,
    [status, status, status, ticket.id]
  );

  await db.run(
    `INSERT INTO ticket_history (ticket_id, actor_id, event_type, old_value, new_value)
     VALUES (?, ?, 'STATUS_CHANGED', ?, ?)`,
    [ticket.id, req.user.id, ticket.status, status]
  );

  // Envia e-mail se o chamado foi finalizado
  if (status === 'FECHADO' && ticket.status !== 'FECHADO') {
    if (ticket.requester_email) {
      sendTicketClosedEmail(
        ticket.requester_email,
        ticket.requester_name,
        ticket.protocol,
        ticket.subject
      ).catch(err => console.error("Erro assíncrono ao enviar e-mail:", err));
    }
  }

  res.json({ message: "Status atualizado" });
});

// ── PATCH /api/tickets/:id/satisfaction ──────────────────────────────────────
router.patch("/:id/satisfaction", authRequired, async (req, res) => {
  const score = parseInt(req.body.score, 10);
  if (!score || score < 1 || score > 5) {
    return res.status(400).json({ message: "Nota inválida (deve ser de 1 a 5)" });
  }

  const db = await getDb();
  const ticket = await db.get(
    "SELECT * FROM tickets WHERE id = ? OR protocol = ?",
    [req.params.id, req.params.id]
  );

  if (!ticket) {
    return res.status(404).json({ message: "Chamado não encontrado" });
  }

  if (!canSeeAll(req.user) && ticket.requester_id !== req.user.id) {
    return res.status(403).json({ message: "Acesso não autorizado" });
  }

  await db.run(
    "UPDATE tickets SET satisfaction_score = ? WHERE id = ?",
    [score, ticket.id]
  );

  res.json({ message: "Avaliação salva com sucesso" });
});

// ── PATCH /api/tickets/:id/assign ────────────────────────────────────────────
router.patch("/:id/assign", authRequired, requireRole("ADMIN", "ANALYST"), async (req, res) => {
  const analystId = req.body.analyst_id || req.user.id;
  const db = await getDb();

  const ticket = await db.get(
    "SELECT * FROM tickets WHERE id = ? OR protocol = ?",
    [req.params.id, req.params.id]
  );

  if (!ticket) {
    return res.status(404).json({ message: "Chamado não encontrado" });
  }

  await db.run(
    `UPDATE tickets
     SET
       analyst_id = ?,
       status     = CASE WHEN status = 'ABERTO' THEN 'EM_ATENDIMENTO' ELSE status END,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [analystId, ticket.id]
  );

  await db.run(
    `INSERT INTO ticket_history (ticket_id, actor_id, event_type, old_value, new_value)
     VALUES (?, ?, 'ASSIGNED', ?, ?)`,
    [ticket.id, req.user.id, ticket.analyst_id, analystId]
  );

  res.json({ message: "Chamado atribuído" });
});

// ── Chat do chamado ────────────────────────────────────────────────────────────
router.get("/:id/chat", authRequired, async (req, res) => {
  const db = await getDb();
  const ticket = await db.get('SELECT * FROM tickets WHERE id=? OR protocol=?', [req.params.id, req.params.id]);
  if (!ticket) return res.status(404).json({ message: "Chamado não encontrado" });

  if (!canChat(req.user, ticket) && !canSeeAll(req.user))
    return res.status(403).json({ message: "Acesso não autorizado ao chat" });

  const after = parseInt(req.query.after) || 0;
  const msgs = await db.all(
    `SELECT tc.id, tc.sender_id, tc.message, tc.created_at, tc.read_at,
            u.name AS sender_name, u.role AS sender_role
     FROM ticket_chat tc JOIN users u ON u.id = tc.sender_id
     WHERE tc.ticket_id = ? AND tc.id > ?
     ORDER BY tc.created_at ASC`,
    [ticket.id, after]
  );

  if (msgs.length > 0) {
    await db.run(
      `UPDATE ticket_chat SET read_at=NOW()
       WHERE ticket_id=? AND sender_id != ? AND read_at IS NULL`,
      [ticket.id, req.user.id]
    );
  }

  res.json({
    ticket_id: ticket.id,
    analyst_id: ticket.analyst_id,
    messages: msgs
  });
});

router.post("/:id/chat", authRequired, async (req, res) => {
  const { message } = req.body;
  if (!message || !String(message).trim())
    return res.status(400).json({ message: "Mensagem não pode ser vazia" });

  const db = await getDb();
  const ticket = await db.get('SELECT * FROM tickets WHERE id=? OR protocol=?', [req.params.id, req.params.id]);
  if (!ticket) return res.status(404).json({ message: "Chamado não encontrado" });

  if (!canChat(req.user, ticket) && !canSeeAll(req.user))
    return res.status(403).json({ message: "Acesso não autorizado ao chat" });

  if (ticket.status === 'FECHADO')
    return res.status(400).json({ message: "Não é possível enviar mensagens em chamados resolvidos ou fechados" });

  const r = await db.run(
    'INSERT INTO ticket_chat(ticket_id, sender_id, message) VALUES (?,?,?)',
    [ticket.id, req.user.id, String(message).trim().slice(0, 2000)]
  );

  res.status(201).json({ id: r.lastID, message: String(message).trim() });
});

// ── Anexos ────────────────────────────────────────────────────────────────────
router.post("/:id/attachments", authRequired, async (req, res) => {
  try {
    const { filename, mimetype, data, is_screenshot } = req.body;
    if (!filename || !mimetype || !data)
      return res.status(400).json({ message: "Dados do arquivo incompletos" });

    if (!ALLOWED_MIME.has(mimetype))
      return res.status(400).json({ message: "Tipo de arquivo não permitido" });

    const raw = data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(raw, 'base64');

    if (buffer.length > 10 * 1024 * 1024)
      return res.status(400).json({ message: "Arquivo muito grande (limite 10MB)" });

    const db = await getDb();
    const ticket = await db.get('SELECT * FROM tickets WHERE id=? OR protocol=?', [req.params.id, req.params.id]);
    if (!ticket) return res.status(404).json({ message: "Chamado não encontrado" });

    if (!canSeeAll(req.user) && ticket.requester_id !== req.user.id)
      return res.status(403).json({ message: "Acesso não autorizado" });

    const safeName = path.basename(filename).replace(/[^a-zA-Z0-9._\-]/g, '_').slice(0, 200);
    const ext      = path.extname(safeName);
    const storedName = crypto.randomUUID() + ext;
    const targetDir  = is_screenshot ? SCREENSHOTS : UPLOADS;
    const filePath   = path.join(targetDir, storedName);

    fs.writeFileSync(filePath, buffer);

    const r = await db.run(
      'INSERT INTO ticket_attachments(ticket_id, uploader_id, original_name, stored_name, mimetype, size, is_screenshot) VALUES (?,?,?,?,?,?,?)',
      [ticket.id, req.user.id, safeName, storedName, mimetype, buffer.length, is_screenshot ? 1 : 0]
    );

    res.status(201).json({ id: r.lastID, filename: safeName });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao salvar anexo" });
  }
});

router.get("/:id/attachments", authRequired, async (req, res) => {
  const db = await getDb();
  const ticket = await db.get('SELECT * FROM tickets WHERE id=? OR protocol=?', [req.params.id, req.params.id]);
  if (!ticket) return res.status(404).json({ message: "Chamado não encontrado" });

  if (!canSeeAll(req.user) && ticket.requester_id !== req.user.id)
    return res.status(403).json({ message: "Acesso não autorizado" });

  const list = await db.all(
    `SELECT ta.id, ta.original_name, ta.mimetype, ta.size, ta.created_at, ta.is_screenshot, u.name AS uploader_name
     FROM ticket_attachments ta JOIN users u ON u.id = ta.uploader_id
     WHERE ta.ticket_id = ? ORDER BY ta.created_at ASC`,
    [ticket.id]
  );
  res.json(list);
});

export default router;
