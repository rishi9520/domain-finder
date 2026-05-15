import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  numeric,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

/**
 * Normalized news / market events ingested from external sources.
 * One canonical row per deduped event (multiple raw items may collapse here).
 */
export const newsEventsTable = pgTable(
  "news_events",
  {
    id: serial("id").primaryKey(),
    // Stable hash of source+url+title to dedupe across polls.
    dedupeKey: text("dedupe_key").notNull(),
    source: text("source").notNull(), // e.g. "hackernews", "reddit", "rss:techcrunch"
    sourceId: text("source_id").notNull(), // upstream id / url
    title: text("title").notNull(),
    summary: text("summary"),
    url: text("url"),
    // Free-form list of category tags ("ai","quantum","biotech"...).
    categories: jsonb("categories").notNull().$type<string[]>(),
    // Extracted lowercase keywords (no spaces, 3-12 chars).
    keywords: jsonb("keywords").notNull().$type<string[]>(),
    // Impact score 0..100 used to weight downstream hunts.
    impactScore: numeric("impact_score", { precision: 5, scale: 2 }).notNull(),
    // Raw upstream metadata (points, comments, author, etc.) — for explainability.
    metadata: jsonb("metadata"),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    ingestedAt: timestamp("ingested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    dedupeIdx: uniqueIndex("news_events_dedupe_unique").on(t.dedupeKey),
    impactIdx: index("news_events_impact_idx").on(t.impactScore),
    publishedIdx: index("news_events_published_idx").on(t.publishedAt),
  }),
);

export type NewsEventRow = typeof newsEventsTable.$inferSelect;

/**
 * Time-windowed keyword momentum. Rolling aggregate computed by ingestion loop.
 * Used by Hunter to bias generation toward currently-hot terms.
 */
export const trendSignalsTable = pgTable(
  "trend_signals",
  {
    keyword: text("keyword").primaryKey(),
    category: text("category").notNull(), // best-fit category for this keyword
    // Mention count in last 24h / 7d windows.
    count24h: integer("count_24h").notNull().default(0),
    count7d: integer("count_7d").notNull().default(0),
    // Rolling weight 0..100 (recency + frequency + source trust).
    weight: numeric("weight", { precision: 5, scale: 2 }).notNull().default("0"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    weightIdx: index("trend_signals_weight_idx").on(t.weight),
    categoryIdx: index("trend_signals_category_idx").on(t.category),
  }),
);

export type TrendSignalRow = typeof trendSignalsTable.$inferSelect;

/**
 * Audit trail of legal / trademark gate decisions for every candidate
 * that reached the persistence step (allowed or rejected).
 */
export const legalDecisionsTable = pgTable(
  "legal_decisions",
  {
    id: serial("id").primaryKey(),
    fqdn: text("fqdn").notNull(),
    verdict: text("verdict").notNull(), // "allow" | "block" | "review"
    risk: text("risk").notNull(), // "low" | "medium" | "high"
    matches: jsonb("matches").notNull().$type<string[]>(),
    rationale: text("rationale").notNull(),
    decidedAt: timestamp("decided_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    fqdnIdx: index("legal_decisions_fqdn_idx").on(t.fqdn),
    verdictIdx: index("legal_decisions_verdict_idx").on(t.verdict),
  }),
);

export type LegalDecisionRow = typeof legalDecisionsTable.$inferSelect;
