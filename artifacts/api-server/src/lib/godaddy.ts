import { logger } from "./logger";

const GODADDY_BASE = "https://api.godaddy.com/v1/domains/available";
const GODADDY_OTE_BASE = "https://api.ote-godaddy.com/v1/domains/available";

export interface AvailabilityResult {
  fqdn: string;
  available: boolean | null;
  listPrice: number | null;
  currency: string | null;
  period: number | null;
  source: string;
  message: string | null;
}

function parseGoDaddyKey(): { key: string; secret: string } | null {
  const raw = process.env.GODADDY_API_KEY;
  if (!raw) return null;
  if (raw.includes(":")) {
    const [key, secret] = raw.split(":");
    return { key: key ?? "", secret: secret ?? "" };
  }
  return { key: raw, secret: raw };
}

function heuristicAvailability(fqdn: string): AvailabilityResult {
  let h = 0;
  for (const c of fqdn) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const available = h % 5 !== 0;
  return {
    fqdn,
    available,
    listPrice: available ? Math.round(((h % 8000) + 999) * 100) / 100 : null,
    currency: available ? "USD" : null,
    period: 1,
    source: "heuristic",
    message: "GoDaddy unavailable, using heuristic fallback",
  };
}

async function tryGoDaddy(
  fqdn: string,
  base: string,
  creds: { key: string; secret: string },
): Promise<{ ok: true; data: AvailabilityResult } | { ok: false; status: number; body: string }> {
  const url = `${base}?domain=${encodeURIComponent(fqdn)}&checkType=FAST&forTransfer=false`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `sso-key ${creds.key}:${creds.secret}`,
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    const txt = await response.text();
    return { ok: false, status: response.status, body: txt.slice(0, 200) };
  }
  const json = (await response.json()) as {
    available?: boolean;
    price?: number;
    currency?: string;
    period?: number;
  };
  const price = typeof json.price === "number" ? json.price / 1_000_000 : null;
  return {
    ok: true,
    data: {
      fqdn,
      available: json.available ?? null,
      listPrice: price,
      currency: json.currency ?? "USD",
      period: json.period ?? 1,
      source: base.includes("ote-") ? "godaddy_ote" : "godaddy",
      message: null,
    },
  };
}

export async function checkAvailability(fqdn: string): Promise<AvailabilityResult> {
  const creds = parseGoDaddyKey();
  if (!creds) {
    return heuristicAvailability(fqdn);
  }

  try {
    const prod = await tryGoDaddy(fqdn, GODADDY_BASE, creds);
    if (prod.ok) return prod.data;
    if (prod.status === 401 || prod.status === 403) {
      const ote = await tryGoDaddy(fqdn, GODADDY_OTE_BASE, creds);
      if (ote.ok) return ote.data;
      logger.warn(
        { fqdn, status: ote.status, body: ote.body },
        "GoDaddy OTE rejected key, falling back to heuristic",
      );
      return heuristicAvailability(fqdn);
    }
    if (prod.status === 429) {
      return {
        fqdn,
        available: null,
        listPrice: null,
        currency: null,
        period: null,
        source: "godaddy",
        message: "Rate limited",
      };
    }
    logger.warn(
      { fqdn, status: prod.status, body: prod.body },
      "GoDaddy non-OK response, falling back to heuristic",
    );
    return heuristicAvailability(fqdn);
  } catch (err) {
    logger.warn({ fqdn, err }, "GoDaddy request failed");
    return heuristicAvailability(fqdn);
  }
}

export async function checkAvailabilityBatch(
  fqdns: string[],
  concurrency = 8,
): Promise<AvailabilityResult[]> {
  const results: AvailabilityResult[] = new Array(fqdns.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= fqdns.length) return;
      const fqdn = fqdns[idx]!;
      results[idx] = await checkAvailability(fqdn);
    }
  }
  const workers = Array.from(
    { length: Math.min(concurrency, fqdns.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}
