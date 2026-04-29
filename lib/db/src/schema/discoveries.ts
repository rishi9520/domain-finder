import {
  pgTable,
  serial,
  text,
  numeric,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const discoveriesTable = pgTable(
  "discoveries",
  {
    id: serial("id").primaryKey(),
    fqdn: text("fqdn").notNull(),
    name: text("name").notNull(),
    tld: text("tld").notNull(),
    category: text("category").notNull(),
    strategy: text("strategy").notNull(),
    pattern: text("pattern").notNull(),
    length: integer("length").notNull(),
    valueScore: numeric("value_score", { precision: 5, scale: 2 }).notNull(),
    memorability: integer("memorability").notNull(),
    radioTest: integer("radio_test").notNull(),
    rationale: text("rationale").notNull(),
    dnsEvidence: text("dns_evidence").notNull(),
    discoveredAt: timestamp("discovered_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    fqdnIdx: uniqueIndex("discoveries_fqdn_unique").on(t.fqdn),
    scoreIdx: index("discoveries_score_idx").on(t.valueScore),
    discoveredIdx: index("discoveries_discovered_idx").on(t.discoveredAt),
  }),
);

export type DiscoveryRow = typeof discoveriesTable.$inferSelect;

export const dnsCacheTable = pgTable(
  "dns_cache",
  {
    fqdn: text("fqdn").primaryKey(),
    signal: text("signal").notNull(),
    evidence: text("evidence").notNull(),
    checkedAt: timestamp("checked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export type DnsCacheRow = typeof dnsCacheTable.$inferSelect;
