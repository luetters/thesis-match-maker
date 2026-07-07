import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { generateLvvoPdf } from "@/lib/generateLvvoPdf";

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

function generateUpcomingSemesters(): string[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const isWinter = month >= 10 || month <= 3;
  const semesters: string[] = [];
  let y = year;
  let ws = isWinter;
  for (let i = 0; i < 8; i++) {
    semesters.push(ws ? `WS${y}` : `SoSe${y}`);
    if (ws) { y++; ws = false; } else { ws = true; }
  }
  return semesters;
}

function semesterLabel(s: string): string {
  if (s.startsWith("WS")) {
    const y = parseInt(s.slice(2));
    return `WS ${y}/${y + 1}`;
  }
  if (s.startsWith("SoSe")) return `SoSe ${s.slice(4)}`;
  return s;
}

type SemesterCapacity = { semester: string; maxFirst: number; maxSecond: number };

// ─── Hauptkomponente ──────────────────────────────────────────────────────────

export default function SupervisionCapacities() {
  const { t, lang } = useLanguage();
  const de = lang === "de";
  const utils = trpc.useUtils();

  const upcomingSemesters = generateUpcomingSemesters();

  const { data: savedCaps = [], isLoading: capsLoading } =
    trpc.examiner.getSemesterCapacities.useQuery();
  const { data: usageData = [], isLoading: usageLoading } =
    trpc.examiner.getCapacityUsage.useQuery(undefined, { refetchOnMount: "always" });

  const upsertCapacity = trpc.examiner.upsertSemesterCapacity.useMutation({
    onError: (err) => toast.error(err.message),
  });

  const [capacities, setCapacities] = useState<SemesterCapacity[]>([]);
  const hasHydrated = useRef(false);

  useEffect(() => {
    if (capsLoading) return;
    if (hasHydrated.current) return;
    hasHydrated.current = true;
    const existing = savedCaps as SemesterCapacity[];
    const merged = upcomingSemesters.map((sem) => {
      const found = existing.find((c) => c.semester === sem);
      return found ?? { semester: sem, maxFirst: 0, maxSecond: 0 };
    });
    setCapacities(merged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedCaps, capsLoading]);

  const savedCapacities = upcomingSemesters.map((sem) => {
    const found = (savedCaps as SemesterCapacity[]).find((c) => c.semester === sem);
    return found ?? { semester: sem, maxFirst: 0, maxSecond: 0 };
  });

  const isDirty = JSON.stringify(capacities) !== JSON.stringify(savedCapacities);

  const handleChange = (semester: string, field: "maxFirst" | "maxSecond", delta: number) => {
    setCapacities((prev) =>
      prev.map((c) =>
        c.semester === semester
          ? { ...c, [field]: Math.max(0, Math.min(50, c[field] + delta)) }
          : c
      )
    );
  };

  const handleInputChange = (semester: string, field: "maxFirst" | "maxSecond", value: number) => {
    setCapacities((prev) =>
      prev.map((c) =>
        c.semester === semester
          ? { ...c, [field]: Math.max(0, Math.min(50, isNaN(value) ? 0 : value)) }
          : c
      )
    );
  };

  const handleSave = async () => {
    if (capacities.length === 0) return;
    try {
      utils.examiner.getSemesterCapacities.setData(undefined, capacities as any);
      hasHydrated.current = false;
      for (const cap of capacities) {
        await upsertCapacity.mutateAsync(cap);
      }
      toast.success(de ? "Kapazitäten gespeichert!" : "Capacities saved!");
    } catch (err: any) {
      hasHydrated.current = true;
      toast.error(err?.message ?? (de ? "Fehler beim Speichern" : "Error saving"));
    } finally {
      utils.examiner.getSemesterCapacities.invalidate();
    }
  };

  const handleReset = () => {
    setCapacities(savedCapacities);
    hasHydrated.current = true;
  };

  const isLoading = capsLoading || usageLoading;

  const usageArr = usageData as Array<{ semester: string; usedFirst: number; usedSecond: number }>;

  // ─── LVVO-Report ──────────────────────────────────────────────────────────
  const [lvvoSemester, setLvvoSemester] = useState<string>(() => {
    // Aktuelles Semester vorauswählen
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    return m >= 10 || m <= 3 ? `WS${y}` : `SoSe${y}`;
  });
  const [lvvoEnabled, setLvvoEnabled] = useState(false);

  const { data: lvvoData, isFetching: lvvoLoading } = (trpc.examiner as any).getLvvoReport?.useQuery?.(
    { semester: lvvoSemester },
    { enabled: lvvoEnabled, refetchOnMount: false }
  ) ?? { data: undefined, isFetching: false };

  // Sobald Daten da → PDF generieren und Flag zurücksetzen
  useEffect(() => {
    if (!lvvoEnabled || lvvoLoading || !lvvoData) return;
    setLvvoEnabled(false);
    try {
      generateLvvoPdf(lvvoSemester, lvvoData.examiner ?? null, lvvoData.entries ?? [], lang as "de" | "en");
    } catch (err: any) {
      toast.error(de ? "PDF konnte nicht erstellt werden." : "Could not generate PDF.");
      console.error(err);
    }
  }, [lvvoEnabled, lvvoLoading, lvvoData]);

  // Alle Semester zusammenführen (eigene Planung + bereits erteilte Zusagen)
  const allSemesters = upcomingSemesters;

  const sc = t.supervisionCapacitiesPage;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* ─── Seitenkopf ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "#76B90018" }}
        >
          <svg
            className="w-5 h-5"
            style={{ color: "#76B900" }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{sc.title}</h1>
          <p className="text-sm text-gray-500">{sc.subtitle}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "#76B900", borderTopColor: "transparent" }}
            />
            <span className="text-sm text-gray-500">{de ? "Wird geladen…" : "Loading…"}</span>
          </div>
        </div>
      ) : (
        <>
          {/* ─── Kapazitätstabelle ──────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Tabellen-Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
              <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-3 items-center">
                {/* Semester */}
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {sc.semester}
                </div>
                {/* Eigene Planung: Erstbetreuung */}
                <div className="text-center">
                  <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    {sc.ownPlanningFirst}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{sc.ownPlanningHint}</div>
                </div>
                {/* Eigene Planung: Zweitbetreuung */}
                <div className="text-center">
                  <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    {sc.ownPlanningSecond}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{sc.ownPlanningHint}</div>
                </div>
                {/* Erteilte Zusagen: Erstbetreuer */}
                <div className="text-center">
                  <div
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "#76B900" }}
                  >
                    {sc.grantedFirst}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{sc.grantedHint}</div>
                </div>
                {/* Erteilte Zusagen: Zweitbetreuer */}
                <div className="text-center">
                  <div
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "#76B900" }}
                  >
                    {sc.grantedSecond}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{sc.grantedHint}</div>
                </div>
              </div>
            </div>

            {/* Tabellenzeilen */}
            <div className="divide-y divide-gray-50">
              {allSemesters.map((sem, idx) => {
                const cap = capacities.find((c) => c.semester === sem) ?? {
                  semester: sem,
                  maxFirst: 0,
                  maxSecond: 0,
                };
                const usage = usageArr.find((u) => u.semester === sem);
                const usedFirst = usage?.usedFirst ?? 0;
                const usedSecond = usage?.usedSecond ?? 0;
                const overFirst = usedFirst > cap.maxFirst && cap.maxFirst > 0;
                const overSecond = usedSecond > cap.maxSecond && cap.maxSecond > 0;
                const isEven = idx % 2 === 0;

                return (
                  <div
                    key={sem}
                    className={`grid grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-3 items-center px-6 py-4 transition-colors ${
                      isEven ? "bg-white" : "bg-gray-50/40"
                    }`}
                  >
                    {/* Semester-Label */}
                    <div>
                      <span className="text-sm font-semibold text-gray-800">
                        {semesterLabel(sem)}
                      </span>
                    </div>

                    {/* Eigene Planung: Max Erstbetreuungen (editierbar) */}
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleChange(sem, "maxFirst", -1)}
                        className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:border-gray-300 transition-colors text-sm font-medium"
                        aria-label={de ? "Verringern" : "Decrease"}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={cap.maxFirst}
                        onChange={(e) =>
                          handleInputChange(sem, "maxFirst", parseInt(e.target.value))
                        }
                        className="w-12 text-center text-sm font-bold text-gray-900 border border-gray-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => handleChange(sem, "maxFirst", 1)}
                        className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:border-gray-300 transition-colors text-sm font-medium"
                        aria-label={de ? "Erhöhen" : "Increase"}
                      >
                        +
                      </button>
                    </div>

                    {/* Eigene Planung: Max Zweitbetreuungen (editierbar) */}
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleChange(sem, "maxSecond", -1)}
                        className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:border-gray-300 transition-colors text-sm font-medium"
                        aria-label={de ? "Verringern" : "Decrease"}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={cap.maxSecond}
                        onChange={(e) =>
                          handleInputChange(sem, "maxSecond", parseInt(e.target.value))
                        }
                        className="w-12 text-center text-sm font-bold text-gray-900 border border-gray-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => handleChange(sem, "maxSecond", 1)}
                        className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:border-gray-300 transition-colors text-sm font-medium"
                        aria-label={de ? "Erhöhen" : "Increase"}
                      >
                        +
                      </button>
                    </div>

                    {/* Erteilte Zusagen: Erstbetreuer */}
                    <div className="flex flex-col items-center gap-0.5">
                      <span
                        className={`text-lg font-bold ${
                          overFirst ? "text-red-600" : usedFirst > 0 ? "text-gray-800" : "text-gray-300"
                        }`}
                      >
                        {usedFirst}
                      </span>
                      {cap.maxFirst > 0 && (
                        <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, (usedFirst / cap.maxFirst) * 100)}%`,
                              backgroundColor: overFirst ? "#dc2626" : "#76B900",
                            }}
                          />
                        </div>
                      )}
                      {cap.maxFirst > 0 && (
                        <span className="text-[10px] text-gray-400">
                          {de ? `von ${cap.maxFirst}` : `of ${cap.maxFirst}`}
                        </span>
                      )}
                    </div>

                    {/* Erteilte Zusagen: Zweitbetreuer */}
                    <div className="flex flex-col items-center gap-0.5">
                      <span
                        className={`text-lg font-bold ${
                          overSecond ? "text-red-600" : usedSecond > 0 ? "text-gray-800" : "text-gray-300"
                        }`}
                      >
                        {usedSecond}
                      </span>
                      {cap.maxSecond > 0 && (
                        <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, (usedSecond / cap.maxSecond) * 100)}%`,
                              backgroundColor: overSecond ? "#dc2626" : "#76B900",
                            }}
                          />
                        </div>
                      )}
                      {cap.maxSecond > 0 && (
                        <span className="text-[10px] text-gray-400">
                          {de ? `von ${cap.maxSecond}` : `of ${cap.maxSecond}`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tabellen-Footer */}
            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/60">
              <p className="text-xs text-gray-400">{sc.tableFootnote}</p>
            </div>
          </div>

          {/* ─── Aktionsleiste ──────────────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isDirty && (
                <>
                  <span className="inline-flex items-center gap-1.5 text-sm text-amber-600 font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    {sc.unsavedChanges}
                  </span>
                  <button
                    onClick={handleReset}
                    className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 transition-colors"
                  >
                    {sc.resetBtn}
                  </button>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={upsertCapacity.isPending || !isDirty}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#76B900" }}
            >
              {upsertCapacity.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {sc.savingBtn}
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {sc.saveBtn}
                </>
              )}
            </button>
          </div>

          {/* ─── LVVO-Report ─────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" style={{ color: "#76B900" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {de ? "LVVO-Nachweis" : "LVVO Report"}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {de
                    ? "Nachweis der Betreuungsleistungen nach Lehrverpflichtungsverordnung (LVVO) als PDF"
                    : "Supervision activities report per Teaching Obligation Regulation (LVVO) as PDF"}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                    {de ? "Semester" : "Semester"}
                  </label>
                  <select
                    value={lvvoSemester}
                    onChange={(e) => setLvvoSemester(e.target.value)}
                    className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:border-transparent bg-white text-gray-900"
                    style={{ minWidth: 130 }}
                  >
                    {upcomingSemesters.map((s) => (
                      <option key={s} value={s}>{semesterLabel(s)}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => setLvvoEnabled(true)}
                  disabled={lvvoLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                  style={{ backgroundColor: "#76B900" }}
                >
                  {lvvoLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {de ? "Wird erstellt…" : "Generating…"}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      LVVO Report
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ─── Legende ────────────────────────────────────────────────────── */}
          <div className="bg-blue-50/60 border border-blue-100 rounded-xl px-5 py-4">
            <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">
              {sc.legendTitle}
            </h3>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 w-3 h-3 rounded border-2 border-gray-300 flex-shrink-0" />
                <span className="text-xs text-gray-600">{sc.legendOwnPlanning}</span>
              </div>
              <div className="flex items-start gap-2">
                <span
                  className="mt-0.5 w-3 h-3 rounded flex-shrink-0"
                  style={{ backgroundColor: "#76B900" }}
                />
                <span className="text-xs text-gray-600">{sc.legendGranted}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 w-3 h-3 rounded bg-red-500 flex-shrink-0" />
                <span className="text-xs text-gray-600">{sc.legendOverload}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
