import { useGetStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCategory, formatStrategy, getScoreColor, getScoreColorHex } from "@/lib/formatters";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { BarChart2, Hash, TrendingUp, ShieldCheck, Activity } from "lucide-react";

export function Stats() {
  const { data: stats, isLoading } = useGetStats();

  if (isLoading || !stats) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-8">
        <header className="space-y-2">
          <div className="h-10 w-48 bg-card rounded animate-pulse" />
          <div className="h-4 w-96 bg-card rounded animate-pulse" />
        </header>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-card rounded animate-pulse" />)}
        </div>
      </div>
    );
  }

  const categoryData = stats.byCategory.map(c => ({
    name: formatCategory(c.category),
    count: c.count,
    avgScore: c.avgScore
  }));

  const strategyData = stats.byStrategy.map(s => ({
    name: formatStrategy(s.strategy),
    count: s.count,
    avgScore: s.avgScore
  }));

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <BarChart2 className="h-8 w-8 text-primary" />
          Analytics
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Intelligence overview of your curated domain portfolio.
        </p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Total Assets</CardTitle>
            <Hash className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{stats.totalSaved}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Avg Value Score</CardTitle>
            <Activity className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{stats.avgScore.toFixed(1)}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Top Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-purple-400">{stats.topScore}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Available Now</CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-emerald-400">{stats.availableCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <div className="p-6 rounded-xl border border-border bg-card space-y-6">
          <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Portfolio by Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px' }} 
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getScoreColorHex(entry.avgScore)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 rounded-xl border border-border bg-card space-y-6">
          <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Portfolio by Strategy</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={strategyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px' }} 
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {strategyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getScoreColorHex(entry.avgScore)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Top Picks List */}
      <div className="space-y-4">
        <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground border-b border-border pb-2">Elite Candidates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.topPicks.map(pick => {
            const scoreColor = getScoreColor(pick.valueScore);
            return (
              <div key={pick.id} className="p-4 rounded-lg border border-border bg-card flex items-center justify-between">
                <div>
                  <div className="font-mono text-lg font-medium">{pick.name}<span className="text-muted-foreground">{pick.tld}</span></div>
                  <div className="text-xs text-muted-foreground mt-1 flex gap-2">
                    <span>{formatCategory(pick.category)}</span>
                    <span>•</span>
                    <span>{formatStrategy(pick.strategy)}</span>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded text-sm font-bold border ${scoreColor}`}>
                  {pick.valueScore}
                </div>
              </div>
            );
          })}
          {stats.topPicks.length === 0 && (
             <div className="text-muted-foreground text-sm col-span-2">No top picks available yet.</div>
          )}
        </div>
      </div>

    </div>
  );
}
