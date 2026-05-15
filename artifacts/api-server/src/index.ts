import app from "./app";
import { logger } from "./lib/logger";
import { hunter } from "./lib/hunter";
import { newsIngest } from "./lib/news/ingest";
import { db, discoveriesTable } from "@workspace/db";
import { desc } from "drizzle-orm";

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

    // Start continuous news ingestion (feeds trend signals into hunter).
    try {
      newsIngest.start();
      logger.info({}, "News ingest started");
    } catch (err) {
      logger.error({ err }, "News ingest start failed");
    }

    // Warm the DB query plan so the first user-facing discoveries request is fast.
    void db
      .select({ id: discoveriesTable.id })
      .from(discoveriesTable)
      .orderBy(desc(discoveriesTable.valueScore))
      .limit(1)
      .then(() => logger.info({}, "DB query plan warmed"))
      .catch(() => {/* ignore */});
  }, 500);
});
