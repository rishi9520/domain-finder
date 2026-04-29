import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Brain,
  Check,
  ChevronDown,
  Cpu,
  Database,
  ExternalLink,
  Filter,
  Gem,
  HelpCircle,
  Pause,
  Play,
  Radar,
  RefreshCw,
  ShieldX,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  fetchDiscoveries,
  fetchInsights,
  resetHunterMemory,
  startHunter,
  stopHunter,
  useHunterStream,
  type Discovery,
  type HunterEvent,
  type HunterInsights,
} from "@/hooks/use-hunter-stream";

const CATEGORY_LABEL: Record<string, string> = {
  ai: "AI",
  quantum: "Quantum",
  biotech: "Biotech",
  green_energy: "Green Energy",
  space_tech: "Space-Tech",
};

const STRATEGY_LABEL: Record<string, string> = {
  brandable_cvcv: "Brandable CVCV",
  future_suffix: "Future Suffix",
  dictionary_hack: "Dictionary Hack",
  transliteration: "Transliteration",
  four_letter: "4-Letter",
};

const STRATEGY_DESC: Record<string, string> = {
  brandable_cvcv: "Phonetic 5-letter consonant-vowel patterns (e.g. gefuv)",
  future_suffix: "Trend keyword + futuristic suffix (e.g. lumolab, hubpico)",
  dictionary_hack: "Real word + tech ending like x/code/ai (e.g. codex, gatex)",
  transliteration: "Hindi/Sanskrit roots Romanized (e.g. agnix, varuna)",
  four_letter: "Ultra-premium 4-character names",
};

