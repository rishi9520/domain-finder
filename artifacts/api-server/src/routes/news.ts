import { Router, type IRouter } from "express";
import {
  newsIngest,
  getRecentEvents,
  getTopTrendSignals,
} from "../lib/news/ingest";

const router: IRouter = Router();

router.get("/news/status", (_req, res): void => {
  res.json(newsIngest.getState());
});

router.post("/news/ingest", async (_req, res): Promise<void> => {
  const result = await newsIngest.runOnce();
  res.json(result);
});

router.get("/news/events", async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query.limit ?? 20), 100);
  const rows = await getRecentEvents(limit);
  res.json(
    rows.map((r) => ({
      id: r.id,
      source: r.source,
      title: r.title,
      url: r.url,
      categories: r.categories,
      keywords: r.keywords,
      impactScore: Number(r.impactScore),
      publishedAt:
        r.publishedAt instanceof Date
          ? r.publishedAt.toISOString()
          : new Date(r.publishedAt).toISOString(),
      ingestedAt:
        r.ingestedAt instanceof Date
          ? r.ingestedAt.toISOString()
          : new Date(r.ingestedAt).toISOString(),
    })),
  );
});

router.get("/news/trends", async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query.limit ?? 30), 100);
  const rows = await getTopTrendSignals(limit);
  res.json(
    rows.map((r) => ({
      keyword: r.keyword,
      category: r.category,
      count24h: r.count24h,
      count7d: r.count7d,
      weight: Number(r.weight),
      lastSeenAt:
        r.lastSeenAt instanceof Date
          ? r.lastSeenAt.toISOString()
          : new Date(r.lastSeenAt).toISOString(),
    })),
  );
});

export default router;
