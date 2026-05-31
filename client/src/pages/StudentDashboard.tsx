import { StatusBadge, ThesisDashboardLayout } from "@/components/ThesisDashboardLayout";
import { StudentProgrammeSelector } from "@/components/ProgrammeSelector";
import { trpc } from "@/lib/trpc";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icons = {
  home: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  plus: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>,
  list: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
  search: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  upload: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>,
};

const Icons2 = {
  calendar: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  history: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
};
function useNavItems() {
  const { t } = useLanguage();
  return [
    { href: "/student", label: t.student.myRequests, icon: Icons.list },
    { href: "/student/new", label: t.student.newRequest, icon: Icons.plus },
    { href: "/student/examiners", label: t.nav.examiners, icon: Icons.search },
    { href: "/student/colloquiums", label: t.student.colloquiums, icon: Icons2.calendar },
    { href: "/student/history", label: t.student.history, icon: Icons2.history },
  ];
}

// ─── New Request Form ─────────────────────────────────────────────────────────
// ─── Semester-Berechnung ────────────────────────────────────────────────────────
const FACHBEREICHE = [
  { value: "FB1", label: "FB 1 – Ingenieurwissenschaften I" },
  { value: "FB2", label: "FB 2 – Ingenieurwissenschaften II" },
  { value: "FB3", label: "FB 3 – Wirtschaft" },
  { value: "FB4", label: "FB 4 – Informatik, Kommunikation und Wirtschaft" },
  { value: "FB5", label: "FB 5 – Gestaltung und Kultur" },
];

function getNextSemesters(): { label: string; value: string }[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  let startYear = currentYear;
  let startSemester = currentMonth >= 10 ? "WS" : currentMonth >= 4 ? "SoSe" : "WS";
  if (startSemester === "WS" && currentMonth < 10) startYear -= 1;
  
  const semesters = [];
  for (let i = 0; i < 5; i++) {
    if (startSemester === "WS") {
      semesters.push({ label: `WS ${startYear}/${startYear + 1}`, value: `WS${startYear}` });
      startYear += 1;
      startSemester = "SoSe";
    } else {
      semesters.push({ label: `SoSe ${startYear}`, value: `SoSe${startYear}` });
      startSemester = "WS";
    }
  }
  return semesters;
}

const DRAFT_KEY = "htw-thesis-request-draft";

