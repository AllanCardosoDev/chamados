const dotenv = require("dotenv");
dotenv.config();

process.on("uncaughtException", (err) => {
  console.error("CBMAM Chamados IIS Error:", err);
});

async function main() {
  console.log(`CBMAM Chamados iniciando no IIS (PID ${process.pid})...`);
  await import("./server.js");
}

main().catch((err) => {
  console.error("CBMAM Chamados Boot Error:", err);
});
