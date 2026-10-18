import { config } from "./config.js";
import { logger } from "./logger.js";
import { createApp } from "./app.js";

const app = createApp();

if (config.warmupOcr) {
  import("./services/ocr.worker.js")
    .then(({ warmupOcr }) => warmupOcr())
    .catch((err) => logger.warn("Échec du warmup OCR", { error: String(err) }));
}

const server = app.listen(config.port, () => {
  logger.info(`✅ UniPay Verify API démarrée sur le port ${config.port} [env=${config.nodeEnv}]`);
});

function gracefulShutdown(signal: string) {
  logger.info(`Signal ${signal} reçu. Fermeture progressive du serveur...`);
  server.close(() => {
    logger.info("Serveur HTTP fermé proprement.");
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("Fermeture forcée après délai de sécurité (10s).");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Promise Rejection", { reason: String(reason) });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", { error: error.message, stack: error.stack });
});
