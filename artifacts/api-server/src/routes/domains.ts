import { Router, type IRouter } from "express";
import {
  GetDomainAvailabilityParams,
  GetSocialHandlesParams,
  GetTrademarkRiskParams,
  GetDomainDetailsParams,
} from "@workspace/api-zod";
import { checkAvailability } from "../lib/godaddy";
import { checkSocialHandles } from "../lib/social";
import { checkTrademarkRisk } from "../lib/trademark";
import { scoreCandidate } from "../lib/scoring";
import { generateTrendsForCategory, buildRationale } from "../lib/groq";

const router: IRouter = Router();

function splitFqdn(fqdn: string): { name: string; tld: string } {
  const parts = fqdn.toLowerCase().split(".");
  if (parts.length < 2) return { name: parts[0] ?? fqdn, tld: "com" };
  const tld = parts.pop()!;
  return { name: parts.join("."), tld };
}

router.get("/domains/:name/availability", async (req, res): Promise<void> => {
  const params = GetDomainAvailabilityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const fqdn = params.data.name.includes(".")
    ? params.data.name
    : `${params.data.name}.com`;
  const result = await checkAvailability(fqdn);
  res.json(result);
});

router.get("/domains/:name/social", async (req, res): Promise<void> => {
  const params = GetSocialHandlesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { name } = splitFqdn(params.data.name);
  const handles = await checkSocialHandles(name);
  res.json({ name, handles });
});

router.get("/domains/:name/trademark", async (req, res): Promise<void> => {
  const params = GetTrademarkRiskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { name } = splitFqdn(params.data.name);
  const result = checkTrademarkRisk(name);
  res.json(result);
});

router.get("/domains/:name/details", async (req, res): Promise<void> => {
  const params = GetDomainDetailsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { name, tld } = splitFqdn(params.data.name);
  const fqdn = `${name}.${tld}`;

  const [availability, handles, trademark, trends] = await Promise.all([
    checkAvailability(fqdn),
    checkSocialHandles(name),
    Promise.resolve(checkTrademarkRisk(name)),
    generateTrendsForCategory("ai"),
  ]);

  const trendKeywords = trends.keywords.map((k) => k.keyword);
  const score = scoreCandidate({ name, tld, trendKeywords });
  const candidate = {
    name,
    tld,
    fqdn,
    category: "ai" as const,
    strategy: "brandable_cvcv" as const,
    pattern: score.pattern,
    length: name.length,
    vowelConsonantBalance: score.vowelConsonantBalance,
    memorabilityScore: score.memorability,
    radioTest: score.radioTest,
    valueScore: score.valueScore,
    scoreBreakdown: score.breakdown,
    available: availability.available,
    listPrice: availability.listPrice,
    currency: availability.currency,
    rationale: buildRationale({
      name,
      tld,
      category: "ai",
      strategy: "brandable_cvcv",
      pattern: score.pattern,
      valueScore: score.valueScore,
    }),
  };

  res.json({
    candidate,
    availability,
    social: { name, handles },
    trademark,
  });
});

export default router;
