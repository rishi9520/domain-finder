import { useState } from "react";
import { useHuntDomains } from "@workspace/api-client-react";
import { Category, Strategy, DomainCandidate } from "@workspace/api-zod";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Sparkles, AlertCircle, ChevronRight, Activity } from "lucide-react";
import { formatCategory, formatStrategy, getScoreColor } from "@/lib/formatters";
import { InspectorDrawer } from "@/components/inspector-drawer";

export function Home() {
  const [category, setCategory] = useState<Category>("ai");
  const [strategy, setStrategy] = useState<Strategy>("brandable_cvcv");
  const [count, setCount] = useState([20]);
  
  const [selectedCandidate, setSelectedCandidate] = useState<DomainCandidate | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const huntMutation = useHuntDomains();

  const handleHunt = () => {
    huntMutation.mutate({
      data: {
        category,
        strategy,
        count: count[0],
        checkAvailability: true,
      }
    });
  };

  const handleRowClick = (c: DomainCandidate) => {
    setSelectedCandidate(c);
    setDrawerOpen(true);
  };

  const candidates = huntMutation.data?.candidates || [];

  return (
    <div className="flex flex-col h-screen">
      {/* Filter Strip */}
      <header className="flex-none p-4 border-b border-border bg-card sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row items-center gap-4 max-w-7xl mx-auto">
          
          <div className="flex-1 w-full grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Category</label>
              <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                <SelectTrigger className="w-full h-9 bg-background border-border">
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

            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Strategy</label>
              <Select value={strategy} onValueChange={(v) => setStrategy(v as Strategy)}>
                <SelectTrigger className="w-full h-9 bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brandable_cvcv">Brandable CVCV</SelectItem>
                  <SelectItem value="future_suffix">Future Suffix</SelectItem>
                  <SelectItem value="dictionary_hack">Dictionary Hack</SelectItem>
                  <SelectItem value="transliteration">Transliteration</SelectItem>
                  <SelectItem value="four_letter">4-Letter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 col-span-2 md:col-span-2 px-2">
              <div className="flex justify-between">
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Batch Size</label>
                <span className="text-[10px] font-mono text-muted-foreground">{count[0]} names</span>
              </div>
              <Slider 
                value={count} 
                onValueChange={setCount} 
                max={100} 
                min={10} 
                step={10} 
                className="mt-2"
              />
            </div>
          </div>

          <Button 
            size="lg" 
            className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
            onClick={handleHunt}
            disabled={huntMutation.isPending}
          >
            {huntMutation.isPending ? (
              <Activity className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            {huntMutation.isPending ? "Hunting..." : "Hunt"}
          </Button>

        </div>
      </header>

      {/* Main Feed */}
      <main className="flex-1 overflow-auto bg-background p-6">
        <div className="max-w-7xl mx-auto">
          
          {huntMutation.isPending && (
            <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-full blur-xl bg-primary/20 animate-pulse-fast"></div>
                <Activity className="h-12 w-12 text-primary animate-pulse-fast" />
              </div>
              <p className="text-muted-foreground font-mono text-sm tracking-tight">Synthesizing intelligence stream...</p>
            </div>
          )}

          {!huntMutation.isPending && candidates.length === 0 && !huntMutation.isError && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center border border-dashed border-border rounded-xl bg-card/50">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">Ready to Hunt</h2>
              <p className="text-muted-foreground max-w-md mb-8">
                Select your target vertical and generative strategy above to start synthesizing high-value domain candidates.
              </p>
              <Button onClick={handleHunt} variant="outline" className="border-primary/20 hover:bg-primary/10">
                Run Example Batch
              </Button>
            </div>
          )}

          {!huntMutation.isPending && candidates.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-widest font-bold pb-2 border-b border-border/50 px-4">
                <div className="w-[30%]">Domain Candidate</div>
                <div className="w-[15%] text-center">Score</div>
                <div className="w-[15%] text-center">Pattern</div>
                <div className="w-[20%] text-center">Avail / Price</div>
                <div className="w-[20%] text-right">Action</div>
              </div>

              {candidates.map((c, i) => {
                const scoreColor = getScoreColor(c.valueScore);
                
                return (
                  <div 
                    key={c.fqdn}
                    onClick={() => handleRowClick(c)}
                    className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all hover-elevate group"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="w-[30%]">
                      <div className="font-mono text-lg font-medium">{c.name}<span className="text-muted-foreground">{c.tld}</span></div>
                    </div>
                    
                    <div className="w-[15%] flex justify-center">
                      <div className={`px-3 py-1 rounded text-sm font-bold border ${scoreColor}`}>
                        {c.valueScore}
                      </div>
                    </div>

                    <div className="w-[15%] flex justify-center">
                      <Badge variant="outline" className="font-mono text-xs">{c.pattern}</Badge>
                    </div>

                    <div className="w-[20%] flex justify-center">
                      {c.available === true ? (
                        <div className="text-center">
                          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20">Avail</Badge>
                          {c.listPrice && <div className="text-xs font-mono mt-1 text-muted-foreground">${c.listPrice}</div>}
                        </div>
                      ) : c.available === false ? (
                        <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20">Taken</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </div>

                    <div className="w-[20%] flex justify-end">
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); handleRowClick(c); }}>
                        Inspect <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </main>

      <InspectorDrawer 
        candidate={selectedCandidate} 
        open={drawerOpen} 
        onOpenChange={setDrawerOpen} 
      />
    </div>
  );
}
