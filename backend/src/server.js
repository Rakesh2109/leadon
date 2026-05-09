const app = require("./app");
const env = require("./config/env");
const prisma = require("./config/prisma");

const server = app.listen(env.PORT, () => {
  console.log(`LeadOn API listening on port ${env.PORT}`);
});

async function shutdown(signal) {
  console.log(`${signal} received. Closing LeadOn API.`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
