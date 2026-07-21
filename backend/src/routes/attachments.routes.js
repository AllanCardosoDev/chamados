import express from "express";
import { getDb } from "../db/database.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const router = express.Router();

const getJwtSecret = () => process.env.JWT_SECRET || "cbmam-chamados-secret-dev-key-2026";
const UPLOADS     = path.resolve(__dirname, "..", "..", "uploads");
const SCREENSHOTS = path.resolve(__dirname, "..", "..", "screenshots");

function canSeeAll(user) {
  return ["ADMIN", "ANALYST"].includes(user.role);
}

// GET /api/attachments/:id/file — baixar/visualizar (token via header ou query)
router.get("/:id/file", async (req, res) => {
  const token = (req.headers.authorization || "").replace("Bearer ", "") || req.query.token;
  if (!token) return res.status(401).json({ message: "Não autorizado" });

  let user;
  try {
    user = jwt.verify(token, getJwtSecret());
  } catch {
    return res.status(401).json({ message: "Token inválido ou expirado" });
  }

  try {
    const db = await getDb();
    const att = await db.get(
      `SELECT ta.*, t.requester_id FROM ticket_attachments ta
       JOIN tickets t ON t.id = ta.ticket_id WHERE ta.id = ?`,
      [req.params.id]
    );

    if (!att) return res.status(404).json({ message: "Arquivo não encontrado" });

    const canAccess = canSeeAll(user) || att.requester_id === user.id;
    if (!canAccess) return res.status(403).json({ message: "Acesso não autorizado" });

    const targetDir = att.is_screenshot ? SCREENSHOTS : UPLOADS;
    const filePath  = path.resolve(targetDir, att.stored_name);

    if (!filePath.startsWith(targetDir))
      return res.status(400).json({ message: "Caminho inválido" });

    if (!fs.existsSync(filePath))
      return res.status(404).json({ message: "Arquivo não encontrado no servidor" });

    res.setHeader("Content-Type", att.mimetype);
    const disposition = req.query.download ? "attachment" : "inline";
    res.setHeader("Content-Disposition", `${disposition}; filename="${att.original_name}"`);
    res.setHeader("X-Content-Type-Options", "nosniff");

    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao carregar arquivo" });
  }
});

export default router;
