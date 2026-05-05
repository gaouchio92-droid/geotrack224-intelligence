import { useState } from "react";
import {
  useGetDashboardSummary,
  useGetLivePositions,
  useListAlerts,
} from "@workspace/api-client-react";
import { LiveMap } from "@/components/map/LiveMap";
import { useWebsocket } from "@/hooks/use-websocket";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertTriangle, Car, CheckCircle2, List, Map as MapIcon,
  Navigation, Package, RadioReceiver, ShieldAlert, User, Zap,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { DeviceStatus, DeviceType, AlertSeverity } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

const statusColors = {
  [DeviceStatus.moving]: "bg-emerald-500",
  [DeviceStatus.stopped]: "bg-amber-500",
  [DeviceStatus.offline]: "bg-rose-500",
};

const typeLabels: Record<string, string> = {
  vehicle: "Véhicule",
  asset: "Actif",
  person: "Personnel",
  drone: "Drone",
};

const TypeIcon = ({ type, className }: { type: string; className?: string }) => {
  switch (type) {
    case DeviceType.vehicle: return <Car className={className} />;
    case DeviceType.asset: return <Package className={className} />;
    case DeviceType.person: return <User className={className} />;
    case DeviceType.drone: return <Navigation className={className} />;
    default: return <RadioReceiver className={className} />;
  }
};

