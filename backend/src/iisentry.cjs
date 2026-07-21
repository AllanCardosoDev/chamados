const dotenv = require("dotenv");
dotenv.config();

process.on("uncaughtException", (err) => {
  console.error("CBMAM ITSM error:", err);
});

async function main() {
  const { initDb } = await import("./db/database.js");

  let success = false;
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      await initDb();
      success = true;
      break;
    } catch (err) {
      console.log(`CBMAM ITSM - Tentativa ${attempt} falhou: ${err.message}`);
      if (attempt < 10) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  if (!success) {
    console.log("CBMAM ITSM - ERRO PERMANENTE no banco. Verifique credenciais e se o banco existe.");
    process.exit(1);
  }

  console.log(`CBMAM ITSM iniciado na porta ${process.env.PORT || 4000} (PID ${process.pid})`);
  console.log(`CBMAM ITSM escutando na porta: ${process.env.PORT || 4000}`);
  
  await import("./server.js");
}

main().catch((err) => {
  console.error("CBMAM ITSM error:", err);
  process.exit(1);
});
