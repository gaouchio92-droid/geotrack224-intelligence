import { Link, useLocation } from "wouter";
import { Activity, Bell, Compass, LayoutDashboard, Map as MapIcon, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Devices", href: "/devices", icon: Compass },
    { name: "Alerts", href: "/alerts", icon: Bell },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden selection:bg-primary/30">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col shadow-xl z-20 relative">
        <div className="h-16 flex items-center px-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <MapIcon className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-mono font-bold tracking-tight text-lg text-foreground">GeoTrack<span className="text-primary">224</span></span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3">
          <div className="space-y-1">
            <div className="px-3 text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-2">Platform</div>
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
                    data-testid={`nav-${item.name.toLowerCase()}`}
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
            System Settings
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
