import { db, legalDecisionsTable } from "@workspace/db";
import { logger } from "../logger";
import { checkTrademarkRisk } from "../trademark";

export interface LegalGateInput {
  fqdn: string;
  name: string;
}

export type LegalVerdict = "allow" | "block" | "review";

export interface LegalGateResult {
  verdict: LegalVerdict;
  risk: "low" | "medium" | "high";
  matches: string[];
  rationale: string;
}

/**
 * Strict legal gate enforced before persistence (auto + manual).
 * Builds on existing trademark heuristic and converts risk -> verdict.
 *
 *   risk=high   -> block (never persist)
 *   risk=medium -> review (persist only if explicitly opted in upstream; default block)
 *   risk=low    -> allow
 */
export function evaluateLegalGate(input: LegalGateInput): LegalGateResult {
  const tm = checkTrademarkRisk(input.name);
  let verdict: LegalVerdict;
  if (tm.risk === "high") verdict = "block";
  else if (tm.risk === "medium") verdict = "review";
  else verdict = "allow";
  return {
    verdict,
    risk: tm.risk,
    matches: tm.matches,
    rationale: tm.rationale,
  };
}

/**
 * Persist legal decision (best-effort, never throws to caller).
 */
export async function recordLegalDecision(
  fqdn: string,
  result: LegalGateResult,
): Promise<void> {
  try {
    await db.insert(legalDecisionsTable).values({
      fqdn,
      verdict: result.verdict,
      risk: result.risk,
      matches: result.matches,
      rationale: result.rationale,
    });
  } catch (err) {
    logger.debug({ err, fqdn }, "Failed to record legal decision");
  }
}

/**
 * Convenience: filter a list of candidates, returning only those that pass
 * the gate. Records a decision row for every blocked/review item.
 */
export async function filterLegallyAllowed<T extends { fqdn: string; name: string }>(
  candidates: T[],
  opts: { allowReview?: boolean } = {},
): Promise<{ allowed: T[]; blocked: T[]; reviewed: T[] }> {
  const allowed: T[] = [];
  const blocked: T[] = [];
  const reviewed: T[] = [];
  const decisions: Promise<void>[] = [];
  for (const c of candidates) {
    const r = evaluateLegalGate({ fqdn: c.fqdn, name: c.name });
    if (r.verdict === "allow") {
      allowed.push(c);
    } else if (r.verdict === "review") {
      reviewed.push(c);
      if (opts.allowReview) allowed.push(c);
      decisions.push(recordLegalDecision(c.fqdn, r));
    } else {
      blocked.push(c);
      decisions.push(recordLegalDecision(c.fqdn, r));
    }
  }
  // Fire-and-forget audit writes.
  void Promise.allSettled(decisions);
  return { allowed, blocked, reviewed };
}
