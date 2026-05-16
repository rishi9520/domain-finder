import { Router, type IRouter } from "express";
import { db, opportunitiesTable, workerRunsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { workerRegistry } from "../lib/workers/registry";

const router: IRouter = Router();

router.get("/workers", async (_req, res): Promise<void> => {
  const all = workerRegistry.all();
  const rows = await Promise.all(
    all.map(async (w) => {
      const row = await w.getRow();
      return {
        id: w.def.id,
        displayName: w.def.displayName,
        category: w.def.category,
        riskLevel: w.def.riskLevel,
        legalStatus: w.def.legalStatus,
        description: w.def.description,
        implemented: w.def.implemented,
        intervalMs: w.def.intervalMs,
        running: w.isRunning(),
        totalRuns: row?.totalRuns ?? 0,
        totalOpportunities: row?.totalOpportunities ?? 0,
        lastStartedAt: row?.lastStartedAt?.toISOString() ?? null,
        lastStoppedAt: row?.lastStoppedAt?.toISOString() ?? null,
        lastError: row?.lastError ?? null,
      };
    }),
  );
  res.json(rows);
});

router.post("/workers/:id/start", async (req, res): Promise<void> => {
  const w = workerRegistry.get(req.params.id);
  if (!w) {
    res.status(404).json({ error: "worker not found" });
    return;
  }
  if (!w.def.implemented) {
    res.status(409).json({
      error: "worker_not_implemented",
      message: `${w.def.displayName} is a skeleton. runOnce() not implemented yet.`,
    });
    return;
  }
  await w.start();
  res.json({ ok: true, running: w.isRunning() });
});

router.post("/workers/:id/stop", async (req, res): Promise<void> => {
  const w = workerRegistry.get(req.params.id);
  if (!w) {
    res.status(404).json({ error: "worker not found" });
    return;
  }
  await w.stop();
  res.json({ ok: true, running: w.isRunning() });
});

router.get("/workers/:id/opportunities", async (req, res): Promise<void> => {
  const w = workerRegistry.get(req.params.id);
  if (!w) {
    res.status(404).json({ error: "worker not found" });
    return;
  }
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const rows = await db
    .select()
    .from(opportunitiesTable)
    .where(eq(opportunitiesTable.workerId, w.def.id))
    .orderBy(desc(opportunitiesTable.score))
    .limit(limit);
  res.json(
    rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      externalKey: r.externalKey,
      score: Number(r.score),
      confidence: Number(r.confidence),
      status: r.status,
      payload: r.payload,
      rationale: r.rationale,
      discoveredAt: r.discoveredAt.toISOString(),
      expiresAt: r.expiresAt?.toISOString() ?? null,
    })),
  );
});

router.get("/workers/:id/runs", async (req, res): Promise<void> => {
  const w = workerRegistry.get(req.params.id);
  if (!w) {
    res.status(404).json({ error: "worker not found" });
    return;
  }
  const limit = Math.min(Number(req.query.limit ?? 20), 100);
  const rows = await db
    .select()
    .from(workerRunsTable)
    .where(eq(workerRunsTable.workerId, w.def.id))
    .orderBy(desc(workerRunsTable.startedAt))
    .limit(limit);
  res.json(
    rows.map((r) => ({
      id: r.id,
      status: r.status,
      startedAt: r.startedAt.toISOString(),
      finishedAt: r.finishedAt?.toISOString() ?? null,
      opportunitiesFound: r.opportunitiesFound,
      stats: r.stats,
      error: r.error,
    })),
  );
});

export default router;
