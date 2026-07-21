import { getDb } from "./backend/src/db/database.js";

async function checkChatTable() {
  try {
    const db = await getDb();
    const rows = await db.all("SHOW TABLES LIKE 'ticket_chat'");
    if (rows.length > 0) {
      console.log("Table 'ticket_chat' exists.");
      const columns = await db.all("DESCRIBE ticket_chat");
      console.log("Columns:", columns.map(c => c.Field).join(", "));
    } else {
      console.log("Table 'ticket_chat' DOES NOT exist.");
    }
  } catch (err) {
    console.error("Error checking table:", err);
  } finally {
    process.exit();
  }
}

checkChatTable();
