import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

let pool;
let isSqlite = false;

async function createSqliteAdapter() {
  const sqlite3 = (await import("sqlite3")).default;
  const dbFile = path.resolve(__dirname, "../../dev.sqlite");
  const sdb = new sqlite3.Database(dbFile);

  const cleanSql = (sql) => {
    let s = sql
      .replace(/AUTO_INCREMENT/gi, "AUTOINCREMENT")
      .replace(/ENGINE=InnoDB/gi, "")
      .replace(/DEFAULT CHARSET=utf8mb4/gi, "")
      .replace(/INSERT IGNORE INTO/gi, "INSERT OR IGNORE INTO")
      .replace(/DATE_ADD\(NOW\(\),\s*INTERVAL\s*(\d+)\s*HOUR\)/gi, "datetime('now', '+$1 hours')")
      .replace(/NOW\(\)/gi, "datetime('now')")
      .replace(/ON UPDATE CURRENT_TIMESTAMP/gi, "");

    if (s.trim().toUpperCase().includes("SHOW TABLES")) {
      return "SELECT name AS `Tables_in_db` FROM sqlite_master WHERE type='table'";
    }
    if (s.trim().toUpperCase().includes("DESCRIBE ")) {
      const match = s.match(/DESCRIBE\s+([a-zA-Z0-9_]+)/i);
      const table = match ? match[1] : "users";
      return `PRAGMA table_info(${table})`;
    }
    return s;
  };

  const adapter = {
    isSqlite: true,
    get: (sql, params = []) => new Promise((resolve, reject) => {
      sdb.get(cleanSql(sql), params, (err, row) => {
        if (err) return reject(err);
        if (row && row.name && !row.Field) row.Field = row.name;
        resolve(row || null);
      });
    }),
    all: (sql, params = []) => new Promise((resolve, reject) => {
      sdb.all(cleanSql(sql), params, (err, rows) => {
        if (err) return reject(err);
        const mapped = (rows || []).map(r => r.name ? { ...r, Field: r.name } : r);
        resolve(mapped);
      });
    }),
    run: (sql, params = []) => new Promise((resolve, reject) => {
      sdb.run(cleanSql(sql), params, function(err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    }),
    exec: (sql) => new Promise((resolve, reject) => {
      sdb.exec(cleanSql(sql), err => err ? reject(err) : resolve());
    }),
    getConnection: async () => ({
      query: async (sql, params = []) => {
        const cSql = cleanSql(sql);
        if (cSql.trim().toUpperCase().startsWith("SELECT") || cSql.includes("SHOW COLUMNS") || cSql.includes("SHOW TABLES")) {
          if (cSql.includes("SHOW COLUMNS")) {
            const tableMatch = cSql.match(/FROM\s+([a-zA-Z0-9_]+)/i);
            const table = tableMatch ? tableMatch[1] : "users";
            try {
              const info = await adapter.all(`PRAGMA table_info(${table})`);
              const cols = info.map(c => ({ Field: c.name, Type: c.type }));
              return [cols];
            } catch {
              return [[]];
            }
          }
          const rows = await adapter.all(cSql, params);
          return [rows];
        }
        const res = await adapter.run(cSql, params);
        return [res];
      },
      release: () => {}
    })
  };
  return adapter;
}

export async function getDb() {
  if (!pool) {
    const dbPort = parseInt(process.env.DB_PORT || "3306", 10);
    const mysqlPool = mysql.createPool({
      host:     process.env.DB_HOST || "localhost",
      port:     isNaN(dbPort) ? 3306 : dbPort,
      user:     process.env.DB_USER || "chamados_user",
      password: process.env.DB_PASS || "",
      database: process.env.DB_NAME || "chamados",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: "utf8mb4",
      connectTimeout: 3000,
    });

    mysqlPool.get = async (sql, params = []) => {
      const [rows] = await mysqlPool.execute(sql, params);
      return rows[0] || null;
    };

    mysqlPool.all = async (sql, params = []) => {
      const [rows] = await mysqlPool.execute(sql, params);
      return rows;
    };

    mysqlPool.run = async (sql, params = []) => {
      const [result] = await mysqlPool.execute(sql, params);
      return { lastID: result.insertId, changes: result.affectedRows };
    };

    try {
      const conn = await mysqlPool.getConnection();
      conn.release();
      pool = mysqlPool;
      isSqlite = false;
      console.log("✅ Conectado ao banco de dados MySQL com sucesso.");
    } catch (err) {
      console.warn("⚠️ MySQL não disponível localmente. Alternando para modo SQLite local de desenvolvimento (dev.sqlite).");
      pool = await createSqliteAdapter();
      isSqlite = true;
    }
  }
  return pool;
}

export async function initDb() {
  await getDb();

  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id           INTEGER PRIMARY KEY AUTO_INCREMENT,
        name         VARCHAR(255)  NOT NULL,
        email        VARCHAR(255)  UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role         VARCHAR(20)   NOT NULL,
        rank         VARCHAR(100),
        registration VARCHAR(50),
        cpf          VARCHAR(14)   UNIQUE,
        unit         VARCHAR(255),
        phone        VARCHAR(50),
        status       VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',
        created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id                   INTEGER PRIMARY KEY AUTO_INCREMENT,
        name                 VARCHAR(255) NOT NULL,
        type                 VARCHAR(50)  NOT NULL DEFAULT 'INCIDENT',
        sla_response_hours   INT          NOT NULL DEFAULT 2,
        sla_resolution_hours INT          NOT NULL DEFAULT 8,
        active               TINYINT      NOT NULL DEFAULT 1
      );
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id                 INTEGER PRIMARY KEY AUTO_INCREMENT,
        protocol           VARCHAR(50) UNIQUE NOT NULL,
        requester_id       INT NOT NULL,
        analyst_id         INT,
        category_id        INT,
        type               VARCHAR(50)  NOT NULL,
        subject            VARCHAR(500) NOT NULL,
        description        TEXT         NOT NULL,
        priority           VARCHAR(20)  NOT NULL,
        status             VARCHAR(30)  NOT NULL DEFAULT 'ABERTO',
        unit               VARCHAR(255),
        asset_tag          VARCHAR(100),
        sla_due_at         DATETIME,
        resolved_at        DATETIME,
        closed_at          DATETIME,
        satisfaction_score INT,
        created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS ticket_comments (
        id         INTEGER PRIMARY KEY AUTO_INCREMENT,
        ticket_id  INT  NOT NULL,
        author_id  INT  NOT NULL,
        body       TEXT NOT NULL,
        visibility VARCHAR(20) NOT NULL DEFAULT 'PUBLIC',
        created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS ticket_history (
        id         INTEGER PRIMARY KEY AUTO_INCREMENT,
        ticket_id  INT NOT NULL,
        actor_id   INT,
        event_type VARCHAR(50) NOT NULL,
        old_value  TEXT,
        new_value  TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS knowledge_articles (
        id          INTEGER PRIMARY KEY AUTO_INCREMENT,
        title       VARCHAR(500) NOT NULL,
        category_id INT,
        content     TEXT         NOT NULL,
        status      VARCHAR(20)  NOT NULL DEFAULT 'PUBLISHED',
        views       INT          NOT NULL DEFAULT 0,
        created_by  INT,
        created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS ticket_attachments (
        id            INTEGER PRIMARY KEY AUTO_INCREMENT,
        ticket_id     INT NOT NULL,
        uploader_id   INT NOT NULL,
        original_name VARCHAR(500) NOT NULL,
        stored_name   VARCHAR(500) NOT NULL,
        mimetype      VARCHAR(255) NOT NULL,
        size          INT NOT NULL,
        is_screenshot TINYINT NOT NULL DEFAULT 0,
        created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS ticket_chat (
        id         INTEGER PRIMARY KEY AUTO_INCREMENT,
        ticket_id  INT NOT NULL,
        sender_id  INT NOT NULL,
        message    TEXT NOT NULL,
        read_at    DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS services (
        id          INTEGER PRIMARY KEY AUTO_INCREMENT,
        name        VARCHAR(255) NOT NULL UNIQUE,
        status      VARCHAR(20) NOT NULL DEFAULT 'OPERATIONAL',
        description VARCHAR(500),
        category    VARCHAR(100) NOT NULL DEFAULT 'Geral',
        category_id INT NULL,
        updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    if (!isSqlite) {
      // Migração MySQL específica
      try {
        const [columns] = await conn.query("SHOW COLUMNS FROM services");
        const hasCategory = columns.some(c => c.Field === 'category');
        if (!hasCategory) {
          await conn.query("ALTER TABLE services ADD COLUMN category VARCHAR(100) NOT NULL DEFAULT 'Geral'");
          await conn.query("ALTER TABLE services ADD COLUMN category_id INT NULL");
        }
      } catch (e) {}
    }

    // Criar tabela de histórico
    await conn.query(`
      CREATE TABLE IF NOT EXISTS service_status_history (
        id           INTEGER PRIMARY KEY AUTO_INCREMENT,
        service_name VARCHAR(255) NOT NULL,
        status       VARCHAR(20)  NOT NULL,
        description  VARCHAR(500),
        created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

  } finally {
    conn.release();
  }

  await seed();
}

async function seed() {
  const db = await getDb();
  const count = await db.get("SELECT COUNT(*) AS total FROM users");
  if (count.total > 0) return;

  // Seed services
  await db.run("INSERT IGNORE INTO services(name,status,category,category_id) VALUES (?,?,?,?)", ['SIGBM', 'OPERATIONAL', 'Sistemas Corporativos', 2]);
  await db.run("INSERT IGNORE INTO services(name,status,category,category_id) VALUES (?,?,?,?)", ['E-mail Institucional', 'OPERATIONAL', 'Sistemas Corporativos', 5]);
  await db.run("INSERT IGNORE INTO services(name,status,category,category_id) VALUES (?,?,?,?)", ['Internet Corporativa', 'OPERATIONAL', 'Infraestrutura e Redes', 3]);
  await db.run("INSERT IGNORE INTO services(name,status,category,category_id) VALUES (?,?,?,?)", ['Telefonia', 'OPERATIONAL', 'Infraestrutura e Redes', 6]);
  await db.run("INSERT IGNORE INTO services(name,status,category,category_id) VALUES (?,?,?,?)", ['Rede Wi-Fi', 'OPERATIONAL', 'Infraestrutura e Redes', 3]);
  await db.run("INSERT IGNORE INTO services(name,status,category,category_id) VALUES (?,?,?,?)", ['Sistemas Internos CBMAM (SIGED, SIGDP)', 'OPERATIONAL', 'Sistemas Corporativos', 2]);

  const passAdmin    = await bcrypt.hash("admin123",    10);
  const passAnalista = await bcrypt.hash("analista123", 10);
  const passUsuario  = await bcrypt.hash("usuario123",  10);

  await db.run(
    "INSERT INTO users(name,email,password_hash,role,rank,registration,cpf,unit,phone) VALUES (?,?,?,?,?,?,?,?,?)",
    ["Administrador BM-6", "admin@cbmam.am.gov.br", passAdmin, "ADMIN", "Oficial", "000001", "000.000.000-00", "BM-6 TI", "(92) 99999-0001"]
  );
  await db.run(
    "INSERT INTO users(name,email,password_hash,role,rank,registration,cpf,unit,phone) VALUES (?,?,?,?,?,?,?,?,?)",
    ["Analista BM-6", "analista@cbmam.am.gov.br", passAnalista, "ANALYST", "Soldado", "000002", "000.000.000-02", "BM-6 TI", "(92) 99999-0002"]
  );
  await db.run(
    "INSERT INTO users(name,email,password_hash,role,rank,registration,cpf,unit,phone) VALUES (?,?,?,?,?,?,?,?,?)",
    ["Soldado João Silva", "usuario@cbmam.am.gov.br", passUsuario, "USER", "Soldado", "000003", "000.000.000-03", "1º GBM - Manaus", "(92) 99999-0003"]
  );

  for (const c of [
    ["Impressoras",         "INCIDENT", 2, 8],
    ["Sistemas (SIGED, SIGDP)", "INCIDENT", 1, 4],
    ["Rede e Wi-Fi",        "INCIDENT", 2, 8],
    ["Acessos",             "REQUEST",  4, 24],
    ["E-mail Institucional","REQUEST",  4, 24],
    ["Telefonia",           "REQUEST",  8, 48],
  ]) {
    await db.run(
      "INSERT INTO categories(name,type,sla_response_hours,sla_resolution_hours) VALUES (?,?,?,?)", c
    );
  }

  const u = await db.get("SELECT id FROM users WHERE email=?", ["usuario@cbmam.am.gov.br"]);
  const a = await db.get("SELECT id FROM users WHERE email=?", ["analista@cbmam.am.gov.br"]);

  if (u && a) {
    for (const r of [
      [u.id, a.id, 1, "INCIDENT", "Impressora não está imprimindo documentos",   "A impressora da sala administrativa não responde.",         "ALTA",  "EM_ATENDIMENTO",    "1º GBM - Manaus",          "CHM-2024-01572"],
      [u.id, a.id, 2, "INCIDENT", "Acesso ao sistema SIGBM não está funcionando", "Erro de autenticação no SIGBM.",                            "ALTA",  "EM_ATENDIMENTO",    "1º GBM - Sala de Operações","CHM-2024-01518"],
      [u.id, a.id, 3, "INCIDENT", "Falha ao conectar na rede Wi-Fi",              "Equipamento não conecta à rede institucional.",             "MEDIA", "AGUARDANDO_USUARIO","2º GBM - Manaus",          "CHM-2024-01489"],
      [u.id, null, 4, "REQUEST",  "Solicitação de acesso ao SharePoint",          "Solicito acesso à pasta do setor.",                        "BAIXA", "ABERTO",            "Estado-Maior",             "CHM-2024-01420"],
    ]) {
      const [req_id, ana_id, cat_id, type, subject, description, priority, status, unit, protocol] = r;
      await db.run(
        `INSERT INTO tickets
          (protocol,requester_id,analyst_id,category_id,type,subject,description,priority,status,unit)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [protocol, req_id, ana_id, cat_id, type, subject, description, priority, status, unit]
      );
    }

    await db.run(
      "INSERT INTO knowledge_articles(title,category_id,content,created_by) VALUES (?,?,?,?)",
      ["Como redefinir minha senha da rede", 4, "Passo a passo para redefinição de senha institucional.", a.id]
    );
    await db.run(
      "INSERT INTO knowledge_articles(title,category_id,content,created_by) VALUES (?,?,?,?)",
      ["Como conectar ao Wi-Fi institucional", 3, "Procedimento para conectar dispositivos autorizados à rede Wi-Fi.", a.id]
    );
  }
}
