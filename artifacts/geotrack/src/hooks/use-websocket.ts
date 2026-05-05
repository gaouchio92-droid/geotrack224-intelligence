import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetLivePositionsQueryKey, getListAlertsQueryKey, getListDevicesQueryKey, getGetDashboardSummaryQueryKey, AlertSeverity } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export function useWebsocket() {
  const ws = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);

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
            // Update live positions
            queryClient.invalidateQueries({ queryKey: getGetLivePositionsQueryKey() });
          } else if (data.type === 'alert') {
            // Show toast and invalidate alerts
            const severityColor = {
              [AlertSeverity.critical]: "destructive",
              [AlertSeverity.high]: "default",
              [AlertSeverity.medium]: "default",
              [AlertSeverity.low]: "secondary",
            } as const;

            toast({
              title: `Alert: ${data.data?.deviceName || 'Unknown Device'}`,
              description: data.data?.message || 'New alert received',
              variant: severityColor[data.data?.severity as AlertSeverity] || "default"
            });
            queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
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
