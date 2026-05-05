import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LivePosition, DeviceStatus } from "@workspace/api-client-react";
import { Clock, Navigation, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

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

const STATUS_COLORS: Record<string, string> = {
  [DeviceStatus.moving]: "#10b981",
  [DeviceStatus.stopped]: "#f59e0b",
  [DeviceStatus.offline]: "#ef4444",
};

// SVG shape path per device type (viewBox 0 0 32 32, centered)
const TYPE_SHAPES: Record<string, string> = {
  vehicle: `
    <rect x="4" y="10" width="24" height="13" rx="3" fill="currentColor"/>
    <rect x="8" y="6" width="16" height="8" rx="2" fill="currentColor" opacity="0.85"/>
    <circle cx="9" cy="24" r="3.5" fill="#1e293b" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="23" cy="24" r="3.5" fill="#1e293b" stroke="currentColor" stroke-width="1.5"/>
    <rect x="6" y="13" width="6" height="4" rx="1" fill="#1e293b" opacity="0.4"/>
    <rect x="20" y="13" width="6" height="4" rx="1" fill="#1e293b" opacity="0.4"/>
  `,
  asset: `
    <path d="M6 13 L16 7 L26 13 L26 25 L6 25 Z" fill="currentColor"/>
    <path d="M6 13 L16 7 L26 13 L16 19 Z" fill="currentColor" opacity="0.7"/>
    <line x1="16" y1="19" x2="16" y2="25" stroke="#1e293b" stroke-width="1.5"/>
    <line x1="6" y1="13" x2="26" y2="13" stroke="#1e293b" stroke-width="1"/>
  `,
  person: `
    <circle cx="16" cy="9" r="5" fill="currentColor"/>
    <path d="M6 28 C6 20 26 20 26 28" fill="currentColor"/>
    <rect x="13" y="14" width="6" height="10" rx="2" fill="currentColor"/>
  `,
  drone: `
    <circle cx="16" cy="16" r="4" fill="currentColor"/>
    <line x1="16" y1="12" x2="16" y2="4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="16" y1="20" x2="16" y2="28" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="12" y1="16" x2="4" y2="16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="20" y1="16" x2="28" y2="16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="16" cy="4" r="2.5" fill="currentColor" opacity="0.8"/>
    <circle cx="16" cy="28" r="2.5" fill="currentColor" opacity="0.8"/>
    <circle cx="4" cy="16" r="2.5" fill="currentColor" opacity="0.8"/>
    <circle cx="28" cy="16" r="2.5" fill="currentColor" opacity="0.8"/>
  `,
};

const createCustomIcon = (type: string, status: string, selected: boolean) => {
  const color = STATUS_COLORS[status] || "#94a3b8";
  const shape = TYPE_SHAPES[type] || TYPE_SHAPES.asset;
  const size = selected ? 40 : 32;
  const shadow = selected
    ? `filter: drop-shadow(0 0 6px ${color}cc);`
    : `filter: drop-shadow(0 2px 3px rgba(0,0,0,0.6));`;
  const pulse = status === DeviceStatus.moving
    ? `<circle cx="16" cy="16" r="14" fill="${color}" opacity="0" stroke="${color}" stroke-width="2">
        <animate attributeName="r" from="14" to="22" dur="1.4s" repeatCount="indefinite"/>
        <animate attributeName="opacity" from="0.5" to="0" dur="1.4s" repeatCount="indefinite"/>
       </circle>`
    : "";

  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}"
      style="${shadow} color: ${color};">
      ${pulse}
      <circle cx="16" cy="16" r="14" fill="${color}" opacity="0.18"/>
      <circle cx="16" cy="16" r="13" fill="#0f172a" stroke="${color}" stroke-width="1.5"/>
      ${shape}
    </svg>`;

  return L.divIcon({
    html: svgIcon,
    className: "custom-leaflet-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  });
};

function MapUpdater({ center, zoom }: { center?: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom || map.getZoom(), { animate: true });
  }, [center, zoom, map]);
  return null;
}

interface MapProps {
  positions: LivePosition[];
  selectedDeviceId?: number | null;
  onSelectDevice?: (id: number) => void;
}

const TYPE_BADGE_COLORS: Record<string, string> = {
  vehicle: "#3b82f6",
  asset: "#a855f7",
  person: "#06b6d4",
  drone: "#f97316",
};

export function LiveMap({ positions, selectedDeviceId, onSelectDevice }: MapProps) {
  const defaultCenter: [number, number] = [9.5, -13.7];
  const defaultZoom = 7;

  const selectedPosition = positions.find((p) => p.deviceId === selectedDeviceId);
  const center = selectedPosition
    ? ([selectedPosition.latitude, selectedPosition.longitude] as [number, number])
    : defaultCenter;
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

        {positions.map((pos) => {
          const isSelected = pos.deviceId === selectedDeviceId;
          return (
            <Marker
              key={pos.deviceId}
              position={[pos.latitude, pos.longitude]}
              icon={createCustomIcon(pos.deviceType, pos.status, isSelected)}
              zIndexOffset={isSelected ? 1000 : 0}
              eventHandlers={{ click: () => onSelectDevice?.(pos.deviceId) }}
            >
              <Popup className="custom-popup">
                <div className="p-1 min-w-[210px]" data-testid={`map-popup-${pos.deviceId}`}>
                  {/* En-tête avec badge type */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm">{pos.deviceName}</span>
                    <span
                      className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                      style={{
                        background: `${TYPE_BADGE_COLORS[pos.deviceType] || "#64748b"}22`,
                        color: TYPE_BADGE_COLORS[pos.deviceType] || "#64748b",
                        border: `1px solid ${TYPE_BADGE_COLORS[pos.deviceType] || "#64748b"}55`,
                      }}
                    >
                      {typeLabels[pos.deviceType] || pos.deviceType}
                    </span>
                  </div>

                  {/* Statut */}
                  <div className="flex items-center gap-1.5 mb-3">
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ background: STATUS_COLORS[pos.status] || "#94a3b8" }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {statusLabels[pos.status] || pos.status}
                    </span>
                  </div>

                  {/* Données techniques */}
                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-border/40 pt-2">
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
                      <span>
                        {formatDistanceToNow(new Date(pos.timestamp), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Légende des types */}
      <div className="absolute bottom-6 left-4 z-[400] bg-card/90 backdrop-blur border border-border/50 rounded-md p-2 shadow-lg">
        <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5">Légende</p>
        <div className="space-y-1">
          {Object.entries(typeLabels).map(([type, label]) => (
            <div key={type} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-sm inline-block"
                style={{ background: TYPE_BADGE_COLORS[type] || "#64748b" }}
              />
              <span className="text-[10px] font-mono">{label}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-border/40 mt-1.5 pt-1.5 space-y-1">
          {Object.entries(statusLabels).map(([status, label]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ background: STATUS_COLORS[status] || "#94a3b8" }}
              />
              <span className="text-[10px] font-mono">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .map-tiles {
          filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7);
        }
        .leaflet-container {
          background: #0f172a;
          font-family: inherit;
        }
        .custom-leaflet-marker {
          background: transparent !important;
          border: none !important;
        }
        .leaflet-popup-content-wrapper {
          background: hsl(var(--card));
          color: hsl(var(--card-foreground));
          border-radius: var(--radius);
          border: 1px solid hsl(var(--border));
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
        .leaflet-popup-content {
          margin: 10px 12px;
        }
        .leaflet-popup-tip {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
        }
      `}</style>
    </div>
  );
}
