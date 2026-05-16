import { BaseWorker, type RunResult } from "./base-worker";

/**
 * Worker 9 — Satoshi Scanner (rare sat hunter).
 *
 * Pipeline (read-only — does not move any funds):
 *   1. Pull recent UTXOs from a configured xpub or watch-only wallet.
 *   2. For each UTXO, run an ordinal/rarity classifier (uncommon, rare,
 *      epic, legendary, mythic — by block height, halving, palindrome,
 *      vintage, etc.).
 *   3. Cross-reference Magic Eden / OrdinalsBot floor prices for that
 *      rarity bucket.
 *   4. Emit opportunity rows so the user can manually inscribe + list.
 */
export class SatoshiScannerWorker extends BaseWorker {
  constructor() {
    super({
      id: "satoshi_scanner",
      displayName: "Rare Satoshi Scanner",
      category: "crypto",
      riskLevel: "low",
      legalStatus: "clean",
      description:
        "Scans the user's watch-only BTC UTXOs for rare sats and prices them against current floors.",
      intervalMs: 60 * 60 * 1000,
      implemented: false,
    });
  }

  protected async runOnce(): Promise<RunResult> {
    throw new Error("SatoshiScannerWorker.runOnce not implemented");
  }
}
