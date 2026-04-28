import { Link, useLocation } from "wouter";
import { Activity, BarChart2, Bookmark, Home, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Hunter", icon: Home },
  { href: "/trends", label: "Trends Lab", icon: Zap },
  { href: "/saved", label: "Shortlist", icon: Bookmark },
  { href: "/stats", label: "Analytics", icon: BarChart2 },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col fixed inset-y-0 left-0 z-50">
        <div className="p-6 flex items-center gap-3">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Activity className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-sidebar-foreground">Domain Hunter</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Intelligence</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <Link key={item.href} href={item.href}>
                <span
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer",
                    isActive
                      ? "bg-sidebar-accent text-primary"
                      : "text-sidebar-foreground/70"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse"></div>
            Intelligence Stream Active
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 min-h-screen">
        {children}
      </main>
    </div>
  );
}
