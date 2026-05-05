import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListGroups,
  useCreateGroup,
  useUpdateGroup,
  useDeleteGroup,
  useListUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useListDevices,
  useAssignDevice,
  getListGroupsQueryKey,
  getListUsersQueryKey,
  getListDevicesQueryKey,
} from "@workspace/api-client-react";
import { Pencil, Plus, Trash2, Users, Layers, LinkIcon } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  operator: "Opérateur",
  viewer: "Observateur",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  operator: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  viewer: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

const COLOR_PALETTE = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#06b6d4", "#3b82f6", "#64748b", "#a16207",
];

const DEVICE_TYPE_LABELS: Record<string, string> = {
  vehicle: "Véhicule",
  asset: "Actif",
  person: "Personnel",
  drone: "Drone",
};

// ─── Groups Tab ──────────────────────────────────────────────────────────────

function GroupsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: groups, isLoading } = useListGroups();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<{ id: number; name: string; description?: string | null; color: string } | null>(null);
  const [form, setForm] = useState({ name: "", description: "", color: "#6366f1" });

  const createMutation = useCreateGroup({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListGroupsQueryKey() });
        setDialogOpen(false);
        toast({ title: "Groupe créé", description: form.name });
      },
      onError: () => toast({ title: "Erreur", description: "Impossible de créer le groupe", variant: "destructive" }),
    },
  });

  const updateMutation = useUpdateGroup({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListGroupsQueryKey() });
        setDialogOpen(false);
        toast({ title: "Groupe mis à jour" });
      },
      onError: () => toast({ title: "Erreur", description: "Impossible de mettre à jour", variant: "destructive" }),
    },
  });

  const deleteMutation = useDeleteGroup({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListGroupsQueryKey() });
        toast({ title: "Groupe supprimé" });
      },
      onError: () => toast({ title: "Erreur", description: "Impossible de supprimer", variant: "destructive" }),
    },
  });

  function openCreate() {
    setEditingGroup(null);
    setForm({ name: "", description: "", color: "#6366f1" });
    setDialogOpen(true);
  }

  function openEdit(g: NonNullable<typeof groups>[number]) {
    setEditingGroup({ id: g.id, name: g.name, description: g.description, color: g.color });
    setForm({ name: g.name, description: g.description ?? "", color: g.color });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim()) return;
    if (editingGroup) {
      updateMutation.mutate({ id: editingGroup.id, data: { name: form.name, description: form.description || undefined, color: form.color } });
    } else {
      createMutation.mutate({ data: { name: form.name, description: form.description || undefined, color: form.color } });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Groupes</h2>
          <p className="text-sm text-muted-foreground">Organisez vos appareils par groupe</p>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Nouveau groupe
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10">Couleur</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead className="text-right">Appareils</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!groups?.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10 text-sm">
                    Aucun groupe créé
                  </TableCell>
                </TableRow>
              ) : (
                groups.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell>
                      <div className="w-5 h-5 rounded-full border border-border/50 shrink-0" style={{ backgroundColor: g.color }} />
                    </TableCell>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{g.description ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{(g as any).deviceCount ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(g)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate({ id: g.id })}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGroup ? "Modifier le groupe" : "Nouveau groupe"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="group-name">Nom *</Label>
              <Input
                id="group-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex : Véhicules Nord"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="group-desc">Description</Label>
              <Input
                id="group-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optionnel"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Couleur</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className="w-6 h-6 rounded-full border-2 transition-all"
                    style={{
                      backgroundColor: c,
                      borderColor: form.color === c ? "white" : "transparent",
                      boxShadow: form.color === c ? `0 0 0 2px ${c}` : undefined,
                    }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={isPending || !form.name.trim()}>
              {isPending ? "Enregistrement..." : editingGroup ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Users Tab ───────────────────────────────────────────────────────────────

function UsersTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: users, isLoading } = useListUsers();
  const { data: groups } = useListGroups();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<{ id: number } | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "operator", groupId: "" });

  const createMutation = useCreateUser({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
        setDialogOpen(false);
        toast({ title: "Utilisateur créé" });
      },
      onError: () => toast({ title: "Erreur", description: "Impossible de créer l'utilisateur", variant: "destructive" }),
    },
  });

  const updateMutation = useUpdateUser({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
        setDialogOpen(false);
        toast({ title: "Utilisateur mis à jour" });
      },
      onError: () => toast({ title: "Erreur", description: "Impossible de mettre à jour", variant: "destructive" }),
    },
  });

  const deleteMutation = useDeleteUser({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast({ title: "Utilisateur supprimé" });
      },
      onError: () => toast({ title: "Erreur", description: "Impossible de supprimer", variant: "destructive" }),
    },
  });

  const NO_GROUP = "none";

  function openCreate() {
    setEditingUser(null);
    setForm({ name: "", email: "", role: "operator", groupId: NO_GROUP });
    setDialogOpen(true);
  }

  function openEdit(u: NonNullable<typeof users>[number]) {
    setEditingUser({ id: u.id });
    setForm({ name: u.name, email: u.email, role: u.role, groupId: u.groupId ? String(u.groupId) : NO_GROUP });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.email.trim()) return;
    const payload = {
      name: form.name,
      email: form.email,
      role: form.role as "admin" | "operator" | "viewer",
      groupId: form.groupId && form.groupId !== NO_GROUP ? parseInt(form.groupId) : undefined,
    };
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data: payload });
    } else {
      createMutation.mutate({ data: payload });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Utilisateurs</h2>
          <p className="text-sm text-muted-foreground">Gérez les accès à la plateforme</p>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Nouvel utilisateur
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Nom</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead className="hidden lg:table-cell">Groupe</TableHead>
                <TableHead className="text-right hidden md:table-cell">Appareils</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!users?.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10 text-sm">
                    Aucun utilisateur créé
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm font-mono">{u.email}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_COLORS[u.role] ?? ROLE_COLORS.viewer}`}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {(u as any).groupName ? (
                        <span className="text-sm text-muted-foreground">{(u as any).groupName}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm hidden md:table-cell">{(u as any).deviceCount ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(u)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate({ id: u.id })}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Modifier l'utilisateur" : "Nouvel utilisateur"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="user-name">Nom complet *</Label>
              <Input
                id="user-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex : Ibrahima Diallo"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-email">Email *</Label>
              <Input
                id="user-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="ibrahima@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-role">Rôle</Label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
                <SelectTrigger id="user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="operator">Opérateur</SelectItem>
                  <SelectItem value="viewer">Observateur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-group">Groupe (optionnel)</Label>
              <Select value={form.groupId} onValueChange={(v) => setForm((f) => ({ ...f, groupId: v }))}>
                <SelectTrigger id="user-group">
                  <SelectValue placeholder="Aucun groupe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun groupe</SelectItem>
                  {groups?.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: g.color }} />
                        {g.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={isPending || !form.name.trim() || !form.email.trim()}>
              {isPending ? "Enregistrement..." : editingUser ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Assignments Tab ──────────────────────────────────────────────────────────

function AssignmentsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: devices, isLoading } = useListDevices();
  const { data: groups } = useListGroups();
  const { data: users } = useListUsers();

  const assignMutation = useAssignDevice({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListDevicesQueryKey() });
        qc.invalidateQueries({ queryKey: getListGroupsQueryKey() });
        qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast({ title: "Assignation mise à jour" });
      },
      onError: () => toast({ title: "Erreur", description: "Impossible d'assigner", variant: "destructive" }),
    },
  });

  const NO_ASSIGN = "none";

  function handleGroupChange(deviceId: number, groupId: string) {
    assignMutation.mutate({
      id: deviceId,
      data: { groupId: groupId && groupId !== NO_ASSIGN ? parseInt(groupId) : null },
    });
  }

  function handleUserChange(deviceId: number, userId: string) {
    assignMutation.mutate({
      id: deviceId,
      data: { userId: userId && userId !== NO_ASSIGN ? parseInt(userId) : null },
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Assignations</h2>
        <p className="text-sm text-muted-foreground">Associez chaque appareil à un groupe et/ou un utilisateur responsable</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Appareil</TableHead>
                <TableHead className="hidden sm:table-cell">Type</TableHead>
                <TableHead>Groupe</TableHead>
                <TableHead>Responsable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!devices?.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-10 text-sm">
                    Aucun appareil disponible
                  </TableCell>
                </TableRow>
              ) : (
                devices.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">{d.name}</div>
                        <div className="text-xs text-muted-foreground/60 font-mono">{d.imei}</div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-sm text-muted-foreground">{DEVICE_TYPE_LABELS[d.type] ?? d.type}</span>
                    </TableCell>
                    <TableCell className="min-w-[140px]">
                      <Select
                        value={(d as any).groupId ? String((d as any).groupId) : "none"}
                        onValueChange={(v) => handleGroupChange(d.id, v)}
                        disabled={assignMutation.isPending}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Aucun groupe" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Aucun groupe</SelectItem>
                          {groups?.map((g) => (
                            <SelectItem key={g.id} value={String(g.id)}>
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: g.color }} />
                                {g.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="min-w-[140px]">
                      <Select
                        value={(d as any).userId ? String((d as any).userId) : "none"}
                        onValueChange={(v) => handleUserChange(d.id, v)}
                        disabled={assignMutation.isPending}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Aucun responsable" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Aucun responsable</SelectItem>
                          {users?.map((u) => (
                            <SelectItem key={u.id} value={String(u.id)}>
                              {u.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Settings() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-border shrink-0">
        <h1 className="text-xl font-bold tracking-tight">Paramètres système</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gestion des groupes, utilisateurs et assignations</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <Tabs defaultValue="groups" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-flex">
            <TabsTrigger value="groups" className="gap-1.5 text-xs sm:text-sm">
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline">Groupes</span>
              <span className="xs:hidden">Grp.</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5 text-xs sm:text-sm">
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline">Utilisateurs</span>
              <span className="xs:hidden">Util.</span>
            </TabsTrigger>
            <TabsTrigger value="assignments" className="gap-1.5 text-xs sm:text-sm">
              <LinkIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline">Assignations</span>
              <span className="xs:hidden">Assign.</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="groups" className="mt-0">
            <GroupsTab />
          </TabsContent>
          <TabsContent value="users" className="mt-0">
            <UsersTab />
          </TabsContent>
          <TabsContent value="assignments" className="mt-0">
            <AssignmentsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
