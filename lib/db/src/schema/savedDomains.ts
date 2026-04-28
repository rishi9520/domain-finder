import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const savedDomainsTable = pgTable("saved_domains", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  tld: text("tld").notNull(),
  fqdn: text("fqdn").notNull(),
  category: text("category").notNull(),
  strategy: text("strategy").notNull(),
  valueScore: numeric("value_score", { precision: 5, scale: 2 }).notNull(),
  listPrice: numeric("list_price", { precision: 12, scale: 2 }),
  notes: text("notes"),
  savedAt: timestamp("saved_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertSavedDomainSchema = createInsertSchema(
  savedDomainsTable,
).omit({ id: true, savedAt: true });
export type InsertSavedDomain = z.infer<typeof insertSavedDomainSchema>;
export type SavedDomainRow = typeof savedDomainsTable.$inferSelect;

export const huntedCacheTable = pgTable("hunted_cache", {
  id: serial("id").primaryKey(),
  fqdn: text("fqdn").notNull().unique(),
  available: integer("available"),
  listPrice: numeric("list_price", { precision: 12, scale: 2 }),
  currency: text("currency"),
  checkedAt: timestamp("checked_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
