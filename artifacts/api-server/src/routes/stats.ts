import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, savedDomainsTable, type SavedDomainRow } from "@workspace/db";

const router: IRouter = Router();

const CATEGORIES = [
  "ai",
  "quantum",
  "biotech",
  "green_energy",
  "space_tech",
] as const;
const STRATEGIES = [
  "brandable_cvcv",
  "future_suffix",
  "dictionary_hack",
  "transliteration",
  "four_letter",
] as const;

function rowToSaved(row: SavedDomainRow) {
  return {
    id: row.id,
    name: row.name,
    tld: row.tld,
    fqdn: row.fqdn,
    category: row.category,
    strategy: row.strategy,
    valueScore: Number(row.valueScore),
    listPrice: row.listPrice == null ? null : Number(row.listPrice),
    notes: row.notes,
    savedAt:
      row.savedAt instanceof Date
        ? row.savedAt.toISOString()
        : new Date(row.savedAt).toISOString(),
  };
}

router.get("/stats", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(savedDomainsTable)
    .orderBy(desc(savedDomainsTable.valueScore));

  const total = rows.length;
  const scores = rows.map((r) => Number(r.valueScore));
  const avg =
    scores.length === 0
      ? 0
      : Math.round(
          (scores.reduce((a, b) => a + b, 0) / scores.length) * 10,
        ) / 10;
  const top = scores.length === 0 ? 0 : Math.max(...scores);
  const availableCount = rows.filter(
    (r) => r.listPrice != null && Number(r.listPrice) > 0,
  ).length;

  const byCategory = CATEGORIES.map((c) => {
    const subset = rows.filter((r) => r.category === c);
    const subScores = subset.map((r) => Number(r.valueScore));
    return {
      category: c,
      count: subset.length,
      avgScore:
        subScores.length === 0
          ? 0
          : Math.round(
              (subScores.reduce((a, b) => a + b, 0) / subScores.length) * 10,
            ) / 10,
    };
  });

  const byStrategy = STRATEGIES.map((s) => {
    const subset = rows.filter((r) => r.strategy === s);
    const subScores = subset.map((r) => Number(r.valueScore));
    return {
      strategy: s,
      count: subset.length,
      avgScore:
        subScores.length === 0
          ? 0
          : Math.round(
              (subScores.reduce((a, b) => a + b, 0) / subScores.length) * 10,
            ) / 10,
    };
  });

  const topPicks = rows.slice(0, 5).map(rowToSaved);

  res.json({
    totalSaved: total,
    avgScore: avg,
    topScore: top,
    availableCount,
    byCategory,
    byStrategy,
    topPicks,
  });
});

export default router;
