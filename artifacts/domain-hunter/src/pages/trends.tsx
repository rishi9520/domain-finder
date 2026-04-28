import { useState } from "react";
import { useGenerateTrends } from "@workspace/api-client-react";
import { Category } from "@workspace/api-zod";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity, Zap, BrainCircuit, Hash } from "lucide-react";

export function Trends() {
  const [category, setCategory] = useState<Category>("ai");
  const trendsMutation = useGenerateTrends();

  const handleGenerate = () => {
    trendsMutation.mutate({ data: { category } });
  };

  const trends = trendsMutation.data;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <BrainCircuit className="h-8 w-8 text-primary" />
          Trends Lab
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Synthesize emerging terminology, prefixes, and high-signal concepts for your chosen deep-tech vertical using LLM analysis.
        </p>
      </header>

      <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
        <div className="flex-1 max-w-xs">
          <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ai">AI</SelectItem>
              <SelectItem value="quantum">Quantum</SelectItem>
              <SelectItem value="biotech">Biotech</SelectItem>
              <SelectItem value="green_energy">Green Energy</SelectItem>
              <SelectItem value="space_tech">Space-Tech</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button 
          onClick={handleGenerate}
          disabled={trendsMutation.isPending}
          className="gap-2"
        >
          {trendsMutation.isPending ? <Activity className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          {trendsMutation.isPending ? "Analyzing..." : "Analyze Category"}
        </Button>
      </div>

      {trendsMutation.isPending && (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
          <p className="text-muted-foreground font-mono text-sm">Processing signals...</p>
        </div>
      )}

      {!trendsMutation.isPending && trends && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-lg font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 border-b border-border pb-2">
              <Hash className="h-4 w-4" /> High-Signal Keywords
            </h2>
            
            <div className="space-y-4">
              {trends.keywords.map(kw => (
                <div key={kw.keyword} className="p-4 rounded-lg border border-border bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-lg font-bold text-primary">{kw.keyword}</span>
                    <Badge variant="outline" className="font-mono bg-background">{(kw.weight * 100).toFixed(0)}%</Badge>
                  </div>
                  <Progress value={kw.weight * 100} className="h-1.5" indicatorClassName="bg-primary" />
                  <p className="text-sm text-muted-foreground">{kw.rationale}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-lg font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
                Emerging Prefixes
              </h2>
              <div className="flex flex-wrap gap-2">
                {trends.prefixes.map(p => (
                  <Badge key={p} variant="secondary" className="text-sm font-mono px-3 py-1">
                    {p}-
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
                High-Value Suffixes
              </h2>
              <div className="flex flex-wrap gap-2">
                {trends.suffixes.map(s => (
                  <Badge key={s} variant="secondary" className="text-sm font-mono px-3 py-1">
                    -{s}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
