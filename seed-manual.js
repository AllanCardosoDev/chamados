import { getDb } from "./backend/src/db/database.js";

async function addManual() {
  const db = await getDb();
  
  // Verifica se já existe para não duplicar
  const exists = await db.get("SELECT id FROM knowledge_articles WHERE title = 'Guia: Como permitir o acesso remoto'");
  if (exists) {
    console.log("Manual já cadastrado na Base de Conhecimento.");
    process.exit(0);
  }

  // Busca a categoria 'Acessos' ou usa NULL
  const cat = await db.get("SELECT id FROM categories WHERE name = 'Acessos' LIMIT 1");
  const catId = cat ? cat.id : null;

  // Busca um usuário Admin/Analista para ser o autor
  const author = await db.get("SELECT id FROM users WHERE role IN ('ADMIN', 'ANALYST') ORDER BY id ASC LIMIT 1");
  const authorId = author ? author.id : 1;

  const content = `
Para que a equipe da BM-6 possa realizar suporte técnico de forma rápida e eficiente na sua máquina, utilizamos ferramentas de acesso remoto.

Siga as instruções do manual em anexo para autorizar e estabelecer a conexão com segurança.

<a href="/itsm/api/public/manual-acesso-remoto" target="_blank" download style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; background-color: #9b0f14; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 15px;">
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
  Baixar Manual em PDF
</a>
  `.trim();

  await db.run(
    "INSERT INTO knowledge_articles(title, category_id, content, created_by) VALUES (?, ?, ?, ?)",
    ["Guia: Como permitir o acesso remoto", catId, content, authorId]
  );

  console.log("Manual cadastrado com sucesso na Base de Conhecimento!");
  process.exit(0);
}

addManual().catch(console.error);