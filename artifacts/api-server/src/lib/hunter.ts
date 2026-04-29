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

export interface PerBucketStats {
  generated: number;
  checked: number;
  diamonds: number;
}

export interface HunterState {
  running: boolean;
  startedAt: string | null;
  cycle: number;
  totalGenerated: number;
  totalScoreFiltered: number;
  totalChecked: number;
  totalRegistered: number;
  totalDiscoveries: number;
  totalUnknown: number;
  totalDuplicateSkips: number;
  currentCategory: Category | null;
  currentStrategy: Strategy | null;
  minValueScore: number;
  effectiveMinScore: number;
  starvationStreak: number;
  perStrategy: Record<string, PerBucketStats>;
  perCategory: Record<string, PerBucketStats>;
  recentNamesSize: number;
}

const RING_SIZE = 200;
const RECENT_NAMES_PER_BUCKET = 600;
const TREND_LOG_INTERVAL_MS = 5 * 60 * 1000;
const REPROBE_SUPPRESS_MS = 30 * 60 * 1000;

class Hunter extends EventEmitter {
  private state: HunterState = {
    running: false,
    startedAt: null,
    cycle: 0,
    totalGenerated: 0,
    totalScoreFiltered: 0,
    totalChecked: 0,
    totalRegistered: 0,
    totalDiscoveries: 0,
    totalUnknown: 0,
    totalDuplicateSkips: 0,
    currentCategory: null,
    currentStrategy: null,
    minValueScore: 55,
    effectiveMinScore: 55,
    starvationStreak: 0,
    perStrategy: {},
    perCategory: {},
    recentNamesSize: 0,
  };
  private stopRequested = false;
  private trendCache = new Map<
    Category,
    { keywords: string[]; expiresAt: number }
  >();
  private trendLastLoggedAt = new Map<Category, number>();
  private nextEventId = 1;
  private ring: HunterEvent[] = [];

  // Per (category|strategy) memory — names we've already generated, for variety.
  private recentNames = new Map<string, string[]>();
  // Names recently emitted as "registered" — suppress duplicate UI spam.
  private recentRegisteredEmits = new Map<string, number>();

  private bumpStat(
    bucket: "perStrategy" | "perCategory",
    key: string,
    field: keyof PerBucketStats,
    by = 1,
  ) {
    const map = this.state[bucket];
    const cur = map[key] ?? { generated: 0, checked: 0, diamonds: 0 };
    cur[field] += by;
    map[key] = cur;
  }

  private getRecent(key: string): string[] {
    return this.recentNames.get(key) ?? [];
  }

  private addRecent(key: string, names: string[]) {
    const cur = this.recentNames.get(key) ?? [];
    const merged = [...cur, ...names];
    if (merged.length > RECENT_NAMES_PER_BUCKET) {
      merged.splice(0, merged.length - RECENT_NAMES_PER_BUCKET);
    }
    this.recentNames.set(key, merged);
    let total = 0;
    for (const v of this.recentNames.values()) total += v.length;
    this.state.recentNamesSize = total;
  }

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

