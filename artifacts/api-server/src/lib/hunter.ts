import { EventEmitter } from "events";
import { sql } from "drizzle-orm";
import { db, discoveriesTable, dnsCacheTable } from "@workspace/db";
import { generate } from "./generators";
import { scoreCandidate } from "./scoring";
import { generateTrendsForCategory, buildRationale } from "./groq";
import { dnsAvailability, type DnsCheckResult } from "./availability";
import { logger } from "./logger";

const CATEGORIES = [
  "ai",
  "quantum",
  "biotech",
  "green_energy",
  "space_tech",
] as const;

const STRATEGIES = [
  "brandable_cvcv",
  "future_suffix",
  "dictionary_hack",
  "transliteration",
  "four_letter",
] as const;

type Category = (typeof CATEGORIES)[number];
type Strategy = (typeof STRATEGIES)[number];

export interface HunterEvent {
  id: number;
  ts: string;
  kind:
    | "phase"
    | "generated"
    | "scored"
    | "checking"
    | "registered"
    | "discovery"
    | "skipped"
    | "info"
    | "error";
  message: string;
  data?: Record<string, unknown>;
}

export interface HunterState {
  running: boolean;
  startedAt: string | null;
  cycle: number;
  totalGenerated: number;
  totalChecked: number;
  totalRegistered: number;
  totalDiscoveries: number;
  totalUnknown: number;
  currentCategory: Category | null;
  currentStrategy: Strategy | null;
  minValueScore: number;
}

const RING_SIZE = 200;

class Hunter extends EventEmitter {
  private state: HunterState = {
    running: false,
    startedAt: null,
    cycle: 0,
    totalGenerated: 0,
    totalChecked: 0,
    totalRegistered: 0,
    totalDiscoveries: 0,
    totalUnknown: 0,
    currentCategory: null,
    currentStrategy: null,
    minValueScore: 70,
  };
  private stopRequested = false;
  private trendCache = new Map<
    Category,
    { keywords: string[]; expiresAt: number }
  >();
  private nextEventId = 1;
  private ring: HunterEvent[] = [];

  private emitEvent(ev: Omit<HunterEvent, "id" | "ts">) {
    const full: HunterEvent = {
      id: this.nextEventId++,
      ts: new Date().toISOString(),
      ...ev,
    };
    this.ring.push(full);
    if (this.ring.length > RING_SIZE) this.ring.shift();
    this.emit("event", full);
  }

  getRecentEvents(sinceId = 0): HunterEvent[] {
    return this.ring.filter((e) => e.id > sinceId);
  }

  getState(): HunterState {
    return { ...this.state };
  }

  setMinScore(score: number) {
    this.state.minValueScore = Math.max(0, Math.min(100, score));
  }

  start(opts?: { minValueScore?: number }) {
    if (this.state.running) return;
    if (typeof opts?.minValueScore === "number") {
      this.setMinScore(opts.minValueScore);
    }
    this.state.running = true;
    this.state.startedAt = new Date().toISOString();
    this.stopRequested = false;
    this.emitEvent({
      kind: "info",
      message: `Hunter started — min score ${this.state.minValueScore}`,
    });
    void this.loop();
  }

  stop() {
    if (!this.state.running) return;
    this.stopRequested = true;
    this.emitEvent({ kind: "info", message: "Hunter stop requested" });
  }

  private async getTrends(category: Category): Promise<string[]> {
    const cached = this.trendCache.get(category);
    if (cached && cached.expiresAt > Date.now()) return cached.keywords;
    const bundle = await generateTrendsForCategory(category);
    const keywords = bundle.keywords.map((k) => k.keyword);
    this.trendCache.set(category, {
      keywords,
      expiresAt: Date.now() + 30 * 60 * 1000,
    });
    return keywords;
  }

  private async cachedDns(fqdn: string): Promise<DnsCheckResult> {
    const rows = await db
      .select()
      .from(dnsCacheTable)
      .where(sql`${dnsCacheTable.fqdn} = ${fqdn}`);
    const cached = rows[0];
    if (cached) {
      const ageMs = Date.now() - new Date(cached.checkedAt).getTime();
      if (ageMs < 6 * 60 * 60 * 1000) {
        return {
          fqdn,
          signal: cached.signal as DnsCheckResult["signal"],
          evidence: `cache: ${cached.evidence}`,
          checkedAt: new Date(cached.checkedAt).toISOString(),
        };
      }
    }
    const fresh = await dnsAvailability(fqdn);
    await db
      .insert(dnsCacheTable)
      .values({
        fqdn,
        signal: fresh.signal,
        evidence: fresh.evidence,
        checkedAt: new Date(fresh.checkedAt),
      })
      .onConflictDoUpdate({
        target: dnsCacheTable.fqdn,
        set: {
          signal: fresh.signal,
          evidence: fresh.evidence,
          checkedAt: new Date(fresh.checkedAt),
        },
      });
    return fresh;
  }

