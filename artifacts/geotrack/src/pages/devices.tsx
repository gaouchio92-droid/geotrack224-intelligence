import { useState } from "react";
import {
  useListDevices,
  useCreateDevice,
  useUpdateDevice,
  useDeleteDevice,
  getListDevicesQueryKey,
  Device, DeviceType, DeviceStatus
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, MapPin, Car, Package, User, Navigation, RadioReceiver } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const statusColors = {
  [DeviceStatus.moving]: "bg-emerald-500",
  [DeviceStatus.stopped]: "bg-amber-500",
  [DeviceStatus.offline]: "bg-rose-500",
};

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

const TypeIcon = ({ type, className }: { type: string; className?: string }) => {
  switch (type) {
    case DeviceType.vehicle: return <Car className={className} />;
    case DeviceType.asset: return <Package className={className} />;
    case DeviceType.person: return <User className={className} />;
    case DeviceType.drone: return <Navigation className={className} />;
    default: return <RadioReceiver className={className} />;
  }
};

const TYPE_COLORS: Record<string, string> = {
  vehicle: "text-blue-400 bg-blue-500/10",
  asset:   "text-purple-400 bg-purple-500/10",
  person:  "text-cyan-400 bg-cyan-500/10",
  drone:   "text-orange-400 bg-orange-500/10",
};

interface DeviceFormData {
  name: string;
  type: string;
  imei: string;
  speedLimit: string;
  groupName: string;
}

const defaultForm: DeviceFormData = {
  name: "", type: DeviceType.vehicle, imei: "", speedLimit: "", groupName: ""
};

