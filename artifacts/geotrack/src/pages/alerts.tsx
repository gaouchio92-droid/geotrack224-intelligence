import { useState } from "react";
import { useListAlerts, useAcknowledgeAlert, getListAlertsQueryKey, getGetDashboardSummaryQueryKey, AlertSeverity, AlertType } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDistanceToNow, format } from "date-fns";
import { AlertTriangle, CheckCircle, Clock, Filter, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";


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
        toast({ title: "Alert acknowledged" });
      }
    });
  };

  return (
    <div className="p-6 h-full flex flex-col max-w-6xl mx-auto w-full">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold font-mono uppercase tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-primary" />
            Alerts Log
          </h1>
          <p className="text-muted-foreground mt-1">System warnings and rule violations</p>
        </div>

        <div className="flex gap-3">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]" data-testid="filter-type">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Alert Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value={AlertType.overspeed}>Overspeed</SelectItem>
              <SelectItem value={AlertType.geofence}>Geofence</SelectItem>
              <SelectItem value={AlertType.offline}>Offline</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterAck} onValueChange={setFilterAck}>
            <SelectTrigger className="w-[180px]" data-testid="filter-ack">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="false">Unacknowledged</SelectItem>
              <SelectItem value="true">Acknowledged</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-auto pr-4 space-y-4 pb-12">
        {isLoading ? (
          <div className="text-center p-8 text-muted-foreground font-mono">Loading alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="text-center p-12 border border-dashed rounded-lg text-muted-foreground font-mono">
            No alerts found for the current filters.
          </div>
        ) : alerts.map(alert => (
          <div 
            key={alert.id} 
            className={`p-5 rounded-lg border flex gap-4 transition-all duration-300 ${
              alert.acknowledged ? 'bg-background border-border opacity-75' : 'bg-card border-border shadow-md'
            }`}
            data-testid={`alert-card-${alert.id}`}
          >
            <div className="pt-1">
              {alert.severity === AlertSeverity.critical ? <AlertTriangle className="w-6 h-6 text-rose-500" /> :
               alert.severity === AlertSeverity.high ? <AlertTriangle className="w-6 h-6 text-orange-500" /> :
               alert.severity === AlertSeverity.medium ? <AlertTriangle className="w-6 h-6 text-amber-500" /> :
               <AlertTriangle className="w-6 h-6 text-blue-500" />}
            </div>
            
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-lg">{alert.deviceName || 'Unknown Device'}</h3>
                  <Badge variant={alert.acknowledged ? "outline" : "default"} className={`
                    uppercase font-mono text-[10px] tracking-wider
                    ${!alert.acknowledged && alert.severity === AlertSeverity.critical ? 'bg-rose-500 text-white' : ''}
                    ${!alert.acknowledged && alert.severity === AlertSeverity.high ? 'bg-orange-500 text-white' : ''}
                    ${!alert.acknowledged && alert.severity === AlertSeverity.medium ? 'bg-amber-500 text-black' : ''}
                    ${!alert.acknowledged && alert.severity === AlertSeverity.low ? 'bg-blue-500 text-white' : ''}
                  `}>
                    {alert.severity}
                  </Badge>
                  <Badge variant="outline" className="uppercase font-mono text-[10px]">{alert.type}</Badge>
                </div>
                <div className="flex items-center text-xs text-muted-foreground font-mono gap-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(alert.createdAt), 'MMM dd, HH:mm:ss')} 
                  ({formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })})
                </div>
              </div>
              
              <p className="text-foreground/90">{alert.message}</p>
              
              <div className="mt-4 flex items-center justify-between">
                <div>
                  {alert.acknowledged && (
                    <span className="text-xs text-emerald-500 flex items-center gap-1 font-mono">
                      <CheckCircle className="w-3 h-3" /> 
                      Acknowledged {alert.acknowledgedAt ? formatDistanceToNow(new Date(alert.acknowledgedAt), { addSuffix: true }) : ''}
                    </span>
                  )}
                </div>
                {!alert.acknowledged && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleAcknowledge(alert.id)}
                    disabled={ackMutation.isPending}
                    data-testid={`btn-ack-${alert.id}`}
                  >
                    Acknowledge
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
