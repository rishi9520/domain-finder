import app from "./app";
import { logger } from "./lib/logger";
import { hunter } from "./lib/hunter";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Auto-arm the hunter on boot so the live page is always producing diamonds.
  // Defer briefly so the server is fully up before history loads.
  setTimeout(() => {
    void hunter
      .start()
      .then(() => logger.info({}, "Hunter auto-armed"))
      .catch((err) => logger.error({ err }, "Hunter auto-arm failed"));
    // Kick off a one-shot RDAP re-verification of legacy diamonds in background.
    void hunter.runLegacyCleanup();
  }, 500);
});
