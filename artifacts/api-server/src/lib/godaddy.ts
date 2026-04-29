import { logger } from "./logger";
import { dnsAvailability, dnsAvailabilityBatch } from "./availability";

const GODADDY_BASE = "https://api.godaddy.com/v1/domains/available";

export interface AvailabilityResult {
  fqdn: string;
  available: boolean | null;
  listPrice: number | null;
  currency: string | null;
  period: number | null;
  source: string;
  message: string | null;
  evidence: string | null;
}

function parseGoDaddyKey(): { key: string; secret: string } | null {
  const raw = process.env.GODADDY_API_KEY;
  if (!raw) return null;
  if (raw.includes(":")) {
    const [key, secret] = raw.split(":");
    if (key && secret) return { key, secret };
  }
  return null;
}

async function tryGoDaddyPrice(
  fqdn: string,
  creds: { key: string; secret: string },
): Promise<{ price: number | null; currency: string | null; period: number | null } | null> {
  const url = `${GODADDY_BASE}?domain=${encodeURIComponent(fqdn)}&checkType=FAST&forTransfer=false`;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `sso-key ${creds.key}:${creds.secret}`,
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) {
      const txt = await response.text();
      logger.debug(
        { fqdn, status: response.status, body: txt.slice(0, 120) },
        "GoDaddy price lookup non-OK",
      );
      return null;
    }
    const json = (await response.json()) as {
      available?: boolean;
      price?: number;
      currency?: string;
      period?: number;
    };
    return {
      price: typeof json.price === "number" ? json.price / 1_000_000 : null,
      currency: json.currency ?? null,
      period: json.period ?? null,
    };
  } catch (err) {
    logger.debug({ fqdn, err }, "GoDaddy price lookup failed");
    return null;
  }
}

export async function checkAvailability(fqdn: string): Promise<AvailabilityResult> {
  const dns = await dnsAvailability(fqdn);
  const creds = parseGoDaddyKey();
  let price: { price: number | null; currency: string | null; period: number | null } | null =
    null;
  if (creds && dns.signal !== "registered") {
    price = await tryGoDaddyPrice(fqdn, creds);
  }

  if (dns.signal === "available") {
    return {
      fqdn,
      available: true,
      listPrice: price?.price ?? null,
      currency: price?.currency ?? null,
      period: price?.period ?? null,
      source: "dns_ns_lookup",
      message: null,
      evidence: dns.evidence,
    };
  }
  if (dns.signal === "registered") {
    return {
      fqdn,
      available: false,
      listPrice: null,
      currency: null,
      period: null,
      source: "dns_ns_lookup",
      message: "Domain is registered (DNS records found)",
      evidence: dns.evidence,
    };
  }
  return {
    fqdn,
    available: null,
    listPrice: price?.price ?? null,
    currency: price?.currency ?? null,
    period: price?.period ?? null,
    source: "dns_ns_lookup",
    message: "Inconclusive — try again",
    evidence: dns.evidence,
  };
}

export async function checkAvailabilityBatch(
  fqdns: string[],
  concurrency = 12,
): Promise<AvailabilityResult[]> {
  const dnsResults = await dnsAvailabilityBatch(fqdns, concurrency);
  return dnsResults.map((dns) => {
    if (dns.signal === "available") {
      return {
        fqdn: dns.fqdn,
        available: true,
        listPrice: null,
        currency: null,
        period: null,
        source: "dns_ns_lookup",
        message: null,
        evidence: dns.evidence,
      };
    }
    if (dns.signal === "registered") {
      return {
        fqdn: dns.fqdn,
        available: false,
        listPrice: null,
        currency: null,
        period: null,
        source: "dns_ns_lookup",
        message: "Domain is registered (DNS records found)",
        evidence: dns.evidence,
      };
    }
    return {
      fqdn: dns.fqdn,
      available: null,
      listPrice: null,
      currency: null,
      period: null,
      source: "dns_ns_lookup",
      message: "Inconclusive",
      evidence: dns.evidence,
    };
  });
}