  private async runCycle() {
    this.state.cycle++;
    const categoryIdx = this.state.cycle % CATEGORIES.length;
    const strategyIdx =
      Math.floor(this.state.cycle / CATEGORIES.length) % STRATEGIES.length;
    const category = CATEGORIES[categoryIdx]!;
    const strategy = STRATEGIES[strategyIdx]!;
    this.state.currentCategory = category;
    this.state.currentStrategy = strategy;

    this.emitEvent({
      kind: "phase",
      message: `Cycle #${this.state.cycle}: hunting ${category} via ${strategy}`,
      data: { cycle: this.state.cycle, category, strategy },
    });

    const trends = await this.getTrends(category);
    this.emitEvent({
      kind: "info",
      message: `Trend keywords loaded: ${trends.slice(0, 4).join(", ")}…`,
      data: { trends: trends.slice(0, 6) },
    });

    const seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    const batchSize = 30;
    const names = generate(strategy, category, trends, batchSize, seed);
    this.state.totalGenerated += names.length;

    const scored = names.map((name) => {
      const s = scoreCandidate({ name, tld: "com", trendKeywords: trends });
      return { name, score: s };
    });
    scored.sort((a, b) => b.score.valueScore - a.score.valueScore);

    this.emitEvent({
      kind: "generated",
      message: `Generated ${names.length} candidates, top score ${scored[0]?.score.valueScore ?? 0}`,
      data: {
        sample: scored.slice(0, 5).map((s) => ({
          name: s.name,
          score: s.score.valueScore,
        })),
      },
    });

    const worthChecking = scored.filter(
      (s) => s.score.valueScore >= this.state.minValueScore,
    );
    if (worthChecking.length === 0) {
      this.emitEvent({
        kind: "info",
        message: `No candidates above ${this.state.minValueScore} score this cycle`,
      });
      return;
    }

    this.emitEvent({
      kind: "phase",
      message: `Checking DNS for ${worthChecking.length} high-value candidates`,
    });

    for (const { name, score } of worthChecking) {
      if (this.stopRequested) return;
      const fqdn = `${name}.com`;
      this.emitEvent({
        kind: "checking",
        message: `Probing ${fqdn} (score ${score.valueScore})`,
        data: { fqdn, score: score.valueScore },
      });
      const dns = await this.cachedDns(fqdn);
      this.state.totalChecked++;
      if (dns.signal === "registered") {
        this.state.totalRegistered++;
        this.emitEvent({
          kind: "registered",
          message: `${fqdn} already registered (${dns.evidence})`,
          data: { fqdn, evidence: dns.evidence },
        });
        continue;
      }
      if (dns.signal === "unknown") {
        this.state.totalUnknown++;
        this.emitEvent({
          kind: "skipped",
          message: `${fqdn} inconclusive — ${dns.evidence}`,
          data: { fqdn, evidence: dns.evidence },
        });
        continue;
      }

      const rationale = buildRationale({
        name,
        tld: "com",
        category,
        strategy,
        pattern: score.pattern,
        valueScore: score.valueScore,
      });

      try {
        const inserted = await db
          .insert(discoveriesTable)
          .values({
            fqdn,
            name,
            tld: "com",
            category,
            strategy,
            pattern: score.pattern,
            length: name.length,
            valueScore: String(score.valueScore),
            memorability: score.memorability,
            radioTest: score.radioTest ? 1 : 0,
            rationale,
            dnsEvidence: dns.evidence,
          })
          .onConflictDoNothing()
          .returning();
        if (inserted.length > 0) {
          this.state.totalDiscoveries++;
          this.emitEvent({
            kind: "discovery",
            message: `DIAMOND: ${fqdn} appears unregistered (score ${score.valueScore})`,
            data: {
              fqdn,
              category,
              strategy,
              valueScore: score.valueScore,
              pattern: score.pattern,
              evidence: dns.evidence,
              rationale,
            },
          });
        }
      } catch (err) {
        logger.error({ err, fqdn }, "Failed to insert discovery");
      }
    }
  }

  private async loop() {
    while (!this.stopRequested) {
      try {
        await this.runCycle();
      } catch (err) {
        logger.error({ err }, "Hunter cycle error");
        this.emitEvent({
          kind: "error",
          message: `Cycle error: ${(err as Error).message}`,
        });
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    this.state.running = false;
    this.state.startedAt = null;
    this.state.currentCategory = null;
    this.state.currentStrategy = null;
    this.emitEvent({ kind: "info", message: "Hunter stopped" });
  }
}

export const hunter = new Hunter();