function NewRequestForm({ onSuccess }: { onSuccess: () => void }) {
  // Studiengang aus Profil laden
  const { data: myProgramme } = trpc.programmes.getMyProgramme.useQuery();
  // Alle Programme laden (für dynamisches Dropdown)
  const { data: allProgrammes = [] } = trpc.programmes.list.useQuery();
  
  // Alle Erstgutachter:innen laden (role=examiner)
  const { data: firstExaminers = [] } = trpc.thesisPhase27.getFirstExaminers.useQuery();

  const [hasOwnTopic, setHasOwnTopic] = useState(true);
  const [exposeFile, setExposeFile] = useState<File | null>(null);
  const [showRestoreBanner, setShowRestoreBanner] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    department: "",
    fachbereich: "FB3",
    abstract: "",
    targetSemester: "",
    language: "de" as "de" | "en",
    degreeType: "bachelor" as "bachelor" | "master",
    wantedExaminerId: 0,
  });

  // Zweitgutachter-Kandidaten gefiltert nach Erstgutachter-Präferenzen
  const { data: filteredSecondExaminers = [] } = trpc.thesisPhase27.getFilteredSecondExaminers.useQuery(
    { firstExaminerId: form.wantedExaminerId },
    { enabled: form.wantedExaminerId > 0 }
  );

  // Gespeicherten Entwurf beim ersten Laden prüfen
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.form || parsed?.hasOwnTopic !== undefined) {
          setShowRestoreBanner(true);
        }
      }
    } catch {}
  }, []);

  // Entwurf wiederherstellen
  const restoreDraft = () => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.form) setForm(parsed.form);
        if (parsed.hasOwnTopic !== undefined) setHasOwnTopic(parsed.hasOwnTopic);
      }
    } catch {}
    setShowRestoreBanner(false);
  };

  const discardDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setShowRestoreBanner(false);
  };

  // Entwurf automatisch speichern bei Änderungen
  useEffect(() => {
    const draft = { form, hasOwnTopic };
    const isEmpty = !form.title && !form.description && !form.abstract && !form.targetSemester && form.wantedExaminerId === 0;
    if (isEmpty) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {}
  }, [form, hasOwnTopic]);

  // Studiengang und Abschlussart automatisch vorausfüllen sobald Profil geladen
  useEffect(() => {
    if (myProgramme) {
      setForm((f) => ({
        ...f,
        department: myProgramme.name,
        degreeType: myProgramme.level === "master" ? "master" : "bachelor",
      }));
    }
  }, [myProgramme?.id]);

  const createMutation = trpc.thesisPhase27.createWithWantedExaminer.useMutation({
    onSuccess: () => {
      toast.success("Anfrage erfolgreich eingereicht!");
      localStorage.removeItem(DRAFT_KEY);
      setForm({ title: "", description: "", department: myProgramme?.name ?? "", fachbereich: "FB3", abstract: "", targetSemester: "", language: "de", degreeType: myProgramme?.level === "master" ? "master" : "bachelor", wantedExaminerId: 0 });
      setExposeFile(null);
      setErrors({});
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (hasOwnTopic) {
      if (!form.title.trim()) newErrors.title = "Bitte geben Sie einen Titel ein.";
      else if (form.title.trim().length < 10) newErrors.title = "Der Titel sollte mindestens 10 Zeichen lang sein.";
      if (!form.description.trim()) newErrors.description = "Bitte beschreiben Sie Ihr Thema.";
      else if (form.description.trim().length < 30) newErrors.description = "Die Beschreibung sollte mindestens 30 Zeichen lang sein.";
    }
    if (!form.targetSemester) newErrors.targetSemester = "Bitte wählen Sie ein Zielsemester aus.";
    if (!form.wantedExaminerId) newErrors.wantedExaminerId = "Bitte wählen Sie eine Wunschgutachter:in aus.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleShowPreview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Bitte korrigieren Sie die markierten Felder.");
      return;
    }
    setShowPreview(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    let exposeUrl = "";
    let exposeKey = "";
    
    // Exposé hochladen wenn vorhanden
    if (exposeFile) {
      try {
        const formData = new FormData();
        formData.append("file", exposeFile);
        const res = await fetch("/api/upload/expose", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Upload fehlgeschlagen");
        exposeUrl = data.url;
        exposeKey = data.key;
      } catch (err: unknown) {
        toast.error(`Exposé-Upload fehlgeschlagen: ${err instanceof Error ? err.message : "Unbekannter Fehler"}`);
        return;
      }
    }
    
    createMutation.mutate({ 
      ...form, 
      exposeUrl,
      exposeKey,
    });
  };

  // Vorschau-Sektion
  if (showPreview) {
    const selectedExaminer = (qualifiedExaminers as any[]).find((e: any) => e.id === form.wantedExaminerId);
    const semesterLabel = getNextSemesters().find(s => s.value === form.targetSemester)?.label ?? form.targetSemester;
    return (
      <div className="space-y-5 print-area">
        {/* Druckkopf – nur im Druck sichtbar */}
        <div className="hidden print:block mb-6 pb-4 border-b-2 border-gray-800">
          <h1 className="text-xl font-bold text-gray-900">HTW Berlin – Thesis Match Maker</h1>
          <p className="text-sm text-gray-600 mt-1">Betreuungsanfrage – Zusammenfassung</p>
          <p className="text-xs text-gray-400 mt-0.5">{new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}</p>
        </div>
        {/* Header */}
        <div className="flex items-center justify-between no-print">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Vorschau Ihrer Anfrage</h2>
            <p className="text-sm text-gray-500 mt-0.5">Bitte überprüfen Sie Ihre Angaben vor dem endgültigen Einreichen.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowPreview(false)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Zurück bearbeiten
          </button>
        </div>

        {/* Themenart */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Themenauswahl</h3>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
              hasOwnTopic ? "bg-[#76B900]/10 text-[#76B900]" : "bg-blue-50 text-blue-700"
            }`}>
              {hasOwnTopic ? (
                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>Eigener Vorschlag</>
              ) : (
                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>Themenzuteilung gewünscht</>
              )}
            </span>
          </div>
        </div>

        {/* Thema (nur bei eigenem Vorschlag) */}
        {hasOwnTopic && (
          <div className="rounded-2xl border border-[#76B900]/20 bg-[#76B900]/5 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-semibold text-[#76B900] uppercase tracking-widest">Thema</h3>
            <div>
              <p className="text-xs text-gray-500 mb-1">Titel der Abschlussarbeit</p>
              <p className="text-sm font-semibold text-gray-900">{form.title || <span className="text-gray-400 italic">Nicht angegeben</span>}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Beschreibung</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{form.description || <span className="text-gray-400 italic">Nicht angegeben</span>}</p>
            </div>
            {form.abstract && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Abstract</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{form.abstract}</p>
              </div>
            )}
            {exposeFile && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Exposé</p>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                  {exposeFile.name} <span className="text-gray-400">({(exposeFile.size / 1024).toFixed(0)} KB)</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rahmenbedingungen */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Rahmenbedingungen</h3>
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
            <div>
              <dt className="text-xs text-gray-500">Fachbereich / Studiengang</dt>
              <dd className="text-sm font-medium text-gray-900 mt-0.5">{form.department || <span className="text-gray-400 italic">Nicht angegeben</span>}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Zielsemester</dt>
              <dd className="text-sm font-medium text-gray-900 mt-0.5">{semesterLabel || <span className="text-gray-400 italic">Nicht angegeben</span>}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-gray-500">Wunschgutachter:in</dt>
              <dd className="text-sm font-medium text-gray-900 mt-0.5">
                {selectedExaminer ? `${selectedExaminer.name} (${selectedExaminer.title})` : <span className="text-gray-400 italic">Nicht ausgewählt</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Abschlussart</dt>
              <dd className="text-sm font-medium text-gray-900 mt-0.5">{form.degreeType === "master" ? "Master" : "Bachelor"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Sprache</dt>
              <dd className="text-sm font-medium text-gray-900 mt-0.5">{form.language === "en" ? "Englisch" : "Deutsch"}</dd>
            </div>
          </dl>
        </div>

        {/* Aktions-Buttons */}
        <div className="flex items-center gap-3 pt-2 flex-wrap no-print">
          <button
            type="button"
            onClick={() => setShowPreview(false)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Bearbeiten
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Als PDF speichern / Drucken
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: "#76B900" }}
          >
            {createMutation.isPending ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Wird eingereicht...</>
            ) : (
              <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Jetzt einreichen</>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleShowPreview} className="space-y-5">
      {/* Wiederherstellungs-Banner */}
      {showRestoreBanner && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm">
          <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="flex-1 text-amber-800 font-medium">Sie haben einen unvollständigen Entwurf. Möchten Sie ihn wiederherstellen?</span>
          <button type="button" onClick={restoreDraft} className="px-3 py-1 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-colors">
            Wiederherstellen
          </button>
          <button type="button" onClick={discardDraft} className="px-3 py-1 rounded-lg bg-white border border-amber-200 text-amber-700 text-xs font-medium hover:bg-amber-50 transition-colors">
            Verwerfen
          </button>
        </div>
      )}

      {/* Themenauswahl – zwei Karten */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Wie möchten Sie Ihr Thema erhalten? <span className="text-red-500">*</span></p>
        <div className="grid sm:grid-cols-2 gap-3">
          {/* Karte: Eigener Vorschlag */}
          <button
            type="button"
            onClick={() => setHasOwnTopic(true)}
            className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
              hasOwnTopic
                ? "border-[#76B900] bg-[#f6ffe0]"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
              hasOwnTopic ? "border-[#76B900] bg-[#76B900]" : "border-gray-300 bg-white"
            }`}>
              {hasOwnTopic && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div>
              <p className={`font-semibold text-sm ${hasOwnTopic ? "text-[#4a7a00]" : "text-gray-700"}`}>
                Ich habe einen eigenen Vorschlag
              </p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                Sie bringen ein konkretes Thema mit. Titel, Beschreibung und Exposé werden abgefragt.
              </p>
            </div>
          </button>

          {/* Karte: Thema zuteilen */}
          <button
            type="button"
            onClick={() => setHasOwnTopic(false)}
            className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
              !hasOwnTopic
                ? "border-[#76B900] bg-[#f6ffe0]"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
              !hasOwnTopic ? "border-[#76B900] bg-[#76B900]" : "border-gray-300 bg-white"
            }`}>
              {!hasOwnTopic && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div>
              <p className={`font-semibold text-sm ${!hasOwnTopic ? "text-[#4a7a00]" : "text-gray-700"}`}>
                Ich möchte ein Thema zugeteilt bekommen
              </p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                Die Prüfer:in schlägt ein passendes Thema vor. Nur Pflichtfelder werden abgefragt.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* ── Abschnitt 1: Thema ──────────────────────────────────────────── */}
      {hasOwnTopic && (
        <div className="rounded-2xl border border-[#76B900]/20 bg-[#f9ffe8] p-5 space-y-4">
          <h3 className="text-xs font-semibold text-[#4a7a00] uppercase tracking-widest">Thema</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Titel der Abschlussarbeit <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.title}
              placeholder="z.B. Einsatz von LLMs in der Kundenbetreuung"
              className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all bg-white ${
                errors.title ? "border-red-400 ring-1 ring-red-300" : "border-gray-200"
              }`}
              style={{ "--tw-ring-color": "#76B900" } as React.CSSProperties}
              onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); if (errors.title) setErrors((er) => ({ ...er, title: "" })); }}
            />
            {errors.title && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{errors.title}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Beschreibung <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(e) => { setForm((f) => ({ ...f, description: e.target.value })); if (errors.description) setErrors((er) => ({ ...er, description: "" })); }}
              placeholder="Beschreiben Sie Ihr Thema, die Problemstellung und den geplanten Ansatz..."
              className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all resize-none bg-white ${
                errors.description ? "border-red-400 ring-1 ring-red-300" : "border-gray-200"
              }`}
            />
            {errors.description && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{errors.description}</p>}
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
              Abstract (optional)
              <span className="relative group cursor-default">
                <svg className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 leading-relaxed">
                  Ein Abstract fasst Ihre geplante Arbeit in 150–250 Wörtern zusammen: Problemstellung, Zielsetzung, Methodik und erwartete Ergebnisse. Er hilft Prüfer:innen, das Thema schnell einzuschätzen.
                  <span className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900" />
                </span>
              </span>
            </label>
            <textarea
              rows={3}
              value={form.abstract}
              onChange={(e) => setForm((f) => ({ ...f, abstract: e.target.value }))}
              placeholder="Kurze Zusammenfassung der geplanten Arbeit..."
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all resize-none bg-white"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
              Exposé <span className="text-gray-400 font-normal">(PDF, optional, max. 10 MB)</span>
              <span className="relative group cursor-default">
                <svg className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 leading-relaxed">
                  Das Exposé ist ein ca. 2-seitiges Dokument, das Ihr Thema, die Problemstellung und den geplanten Ansatz kurz zusammenfasst. Es ist keine Pflichtangabe, erhöht aber Ihre Chancen auf eine Zusage.
                  <span className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900" />
                </span>
              </span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.type !== "application/pdf") {
                      toast.error("Nur PDF-Dateien sind erlaubt.");
                      return;
                    }
                    if (file.size > 10 * 1024 * 1024) {
                      toast.error("Datei ist zu groß (max. 10 MB).");
                      return;
                    }
                    setExposeFile(file);
                  }
                }}
                className="hidden"
                id="expose-upload"
              />
              <label
                htmlFor="expose-upload"
                className="px-4 py-2 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-gray-400 transition-all text-sm font-medium text-gray-600 bg-white"
              >
                {exposeFile ? `✓ ${exposeFile.name}` : "PDF auswählen..."}
              </label>
              {exposeFile && (
                <button
                  type="button"
                  onClick={() => setExposeFile(null)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Entfernen
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Abschnitt 2: Rahmenbedingungen ──────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4 shadow-sm">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Rahmenbedingungen</h3>

        {/* Abschlussart als Toggle-Schalter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Abschlussart <span className="text-red-500">*</span></label>
          <div className="flex gap-2">
            {(["bachelor", "master"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  if (!myProgramme) {
                    setForm((f) => ({ ...f, degreeType: type, department: "" }));
                  }
                }}
                disabled={!!myProgramme}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold border-2 transition-all ${
                  form.degreeType === type
                    ? "border-[#76B900] bg-[#76B900] text-white"
                    : myProgramme
                      ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed"
                      : "border-gray-200 text-gray-600 hover:border-[#76B900]/50 hover:bg-[#76B900]/5"
                }`}
              >
                {type === "bachelor" ? "🎓 Bachelor" : "🎖️ Master"}
              </button>
            ))}
          </div>
          {myProgramme && (
            <p className="mt-1 text-xs text-gray-400">Abschlussart aus Ihrem Profil übernommen – nicht änderbar.</p>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Fachbereich */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Fachbereich <span className="text-red-500">*</span></label>
            <select
              value={form.fachbereich}
              onChange={(e) => setForm((f) => ({ ...f, fachbereich: e.target.value, department: "" }))}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all bg-white"
            >
              {FACHBEREICHE.map((fb) => (
                <option key={fb.value} value={fb.value}>{fb.label}</option>
              ))}
            </select>
          </div>

          {/* Studiengang – dynamisches Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Studiengang <span className="text-red-500">*</span>
            </label>
            {myProgramme ? (
              <>
                <input
                  type="text"
                  readOnly
                  value={myProgramme.name}
                  className="w-full px-3.5 py-2.5 border border-[#76B900]/30 bg-[#76B900]/5 text-[#76B900] font-medium rounded-xl text-sm cursor-not-allowed"
                  title="Studiengang ist Ihrem Profil fest zugeordnet"
                />
                <p className="mt-1 text-xs text-gray-400">Automatisch aus Ihrem Profil übernommen – nicht änderbar.</p>
              </>
            ) : (() => {
              const filtered = allProgrammes.filter(
                (p: any) => p.level === form.degreeType && (p.fachbereich ?? 'FB3') === form.fachbereich
              );
              return (
                <>
                  <select
                    required
                    value={form.department}
                    onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all bg-white ${
                      errors.department ? 'border-red-400' : 'border-gray-200'
                    }`}
                  >
                    <option value="">-- Bitte wählen --</option>
                    {filtered.length > 0 ? (
                      filtered.map((p: any) => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))
                    ) : (
                      <option disabled value="">Keine Studiengänge für diese Auswahl verfügbar</option>
                    )}
                  </select>
                  {filtered.length === 0 && (
                    <p className="mt-1 text-xs text-amber-600">Für {form.fachbereich} sind noch keine {form.degreeType === 'master' ? 'Master-' : 'Bachelor-'}Studiengänge hinterlegt.</p>
                  )}
                </>
              );
            })()}
          </div>

          {/* Geplantes Semester der Thesis */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Geplantes Semester der Thesis <span className="text-red-500">*</span></label>
            <select
              required
              value={form.targetSemester}
              className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all bg-white ${
                errors.targetSemester ? "border-red-400" : "border-gray-200"
              }`}
              onChange={(e) => { setForm((f) => ({ ...f, targetSemester: e.target.value })); if (errors.targetSemester) setErrors((er) => ({ ...er, targetSemester: "" })); }}
            >
              <option value="">-- Bitte wählen --</option>
              {getNextSemesters().map((sem) => (
                <option key={sem.value} value={sem.value}>
                  {sem.label}
                </option>
              ))}
            </select>
            {errors.targetSemester && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{errors.targetSemester}</p>}
          </div>

          {/* Sprache der Thesis */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Sprache der Thesis</label>
            <select
              value={form.language}
              onChange={(e) => setForm((f) => ({ ...f, language: e.target.value as "de" | "en" }))}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all bg-white"
            >
              <option value="de">Deutsch</option>
              <option value="en">Englisch</option>
            </select>
          </div>
        </div>

        {/* Zweistufige Gutachter-Auswahl */}
        <div className="space-y-4 rounded-2xl border border-[#76B900]/20 bg-[#76B900]/5 p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-[#76B900] text-white flex items-center justify-center text-xs font-bold">1</div>
            <h4 className="text-sm font-semibold text-gray-800">Erstgutachter:in auswählen</h4>
          </div>
          <p className="text-xs text-gray-500 -mt-2">Wählen Sie Ihre Wunsch-Erstgutachter:in. Diese Person wird per E-Mail kontaktiert und muss zustimmen.</p>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Erstgutachter:in <span className="text-red-500">*</span></label>
            <select
              required
              value={form.wantedExaminerId}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setForm((f) => ({ ...f, wantedExaminerId: val }));
                if (errors.wantedExaminerId) setErrors((er) => ({ ...er, wantedExaminerId: "" }));
              }}
              className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all bg-white ${
                errors.wantedExaminerId ? "border-red-400" : "border-gray-200"
              }`}
            >
              <option value={0}>-- Bitte wählen --</option>
              {(() => {
                // Alphabetisch nach Nachname sortieren und Buchstabentrenner einfügen
                const sorted = [...(firstExaminers as any[])].sort((a: any, b: any) => {
                  const lastA = (a.name ?? "").trim().split(" ").pop() ?? "";
                  const lastB = (b.name ?? "").trim().split(" ").pop() ?? "";
                  return lastA.localeCompare(lastB, "de");
                });
                const result: React.ReactNode[] = [];
                let currentLetter = "";
                sorted.forEach((examiner: any) => {
                  const lastName = (examiner.name ?? "").trim().split(" ").pop() ?? "";
                  const letter = lastName.charAt(0).toUpperCase();
                  if (letter !== currentLetter) {
                    currentLetter = letter;
                    result.push(<option key={`sep-${letter}`} disabled value="">── {letter} ──</option>);
                  }
                  const active = (examiner as any).activeSupervisions as number | undefined;
                  const max = (examiner as any).maxSupervisions as number | undefined;
                  const statusHint = max != null
                    ? active != null && active >= max
                      ? " \u2014 Ausgelastet"
                      : active != null && active / max >= 0.8
                        ? " \u2014 Fast ausgelastet"
                        : ""
                    : "";
                  result.push(
                    <option key={examiner.id} value={examiner.id} disabled={max != null && active != null && active >= max}>
                      {examiner.name}{examiner.title ? ` (${examiner.title})` : ""}{statusHint}
                    </option>
                  );
                });
                return result;
              })()}
            </select>
            {errors.wantedExaminerId && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                {errors.wantedExaminerId}
              </p>
            )}
          </div>

          {/* Schritt 2: Zweitgutachter:in – nur nach Zusage des Erstgutachters */}
          <div className="pt-3 border-t border-[#76B900]/20">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-full bg-gray-300 text-white flex items-center justify-center text-xs font-bold">2</div>
              <h4 className="text-sm font-semibold text-gray-500">Zweitgutachter:in (nach Zusage)</h4>
            </div>
            <p className="text-xs text-gray-400 mb-3">Die Auswahl der Zweitgutachter:in ist erst möglich, nachdem die Erstgutachter:in zugesagt hat.</p>
            <div className="relative">
              <select
                disabled
                value={0}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
              >
                <option value={0}>Keine Präferenz – Zweitgutachter:in kann zugeteilt werden</option>
              </select>
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50/60 rounded-xl">
                <span className="text-xs text-gray-400 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  Verfügbar nach Erstgutachter-Zusage
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <button
        type="submit"
        className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all hover:opacity-90 active:scale-95"
        style={{ backgroundColor: "#76B900" }}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        Vorschau &amp; Einreichen
      </button>
    </form>
  );
}// ─── Exposé-Upload ────────────────────────────────────────────────────────────────
function ExposeUploadButton({ thesisId, currentUrl, onSuccess }: { thesisId: number; currentUrl?: string | null; onSuccess: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Nur PDF-Dateien sind erlaubt.");
      return;
    }
    if (file.size > 16 * 1024 * 1024) {
      toast.error("Datei ist zu groß (max. 16 MB).");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/upload/expose/${thesisId}`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload fehlgeschlagen");
      toast.success("Exposé erfolgreich hochgeladen!");
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input ref={fileRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleUpload} />
      {currentUrl ? (
        <div className="flex items-center gap-2">
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
            style={{ backgroundColor: "#F1F8E9", color: "#76B900" }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exposé ansehen
          </a>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            {uploading ? <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" /> : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>}
            Ersetzen
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-dashed border-gray-300 text-gray-500 hover:border-primary hover:text-primary transition-all disabled:opacity-50"
        >
          {uploading ? <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" /> : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>}
          Exposé hochladen
        </button>
      )}
    </div>
  );
}

// ─── Zweitgutachter-Auswahl nach Erstgutachter-Zusage ──────────────────────────
function SecondExaminerPicker({ requestId, wantedExaminerId, wantedSecondExaminerId }: { requestId: number; wantedExaminerId?: number | null; wantedSecondExaminerId?: number | null }) {
  const utils = trpc.useUtils();
  const [selectedId, setSelectedId] = useState<number>(wantedSecondExaminerId ?? 0);
  const [saving, setSaving] = useState(false);

  // Gefilterte Zweitgutachter nach Erstgutachter-Präferenzen
  const { data: secondExaminers = [] } = trpc.thesisPhase27.getFilteredSecondExaminers.useQuery(
    { firstExaminerId: wantedExaminerId ?? 0 },
    { enabled: !!wantedExaminerId && wantedExaminerId > 0 }
  );

  const setMutation = trpc.thesisPhase27.setWantedSecondExaminer.useMutation({
    onSuccess: () => {
      toast.success("Zweitgutachter:in-Präferenz gespeichert.");
      utils.thesis.myRequests.invalidate();
    },
    onError: (err) => toast.error(err.message),
    onSettled: () => setSaving(false),
  });

  const handleSave = () => {
    setSaving(true);
    setMutation.mutate({ requestId, secondExaminerId: selectedId > 0 ? selectedId : null });
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-50">
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">2</div>
          <span className="text-xs font-semibold text-blue-800">Zweitgutachter:in auswählen</span>
          <span className="ml-auto text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Erstgutachter:in hat zugesagt</span>
        </div>
        <p className="text-xs text-blue-600 mb-2">Sie können jetzt Ihre Präferenz für die Zweitgutachter:in angeben.</p>
        <div className="flex gap-2">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(parseInt(e.target.value))}
            className="flex-1 px-3 py-2 border border-blue-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value={0}>Keine Präferenz – Zweitgutachter:in kann zugeteilt werden</option>
            {(() => {
              const sorted = [...(secondExaminers as any[])]
                .filter((e: any) => e.id !== wantedExaminerId)
                .sort((a: any, b: any) => {
                  const lastA = (a.name ?? "").trim().split(" ").pop() ?? "";
                  const lastB = (b.name ?? "").trim().split(" ").pop() ?? "";
                  return lastA.localeCompare(lastB, "de");
                });
              const result: React.ReactNode[] = [];
              let currentLetter = "";
              sorted.forEach((e: any) => {
                const lastName = (e.name ?? "").trim().split(" ").pop() ?? "";
                const letter = lastName.charAt(0).toUpperCase();
                if (letter !== currentLetter) {
                  currentLetter = letter;
                  result.push(<option key={`sep2-${letter}`} disabled value="">── {letter} ──</option>);
                }
                const eActive = (e as any).activeSupervisions as number | undefined;
                const eMax = (e as any).maxSupervisions as number | undefined;
                const eHint = eMax != null
                  ? eActive != null && eActive >= eMax
                    ? " \u2014 Ausgelastet"
                    : eActive != null && eMax > 0 && eActive / eMax >= 0.8
                      ? " \u2014 Fast ausgelastet"
                      : ""
                  : "";
                result.push(
                  <option key={e.id} value={e.id} disabled={eMax != null && eActive != null && eActive >= eMax}>
                    {e.name}{e.title ? ` (${e.title})` : ""}{eHint}
                  </option>
                );
              });
              return result;
            })()}
          </select>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-2 rounded-lg text-xs font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {saving ? "..." : "Speichern"}
          </button>
        </div>
        {wantedSecondExaminerId && wantedSecondExaminerId > 0 && (
          <p className="mt-1.5 text-xs text-blue-700">
            Aktuelle Präferenz: {(secondExaminers as any[]).find((e: any) => e.id === wantedSecondExaminerId)?.name ?? `ID ${wantedSecondExaminerId}`}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── My Requests ────────────────────────────────────────────────────────────────
function MyRequests() {
  const utils = trpc.useUtils();
  const { data: requests, isLoading } = trpc.thesis.myRequests.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!requests?.length) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-gray-900 font-semibold mb-1">Noch keine Anfragen</h3>
        <p className="text-gray-500 text-sm">Reiche deine erste Themenidee ein, um loszulegen.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((req) => (
        <div key={req.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{req.title}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{req.department}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <StatusBadge status={req.status} />
              {(req as any).programmeName && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-[#76B900]/10 text-[#76B900]">
                  {(req as any).programmeAbbreviation ?? (req as any).programmeName}
                </span>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">{req.description}</p>
          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
            {req.targetSemester && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {req.targetSemester}
              </span>
            )}
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
              {req.language === "de" ? "Deutsch" : "Englisch"}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
              </svg>
              {req.degreeType === "bachelor" ? "Bachelor" : "Master"}
            </span>
          </div>
          {req.rejectionReason && (
            <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-100">
              <p className="text-xs text-red-700">
                <strong>Ablehnungsgrund:</strong> {req.rejectionReason}
              </p>
            </div>
          )}
          {(req as { deadline?: Date | string | null }).deadline && (
            <div className="mt-3 flex items-center gap-2 p-2.5 bg-amber-50 rounded-xl border border-amber-100">
              <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs text-amber-700 font-medium">
                Deadline: {new Date((req as { deadline: Date | string }).deadline).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
              </span>
              <a
                href={`/api/thesis/${req.id}/deadline.ics`}
                download
                className="ml-auto px-2.5 py-1 rounded-lg text-xs font-medium border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors"
                title="Deadline in Kalender importieren (.ics)"
              >
                Kalender
              </a>
            </div>
          )}
          {/* Zweitgutachter-Auswahl nach Erstgutachter-Zusage */}
          {req.status === "FIRST_EXAMINER_ACCEPTED" && (
            <SecondExaminerPicker
              requestId={req.id}
              wantedExaminerId={(req as any).wantedExaminerId}
              wantedSecondExaminerId={(req as any).wantedSecondExaminerId}
            />
          )}
          <div className="mt-3 pt-3 border-t border-gray-50">
            <ExposeUploadButton
              thesisId={req.id}
              currentUrl={(req as { exposeUrl?: string | null }).exposeUrl}
              onSuccess={() => utils.thesis.myRequests.invalidate()}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Examiner List ────────────────────────────────────────────────────────────
function ExaminerList() {
  const { data: examiners, isLoading } = trpc.examiner.list.useQuery();
  const [search, setSearch] = useState("");

  const filtered = examiners?.filter((e) => {
    const name = e.user.name?.toLowerCase() ?? "";
    const dept = e.profile?.department?.toLowerCase() ?? "";
    const q = search.toLowerCase();
    return name.includes(q) || dept.includes(q);
  });

  if (isLoading) {
    return (
      <div className="grid sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5">
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Prüfer:in suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all"
          />
        </div>
      </div>

      {!filtered?.length ? (
        <div className="text-center py-12 text-gray-500 text-sm">Keine Prüfer:innen gefunden.</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map(({ user, profile }) => (
            <div key={user.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: "#76B900" }}
                >
                  {(user.name ?? "?").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 text-sm">
                    {profile?.title ? `${profile.title} ` : ""}{user.name}
                  </div>
                  {profile?.department && (
                    <div className="text-xs text-gray-500 truncate">{profile.department}</div>
                  )}
                </div>
              </div>
              {profile?.bio && (
                <p className="text-xs text-gray-600 line-clamp-2 mb-3">{profile.bio}</p>
              )}
              {profile?.tags && Array.isArray(profile.tags) && (profile.tags as string[]).length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {(profile.tags as string[]).slice(0, 4).map((tag: string) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: "#F1F8E9", color: "#76B900" }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────
function Overview() {
  const { data: requests } = trpc.thesis.myRequests.useQuery();

  const stats = {
    total: requests?.length ?? 0,
    pending: requests?.filter((r) => r.status === "PENDING").length ?? 0,
    accepted: requests?.filter((r) => r.status === "ACCEPTED").length ?? 0,
    matched: requests?.filter((r) => r.status === "MATCHED").length ?? 0,
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Gesamt", value: stats.total, color: "text-gray-900" },
          { label: "Ausstehend", value: stats.pending, color: "text-amber-600" },
          { label: "Angenommen", value: stats.accepted, color: "text-primary" },
          { label: "Matched", value: stats.matched, color: "text-blue-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className={`text-3xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-4">Letzte Anfragen</h2>
        {!requests?.length ? (
          <p className="text-sm text-gray-500">Noch keine Anfragen vorhanden.</p>
        ) : (
          <div className="space-y-3">
            {requests.slice(0, 3).map((req) => (
              <div key={req.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{req.title}</p>
                  <p className="text-xs text-gray-500">{req.department}</p>
                </div>
                <StatusBadge status={req.status} />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-4">Mein Studiengang</h2>
        <StudentProgrammeSelector />
      </div>

      <div
        className="rounded-2xl p-6 border border-white/10"
        style={{ backgroundColor: "#0e2a06" }}
      >
        <h3 className="font-semibold text-white mb-2">Nächste Schritte</h3>
        <p className="text-white/60 text-sm">
          Reiche deine Themenidee ein und finde passende Prüfer:innen für deine Abschlussarbeit.
          Das System benachrichtigt dich per E-Mail über alle Statusänderungen.
        </p>
      </div>
    </div>
  );
}

// ─── My Colloquiums ───────────────────────────────────────────────────────────
function MyColloquiums() {
  const { data: colloquiums, isLoading } = trpc.colloquium.myStudentColloquiums.useQuery();
  if (isLoading) return <div className="text-sm text-gray-500">Wird geladen...</div>;
  if (!colloquiums?.length) return (
    <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
      </div>
      <p className="text-sm font-medium text-gray-700">Kein Kolloquium geplant</p>
      <p className="text-xs text-gray-500 mt-1">Sobald ein Termin festgelegt wird, erscheint er hier.</p>
    </div>
  );
  return (
    <div className="space-y-4">
      {colloquiums.map((col) => (
        <div key={col.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-gray-900">{col.title}</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {new Date(col.scheduledAt).toLocaleString("de-DE", { dateStyle: "full", timeStyle: "short" })}
              </p>
              {(col.location || col.room) && (
                <p className="text-sm text-gray-600 mt-1">
                  {[col.location, col.room].filter(Boolean).join(" – ")}
                </p>
              )}
              {col.notes && <p className="text-xs text-gray-500 mt-2 italic">{col.notes}</p>}
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
              col.status === "SCHEDULED" ? "bg-blue-50 text-blue-700" :
              col.status === "COMPLETED" ? "bg-primary/5 text-primary" :
              "bg-red-50 text-red-700"
            }`}>{col.status === "SCHEDULED" ? "Geplant" : col.status === "COMPLETED" ? "Abgeschlossen" : "Abgesagt"}</span>
          </div>
          <a
            href={`/api/ics/colloquium/${col.id}`}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium hover:opacity-80 transition-opacity"
            style={{ color: "#76B900" }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Zum Kalender hinzufügen (.ics)
          </a>
        </div>
      ))}
    </div>
  );
}

// ─── Statushistorie ───────────────────────────────────────────────────────────
function StatusHistory() {
  const { data: requests, isLoading } = trpc.thesis.myRequests.useQuery();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data: logs } = trpc.auditLog.byThesis.useQuery(
    { thesisRequestId: selectedId! },
    { enabled: selectedId !== null }
  );
  if (isLoading) return <div className="text-sm text-gray-500">Wird geladen...</div>;
  if (!requests?.length) return (
    <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
      <p className="text-sm text-gray-500">Keine Anfragen vorhanden.</p>
    </div>
  );
  const actionLabel: Record<string, string> = {
    THESIS_CREATED: "Anfrage eingereicht",
    STATUS_CHANGED: "Status geändert",
    EXAMINER_ACCEPTED: "Prüfer:in hat angenommen",
    EXAMINER_REJECTED: "Prüfer:in hat abgelehnt",
    FIRST_EXAMINER_ASSIGNED: "Erstprüfer:in zugewiesen",
    SECOND_EXAMINER_ASSIGNED: "Zweitprüfer:in zugewiesen",
    COLLOQUIUM_CREATED: "Kolloquium angelegt",
    DEADLINE_SET: "Abgabefrist gesetzt",
  };
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Anfrage auswählen</label>
        <select
          value={selectedId ?? ""}
          onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : null)}
          className="w-full max-w-md px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white"
        >
          <option value="">-- Bitte wählen --</option>
          {requests.map((r) => (
            <option key={r.id} value={r.id}>{r.title}</option>
          ))}
        </select>
      </div>
      {selectedId && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-5">Verlauf</h3>
          {!logs?.length ? (
            <p className="text-sm text-gray-500">Noch keine Einträge.</p>
          ) : (
            <ol className="relative border-l-2" style={{ borderColor: "#76B900" }}>
              {logs.map((log, i) => (
                <li key={log.id} className={`ml-6 ${i < logs.length - 1 ? "mb-6" : ""}` }>
                  <span
                    className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white"
                    style={{ backgroundColor: "#76B900" }}
                  >
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  </span>
                  <div className="pl-2">
                    <p className="text-sm font-semibold text-gray-900">{actionLabel[log.action] ?? log.action}</p>
                    {log.fromStatus && log.toStatus && (
                      <p className="text-xs text-gray-500">{log.fromStatus} → {log.toStatus}</p>
                    )}
                    {log.reason && <p className="text-xs text-gray-500 italic mt-0.5">Begründung: {log.reason}</p>}
                    <time className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleString("de-DE")}</time>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function StudentDashboard() {
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState<"requests" | "new" | "examiners" | "colloquiums" | "history">(
    location === "/student/new" ? "new" :
    location === "/student/examiners" ? "examiners" :
    location === "/student/colloquiums" ? "colloquiums" :
    location === "/student/history" ? "history" : "requests"
  );

  const utils = trpc.useUtils();

  const navItems = useNavItems();
  const currentNavItems = navItems.map((item) => ({
    ...item,
    onClick: () => {
      if (item.href === "/student") setActiveTab("requests");
      else if (item.href === "/student/new") setActiveTab("new");
      else if (item.href === "/student/examiners") setActiveTab("examiners");
      else if (item.href === "/student/colloquiums") setActiveTab("colloquiums");
      else if (item.href === "/student/history") setActiveTab("history");
    },
  }));

  const titles: Record<string, string> = {
    requests: "Meine Anfragen",
    new: "Neue Anfrage einreichen",
    examiners: "Prüfer:innen finden",
    colloquiums: "Mein Kolloquium",
    history: "Statushistorie",
  };

  return (
    <ThesisDashboardLayout navItems={currentNavItems} title={titles[activeTab]}>
      {activeTab === "new" && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-1">Themenidee einreichen</h2>
            <p className="text-sm text-gray-500 mb-6">
              Beschreibe deine Themenidee. Admins und Prüfer:innen werden benachrichtigt.
            </p>
            <NewRequestForm onSuccess={() => {
              utils.thesis.myRequests.invalidate();
              setActiveTab("requests");
            }} />
          </div>
        </div>
      )}
      {activeTab === "requests" && <MyRequests />}
      {activeTab === "examiners" && (
        <div>
          <div className="mb-5">
            <h2 className="font-semibold text-gray-900">Verfügbare Prüfer:innen</h2>
            <p className="text-sm text-gray-500 mt-1">
              Durchsuche Profile und finde passende Betreuer:innen für deine Arbeit.
            </p>
          </div>
          <ExaminerList />
        </div>
      )}
      {activeTab === "colloquiums" && <MyColloquiums />}
      {activeTab === "history" && <StatusHistory />}
    </ThesisDashboardLayout>
  );
}