  getInsights() {
    const strategies = Object.entries(this.state.perStrategy)
      .map(([key, v]) => ({
        key,
        ...v,
        diamondYield: v.checked > 0 ? Math.round((v.diamonds / v.checked) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.diamonds - a.diamonds);
    const categories = Object.entries(this.state.perCategory)
      .map(([key, v]) => ({
        key,
        ...v,
        diamondYield: v.checked > 0 ? Math.round((v.diamonds / v.checked) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.diamonds - a.diamonds);
    return {
      perStrategy: strategies,
      perCategory: categories,
      recentNamesMemory: this.state.recentNamesSize,
      effectiveMinScore: this.state.effectiveMinScore,
      requestedMinScore: this.state.minValueScore,
      starvationStreak: this.state.starvationStreak,
    };
  }

  setMinScore(score: number) {
    const clamped = Math.max(0, Math.min(100, score));
    this.state.minValueScore = clamped;
    this.state.effectiveMinScore = clamped;
    this.state.starvationStreak = 0;
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
      message: `Hunter started — min score ${this.state.minValueScore}, recent-name memory ${this.state.recentNamesSize}`,
    });
    void this.loop();
  }

  stop() {
    if (!this.state.running) return;
    this.stopRequested = true;
    this.emitEvent({ kind: "info", message: "Hunter stop requested" });
  }

  reset() {
    this.recentNames.clear();
    this.recentRegisteredEmits.clear();
    this.trendLastLoggedAt.clear();
    this.state.recentNamesSize = 0;
    this.emitEvent({
      kind: "info",
      message: "Generator memory cleared — fresh exploration",
    });
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

  private async cachedDns(fqdn: string): Promise<DnsCheckResult & { fromCache: boolean }> {
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
          evidence: cached.evidence,
          checkedAt: new Date(cached.checkedAt).toISOString(),
          fromCache: true,
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
    return { ...fresh, fromCache: false };
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
    const bucketKey = `${category}|${strategy}`;

    this.emitEvent({
      kind: "phase",
      message: `Cycle #${this.state.cycle}: ${category} × ${strategy}`,
      data: { cycle: this.state.cycle, category, strategy },
    });

    const trends = await this.getTrends(category);

    // Emit trend keywords only first time per category, or every 5 minutes per category.
    const lastTrendLog = this.trendLastLoggedAt.get(category) ?? 0;
    if (Date.now() - lastTrendLog > TREND_LOG_INTERVAL_MS) {
      this.trendLastLoggedAt.set(category, Date.now());
      this.emitEvent({
        kind: "info",
        message: `[${category}] trend keywords refreshed: ${trends.slice(0, 5).join(", ")}`,
        data: { category, trends: trends.slice(0, 8) },
      });
    }

    const seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    const batchSize = 30;
    const exclude = new Set(this.getRecent(bucketKey));
    const requested = batchSize;
    const names = generate(strategy, category, trends, requested, seed, exclude);
    const dupesSkipped = Math.max(0, requested - names.length);
    if (dupesSkipped > 0) this.state.totalDuplicateSkips += dupesSkipped;
    this.addRecent(bucketKey, names);
    this.state.totalGenerated += names.length;
    this.bumpStat("perStrategy", strategy, "generated", names.length);
    this.bumpStat("perCategory", category, "generated", names.length);

    if (names.length === 0) {
      this.emitEvent({
        kind: "info",
        message: `[${bucketKey}] generator exhausted — name pool saturated, will retry after rotation`,
      });
      return;
    }

    const scored = names.map((name) => {
      const s = scoreCandidate({ name, tld: "com", trendKeywords: trends });
      return { name, score: s };
    });
    scored.sort((a, b) => b.score.valueScore - a.score.valueScore);
    const topScores = scored.slice(0, 5).map((s) => `${s.name}=${s.score.valueScore}`);
    const bottomScores = scored
      .slice(-3)
      .map((s) => `${s.name}=${s.score.valueScore}`);

    const worthChecking = scored.filter(
      (s) => s.score.valueScore >= this.state.effectiveMinScore,
    );
    const filteredCount = scored.length - worthChecking.length;
    this.state.totalScoreFiltered += filteredCount;

    this.emitEvent({
      kind: "generated",
      message: `Generated ${names.length} fresh${dupesSkipped ? ` (skipped ${dupesSkipped} dupes)` : ""}, ${worthChecking.length} pass score≥${this.state.effectiveMinScore} | top: ${topScores.slice(0, 3).join(", ")}`,
      data: {
        cycle: this.state.cycle,
        category,
        strategy,
        generated: names.length,
        passed: worthChecking.length,
        filtered: filteredCount,
        dupesSkipped,
        topPassed: scored
          .filter((s) => s.score.valueScore >= this.state.effectiveMinScore)
          .slice(0, 5)
          .map((s) => ({ name: s.name, score: s.score.valueScore })),
        topRejected: scored
          .filter((s) => s.score.valueScore < this.state.effectiveMinScore)
          .slice(0, 5)
          .map((s) => ({ name: s.name, score: s.score.valueScore })),
        bottom: bottomScores,
      },
    });

    if (worthChecking.length === 0) {
      this.state.starvationStreak++;
      // Auto-relax: if 8 cycles in a row produce nothing, lower the bar by 5.
      if (this.state.starvationStreak >= 8 && this.state.effectiveMinScore > 35) {
        const newScore = Math.max(35, this.state.effectiveMinScore - 5);
        this.state.effectiveMinScore = newScore;
        this.state.starvationStreak = 0;
        this.emitEvent({
          kind: "info",
          message: `Auto-relaxed score gate to ≥${newScore} (8 cycles starved). Slide minScore manually anytime.`,
        });
      }
      return;
    } else {
      this.state.starvationStreak = 0;
    }

    for (const { name, score } of worthChecking) {
      if (this.stopRequested) return;
      const fqdn = `${name}.com`;
      const dns = await this.cachedDns(fqdn);
      this.state.totalChecked++;
      this.bumpStat("perStrategy", strategy, "checked");
      this.bumpStat("perCategory", category, "checked");

      if (dns.signal === "registered") {
        this.state.totalRegistered++;
        // Suppress duplicate "registered" UI spam for the same name within 30 minutes.
        const lastEmit = this.recentRegisteredEmits.get(fqdn) ?? 0;
        if (Date.now() - lastEmit > REPROBE_SUPPRESS_MS) {
          this.recentRegisteredEmits.set(fqdn, Date.now());
          this.emitEvent({
            kind: "registered",
            message: `${fqdn} taken — ${dns.evidence}${dns.fromCache ? " (cached)" : ""}`,
            data: { fqdn, evidence: dns.evidence, score: score.valueScore },
          });
        }
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

      this.emitEvent({
        kind: "checking",
        message: `${fqdn} passed score ${score.valueScore} → DNS check`,
        data: { fqdn, score: score.valueScore, breakdown: score.breakdown },
      });

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
          this.bumpStat("perStrategy", strategy, "diamonds");
          this.bumpStat("perCategory", category, "diamonds");
          this.emitEvent({
            kind: "discovery",
            message: `DIAMOND: ${fqdn} (score ${score.valueScore}, ${category}/${strategy})`,
            data: {
              fqdn,
              category,
              strategy,
              valueScore: score.valueScore,
              pattern: score.pattern,
              evidence: dns.evidence,
              rationale,
              breakdown: score.breakdown,
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
