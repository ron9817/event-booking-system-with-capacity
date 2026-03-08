import "dotenv/config";
import app from "./app.js";
import prisma from "./prisma.js";
import { config } from "./config.js";
import logger from "./utils/logger.js";

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function main() {
  await prisma.$connect();
  logger.info("Database connected");

  const server = app.listen(config.PORT, () =>
    logger.info(`Server running on port ${config.PORT}`),
  );

  let shuttingDown = false;

  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info(`${signal} received, shutting down gracefully…`);

    const forceExit = setTimeout(() => {
      logger.error("Graceful shutdown timed out, forcing exit");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    try {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
      logger.info("HTTP server closed");

      await prisma.$disconnect();
      logger.info("Database disconnected");

      process.exit(0);
    } catch (err) {
      logger.error({ err }, "Error during shutdown");
      process.exit(1);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.fatal({ err }, "Failed to start server");
  process.exit(1);
});
