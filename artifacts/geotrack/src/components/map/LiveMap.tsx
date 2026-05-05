import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LivePosition, DeviceStatus } from "@workspace/api-client-react";
import { Clock, Navigation, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const typeLabels: Record<string, string> = {
  vehicle: "Véhicule",
  asset: "Actif",
  person: "Personnel",
  drone: "Drone",
};

const statusLabels: Record<string, string> = {
  moving: "En mouvement",
  stopped: "À l'arrêt",
  offline: "Hors ligne",
};

const createCustomIcon = (status: string) => {
  let color = "#ef4444";
  if (status === DeviceStatus.moving) color = "#10b981";
  if (status === DeviceStatus.stopped) color = "#f59e0b";

  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="24" height="24" stroke="white" stroke-width="1.5">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
      <circle cx="12" cy="10" r="3" fill="white"></circle>
    </svg>
  `;
  
  return L.divIcon({
    html: svgIcon,
    className: "custom-leaflet-marker",
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });
};

function MapUpdater({ center, zoom }: { center?: [number, number], zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom(), { animate: true });
    }
  }, [center, zoom, map]);
  return null;
}

interface MapProps {
  positions: LivePosition[];
  selectedDeviceId?: number | null;
  onSelectDevice?: (id: number) => void;
}

export function LiveMap({ positions, selectedDeviceId, onSelectDevice }: MapProps) {
  const defaultCenter: [number, number] = [9.5, -13.7];
  const defaultZoom = 7;
  
  const selectedPosition = positions.find(p => p.deviceId === selectedDeviceId);
  const center = selectedPosition ? [selectedPosition.latitude, selectedPosition.longitude] as [number, number] : defaultCenter;
  const zoom = selectedPosition ? 14 : defaultZoom;

  return (
    <div className="h-full w-full relative z-0" data-testid="live-map">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: "100%", width: "100%", background: "hsl(var(--background))" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="map-tiles"
        />
        <MapUpdater center={center} zoom={zoom} />
        
        {positions.map((pos) => (
          <Marker
            key={pos.deviceId}
            position={[pos.latitude, pos.longitude]}
            icon={createCustomIcon(pos.status)}
            eventHandlers={{
              click: () => onSelectDevice?.(pos.deviceId)
            }}
          >
            <Popup className="custom-popup">
              <div className="p-1 min-w-[200px]" data-testid={`map-popup-${pos.deviceId}`}>
                <div className="font-bold text-sm mb-1">{pos.deviceName}</div>
                <div className="text-xs text-muted-foreground mb-2">
                  {typeLabels[pos.deviceType] || pos.deviceType} • {statusLabels[pos.status] || pos.status}
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-primary" />
                    <span>{Math.round(pos.speed)} km/h</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Navigation className="w-3 h-3 text-primary" />
                    <span>Cap {Math.round(pos.heading)}°</span>
                  </div>
                  <div className="flex items-center gap-1 col-span-2">
                    <Clock className="w-3 h-3 text-primary" />
                    <span>{formatDistanceToNow(new Date(pos.timestamp), { addSuffix: true, locale: fr })}</span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <style>{`
        .map-tiles {
          filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7);
        }
        .leaflet-container {
          background: #0f172a;
          font-family: inherit;
        }
        .leaflet-popup-content-wrapper {
          background: hsl(var(--card));
          color: hsl(var(--card-foreground));
          border-radius: var(--radius);
          border: 1px solid hsl(var(--border));
        }
        .leaflet-popup-tip {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
        }
      `}</style>
    </div>
  );
}
