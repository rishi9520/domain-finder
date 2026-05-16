import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Play,
  Pause,
  ShieldAlert,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface WorkerSummary {
  id: string;
  displayName: string;
  category: "domains" | "crypto" | "social" | "compute" | "defi";
  riskLevel: "low" | "medium" | "high" | "very_high";
  legalStatus: "clean" | "tos_grey" | "tos_violation";
  description: string;
  implemented: boolean;
  intervalMs: number;
  running: boolean;
  totalRuns: number;
  totalOpportunities: number;
  lastStartedAt: string | null;
  lastStoppedAt: string | null;
  lastError: string | null;
}

const API_BASE = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api`;

async function fetchWorkers(): Promise<WorkerSummary[]> {
  const res = await fetch(`${API_BASE}/workers`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as WorkerSummary[];
}

async function toggleWorker(id: string, start: boolean): Promise<void> {
  const res = await fetch(`${API_BASE}/workers/${id}/${start ? "start" : "stop"}`, {
    method: "POST",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
}

const CATEGORY_LABEL: Record<WorkerSummary["category"], string> = {
  domains: "Domains",
  crypto: "Crypto",
  social: "Social",
  compute: "Compute",
  defi: "DeFi",
};

const CATEGORY_COLOR: Record<WorkerSummary["category"], string> = {
  domains: "border-emerald-400/40 text-emerald-200 bg-emerald-500/10",
  crypto: "border-violet-400/40 text-violet-200 bg-violet-500/10",
  social: "border-rose-400/40 text-rose-200 bg-rose-500/10",
  compute: "border-cyan-400/40 text-cyan-200 bg-cyan-500/10",
  defi: "border-amber-400/40 text-amber-200 bg-amber-500/10",
};

const RISK_COLOR: Record<WorkerSummary["riskLevel"], string> = {
  low: "border-emerald-400/40 text-emerald-300",
  medium: "border-amber-400/40 text-amber-300",
  high: "border-orange-400/40 text-orange-300",
  very_high: "border-rose-500/50 text-rose-300",
};

const LEGAL_COLOR: Record<WorkerSummary["legalStatus"], string> = {
  clean: "border-emerald-400/40 text-emerald-300",
  tos_grey: "border-amber-400/40 text-amber-300",
  tos_violation: "border-rose-500/50 text-rose-300",
};

const LEGAL_LABEL: Record<WorkerSummary["legalStatus"], string> = {
  clean: "Compliant",
  tos_grey: "ToS grey-zone",
  tos_violation: "ToS violation",
};

function fmtInterval(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h`;
  return `${Math.round(ms / 86_400_000)}d`;
}

function WorkerCard({ w }: { w: WorkerSummary }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleToggle = async () => {
    setBusy(true);
    setError(null);
    try {
      await toggleWorker(w.id, !w.running);
      await qc.invalidateQueries({ queryKey: ["workers"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="rounded-lg border border-border/60 bg-card/30 p-4 flex flex-col gap-3">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold truncate">{w.displayName}</h3>
            {w.implemented ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            ) : (
              <Sparkles
                className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0"
                aria-label="skeleton — not implemented"
              />
            )}
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground line-clamp-3">
            {w.description}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn("text-[10px] uppercase tracking-wider shrink-0", CATEGORY_COLOR[w.category])}
        >
          {CATEGORY_LABEL[w.category]}
        </Badge>
      </header>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className={cn("text-[10px]", RISK_COLOR[w.riskLevel])}>
          Risk: {w.riskLevel.replace("_", " ")}
        </Badge>
        <Badge variant="outline" className={cn("text-[10px]", LEGAL_COLOR[w.legalStatus])}>
          {w.legalStatus === "clean" ? null : <ShieldAlert className="h-3 w-3 mr-1 inline" />}
          {LEGAL_LABEL[w.legalStatus]}
        </Badge>
        <Badge variant="outline" className="text-[10px] border-border/60 text-muted-foreground">
          tick {fmtInterval(w.intervalMs)}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded border border-border/40 bg-background/30 px-2 py-1.5">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Runs</div>
          <div className="mt-0.5 font-mono tabular-nums">{w.totalRuns.toLocaleString()}</div>
        </div>
        <div className="rounded border border-border/40 bg-background/30 px-2 py-1.5">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Opportunities</div>
          <div className="mt-0.5 font-mono tabular-nums text-emerald-300">
            {w.totalOpportunities.toLocaleString()}
          </div>
        </div>
      </div>

      {w.lastError && (
        <div className="rounded border border-rose-400/30 bg-rose-500/5 px-2 py-1.5 text-[11px] text-rose-300 flex items-start gap-1.5">
          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
          <span className="break-words">{w.lastError}</span>
        </div>
      )}
      {error && (
        <div className="rounded border border-rose-400/30 bg-rose-500/5 px-2 py-1.5 text-[11px] text-rose-300">
          {error}
        </div>
      )}

      <footer className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[10px] uppercase tracking-wider",
            w.running ? "text-emerald-300" : "text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              w.running ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground/40",
            )}
          />
          {w.running ? "Running" : "Idle"}
        </span>
        <Button
          size="sm"
          variant={w.running ? "outline" : "default"}
          disabled={busy || !w.implemented}
          onClick={() => void handleToggle()}
          className="h-7 text-[11px]"
          title={!w.implemented ? "Skeleton — logic not implemented yet" : undefined}
        >
          {busy ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : w.running ? (
            <>
              <Pause className="h-3 w-3 mr-1" /> Stop
            </>
          ) : (
            <>
              <Play className="h-3 w-3 mr-1" /> Start
            </>
          )}
        </Button>
      </footer>
    </article>
  );
}

export function Workers() {
  const q = useQuery({
    queryKey: ["workers"],
    queryFn: fetchWorkers,
    refetchInterval: 5000,
  });

  const workers = q.data ?? [];
  const implementedCount = workers.filter((w) => w.implemented).length;
  const runningCount = workers.filter((w) => w.running).length;

  return (
    <div className="px-6 py-6 max-w-[1500px] mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Codicore Workers</h1>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-3xl">
          12 autonomous opportunity hunters across domains, crypto, social, compute and DeFi.
          {" "}
          <span className="text-foreground/80">
            {implementedCount} of {workers.length} have live logic, {runningCount} running.
          </span>
        </p>
      </header>

      <div className="mb-4 rounded-md border border-amber-400/30 bg-amber-500/5 px-3 py-2 text-[12px] text-amber-200/90 flex items-start gap-2">
        <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          Workers tagged <span className="font-semibold">ToS grey-zone</span> ship without
          rule-violating logic (no Sybil farming, no automated handle registration). They watch
          and alert; the user acts manually.
        </div>
      </div>

      {q.isLoading && (
        <div className="rounded-lg border border-dashed border-border/60 px-6 py-12 text-center text-sm text-muted-foreground">
          Loading workers…
        </div>
      )}
      {q.error && (
        <div className="rounded-lg border border-rose-400/40 bg-rose-500/5 px-6 py-12 text-center text-sm text-rose-300">
          Failed to load: {(q.error as Error).message}
        </div>
      )}

      {workers.length > 0 && (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {workers.map((w) => (
            <WorkerCard key={w.id} w={w} />
          ))}
        </div>
      )}
    </div>
  );
}
