import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "../db/database.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

const getJwtSecret = () => process.env.JWT_SECRET || "cbmam-chamados-secret-dev-key-2026";

function cleanCPF(val) {
  return val ? val.replace(/\D/g, "") : "";
}

function formatCPF(val) {
  const clean = cleanCPF(val);
  if (clean.length !== 11) return val;
  return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function isCPF(val) {
  if (!val) return false;
  if (val.includes("@")) return false;
  const clean = cleanCPF(val);
  return clean.length === 11;
}

router.post("/login", async (req, res) => {
  try {
    const { email, cpf, password } = req.body || {};
    const usernameInput = (cpf || email || (req.body && req.body.username) || "").trim();

    if (!usernameInput || !password) {
      return res.status(400).json({ message: "CPF/E-mail e senha são obrigatórios" });
    }

    const db = await getDb();

    if (isCPF(usernameInput)) {
      const formattedCpf = formatCPF(usernameInput);
      let apiSuccess = false;
      let apiData = null;

      const primaryApiUrl = process.env.SIGDP_API_URL || "http://127.0.0.1:8000/sigdp/api/login";
      const fallbackApiUrl = process.env.SIGDP_API_FALLBACK_URL || "https://drhsistema-production.up.railway.app/api/login";
      const apiEndpoints = [primaryApiUrl, fallbackApiUrl].filter(Boolean);

      for (const endpoint of apiEndpoints) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        try {
          const apiRes = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cpf: formattedCpf, senha: password }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (apiRes.ok) {
            const data = await apiRes.json();
            if (data && (data.status === "sucesso" || data.status === "success" || data.sucesso === true)) {
              apiSuccess = true;
              apiData = data.usuario || data.user || data.data;
              break;
            }
          }
        } catch (err) {
          clearTimeout(timeoutId);
          console.error(`Erro ao conectar na API de Login (${endpoint}):`, err.message);
        }
      }

    if (apiSuccess && apiData) {
      let user = null;
      try {
        if (db) {
          user = await db.get("SELECT * FROM users WHERE cpf = ?", [apiData.cpf]);
          if (!user && apiData.email) {
            user = await db.get("SELECT * FROM users WHERE email = ?", [apiData.email]);
          }

          const passwordHash = await bcrypt.hash(password, 10);
          const emailValue = apiData.email || `${cleanCPF(apiData.cpf)}@cbmam.am.gov.br`;
          const unitValue = apiData.obm1 || apiData.unidade || "1º GBM";

          if (user) {
            await db.run(
              `UPDATE users 
               SET name = ?, email = ?, unit = ?, password_hash = ?, status = 'ACTIVE' 
               WHERE id = ?`,
              [apiData.nome || user.name, emailValue, unitValue, passwordHash, user.id]
            );
            user = await db.get("SELECT * FROM users WHERE id = ?", [user.id]);
          } else {
            let role = "USER";
            if (apiData.funcao_user_id === 1) role = "ADMIN";
            else if (apiData.funcao_user_id === 2) role = "ANALYST";

            const result = await db.run(
              `INSERT INTO users (name, email, password_hash, role, unit, cpf, status) 
               VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
              [apiData.nome || "Militar CBMAM", emailValue, passwordHash, role, unitValue, apiData.cpf]
            );
            user = await db.get("SELECT * FROM users WHERE id = ?", [result.lastID]);
          }
        }
      } catch (dbErr) {
        console.warn("⚠️ Aviso ao sincronizar militar no banco de dados:", dbErr.message);
      }

      const userPayload = user || {
        id: apiData.id || 9999,
        name: apiData.nome || "Militar CBMAM",
        email: apiData.email || `${cleanCPF(apiData.cpf)}@cbmam.am.gov.br`,
        role: apiData.funcao_user_id === 1 ? "ADMIN" : (apiData.funcao_user_id === 2 ? "ANALYST" : "USER"),
        unit: apiData.obm1 || apiData.unidade || "1º GBM",
        rank: apiData.posto_graduacao || apiData.posto || "",
      };

      const token = jwt.sign(
        {
          id:    userPayload.id,
          name:  userPayload.name,
          email: userPayload.email,
          role:  userPayload.role,
          unit:  userPayload.unit,
        },
        getJwtSecret(),
        { expiresIn: "8h" }
      );

      return res.json({
        token,
        user: {
          id:    userPayload.id,
          name:  userPayload.name,
          email: userPayload.email,
          role:  userPayload.role,
          unit:  userPayload.unit,
          rank:  userPayload.rank,
        },
      });
    }

    // Fallback de login local por CPF (contingência)
    const user = await db.get("SELECT * FROM users WHERE cpf = ?", [formattedCpf]);
    if (user) {
      const valid = await bcrypt.compare(password, user.password_hash);
      if (valid) {
        if (user.status !== "ACTIVE") {
          return res.status(403).json({
            message: "Usuário bloqueado ou pendente de aprovação",
          });
        }

        const token = jwt.sign(
          {
            id:    user.id,
            name:  user.name,
            email: user.email,
            role:  user.role,
            unit:  user.unit,
          },
          getJwtSecret(),
          { expiresIn: "8h" }
        );

        return res.json({
          token,
          user: {
            id:    user.id,
            name:  user.name,
            email: user.email,
            role:  user.role,
            unit:  user.unit,
            rank:  user.rank,
          },
        });
      }
    }

    return res.status(401).json({ message: "CPF ou senha inválidos" });
  }

  // Login tradicional por e-mail (contingência)
  const user = await db.get("SELECT * FROM users WHERE email = ?", [usernameInput]);

  if (!user) {
    return res.status(401).json({ message: "E-mail ou senha inválidos" });
  }

  const valid = await bcrypt.compare(password, user.password_hash);

  if (!valid) {
    return res.status(401).json({ message: "E-mail ou senha inválidos" });
  }

  if (user.status !== "ACTIVE") {
    return res.status(403).json({
      message: "Usuário bloqueado ou pendente de aprovação",
    });
  }

  const token = jwt.sign(
    {
      id:    user.id,
      name:  user.name,
      email: user.email,
      role:  user.role,
      unit:  user.unit,
    },
    getJwtSecret(),
    { expiresIn: "8h" }
  );

    res.json({
      token,
      user: {
        id:    user.id,
        name:  user.name,
        email: user.email,
        role:  user.role,
        unit:  user.unit,
        rank:  user.rank,
      },
    });
  } catch (err) {
    console.error("Erro na rota /login:", err);
    res.status(500).json({ 
      message: "Banco de dados MySQL indisponível. Verifique as credenciais no arquivo backend/.env ou inicie o serviço MySQL." 
    });
  }
});

router.post("/register", async (req, res) => {
  const { name, email, password, rank, registration, unit, phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      message: "Nome, e-mail e senha são obrigatórios",
    });
  }

  const db = await getDb();

  const exists = await db.get("SELECT id FROM users WHERE email = ?", [email]);

  if (exists) {
    return res.status(409).json({ message: "E-mail já cadastrado" });
  }

  const hash = await bcrypt.hash(password, 10);

  await db.run(
    `INSERT INTO users
       (name, email, password_hash, role, rank, registration, unit, phone, status)
     VALUES (?, ?, ?, 'USER', ?, ?, ?, ?, 'PENDING')`,
    [name, email, hash, rank, registration, unit, phone]
  );

  res.status(201).json({
    message: "Cadastro realizado. Aguarde aprovação pela BM-6 TI.",
  });
});

router.get("/me", authRequired, async (req, res) => {
  const db = await getDb();

  const user = await db.get(
    `SELECT id, name, email, role, rank, registration, unit, phone, status, created_at
     FROM users
     WHERE id = ?`,
    [req.user.id]
  );

  res.json(user);
});

export default router;
