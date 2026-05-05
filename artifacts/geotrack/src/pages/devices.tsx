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
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, MapPin, Car, Package, User, Navigation, RadioReceiver } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

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

const TypeIcon = ({ type, className }: { type: string, className?: string }) => {
  switch (type) {
    case DeviceType.vehicle: return <Car className={className} />;
    case DeviceType.asset: return <Package className={className} />;
    case DeviceType.person: return <User className={className} />;
    case DeviceType.drone: return <Navigation className={className} />;
    default: return <RadioReceiver className={className} />;
  }
};

export default function Devices() {
  const { data: devices = [], isLoading } = useListDevices();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    type: DeviceType.vehicle as string,
    imei: "",
    speedLimit: "",
    groupName: ""
  });

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
      setFormData({
        name: "",
        type: DeviceType.vehicle,
        imei: "",
        speedLimit: "",
        groupName: ""
      });
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

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold font-mono uppercase tracking-tight">Gestion des appareils</h1>
          <p className="text-muted-foreground">Gérer toutes les entités suivies dans les opérations</p>
        </div>
        
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenForm()} data-testid="btn-add-device">
              <Plus className="w-4 h-4 mr-2" />
              Enregistrer un appareil
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingDevice ? "Modifier l'appareil" : "Enregistrer un nouvel appareil"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom de l'appareil</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  required 
                  data-testid="input-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
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
                  onChange={e => setFormData({...formData, imei: e.target.value})} 
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
                  onChange={e => setFormData({...formData, speedLimit: e.target.value})} 
                  data-testid="input-speed"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="groupName">Nom du groupe — Optionnel</Label>
                <Input 
                  id="groupName" 
                  value={formData.groupName} 
                  onChange={e => setFormData({...formData, groupName: e.target.value})} 
                  data-testid="input-group"
                />
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={createDevice.isPending || updateDevice.isPending} data-testid="btn-submit-device">
                  {editingDevice ? "Mettre à jour" : "Enregistrer"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-auto border border-border/50 rounded-md bg-card">
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
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Aucun appareil enregistré</TableCell>
              </TableRow>
            ) : devices.map(device => (
              <TableRow key={device.id} data-testid={`device-row-${device.id}`}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${statusColors[device.status as keyof typeof statusColors]}`} />
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
                <TableCell>{device.groupName ? <Badge variant="outline">{device.groupName}</Badge> : '-'}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(device.updatedAt), { addSuffix: true, locale: fr })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/history/${device.id}`}>
                      <Button variant="ghost" size="icon" title="Voir l'historique" data-testid={`btn-history-${device.id}`}>
                        <MapPin className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" onClick={() => handleOpenForm(device)} data-testid={`btn-edit-${device.id}`}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(device.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10" data-testid={`btn-delete-${device.id}`}>
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
