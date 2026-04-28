import { Router, type IRouter } from "express";
import { HuntDomainsBody } from "@workspace/api-zod";
import { generate } from "../lib/generators";
import { scoreCandidate } from "../lib/scoring";
import { generateTrendsForCategory } from "../lib/groq";
import { checkAvailabilityBatch } from "../lib/godaddy";
import { buildRationale } from "../lib/groq";

const router: IRouter = Router();

router.post("/hunt", async (req, res): Promise<void> => {
  const parsed = HuntDomainsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const started = Date.now();
  const { category, strategy } = parsed.data;
  const count = parsed.data.count ?? 30;
  const tld = parsed.data.tld ?? "com";
  const checkAvailability = parsed.data.checkAvailability ?? true;

  req.log.info({ category, strategy, count, tld, checkAvailability }, "Hunting");

  const trendBundle = await generateTrendsForCategory(category);
  const trendKeywords = trendBundle.keywords.map((k) => k.keyword);

  const seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
  const names = generate(strategy, category, trendKeywords, count, seed);

  const scored = names.map((name) => {
    const s = scoreCandidate({ name, tld, trendKeywords });
    const rationale = buildRationale({
      name,
      tld,
      category,
      strategy,
      pattern: s.pattern,
      valueScore: s.valueScore,
    });
    return {
      name,
      tld,
      fqdn: `${name}.${tld}`,
      category,
      strategy,
      pattern: s.pattern,
      length: name.length,
      vowelConsonantBalance: s.vowelConsonantBalance,
      memorabilityScore: s.memorability,
      radioTest: s.radioTest,
      valueScore: s.valueScore,
      scoreBreakdown: s.breakdown,
      available: null as boolean | null,
      listPrice: null as number | null,
      currency: null as string | null,
      rationale,
    };
  });

  scored.sort((a, b) => b.valueScore - a.valueScore);

  if (checkAvailability && scored.length > 0) {
    const fqdns = scored.map((c) => c.fqdn);
    const avail = await checkAvailabilityBatch(fqdns, 8);
    for (let i = 0; i < scored.length; i++) {
      const a = avail[i];
      if (!a) continue;
      const candidate = scored[i]!;
      candidate.available = a.available;
      candidate.listPrice = a.listPrice;
      candidate.currency = a.currency;
    }
  }

  scored.sort((a, b) => {
    const aRank = (a.available === true ? 1 : 0) * 10 + a.valueScore;
    const bRank = (b.available === true ? 1 : 0) * 10 + b.valueScore;
    return bRank - aRank;
  });

  res.json({
    category,
    strategy,
    generatedAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    candidates: scored,
  });
});

export default router;
