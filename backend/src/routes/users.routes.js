import express from "express";
import { getDb } from "../db/database.js";
import { authRequired, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.get("/", authRequired, requireRole("ADMIN", "ANALYST"), async (req, res) => {
  const db = await getDb();
  const list = await db.all("SELECT id, name, cpf, role, unit, status FROM users ORDER BY name");
  res.json(list);
});

router.get("/analysts", authRequired, requireRole("ADMIN", "ANALYST"), async (req, res) => {
  const db = await getDb();
  const list = await db.all(
    "SELECT id, name, unit FROM users WHERE role IN ('ADMIN', 'ANALYST') AND status='ACTIVE' ORDER BY name"
  );
  res.json(list);
});

router.patch("/me", authRequired, async (req, res) => {
  const { phone, unit } = req.body;
  if (phone === undefined && unit === undefined)
    return res.status(400).json({ message: "Nenhum campo para atualizar" });

  const db = await getDb();
  const fields = [];
  const values = [];
  if (phone !== undefined) { fields.push("phone=?"); values.push(phone); }
  if (unit  !== undefined) { fields.push("unit=?");  values.push(unit);  }
  values.push(req.user.id);

  await db.run(`UPDATE users SET ${fields.join(", ")} WHERE id=?`, values);

  const updated = await db.get(
    "SELECT id, name, cpf, email, role, unit, phone, status FROM users WHERE id=?",
    [req.user.id]
  );
  res.json({ message: "Perfil atualizado", user: updated });
});

router.patch("/:id/role", authRequired, requireRole("ADMIN", "ANALYST"), async (req, res) => {
  const { role } = req.body;
  if (!["USER", "ANALYST", "ADMIN"].includes(role))
    return res.status(400).json({ message: "Perfil inválido" });

  const db = await getDb();
  await db.run("UPDATE users SET role=? WHERE id=?", [role, req.params.id]);
  res.json({ message: "Perfil atualizado" });
});

router.post("/preregister", authRequired, requireRole("ADMIN", "ANALYST"), async (req, res) => {
  const { cpf, name, unit, role } = req.body;
  const db = await getDb();
  const existing = await db.get("SELECT id FROM users WHERE cpf=?", [cpf]);
  if (existing) return res.status(400).json({ message: "Usuário já existe" });

  await db.run(
    "INSERT INTO users (cpf, name, unit, role, email) VALUES (?, ?, ?, ?, ?)",
    [cpf, name || "Pré-cadastro", unit || "", role || "USER", `${cpf}@drh.pre`]
  );
  res.status(201).json({ message: "Usuário pré-cadastrado com sucesso" });
});

router.patch("/:id/status", authRequired, requireRole("ADMIN", "ANALYST"), async (req, res) => {
  const { status } = req.body;
  if (!["ACTIVE", "INACTIVE"].includes(status))
    return res.status(400).json({ message: "Status inválido" });

  const db = await getDb();
  await db.run("UPDATE users SET status=? WHERE id=?", [status, req.params.id]);
  res.json({ message: "Status atualizado" });
});

export default router;
