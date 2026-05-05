import { Link, useLocation } from "wouter";
import { Bell, Compass, LayoutDashboard, Settings, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { GeoTrackLogo } from "./GeoTrackLogo";
import { useWebsocket } from "@/hooks/use-websocket";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { isConnected } = useWebsocket();

  const navigation = [
    { name: "Tableau de bord", href: "/", icon: LayoutDashboard, testId: "dashboard" },
    { name: "Appareils", href: "/devices", icon: Compass, testId: "devices" },
    { name: "Alertes", href: "/alerts", icon: Bell, testId: "alerts" },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden selection:bg-primary/30">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col shadow-xl z-20 relative">
        <div className="h-16 flex items-center px-6 border-b border-border/50">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <GeoTrackLogo size={36} />
            <span className="font-mono font-bold tracking-tight text-lg text-foreground truncate">GeoTrack<span className="text-primary">224</span></span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider shrink-0",
                isConnected
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-rose-500/10 text-rose-400"
              )}>
                {isConnected
                  ? <Wifi className="w-3 h-3" />
                  : <WifiOff className="w-3 h-3" />}
                <span className="hidden xl:inline">{isConnected ? "Live" : "Off"}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              {isConnected ? "Connexion temps réel active" : "Reconnexion en cours..."}
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3">
          <div className="space-y-1">
            <div className="px-3 text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-2">Plateforme</div>
            {navigation.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link key={item.name} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                    data-testid={`nav-${item.testId}`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t border-border/50">
          <div className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground cursor-pointer transition-colors">
            <Settings className="w-4 h-4" />
            Paramètres système
          </div>
          <div className="mt-2 px-3 py-1.5 flex items-center gap-2">
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              isConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-400"
            )} />
            <span className="text-[10px] font-mono text-muted-foreground">
              {isConnected ? "Flux WebSocket actif" : "Reconnexion..."}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-background relative z-10">
        {children}
      </main>
    </div>
  );
}
