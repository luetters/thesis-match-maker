// ─── Kommissionspräferenzen-Komponente ────────────────────────────────────────
// Extrahiert aus ExaminerDashboard.tsx für Wiederverwendung in Profile.tsx
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { UserAvatar } from "@/components/UserAvatar";
import { WorkloadBadge } from "@/components/WorkloadBadge";
import { buildFullName } from "@shared/const";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ─── Kandidaten-Tooltip ───────────────────────────────────────────────────────
function CandidateTooltip({ candidate }: { candidate: any }) {
  const active = candidate.activeSupervisions ?? 0;
  const max = candidate.maxSupervisions ?? 5;
  const pct = Math.min(100, Math.round((active / Math.max(max, 1)) * 100));
  const tags: string[] = Array.isArray(candidate.tags)
    ? candidate.tags
    : typeof candidate.tags === "string"
    ? (() => { try { return JSON.parse(candidate.tags); } catch { return []; } })()
    : [];
  const loadColor = pct >= 90 ? "bg-red-500" : pct >= 60 ? "bg-amber-400" : "bg-[#76B900]";
  const loadLabel = pct >= 90 ? "Ausgelastet" : pct >= 60 ? "Teilweise ausgelastet" : "Verfügbar";
  const loadTextColor = pct >= 90 ? "text-red-600" : pct >= 60 ? "text-amber-600" : "text-[#76B900]";
  return (
    <div className="absolute z-50 left-full top-0 ml-3 w-64 rounded-2xl bg-white border border-gray-200 shadow-xl p-4 pointer-events-none">
      <div className="absolute -left-2 top-4 w-3 h-3 rotate-45 bg-white border-l border-b border-gray-200" />
      <div className="flex items-center gap-3 mb-3">
        <UserAvatar name={buildFullName({ firstName: candidate.firstName, lastName: candidate.lastName, academicTitle: candidate.academicTitle ?? candidate.title, name: candidate.name })} email={candidate.email} avatarUrl={candidate.photoUrl ?? candidate.avatarUrl} size="lg" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{buildFullName({ firstName: candidate.firstName, lastName: candidate.lastName, academicTitle: candidate.academicTitle ?? candidate.title, name: candidate.name })}</p>
        </div>
      </div>
      {candidate.department && (
        <div className="flex items-start gap-2 mb-2">
          <svg className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-xs text-gray-600 leading-tight">{candidate.department}</p>
        </div>
      )}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">Aktive Betreuungen</span>
          <span className={`text-xs font-semibold ${loadTextColor}`}>{loadLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${loadColor}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-gray-500 flex-shrink-0">{active} / {max}</span>
        </div>
      </div>
      {candidate.researchFocus && (
        <div className="mb-2">
          <p className="text-xs font-medium text-gray-500 mb-1">Forschungsgebiete</p>
          <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">{candidate.researchFocus}</p>
        </div>
      )}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {tags.slice(0, 4).map((tag: string, i: number) => (
            <span key={i} className="px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px]">{tag}</span>
          ))}
          {tags.length > 4 && (
            <span className="px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-400 text-[10px]">+{tags.length - 4}</span>
          )}
        </div>
      )}
      {candidate.officeHours && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
          <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-gray-500 truncate">{candidate.officeHours}</p>
        </div>
      )}
    </div>
  );
}

// ─── RoleBadge ───────────────────────────────────────────────────────────────
function RoleBadge({ candidate }: { candidate: any }) {
  const isSecond = candidate.role === "second_examiner" ||
    (candidate.role === "examiner" && candidate.isSecondExaminer === 1);
  const isPrimarilyFirst = candidate.role === "examiner" && !isSecond;
  if (isPrimarilyFirst) {
    return (
      <span className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100">
        Erstgutachter:in
      </span>
    );
  }
  if (candidate.role === "second_examiner") {
    return (
      <span className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-600 border border-purple-100">
        Zweitgutachter:in
      </span>
    );
  }
  // examiner mit isSecondExaminer-Flag: beide Rollen
  return (
    <span className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-100">
      Erst- &amp; Zweit
    </span>
  );
}

