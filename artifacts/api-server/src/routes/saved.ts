import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, savedDomainsTable, type SavedDomainRow } from "@workspace/db";
import {
  SaveDomainBody,
  DeleteSavedDomainParams,
} from "@workspace/api-zod";
import { evaluateLegalGate, recordLegalDecision } from "../lib/legal/gate";

const router: IRouter = Router();

function rowToResponse(row: SavedDomainRow) {
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

router.get("/saved", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(savedDomainsTable)
    .orderBy(desc(savedDomainsTable.savedAt));
  res.json(rows.map(rowToResponse));
});

router.post("/saved", async (req, res): Promise<void> => {
  const parsed = SaveDomainBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { name, tld, category, strategy, valueScore, listPrice, notes } =
    parsed.data;
  const fqdn = `${name}.${tld}`;

  // Legal gate: block high-risk trademark conflicts even on manual save.
  const legal = evaluateLegalGate({ fqdn, name });
  if (legal.verdict === "block") {
    void recordLegalDecision(fqdn, legal);
    res.status(409).json({
      error: "Legal gate blocked save",
      risk: legal.risk,
      matches: legal.matches,
      rationale: legal.rationale,
    });
    return;
  }
  if (legal.verdict === "review") {
    void recordLegalDecision(fqdn, legal);
  }

  const [row] = await db
    .insert(savedDomainsTable)
    .values({
      name,
      tld,
      fqdn,
      category,
      strategy,
      valueScore: String(valueScore),
      listPrice: listPrice == null ? null : String(listPrice),
      notes: notes ?? null,
    })
    .returning();
  if (!row) {
    res.status(500).json({ error: "Failed to insert" });
    return;
  }
  res.status(201).json(rowToResponse(row));
});

router.delete("/saved/:id", async (req, res): Promise<void> => {
  const params = DeleteSavedDomainParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .delete(savedDomainsTable)
    .where(eq(savedDomainsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Saved domain not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
