import { Router, type IRouter } from "express";
import { GenerateTrendsBody } from "@workspace/api-zod";
import { generateTrendsForCategory } from "../lib/groq";

const router: IRouter = Router();

router.post("/trends", async (req, res): Promise<void> => {
  const parsed = GenerateTrendsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { category } = parsed.data;
  req.log.info({ category }, "Generating trends");
  const bundle = await generateTrendsForCategory(category);
  res.json({
    category,
    generatedAt: new Date().toISOString(),
    keywords: bundle.keywords,
    suffixes: bundle.suffixes,
    prefixes: bundle.prefixes,
  });
});

export default router;
