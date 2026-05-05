import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetLivePositionsQueryKey, getListAlertsQueryKey, getListDevicesQueryKey, getGetDashboardSummaryQueryKey, AlertSeverity } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

const TOAST_THROTTLE_MS = 15_000;

export function useWebsocket() {
  const ws = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const lastToastAt = useRef<number>(0);
  const pendingAlerts = useRef<{ name: string; message: string; critical: boolean }[]>([]);

  useEffect(() => {
    let reconnectTimer: number;

    const connect = () => {
      const wsUrl = window.location.protocol === 'https:' 
        ? 'wss://' + window.location.host + '/ws' 
        : 'ws://' + window.location.host + '/ws';
      
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        setIsConnected(true);
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'position_update') {
            queryClient.invalidateQueries({ queryKey: getGetLivePositionsQueryKey() });
          } else if (data.type === 'alert') {
            queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });

            const isCritical = data.payload?.severity === AlertSeverity.critical;
            const name = data.payload?.deviceName || 'Appareil inconnu';
            const message = data.payload?.message || 'Nouvelle alerte reçue';

            // Accumulate pending alerts
            pendingAlerts.current.push({ name, message, critical: isCritical });

            const now = Date.now();
            const elapsed = now - lastToastAt.current;

            if (elapsed >= TOAST_THROTTLE_MS) {
              // Show immediately — flush pending
              const batch = pendingAlerts.current;
              pendingAlerts.current = [];
              lastToastAt.current = now;

              const count = batch.length;
              const hasCritical = batch.some((a) => a.critical);
              const first = batch[0];

              if (count === 1) {
                toast({
                  title: `Alerte : ${first.name}`,
                  description: first.message,
                  variant: hasCritical ? "destructive" : "default",
                });
              } else {
                toast({
                  title: `${count} nouvelles alertes`,
                  description: `Dont ${batch.filter((a) => a.critical).length} critique(s) — voir le journal`,
                  variant: hasCritical ? "destructive" : "default",
                });
              }
            }
            // else: queued — will surface on next throttle window
          } else if (data.type === 'device_status_change') {
            queryClient.invalidateQueries({ queryKey: getListDevicesQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          }
        } catch (err) {
          console.error('WebSocket message parsing error', err);
        }
      };

      ws.current.onclose = () => {
        setIsConnected(false);
        reconnectTimer = window.setTimeout(connect, 3000);
      };

      ws.current.onerror = (err) => {
        console.error('WebSocket error', err);
        ws.current?.close();
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [queryClient, toast]);

  return { isConnected };
}
