/**
 * ProgrammeSelector – Studiengang-Auswahl mit HTW-Piktogrammen
 * Wird beim Student-Onboarding (einmalig, unveränderlich) und
 * in den Prüfer:innen-Einstellungen (mehrfach wählbar) verwendet.
 */
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
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

interface Programme {
  id: number;
  name: string;
  abbreviation: string;
  level: string;
  fachbereich?: string | null;
  pictogramUrl: string | null;
  sortOrder: number;
}

// ─── Einzelne Studiengang-Kachel ─────────────────────────────────────────────
function ProgrammeCard({
  programme,
  selected,
  onClick,
  disabled,
}: {
  programme: Programme;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-center
        ${selected
          ? "border-[#76B900] bg-[#76B900]/5 shadow-sm"
          : "border-gray-200 bg-white hover:border-[#76B900]/40 hover:bg-gray-50"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#76B900] flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
      {programme.pictogramUrl ? (
        <img
          src={programme.pictogramUrl}
          alt={programme.name}
          className="w-16 h-16 object-contain"
        />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs font-bold">
          {programme.abbreviation}
        </div>
      )}
      <div>
        <div className="text-xs font-bold text-[#76B900]">{programme.abbreviation}</div>
        <div className="text-xs text-gray-600 leading-tight mt-0.5">{programme.name}</div>
      </div>
    </button>
  );
}

// ─── Student: Einmalige Studiengang-Zuordnung ─────────────────────────────────
export function StudentProgrammeSelector({ onDone }: { onDone?: () => void }) {
  const { data: user } = trpc.auth.me.useQuery();
  const { data: programmes, isLoading } = trpc.programmes.list.useQuery();
  const { data: myProgramme } = trpc.programmes.getMyProgramme.useQuery(undefined, {
    enabled: !!user,
  });
  const utils = trpc.useUtils();
  const setMutation = trpc.programmes.setStudentProgramme.useMutation({
    onSuccess: () => {
      utils.programmes.getMyProgramme.invalidate();
      toast.success("Studiengang erfolgreich zugeordnet.");
      onDone?.();
    },
    onError: (err) => toast.error(err.message),
  });

  const [selected, setSelected] = useState<number | null>(null);
  const [degreeFilter, setDegreeFilter] = useState<"bachelor" | "master" | null>(null);

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 px-6 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900 mb-2">Studiengang auswählen</div>
          <p className="text-sm text-gray-600 mb-4">
            Um einen Studiengang auszuwählen und Ihre Abschlussarbeit einzureichen, müssen Sie sich zuerst anmelden.
          </p>
        </div>
        <a
          href={getLoginUrl()}
          className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm transition-all"
          style={{ backgroundColor: "#76B900" }}
        >
          Jetzt anmelden
        </a>
      </div>
    );
  }

  if (isLoading) return <div className="text-center py-8 text-gray-400">Lade Studiengänge…</div>;

  // Bereits zugeordnet – nur anzeigen, nicht änderbar
  if (myProgramme) {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <div className="text-sm text-gray-500 mb-1">Ihr zugeordneter Studiengang:</div>
        <div className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-[#76B900] bg-[#76B900]/5">
          {myProgramme.pictogramUrl && (
            <img src={myProgramme.pictogramUrl} alt={myProgramme.name} className="w-20 h-20 object-contain" />
          )}
          <div className="font-bold text-[#76B900]">{myProgramme.abbreviation}</div>
          <div className="text-sm text-gray-700">{myProgramme.name}</div>
          <div className="text-xs text-gray-400 capitalize">{myProgramme.level === "bachelor" ? "Bachelor" : "Master"}</div>
        </div>
        <p className="text-xs text-gray-400 text-center max-w-xs mt-2">
          Der Studiengang ist Ihrem Profil fest zugeordnet und kann nicht geändert werden.
        </p>
      </div>
    );
  }

  // Schritt 1: Abschlussart wählen
  if (!degreeFilter) {
    const bachelorCount = (programmes ?? []).filter(p => p.level === "bachelor").length;
    const masterCount = (programmes ?? []).filter(p => p.level === "master").length;
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Bitte wählen Sie zunächst Ihre Abschlussart, um die passenden Studiengänge anzuzeigen.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setDegreeFilter("bachelor")}
            className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-gray-200 bg-white hover:border-[#76B900] hover:bg-[#76B900]/5 transition-all group"
          >
            <div className="w-14 h-14 rounded-full bg-[#76B900]/10 flex items-center justify-center group-hover:bg-[#76B900]/20 transition-colors">
              <svg className="w-7 h-7 text-[#76B900]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-gray-900 text-base">Bachelor</div>
              <div className="text-xs text-gray-500 mt-0.5">{bachelorCount} Studiengänge</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setDegreeFilter("master")}
            className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-gray-200 bg-white hover:border-blue-600 hover:bg-blue-50 transition-all group"
          >
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-gray-900 text-base">Master</div>
              <div className="text-xs text-gray-500 mt-0.5">{masterCount} Studiengänge</div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Schritt 2: Studiengang aus gefilterter Liste wählen
  const filtered = (programmes ?? []).filter(p => p.level === degreeFilter);
  const degreeLabel = degreeFilter === "bachelor" ? "Bachelor" : "Master";
  const degreeColor = degreeFilter === "bachelor" ? "text-[#76B900]" : "text-blue-600";
  const degreeBg = degreeFilter === "bachelor" ? "bg-[#76B900]/10" : "bg-blue-50";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => { setDegreeFilter(null); setSelected(null); }}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Zurück
        </button>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${degreeBg} ${degreeColor}`}>{degreeLabel}</span>
        <span className="text-sm text-gray-600">{degreeLabel}studiengänge</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {filtered.map(p => (
          <ProgrammeCard
            key={p.id}
            programme={p}
            selected={selected === p.id}
            onClick={() => setSelected(p.id)}
          />
        ))}
      </div>
      <div className="flex justify-end pt-2">
        <button
          type="button"
          disabled={!selected || setMutation.isPending}
          onClick={() => selected && setMutation.mutate({ programmeId: selected })}
          className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: "#76B900" }}
        >
          {setMutation.isPending ? "Wird gespeichert…" : "Studiengang bestätigen"}
        </button>
      </div>
    </div>
  );
}

// ─── Prüfer:in: Dual-List-Box (Links-nach-Rechts) ───────────────────────────────

// Sortierbare Zeile in der rechten Liste
function SortableProgrammeItem({
  programme,
  index,
  onRemove,
}: {
  programme: Programme;
  index: number;
  onRemove: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `selected-${programme.id}`,
    data: { type: "selected", programmeId: programme.id },
  });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-4 py-2.5 border-b border-[#76B900]/10 last:border-0 bg-white hover:bg-[#76B900]/5 transition-colors group"
    >
      <span className="text-xs font-bold text-[#76B900]/50 w-5 text-right flex-shrink-0">{index + 1}</span>
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 flex-shrink-0">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>
      {programme.pictogramUrl ? (
        <img src={programme.pictogramUrl} alt={programme.name} className="w-7 h-7 object-contain flex-shrink-0" loading="lazy" />
      ) : (
        <div className="w-7 h-7 rounded-lg bg-[#76B900]/10 flex items-center justify-center text-[#76B900] text-xs font-bold flex-shrink-0">
          {programme.abbreviation?.slice(0, 2)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-gray-900 truncate">{programme.abbreviation}</p>
        <p className="text-xs text-gray-400 truncate">{programme.name}</p>
      </div>
      <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${
        programme.level === "bachelor" ? "bg-[#76B900]/10 text-[#76B900]" : "bg-blue-50 text-blue-600"
      }`}>{programme.level === "bachelor" ? "B" : "M"}</span>
      <button
        type="button"
        onClick={() => onRemove(programme.id)}
        className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-red-400 hover:bg-red-50 transition-all"
        title="Entfernen"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// Verfügbare Zeile in der linken Liste
