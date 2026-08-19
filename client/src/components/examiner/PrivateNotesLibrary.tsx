import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";

type NotePriority = "all" | "normal" | "important" | "urgent";

/** Durchsuchbare, ausschließlich persönliche Notizbibliothek für Prüfer:innen. */
export function PrivateNotesLibrary() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<NotePriority>("all");
  const [showCompleted, setShowCompleted] = useState(false);
  const input = useMemo(() => ({
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(priority !== "all" ? { priority } : {}),
    ...(showCompleted ? { includeCompleted: true } : {}),
  }), [search, priority, showCompleted]);
  const { data: notes = [], isFetching } = trpc.examinerComments.search.useQuery(input, { enabled: isOpen });

  const exportNotes = (format: "csv" | "pdf") => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (priority !== "all") params.set("priority", priority);
    if (showCompleted) params.set("includeCompleted", "1");
    const suffix = params.toString();
    window.open(`/api/export/my-notes.${format}${suffix ? `?${suffix}` : ""}`, "_blank", "noopener");
  };

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Meine privaten Notizen</h2>
          <p className="mt-0.5 text-xs text-gray-500">Durchsuchen, priorisieren und ausschließlich eigene Notizen exportieren.</p>
        </div>
        <button onClick={() => setIsOpen((value) => !value)} className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100">
          {isOpen ? "Suche schließen" : "Notizen durchsuchen"}
        </button>
      </div>
      {isOpen && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Notizen durchsuchen…" className="min-w-52 flex-1 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300/60" />
            <select value={priority} onChange={(event) => setPriority(event.target.value as NotePriority)} className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-gray-700">
              <option value="all">Alle Prioritäten</option>
              <option value="normal">Normal</option>
              <option value="important">Wichtig</option>
              <option value="urgent">Dringend</option>
            </select>
            <label className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs text-gray-600">
              <input type="checkbox" checked={showCompleted} onChange={(event) => setShowCompleted(event.target.checked)} className="h-3.5 w-3.5 rounded border-gray-300 text-[#76B900] focus:ring-[#76B900]" />
              Erledigte anzeigen
            </label>
            <button onClick={() => exportNotes("csv")} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100">CSV herunterladen</button>
            <button onClick={() => exportNotes("pdf")} className="rounded-lg px-3 py-2 text-xs font-semibold text-white" style={{ backgroundColor: "#006937" }}>PDF herunterladen</button>
          </div>
          {isFetching ? <p className="text-xs text-gray-500">Notizen werden gesucht…</p> : notes.length === 0 ? <p className="text-xs italic text-gray-500">Keine passenden Notizen gefunden.</p> : (
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {notes.map((note) => (
                <article key={note.id} className={`rounded-xl border p-3 ${note.priority === "urgent" ? "border-red-200 bg-red-50" : note.priority === "important" ? "border-orange-200 bg-orange-50" : "border-amber-100 bg-white"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-xs font-semibold text-gray-800">#{note.thesisRequestId} · {note.thesisTitle}</p><p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{note.content}</p></div>
                    <div className="flex shrink-0 flex-col items-end gap-1"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${note.priority === "urgent" ? "bg-red-100 text-red-700" : note.priority === "important" ? "bg-orange-100 text-orange-700" : "bg-amber-100 text-amber-700"}`}>{note.priority === "urgent" ? "Dringend" : note.priority === "important" ? "Wichtig" : "Normal"}</span>{note.completedAt && <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">Erledigt</span>}</div>
                  </div>
                  <p className={`mt-2 text-[11px] ${note.dueAt && new Date(note.dueAt).getTime() < Date.now() ? "font-semibold text-red-700" : "text-gray-400"}`}>
                    {note.dueAt ? `${new Date(note.dueAt).getTime() < Date.now() ? "Fälligkeit überschritten" : "Fällig am"}: ${new Date(note.dueAt).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })} · ` : ""}
                    {new Date(note.createdAt).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
