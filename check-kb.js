import { getDb } from "./backend/src/db/database.js";

async function check() {
  const db = await getDb();
  const rows = await db.all("SELECT id, title FROM knowledge_articles");
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}
check().catch(console.error);