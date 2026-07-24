import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

import express from "express";
import "express-async-errors";
import cors from "cors";
import morgan from "morgan";
import { initDb, getDb } from "./db/database.js";
import authRoutes       from "./routes/auth.routes.js";
import ticketsRoutes    from "./routes/tickets.routes.js";
import categoriesRoutes from "./routes/categories.routes.js";
import knowledgeRoutes  from "./routes/knowledge.routes.js";
import reportsRoutes    from "./routes/reports.routes.js";
import attachmentsRoutes from "./routes/attachments.routes.js";
import servicesRoutes    from "./routes/services.routes.js";
import usersRoutes       from "./routes/users.routes.js";

try {
  await initDb();
  console.log("Banco de dados MySQL conectado com sucesso.");
} catch (err) {
  console.warn("⚠️ Aviso: Não foi possível conectar ao MySQL na inicialização:", err.message);
  console.warn("   Preencha as credenciais do Plesk em backend/.env (DB_HOST, DB_USER, DB_PASS, DB_NAME)");
}


const app  = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://itsm.cbm.am.gov.br",
    "https://chamados.cbm.am.gov.br",
    "https://www.cbm.am.gov.br",
  ],
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

app.get("/api",          (req, res) => res.json({ app: "CBMAM Chamados API", status: "online" }));

// Health check completo: valida conexão com o banco MySQL
app.get("/api/health", async (req, res) => {
  try {
    const db = await getDb();
    const row = await db.get("SELECT 1 AS ok, NOW() AS db_time, DATABASE() AS db_name");
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: {
        connected: row?.ok === 1,
        time:      row?.db_time,
        name:      row?.db_name,
      },
    });
  } catch (err) {
    res.status(503).json({
      status: "degraded",
      timestamp: new Date().toISOString(),
      database: { connected: false, error: err.message },
    });
  }
});
app.use("/uploads", express.static(path.resolve(__dirname, "..", "uploads")));

// Alias para compatibilidade do frontend (/chamados)
app.use("/api/poll/tickets", (req, res, next) => {
  req.url = "/recent" + (req.url.startsWith("/") ? req.url : "/" + req.url);
  return ticketsRoutes(req, res, next);
});

app.use("/api/kb-direct-upload", (req, res, next) => {
  req.url = "/upload" + (req.url.startsWith("/") ? req.url : "/" + req.url);
  return knowledgeRoutes(req, res, next);
});

app.use("/api/auth",       authRoutes);
app.use("/api/tickets",    ticketsRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/knowledge",  knowledgeRoutes);
app.use("/api/reports",    reportsRoutes);
app.use("/api/attachments", attachmentsRoutes);
app.use("/api/services",    servicesRoutes);
app.use("/api/users",       usersRoutes);

// Servir os arquivos estáticos do frontend (frontend/dist) e SPA Fallback
const frontendDistPath = path.resolve(__dirname, "..", "..", "frontend", "dist");
if (fs.existsSync(frontendDistPath)) {
  app.use("/chamados", express.static(frontendDistPath));
  app.use(express.static(frontendDistPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, "index.html"));
  });
}

app.use((err, req, res, next) => {
  console.error("Erro capturado no middleware global:", err);
  if (err.code === "ECONNREFUSED" || err.message.includes("connect ECONNREFUSED") || err.message.includes("database")) {
    return res.status(503).json({
      message: "Banco de dados MySQL indisponível. Certifique-se de que o serviço MySQL está iniciado e as credenciais no .env estão corretas."
    });
  }
  res.status(500).json({ message: err.message || "Erro interno no servidor" });
});

app.listen(PORT, () => console.log(`CBMAM Chamados rodando em http://localhost:${PORT}`));

