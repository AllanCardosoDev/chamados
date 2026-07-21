import express from "express";
import { getDb } from "../db/database.js";
import { authRequired, requireRole } from "../middleware/auth.js";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const UPLOADS     = path.resolve(__dirname, "..", "..", "uploads");

if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });

const router = express.Router();

router.get("/", authRequired, async (req, res) => {
  const db = await getDb();
  const q  = req.query.q ? `%${req.query.q}%` : "%";

  const articles = await db.all(
    `SELECT ka.*, c.name AS category_name
     FROM knowledge_articles ka
     LEFT JOIN categories c ON c.id = ka.category_id
     WHERE ka.status = 'PUBLISHED'
       AND (ka.title LIKE ? OR ka.content LIKE ?)
     ORDER BY ka.views DESC, ka.updated_at DESC`,
    [q, q]
  );

  res.json(articles);
});

router.post("/", authRequired, requireRole("ADMIN", "ANALYST"), async (req, res) => {
  const { title, category_id, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ message: "Título e conteúdo são obrigatórios" });
  }

  const db     = await getDb();
  const result = await db.run(
    `INSERT INTO knowledge_articles (title, category_id, content, created_by)
     VALUES (?, ?, ?, ?)`,
    [title, category_id || null, content, req.user.id]
  );

  res.status(201).json({ message: "Artigo criado com sucesso", id: result.lastID });
});

router.post(["/upload", "/kb-direct-upload", "/direct-upload"], authRequired, requireRole("ADMIN", "ANALYST"), async (req, res) => {
  try {
    const { filename, data } = req.body;
    if (!filename || !data) {
      return res.status(400).json({ message: "Dados do arquivo incompletos" });
    }

    const raw = data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(raw, 'base64');

    if (buffer.length > 20 * 1024 * 1024) {
      return res.status(400).json({ message: "Arquivo muito grande (limite 20MB)" });
    }

    const safeName = path.basename(filename).replace(/[^a-zA-Z0-9._\-]/g, '_').slice(0, 200);
    const ext      = path.extname(safeName);
    const storedName = crypto.randomUUID() + ext;
    const filePath   = path.join(UPLOADS, storedName);

    fs.writeFileSync(filePath, buffer);

    res.status(201).json({ filename: safeName, url: `/uploads/${storedName}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao fazer upload do arquivo" });
  }
});

router.delete("/:id", authRequired, requireRole("ADMIN", "ANALYST"), async (req, res) => {
  try {
    const db = await getDb();
    await db.run("UPDATE knowledge_articles SET status = 'ARCHIVED' WHERE id = ?", [req.params.id]);
    res.json({ message: "Artigo arquivado com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao arquivar artigo" });
  }
});

export default router;
