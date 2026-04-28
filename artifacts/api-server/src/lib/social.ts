import { logger } from "./logger";

export interface SocialResult {
  platform: "x" | "instagram" | "linkedin";
  handle: string;
  available: boolean | null;
  url: string;
}

async function probe(url: string): Promise<number | null> {
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; DomainHunter/1.0; +https://example.com)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(6000),
    });
    return response.status;
  } catch (err) {
    logger.debug({ url, err }, "Social probe failed");
    return null;
  }
}

export async function checkSocialHandles(name: string): Promise<SocialResult[]> {
  const handle = name.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 30);
  const probes: { platform: SocialResult["platform"]; url: string; uiUrl: string }[] = [
    {
      platform: "x",
      url: `https://x.com/${handle}`,
      uiUrl: `https://x.com/${handle}`,
    },
    {
      platform: "instagram",
      url: `https://www.instagram.com/${handle}/`,
      uiUrl: `https://www.instagram.com/${handle}/`,
    },
    {
      platform: "linkedin",
      url: `https://www.linkedin.com/in/${handle}`,
      uiUrl: `https://www.linkedin.com/in/${handle}`,
    },
  ];

  const results = await Promise.all(
    probes.map(async (p) => {
      const status = await probe(p.url);
      let available: boolean | null;
      if (status === null) {
        available = null;
      } else if (status === 404 || status === 410) {
        available = true;
      } else if (status === 200 || status === 301 || status === 302) {
        available = false;
      } else if (status === 999) {
        available = null;
      } else {
        available = status >= 400;
      }
      return {
        platform: p.platform,
        handle,
        available,
        url: p.uiUrl,
      };
    }),
  );

  return results;
}
