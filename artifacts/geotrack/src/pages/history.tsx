import { useParams } from "wouter";
import { useGetDevice, useGetDeviceHistory } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, Navigation, Activity, Map as MapIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const statusLabels: Record<string, string> = {
  moving: "En mouvement",
  stopped: "À l'arrêt",
  offline: "Hors ligne",
};

const typeLabels: Record<string, string> = {
  vehicle: "Véhicule",
  asset: "Actif",
  person: "Personnel",
  drone: "Drone",
};

export default function History() {
  const { id } = useParams<{ id: string }>();
  const deviceId = parseInt(id || "0", 10);
  
  const { data: device, isLoading: loadingDevice } = useGetDevice(deviceId, { 
    query: { enabled: !!deviceId } 
  });
  
  const { data: history = [], isLoading: loadingHistory } = useGetDeviceHistory(deviceId, { limit: 100 }, {
    query: { enabled: !!deviceId }
  });

  if (loadingDevice) return <div className="p-8 text-center">Chargement de l'appareil...</div>;
  if (!device) return <div className="p-8 text-center text-rose-500">Appareil introuvable</div>;

  return (
    <div className="p-6 h-full flex flex-col max-w-5xl mx-auto w-full">
      <div className="mb-6 flex flex-col gap-4">
        <Link href="/devices">
          <Button variant="ghost" size="sm" className="w-fit text-muted-foreground -ml-3">
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour aux appareils
          </Button>
        </Link>
        <div className="flex justify-between items-end">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold font-mono">{device.name}</h1>
              <Badge variant="outline" className="uppercase">{typeLabels[device.type] || device.type}</Badge>
              <Badge className={
                device.status === 'moving' ? 'bg-emerald-500 hover:bg-emerald-600' :
                device.status === 'stopped' ? 'bg-amber-500 hover:bg-amber-600 text-black' :
                'bg-rose-500 hover:bg-rose-600'
              }>{statusLabels[device.status] || device.status}</Badge>
            </div>
            <p className="text-muted-foreground text-sm font-mono tracking-wider">IMEI : {device.imei}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="md:col-span-2 flex flex-col border border-border/50 rounded-lg overflow-hidden bg-card/50">
          <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center justify-between">
            <h3 className="font-mono font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Chronologie des positions
            </h3>
            <span className="text-xs text-muted-foreground">{history.length} enregistrements</span>
          </div>
          
          <div className="flex-1 overflow-auto p-6">
            {loadingHistory ? (
              <p className="text-center text-muted-foreground font-mono">Chargement de l'historique...</p>
            ) : history.length === 0 ? (
              <p className="text-center text-muted-foreground font-mono">Aucun historique de position enregistré.</p>
            ) : (
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                {history.map((pos) => (
                  <div key={pos.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-card shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow shadow-primary/20 relative z-10 text-primary">
                      <MapIcon className="w-4 h-4" />
                    </div>
                    
                    <Card className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] bg-card border-border/50 shadow-sm transition-all hover:border-primary/50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono font-bold text-sm text-foreground">
                            {format(new Date(pos.timestamp), 'dd MMM, HH:mm:ss', { locale: fr })}
                          </span>
                          {pos.speed > 0 ? (
                            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-mono">
                              {Math.round(pos.speed)} km/h
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground text-[10px] font-mono">À l'arrêt</Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-muted-foreground font-mono mt-3">
                          <div>Lat : {pos.latitude.toFixed(6)}</div>
                          <div>Lng : {pos.longitude.toFixed(6)}</div>
                          {pos.heading !== undefined && (
                            <div className="col-span-2 flex items-center gap-1">
                              <Navigation className="w-3 h-3" style={{ transform: `rotate(${pos.heading}deg)` }} />
                              Cap {Math.round(pos.heading)}°
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6 overflow-y-auto">
          <Card className="bg-card border-border/50 shadow-none">
            <CardContent className="p-5">
              <h3 className="font-mono font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Détails de l'appareil</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <dt className="text-muted-foreground">Groupe</dt>
                  <dd className="font-medium font-mono">{device.groupName || 'Non assigné'}</dd>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <dt className="text-muted-foreground">Limite de vitesse</dt>
                  <dd className="font-medium font-mono">{device.speedLimit ? `${device.speedLimit} km/h` : 'Aucune'}</dd>
                </div>
                <div className="flex justify-between pb-2">
                  <dt className="text-muted-foreground">Enregistré le</dt>
                  <dd className="font-medium font-mono text-xs">{format(new Date(device.createdAt), 'dd MMM yyyy', { locale: fr })}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
