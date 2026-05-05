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
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

const statusColors = {
  [DeviceStatus.moving]: "bg-emerald-500",
  [DeviceStatus.stopped]: "bg-amber-500",
  [DeviceStatus.offline]: "bg-rose-500",
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
          toast({ title: "Device updated successfully" });
          setIsFormOpen(false);
        }
      });
    } else {
      createDevice.mutate({ data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDevicesQueryKey() });
          toast({ title: "Device created successfully" });
          setIsFormOpen(false);
        }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Are you sure you want to delete this device?")) return;
    deleteDevice.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDevicesQueryKey() });
        toast({ title: "Device deleted successfully" });
      }
    });
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold font-mono uppercase tracking-tight">Devices Management</h1>
          <p className="text-muted-foreground">Manage all tracked entities across operations</p>
        </div>
        
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenForm()} data-testid="btn-add-device">
              <Plus className="w-4 h-4 mr-2" />
              Register Device
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingDevice ? "Edit Device" : "Register New Device"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Device Name</Label>
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
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(DeviceType).map(t => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="imei">IMEI / Identifier</Label>
                <Input 
                  id="imei" 
                  value={formData.imei} 
                  onChange={e => setFormData({...formData, imei: e.target.value})} 
                  required 
                  data-testid="input-imei"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="speedLimit">Speed Limit (km/h) - Optional</Label>
                <Input 
                  id="speedLimit" 
                  type="number"
                  value={formData.speedLimit} 
                  onChange={e => setFormData({...formData, speedLimit: e.target.value})} 
                  data-testid="input-speed"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="groupName">Group Name - Optional</Label>
                <Input 
                  id="groupName" 
                  value={formData.groupName} 
                  onChange={e => setFormData({...formData, groupName: e.target.value})} 
                  data-testid="input-group"
                />
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={createDevice.isPending || updateDevice.isPending} data-testid="btn-submit-device">
                  {editingDevice ? "Update" : "Register"}
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
              <TableHead>Status</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>IMEI</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">Loading devices...</TableCell>
              </TableRow>
            ) : devices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No devices registered</TableCell>
              </TableRow>
            ) : devices.map(device => (
              <TableRow key={device.id} data-testid={`device-row-${device.id}`}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${statusColors[device.status as keyof typeof statusColors]}`} />
                    <span className="capitalize text-xs font-mono">{device.status}</span>
                  </div>
                </TableCell>
                <TableCell className="font-medium">{device.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <TypeIcon type={device.type} className="w-4 h-4 text-muted-foreground" />
                    <span className="capitalize">{device.type}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{device.imei}</TableCell>
                <TableCell>{device.groupName ? <Badge variant="outline">{device.groupName}</Badge> : '-'}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(device.updatedAt), { addSuffix: true })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/history/${device.id}`}>
                      <Button variant="ghost" size="icon" title="View History" data-testid={`btn-history-${device.id}`}>
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
