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
import { AlertTriangle, Car, CheckCircle2, Navigation, Package, RadioReceiver, ShieldAlert, User, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { DeviceStatus, DeviceType, AlertSeverity } from "@workspace/api-client-react";

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

const TypeIcon = ({ type, className }: { type: string, className?: string }) => {
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

  const { data: summary } = useGetDashboardSummary();
  const { data: positions = [] } = useGetLivePositions();
  const { data: alerts = [] } = useListAlerts({ limit: 10 });
  
  const filteredPositions = positions.filter(p => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (typeFilter !== "all" && p.deviceType !== typeFilter) return false;
    return true;
  });

  return (
    <div className="flex h-full flex-col">
      {/* Barre de statistiques */}
      <div className="grid grid-cols-5 gap-4 p-4 border-b border-border/50 bg-card z-10 shadow-sm relative">
        <Card className="bg-background/50 border-border/50 shadow-none">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1">Total Appareils</p>
              <p className="text-2xl font-bold font-mono">{summary?.totalDevices || 0}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <RadioReceiver className="w-5 h-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-background/50 border-border/50 shadow-none">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1">En mouvement</p>
              <p className="text-2xl font-bold font-mono text-emerald-500">{summary?.movingCount || 0}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-background/50 border-border/50 shadow-none">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1">À l'arrêt</p>
              <p className="text-2xl font-bold font-mono text-amber-500">{summary?.stoppedCount || 0}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-background/50 border-border/50 shadow-none">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1">Hors ligne</p>
              <p className="text-2xl font-bold font-mono text-rose-500">{summary?.offlineCount || 0}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-background/50 border-border/50 shadow-none">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1">Alertes actives</p>
              <p className="text-2xl font-bold font-mono text-primary">{summary?.activeAlerts || 0}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Zone principale */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Panneau latéral des appareils */}
        <div className="w-80 flex flex-col border-r border-border/50 bg-card shadow-[4px_0_24px_rgba(0,0,0,0.2)] z-10 relative">
          <div className="p-4 border-b border-border/50 space-y-3 bg-card">
            <h2 className="font-mono font-bold uppercase tracking-wider text-sm">Liste des cibles</h2>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs bg-background/50">
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
                <SelectTrigger className="h-8 text-xs bg-background/50">
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
          <ScrollArea className="flex-1 p-2">
            <div className="space-y-1">
              {filteredPositions.map((pos) => (
                <div 
                  key={pos.deviceId}
                  className={`p-3 rounded-md cursor-pointer transition-colors border ${selectedDeviceId === pos.deviceId ? 'bg-primary/10 border-primary/30' : 'bg-background/50 border-transparent hover:border-border'}`}
                  onClick={() => setSelectedDeviceId(pos.deviceId)}
                  data-testid={`device-item-${pos.deviceId}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className={`w-3 h-3 rounded-full ${statusColors[pos.status as keyof typeof statusColors]}`} />
                      {pos.status === 'moving' && (
                        <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-sm truncate">{pos.deviceName}</span>
                        {pos.speed > 0 && (
                          <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 rounded-sm bg-primary/10 text-primary">
                            {Math.round(pos.speed)} km/h
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <TypeIcon type={pos.deviceType} className="w-3 h-3" />
                        <span>{typeLabels[pos.deviceType] || pos.deviceType}</span>
                        <span>•</span>
                        <span className="truncate">{formatDistanceToNow(new Date(pos.timestamp), { addSuffix: true, locale: fr })}</span>
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

        {/* Zone de carte */}
        <div className="flex-1 relative z-0">
          <LiveMap 
            positions={filteredPositions} 
            selectedDeviceId={selectedDeviceId}
            onSelectDevice={setSelectedDeviceId}
          />
          
          {/* Alertes superposées */}
          <div className="absolute top-4 right-4 w-80 space-y-2 z-[400] pointer-events-none">
            {alerts.slice(0, 3).map(alert => (
              <Card key={alert.id} className={`pointer-events-auto border-l-4 shadow-xl bg-card/95 backdrop-blur ${
                alert.severity === AlertSeverity.critical ? 'border-l-rose-500' :
                alert.severity === AlertSeverity.high ? 'border-l-orange-500' :
                alert.severity === AlertSeverity.medium ? 'border-l-amber-500' : 'border-l-blue-500'
              }`}>
                <CardContent className="p-3">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-mono font-bold text-xs uppercase tracking-wider">{alert.deviceName}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{formatDistanceToNow(new Date(alert.createdAt), { locale: fr })}</span>
                  </div>
                  <p className="text-sm">{alert.message}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
