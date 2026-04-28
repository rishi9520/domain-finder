const KNOWN_BRANDS = [
  "google",
  "apple",
  "microsoft",
  "amazon",
  "meta",
  "facebook",
  "instagram",
  "tesla",
  "netflix",
  "openai",
  "anthropic",
  "nvidia",
  "intel",
  "ibm",
  "oracle",
  "salesforce",
  "uber",
  "airbnb",
  "spotify",
  "twitter",
  "snapchat",
  "tiktok",
  "linkedin",
  "youtube",
  "stripe",
  "shopify",
  "samsung",
  "sony",
  "adobe",
  "github",
  "gitlab",
  "atlassian",
  "slack",
  "zoom",
  "dropbox",
  "notion",
  "figma",
  "canva",
  "reddit",
  "pinterest",
  "twitch",
  "paypal",
  "venmo",
  "cashapp",
  "robinhood",
  "coinbase",
  "binance",
  "kraken",
  "ripple",
  "ethereum",
  "bitcoin",
  "solana",
  "polygon",
  "chainlink",
  "uniswap",
  "metamask",
  "deepmind",
  "cohere",
  "mistral",
  "perplexity",
  "huggingface",
  "midjourney",
  "stability",
  "runway",
  "groq",
  "cerebras",
  "graphcore",
  "rivian",
  "lucid",
  "byd",
  "ford",
  "toyota",
  "honda",
  "bmw",
  "mercedes",
  "audi",
  "porsche",
  "ferrari",
  "lamborghini",
  "rolex",
  "patek",
  "omega",
  "nike",
  "adidas",
  "puma",
  "reebok",
  "underarmour",
  "lululemon",
  "patagonia",
  "northface",
  "redbull",
  "monster",
  "pepsi",
  "coke",
  "cocacola",
  "mcdonalds",
  "burger",
  "starbucks",
  "dunkin",
  "subway",
  "chipotle",
  "domino",
  "pizzahut",
  "kfc",
  "wendys",
  "taco",
];

export interface TrademarkRiskResult {
  name: string;
  risk: "low" | "medium" | "high";
  matches: string[];
  rationale: string;
}

export function checkTrademarkRisk(name: string): TrademarkRiskResult {
  const lower = name.toLowerCase();
  const matches: string[] = [];

  for (const brand of KNOWN_BRANDS) {
    if (brand === lower) {
      matches.push(brand);
      return {
        name,
        risk: "high",
        matches,
        rationale: `Exact match with well-known brand "${brand}". Almost certainly trademarked.`,
      };
    }
    if (
      brand.length >= 4 &&
      (lower.startsWith(brand) || lower.endsWith(brand) || lower.includes(brand))
    ) {
      matches.push(brand);
    }
  }

  if (matches.length === 0) {
    return {
      name,
      risk: "low",
      matches: [],
      rationale: `No collision with the curated list of well-known brands. Always run a formal USPTO/WIPO search before purchase.`,
    };
  }

  if (matches.length === 1) {
    return {
      name,
      risk: "medium",
      matches,
      rationale: `Substring overlap with "${matches[0]}". Could draw a cease-and-desist depending on use category.`,
    };
  }

  return {
    name,
    risk: "high",
    matches,
    rationale: `Multiple substring overlaps with known brands. Reconsider this name.`,
  };
}
