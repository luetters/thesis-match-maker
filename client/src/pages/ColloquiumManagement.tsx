import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Calendar, CalendarOff, MapPin, Clock, Plus, Trash2, Download, CheckCircle, XCircle, Pencil } from "lucide-react";
import { ThesisDashboardLayout } from "@/components/ThesisDashboardLayout";

const statusColors: Record<string, string> = {
  SCHEDULED: "bg-[#76B900]/10 text-[#4a7500] border-[#76B900]/30",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
  COMPLETED: "bg-gray-100 text-gray-600 border-gray-300",
};

const statusLabels: Record<string, string> = {
  SCHEDULED: "Geplant",
  CANCELLED: "Abgesagt",
  COMPLETED: "Abgeschlossen",
};

function toDateTimeInput(value: string) {
  return new Date(value.replace(" ", "T") + (value.endsWith("Z") ? "" : "Z")).toISOString().slice(0, 16);
}

function RoomBlocksSection() {
  const utils = trpc.useUtils();
  const { data: blocks, isLoading } = trpc.admin.roomBlocks.list.useQuery();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [location, setLocation] = useState("");
  const [room, setRoom] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [reason, setReason] = useState("");
  const resetForm = () => { setEditing(null); setLocation(""); setRoom(""); setStartsAt(""); setEndsAt(""); setReason(""); };
  const create = trpc.admin.roomBlocks.create.useMutation({
    onSuccess: () => { toast.success("Sperrzeit angelegt."); utils.admin.roomBlocks.list.invalidate(); setDialogOpen(false); resetForm(); },
    onError: (error) => toast.error(error.message),
  });
  const update = trpc.admin.roomBlocks.update.useMutation({
    onSuccess: () => { toast.success("Sperrzeit aktualisiert."); utils.admin.roomBlocks.list.invalidate(); setDialogOpen(false); resetForm(); },
    onError: (error) => toast.error(error.message),
  });
  const remove = trpc.admin.roomBlocks.delete.useMutation({
    onSuccess: () => { toast.success("Sperrzeit gelöscht."); utils.admin.roomBlocks.list.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const openCreate = () => { resetForm(); setDialogOpen(true); };
  const openEdit = (block: any) => { setEditing(block); setLocation(block.location ?? ""); setRoom(block.room); setStartsAt(toDateTimeInput(block.startsAt)); setEndsAt(toDateTimeInput(block.endsAt)); setReason(block.reason ?? ""); setDialogOpen(true); };
  const save = () => {
    if (!room.trim() || !startsAt || !endsAt) return toast.error("Bitte Raum sowie Beginn und Ende der Sperrzeit angeben.");
    const input = { location: location.trim() || undefined, room: room.trim(), startsAt: new Date(startsAt).getTime(), endsAt: new Date(endsAt).getTime(), reason: reason.trim() || undefined };
    if (input.endsAt <= input.startsAt) return toast.error("Das Ende der Sperrzeit muss nach dem Beginn liegen.");
    if (editing) update.mutate({ id: editing.id, ...input }); else create.mutate(input);
  };
  return <Card className="border border-amber-200"><CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0"><div><CardTitle className="flex items-center gap-2 text-base"><CalendarOff className="h-5 w-5 text-amber-600" />Raum-Sperrzeiten</CardTitle><p className="mt-1 text-sm font-normal text-gray-500">Blockieren Sie Räume für Wartung, Lehrveranstaltungen oder externe Belegungen. Sperrzeiten werden bei Terminabstimmungen automatisch berücksichtigt.</p></div><Button size="sm" onClick={openCreate} className="shrink-0 bg-amber-600 hover:bg-amber-700"><Plus className="mr-1 h-4 w-4" />Sperrzeit</Button></CardHeader><CardContent>
    {isLoading ? <p className="text-sm text-gray-500">Sperrzeiten werden geladen…</p> : !blocks?.length ? <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">Es sind keine Raum-Sperrzeiten hinterlegt.</p> : <div className="divide-y divide-gray-100 rounded-lg border border-gray-100">{blocks.map((block: any) => <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" key={block.id}><div className="min-w-0"><p className="font-medium text-gray-900">{[block.location, block.room].filter(Boolean).join(" – ")}</p><p className="mt-0.5 text-sm text-gray-600">{new Date(block.startsAt).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })} – {new Date(block.endsAt).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}</p>{block.reason && <p className="mt-0.5 text-xs text-gray-500">Grund: {block.reason}</p>}</div><div className="flex items-center gap-1"><Button size="icon" variant="ghost" aria-label="Sperrzeit bearbeiten" onClick={() => openEdit(block)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label="Sperrzeit löschen" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => { if (window.confirm("Diese Sperrzeit wirklich löschen?")) remove.mutate({ id: block.id }); }}><Trash2 className="h-4 w-4" /></Button></div></div>)}</div>}
    <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{editing ? "Raum-Sperrzeit bearbeiten" : "Raum-Sperrzeit anlegen"}</DialogTitle></DialogHeader><div className="space-y-4 py-2"><div className="grid grid-cols-2 gap-3"><div><Label htmlFor="block-location">Gebäude / Ort</Label><Input id="block-location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="z. B. Campus Treskowallee" /></div><div><Label htmlFor="block-room">Raum *</Label><Input id="block-room" value={room} onChange={(event) => setRoom(event.target.value)} placeholder="z. B. C 201" /></div></div><div className="grid grid-cols-2 gap-3"><div><Label htmlFor="block-start">Beginn *</Label><Input id="block-start" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></div><div><Label htmlFor="block-end">Ende *</Label><Input id="block-end" type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /></div></div><div><Label htmlFor="block-reason">Grund</Label><Textarea id="block-reason" rows={2} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="z. B. Lehrveranstaltung oder Wartung" /></div></div><DialogFooter><Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Abbrechen</Button><Button className="bg-amber-600 hover:bg-amber-700" onClick={save} disabled={create.isPending || update.isPending}>{editing ? "Speichern" : "Sperrzeit anlegen"}</Button></DialogFooter></DialogContent></Dialog>
  </CardContent></Card>;
}

function CreateColloquiumModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const utils = trpc.useUtils();
  const [thesisId, setThesisId] = useState("");
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [location, setLocation] = useState("");
  const [room, setRoom] = useState("");
  const [notes, setNotes] = useState("");

  const createMutation = trpc.colloquium.create.useMutation({
    onSuccess: () => {
      toast.success("Kolloquium erfolgreich angelegt.");
      utils.colloquium.all.invalidate();
      onCreated();
      onClose();
      setThesisId(""); setTitle(""); setScheduledAt(""); setLocation(""); setRoom(""); setNotes("");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (!thesisId || !title || !scheduledAt) {
      toast.error("Bitte alle Pflichtfelder ausfüllen.");
      return;
    }
    createMutation.mutate({
      thesisRequestId: parseInt(thesisId),
      title,
      scheduledAt: new Date(scheduledAt).getTime(),
      location: location || undefined,
      room: room || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#76B900]">Neues Kolloquium anlegen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="thesisId">Thesis-ID *</Label>
            <Input id="thesisId" type="number" value={thesisId} onChange={e => setThesisId(e.target.value)} placeholder="z.B. 42" />
          </div>
          <div>
            <Label htmlFor="colTitle">Titel *</Label>
            <Input id="colTitle" value={title} onChange={e => setTitle(e.target.value)} placeholder="Kolloquium: Titel der Abschlussarbeit" />
          </div>
          <div>
            <Label htmlFor="scheduledAt">Datum & Uhrzeit *</Label>
            <Input id="scheduledAt" type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="location">Gebäude / Ort</Label>
              <Input id="location" value={location} onChange={e => setLocation(e.target.value)} placeholder="z.B. Gebäude C" />
            </div>
            <div>
              <Label htmlFor="room">Raum</Label>
              <Input id="room" value={room} onChange={e => setRoom(e.target.value)} placeholder="z.B. C 201" />
            </div>
          </div>
          <div>
            <Label htmlFor="notes">Hinweise</Label>
            <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Weitere Informationen zum Kolloquium..." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="bg-[#76B900] hover:bg-[#5a8c00] text-white"
          >
            {createMutation.isPending ? "Wird angelegt..." : "Anlegen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ColloquiumManagement() {
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: colloquiums, refetch } = trpc.colloquium.all.useQuery();
  const utils = trpc.useUtils();

  const updateStatusMutation = trpc.colloquium.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status aktualisiert."); utils.colloquium.all.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.colloquium.delete.useMutation({
    onSuccess: () => { toast.success("Kolloquium gelöscht."); utils.colloquium.all.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  const handleDownloadIcs = async (colloquiumId: number, filename: string, icsContent: string) => {
    const blob = new Blob([icsContent], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ThesisDashboardLayout
      title="Kolloquiums-Verwaltung"
      navItems={[
        { href: "/admin", label: "Admin-Dashboard", icon: <Calendar className="w-4 h-4" /> },
        { href: "/admin/colloquiums", label: "Kolloquien", icon: <Calendar className="w-4 h-4" /> },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kolloquiums-Verwaltung</h1>
            <p className="text-gray-500 text-sm mt-1">Planen und verwalten Sie Kolloquiumstermine.</p>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-[#76B900] hover:bg-[#5a8c00] text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            Neues Kolloquium
          </Button>
        </div>

        <RoomBlocksSection />

        {/* Kolloquiums-Liste */}
        {!colloquiums || colloquiums.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Noch keine Kolloquien geplant.</p>
              <Button
                onClick={() => setCreateOpen(true)}
                className="mt-4 bg-[#76B900] hover:bg-[#5a8c00] text-white"
              >
                Erstes Kolloquium anlegen
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {colloquiums.map((col) => (
              <Card key={col.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={`text-xs border ${statusColors[col.status] ?? ""}`}>
                          {statusLabels[col.status] ?? col.status}
                        </Badge>
                        <span className="text-xs text-gray-400">Thesis #{col.thesisRequestId}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 truncate">{col.title}</h3>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(col.scheduledAt).toLocaleString("de-DE", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                        {(col.location || col.room) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {[col.location, col.room].filter(Boolean).join(", ")}
                          </span>
                        )}
                      </div>
                      {col.notes && (
                        <p className="text-sm text-gray-500 mt-2 line-clamp-2">{col.notes}</p>
                      )}
                    </div>

                    {/* Aktionen */}
                    <div className="flex flex-col gap-2 shrink-0">
                      {/* ICS-Download */}
                      <IcsDownloadButton colloquiumId={col.id} />

                      {/* Status-Aktionen */}
                      {col.status === "SCHEDULED" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-[#76B900] border-[#76B900]/30 hover:bg-[#76B900]/10"
                            onClick={() => updateStatusMutation.mutate({ id: col.id, status: "COMPLETED" })}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Abgeschlossen
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => updateStatusMutation.mutate({ id: col.id, status: "CANCELLED" })}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Absagen
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 text-gray-400 hover:text-red-600"
                        onClick={() => {
                          if (confirm("Kolloquium wirklich löschen?")) {
                            deleteMutation.mutate({ id: col.id });
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateColloquiumModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={refetch}
      />
    </ThesisDashboardLayout>
  );
}

function IcsDownloadButton({ colloquiumId }: { colloquiumId: number }) {
  const { data, isLoading } = trpc.colloquium.getIcs.useQuery({ colloquiumId });

  const handleDownload = () => {
    if (!data) return;
    const blob = new Blob([data.icsContent], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = data.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-1 text-[#0082D1] border-[#0082D1]/30 hover:bg-[#0082D1]/10"
      onClick={handleDownload}
      disabled={isLoading}
    >
      <Download className="w-3.5 h-3.5" />
      .ics
    </Button>
  );
}
