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
import { Calendar, MapPin, Clock, Plus, Trash2, Download, CheckCircle, XCircle } from "lucide-react";
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
