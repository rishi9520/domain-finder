import { BaseWorker, type RunResult } from "./base-worker";

/**
 * Worker 3 — Social Snatcher (Instagram / X OG handles).
 *
 * ⚠️ COMPLIANCE WARNING — READ BEFORE WIRING UP REAL LOGIC ⚠️
 *
 * Automated *registration* of handles on IG / X via unofficial endpoints is
 * a direct ToS violation. Detection leads to permanent account + device +
 * phone-number bans, and the captured handle is voided.
 *
 * This worker is therefore restricted to the COMPLIANT half of the workflow:
 *   - Watch a curated list of 3-4 char handles for availability state changes
 *     (using only public, unauthenticated profile lookups, with conservative
 *      rate limits).
 *   - When a handle drops, emit an OPPORTUNITY with a manual-claim deep link.
 *
 * The bot must NOT automate the actual registration. The human acts on the
 * alert from their own logged-in browser within seconds.
 */
export class SocialSnatcherWorker extends BaseWorker {
  constructor() {
    super({
      id: "social_snatcher",
      displayName: "Social Snatcher (IG/X)",
      category: "social",
      riskLevel: "high",
      legalStatus: "tos_grey",
      description:
        "Monitors 3-4 char IG/X handles for availability drops and emits manual-claim alerts.",
      intervalMs: 90 * 1000,
      implemented: false,
    });
  }

  protected async runOnce(): Promise<RunResult> {
    throw new Error("SocialSnatcherWorker.runOnce not implemented");
  }
}
