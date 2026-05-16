import { BaseWorker, type RunResult } from "./base-worker";

/**
 * Worker 1 — Domain Sniper.
 * Wraps the existing 5-letter .com diamond hunter.
 * NOTE: Real logic lives in lib/hunter.ts; this worker is a registry adapter
 *       so the unified /api/workers UI can start/stop/observe it.
 */
export class DomainSniperWorker extends BaseWorker {
  constructor() {
    super({
      id: "domain_sniper",
      displayName: "Domain Sniper",
      category: "domains",
      riskLevel: "low",
      legalStatus: "clean",
      description:
        "5–7 letter brandable .com finder (AI/Quantum/Biotech/Green/Space) — RDAP-verified, news-driven.",
      intervalMs: 30 * 60 * 1000, // tick every 30 min just to refresh stats
      implemented: true,
    });
  }

  protected async runOnce(): Promise<RunResult> {
    // The diamond hunter already runs continuously via lib/hunter.ts.
    // This tick is only a periodic stats snapshot so the worker UI updates.
    return { opportunitiesFound: 0, stats: { delegatedTo: "lib/hunter.ts" } };
  }
}