// ─── AvailableItem ────────────────────────────────────────────────────────────
function AvailableItem({ candidate, onAdd }: { candidate: any; onAdd: (id: number) => void }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: `available-${candidate.id}`,
    data: { type: "available", candidateId: candidate.id },
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? "grabbing" : "grab",
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative flex items-center gap-3 px-4 py-3 hover:bg-[#76B900]/5 transition-colors group border-b border-gray-50 last:border-0"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {showTooltip && !isDragging && <CandidateTooltip candidate={candidate} />}
      <div {...attributes} {...listeners} className="flex-shrink-0 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing" title="Ziehen zum Verschieben">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>
      <UserAvatar name={buildFullName({ firstName: candidate.firstName, lastName: candidate.lastName, academicTitle: candidate.academicTitle ?? candidate.title, name: candidate.name })} email={candidate.email} avatarUrl={candidate.photoUrl ?? candidate.avatarUrl} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{buildFullName({ firstName: candidate.firstName, lastName: candidate.lastName, academicTitle: candidate.academicTitle ?? candidate.title, name: candidate.name })}</p>
          <RoleBadge candidate={candidate} />
        </div>
        <WorkloadBadge active={candidate.activeSupervisions} max={candidate.maxSupervisions} compact className="mt-1" />
      </div>
      <button onClick={() => onAdd(candidate.id)} className="flex-shrink-0 w-6 h-6 rounded-full bg-[#76B900]/10 hover:bg-[#76B900]/30 flex items-center justify-center transition-colors" title="Hinzufügen">
        <svg className="w-3.5 h-3.5 text-[#76B900]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

// ─── SelectedItem ─────────────────────────────────────────────────────────────
function SelectedItem({ candidate, index, onRemove }: { candidate: any; index: number; onRemove: (id: number) => void }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `selected-${candidate.id}`,
    data: { type: "selected", candidateId: candidate.id },
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? "grabbing" : "grab",
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative flex items-center gap-3 px-4 py-3 hover:bg-[#76B900]/5 transition-colors group border-b border-[#76B900]/10 last:border-0"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {showTooltip && !isDragging && <CandidateTooltip candidate={candidate} />}
      <div {...attributes} {...listeners} className="flex-shrink-0 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>
      <span className="flex-shrink-0 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white" style={{ backgroundColor: "#76B900" }}>{index + 1}</span>
      <UserAvatar name={buildFullName({ firstName: candidate.firstName, lastName: candidate.lastName, academicTitle: candidate.academicTitle ?? candidate.title, name: candidate.name })} email={candidate.email} avatarUrl={candidate.photoUrl ?? candidate.avatarUrl} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{buildFullName({ firstName: candidate.firstName, lastName: candidate.lastName, academicTitle: candidate.academicTitle ?? candidate.title, name: candidate.name })}</p>
          <RoleBadge candidate={candidate} />
        </div>
        <WorkloadBadge active={candidate.activeSupervisions} max={candidate.maxSupervisions} compact className="mt-1" />
      </div>
      <button onClick={() => onRemove(candidate.id)} className="flex-shrink-0 w-6 h-6 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors" title="Entfernen">
        <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    </div>
  );
}

// ─── SelectedDropZone ─────────────────────────────────────────────────────────
function SelectedDropZone({ isOver }: { isOver: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center py-10 px-4 transition-colors ${isOver ? "bg-[#76B900]/15" : ""}`}>
      <div className={`w-10 h-10 rounded-full border-2 border-dashed flex items-center justify-center mb-2 transition-colors ${isOver ? "border-[#76B900] bg-[#76B900]/10" : "border-gray-300"}`}>
        <svg className={`w-5 h-5 transition-colors ${isOver ? "text-[#76B900]" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <p className={`text-xs text-center transition-colors ${isOver ? "text-[#76B900] font-medium" : "text-gray-400"}`}>
        {isOver ? "Hier ablegen" : "Ziehen Sie Personen hierher\noder klicken Sie auf einen Eintrag"}
      </p>
    </div>
  );
}

// ─── CommissionPreferences (Hauptkomponente) ──────────────────────────────────
export function CommissionPreferences() {
  const utils = trpc.useUtils();
  const { data: prefs, isLoading: prefsLoading } = trpc.thesisPhase27.getCommissionPreferences.useQuery();
  const { data: allCandidates = [], isLoading: candidatesLoading } = trpc.thesisPhase27.getAllSecondExaminerCandidates.useQuery();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overRight, setOverRight] = useState(false);

  const { setNodeRef: setRightDropRef, isOver: isOverRight } = useDroppable({ id: "right-drop-zone" });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Prefs laden (korrekt via useEffect)
  useEffect(() => {
    if (prefs) {
      const raw = (prefs as any).preferredSecondExaminerIds ?? (prefs as any).secondExaminerIds ?? [];
      const ids = Array.isArray(raw) ? raw : [];
      setSelectedIds(ids);
    }
  }, [prefs]);

  const candidateMap = new Map((allCandidates as any[]).map((c: any) => [c.id, c]));
  const selected = selectedIds.map((id) => candidateMap.get(id)).filter(Boolean) as any[];
  const available = (allCandidates as any[]).filter((c: any) => {
    const inSelected = selectedIds.includes(c.id);
    const matchesSearch = !searchQuery || buildFullName({ firstName: c.firstName, lastName: c.lastName, academicTitle: c.academicTitle ?? c.title, name: c.name }).toLowerCase().includes(searchQuery.toLowerCase());
    return !inSelected && matchesSearch;
  });

  const availableIds = available.map((c: any) => `available-${c.id}`);
  const selectedSortableIds = selectedIds.map((id) => `selected-${id}`);

  function addToSelected(candidateId: number) {
    setSelectedIds((prev) => (prev.includes(candidateId) ? prev : [...prev, candidateId]));
  }
  function removeFromSelected(candidateId: number) {
    setSelectedIds((prev) => prev.filter((id) => id !== candidateId));
  }
  function addAll() {
    const allIds = (allCandidates as any[]).map((c: any) => c.id);
    setSelectedIds(allIds);
  }
  function removeAll() {
    setSelectedIds([]);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await utils.client.thesisPhase27.setCommissionPreferences.mutate({ secondExaminerIds: selectedIds } as any);
      toast.success("Kommissionspräferenzen gespeichert.");
      utils.thesisPhase27.getCommissionPreferences.invalidate();
    } catch {
      toast.error("Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }
  function handleDragOver(event: DragOverEvent) {
    const { over } = event;
    setOverRight(over?.id === "right-drop-zone");
  }
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    setOverRight(false);
    if (!over) return;
    const activeData = active.data.current as any;
    const overData = over.data.current as any;
    if (activeData?.type === "available") {
      const candidateId = activeData.candidateId;
      if (over.id === "right-drop-zone" || overData?.type === "selected") {
        if (!selectedIds.includes(candidateId)) {
          if (overData?.type === "selected") {
            const overIndex = selectedIds.indexOf(overData.candidateId);
            setSelectedIds((prev) => {
              const next = prev.filter((x) => x !== candidateId);
              next.splice(overIndex, 0, candidateId);
              return next;
            });
          } else {
            addToSelected(candidateId);
          }
        }
      }
      return;
    }
    if (activeData?.type === "selected" && overData?.type === "available") {
      removeFromSelected(activeData.candidateId);
      return;
    }
    if (activeData?.type === "selected" && overData?.type === "selected") {
      const oldIndex = selectedIds.indexOf(activeData.candidateId);
      const newIndex = selectedIds.indexOf(overData.candidateId);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        setSelectedIds((prev) => arrayMove(prev, oldIndex, newIndex));
      }
    }
  }

  const activeCandidateId = activeId
    ? parseInt(activeId.replace("available-", "").replace("selected-", ""), 10)
    : null;
  const activeCandidate = activeCandidateId ? candidateMap.get(activeCandidateId) : null;
  const activeType = activeId?.startsWith("available-") ? "available" : "selected";

  if (prefsLoading || candidatesLoading) {
    return <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-[#76B900] border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Wählen Sie die Zweitgutachter:innen aus, mit denen Sie bevorzugt zusammenarbeiten möchten.
        Ziehen Sie Personen zwischen den Listen oder klicken Sie auf einen Eintrag.
        Die Reihenfolge in der rechten Liste gibt Ihre Präferenz an.
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-start">
          {/* Linke Liste */}
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Verfügbare Zweitgutachter:innen</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{available.length} Person{available.length !== 1 ? "en" : ""}</p>
                </div>
                <button onClick={addAll} disabled={(allCandidates as any[]).filter((c: any) => !selectedIds.includes(c.id)).length === 0}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#76B900]/10 text-[#76B900] hover:bg-[#76B900]/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="Alle hinzufügen">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                  Alle
                </button>
              </div>
              <div className="mt-2 relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Suchen..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#76B900]/50 focus:border-[#76B900]/50" />
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {available.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-gray-400">Alle Kandidat:innen wurden ausgewählt.</div>
              ) : (
                <SortableContext items={availableIds} strategy={verticalListSortingStrategy}>
                  {available.map((c: any) => (
                    <AvailableItem key={c.id} candidate={c} onAdd={addToSelected} />
                  ))}
                </SortableContext>
              )}
            </div>
          </div>
          {/* Mittel-Indikator */}
          <div className="flex flex-col items-center justify-center gap-2 py-4">
            <div className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <span className="text-xs text-gray-400 text-center">Ziehen oder<br/>Klicken</span>
          </div>
          {/* Rechte Liste */}
          <div className={`rounded-2xl border overflow-hidden transition-colors ${isOverRight || overRight ? "border-[#76B900] bg-[#76B900]/10 shadow-[0_0_0_3px_rgba(118,185,0,0.15)]" : "border-[#76B900]/30 bg-[#76B900]/5"}`}>
            <div className="px-4 py-3 border-b border-[#76B900]/20 bg-[#76B900]/10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-[#76B900] uppercase tracking-widest">Meine bevorzugten Zweitgutachter:innen</h3>
                  <p className="text-xs text-[#76B900]/70 mt-0.5">{selected.length} Person{selected.length !== 1 ? "en" : ""} ausgewählt · Reihenfolge = Präferenz</p>
                </div>
                <button onClick={removeAll} disabled={selected.length === 0}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-400 hover:bg-red-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="Alle entfernen">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
                  </svg>
                  Alle
                </button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto" ref={setRightDropRef}>
              {selected.length === 0 ? (
                <SelectedDropZone isOver={isOverRight || overRight} />
              ) : (
                <SortableContext items={selectedSortableIds} strategy={verticalListSortingStrategy}>
                  {selected.map((c: any, idx: number) => (
                    <SelectedItem key={c.id} candidate={c} index={idx} onRemove={removeFromSelected} />
                  ))}
                </SortableContext>
              )}
            </div>
          </div>
        </div>
        <DragOverlay>
          {activeCandidate ? (
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${activeType === "available" ? "bg-white border-gray-200" : "bg-[#76B900]/10 border-[#76B900]/40"}`}>
              <UserAvatar name={buildFullName({ firstName: activeCandidate.firstName, lastName: activeCandidate.lastName, academicTitle: activeCandidate.academicTitle ?? activeCandidate.title, name: activeCandidate.name })} email={activeCandidate.email} avatarUrl={activeCandidate.photoUrl ?? activeCandidate.avatarUrl} size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{buildFullName({ firstName: activeCandidate.firstName, lastName: activeCandidate.lastName, academicTitle: activeCandidate.academicTitle ?? activeCandidate.title, name: activeCandidate.name })}</p>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-gray-400">
          {selected.length === 0
            ? "Ohne Präferenzen stehen alle Zweitgutachter:innen für Studierende zur Verfügung."
            : `${selected.length} bevorzugte Zweitgutachter:in${selected.length !== 1 ? "nen" : ""} ausgewählt.`}
        </p>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "#76B900" }}>
          {saving ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Speichern...</>
          ) : (
            <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Präferenzen speichern</>
          )}
        </button>
      </div>
    </div>
  );
}