function AvailableProgrammeItem({
  programme,
  onAdd,
}: {
  programme: Programme;
  onAdd: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `available-${programme.id}`,
    data: { type: "available", programmeId: programme.id },
  });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 last:border-0 bg-white hover:bg-gray-50 transition-colors group cursor-pointer"
      onClick={() => onAdd(programme.id)}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-200 hover:text-gray-400 flex-shrink-0" onClick={e => e.stopPropagation()}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>
      {programme.pictogramUrl ? (
        <img src={programme.pictogramUrl} alt={programme.name} className="w-7 h-7 object-contain flex-shrink-0" loading="lazy" />
      ) : (
        <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-bold flex-shrink-0">
          {programme.abbreviation?.slice(0, 2)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-gray-900 truncate">{programme.abbreviation}</p>
        <p className="text-xs text-gray-400 truncate">{programme.name}</p>
      </div>
      <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${
        programme.level === "bachelor" ? "bg-[#76B900]/10 text-[#76B900]" : "bg-blue-50 text-blue-600"
      }`}>{programme.level === "bachelor" ? "B" : "M"}</span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onAdd(programme.id); }}
        className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-[#76B900] hover:bg-[#76B900]/10 transition-all"
        title="Hinzufügen"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

// Leere Drop-Zone rechts
function ProgrammeDropZone({ isOver }: { isOver: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center transition-colors ${
      isOver ? "bg-[#76B900]/10" : ""
    }`}>
      <svg className="w-10 h-10 text-[#76B900]/30 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
      <p className="text-xs text-gray-400">{isOver ? "Hier ablegen" : "Ziehen oder klicken Sie auf einen Studiengang"}</p>
    </div>
  );
}

