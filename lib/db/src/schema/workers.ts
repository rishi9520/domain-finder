import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  numeric,
  jsonb,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Persistent state for each of the 12 "Codicore" workers.
 * One row per workerId — created on first boot, then upserted.
 */
export const workersTable = pgTable(
  "workers",
  {
    id: text("id").primaryKey(), // e.g. "domain_sniper"
    displayName: text("display_name").notNull(),
    category: text("category").notNull(), // "domains" | "crypto" | "social" | "compute" | "defi"
    riskLevel: text("risk_level").notNull(), // "low" | "medium" | "high" | "very_high"
    legalStatus: text("legal_status").notNull(), // "clean" | "tos_grey" | "tos_violation"
    enabled: boolean("enabled").notNull().default(false),
    implemented: boolean("implemented").notNull().default(false),
    description: text("description").notNull(),
    config: jsonb("config").notNull().default({}),
    lastStartedAt: timestamp("last_started_at", { withTimezone: true }),
    lastStoppedAt: timestamp("last_stopped_at", { withTimezone: true }),
    lastError: text("last_error"),
    totalRuns: integer("total_runs").notNull().default(0),
    totalOpportunities: integer("total_opportunities").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    enabledIdx: index("workers_enabled_idx").on(t.enabled),
    categoryIdx: index("workers_category_idx").on(t.category),
  }),
);

export type WorkerRow = typeof workersTable.$inferSelect;

/**
 * Append-only ledger of every "find" any worker produces.
 * Each opportunity = a candidate buy/snipe/farm action with score + payload.
 */
export const opportunitiesTable = pgTable(
  "opportunities",
  {
    id: serial("id").primaryKey(),
    workerId: text("worker_id").notNull(),
    // Stable dedupe key per worker (e.g. fqdn, contract address, handle).
    externalKey: text("external_key").notNull(),
    kind: text("kind").notNull(), // worker-specific: "domain", "tg_username", "memecoin", ...
    score: numeric("score", { precision: 6, scale: 2 }).notNull().default("0"),
    // 0..100 confidence the opportunity is actionable right now.
    confidence: numeric("confidence", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    status: text("status").notNull().default("new"), // "new" | "reviewed" | "acted" | "skipped" | "expired"
    payload: jsonb("payload").notNull(),
    rationale: text("rationale"),
    discoveredAt: timestamp("discovered_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (t) => ({
    workerKeyUnique: uniqueIndex("opportunities_worker_key_unique").on(
      t.workerId,
      t.externalKey,
    ),
    workerIdx: index("opportunities_worker_idx").on(t.workerId),
    scoreIdx: index("opportunities_score_idx").on(t.score),
    statusIdx: index("opportunities_status_idx").on(t.status),
    discoveredIdx: index("opportunities_discovered_idx").on(t.discoveredAt),
  }),
);

export type OpportunityRow = typeof opportunitiesTable.$inferSelect;

/**
 * Per-run telemetry so we can debug + show "last cycle stats" per worker.
 */
export const workerRunsTable = pgTable(
  "worker_runs",
  {
    id: serial("id").primaryKey(),
    workerId: text("worker_id").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    status: text("status").notNull().default("running"), // "running" | "ok" | "error" | "skipped"
    opportunitiesFound: integer("opportunities_found").notNull().default(0),
    stats: jsonb("stats").notNull().default({}),
    error: text("error"),
  },
  (t) => ({
    workerIdx: index("worker_runs_worker_idx").on(t.workerId),
    startedIdx: index("worker_runs_started_idx").on(t.startedAt),
  }),
);

export type WorkerRunRow = typeof workerRunsTable.$inferSelect;