function eventIcon(kind: HunterEvent["kind"]) {
  switch (kind) {
    case "discovery":
      return <Gem className="h-3.5 w-3.5 text-emerald-400" />;
    case "registered":
      return <ShieldX className="h-3.5 w-3.5 text-rose-400/70" />;
    case "checking":
      return <Radar className="h-3.5 w-3.5 text-cyan-300" />;
    case "phase":
      return <Cpu className="h-3.5 w-3.5 text-violet-300" />;
    case "generated":
      return <Sparkles className="h-3.5 w-3.5 text-amber-300" />;
    case "skipped":
      return <X className="h-3.5 w-3.5 text-muted-foreground" />;
    case "error":
      return <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />;
    default:
      return <Activity className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

function eventTextClass(kind: HunterEvent["kind"]) {
  switch (kind) {
    case "discovery":
      return "text-emerald-200 font-medium";
    case "registered":
      return "text-rose-300/70";
    case "checking":
      return "text-cyan-200/90";
    case "phase":
      return "text-violet-200";
    case "generated":
      return "text-amber-200/90";
    case "error":
      return "text-rose-300";
    default:
      return "text-muted-foreground";
  }
}

function scoreColor(score: number) {
  if (score >= 90) return "text-emerald-300";
  if (score >= 80) return "text-cyan-300";
  if (score >= 70) return "text-amber-300";
  return "text-muted-foreground";
}

function scoreRingBg(score: number) {
  if (score >= 90) return "bg-emerald-500/20 border-emerald-400/40";
  if (score >= 80) return "bg-cyan-500/20 border-cyan-400/40";
  if (score >= 70) return "bg-amber-500/15 border-amber-400/40";
  return "bg-muted/40 border-border";
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 1000) return "just now";
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  return `${Math.floor(ms / 3_600_000)}h ago`;
}

function DiscoveryCard({ d }: { d: Discovery }) {
  const purchaseUrl = `https://www.godaddy.com/domainsearch/find?domainToCheck=${encodeURIComponent(d.fqdn)}`;
  return (
    <div
      className={cn(
        "group rounded-lg border bg-card/50 p-4 transition-all hover:border-primary/40 hover:bg-card/80",
        scoreRingBg(d.valueScore),
      )}
      data-testid={`discovery-${d.fqdn}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-mono text-base font-semibold truncate">{d.fqdn}</h3>
            {d.radioTest && (
              <Badge
                variant="outline"
                className="border-emerald-400/40 text-emerald-300 text-[10px] uppercase"
              >
                Radio
              </Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span>{CATEGORY_LABEL[d.category] ?? d.category}</span>
            <span className="opacity-50">·</span>
            <span>{STRATEGY_LABEL[d.strategy] ?? d.strategy}</span>
            <span className="opacity-50">·</span>
            <span className="font-mono">{d.pattern}</span>
            <span className="opacity-50">·</span>
            <span>{d.length}L</span>
          </div>
        </div>
        <div
          className={cn(
            "shrink-0 rounded-md border px-2.5 py-1.5 text-right",
            scoreRingBg(d.valueScore),
          )}
        >
          <div className={cn("text-xl font-bold leading-none", scoreColor(d.valueScore))}>
            {d.valueScore.toFixed(1)}
          </div>
          <div className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
            Value
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground/90 line-clamp-2">{d.rationale}</p>
      <div className="mt-3 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Check className="h-3 w-3 text-emerald-400" />
          <span className="font-mono">{d.dnsEvidence}</span>
        </div>
        <a
          href={purchaseUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline"
          data-testid={`buy-${d.fqdn}`}
        >
          Register <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground/70">Found {timeAgo(d.discoveredAt)}</div>
    </div>
  );
}

function HowItWorks() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-card/30 mb-6">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        data-testid="button-how-it-works"
      >
        <span className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-cyan-300" />
          <span className="text-sm font-semibold">How the hunter works (5 stages)</span>
          <span className="text-xs text-muted-foreground">— click to expand</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t border-border/40 px-4 py-4 grid gap-3 md:grid-cols-5 text-xs">
          <Step
            n={1}
            color="violet"
            icon={<Brain className="h-4 w-4" />}
            title="Trend keywords"
            body="Groq llama-3.3 fetches what's hot in the chosen deep-tech category (AI, Quantum, Biotech, Green Energy, Space-Tech). Cached 30 min."
          />
          <Step
            n={2}
            color="amber"
            icon={<Sparkles className="h-4 w-4" />}
            title="Generate 30 candidates"
            body="One of 5 strategies builds new names. Recently-seen names are excluded so every cycle gets fresh output."
          />
          <Step
            n={3}
            color="cyan"
            icon={<Filter className="h-4 w-4" />}
            title="Score & filter"
            body="Each name scored 0-100 across length, TLD, trend match, phonetics, memorability, radio test. Only ≥ min score reach DNS."
          />
          <Step
            n={4}
            color="rose"
            icon={<Radar className="h-4 w-4" />}
            title="Real DNS verify"
            body="Node DNS lookup checks NS + SOA records. NS exists → registered. NXDOMAIN → genuinely unregistered. Cached 6 hours."
          />
          <Step
            n={5}
            color="emerald"
            icon={<Gem className="h-4 w-4" />}
            title="Save diamond"
            body="Unregistered name + Groq-written rationale → vault. Deduped by fqdn so same name never enters twice."
          />
          <div className="md:col-span-5 mt-2 grid gap-2 sm:grid-cols-5">
            {Object.entries(STRATEGY_LABEL).map(([key, label]) => (
              <div
                key={key}
                className="rounded-md border border-border/50 bg-card/40 p-2"
              >
                <div className="text-[11px] font-semibold text-foreground">{label}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {STRATEGY_DESC[key]}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Step({
  n,
  color,
  icon,
  title,
  body,
}: {
  n: number;
  color: "violet" | "amber" | "cyan" | "rose" | "emerald";
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  const colorMap = {
    violet: "border-violet-400/40 text-violet-200 bg-violet-500/10",
    amber: "border-amber-400/40 text-amber-200 bg-amber-500/10",
    cyan: "border-cyan-400/40 text-cyan-200 bg-cyan-500/10",
    rose: "border-rose-400/40 text-rose-200 bg-rose-500/10",
    emerald: "border-emerald-400/40 text-emerald-200 bg-emerald-500/10",
  };
  return (
    <div className={cn("rounded-md border p-3", colorMap[color])}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5">{icon}<span className="font-semibold">{title}</span></span>
        <span className="text-[10px] opacity-60">#{n}</span>
      </div>
      <p className="mt-1.5 text-[11px] opacity-90 leading-snug">{body}</p>
    </div>
  );
}

function YieldBar({
  label,
  generated,
  checked,
  diamonds,
  yieldPct,
}: {
  label: string;
  generated: number;
  checked: number;
  diamonds: number;
  yieldPct: number;
}) {
  const max = Math.max(checked, 1);
  const checkedPct = (checked / Math.max(generated, 1)) * 100;
  const diamondsPct = (diamonds / max) * 100;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {diamonds}<span className="opacity-50">/{checked}</span> · {yieldPct}% yield
        </span>
      </div>
      <div className="relative h-2 rounded bg-muted/30 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-cyan-500/40"
          style={{ width: `${Math.min(100, checkedPct)}%` }}
        />
        <div
          className="absolute inset-y-0 left-0 bg-emerald-400"
          style={{ width: `${Math.min(100, (diamonds / Math.max(generated, 1)) * 100)}%` }}
        />
      </div>
      <div className="text-[10px] text-muted-foreground tabular-nums">
        gen {generated} · scored-pass {checked} · diamonds {diamonds} ({diamondsPct.toFixed(0)}% of probed)
      </div>
    </div>
  );
}

function InsightsPanel({ insights }: { insights: HunterInsights | undefined }) {
  if (!insights) {
    return (
      <div className="text-xs text-muted-foreground p-4">Loading insights…</div>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-lg border border-border bg-card/30 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-300" /> Per strategy yield
          </h3>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            diamonds / probed
          </span>
        </div>
        <div className="space-y-3">
          {insights.perStrategy.length === 0 && (
            <p className="text-xs text-muted-foreground">No data yet — start the hunter.</p>
          )}
          {insights.perStrategy.map((s) => (
            <YieldBar
              key={s.key}
              label={STRATEGY_LABEL[s.key] ?? s.key}
              generated={s.generated}
              checked={s.checked}
              diamonds={s.diamonds}
              yieldPct={s.diamondYield}
            />
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card/30 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Brain className="h-4 w-4 text-violet-300" /> Per category yield
          </h3>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            diamonds / probed
          </span>
        </div>
        <div className="space-y-3">
          {insights.perCategory.length === 0 && (
            <p className="text-xs text-muted-foreground">No data yet — start the hunter.</p>
          )}
          {insights.perCategory.map((c) => (
            <YieldBar
              key={c.key}
              label={CATEGORY_LABEL[c.key] ?? c.key}
              generated={c.generated}
              checked={c.checked}
              diamonds={c.diamonds}
              yieldPct={c.diamondYield}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function Live() {
  const { events, state, connected } = useHunterStream();
  const [minScore, setMinScore] = useState(55);
  const [filterScore, setFilterScore] = useState(55);
  const queryClient = useQueryClient();

  const discoveriesQuery = useQuery({
    queryKey: ["discoveries", filterScore],
    queryFn: () => fetchDiscoveries({ limit: 60, minScore: filterScore }),
    refetchInterval: 4000,
  });

  const insightsQuery = useQuery({
    queryKey: ["hunter-insights"],
    queryFn: fetchInsights,
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (events[0]?.kind === "discovery") {
      queryClient.invalidateQueries({ queryKey: ["discoveries"] });
      queryClient.invalidateQueries({ queryKey: ["hunter-insights"] });
    }
  }, [events, queryClient]);

  const running = state?.running ?? false;
  const cycle = state?.cycle ?? 0;
  const totalGenerated = state?.totalGenerated ?? 0;
  const totalScoreFiltered = state?.totalScoreFiltered ?? 0;
  const totalChecked = state?.totalChecked ?? 0;
  const totalRegistered = state?.totalRegistered ?? 0;
  const totalDiscoveries = state?.totalDiscoveries ?? 0;
  const totalDuplicateSkips = state?.totalDuplicateSkips ?? 0;
  const recentMemory =
    (state as { everSearchedSize?: number; recentNamesSize?: number } | null)
      ?.everSearchedSize ??
    state?.recentNamesSize ??
    0;
  const checksPerSecond =
    (state as { checksPerSecond?: number } | null)?.checksPerSecond ?? 0;
  const rdapVerified =
    (state as { totalRdapVerified?: number } | null)?.totalRdapVerified ?? 0;
  const rdapFalsePositives =
    (state as { totalRdapFalsePositives?: number } | null)
      ?.totalRdapFalsePositives ?? 0;
  const cleanupRunning =
    (state as { cleanupRunning?: boolean } | null)?.cleanupRunning ?? false;
  const cleanupChecked =
    (state as { cleanupChecked?: number } | null)?.cleanupChecked ?? 0;
  const cleanupRemoved =
    (state as { cleanupRemoved?: number } | null)?.cleanupRemoved ?? 0;
  const effectiveMinScore = state?.effectiveMinScore ?? minScore;
  const starvation = state?.starvationStreak ?? 0;

  const hitRate = useMemo(() => {
    if (totalChecked === 0) return 0;
    return Math.round((totalDiscoveries / totalChecked) * 1000) / 10;
  }, [totalChecked, totalDiscoveries]);

  async function handleToggle() {
    if (running) {
      await stopHunter();
    } else {
      await startHunter(minScore);
    }
  }

  async function handleResetMemory() {
    await resetHunterMemory();
    queryClient.invalidateQueries({ queryKey: ["hunter-insights"] });
  }

  return (
    <div className="p-6 max-w-[1500px] mx-auto">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Live Hunter</h1>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider",
                connected
                  ? "border-emerald-400/40 text-emerald-300 bg-emerald-500/10"
                  : "border-rose-400/40 text-rose-300 bg-rose-500/10",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  connected ? "bg-emerald-400 animate-pulse" : "bg-rose-400",
                )}
              />
              {connected ? "Stream live" : "Reconnecting"}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Always-on diamond finder. Generates, scores, and DNS-verifies brandable .com candidates non-stop. Generator memory ensures every cycle produces fresh names.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Min value score
            </div>
            <div className="mt-1 flex items-center gap-2">
              <Slider
                value={[minScore]}
                min={40}
                max={95}
                step={1}
                onValueChange={(v) => setMinScore(v[0] ?? 55)}
                className="w-40"
                data-testid="slider-min-score"
              />
              <span className="font-mono text-sm w-8 text-right">{minScore}</span>
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">
              effective: <span className="font-mono">{effectiveMinScore}</span>
              {starvation > 0 && (
                <span className="ml-2 text-amber-300">starvation {starvation}/8</span>
              )}
            </div>
          </div>
          <Button
            onClick={handleResetMemory}
            size="lg"
            variant="outline"
            className="border-amber-400/40 text-amber-300 hover:bg-amber-500/10"
            data-testid="button-reset-memory"
            title="Forget recently-seen names — restart fresh exploration"
          >
            <Trash2 className="mr-2 h-4 w-4" /> Clear memory
          </Button>
          <Button
            onClick={handleToggle}
            size="lg"
            variant={running ? "outline" : "default"}
            className={cn(
              running
                ? "border-rose-400/50 text-rose-300 hover:bg-rose-500/10"
                : "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
            data-testid="button-toggle-hunter"
          >
            {running ? (
              <>
                <Pause className="mr-2 h-4 w-4" /> Stop
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" /> Start hunting
              </>
            )}
          </Button>
        </div>
      </header>

      <HowItWorks />

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-9 mb-6">
        <StatCard label="Status" value={running ? "RUN" : "IDLE"} accent={running ? "primary" : "muted"} />
        <StatCard label="Cycle" value={String(cycle)} />
        <StatCard label="Generated" value={String(totalGenerated)} />
        <StatCard label="Score-filtered" value={String(totalScoreFiltered)} accent="muted" subtitle="below min" />
        <StatCard label="DNS checked" value={String(totalChecked)} accent="cyan" />
        <StatCard label="Already taken" value={String(totalRegistered)} accent="rose" />
        <StatCard label="Diamonds" value={String(totalDiscoveries)} accent="emerald" subtitle={`RDAP-verified · ${hitRate}% hit`} />
        <StatCard label="RDAP rejected" value={String(rdapFalsePositives)} accent="rose" subtitle="DNS-free but registry-taken" />
        <StatCard label="Dupes blocked" value={String(totalDuplicateSkips)} accent="amber" subtitle={`history ${recentMemory.toLocaleString()} · ${checksPerSecond}/sec`} />
      </div>

      {cleanupRunning && (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          <Zap className="h-4 w-4" />
          <span>
            Cleanup running — re-verifying legacy diamonds via Verisign RDAP:{" "}
            <span className="font-semibold">{cleanupChecked.toLocaleString()}</span> verified ·{" "}
            <span className="font-semibold">{cleanupRemoved.toLocaleString()}</span> false-positives removed
          </span>
        </div>
      )}
      {!cleanupRunning && rdapVerified > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-200">
          <span>
            Two-stage gate active: DNS check → Verisign RDAP confirm.{" "}
            <span className="font-semibold">{rdapVerified.toLocaleString()}</span> verified this session ·{" "}
            <span className="font-semibold">{rdapFalsePositives.toLocaleString()}</span> rejected by registry
          </span>
        </div>
      )}

      {state?.currentCategory && state.currentStrategy && running && (
        <div className="mb-6 flex items-center gap-2 rounded-md border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-sm">
          <Zap className="h-4 w-4 text-violet-300" />
          <span className="text-violet-200">
            Currently scanning{" "}
            <span className="font-semibold">
              {CATEGORY_LABEL[state.currentCategory] ?? state.currentCategory}
            </span>{" "}
            via{" "}
            <span className="font-semibold">
              {STRATEGY_LABEL[state.currentStrategy] ?? state.currentStrategy}
            </span>
            {" — "}
            <span className="text-xs text-muted-foreground">
              filter: score ≥ {effectiveMinScore} · memory: {recentMemory} names known
            </span>
          </span>
        </div>
      )}

      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Database className="h-4 w-4 text-cyan-300" /> Performance breakdown
          </h2>
          <button
            onClick={() => insightsQuery.refetch()}
            className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" /> refresh
          </button>
        </div>
        <InsightsPanel insights={insightsQuery.data} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">
        <section className="rounded-lg border border-border bg-card/30">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-300" />
              <h2 className="text-sm font-semibold">Intelligence stream</h2>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {events.length} events
            </span>
          </div>
          <ScrollArea className="h-[640px]">
            <ul className="divide-y divide-border/40">
              {events.length === 0 && (
                <li className="px-4 py-12 text-center text-sm text-muted-foreground">
                  {running
                    ? "Warming up… events will stream in within a moment."
                    : "Press Start hunting to wake the engine."}
                </li>
              )}
              {events.map((ev) => (
                <li
                  key={ev.id}
                  className="px-4 py-2 flex items-start gap-2 text-xs"
                  data-testid={`event-${ev.kind}`}
                >
                  <span className="mt-0.5 shrink-0">{eventIcon(ev.kind)}</span>
                  <div className="min-w-0 flex-1">
                    <div className={cn("leading-snug", eventTextClass(ev.kind))}>
                      {ev.message}
                    </div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground/70 font-mono">
                      {new Date(ev.ts).toLocaleTimeString()} · {ev.kind}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </section>

        <section className="rounded-lg border border-border bg-card/30">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <Gem className="h-4 w-4 text-emerald-300" />
              <h2 className="text-sm font-semibold">
                Diamond vault
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  unregistered .com domains
                </span>
              </h2>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-muted-foreground">Filter ≥</span>
              <Slider
                value={[filterScore]}
                min={40}
                max={95}
                step={5}
                onValueChange={(v) => setFilterScore(v[0] ?? 55)}
                className="w-32"
              />
              <span className="font-mono w-6 text-right">{filterScore}</span>
              <span className="ml-2 rounded border border-border px-1.5 py-0.5 font-mono">
                {discoveriesQuery.data?.items.length ?? 0}
              </span>
            </div>
          </div>
          <div className="p-4">
            {discoveriesQuery.data && discoveriesQuery.data.items.length === 0 && (
              <div className="rounded-lg border border-dashed border-border/60 px-6 py-16 text-center">
                <Gem className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                <h3 className="text-base font-semibold">Vault is empty</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try lowering the filter slider, or start the hunter — diamonds appear here the moment one is verified unregistered.
                </p>
              </div>
            )}
            {discoveriesQuery.data && discoveriesQuery.data.items.length > 0 && (
              <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                {discoveriesQuery.data.items.map((d) => (
                  <DiscoveryCard key={d.id} d={d} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtitle,
  accent = "default",
}: {
  label: string;
  value: string;
  subtitle?: string;
  accent?: "default" | "primary" | "emerald" | "rose" | "muted" | "cyan" | "amber";
}) {
  const accentClass =
    accent === "primary"
      ? "text-primary"
      : accent === "emerald"
        ? "text-emerald-300"
        : accent === "rose"
          ? "text-rose-300"
          : accent === "cyan"
            ? "text-cyan-300"
            : accent === "amber"
              ? "text-amber-300"
              : accent === "muted"
                ? "text-muted-foreground"
                : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-xl font-bold tabular-nums", accentClass)}>{value}</div>
      {subtitle && <div className="mt-0.5 text-[10px] text-muted-foreground">{subtitle}</div>}
    </div>
  );
}
