/**
 * ProgrammeSelector – Studiengang-Auswahl mit HTW-Piktogrammen
 * Wird beim Student-Onboarding (einmalig, unveränderlich) und
 * in den Prüfer:innen-Einstellungen (mehrfach wählbar) verwendet.
 */
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

interface Programme {
  id: number;
  name: string;
  abbreviation: string;
  level: "bachelor" | "master";
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
          ? "border-[#006937] bg-[#006937]/5 shadow-sm"
          : "border-gray-200 bg-white hover:border-[#006937]/40 hover:bg-gray-50"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#006937] flex items-center justify-center">
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
          loading="lazy"
        />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs font-bold">
          {programme.abbreviation}
        </div>
      )}
      <div>
        <div className="text-xs font-bold text-[#006937]">{programme.abbreviation}</div>
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

  const [selected, setSelected] = useState<number | null>(null);

  if (isLoading) return <div className="text-center py-8 text-gray-400">Lade Studiengänge…</div>;

  if (myProgramme) {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <div className="text-sm text-gray-500 mb-1">Ihr zugeordneter Studiengang:</div>
        <div className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-[#006937] bg-[#006937]/5">
          {myProgramme.pictogramUrl && (
            <img src={myProgramme.pictogramUrl} alt={myProgramme.name} className="w-20 h-20 object-contain" />
          )}
          <div className="font-bold text-[#006937]">{myProgramme.abbreviation}</div>
          <div className="text-sm text-gray-700">{myProgramme.name}</div>
          <div className="text-xs text-gray-400 capitalize">{myProgramme.level === "bachelor" ? "Bachelor" : "Master"}</div>
        </div>
        <p className="text-xs text-gray-400 text-center max-w-xs mt-2">
          Der Studiengang ist Ihrem Profil fest zugeordnet und kann nicht geändert werden.
        </p>
      </div>
    );
  }

  const bachelor = (programmes ?? []).filter(p => p.level === "bachelor");
  const master = (programmes ?? []).filter(p => p.level === "master");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-[#006937]/10 text-[#006937] text-xs font-bold">Bachelor</span>
          Bachelorstudiengänge
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {bachelor.map(p => (
            <ProgrammeCard
              key={p.id}
              programme={p}
              selected={selected === p.id}
              onClick={() => setSelected(p.id)}
            />
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">Master</span>
          Masterstudiengänge
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {master.map(p => (
            <ProgrammeCard
              key={p.id}
              programme={p}
              selected={selected === p.id}
              onClick={() => setSelected(p.id)}
            />
          ))}
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <button
          type="button"
          disabled={!selected || setMutation.isPending}
          onClick={() => selected && setMutation.mutate({ programmeId: selected })}
          className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: "#006937" }}
        >
          {setMutation.isPending ? "Wird gespeichert…" : "Studiengang bestätigen"}
        </button>
      </div>
    </div>
  );
}

// ─── Prüfer:in: Mehrfachauswahl der Studiengänge ──────────────────────────────
export function ExaminerProgrammeSelector() {
  const { data: programmes, isLoading } = trpc.programmes.list.useQuery();
  const { data: myProgrammes, isLoading: loadingMine } = trpc.programmes.getExaminerProgrammes.useQuery();
  const utils = trpc.useUtils();

  const [selected, setSelected] = useState<Set<number> | null>(null);

  // Initialisiere selected aus myProgrammes sobald geladen
  const effectiveSelected = selected ?? new Set((myProgrammes ?? []).map(p => p.id));

  const setMutation = trpc.programmes.setExaminerProgrammes.useMutation({
    onSuccess: () => {
      utils.programmes.getExaminerProgrammes.invalidate();
      toast.success("Studiengänge erfolgreich gespeichert.");
    },
    onError: (err) => toast.error(err.message),
  });

  const toggle = (id: number) => {
    setSelected(prev => {
      const s = new Set(prev ?? (myProgrammes ?? []).map(p => p.id));
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  if (isLoading || loadingMine) return <div className="text-center py-8 text-gray-400">Lade Studiengänge…</div>;

  const bachelor = (programmes ?? []).filter(p => p.level === "bachelor");
  const master = (programmes ?? []).filter(p => p.level === "master");

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Wählen Sie alle Studiengänge aus, in denen Sie grundsätzlich Prüfungen abnehmen würden.
        Diese Auswahl ist jederzeit änderbar.
      </p>
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-[#006937]/10 text-[#006937] text-xs font-bold">Bachelor</span>
          Bachelorstudiengänge
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {bachelor.map(p => (
            <ProgrammeCard
              key={p.id}
              programme={p}
              selected={effectiveSelected.has(p.id)}
              onClick={() => toggle(p.id)}
            />
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">Master</span>
          Masterstudiengänge
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {master.map(p => (
            <ProgrammeCard
              key={p.id}
              programme={p}
              selected={effectiveSelected.has(p.id)}
              onClick={() => toggle(p.id)}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between pt-2">
        <span className="text-sm text-gray-500">
          {effectiveSelected.size} Studiengang{effectiveSelected.size !== 1 ? "gänge" : ""} ausgewählt
        </span>
        <button
          type="button"
          disabled={setMutation.isPending}
          onClick={() => setMutation.mutate({ programmeIds: Array.from(effectiveSelected) })}
          className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-40"
          style={{ backgroundColor: "#006937" }}
        >
          {setMutation.isPending ? "Wird gespeichert…" : "Auswahl speichern"}
        </button>
      </div>
    </div>
  );
}