export default function Dashboard() {
  useWebsocket();

  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [mobileView, setMobileView] = useState<"map" | "list">("map");
  const [alertsExpanded, setAlertsExpanded] = useState(false);

  const { data: summary } = useGetDashboardSummary();
  const { data: positions = [] } = useGetLivePositions();
  const { data: alerts = [] } = useListAlerts({ limit: 10 });

  const filteredPositions = positions.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (typeFilter !== "all" && p.deviceType !== typeFilter) return false;
    return true;
  });

  const stats = [
    {
      label: "Total Appareils",
      value: summary?.totalDevices ?? 0,
      icon: RadioReceiver,
      color: "text-foreground",
      bg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      label: "En mouvement",
      value: summary?.movingCount ?? 0,
      icon: Zap,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      iconColor: "text-emerald-500",
    },
    {
      label: "À l'arrêt",
      value: summary?.stoppedCount ?? 0,
      icon: CheckCircle2,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      iconColor: "text-amber-500",
    },
    {
      label: "Hors ligne",
      value: summary?.offlineCount ?? 0,
      icon: AlertTriangle,
      color: "text-rose-500",
      bg: "bg-rose-500/10",
      iconColor: "text-rose-500",
    },
    {
      label: "Alertes actives",
      value: summary?.activeAlerts ?? 0,
      icon: ShieldAlert,
      color: "text-primary",
      bg: "bg-primary/10",
      iconColor: "text-primary",
    },
  ];

  const deviceList = (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="p-3 border-b border-border/50 space-y-2 bg-card shrink-0">
        <h2 className="font-mono font-bold uppercase tracking-wider text-xs text-muted-foreground px-1">
          Liste des cibles
        </h2>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs bg-background/50 flex-1">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value={DeviceStatus.moving}>En mouvement</SelectItem>
              <SelectItem value={DeviceStatus.stopped}>À l'arrêt</SelectItem>
              <SelectItem value={DeviceStatus.offline}>Hors ligne</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 text-xs bg-background/50 flex-1">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value={DeviceType.vehicle}>Véhicules</SelectItem>
              <SelectItem value={DeviceType.asset}>Actifs</SelectItem>
              <SelectItem value={DeviceType.person}>Personnel</SelectItem>
              <SelectItem value={DeviceType.drone}>Drones</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Device rows */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-1">
          {filteredPositions.map((pos) => (
            <div
              key={pos.deviceId}
              className={cn(
                "p-3 rounded-md cursor-pointer transition-colors border",
                selectedDeviceId === pos.deviceId
                  ? "bg-primary/10 border-primary/30"
                  : "bg-background/50 border-transparent hover:border-border"
              )}
              onClick={() => {
                setSelectedDeviceId(pos.deviceId);
                setMobileView("map");
              }}
              data-testid={`device-item-${pos.deviceId}`}
            >
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className={`w-3 h-3 rounded-full ${statusColors[pos.status as keyof typeof statusColors]}`} />
                  {pos.status === "moving" && (
                    <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm truncate">{pos.deviceName}</span>
                    {pos.speed > 0 && (
                      <Badge
                        variant="secondary"
                        className="font-mono text-[10px] px-1.5 py-0 rounded-sm bg-primary/10 text-primary shrink-0 ml-2"
                      >
                        {Math.round(pos.speed)} km/h
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <TypeIcon type={pos.deviceType} className="w-3 h-3 shrink-0" />
                    <span className="shrink-0">{typeLabels[pos.deviceType] || pos.deviceType}</span>
                    <span>•</span>
                    <span className="truncate">
                      {formatDistanceToNow(new Date(pos.timestamp), { addSuffix: true, locale: fr })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredPositions.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground font-mono">
              Aucune cible ne correspond aux critères.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2 p-3 border-b border-border/50 bg-card z-10 shadow-sm relative shrink-0">
        {stats.map((s) => (
          <Card key={s.label} className="bg-background/50 border-border/50 shadow-none">
            <CardContent className="p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-0.5 truncate">
                  {s.label}
                </p>
                <p className={cn("text-xl sm:text-2xl font-bold font-mono", s.color)}>
                  {s.value}
                </p>
              </div>
              <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0", s.bg)}>
                <s.icon className={cn("w-4 h-4", s.iconColor)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Mobile tab switcher ── */}
      <div className="md:hidden flex border-b border-border/50 bg-card shrink-0">
        <button
          onClick={() => setMobileView("map")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-mono font-medium transition-colors border-b-2",
            mobileView === "map"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <MapIcon className="w-4 h-4" />
          Carte
        </button>
        <button
          onClick={() => setMobileView("list")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-mono font-medium transition-colors border-b-2",
            mobileView === "list"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <List className="w-4 h-4" />
          Liste ({filteredPositions.length})
        </button>
      </div>

      {/* ── Main area ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">

        {/* Device list — desktop always visible | mobile controlled by tab */}
        <div className={cn(
          "flex-col border-r border-border/50 bg-card shadow-[4px_0_24px_rgba(0,0,0,0.2)] z-10 relative",
          "hidden md:flex md:w-80",
          mobileView === "list" ? "!flex flex-col w-full" : ""
        )}>
          {deviceList}
        </div>

        {/* Map — desktop always visible | mobile controlled by tab */}
        <div className={cn(
          "flex-1 relative z-0",
          "hidden md:block",
          mobileView === "map" ? "!block" : ""
        )}>
          <LiveMap
            positions={filteredPositions}
            selectedDeviceId={selectedDeviceId}
            onSelectDevice={(id) => {
              setSelectedDeviceId(id);
            }}
          />

          {/* Alert overlay — collapsible pill */}
          {alerts.length > 0 && (
            <div className="absolute top-4 right-4 z-[400] flex flex-col items-end gap-2">
              {/* Toggle badge */}
              <button
                onClick={() => setAlertsExpanded((v) => !v)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-bold shadow-xl border transition-colors",
                  alerts.some((a) => a.severity === AlertSeverity.critical)
                    ? "bg-rose-500 text-white border-rose-600 hover:bg-rose-600"
                    : "bg-card/95 backdrop-blur border-border text-foreground hover:bg-card"
                )}
              >
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>{alerts.filter((a) => !a.acknowledged).length} alerte{alerts.filter((a) => !a.acknowledged).length > 1 ? "s" : ""}</span>
                <span className="opacity-60">{alertsExpanded ? "▲" : "▼"}</span>
              </button>

              {/* Expanded cards */}
              {alertsExpanded && (
                <div className="w-72 sm:w-80 space-y-2 pointer-events-none">
                  {alerts.filter((a) => !a.acknowledged).slice(0, 4).map((alert) => (
                    <Card
                      key={alert.id}
                      className={cn(
                        "pointer-events-auto border-l-4 shadow-xl bg-card/95 backdrop-blur",
                        alert.severity === AlertSeverity.critical ? "border-l-rose-500" :
                        alert.severity === AlertSeverity.high ? "border-l-orange-500" :
                        alert.severity === AlertSeverity.medium ? "border-l-amber-500" : "border-l-blue-500"
                      )}
                    >
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start mb-1 gap-2">
                          <span className="font-mono font-bold text-xs uppercase tracking-wider truncate">
                            {alert.deviceName}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                            {formatDistanceToNow(new Date(alert.createdAt), { locale: fr })}
                          </span>
                        </div>
                        <p className="text-xs text-foreground/80 leading-snug">{alert.message}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