export default function Devices() {
  const { data: devices = [], isLoading } = useListDevices();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [formData, setFormData] = useState<DeviceFormData>(defaultForm);

  const createDevice = useCreateDevice();
  const updateDevice = useUpdateDevice();
  const deleteDevice = useDeleteDevice();

  const handleOpenForm = (device?: Device) => {
    if (device) {
      setEditingDevice(device);
      setFormData({
        name: device.name,
        type: device.type,
        imei: device.imei,
        speedLimit: device.speedLimit?.toString() || "",
        groupName: device.groupName || ""
      });
    } else {
      setEditingDevice(null);
      setFormData(defaultForm);
    }
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      type: formData.type as any,
      imei: formData.imei,
      speedLimit: formData.speedLimit ? Number(formData.speedLimit) : undefined,
      groupName: formData.groupName || undefined
    };

    if (editingDevice) {
      updateDevice.mutate({ id: editingDevice.id, data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDevicesQueryKey() });
          toast({ title: "Appareil mis à jour avec succès" });
          setIsFormOpen(false);
        }
      });
    } else {
      createDevice.mutate({ data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDevicesQueryKey() });
          toast({ title: "Appareil enregistré avec succès" });
          setIsFormOpen(false);
        }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet appareil ?")) return;
    deleteDevice.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDevicesQueryKey() });
        toast({ title: "Appareil supprimé avec succès" });
      }
    });
  };

  const formDialog = (
    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => handleOpenForm()} data-testid="btn-add-device" size="sm" className="sm:size-auto">
          <Plus className="w-4 h-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Enregistrer un appareil</span>
          <span className="sm:hidden">Ajouter</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingDevice ? "Modifier l'appareil" : "Enregistrer un nouvel appareil"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom de l'appareil</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
              data-testid="input-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v })}>
              <SelectTrigger data-testid="select-type">
                <SelectValue placeholder="Sélectionner un type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DeviceType.vehicle}>Véhicule</SelectItem>
                <SelectItem value={DeviceType.asset}>Actif</SelectItem>
                <SelectItem value={DeviceType.person}>Personnel</SelectItem>
                <SelectItem value={DeviceType.drone}>Drone</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="imei">IMEI / Identifiant</Label>
            <Input
              id="imei"
              value={formData.imei}
              onChange={e => setFormData({ ...formData, imei: e.target.value })}
              required
              data-testid="input-imei"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="speedLimit">Limite de vitesse (km/h) — Optionnel</Label>
            <Input
              id="speedLimit"
              type="number"
              value={formData.speedLimit}
              onChange={e => setFormData({ ...formData, speedLimit: e.target.value })}
              data-testid="input-speed"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="groupName">Nom du groupe — Optionnel</Label>
            <Input
              id="groupName"
              value={formData.groupName}
              onChange={e => setFormData({ ...formData, groupName: e.target.value })}
              data-testid="input-group"
            />
          </div>
          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={createDevice.isPending || updateDevice.isPending}
              data-testid="btn-submit-device"
            >
              {editingDevice ? "Mettre à jour" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4 sm:mb-6 gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold font-mono uppercase tracking-tight truncate">
            Gestion des appareils
          </h1>
          <p className="text-muted-foreground text-sm hidden sm:block">
            Gérer toutes les entités suivies dans les opérations
          </p>
        </div>
        {formDialog}
      </div>

      {/* ── Mobile card view (< md) ── */}
      <div className="md:hidden flex-1 overflow-auto -mx-4 px-4">
        {isLoading ? (
          <div className="text-center p-8 text-muted-foreground font-mono">Chargement...</div>
        ) : devices.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground font-mono">Aucun appareil enregistré</div>
        ) : (
          <div className="space-y-3 pb-4">
            {devices.map((device) => (
              <div
                key={device.id}
                className="bg-card border border-border/50 rounded-lg p-4 space-y-3"
                data-testid={`device-row-${device.id}`}
              >
                {/* Top: status dot + name + type badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn("w-2.5 h-2.5 rounded-full shrink-0 mt-0.5", statusColors[device.status as keyof typeof statusColors])} />
                    <span className="font-bold font-mono truncate">{device.name}</span>
                  </div>
                  <div className={cn(
                    "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold shrink-0",
                    TYPE_COLORS[device.type] || "text-muted-foreground bg-muted"
                  )}>
                    <TypeIcon type={device.type} className="w-3 h-3" />
                    {typeLabels[device.type] || device.type}
                  </div>
                </div>

                {/* Middle: status + IMEI + group */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-mono block mb-0.5">Statut</span>
                    <span>{statusLabels[device.status] || device.status}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-mono block mb-0.5">Groupe</span>
                    <span>{device.groupName ? (
                      <Badge variant="outline" className="text-[10px]">{device.groupName}</Badge>
                    ) : "—"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] uppercase tracking-wider font-mono block mb-0.5">IMEI</span>
                    <span className="font-mono">{device.imei}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] uppercase tracking-wider font-mono block mb-0.5">Mise à jour</span>
                    <span>{formatDistanceToNow(new Date(device.updatedAt), { addSuffix: true, locale: fr })}</span>
                  </div>
                </div>

                {/* Bottom: actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                  <Link href={`/history/${device.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full text-xs gap-1.5" data-testid={`btn-history-${device.id}`}>
                      <MapPin className="w-3.5 h-3.5" />
                      Historique
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs gap-1.5"
                    onClick={() => handleOpenForm(device)}
                    data-testid={`btn-edit-${device.id}`}
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Modifier
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(device.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    data-testid={`btn-delete-${device.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Desktop table view (>= md) ── */}
      <div className="hidden md:flex flex-1 overflow-auto border border-border/50 rounded-md bg-card">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur">
            <TableRow>
              <TableHead>Statut</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>IMEI</TableHead>
              <TableHead>Groupe</TableHead>
              <TableHead>Dernière mise à jour</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">Chargement des appareils...</TableCell>
              </TableRow>
            ) : devices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Aucun appareil enregistré
                </TableCell>
              </TableRow>
            ) : devices.map((device) => (
              <TableRow key={device.id} data-testid={`device-row-${device.id}`}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2.5 h-2.5 rounded-full", statusColors[device.status as keyof typeof statusColors])} />
                    <span className="text-xs font-mono">{statusLabels[device.status] || device.status}</span>
                  </div>
                </TableCell>
                <TableCell className="font-medium">{device.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <TypeIcon type={device.type} className="w-4 h-4 text-muted-foreground" />
                    <span>{typeLabels[device.type] || device.type}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{device.imei}</TableCell>
                <TableCell>
                  {device.groupName ? <Badge variant="outline">{device.groupName}</Badge> : "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(device.updatedAt), { addSuffix: true, locale: fr })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/history/${device.id}`}>
                      <Button variant="ghost" size="icon" title="Voir l'historique" data-testid={`btn-history-${device.id}`}>
                        <MapPin className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenForm(device)}
                      data-testid={`btn-edit-${device.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(device.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      data-testid={`btn-delete-${device.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
