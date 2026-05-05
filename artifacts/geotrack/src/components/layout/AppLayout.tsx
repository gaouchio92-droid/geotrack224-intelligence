import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Bell, Compass, LayoutDashboard, Menu, Settings, Wifi, WifiOff, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { GeoTrackLogo } from "./GeoTrackLogo";
import { useWebsocket } from "@/hooks/use-websocket";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { isConnected } = useWebsocket();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigation = [
    { name: "Tableau de bord", href: "/", icon: LayoutDashboard, testId: "dashboard" },
    { name: "Appareils", href: "/devices", icon: Compass, testId: "devices" },
    { name: "Alertes", href: "/alerts", icon: Bell, testId: "alerts" },
  ];

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden selection:bg-primary/30">

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center px-4 border-b border-border bg-card shadow-md">
        <button
          onClick={() => setMobileOpen(true)}
          className="mr-3 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <GeoTrackLogo size={28} />
          <span className="font-mono font-bold tracking-tight text-base truncate">
            GeoTrack<span className="text-primary">224</span>
          </span>
        </div>
        <div className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-mono font-semibold uppercase",
          isConnected ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-400"
        )}>
          {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          <span>{isConnected ? "Live" : "Off"}</span>
        </div>
      </div>

      {/* ── Mobile overlay backdrop ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar (desktop: static | mobile: slide-in overlay) ── */}
      <aside className={cn(
        "fixed md:static inset-y-0 left-0 z-50 w-64 border-r border-border bg-card flex flex-col shadow-xl",
        "transition-transform duration-200 ease-in-out",
        "md:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
        <div className="h-16 flex items-center px-6 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <GeoTrackLogo size={36} />
            <span className="font-mono font-bold tracking-tight text-lg text-foreground truncate">
              GeoTrack<span className="text-primary">224</span>
            </span>
          </div>
          {/* Close button mobile */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1 rounded-md text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
          {/* WS indicator desktop */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "hidden md:flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider shrink-0",
                isConnected ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-400"
              )}>
                {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                <span className="hidden xl:inline">{isConnected ? "Live" : "Off"}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              {isConnected ? "Connexion temps réel active" : "Reconnexion en cours..."}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Nav links */}
        <div className="flex-1 overflow-y-auto py-6 px-3">
          <div className="space-y-1">
            <div className="px-3 text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Plateforme
            </div>
            {navigation.map((item) => (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                    isActive(item.href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                  data-testid={`nav-${item.testId}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.name}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/50 shrink-0">
          <div className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground cursor-pointer transition-colors">
            <Settings className="w-4 h-4 shrink-0" />
            Paramètres système
          </div>
          <div className="mt-2 px-3 py-1.5 flex items-center gap-2">
            <div className={cn(
              "w-1.5 h-1.5 rounded-full shrink-0",
              isConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-400"
            )} />
            <span className="text-[10px] font-mono text-muted-foreground">
              {isConnected ? "Flux WebSocket actif" : "Reconnexion..."}
            </span>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col min-w-0 bg-background relative z-10 pt-14 md:pt-0 pb-16 md:pb-0 overflow-hidden">
        {children}
      </main>

      {/* ── Bottom navigation (mobile only) ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 h-16 bg-card border-t border-border flex items-stretch">
        {navigation.map((item) => (
          <Link key={item.href} href={item.href} className="flex-1">
            <div className={cn(
              "flex flex-col items-center justify-center h-full gap-1 text-[10px] font-mono transition-colors",
              isActive(item.href) ? "text-primary" : "text-muted-foreground"
            )}>
              <item.icon className={cn("w-5 h-5", isActive(item.href) ? "text-primary" : "")} />
              <span className="truncate px-1">{item.name.split(" ")[0]}</span>
            </div>
          </Link>
        ))}
      </nav>
    </div>
  );
}
