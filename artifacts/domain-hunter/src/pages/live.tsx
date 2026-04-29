import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Check,
  Cpu,
  ExternalLink,
  Gem,
  Pause,
  Play,
  Radar,
  ShieldX,
  Sparkles,
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
  startHunter,
  stopHunter,
  useHunterStream,
  type Discovery,
  type HunterEvent,
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
            <h3 className="font-mono text-base font-semibold truncate">
              {d.fqdn}
            </h3>
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
      <p className="mt-2 text-xs text-muted-foreground/90 line-clamp-2">
        {d.rationale}
      </p>
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
      <div className="mt-1 text-[10px] text-muted-foreground/70">
        Found {timeAgo(d.discoveredAt)}
      </div>
    </div>
  );
}

export function Live() {
  const { events, state, connected } = useHunterStream();
  const [minScore, setMinScore] = useState(75);
  const [filterScore, setFilterScore] = useState(70);
  const queryClient = useQueryClient();

  const discoveriesQuery = useQuery({
    queryKey: ["discoveries", filterScore],
    queryFn: () => fetchDiscoveries({ limit: 60, minScore: filterScore }),
    refetchInterval: 4000,
  });

  // When a new discovery event arrives, invalidate the list
  useEffect(() => {
    if (events[0]?.kind === "discovery") {
      queryClient.invalidateQueries({ queryKey: ["discoveries"] });
    }
  }, [events, queryClient]);

  const running = state?.running ?? false;
  const cycle = state?.cycle ?? 0;
  const totalGenerated = state?.totalGenerated ?? 0;
  const totalChecked = state?.totalChecked ?? 0;
  const totalRegistered = state?.totalRegistered ?? 0;
  const totalDiscoveries = state?.totalDiscoveries ?? 0;

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
            Always-on diamond finder. Generates, scores, and DNS-verifies brandable .com candidates non-stop. Only truly unregistered names land in the vault.
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
                min={50}
                max={95}
                step={1}
                onValueChange={(v) => setMinScore(v[0] ?? 75)}
                className="w-40"
                data-testid="slider-min-score"
              />
              <span className="font-mono text-sm w-8 text-right">{minScore}</span>
            </div>
          </div>
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

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6 mb-6">
        <StatCard label="Status" value={running ? "RUNNING" : "IDLE"} accent={running ? "primary" : "muted"} />
        <StatCard label="Cycle" value={String(cycle)} />
        <StatCard label="Generated" value={String(totalGenerated)} />
        <StatCard label="DNS checked" value={String(totalChecked)} />
        <StatCard label="Already taken" value={String(totalRegistered)} accent="rose" />
        <StatCard label="Diamonds" value={String(totalDiscoveries)} accent="emerald" subtitle={`${hitRate}% hit`} />
      </div>

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
          </span>
        </div>
      )}

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
                min={50}
                max={95}
                step={5}
                onValueChange={(v) => setFilterScore(v[0] ?? 70)}
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
                  Start the hunter — diamonds will appear here the moment one is verified unregistered.
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
  accent?: "default" | "primary" | "emerald" | "rose" | "muted";
}) {
  const accentClass =
    accent === "primary"
      ? "text-primary"
      : accent === "emerald"
        ? "text-emerald-300"
        : accent === "rose"
          ? "text-rose-300"
          : accent === "muted"
            ? "text-muted-foreground"
            : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={cn("mt-1 text-2xl font-bold tabular-nums", accentClass)}>
        {value}
      </div>
      {subtitle && (
        <div className="mt-0.5 text-[10px] text-muted-foreground">{subtitle}</div>
      )}
    </div>
  );
}
