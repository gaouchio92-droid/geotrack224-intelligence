import { useState } from "react";
import {
  useListAlerts,
  useAcknowledgeAlert,
  getListAlertsQueryKey,
  getGetDashboardSummaryQueryKey,
  AlertSeverity,
  AlertType,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, CheckCircle, Clock, Filter, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const severityConfig: Record<string, { label: string; color: string; badgeCls: string }> = {
  critical: { label: "Critique", color: "text-rose-500",   badgeCls: "bg-rose-500 text-white" },
  high:     { label: "Élevée",   color: "text-orange-500", badgeCls: "bg-orange-500 text-white" },
  medium:   { label: "Moyenne",  color: "text-amber-500",  badgeCls: "bg-amber-500 text-black" },
  low:      { label: "Faible",   color: "text-blue-500",   badgeCls: "bg-blue-500 text-white" },
};

const typeLabels: Record<string, string> = {
  overspeed: "Vitesse",
  geofence:  "Géofence",
  offline:   "Hors ligne",
};

export default function Alerts() {
  const [filterType, setFilterType] = useState<string>("all");
  const [filterAck, setFilterAck] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const params: any = {};
  if (filterType !== "all") params.type = filterType;
  if (filterAck !== "all") params.acknowledged = filterAck === "true";

  const { data: alerts = [], isLoading } = useListAlerts(params);
  const acknowledgeAlert = useAcknowledgeAlert();

  const handleAcknowledge = (id: number) => {
    acknowledgeAlert.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        toast({ title: "Alerte acquittée" });
      },
    });
  };

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col max-w-6xl mx-auto w-full">

      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-mono uppercase tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
            Journal des alertes
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Avertissements système et violations de règles
          </p>
        </div>

        {/* Filters — stack on mobile, row on sm+ */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-[180px]" data-testid="filter-type">
              <Filter className="w-4 h-4 mr-2 shrink-0" />
              <SelectValue placeholder="Type d'alerte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value={AlertType.overspeed}>Excès de vitesse</SelectItem>
              <SelectItem value={AlertType.geofence}>Géofence</SelectItem>
              <SelectItem value={AlertType.offline}>Hors ligne</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterAck} onValueChange={setFilterAck}>
            <SelectTrigger className="w-full sm:w-[180px]" data-testid="filter-ack">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="false">Non acquittées</SelectItem>
              <SelectItem value="true">Acquittées</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Alert list ── */}
      <div className="flex-1 overflow-auto pr-1 sm:pr-4 space-y-3 sm:space-y-4 pb-4">
        {isLoading ? (
          <div className="text-center p-8 text-muted-foreground font-mono">
            Chargement des alertes...
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center p-12 border border-dashed rounded-lg text-muted-foreground font-mono">
            Aucune alerte trouvée pour les filtres actuels.
          </div>
        ) : (
          alerts.map((alert) => {
            const sev = severityConfig[alert.severity] ?? severityConfig.low;
            return (
              <div
                key={alert.id}
                className={`p-4 sm:p-5 rounded-lg border flex gap-3 sm:gap-4 transition-all duration-300 ${
                  alert.acknowledged
                    ? "bg-background border-border opacity-75"
                    : "bg-card border-border shadow-md"
                }`}
                data-testid={`alert-card-${alert.id}`}
              >
                {/* Icon */}
                <div className="pt-0.5 shrink-0">
                  <AlertTriangle className={`w-5 h-5 sm:w-6 sm:h-6 ${sev.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Top row */}
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between mb-2">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <h3 className="font-bold text-base sm:text-lg truncate">
                        {alert.deviceName || "Appareil inconnu"}
                      </h3>
                      <Badge
                        variant={alert.acknowledged ? "outline" : "default"}
                        className={`uppercase font-mono text-[10px] tracking-wider shrink-0 ${
                          !alert.acknowledged ? sev.badgeCls : ""
                        }`}
                      >
                        {sev.label}
                      </Badge>
                      <Badge variant="outline" className="uppercase font-mono text-[10px] shrink-0">
                        {typeLabels[alert.type] ?? alert.type}
                      </Badge>
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center text-xs text-muted-foreground font-mono gap-1 shrink-0">
                      <Clock className="w-3 h-3 shrink-0" />
                      <span className="hidden sm:inline">
                        {format(new Date(alert.createdAt), "dd MMM, HH:mm:ss", { locale: fr })}{" "}
                      </span>
                      ({formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true, locale: fr })})
                    </div>
                  </div>

                  {/* Message */}
                  <p className="text-sm text-foreground/90">{alert.message}</p>

                  {/* Footer */}
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div>
                      {alert.acknowledged && (
                        <span className="text-xs text-emerald-500 flex items-center gap-1 font-mono">
                          <CheckCircle className="w-3 h-3 shrink-0" />
                          Acquittée{" "}
                          {alert.acknowledgedAt
                            ? formatDistanceToNow(new Date(alert.acknowledgedAt), {
                                addSuffix: true,
                                locale: fr,
                              })
                            : ""}
                        </span>
                      )}
                    </div>
                    {!alert.acknowledged && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAcknowledge(alert.id)}
                        disabled={acknowledgeAlert.isPending}
                        data-testid={`btn-ack-${alert.id}`}
                      >
                        Acquitter
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
