import { useState } from "react";
import { useListSavedDomains, useDeleteSavedDomain, getListSavedDomainsQueryKey, getGetStatsQueryKey } from "@workspace/api-client-react";
import { DomainCandidate, SavedDomain } from "@workspace/api-zod";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Bookmark, ExternalLink, ChevronRight, BookmarkCheck } from "lucide-react";
import { formatCategory, formatStrategy, getScoreColor } from "@/lib/formatters";
import { useQueryClient } from "@tanstack/react-query";
import { InspectorDrawer } from "@/components/inspector-drawer";
import { formatDistanceToNow } from "date-fns";

export function Saved() {
  const [selectedCandidate, setSelectedCandidate] = useState<DomainCandidate | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const queryClient = useQueryClient();
  const { data: savedDomains, isLoading } = useListSavedDomains();
  
  const deleteMutation = useDeleteSavedDomain({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSavedDomainsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
      }
    }
  });

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    deleteMutation.mutate({ id });
  };

  // Convert SavedDomain to a partial DomainCandidate for the InspectorDrawer
  // Since we don't have all details, we mock some for the inspector
  const handleInspect = (saved: SavedDomain) => {
    const mockCandidate: DomainCandidate = {
      name: saved.name,
      tld: saved.tld,
      fqdn: saved.fqdn,
      category: saved.category,
      strategy: saved.strategy,
      valueScore: saved.valueScore,
      listPrice: saved.listPrice,
      // mock the rest
      pattern: "N/A",
      length: saved.name.length,
      vowelConsonantBalance: 50,
      memorabilityScore: saved.valueScore,
      radioTest: true,
      scoreBreakdown: { length: 80, tld: 100, trend: 80, phonetic: 80, memorability: 80, radioTest: 100 },
      rationale: saved.notes || "Saved domain.",
    };
    setSelectedCandidate(mockCandidate);
    setDrawerOpen(true);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <BookmarkCheck className="h-8 w-8 text-primary" />
          Shortlist
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Your curated selection of high-value domain assets. Monitor availability and review your picks.
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-card border border-border rounded-lg animate-pulse"></div>
          ))}
        </div>
      ) : savedDomains && savedDomains.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-widest font-bold pb-2 border-b border-border/50 px-4">
            <div className="w-[30%]">Domain Asset</div>
            <div className="w-[15%] text-center">Score</div>
            <div className="w-[25%] text-center">Category / Strategy</div>
            <div className="w-[15%] text-center">Saved At</div>
            <div className="w-[15%] text-right">Actions</div>
          </div>

          {savedDomains.map((saved) => {
            const scoreColor = getScoreColor(saved.valueScore);
            return (
              <div 
                key={saved.id}
                onClick={() => handleInspect(saved)}
                className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all hover-elevate group"
              >
                <div className="w-[30%]">
                  <div className="font-mono text-lg font-medium">{saved.name}<span className="text-muted-foreground">{saved.tld}</span></div>
                  {saved.listPrice && (
                    <div className="text-xs text-emerald-400 mt-1 font-mono">${saved.listPrice}</div>
                  )}
                </div>
                
                <div className="w-[15%] flex justify-center">
                  <div className={`px-3 py-1 rounded text-sm font-bold border ${scoreColor}`}>
                    {saved.valueScore}
                  </div>
                </div>

                <div className="w-[25%] flex flex-col items-center justify-center gap-1">
                  <Badge variant="outline" className="text-xs">{formatCategory(saved.category)}</Badge>
                  <span className="text-[10px] text-muted-foreground">{formatStrategy(saved.strategy)}</span>
                </div>

                <div className="w-[15%] flex justify-center">
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(saved.savedAt), { addSuffix: true })}
                  </span>
                </div>

                <div className="w-[15%] flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => handleDelete(e, saved.id)}
                    disabled={deleteMutation.isPending && deleteMutation.variables?.id === saved.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center border border-dashed border-border rounded-xl bg-card/50">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Bookmark className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">No domains saved yet</h2>
          <p className="text-muted-foreground max-w-md">
            Your shortlist is empty. Head over to the Hunter dashboard to discover high-value domain names.
          </p>
        </div>
      )}

      <InspectorDrawer 
        candidate={selectedCandidate} 
        open={drawerOpen} 
        onOpenChange={setDrawerOpen} 
      />
    </div>
  );
}
