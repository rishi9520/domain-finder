import { promises as dnsPromises } from "dns";
import { logger } from "./logger";

export type AvailabilitySignal = "available" | "registered" | "unknown";

export interface DnsCheckResult {
  fqdn: string;
  signal: AvailabilitySignal;
  evidence: string;
  checkedAt: string;
}

const DNS_TIMEOUT_MS = 4000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("dns_timeout")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

export async function dnsAvailability(fqdn: string): Promise<DnsCheckResult> {
  const checkedAt = new Date().toISOString();

  try {
    const ns = await withTimeout(dnsPromises.resolveNs(fqdn), DNS_TIMEOUT_MS);
    if (Array.isArray(ns) && ns.length > 0) {
      return {
        fqdn,
        signal: "registered",
        evidence: `NS: ${ns.slice(0, 2).join(", ")}`,
        checkedAt,
      };
    }
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code ?? "";
    if (code === "ENOTFOUND") {
      return {
        fqdn,
        signal: "available",
        evidence: "NXDOMAIN (no NS, no SOA)",
        checkedAt,
      };
    }
    if (code === "ENODATA") {
      try {
        const soa = await withTimeout(
          dnsPromises.resolveSoa(fqdn),
          DNS_TIMEOUT_MS,
        );
        if (soa && soa.nsname) {
          return {
            fqdn,
            signal: "registered",
            evidence: `SOA: ${soa.nsname}`,
            checkedAt,
          };
        }
      } catch (err2: unknown) {
        const c2 = (err2 as NodeJS.ErrnoException)?.code ?? "";
        if (c2 === "ENOTFOUND" || c2 === "ENODATA") {
          return {
            fqdn,
            signal: "available",
            evidence: "no NS, no SOA",
            checkedAt,
          };
        }
      }
      return { fqdn, signal: "unknown", evidence: "ENODATA", checkedAt };
    }
    if (code === "ETIMEOUT" || code === "ESERVFAIL") {
      return { fqdn, signal: "unknown", evidence: code, checkedAt };
    }
    logger.debug({ fqdn, err }, "dns lookup error");
  }

  try {
    const a = await withTimeout(dnsPromises.resolve4(fqdn), DNS_TIMEOUT_MS);
    if (Array.isArray(a) && a.length > 0) {
      return {
        fqdn,
        signal: "registered",
        evidence: `A: ${a[0]}`,
        checkedAt,
      };
    }
  } catch {
    // fall through
  }

  return { fqdn, signal: "unknown", evidence: "no records", checkedAt };
}

export async function dnsAvailabilityBatch(
  fqdns: string[],
  concurrency = 12,
): Promise<DnsCheckResult[]> {
  const out: DnsCheckResult[] = new Array(fqdns.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= fqdns.length) return;
      const fqdn = fqdns[idx]!;
      out[idx] = await dnsAvailability(fqdn);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, fqdns.length) }, () => worker()),
  );
  return out;
}
