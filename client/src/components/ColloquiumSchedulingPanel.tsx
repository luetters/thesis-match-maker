import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CalendarDays, CheckCircle2, Clock3, Link as LinkIcon, MapPin, Plus, UsersRound, Video } from "lucide-react";
import { getColloquiumSchedulingStartState } from "@shared/colloquiumSchedulingAccess";

type SchedulingMode = "student" | "examiner";
type Availability = "YES" | "MAYBE" | "NO";

const STATUS: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Entwurf", className: "bg-gray-100 text-gray-700" },
  OPEN: { label: "Abstimmung offen", className: "bg-blue-50 text-blue-700" },
  MATCH_FOUND: { label: "Passender Termin gefunden", className: "bg-green-50 text-green-700" },
  AWAITING_CONFIRMATION: { label: "Warten auf 3 Bestätigungen", className: "bg-amber-50 text-amber-700" },
  CONFIRMED: { label: "Verbindlich bestätigt", className: "bg-[#76B900]/15 text-[#456d00]" },
  EXPIRED: { label: "Frist abgelaufen", className: "bg-red-50 text-red-700" },
  CANCELLED: { label: "Abgesagt", className: "bg-gray-100 text-gray-500" },
};

const AVAILABILITY: Record<Availability, { label: string; className: string }> = {
  YES: { label: "Verfügbar", className: "bg-green-100 text-green-800" },
  MAYBE: { label: "Unter Vorbehalt", className: "bg-amber-100 text-amber-800" },
  NO: { label: "Nicht verfügbar", className: "bg-red-100 text-red-800" },
};

function formatDate(date: string) {
  return new Date(date.replace(" ", "T") + (date.endsWith("Z") ? "" : "Z")).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}

function defaultDeadline() {
  const date = new Date();
  date.setDate(date.getDate() + 10);
  return date.toISOString().slice(0, 16);
}

function defaultSlot(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  date.setHours(10, 0, 0, 0);
  return date.toISOString().slice(0, 16);
}

function SchedulingCreateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const utils = trpc.useUtils();
  const { data: requests } = trpc.thesis.examinerRequests.useQuery();
  const [thesisId, setThesisId] = useState("");
  const [deadline, setDeadline] = useState(defaultDeadline);
  const [duration, setDuration] = useState("60");
  const [location, setLocation] = useState("");
  const [room, setRoom] = useState("");
  const [onlineLink, setOnlineLink] = useState("");
  const [slotStarts, setSlotStarts] = useState([defaultSlot(14), defaultSlot(16), defaultSlot(18)]);
  const durationMinutes = Number(duration);
  const conflictSlots = useMemo(() => slotStarts.filter(Boolean).map((startsAt) => {
    const startsAtMs = new Date(startsAt).getTime();
    return { startsAt: startsAtMs, endsAt: startsAtMs + durationMinutes * 60 * 1000 };
  }).filter((slot) => Number.isFinite(slot.startsAt) && Number.isFinite(slot.endsAt)), [durationMinutes, slotStarts]);
  const roomConflicts = trpc.colloquium.scheduling.roomConflicts.useQuery({
    room: room.trim() || undefined,
    location: location.trim() || undefined,
    slots: conflictSlots,
  }, { enabled: open && Boolean(room.trim()) && conflictSlots.length >= 3 });
  const hasRoomConflicts = Boolean(roomConflicts.data?.length);
  const create = trpc.colloquium.scheduling.create.useMutation({
    onSuccess: () => {
      toast.success("Terminabstimmung gestartet. Die Beteiligten wurden eingeladen.");
      utils.colloquium.scheduling.myPolls.invalidate();
      onOpenChange(false);
      setThesisId("");
      setLocation("");
      setRoom("");
      setOnlineLink("");
      setSlotStarts([defaultSlot(14), defaultSlot(16), defaultSlot(18)]);
    },
    onError: (error) => toast.error(error.message),
  });
  const eligible = (requests ?? []).filter((request: any) => request.secondExaminerId && request.defenseEligibility === "approved");
  const submit = () => {
    if (!thesisId) return toast.error("Bitte wählen Sie eine zugelassene Abschlussarbeit aus.");
    if (!room.trim() && !onlineLink.trim()) return toast.error("Bitte geben Sie einen Raum oder einen Online-Link an.");
    const slots = conflictSlots;
    if (slots.length < 3) return toast.error("Bitte geben Sie mindestens drei Terminoptionen an.");
    if (hasRoomConflicts) return toast.error("Mindestens eine Terminoption kollidiert mit einer bestehenden Raumbelegung.");
    create.mutate({
      thesisRequestId: Number(thesisId),
      responseDeadline: new Date(deadline).getTime(),
      durationMinutes,
      location: location.trim() || undefined,
      room: room.trim() || undefined,
      onlineLink: onlineLink.trim() || undefined,
      slots,
    });
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Terminabstimmung eröffnen</DialogTitle></DialogHeader>
      <div className="space-y-4 py-2">
        <p className="text-sm text-gray-600">Sie eröffnen die Abstimmung als Erstprüfer:in. Studierende:r, Erstprüfer:in und Zweitprüfer:in müssen den finalen Termin jeweils verbindlich bestätigen.</p>
        <div className="space-y-1.5"><Label>Zugelassene Abschlussarbeit</Label>
          <Select value={thesisId} onValueChange={setThesisId}><SelectTrigger><SelectValue placeholder="Abschlussarbeit auswählen" /></SelectTrigger><SelectContent>
            {eligible.map((request: any) => <SelectItem key={request.id} value={String(request.id)}>{request.title}</SelectItem>)}
            {!eligible.length && <SelectItem value="none" disabled>Keine zugelassene Arbeit mit Zweitprüfer:in vorhanden</SelectItem>}
          </SelectContent></Select>
        </div>
        <div className="grid sm:grid-cols-2 gap-4"><div className="space-y-1.5"><Label>Abstimmungsfrist</Label><Input type="datetime-local" value={deadline} onChange={(event) => setDeadline(event.target.value)} /></div><div className="space-y-1.5"><Label>Termindauer (Minuten)</Label><Input type="number" min="30" max="180" step="15" value={duration} onChange={(event) => setDuration(event.target.value)} /></div></div>
        <div className="grid sm:grid-cols-2 gap-4"><div className="space-y-1.5"><Label>Gebäude / Ort</Label><Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="z. B. Campus Treskowallee" /></div><div className="space-y-1.5"><Label>Raum</Label><Input value={room} onChange={(event) => setRoom(event.target.value)} placeholder="z. B. C 201" /></div></div>
        {room.trim() && conflictSlots.length >= 3 && <div className={hasRoomConflicts ? "rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" : "rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800"}>
          {roomConflicts.isFetching ? "Prüfe Raumbelegung…" : hasRoomConflicts ? <><strong>Raumkonflikt erkannt.</strong> Der Raum ist für mindestens eine der vorgeschlagenen Zeiten bereits belegt. Bitte ändern Sie Raum oder Zeitfenster. {roomConflicts.data?.map((conflict: any) => <span key={`${conflict.scheduledAt}-${conflict.room}`} className="mt-1 block">Belegt: {formatDate(conflict.scheduledAt)} · {conflict.room}{conflict.location ? ` (${conflict.location})` : ""}</span>)}</> : <><strong>Raum verfügbar.</strong> Für die vorgeschlagenen Zeitfenster liegt keine überlappende Kolloquiumsbelegung vor.</>}</div>}
        <div className="space-y-1.5"><Label>Online-Link</Label><Input type="url" value={onlineLink} onChange={(event) => setOnlineLink(event.target.value)} placeholder="https://… (optional bei Raumtermin)" /><p className="text-xs text-gray-500">Der Raum oder der Online-Link wird in der verbindlichen Terminbestätigung und im ICS-Kalendereintrag hinterlegt.</p></div>
        <div className="space-y-2"><Label>Terminoptionen</Label>{slotStarts.map((slot, index) => <div className="flex gap-2" key={index}><Input type="datetime-local" value={slot} onChange={(event) => setSlotStarts((current) => current.map((value, itemIndex) => itemIndex === index ? event.target.value : value))} />{slotStarts.length > 3 && <Button type="button" variant="outline" onClick={() => setSlotStarts((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Entfernen</Button>}</div>)}
          {slotStarts.length < 10 && <Button type="button" variant="outline" size="sm" onClick={() => setSlotStarts((current) => [...current, defaultSlot(20 + current.length * 2)])}><Plus className="w-4 h-4 mr-1" />Option hinzufügen</Button>}
        </div>
      </div>
      <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button><Button className="bg-[#76B900] hover:bg-[#5a8c00]" onClick={submit} disabled={create.isPending || roomConflicts.isFetching || hasRoomConflicts}>{create.isPending ? "Wird gestartet…" : hasRoomConflicts ? "Raumkonflikt lösen" : "Abstimmung starten"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

export function ColloquiumSchedulingPanel({ mode }: { mode: SchedulingMode }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [selectedPollId, setSelectedPollId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [localResponses, setLocalResponses] = useState<Record<number, Availability>>({});
  const { data: schedulingRequests } = trpc.thesis.examinerRequests.useQuery(undefined, { enabled: mode === "examiner" });
  const { data: polls, isLoading: pollsLoading } = trpc.colloquium.scheduling.myPolls.useQuery();
  useEffect(() => { if (!selectedPollId && polls?.[0]) setSelectedPollId(polls[0].id); }, [polls, selectedPollId]);
  const detail = trpc.colloquium.scheduling.byId.useQuery({ pollId: selectedPollId ?? 0 }, { enabled: selectedPollId !== null });
  const respond = trpc.colloquium.scheduling.respond.useMutation({ onSuccess: () => { toast.success("Ihre Verfügbarkeit wurde gespeichert."); utils.colloquium.scheduling.byId.invalidate(); utils.colloquium.scheduling.myPolls.invalidate(); }, onError: (error) => toast.error(error.message) });
  const selectSlot = trpc.colloquium.scheduling.selectSlot.useMutation({ onSuccess: () => { toast.success("Terminvorschlag versendet. Jetzt sind drei Bestätigungen erforderlich."); utils.colloquium.scheduling.byId.invalidate(); utils.colloquium.scheduling.myPolls.invalidate(); }, onError: (error) => toast.error(error.message) });
  const confirm = trpc.colloquium.scheduling.confirm.useMutation({ onSuccess: (result) => { toast.success(result.finalized ? "Der Kolloquiumstermin ist verbindlich bestätigt." : "Ihre Bestätigung wurde gespeichert."); utils.colloquium.scheduling.byId.invalidate(); utils.colloquium.scheduling.myPolls.invalidate(); }, onError: (error) => toast.error(error.message) });
  const detailData: any = detail.data;
  const myParticipant = detailData?.participants.find((participant: any) => participant.userId === user?.id);
  const isFirstExaminer = detailData?.thesis.examinerId === user?.id;
  const mayStartPoll = mode === "examiner" && ["examiner", "admin", "superadmin"].includes(user?.role ?? "");
  const schedulingStartState = getColloquiumSchedulingStartState((schedulingRequests ?? []) as any[]);
  const selectedStatus = detailData ? STATUS[detailData.poll.status] ?? STATUS.OPEN : null;
  const locationLabel = detailData ? [detailData.poll.location, detailData.poll.room, detailData.poll.onlineLink].filter(Boolean).join(" · ") : "";
  const fullyAvailableSlots = useMemo(() => detailData?.slots.filter((slot: any) => slot.responses.filter((response: any) => response.availability === "YES").length === detailData.participants.length) ?? [], [detailData]);

  const submitAvailability = () => {
    if (!detailData || !selectedPollId) return;
    const responses = detailData.slots.map((slot: any) => ({ slotId: slot.id, availability: localResponses[slot.id] ?? slot.responses.find((response: any) => response.participantId === myParticipant?.id)?.availability }));
    if (responses.some((response: any) => !response.availability)) return toast.error("Bitte bewerten Sie jede Terminoption.");
    respond.mutate({ pollId: selectedPollId, responses });
  };

  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-semibold text-gray-900">Kolloquiums-Terminabstimmung</h2><p className="mt-1 text-sm text-gray-600">Studierende:r, Erstprüfer:in und Zweitprüfer:in stimmen den Termin gemeinsam ab.</p></div>{mayStartPoll && <div className="flex flex-col items-end gap-2"><Button onClick={() => setCreateOpen(true)} disabled={!schedulingStartState.enabled} className="bg-[#76B900] hover:bg-[#5a8c00] disabled:bg-gray-300 disabled:text-gray-600"><Plus className="w-4 h-4 mr-1.5" />Abstimmung starten</Button>{!schedulingStartState.enabled && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">{schedulingStartState.hint}</p>}</div>}</div>
    {mayStartPoll && <SchedulingCreateDialog open={createOpen} onOpenChange={setCreateOpen} />}
    <div className="grid lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,2fr)] gap-5">
      <Card><CardContent className="p-3"><div className="px-2 pt-1 pb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Meine Abstimmungen</div>{pollsLoading ? <p className="p-3 text-sm text-gray-500">Wird geladen…</p> : !polls?.length ? <p className="p-3 text-sm text-gray-500">Noch keine Terminabstimmung vorhanden.</p> : <div className="space-y-1">{polls.map((poll: any) => <button key={poll.id} type="button" onClick={() => { setSelectedPollId(poll.id); setLocalResponses({}); }} className={`w-full rounded-lg px-3 py-3 text-left transition-colors ${selectedPollId === poll.id ? "bg-[#76B900]/10" : "hover:bg-gray-50"}`}><p className="line-clamp-2 text-sm font-medium text-gray-900">{poll.thesisTitle}</p><span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS[poll.status]?.className ?? "bg-gray-100"}`}>{STATUS[poll.status]?.label ?? poll.status}</span></button>)}</div>}</CardContent></Card>
      <Card><CardContent className="p-5">{detail.isLoading ? <p className="text-sm text-gray-500">Abstimmung wird geladen…</p> : !detailData ? <div className="py-12 text-center text-sm text-gray-500"><CalendarDays className="mx-auto mb-3 h-10 w-10 text-gray-300" />Wählen Sie eine Terminabstimmung aus.</div> : <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-semibold text-gray-900">{detailData.thesis.title}</h3><p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600"><Clock3 className="h-4 w-4" />Antwortfrist: {formatDate(detailData.poll.responseDeadline)}</p></div><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${selectedStatus?.className}`}>{selectedStatus?.label}</span></div>
        <div className="grid gap-2 text-sm sm:grid-cols-3"><div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3"><UsersRound className="h-4 w-4 text-[#76B900]" /><span>{detailData.participants.length} Beteiligte</span></div>{detailData.poll.room && <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3"><MapPin className="h-4 w-4 text-blue-600" /><span className="truncate">{[detailData.poll.location, detailData.poll.room].filter(Boolean).join(" – ")}</span></div>}{detailData.poll.onlineLink && <a href={detailData.poll.onlineLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg bg-gray-50 p-3 text-blue-700 hover:bg-blue-50"><Video className="h-4 w-4" /><span className="truncate">Online-Link</span></a>}</div>
        <div className="rounded-xl border border-gray-200 overflow-hidden"><div className="grid grid-cols-[minmax(180px,1fr)_minmax(160px,0.8fr)] gap-2 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500"><span>Terminoption</span><span>Abstimmungsstand</span></div>{detailData.slots.map((slot: any) => { const responsesByParticipant = new Map(slot.responses.map((response: any) => [response.participantId, response.availability])); const fullyAvailable = slot.responses.filter((response: any) => response.availability === "YES").length === detailData.participants.length; const isSelected = slot.id === detailData.poll.selectedSlotId; return <div key={slot.id} className={`grid grid-cols-[minmax(180px,1fr)_minmax(160px,0.8fr)] gap-2 border-t border-gray-100 px-4 py-3 ${isSelected ? "bg-amber-50" : fullyAvailable ? "bg-green-50/50" : ""}`}><div><p className="font-medium text-gray-900">{formatDate(slot.startsAt)}</p><p className="text-xs text-gray-500">{detailData.poll.durationMinutes} Minuten{isSelected ? " · Vorgeschlagen" : ""}</p></div><div className="flex flex-wrap gap-1.5">{detailData.participants.map((participant: any) => { const availability = responsesByParticipant.get(participant.id) as Availability | undefined; return <span title={`${participant.user?.name ?? "Beteiligte Person"}: ${availability ? AVAILABILITY[availability].label : "Keine Antwort"}`} key={participant.id} className={`rounded-full px-2 py-0.5 text-[11px] ${availability ? AVAILABILITY[availability].className : "bg-gray-100 text-gray-500"}`}>{participant.participantRole === "student" ? "Stud." : participant.participantRole === "first_examiner" ? "Erst" : "Zweit"}: {availability ? AVAILABILITY[availability].label : "offen"}</span>})}</div>{isFirstExaminer && detailData.poll.status === "MATCH_FOUND" && fullyAvailable && <div className="col-span-2"><Button size="sm" onClick={() => selectSlot.mutate({ pollId: detailData.poll.id, slotId: slot.id })} disabled={selectSlot.isPending}>Als finalen Termin vorschlagen</Button></div>}</div>})}</div>
        {(detailData.poll.status === "OPEN" || detailData.poll.status === "MATCH_FOUND") && myParticipant && <div className="rounded-xl border border-blue-200 bg-blue-50 p-4"><h4 className="font-semibold text-blue-950">Ihre Verfügbarkeit</h4><p className="mt-1 text-sm text-blue-800">Bitte bewerten Sie jede Terminoption. Erst bei drei Verfügbarkeiten kann ein Termin zur verbindlichen Bestätigung vorgeschlagen werden.</p><div className="mt-3 space-y-2">{detailData.slots.map((slot: any) => { const saved = slot.responses.find((response: any) => response.participantId === myParticipant.id)?.availability; return <div className="flex flex-wrap items-center justify-between gap-2" key={slot.id}><span className="text-sm text-gray-700">{formatDate(slot.startsAt)}</span><Select value={localResponses[slot.id] ?? saved ?? "UNSET"} onValueChange={(value) => value !== "UNSET" && setLocalResponses((current) => ({ ...current, [slot.id]: value as Availability }))}><SelectTrigger className="w-44 bg-white"><SelectValue placeholder="Bitte wählen" /></SelectTrigger><SelectContent><SelectItem value="UNSET" disabled>Bitte wählen</SelectItem><SelectItem value="YES">Verfügbar</SelectItem><SelectItem value="MAYBE">Unter Vorbehalt</SelectItem><SelectItem value="NO">Nicht verfügbar</SelectItem></SelectContent></Select></div>})}</div><Button className="mt-4 bg-blue-700 hover:bg-blue-800" onClick={submitAvailability} disabled={respond.isPending}>{respond.isPending ? "Wird gespeichert…" : "Verfügbarkeit speichern"}</Button></div>}
        {detailData.poll.status === "AWAITING_CONFIRMATION" && myParticipant && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><h4 className="font-semibold text-amber-950">Verbindliche Schlussbestätigung</h4><p className="mt-1 text-sm text-amber-800">Bestätigen Sie den vorgeschlagenen Termin verbindlich. Erst nach allen drei Bestätigungen wird der Kalendereintrag erstellt.</p><div className="mt-3 flex flex-wrap gap-2"><Button className="bg-[#76B900] hover:bg-[#5a8c00]" onClick={() => confirm.mutate({ pollId: detailData.poll.id, confirmed: true })} disabled={confirm.isPending}><CheckCircle2 className="mr-1.5 h-4 w-4" />Termin bestätigen</Button><Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => { const reason = window.prompt("Optionaler Grund für die Ablehnung:"); confirm.mutate({ pollId: detailData.poll.id, confirmed: false, reason: reason || undefined }); }} disabled={confirm.isPending}>Termin ablehnen</Button></div></div>}
        {detailData.poll.status === "CONFIRMED" && <div className="rounded-xl border border-[#76B900]/30 bg-[#76B900]/10 p-4"><div className="flex items-center gap-2 font-semibold text-[#456d00]"><CheckCircle2 className="h-5 w-5" />Termin verbindlich bestätigt</div><p className="mt-1 text-sm text-[#456d00]">Der Termin wurde als Kolloquium und offizielles Verteidigungsdatum eingetragen. Raum und Online-Link sind im Kalendereintrag enthalten.</p>{locationLabel && <p className="mt-2 flex items-center gap-1.5 text-sm text-[#456d00]"><LinkIcon className="h-4 w-4" />{locationLabel}</p>}</div>}
      </div>}</CardContent></Card>
    </div>
  </div>;
}
