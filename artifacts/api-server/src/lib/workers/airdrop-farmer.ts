import { BaseWorker, type RunResult } from "./base-worker";

/**
 * Worker 4 — Airdrop Farmer.
 *
 * ⚠️ SYBIL RISK — READ BEFORE WIRING UP REAL LOGIC ⚠️
 *
 * Running 50 wallets that mimic "organic" transactions on the same chain
 * is a textbook Sybil attack. Every major airdrop in 2024–25 (LayerZero,
 * zkSync, Linea, Scroll, EigenLayer, …) has used graph + funding-source
 * heuristics to nuke Sybil clusters. Outcome: $0 reward + permanently
 * flagged addresses + wasted gas in lakhs.
 *
 * This worker is therefore scoped to LEGITIMATE single-identity farming:
 *   - One primary wallet (the user's).
 *   - Curated list of pre-TGE protocols with public points/quest pages.
 *   - Suggests *which* quests / volume tiers maximise expected airdrop
 *     value per ₹ of gas + capital lock — the human executes manually.
 *
 * Do NOT add multi-wallet fund cycling, mixer routing, or scripted
 * transaction generation to this worker.
 */
export class AirdropFarmerWorker extends BaseWorker {
  constructor() {
    super({
      id: "airdrop_farmer",
      displayName: "Airdrop Farmer",
      category: "crypto",
      riskLevel: "very_high",
      legalStatus: "tos_grey",
      description:
        "Single-wallet airdrop quest optimiser — ranks pre-TGE protocols by expected value per ₹ spent.",
      intervalMs: 6 * 60 * 60 * 1000, // 6h
      implemented: false,
    });
  }

  protected async runOnce(): Promise<RunResult> {
    throw new Error("AirdropFarmerWorker.runOnce not implemented");
  }
}