export function ExaminerProgrammeSelector() {
  const { data: programmes, isLoading } = trpc.programmes.list.useQuery();
  const { data: myProgrammes, isLoading: loadingMine } = trpc.programmes.getExaminerProgrammes.useQuery();
  const utils = trpc.useUtils();

  const [selectedIds, setSelectedIds] = useState<number[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overRight, setOverRight] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (myProgrammes && selectedIds === null) {
      setSelectedIds((myProgrammes as Programme[]).map(p => p.id));
    }
  }, [myProgrammes]);

  const effectiveSelectedIds = selectedIds ?? (myProgrammes ?? []).map(p => p.id);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const programmeMap = new Map<number, Programme>(
    (programmes ?? []).map(p => [p.id, p as Programme])
  );

  const available = (programmes ?? []).filter(p => !effectiveSelectedIds.includes(p.id)) as Programme[];
  const selected = effectiveSelectedIds.map(id => programmeMap.get(id)).filter(Boolean) as Programme[];

  const { setNodeRef: setRightDropRef, isOver: isOverRight } = useDroppable({ id: "programme-selected-zone" });

  const addToSelected = (id: number) => setSelectedIds(prev => [...(prev ?? effectiveSelectedIds.filter(x => x !== id)), id]);
  const removeFromSelected = (id: number) => setSelectedIds(prev => (prev ?? effectiveSelectedIds).filter(x => x !== id));
  const addAll = () => setSelectedIds((programmes ?? []).map(p => p.id));
  const removeAll = () => setSelectedIds([]);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event;
    if (!over) { setOverRight(false); return; }
    const overId = String(over.id);
    setOverRight(overId === "programme-selected-zone" || overId.startsWith("selected-"));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    setOverRight(false);
    const { active, over } = event;
    if (!over) return;
    const overIdStr = String(over.id);
    const activeData = active.data.current as any;
    const overData = over.data.current as any;

    if (activeData?.type === "available") {
      const pId = activeData.programmeId as number;
      if (overIdStr === "programme-selected-zone" || overData?.type === "selected") {
        if (overData?.type === "selected") {
          const overPId = overData.programmeId as number;
          const overIndex = effectiveSelectedIds.indexOf(overPId);
          setSelectedIds(prev => {
            const next = (prev ?? effectiveSelectedIds).filter(x => x !== pId);
            next.splice(overIndex, 0, pId);
            return next;
          });
        } else {
          addToSelected(pId);
        }
      }
      return;
    }

    if (activeData?.type === "selected" && overData?.type === "available") {
      removeFromSelected(activeData.programmeId);
      return;
    }

    if (activeData?.type === "selected" && overData?.type === "selected") {
      const oldIdx = effectiveSelectedIds.indexOf(activeData.programmeId);
      const newIdx = effectiveSelectedIds.indexOf(overData.programmeId);
      if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
        setSelectedIds(prev => arrayMove(prev ?? effectiveSelectedIds, oldIdx, newIdx));
      }
    }
  }

  const activeProgrammeId = activeId
    ? parseInt(activeId.replace("available-", "").replace("selected-", ""), 10)
    : null;
  const activeProgramme = activeProgrammeId ? programmeMap.get(activeProgrammeId) : null;
  const activeType = activeId?.startsWith("available-") ? "available" : "selected";

  const handleSave = async () => {
    setSaving(true);
    try {
      await utils.client.programmes.setExaminerProgrammes.mutate({ programmeIds: effectiveSelectedIds });
      utils.programmes.getExaminerProgrammes.invalidate();
      toast.success("Studiengänge erfolgreich gespeichert.");
    } catch (err: any) {
      toast.error(err?.message ?? "Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || loadingMine || selectedIds === null) {
    return <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-[#76B900] border-t-transparent rounded-full animate-spin" /></div>;
  }

  const availableSortableIds = available.map(p => `available-${p.id}`);
  const selectedSortableIds = effectiveSelectedIds.map(id => `selected-${id}`);

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Wählen Sie alle Studiengänge aus, in denen Sie grundsätzlich Prüfungen abnehmen würden.
        Ziehen Sie Studiengänge zwischen den Listen oder klicken Sie auf einen Eintrag.
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-start">
          {/* Linke Liste: Verfügbare Studiengänge */}
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Verfügbare Studiengänge</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{available.length} Studiengang{available.length !== 1 ? "gänge" : ""}</p>
                </div>
                <button
                  onClick={addAll}
                  disabled={available.length === 0}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#76B900]/10 text-[#76B900] hover:bg-[#76B900]/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Alle hinzufügen"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                  Alle
                </button>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {available.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <svg className="w-8 h-8 text-[#76B900]/30 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-xs text-gray-400">Alle Studiengänge ausgewählt</p>
                </div>
              ) : (
                <SortableContext items={availableSortableIds} strategy={verticalListSortingStrategy}>
                  {available.map(p => (
                    <AvailableProgrammeItem key={p.id} programme={p} onAdd={addToSelected} />
                  ))}
                </SortableContext>
              )}
            </div>
          </div>

          {/* Pfeil-Trenner */}
          <div className="hidden md:flex flex-col items-center justify-center gap-2 py-8">
            <svg className="w-6 h-6 text-[#76B900]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-xs text-gray-400 text-center">Ziehen oder<br/>Klicken</span>
          </div>

          {/* Rechte Liste: Ausgewählte Studiengänge */}
          <div className={`rounded-2xl border overflow-hidden transition-colors ${
            isOverRight || overRight
              ? "border-[#76B900] bg-[#76B900]/10 shadow-[0_0_0_3px_rgba(118,185,0,0.15)]"
              : "border-[#76B900]/30 bg-[#76B900]/5"
          }`}>
            <div className="px-4 py-3 border-b border-[#76B900]/20 bg-[#76B900]/10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-[#76B900] uppercase tracking-widest">Meine Prüfungsstudiengänge</h3>
                  <p className="text-xs text-[#76B900]/70 mt-0.5">{selected.length} Studiengang{selected.length !== 1 ? "gänge" : ""} ausgewählt</p>
                </div>
                <button
                  onClick={removeAll}
                  disabled={selected.length === 0}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-400 hover:bg-red-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Alle entfernen"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
                  </svg>
                  Alle
                </button>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto" ref={setRightDropRef}>
              {selected.length === 0 ? (
                <ProgrammeDropZone isOver={isOverRight || overRight} />
              ) : (
                <SortableContext items={selectedSortableIds} strategy={verticalListSortingStrategy}>
                  {selected.map((p, idx) => (
                    <SortableProgrammeItem key={p.id} programme={p} index={idx} onRemove={removeFromSelected} />
                  ))}
                </SortableContext>
              )}
            </div>
          </div>
        </div>

        {/* Drag-Overlay */}
        <DragOverlay>
          {activeProgramme ? (
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${
              activeType === "available" ? "bg-white border-gray-200" : "bg-[#76B900]/10 border-[#76B900]/40"
            }`}>
              {activeProgramme.pictogramUrl ? (
                <img src={activeProgramme.pictogramUrl} alt={activeProgramme.name} className="w-7 h-7 object-contain flex-shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-bold">
                  {activeProgramme.abbreviation?.slice(0, 2)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{activeProgramme.abbreviation}</p>
                <p className="text-xs text-gray-400 truncate">{activeProgramme.name}</p>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Speichern-Button */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-gray-400">
          {selected.length === 0
            ? "Ohne Auswahl werden Ihnen keine Betreuungsanfragen zugewiesen."
            : `${selected.length} Studiengang${selected.length !== 1 ? "gänge" : ""} für Prüfungen aktiviert.`}
        </p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "#76B900" }}
        >
          {saving ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Speichern...</>
          ) : (
            <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Auswahl speichern</>
          )}
        </button>
      </div>
    </div>
  );
}
