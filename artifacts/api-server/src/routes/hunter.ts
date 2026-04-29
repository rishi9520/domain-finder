import { Router, type IRouter, type Request, type Response } from "express";
import { desc, sql, and, gte, eq } from "drizzle-orm";
import { db, discoveriesTable, type DiscoveryRow } from "@workspace/db";
import { hunter } from "../lib/hunter";

const router: IRouter = Router();

function rowToDiscovery(r: DiscoveryRow) {
  return {
    id: r.id,
    fqdn: r.fqdn,
    name: r.name,
    tld: r.tld,
    category: r.category,
    strategy: r.strategy,
    pattern: r.pattern,
    length: r.length,
    valueScore: Number(r.valueScore),
    memorability: r.memorability,
    radioTest: r.radioTest === 1,
    rationale: r.rationale,
    dnsEvidence: r.dnsEvidence,
    discoveredAt:
      r.discoveredAt instanceof Date
        ? r.discoveredAt.toISOString()
        : new Date(r.discoveredAt).toISOString(),
  };
}

router.get("/hunter/status", (_req, res): void => {
  res.json(hunter.getState());
});

router.post("/hunter/start", (req, res): void => {
  const minValueScore =
    typeof req.body?.minValueScore === "number"
      ? req.body.minValueScore
      : undefined;
  hunter.start({ minValueScore });
  res.json(hunter.getState());
});

router.post("/hunter/stop", (_req, res): void => {
  hunter.stop();
  res.json(hunter.getState());
});

router.post("/hunter/reset", (_req, res): void => {
  hunter.reset();
  res.json(hunter.getState());
});

router.get("/hunter/insights", (_req, res): void => {
  res.json(hunter.getInsights());
});

router.get("/hunter/stream", (req: Request, res: Response): void => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  const sinceId = Number(req.query.sinceId ?? 0);
  const initial = hunter.getRecentEvents(sinceId);
  for (const ev of initial) {
    res.write(`id: ${ev.id}\n`);
    res.write(`event: ${ev.kind}\n`);
    res.write(`data: ${JSON.stringify(ev)}\n\n`);
  }
  res.write(
    `event: state\ndata: ${JSON.stringify(hunter.getState())}\n\n`,
  );

  const onEvent = (ev: {
    id: number;
    ts: string;
    kind: string;
    message: string;
    data?: Record<string, unknown>;
  }) => {
    res.write(`id: ${ev.id}\n`);
    res.write(`event: ${ev.kind}\n`);
    res.write(`data: ${JSON.stringify(ev)}\n\n`);
    res.write(
      `event: state\ndata: ${JSON.stringify(hunter.getState())}\n\n`,
    );
  };
  hunter.on("event", onEvent);

  const heartbeat = setInterval(() => {
    res.write(`: ping ${Date.now()}\n\n`);
  }, 15000);

  req.on("close", () => {
    clearInterval(heartbeat);
    hunter.off("event", onEvent);
    res.end();
  });
});

router.get("/discoveries", async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query.limit ?? 100), 500);
  const minScore = Number(req.query.minScore ?? 0);
  const category =
    typeof req.query.category === "string" ? req.query.category : null;

  const conds = [gte(discoveriesTable.valueScore, String(minScore))];
  if (category) conds.push(eq(discoveriesTable.category, category));

  const rows = await db
    .select()
    .from(discoveriesTable)
    .where(conds.length === 1 ? conds[0] : and(...conds))
    .orderBy(desc(discoveriesTable.valueScore), desc(discoveriesTable.discoveredAt))
    .limit(limit);

  const totalRow = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(discoveriesTable);
  const total = totalRow[0]?.c ?? 0;

  res.json({
    total,
    items: rows.map(rowToDiscovery),
  });
});

export default router;
