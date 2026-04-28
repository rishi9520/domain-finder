import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertCircle, 
  Check, 
  CheckCircle2, 
  Copy, 
  ExternalLink, 
  Globe, 
  Info, 
  Save, 
  ShieldAlert, 
  Sparkles, 
  XCircle 
} from "lucide-react";
import { 
  DomainCandidate,
} from "@workspace/api-zod";
import {
  useGetDomainAvailability,
  getGetDomainAvailabilityQueryKey,
  useGetSocialHandles,
  getGetSocialHandlesQueryKey,
  useGetTrademarkRisk,
  getGetTrademarkRiskQueryKey,
  useSaveDomain,
  getListSavedDomainsQueryKey,
  getGetStatsQueryKey
} from "@workspace/api-client-react";
import { formatCategory, formatStrategy, getScoreColor } from "@/lib/formatters";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface InspectorDrawerProps {
  candidate: DomainCandidate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InspectorDrawer({ candidate, open, onOpenChange }: InspectorDrawerProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const name = candidate?.name || "";

  const { data: availability, isLoading: isLoadingAvail } = useGetDomainAvailability(name, {
    query: {
      enabled: !!name && open,
      queryKey: getGetDomainAvailabilityQueryKey(name)
    }
  });

  const { data: social, isLoading: isLoadingSocial } = useGetSocialHandles(name, {
    query: {
      enabled: !!name && open,
      queryKey: getGetSocialHandlesQueryKey(name)
    }
  });

  const { data: trademark, isLoading: isLoadingTM } = useGetTrademarkRisk(name, {
    query: {
      enabled: !!name && open,
      queryKey: getGetTrademarkRiskQueryKey(name)
    }
  });

  const saveMutation = useSaveDomain({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSavedDomainsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
        toast({
          title: "Domain saved to shortlist",
          description: `${candidate?.fqdn} has been saved.`,
        });
      }
    }
  });

  if (!candidate) return null;

  const scoreColor = getScoreColor(candidate.valueScore);

  const handleSave = () => {
    saveMutation.mutate({
      data: {
        name: candidate.name,
        tld: candidate.tld,
        category: candidate.category,
        strategy: candidate.strategy,
        valueScore: candidate.valueScore,
        listPrice: availability?.listPrice || candidate.listPrice || null,
      }
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DrawerTitle className="text-3xl font-mono tracking-tight flex items-center gap-3">
                {candidate.fqdn}
                <div className={`px-2 py-1 rounded text-sm border font-sans font-bold ${scoreColor}`}>
                  {candidate.valueScore}
                </div>
              </DrawerTitle>
              <DrawerDescription className="flex items-center gap-2 text-sm">
                <Badge variant="outline">{formatCategory(candidate.category)}</Badge>
                <span className="text-muted-foreground">•</span>
                <Badge variant="outline">{formatStrategy(candidate.strategy)}</Badge>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground font-mono">{candidate.length} chars</span>
              </DrawerDescription>
            </div>
            
            <div className="flex items-center gap-3">
              {availability?.available === true && (
                <div className="text-right mr-4">
                  <div className="text-xs text-muted-foreground uppercase tracking-widest">Available</div>
                  <div className="text-lg font-bold text-emerald-400">
                    {availability.listPrice ? `$${availability.listPrice}` : 'Yes'}
                  </div>
                </div>
              )}
              <Button 
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {saveMutation.isPending ? (
                  <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                ) : saveMutation.isSuccess ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saveMutation.isSuccess ? "Saved" : "Save to Shortlist"}
              </Button>
            </div>
          </div>
        </DrawerHeader>

        <ScrollArea className="p-6 h-[calc(90vh-100px)]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Left Col: Rationale & Intelligence */}
            <div className="md:col-span-2 space-y-8">
              
              <section className="space-y-3">
                <h3 className="text-sm uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> AI Rationale
                </h3>
                <div className="p-4 rounded-md border border-primary/20 bg-primary/5 text-primary-foreground/90 text-sm leading-relaxed">
                  {candidate.rationale}
                </div>
              </section>

              <div className="grid grid-cols-2 gap-6">
                <section className="space-y-3">
                  <h3 className="text-sm uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-2">
                    <Globe className="h-4 w-4" /> Availability
                  </h3>
                  <div className="p-4 rounded-md border border-border bg-card space-y-4">
                    {isLoadingAvail ? (
                      <Skeleton className="h-10 w-full" />
                    ) : availability ? (
                      <div className="flex items-center justify-between">
                        <span className="font-mono">{availability.fqdn}</span>
                        {availability.available === true ? (
                          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Available</Badge>
                        ) : availability.available === false ? (
                          <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20">Taken</Badge>
                        ) : (
                          <Badge variant="outline">Unknown</Badge>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">Not checked</div>
                    )}
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" /> Trademark Risk
                  </h3>
                  <div className="p-4 rounded-md border border-border bg-card space-y-4">
                    {isLoadingTM ? (
                      <Skeleton className="h-10 w-full" />
                    ) : trademark ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Risk Level</span>
                          <Badge 
                            variant="outline" 
                            className={
                              trademark.risk === 'high' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                              trademark.risk === 'medium' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                              'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            }
                          >
                            {trademark.risk.toUpperCase()}
                          </Badge>
                        </div>
                        {trademark.matches.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Matches: {trademark.matches.join(", ")}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">Not checked</div>
                    )}
                  </div>
                </section>
              </div>

              <section className="space-y-3">
                <h3 className="text-sm uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-2">
                  <Info className="h-4 w-4" /> Social Handles
                </h3>
                <div className="p-4 rounded-md border border-border bg-card">
                  {isLoadingSocial ? (
                    <div className="flex gap-4">
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-8 w-24" />
                    </div>
                  ) : social ? (
                    <div className="flex flex-wrap gap-4">
                      {social.handles.map(handle => (
                        <div key={handle.platform} className="flex items-center gap-2 text-sm px-3 py-1.5 rounded bg-muted/30">
                          <span className="capitalize font-mono text-muted-foreground">{handle.platform}:</span>
                          {handle.available === true ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : handle.available === false ? (
                            <XCircle className="h-4 w-4 text-red-500" />
                          ) : (
                            <span className="text-muted-foreground">?</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Not checked</div>
                  )}
                </div>
              </section>

            </div>

            {/* Right Col: Score Breakdown */}
            <div className="space-y-6">
              <h3 className="text-sm uppercase tracking-widest text-muted-foreground font-bold">
                Value Breakdown
              </h3>
              
              <div className="space-y-5 p-4 rounded-md border border-border bg-card">
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Memorability</span>
                    <span className="font-mono">{candidate.scoreBreakdown.memorability}/100</span>
                  </div>
                  <Progress value={candidate.scoreBreakdown.memorability} className="h-1.5" indicatorClassName="bg-primary" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Phonetic Score</span>
                    <span className="font-mono">{candidate.scoreBreakdown.phonetic}/100</span>
                  </div>
                  <Progress value={candidate.scoreBreakdown.phonetic} className="h-1.5" indicatorClassName="bg-primary" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Trend Alignment</span>
                    <span className="font-mono">{candidate.scoreBreakdown.trend}/100</span>
                  </div>
                  <Progress value={candidate.scoreBreakdown.trend} className="h-1.5" indicatorClassName="bg-primary" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Length Penalty</span>
                    <span className="font-mono">{candidate.scoreBreakdown.length}/100</span>
                  </div>
                  <Progress value={candidate.scoreBreakdown.length} className="h-1.5" indicatorClassName="bg-primary" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">TLD Modifier</span>
                    <span className="font-mono">{candidate.scoreBreakdown.tld}/100</span>
                  </div>
                  <Progress value={candidate.scoreBreakdown.tld} className="h-1.5" indicatorClassName="bg-primary" />
                </div>

                <div className="pt-4 border-t border-border mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Radio Test</span>
                    {candidate.radioTest ? (
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">PASS</Badge>
                    ) : (
                      <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20">FAIL</Badge>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">V/C Balance</span>
                    <span className="text-sm font-mono">{candidate.vowelConsonantBalance}%</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
