import { StatusBadge, ThesisDashboardLayout } from "@/components/ThesisDashboardLayout";
import Profile from "./Profile";
import { StudentProgrammeSelector } from "@/components/ProgrammeSelector";
import { ProgrammeSelect } from "@/components/ProgrammeSelect";
import { trpc } from "@/lib/trpc";
import { UserAvatar } from "@/components/UserAvatar";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation, Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { ProgrammeLogo } from "@/components/ProgrammeLogo";
import { buildFullName, getStatusBadge } from "@shared/const";
import { RegistrationPdfPreviewModal } from "@/components/RegistrationPdfPreviewModal";
import { DocComments } from "@/components/DocComments";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
  profile: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  heart: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
};
function useNavItems() {
  const { t } = useLanguage();
  return [
    { href: "/student", label: t.student.myRequests, icon: Icons.list },
    { href: "/student/new", label: t.student.newRequest, icon: Icons.plus },
    { href: "/student/examiners", label: t.nav.examiners, icon: Icons.search },
    { href: "/student/colloquiums", label: t.student.colloquiums, icon: Icons2.calendar },
    { href: "/student/history", label: t.student.history, icon: Icons2.history },
    { href: "/student/favorites", label: "Merkliste", icon: Icons2.heart },
    { href: "/student/profile", label: t.student.tabProfile, icon: Icons2.profile },
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

type FormDraft = { title: string; description: string; department: string; fachbereich: string; abstract: string; targetSemester: string; language: "de" | "en"; degreeType: "bachelor" | "master"; wantedExaminerId: number; };

function NewRequestForm({ onSuccess, preselectExaminerId = 0, initialDraft }: { onSuccess: () => void; preselectExaminerId?: number; initialDraft?: Partial<FormDraft>; }) {
  const { t } = useLanguage();
  // Studiengang aus Profil laden
  const { data: myProgramme } = trpc.programmes.getMyProgramme.useQuery();
  // Alle Programme laden (für dynamisches Dropdown)
  const { data: allProgrammes = [] } = trpc.programmes.list.useQuery();
  
  // Alle Erstgutachter:innen laden (role=examiner)
  const { data: firstExaminers = [] } = trpc.thesisPhase27.getFirstExaminers.useQuery();

  const [topicMode, setTopicMode] = useState<"own" | "assigned" | "examiner">("own");
  const hasOwnTopic = topicMode === "own"; // Rückwärtskompatibilität
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const { data: activeTopics = [] } = trpc.thesisPhase27.getAllActiveTopics.useQuery();
  const [exposeFile, setExposeFile] = useState<File | null>(null);
  const [showRestoreBanner, setShowRestoreBanner] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [examinerSearch, setExaminerSearch] = useState("");
  const [examinerSort, setExaminerSort] = useState<"alpha" | "available" | "capacity">("alpha");
  const [examinerDropdownOpen, setExaminerDropdownOpen] = useState(false);
  const examinerDropdownRef = useRef<HTMLDivElement>(null);
  const [hideFullExaminers, setHideFullExaminers] = useState(false);

  const [form, setForm] = useState<FormDraft>({
    title: initialDraft?.title ?? "",
    description: initialDraft?.description ?? "",
    department: initialDraft?.department ?? "",
    fachbereich: initialDraft?.fachbereich ?? "FB3",
    abstract: initialDraft?.abstract ?? "",
    targetSemester: initialDraft?.targetSemester ?? "",
    language: (initialDraft?.language ?? "de") as "de" | "en",
    degreeType: (initialDraft?.degreeType ?? "bachelor") as "bachelor" | "master",
    wantedExaminerId: initialDraft?.wantedExaminerId ?? preselectExaminerId,
  });

  // Zweitgutachter-Kandidaten gefiltert nach Erstgutachter-Präferenzen
  const { data: filteredSecondExaminers = [] } = trpc.thesisPhase27.getFilteredSecondExaminers.useQuery(
    { firstExaminerId: form.wantedExaminerId },
    { enabled: form.wantedExaminerId > 0 }
  );

  // Click-Outside-Handler für Prüfer-Dropdown
  useEffect(() => {
    if (!examinerDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (examinerDropdownRef.current && !examinerDropdownRef.current.contains(e.target as Node)) {
        setExaminerDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [examinerDropdownOpen]);

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
        if (parsed.hasOwnTopic !== undefined) setTopicMode(parsed.hasOwnTopic ? "own" : "assigned");
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
      toast.success(t.student.requestSubmitted);
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
      if (!form.title.trim()) newErrors.title = t.student.validationTitle;
      else if (form.title.trim().length < 10) newErrors.title = t.student.validationTitleShort;
      if (!form.description.trim()) newErrors.description = t.student.validationDesc;
      else if (form.description.trim().length < 30) newErrors.description = t.student.validationDescShort;
    }
    if (!form.targetSemester) newErrors.targetSemester = t.student.validationSemester;
    if (!form.wantedExaminerId) newErrors.wantedExaminerId = t.student.validationExaminer;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleShowPreview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error(t.student.validationFix);
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
        if (!res.ok) throw new Error(data.error ?? t.student.exposeUploadFailed);
        exposeUrl = data.url;
        exposeKey = data.key;
      } catch (err: unknown) {
        toast.error(`${t.student.uploadFailed}: ${err instanceof Error ? err.message : t.student.exposeUploadFailed}`);
        return;
      }
    }
    
    createMutation.mutate({ 
      ...form,
      // Wenn kein eigenes Thema: Platzhalter damit Zod-Validierung (min(1)) besteht
      title: hasOwnTopic ? form.title : (form.title.trim() || "Thema wird noch festgelegt"),
      description: hasOwnTopic ? form.description : (form.description.trim() || "Studierende:r sucht Betreuung für ein Thema nach Absprache mit der Prüfer:in."),
      exposeUrl,
      exposeKey,
      studySpecializations: (form as any).studySpecializations || undefined,
      personalInterests: (form as any).personalInterests || undefined,
      keywords: (form as any).keywords || undefined,
    });
  };

  // Vorschau-Sektion
  if (showPreview) {
    const selectedExaminer = (firstExaminers as any[]).find((e: any) => e.id === form.wantedExaminerId);
    const semesterLabel = getNextSemesters().find(s => s.value === form.targetSemester)?.label ?? form.targetSemester;
    return (
      <div className="space-y-5 print-area">
        {/* Druckkopf – nur im Druck sichtbar */}
        <div className="hidden print:block mb-6 pb-4 border-b-2 border-gray-800">
          <h1 className="text-xl font-bold text-gray-900">HTW Berlin – Thesis Match Maker</h1>
          <p className="text-sm text-gray-600 mt-1">{t.student.printHeader}</p>
          <p className="text-xs text-gray-400 mt-0.5">{new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}</p>
        </div>
        {/* Header */}
        <div className="flex items-center justify-between no-print">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{t.student.previewTitle}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{t.student.previewSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowPreview(false)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t.student.editBack}
          </button>
        </div>

        {/* Themenart */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{t.student.topicSelection}</h3>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
              hasOwnTopic ? "bg-[#76B900]/10 text-[#76B900]" : "bg-blue-50 text-blue-700"
            }`}>
              {hasOwnTopic ? (
                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>{t.student.ownTopicLabel}</>
              ) : (
                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>{t.student.assignedTopicLabel}</>
              )}
            </span>
          </div>
        </div>

        {/* Thema (nur bei eigenem Vorschlag) */}
        {hasOwnTopic && (
          <div className="rounded-2xl border border-[#76B900]/20 bg-[#76B900]/5 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-semibold text-[#76B900] uppercase tracking-widest">{t.student.topicSection}</h3>
            <div>
              <p className="text-xs text-gray-500 mb-1">{t.student.thesisTitle}</p>
              <p className="text-sm font-semibold text-gray-900">{form.title || <span className="text-gray-400 italic">{t.student.notSpecified}</span>}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">{t.student.description}</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{form.description || <span className="text-gray-400 italic">{t.student.notSpecified}</span>}</p>
            </div>
            {form.abstract && (
              <div>
                <p className="text-xs text-gray-500 mb-1">{t.student.abstractLabel}</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{form.abstract}</p>
              </div>
            )}
            {(form as any).studySpecializations && (
              <div>
                <p className="text-xs text-gray-500 mb-1">{t.student.studySpecializationsLabel}</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{(form as any).studySpecializations}</p>
              </div>
            )}
            {(form as any).personalInterests && (
              <div>
                <p className="text-xs text-gray-500 mb-1">{t.student.personalInterestsLabel}</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{(form as any).personalInterests}</p>
              </div>
            )}
            {(form as any).keywords && (() => {
              const tags = (form as any).keywords.split(",").map((k: string) => k.trim()).filter((k: string) => k.length > 0);
              return tags.length > 0 ? (
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">{t.student.keywordsLabel}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag: string, i: number) => (
                      <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: "#F1F8E9", color: "#4a7a00", border: "1px solid #c8e6a0" }}>{tag}</span>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}
            {exposeFile && (
              <div>
                <p className="text-xs text-gray-500 mb-1">{t.student.exposeLabel}</p>
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
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">{t.student.conditionsSection}</h3>
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
            <div>
              <dt className="text-xs text-gray-500">{t.student.departmentField}</dt>
              <dd className="text-sm font-medium text-gray-900 mt-0.5">{form.department || <span className="text-gray-400 italic">{t.student.notSpecified}</span>}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">{t.student.targetSemesterField}</dt>
              <dd className="text-sm font-medium text-gray-900 mt-0.5">{semesterLabel || <span className="text-gray-400 italic">{t.student.notSpecified}</span>}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-gray-500">{t.student.preferredExaminer}</dt>
              <dd className="text-sm font-medium text-gray-900 mt-0.5">
                {selectedExaminer ? buildFullName({ firstName: selectedExaminer.firstName, lastName: selectedExaminer.lastName, academicTitle: selectedExaminer.academicTitle ?? selectedExaminer.title, name: selectedExaminer.name }) : <span className="text-gray-400 italic">{t.student.notSelected}</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">{t.student.degreeField}</dt>
              <dd className="text-sm font-medium text-gray-900 mt-0.5">{form.degreeType === "master" ? "Master" : "Bachelor"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">{t.student.languageField}</dt>
              <dd className="text-sm font-medium text-gray-900 mt-0.5">{form.language === "en" ? t.student.thesisLangEn : t.student.thesisLangDe}</dd>
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
            {t.student.editBtn}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            {t.student.printBtn}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: "#76B900" }}
          >
            {createMutation.isPending ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t.student.submitting}</>
            ) : (
              <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>{t.student.submitNow}</>
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
          <span className="flex-1 text-amber-800 font-medium">{t.student.draftRestore}</span>
          <button type="button" onClick={restoreDraft} className="px-3 py-1 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-colors">
            {t.student.draftRestoreBtn}
          </button>
          <button type="button" onClick={discardDraft} className="px-3 py-1 rounded-lg bg-white border border-amber-200 text-amber-700 text-xs font-medium hover:bg-amber-50 transition-colors">
            {t.student.draftDiscardBtn}
          </button>
        </div>
      )}

      {/* Vorlage-Hinweis-Banner */}
      {!!initialDraft?.title && (
        <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-blue-50 border border-blue-200 text-sm">
          <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-semibold text-blue-800">Formular aus Vorlage befüllt</p>
            <p className="text-blue-700 text-xs mt-0.5">Die Felder wurden aus einer zurückgezogenen Anfrage übernommen. Bitte prüfen Sie alle Angaben sorgfältig, bevor Sie die neue Anfrage absenden.</p>
          </div>
        </div>
      )}

      {/* Themenauswahl – zwei Karten */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">{t.student.topicQuestion} <span className="text-red-500">*</span></p>
        <div className="grid sm:grid-cols-3 gap-3">
          {/* Karte: Eigener Vorschlag */}
          <button
            type="button"
            onClick={() => setTopicMode("own")}
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
                {t.student.ownTopic}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                {t.student.ownTopicDesc}
              </p>
            </div>
          </button>

          {/* Karte: Thema zuteilen */}
          <button
            type="button"
            onClick={() => setTopicMode("assigned")}
            className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
              topicMode === "assigned"
                ? "border-[#76B900] bg-[#f6ffe0]"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
              topicMode === "assigned" ? "border-[#76B900] bg-[#76B900]" : "border-gray-300 bg-white"
            }`}>
              {topicMode === "assigned" && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div>
              <p className={`font-semibold text-sm ${topicMode === "assigned" ? "text-[#4a7a00]" : "text-gray-700"}`}>
                {t.student.assignedTopic}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                {t.student.assignedTopicDesc}
              </p>
            </div>
          </button>
          {/* Karte: Thema von Prüfer:in auswählen */}
          <button
            type="button"
            onClick={() => setTopicMode("examiner")}
            className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
              topicMode === "examiner"
                ? "border-[#76B900] bg-[#f6ffe0]"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
              topicMode === "examiner" ? "border-[#76B900] bg-[#76B900]" : "border-gray-300 bg-white"
            }`}>
              {topicMode === "examiner" && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div>
              <p className={`font-semibold text-sm ${topicMode === "examiner" ? "text-[#4a7a00]" : "text-gray-700"}`}>
                Thema von Prüfer:in
              </p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                Wählen Sie ein veröffentlichtes Thema direkt aus.
              </p>
            </div>
          </button>
        </div>

        {/* Themenauswahl-Dropdown bei Prüfer-Thema */}
        {topicMode === "examiner" && (
          <div className="mt-3">
            {activeTopics.length === 0 ? (
              <p className="text-sm text-gray-400">Derzeit sind keine Themenvorschläge von Prüfer:innen verfügbar.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">Thema auswählen:</p>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {activeTopics.map((topic: any) => (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => {
                        setSelectedTopicId(topic.id);
                        setForm(f => ({
                          ...f,
                          title: topic.title,
                          description: topic.description,
                          language: topic.language ?? f.language,
                          degreeType: topic.degreeType ?? f.degreeType,
                          wantedExaminerId: topic.examinerId,
                        }));
                      }}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                        selectedTopicId === topic.id
                          ? "border-[#76B900] bg-[#f6ffe0]"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900">{topic.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{topic.description}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-[#4a7a00] font-medium">{topic.examinerName}</span>
                            {topic.degreeType && <span className="px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-700">{topic.degreeType === "bachelor" ? "Bachelor" : "Master"}</span>}
                            <span className="px-1.5 py-0.5 rounded text-xs bg-gray-50 text-gray-600">{topic.language === "en" ? "Englisch" : "Deutsch"}</span>
                          </div>
                        </div>
                        {selectedTopicId === topic.id && (
                          <svg className="w-5 h-5 text-[#76B900] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                {selectedTopicId && (
                  <p className="text-xs text-[#4a7a00] font-medium">Thema ausgewählt – Titel und Beschreibung wurden übernommen.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Abschnitt 1: Thema ───────────────────────────────────────────────────── */}
      {hasOwnTopic && (
        <div className="rounded-2xl border border-[#76B900]/20 bg-[#f9ffe8] p-5 space-y-4">
          <h3 className="text-xs font-semibold text-[#4a7a00] uppercase tracking-widest">{t.student.topicSection}</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t.student.thesisTitle} <span className="text-red-500">*</span>
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
              {t.student.description} <span className="text-red-500">*</span>
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
              {t.student.abstractOptional}
              <span className="relative group cursor-default">
                <svg className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 leading-relaxed">
                  {t.student.abstractTooltip}
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

          {/* Gewählte Vertiefungen im Studium */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
              {t.student.studySpecializationsLabel}
              <span className="text-gray-400 font-normal text-xs">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={(form as any).studySpecializations ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, studySpecializations: e.target.value }))}
              placeholder={t.student.studySpecializationsPlaceholder}
              maxLength={1000}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all resize-none bg-white"
            />
            <p className="text-xs text-gray-400 mt-1">{t.student.studySpecializationsHint}</p>
          </div>

          {/* Besondere Interessen */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
              {t.student.personalInterestsLabel}
              <span className="text-gray-400 font-normal text-xs">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={(form as any).personalInterests ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, personalInterests: e.target.value }))}
              placeholder={t.student.personalInterestsPlaceholder}
              maxLength={1000}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all resize-none bg-white"
            />
            <p className="text-xs text-gray-400 mt-1">{t.student.personalInterestsHint}</p>
          </div>

          {/* Schlagwörter */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
              {t.student.keywordsLabel}
              <span className="text-gray-400 font-normal text-xs">(optional)</span>
            </label>
            <input
              type="text"
              value={(form as any).keywords ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
              placeholder={t.student.keywordsPlaceholder}
              maxLength={500}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all bg-white"
            />
            <p className="text-xs text-gray-400 mt-1">{t.student.keywordsHint}</p>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
              {t.student.exposeLabel} <span className="text-gray-400 font-normal">(PDF, optional, max. 5 MB)</span>
              <span className="relative group cursor-default">
                <svg className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 leading-relaxed">
                  {t.student.exposeHint}
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
                      toast.error(t.student.exposePdfOnly);
                      return;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                      toast.error(t.student.fileTooLarge);
                      e.target.value = "";
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
                {exposeFile ? `✓ ${exposeFile.name}` : t.student.pdfSelect}
              </label>
                {exposeFile && (
                <button
                  type="button"
                  onClick={() => setExposeFile(null)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  {t.student.remove}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Abschnitt 2: Rahmenbedingungen ──────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4 shadow-sm">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{t.student.conditionsSection}</h3>

        {/* Profil-Info-Block: Fachbereich, Studiengang, Abschlussart – unveränderlich aus Profil */}
        {myProgramme ? (
          <div className="rounded-xl border border-[#76B900]/25 bg-[#76B900]/5 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-[#76B900] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-semibold text-[#4a7a00] uppercase tracking-wide">{t.student.profileDataLabel}</span>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              {/* Fachbereich */}
              <div className="bg-white rounded-lg px-3 py-2.5 border border-[#76B900]/20">
                <div className="text-xs text-gray-400 mb-0.5">{t.student.fachbereichLabel}</div>
                <div className="text-sm font-semibold text-gray-800">
                  {FACHBEREICHE.find(fb => fb.value === ((myProgramme as any).fachbereich ?? 'FB3'))?.label ?? ((myProgramme as any).fachbereich ?? 'FB3')}
                </div>
              </div>
              {/* Studiengang */}
              <div className="bg-white rounded-lg px-3 py-2.5 border border-[#76B900]/20 flex items-center gap-2">
                <ProgrammeLogo abbreviation={(myProgramme as any).abbreviation ?? myProgramme.name} pictogramUrl={(myProgramme as any).pictogramUrl} size="sm" />
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">{t.student.studyProgramLabel}</div>
                  <div className="text-sm font-semibold text-[#76B900]">
                    {(myProgramme as any).abbreviation ? `${(myProgramme as any).abbreviation}` : myProgramme.name}
                  </div>
                </div>
              </div>
              {/* Abschlussart */}
              <div className="bg-white rounded-lg px-3 py-2.5 border border-[#76B900]/20">
                <div className="text-xs text-gray-400 mb-0.5">{t.student.degreeSection}</div>
                <div className="text-sm font-semibold text-gray-800">
                  {form.degreeType === "master" ? "🎖️ Master" : "🎓 Bachelor"}
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400">{t.student.profileDataHint}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-800">{t.student.noProgrammeTitle}</p>
              <p className="text-xs text-amber-700 mt-0.5">{t.student.noProgrammeDesc}</p>
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Geplantes Semester der Thesis */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.student.semesterLabel} <span className="text-red-500">*</span></label>
            <select
              required
              value={form.targetSemester}
              className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all bg-white ${
                errors.targetSemester ? "border-red-400" : "border-gray-200"
              }`}
              onChange={(e) => { setForm((f) => ({ ...f, targetSemester: e.target.value })); if (errors.targetSemester) setErrors((er) => ({ ...er, targetSemester: "" })); }}
            >
              <option value="">{t.student.pleaseSelect}</option>
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.student.thesisLanguageLabel}</label>
            <select
              value={form.language}
              onChange={(e) => setForm((f) => ({ ...f, language: e.target.value as "de" | "en" }))}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all bg-white"
            >
              <option value="de">{t.student.thesisLangDe}</option>
              <option value="en">{t.student.thesisLangEn}</option>
            </select>
          </div>
        </div>

        {/* Zweistufige Gutachter-Auswahl */}
        <div className="space-y-4 rounded-2xl border border-[#76B900]/20 bg-[#76B900]/5 p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-[#76B900] text-white flex items-center justify-center text-xs font-bold">1</div>
            <h4 className="text-sm font-semibold text-gray-800">{t.student.firstExaminer}</h4>
          </div>
          <p className="text-xs text-gray-500 -mt-2">{t.student.firstExaminerDesc}</p>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">{t.student.firstExaminerLabel} <span className="text-red-500">*</span></label>
            {/* Such- und Sortierleiste */}
            <div className="flex flex-wrap gap-2 mb-2">
              <div className="flex rounded-xl border border-gray-200 overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setExaminerSort("alpha")}
                  className={`px-2.5 py-1.5 font-medium transition-colors ${
                    examinerSort === "alpha"
                      ? "bg-[#76B900] text-white"
                      : "bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                  title="Alphabetisch sortieren"
                >
                  A–Z
                </button>
                <button
                  type="button"
                  onClick={() => setExaminerSort("available")}
                  className={`px-2.5 py-1.5 font-medium transition-colors border-l border-gray-200 ${
                    examinerSort === "available"
                      ? "bg-[#76B900] text-white"
                      : "bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                  title="Verfügbare zuerst"
                >
                  ✅ Frei
                </button>
                <button
                  type="button"
                  onClick={() => setExaminerSort("capacity")}
                  className={`px-2.5 py-1.5 font-medium transition-colors border-l border-gray-200 ${
                    examinerSort === "capacity"
                      ? "bg-[#76B900] text-white"
                      : "bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                  title="Nach freier Kapazität sortieren"
                >
                  Kapazität
                </button>
              </div>
              {/* Filter-Toggle: Ausgelastete ausblenden */}
              <button
                type="button"
                onClick={() => setHideFullExaminers((v) => !v)}
                title={hideFullExaminers ? "Ausgelastete wieder anzeigen" : "Ausgelastete Prüfer:innen ausblenden"}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                  hideFullExaminers
                    ? "bg-red-50 border-red-300 text-red-600"
                    : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                Ausgelastet
              </button>
            </div>
            <div className="relative mb-2">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={examinerSearch}
                onChange={(e) => setExaminerSearch(e.target.value)}
                placeholder="Name oder Fachbereich suchen …"
                className="w-full pl-8 pr-8 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#76B900]/40 bg-white"
              />
              {examinerSearch && (
                <button
                  type="button"
                  onClick={() => setExaminerSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Suche zurücksetzen"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {/* Custom Dropdown mit Fortschrittsbalken */}
            {(() => {
              // Suchfilter + Ausgelastet-Filter anwenden
              const q = examinerSearch.toLowerCase();
              const filtered = (firstExaminers as any[]).filter((e: any) => {
                // Ausgelastete ausblenden wenn Toggle aktiv
                if (hideFullExaminers) {
                  const isFull = e.maxSupervisions != null && e.activeSupervisions != null && e.activeSupervisions >= e.maxSupervisions;
                  if (isFull) return false;
                }
                if (!q) return true;
                const name = buildFullName({ firstName: e.firstName, lastName: e.lastName, academicTitle: e.academicTitle ?? e.title, name: e.name }).toLowerCase();
                const dept = (e.department ?? "").toLowerCase();
                return name.includes(q) || dept.includes(q);
              });
              const sorted = [...filtered].sort((a: any, b: any) => {
                if (examinerSort === "available") {
                  const aFull = (a.maxSupervisions != null && a.activeSupervisions != null && a.activeSupervisions >= a.maxSupervisions);
                  const bFull = (b.maxSupervisions != null && b.activeSupervisions != null && b.activeSupervisions >= b.maxSupervisions);
                  if (aFull !== bFull) return aFull ? 1 : -1;
                } else if (examinerSort === "capacity") {
                  const aFree = (a.maxSupervisions ?? 5) - (a.activeSupervisions ?? 0);
                  const bFree = (b.maxSupervisions ?? 5) - (b.activeSupervisions ?? 0);
                  if (aFree !== bFree) return bFree - aFree;
                }
                const lastA = a.lastName ?? (a.name ?? "").trim().split(" ").pop() ?? "";
                const lastB = b.lastName ?? (b.name ?? "").trim().split(" ").pop() ?? "";
                return lastA.localeCompare(lastB, "de");
              });
              const selectedExaminer = (firstExaminers as any[]).find((e: any) => e.id === form.wantedExaminerId);
              const selectedName = selectedExaminer
                ? buildFullName({ firstName: selectedExaminer.firstName, lastName: selectedExaminer.lastName, academicTitle: selectedExaminer.academicTitle ?? selectedExaminer.title, name: selectedExaminer.name })
                : t.student.pleaseSelect;
              return (
                <div ref={examinerDropdownRef} className="relative">
                  {/* Trigger-Button */}
                  <button
                    type="button"
                    onClick={() => setExaminerDropdownOpen((o) => !o)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 border rounded-xl text-sm bg-white transition-all focus:outline-none focus:ring-2 focus:ring-[#76B900]/40 ${
                      errors.wantedExaminerId ? "border-red-400" : examinerDropdownOpen ? "border-[#76B900]" : "border-gray-200"
                    }`}
                  >
                    <span className={form.wantedExaminerId ? "text-gray-800" : "text-gray-400"}>{selectedName}</span>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${examinerDropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {/* Dropdown-Panel */}
                  {examinerDropdownOpen && (
                    <div
                      className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
                      style={{ maxHeight: "320px", overflowY: "auto" }}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      {sorted.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-400 italic">Keine Treffer für „{examinerSearch}“</div>
                      ) : (() => {
                        const items: React.ReactNode[] = [];
                        let currentLetter = "";
                        sorted.forEach((examiner: any) => {
                          const lastName = examiner.lastName ?? (examiner.name ?? "").trim().split(" ").pop() ?? "";
                          const letter = lastName.charAt(0).toUpperCase();
                          if (examinerSort === "alpha" && letter !== currentLetter) {
                            currentLetter = letter;
                            items.push(
                              <div key={`sep-${letter}`} className="px-3 py-1 text-xs font-semibold text-gray-400 bg-gray-50 border-b border-gray-100 sticky top-0">
                                {letter}
                              </div>
                            );
                          }
                          const active = examiner.activeSupervisions as number | undefined;
                          const max = examiner.maxSupervisions as number | undefined;
                          const isFull = max != null && active != null && active >= max;
                          const isAlmost = !isFull && max != null && active != null && active / max >= 0.8;
                          const pct = max != null && active != null ? Math.min(100, Math.round((active / max) * 100)) : null;
                          const barColor = isFull ? "bg-red-500" : isAlmost ? "bg-amber-400" : "bg-[#76B900]";
                          const displayName = buildFullName({ firstName: examiner.firstName, lastName: examiner.lastName, academicTitle: examiner.academicTitle ?? examiner.title, name: examiner.name });
                          const isSelected = form.wantedExaminerId === examiner.id;
                          items.push(
                            <button
                              key={examiner.id}
                              type="button"
                              disabled={isFull}
                              onClick={() => {
                                setForm((f) => ({ ...f, wantedExaminerId: examiner.id }));
                                if (errors.wantedExaminerId) setErrors((er) => ({ ...er, wantedExaminerId: "" }));
                                setExaminerDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2.5 border-b border-gray-50 last:border-0 transition-colors ${
                                isFull ? "opacity-50 cursor-not-allowed bg-gray-50" :
                                isSelected ? "bg-[#76B900]/10" :
                                "hover:bg-gray-50 cursor-pointer"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className={`text-sm font-medium truncate ${isFull ? "text-gray-400" : "text-gray-800"}`}>
                                  {isSelected && <span className="text-[#76B900] mr-1">✓</span>}
                                  {displayName}
                                </span>
                                <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                                  {examiner.department ?? ""}
                                </span>
                              </div>
                              {pct !== null && max != null && active != null && (
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${barColor}`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className={`text-xs font-medium whitespace-nowrap ${
                                    isFull ? "text-red-500" : isAlmost ? "text-amber-500" : "text-[#76B900]"
                                  }`}>
                                    {active}/{max}
                                    {isFull ? " ⛔" : isAlmost ? " ⚠️" : ""}
                                  </span>
                                </div>
                              )}
                            </button>
                          );
                        });
                        return items;
                      })()}
                    </div>
                  )}
                </div>
              );
            })()}
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
              <h4 className="text-sm font-semibold text-gray-500">{t.student.selectSecondExaminer}</h4>
            </div>
            <p className="text-xs text-gray-400 mb-3">{t.student.secondExaminerNote}</p>
            <div className="relative">
              <select
                disabled
                value={0}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
              >
                <option value={0}>{t.student.noPreference}</option>
              </select>
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50/60 rounded-xl">
                <span className="text-xs text-gray-400 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  {t.student.availableAfterFirst}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Persönliche Angaben (auch im Thema-zugeteilt-Modus) ─────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4 shadow-sm">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{t.student.personalSection}</h3>

        {/* Gewählte Vertiefungen im Studium */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
            {t.student.studySpecializationsLabel}
            <span className="text-gray-400 font-normal text-xs">(optional)</span>
          </label>
          <textarea
            rows={3}
            value={(form as any).studySpecializations ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, studySpecializations: e.target.value }))}
            placeholder={t.student.studySpecializationsPlaceholder}
            maxLength={1000}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all resize-none bg-white"
          />
          <p className="text-xs text-gray-400 mt-1">{t.student.studySpecializationsHint}</p>
        </div>

        {/* Besondere Interessen */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
            {t.student.personalInterestsLabel}
            <span className="text-gray-400 font-normal text-xs">(optional)</span>
          </label>
          <textarea
            rows={3}
            value={(form as any).personalInterests ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, personalInterests: e.target.value }))}
            placeholder={t.student.personalInterestsPlaceholder}
            maxLength={1000}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all resize-none bg-white"
          />
          <p className="text-xs text-gray-400 mt-1">{t.student.personalInterestsHint}</p>
        </div>

        {/* Schlagwörter */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
            {t.student.keywordsLabel}
            <span className="text-gray-400 font-normal text-xs">(optional)</span>
          </label>
          <input
            type="text"
            value={(form as any).keywords ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
            placeholder={t.student.keywordsPlaceholder}
            maxLength={500}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all bg-white"
          />
          <p className="text-xs text-gray-400 mt-1">{t.student.keywordsHint}</p>
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
        {t.student.previewSubmit}
      </button>
    </form>
  );
}// ─── Exposé-Upload ────────────────────────────────────────────────────────────────
function ExposeUploadButton({ thesisId, currentUrl, onSuccess }: { thesisId: number; currentUrl?: string | null; onSuccess: () => void }) {
  const { t } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error(t.student.exposePdfOnly);
      return;
    }
    if (file.size > 16 * 1024 * 1024) {
      toast.error(t.student.exposeFileTooLarge);
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
      if (!res.ok) throw new Error(data.error ?? t.student.exposeUploadFailed);
      toast.success(t.student.exposeUploadSuccess);
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t.student.exposeUploadFailed);
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
            {t.student.exposeView}
          </a>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            {uploading ? <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" /> : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>}
            {t.student.exposeReplace}
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-dashed border-gray-300 text-gray-500 hover:border-primary hover:text-primary transition-all disabled:opacity-50"
        >
          {uploading ? <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" /> : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>}
          {t.student.exposeUploadBtn}
        </button>
      )}
    </div>
  );
}

// ─── Zweitgutachter-Anfrageprozess nach Erstgutachter-Zusage ─────────────────
const EXTERNAL_MARKER = -999;

function SecondExaminerPicker({
  requestId,
  wantedExaminerId,
  wantedSecondExaminerId,
  externalSecondExaminerTitle,
  externalSecondExaminerFirstName,
  externalSecondExaminerLastName,
  externalSecondExaminerEmail,
  secondExaminerRequestedAt,
}: {
  requestId: number;
  wantedExaminerId?: number | null;
  wantedSecondExaminerId?: number | null;
  externalSecondExaminerTitle?: string | null;
  externalSecondExaminerFirstName?: string | null;
  externalSecondExaminerLastName?: string | null;
  externalSecondExaminerEmail?: string | null;
  secondExaminerRequestedAt?: string | null;
}) {
  const { t } = useLanguage();
  const utils = trpc.useUtils();

  const hasRequest = !!wantedSecondExaminerId || !!externalSecondExaminerFirstName;

  const [selectedId, setSelectedId] = useState<number>(
    externalSecondExaminerFirstName ? EXTERNAL_MARKER : (wantedSecondExaminerId ?? 0)
  );
  const [extTitle, setExtTitle] = useState(externalSecondExaminerTitle ?? "");
  const [extFirstName, setExtFirstName] = useState(externalSecondExaminerFirstName ?? "");
  const [extLastName, setExtLastName] = useState(externalSecondExaminerLastName ?? "");
  const [extEmail, setExtEmail] = useState(externalSecondExaminerEmail ?? "");

  const { data: secondExaminers = [] } = trpc.thesisPhase27.getFilteredSecondExaminers.useQuery(
    { firstExaminerId: wantedExaminerId ?? 0 },
    { enabled: !!wantedExaminerId && wantedExaminerId > 0 }
  );

  const setMutation = trpc.thesisPhase27.setWantedSecondExaminer.useMutation({
    onSuccess: () => {
      toast.success("Anfrage an Zweitgutachter:in gesendet.");
      utils.thesis.myRequests.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const setExternalMutation = trpc.thesisPhase27.setExternalSecondExaminer.useMutation({
    onSuccess: () => {
      toast.success("Externe Zweitgutachter:in eingetragen.");
      utils.thesis.myRequests.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const withdrawMutation = trpc.thesisPhase27.withdrawSecondExaminerRequest.useMutation({
    onSuccess: () => {
      toast.success("Anfrage zurückgezogen.");
      utils.thesis.myRequests.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSend = () => {
    if (selectedId === EXTERNAL_MARKER) {
      if (!extFirstName.trim() || !extLastName.trim() || !extEmail.trim()) {
        toast.error("Bitte Vorname, Nachname und E-Mail angeben.");
        return;
      }
      setExternalMutation.mutate({ requestId, title: extTitle, firstName: extFirstName, lastName: extLastName, email: extEmail });
    } else if (selectedId > 0) {
      setMutation.mutate({ requestId, secondExaminerId: selectedId });
    } else {
      toast.error("Bitte eine Zweitgutachter:in auswählen.");
    }
  };

  const isSaving = setMutation.isPending || setExternalMutation.isPending;

  // ── Ansicht: Anfrage bereits gestellt ──
  if (hasRequest) {
    const isExternal = !!externalSecondExaminerFirstName;
    const examinerDisplay = isExternal
      ? `${externalSecondExaminerTitle ? externalSecondExaminerTitle + " " : ""}${externalSecondExaminerFirstName} ${externalSecondExaminerLastName}`
      : (() => {
          const e = (secondExaminers as any[]).find((e: any) => e.id === wantedSecondExaminerId);
          return e ? buildFullName({ firstName: e.firstName, lastName: e.lastName, academicTitle: e.academicTitle ?? e.title, name: e.name }) : `ID ${wantedSecondExaminerId}`;
        })();

    return (
      <div className="mt-3 pt-3 border-t border-gray-50">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">2</div>
            <span className="text-xs font-semibold text-amber-800">Zweitgutachter:in auswählen</span>
            <span className="ml-auto text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
              {isExternal ? "Extern eingetragen" : "Anfrage gestellt"}
            </span>
          </div>
          <p className="text-xs text-amber-700 mb-2">
            {isExternal
              ? "Externe Zweitgutachter:in eingetragen. Änderung nur möglich nach Rückzug."
              : "Anfrage an Zweitgutachter:in wurde gesendet. Änderung nur möglich nach Rückzug oder Ablehnung."}
          </p>
          <div className="bg-white rounded-lg border border-amber-200 px-3 py-2 mb-2">
            <p className="text-xs font-semibold text-gray-800">{examinerDisplay}</p>
            {isExternal && externalSecondExaminerEmail && (
              <p className="text-xs text-gray-500">{externalSecondExaminerEmail}</p>
            )}
            {secondExaminerRequestedAt && (
              <p className="text-xs text-gray-400 mt-0.5">
                Angefragt: {new Date(secondExaminerRequestedAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}
              </p>
            )}
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                disabled={withdrawMutation.isPending}
                className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {withdrawMutation.isPending ? "Wird zurückgezogen…" : "Anfrage zurückziehen"}
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Anfrage zurückziehen?</AlertDialogTitle>
                <AlertDialogDescription>
                  Möchten Sie die Anfrage an die Zweitgutachter:in wirklich zurückziehen? Sie können danach eine neue Anfrage stellen.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => withdrawMutation.mutate({ requestId })}
                >
                  Zurückziehen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    );
  }

  // ── Ansicht: Auswahl treffen ──
  return (
    <div className="mt-3 pt-3 border-t border-gray-50">
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">2</div>
          <span className="text-xs font-semibold text-blue-800">Zweitgutachter:in auswählen</span>
          <span className="ml-auto text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Erstgutachter:in hat zugesagt</span>
        </div>
        <p className="text-xs text-blue-600 mb-3">Wählen Sie eine Zweitgutachter:in aus. Nach dem Senden wird eine Anfrage gestellt – analog zum Erstgutachter-Prozess.</p>

        <select
          value={selectedId}
          onChange={(e) => setSelectedId(parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-blue-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 mb-2"
        >
          <option value={0}>-- Bitte auswählen --</option>
          <option value={EXTERNAL_MARKER}>Zweitgutachter:in ist nicht in der Liste</option>
          <option disabled value="">────────────────────</option>
          {(() => {
            const sorted = [...(secondExaminers as any[])]
              .filter((e: any) => e.id !== wantedExaminerId)
              .sort((a: any, b: any) => {
                const lastA = a.lastName ?? (a.name ?? "").trim().split(" ").pop() ?? "";
                const lastB = b.lastName ?? (b.name ?? "").trim().split(" ").pop() ?? "";
                return lastA.localeCompare(lastB, "de");
              });
            const result: React.ReactNode[] = [];
            let currentLetter = "";
            sorted.forEach((e: any) => {
              const lastName = e.lastName ?? (e.name ?? "").trim().split(" ").pop() ?? "";
              const letter = lastName.charAt(0).toUpperCase();
              if (letter !== currentLetter) {
                currentLetter = letter;
                result.push(<option key={`sep2-${letter}`} disabled value="">── {letter} ──</option>);
              }
              const eActive = (e as any).activeSupervisions as number | undefined;
              const eMax = (e as any).maxSupervisions as number | undefined;
              const eHint = eMax != null
                ? eActive != null && eActive >= eMax
                     ? ` — Kapazität voll`
                    : eActive != null && eMax > 0 && eActive / eMax >= 0.8
                      ? ` — fast voll`
                    : ""
                : "";
              const displayName = buildFullName({ firstName: e.firstName, lastName: e.lastName, academicTitle: e.academicTitle ?? e.title, name: e.name });
              const deptInfo = e.department ? ` · ${e.department}` : "";
              result.push(
                <option key={e.id} value={e.id} disabled={eMax != null && eActive != null && eActive >= eMax}>
                  {displayName}{deptInfo}{eHint}
                </option>
              );
            });
            return result;
          })()}
        </select>

        {selectedId === EXTERNAL_MARKER && (
          <div className="space-y-2 mb-3 p-3 bg-white rounded-lg border border-blue-200">
            <p className="text-xs font-semibold text-gray-700 mb-1">Angaben zur externen Zweitgutachter:in</p>
            <div className="flex gap-2">
              <div className="w-28">
                <label className="text-xs text-gray-500 mb-0.5 block">Titel (opt.)</label>
                <input
                  type="text"
                  value={extTitle}
                  onChange={(e) => setExtTitle(e.target.value)}
                  placeholder="Prof. Dr."
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-0.5 block">Vorname *</label>
                <input
                  type="text"
                  value={extFirstName}
                  onChange={(e) => setExtFirstName(e.target.value)}
                  placeholder="Maria"
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-0.5 block">Nachname *</label>
                <input
                  type="text"
                  value={extLastName}
                  onChange={(e) => setExtLastName(e.target.value)}
                  placeholder="Musterfrau"
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-0.5 block">E-Mail-Adresse *</label>
              <input
                type="email"
                value={extEmail}
                onChange={(e) => setExtEmail(e.target.value)}
                placeholder="m.musterfrau@beispiel.de"
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={isSaving || selectedId === 0}
          className="w-full px-3 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50 transition-colors"
          style={{ backgroundColor: "#76B900" }}
        >
          {isSaving ? "Wird gesendet…" : selectedId === EXTERNAL_MARKER ? "Externe Zweitgutachter:in eintragen" : "Anfrage senden"}
        </button>
      </div>
    </div>
  );
}

// ─── My Requests ────────────────────────────────────────────────────────────────
const WITHDRAWABLE_STATUSES = ["PENDING", "PENDING_FIRST_EXAMINER", "PENDING_SECOND_EXAMINER"];

function MyRequests({ onReuseRequest }: { onReuseRequest?: (draft: Partial<FormDraft>) => void }) {
  const { t } = useLanguage();
  const utils = trpc.useUtils();
  const { data: requests, isLoading } = trpc.thesis.myRequests.useQuery();

  const withdrawMutation = trpc.thesisPhase27.withdraw.useMutation({
    onSuccess: () => {
      toast.success(t.student.withdrawSuccess);
      utils.thesis.myRequests.invalidate();
    },
    onError: (err) => toast.error(err.message ?? t.student.withdrawError),
  });

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
        <h3 className="text-gray-900 font-semibold mb-1">{t.student.noRequestsTitle}</h3>
        <p className="text-gray-500 text-sm">{t.student.noRequestsDesc}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((req) => (
        <StudentRequestCard key={req.id} req={req} utils={utils} withdrawMutation={withdrawMutation} onReuseRequest={onReuseRequest} />
      ))}
    </div>
  );
}

function StudentRequestCard({ req, utils, withdrawMutation, onReuseRequest }: { req: any; utils: any; withdrawMutation: any; onReuseRequest?: (draft: Partial<FormDraft>) => void }) {
  const [showRegPreview, setShowRegPreview] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState("");
  const [condDocNote, setCondDocNote] = useState("");
  const [condDocUploading, setCondDocUploading] = useState(false);
  const condDocFileRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  const { user } = useAuth();
  const isConditional = req.status === "CONDITIONAL_ACCEPTANCE";

  const { data: condDocs, refetch: refetchCondDocs } = trpc.examinerEmailTemplates.getConditionalDocuments.useQuery(
    { thesisRequestId: req.id },
    { enabled: isConditional }
  );

  const deleteCondDocMutation = trpc.examinerEmailTemplates.deleteConditionalDocument.useMutation({
    onSuccess: () => { refetchCondDocs(); toast.success("Dokument gelöscht."); },
    onError: (e) => toast.error(e.message),
  });

  async function handleCondDocUpload(file: File) {
    if (!file) return;
    setCondDocUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (condDocNote.trim()) formData.append("note", condDocNote.trim());
      const res = await fetch(`/api/thesis/${req.id}/conditional-documents`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload fehlgeschlagen");
      toast.success(`"${json.filename}" erfolgreich hochgeladen.`);
      setCondDocNote("");
      if (condDocFileRef.current) condDocFileRef.current.value = "";
      refetchCondDocs();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload fehlgeschlagen.");
    } finally {
      setCondDocUploading(false);
    }
  }
  return (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 truncate">{req.title}</h3>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                {/* Angefragte Prüfer:in (wantedExaminer) – immer anzeigen */}
                {(req as any).wantedExaminerId && (
                  <span className="flex items-center gap-1 text-xs text-gray-600">
                    <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-gray-400 text-xs">Anfrage an:</span>
                    <Link
                      href={`/profile/${(req as any).wantedExaminerId}`}
                      className="text-[#2563eb] hover:underline font-medium"
                    >
                      {buildFullName({
                        firstName: (req as any).wantedExaminerFirstName,
                        lastName: (req as any).wantedExaminerLastName,
                        academicTitle: (req as any).wantedExaminerAcademicTitle,
                        name: (req as any).wantedExaminerName,
                      }) || `Prüfer:in #${(req as any).wantedExaminerId}`}
                    </Link>
                  </span>
                )}
                {/* Zugewiesene Erstprüfer:in */}
                {req.examinerId && (req as any).firstExaminerFirstName || (req as any).firstExaminerName ? (
                  <span className="flex items-center gap-1 text-xs text-gray-600">
                    <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-gray-400 text-xs">1. Prüfer:in:</span>
                    <Link
                      href={`/profile/${req.examinerId}`}
                      className="text-[#2563eb] hover:underline font-medium"
                    >
                      {buildFullName({
                        firstName: (req as any).firstExaminerFirstName,
                        lastName: (req as any).firstExaminerLastName,
                        academicTitle: (req as any).firstExaminerAcademicTitle,
                        name: (req as any).firstExaminerName,
                      }) || `Prüfer:in #${req.examinerId}`}
                    </Link>
                  </span>
                ) : null}
                {/* Zugewiesene Zweitprüfer:in */}
                {req.secondExaminerId && (req as any).secondExaminerFirstName || (req as any).secondExaminerName ? (
                  <span className="flex items-center gap-1 text-xs text-gray-600">
                    <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-gray-400 text-xs">2. Prüfer:in:</span>
                    <Link
                      href={`/profile/${req.secondExaminerId}`}
                      className="text-[#2563eb] hover:underline font-medium"
                    >
                      {buildFullName({
                        firstName: (req as any).secondExaminerFirstName,
                        lastName: (req as any).secondExaminerLastName,
                        academicTitle: (req as any).secondExaminerAcademicTitle,
                        name: (req as any).secondExaminerName,
                      }) || `Prüfer:in #${req.secondExaminerId}`}
                    </Link>
                  </span>
                ) : null}
                {/* Datum der Anfrage – immer anzeigen */}
                {req.createdAt && (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(req.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                )}
                {(req as any).programmeName && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-[#76B900]/10 text-[#76B900]">
                    {(req as any).programmeAbbreviation ?? (req as any).programmeName}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <StatusBadge status={req.status} />
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
          {/* Persönliche Angaben */}
          {((req as any).studySpecializations || (req as any).personalInterests || (req as any).keywords) && (
            <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
              {(req as any).studySpecializations && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-0.5">Gewählte Vertiefungen im Studium</p>
                  <p className="text-xs text-gray-700 whitespace-pre-wrap">{(req as any).studySpecializations}</p>
                </div>
              )}
              {(req as any).personalInterests && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-0.5">Besondere Interessen</p>
                  <p className="text-xs text-gray-700 whitespace-pre-wrap">{(req as any).personalInterests}</p>
                </div>
              )}
              {(req as any).keywords && (() => {
                const tags: string[] = (() => { try { return JSON.parse((req as any).keywords); } catch { return []; } })();
                return tags.length > 0 ? (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Schlagwörter</p>
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((tag: string, i: number) => (
                        <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: "#F1F8E9", color: "#4a7a00", border: "1px solid #c8e6a0" }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          )}
          {req.rejectionReason && (
            <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-100">
              <p className="text-xs text-red-700">
                <strong>Ablehnungsgrund:</strong> {req.rejectionReason}
              </p>
            </div>
          )}
          {req.status === "CONDITIONAL_ACCEPTANCE" && (
            <div className="mt-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-amber-800 mb-1">
                    Zusage unter Vorbehalt
                  </p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Ihre Betreuungsperson hat grundsätzliche Bereitschaft zur Betreuung signalisiert, jedoch noch nicht endgültig zugesagt. Bitte klären Sie die offenen Punkte direkt mit Ihrer Betreuungsperson.
                  </p>
                  {(req as any).conditionalAcceptanceReason && (
                    <div className="mt-2 pt-2 border-t border-amber-200">
                      <p className="text-xs font-medium text-amber-800 mb-0.5">Vorbehalt / Hinweis der Betreuungsperson:</p>
                      <p className="text-xs text-amber-700 whitespace-pre-wrap">{(req as any).conditionalAcceptanceReason}</p>
                    </div>
                  )}

                  {/* Upload-Bereich */}
                  <div className="mt-3 pt-3 border-t border-amber-200">
                    <p className="text-xs font-semibold text-amber-800 mb-2">Dokumente einreichen</p>
                    <p className="text-xs text-amber-700 mb-3">
                      Laden Sie hier überarbeitete Exposés oder ergänzende Unterlagen hoch, die Ihrer Betreuungsperson vorgelegt werden sollen. Erlaubte Formate: PDF, Word, PowerPoint, Bilder (max. 10 MB).
                    </p>

                    {/* Vorhandene Dokumente */}
                    {condDocs && condDocs.length > 0 && (
                      <div className="mb-3 space-y-1.5">
                        {condDocs.map((doc: any) => (
                          <div key={doc.id} className="bg-white rounded-lg border border-amber-200 overflow-hidden">
                            <div className="flex items-center gap-2 p-2">
                            <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <div className="flex-1 min-w-0">
                              <a href={doc.storageUrl} target="_blank" rel="noopener noreferrer"
                                className="text-xs font-medium text-blue-700 hover:underline truncate block">
                                {doc.originalFilename}
                              </a>
                              {doc.note && <p className="text-xs text-amber-600 truncate">{doc.note}</p>}
                              <p className="text-xs text-gray-400">{new Date(doc.createdAt).toLocaleDateString("de-DE")}</p>
                            </div>
                            <button
                              onClick={() => { if (confirm("Dokument wirklich löschen?")) deleteCondDocMutation.mutate({ documentId: doc.id }); }}
                              className="p-1 text-red-400 hover:text-red-600 flex-shrink-0"
                              title="Löschen"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                            </div>{/* end flex row */}
                            {/* Feedback vom Prüfer zu diesem Dokument */}
                            <div className="border-t border-amber-100 bg-amber-50/30 px-2 pb-2">
                              <p className="text-xs font-semibold text-amber-700 mt-2 mb-1">Feedback des Prüfers</p>
                              <DocComments
                                documentId={doc.id}
                                documentName={doc.originalFilename}
                                currentUserId={user?.id ?? 0}
                                canComment={false}
                                showInput={false}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Notiz-Feld */}
                    <textarea
                      value={condDocNote}
                      onChange={(e) => setCondDocNote(e.target.value)}
                      placeholder="Optionale Anmerkung zum Dokument..."
                      rows={2}
                      className="w-full text-xs border border-amber-200 rounded-lg px-3 py-2 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none mb-2"
                    />

                    {/* Upload-Button */}
                    <input
                      ref={condDocFileRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCondDocUpload(f); }}
                    />
                    <button
                      onClick={() => condDocFileRef.current?.click()}
                      disabled={condDocUploading}
                      className="flex items-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      {condDocUploading ? (
                        <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Wird hochgeladen...</>
                      ) : (
                        <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>Dokument hochladen</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {(req as { deadline?: Date | string | null }).deadline && (
            <div className="mt-3 flex items-center gap-2 p-2.5 bg-amber-50 rounded-xl border border-amber-100">
              <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs text-amber-700 font-medium">
                Deadline: {new Date((req as unknown as { deadline: Date | string }).deadline).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
              </span>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/thesis/${req.id}/deadline.ics`, { credentials: 'include' });
                    if (!res.ok) { toast.error('Kalender-Export fehlgeschlagen'); return; }
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `deadline-${req.id}.ics`;
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    toast.success('Kalender-Termin wurde heruntergeladen.');
                  } catch { toast.error('Kalender-Export fehlgeschlagen'); }
                }}
                className="ml-auto px-2.5 py-1 rounded-lg text-xs font-medium border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors"
                title="Deadline in Kalender importieren (.ics)"
              >
                Kalender
              </button>
            </div>
          )}
          {/* Zweitgutachter-Auswahl nach Erstgutachter-Zusage */}
          {(req.status === "FIRST_EXAMINER_ACCEPTED" || req.status === "PENDING_SECOND_EXAMINER") && (
            <SecondExaminerPicker
              requestId={req.id}
              wantedExaminerId={(req as any).wantedExaminerId}
              wantedSecondExaminerId={(req as any).wantedSecondExaminerId}
              externalSecondExaminerTitle={(req as any).externalSecondExaminerTitle}
              externalSecondExaminerFirstName={(req as any).externalSecondExaminerFirstName}
              externalSecondExaminerLastName={(req as any).externalSecondExaminerLastName}
              externalSecondExaminerEmail={(req as any).externalSecondExaminerEmail}
              secondExaminerRequestedAt={(req as any).secondExaminerRequestedAt}
            />
          )}
          <div className="mt-3 pt-3 border-t border-gray-50 flex flex-col gap-3">
            <ExposeUploadButton
              thesisId={req.id}
              currentUrl={(req as { exposeUrl?: string | null }).exposeUrl}
              onSuccess={() => utils.thesis.myRequests.invalidate()}
            />
          {/* Antrag-Zusammenfassung PDF */}
          <a
            href={`/api/export/thesis/${req.id}/summary.pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border border-gray-200 text-gray-600 hover:border-[#76B900] hover:text-[#76B900] transition-colors"
            title="Antrag-Zusammenfassung als PDF herunterladen"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Zusammenfassung (PDF)
          </a>
          {/* Anmeldedokument – Vorschau + Download */}
          {("FIRST_EXAMINER_ACCEPTED SECOND_EXAMINER_ASSIGNED MATCHED REGISTERED ACCEPTED COMPLETED".split(" ") as string[]).includes(req.status) && (
            <>
              <button
                onClick={() => setShowRegPreview(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-[#76B900] text-white hover:bg-[#5a8f00] transition-colors"
                title="Anmeldedokument im Browser ansehen"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Anmeldedokument ansehen
              </button>
            </>
          )}
          {/* Anfrage zurückziehen – nur bei noch nicht beantworteten Anfragen */}
          {WITHDRAWABLE_STATUSES.includes(req.status) && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
                    disabled={withdrawMutation.isPending}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {t.student.withdrawRequest}
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t.student.withdrawConfirmTitle}</AlertDialogTitle>
                    <AlertDialogDescription>{t.student.withdrawConfirmDesc}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="px-1 pb-2">
                    <label className="text-xs font-medium text-gray-600 block mb-1.5">
                      Grund für den Abbruch <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={withdrawReason}
                      onChange={(e) => setWithdrawReason(e.target.value)}
                      placeholder="z. B. Thema geändert, Prüfer:in gewechselt…"
                      maxLength={500}
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-200"
                    />
                    <p className="text-right text-xs text-gray-400 mt-0.5">{withdrawReason.length}/500</p>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setWithdrawReason("")}>{t.student.cancel}</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => {
                        withdrawMutation.mutate({ thesisRequestId: req.id, reason: withdrawReason.trim() || undefined });
                        setWithdrawReason("");
                      }}
                    >
                      {t.student.withdrawBtn}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {/* Wiederverwendungs-Button für zurückgezogene Anfragen */}
            {req.status === "WITHDRAWN" && onReuseRequest && (
              <button
                type="button"
                onClick={() => onReuseRequest({
                  title: req.title,
                  description: req.description,
                  abstract: req.abstract ?? "",
                  department: req.department ?? "",
                  targetSemester: req.targetSemester ?? "",
                  language: req.language ?? "de",
                  degreeType: req.degreeType ?? "bachelor",
                  wantedExaminerId: req.wantedExaminerId ?? 0,
                })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[#76B900] border border-[#76B900]/30 hover:bg-[#76B900]/5 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Als Vorlage verwenden
              </button>
            )}
          </div>
          {showRegPreview && (
            <RegistrationPdfPreviewModal
              thesisId={req.id}
              onClose={() => setShowRegPreview(false)}
              hasSecondExaminer={!!(req as any).secondExaminerId}
            />
          )}
        </div>
  );
}

// ─── Examiner List ────────────────────────────────────────────────────────────
function ExaminerList() {
  const { t } = useLanguage();
  const { data: examiners, isLoading } = trpc.examiner.list.useQuery();
  const [search, setSearch] = useState("");

  const filtered = examiners?.filter((e) => {
    const name = buildFullName({ firstName: e.user.firstName, lastName: e.user.lastName, academicTitle: e.user.academicTitle, name: e.user.name }).toLowerCase();
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
                <UserAvatar name={buildFullName({ firstName: user.firstName, lastName: user.lastName, academicTitle: user.academicTitle, name: user.name })} email={user.email} avatarUrl={user.avatarUrl} size="lg" />
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 text-sm">
                    {buildFullName({ firstName: user.firstName, lastName: user.lastName, academicTitle: user.academicTitle ?? profile?.title, name: user.name })}
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
  const { t } = useLanguage();
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
        <h2 className="font-semibold text-gray-900 mb-4">{t.student.myRequests}</h2>
        <StudentProgrammeSelector />
      </div>

      <div
        className="rounded-2xl p-6 border border-white/10"
        style={{ backgroundColor: "#0e2a06" }}
      >
        <h3 className="font-semibold text-white mb-2">{t.student.nextSteps}</h3>
        <p className="text-white/60 text-sm">{t.student.nextStepsDesc}</p>
      </div>
    </div>
  );
}

// ─── My Colloquiums ───────────────────────────────────────────────────────────
function MyColloquiums() {
  const { data: colloquiums, isLoading } = trpc.colloquium.myStudentColloquiums.useQuery();
  const { t } = useLanguage();
  if (isLoading) return <div className="text-sm text-gray-500">{t.student.loading}</div>;
  if (!colloquiums?.length) return (
    <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
      </div>
      <p className="text-sm font-medium text-gray-700">{t.student.noColloquiums}</p>
      <p className="text-xs text-gray-500 mt-1">{t.student.noColloquiums}</p>
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
            }`}>{col.status === "SCHEDULED" ? t.student.colloquiumScheduled : col.status === "COMPLETED" ? t.student.colloquiumCompleted : t.student.colloquiumCancelled}</span>
          </div>
          <a
            href={`/api/ics/colloquium/${col.id}`}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium hover:opacity-80 transition-opacity"
            style={{ color: "#76B900" }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            {t.student.addToCalendar}
          </a>
        </div>
      ))}
    </div>
  );
}

// ─── Statushistorie ────────────────────────────────────────────────

// Lesbare Labels für Audit-Aktionen
const AUDIT_ACTION_LABELS: Record<string, string> = {
  THESIS_CREATED: "Antrag eingereicht",
  STATUS_CHANGED: "Status geändert",
  EXAMINER_ACCEPTED: "Betreuung angenommen",
  EXAMINER_REJECTED: "Betreuung abgelehnt",
  FIRST_EXAMINER_ASSIGNED: "Erstgutachter:in zugewiesen",
  SECOND_EXAMINER_ASSIGNED: "Zweitgutachter:in zugewiesen",
  COLLOQUIUM_CREATED: "Kolloquium angelegt",
  DEADLINE_SET: "Abgabefrist gesetzt",
  DEADLINE_EXTENDED: "Abgabefrist verlängert",
  ENROLLMENT_ELIGIBILITY_SET: "Zulassungsprüfung abgeschlossen",
  DEFENSE_ELIGIBILITY_SET: "Verteidigungsfreigabe erteilt",
  REGISTRATION_SET: "Offizielle Anmeldung eingetragen",
  ADMISSION_SET: "Zulassung eingetragen",
  CASE_CLOSED: "Vorgang abgeschlossen",
  DRAFT_WITHDRAWN: "Einladung zurückgezogen",
  STUDENT_CONFIRMED: "Einladung bestätigt",
};

// Status-Badges – zentral aus shared/const

function StatusHistory() {
  const { data: requests, isLoading } = trpc.thesis.myRequests.useQuery();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  // Ersten Antrag automatisch auswählen
  useEffect(() => {
    if (requests?.length && selectedId === null) {
      setSelectedId((requests as { id: number }[])[0].id);
    }
  }, [requests, selectedId]);

  // Kombinierte Historien-Abfrage (Audit-Log + Benachrichtigungen)
  const { data: history = [], isLoading: historyLoading } = trpc.auditLog.studentHistory.useQuery(
    { thesisRequestId: selectedId! },
    { enabled: selectedId !== null }
  );

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const selectedRequest = (requests as Array<{
    id: number; title: string; status: string;
    createdAt?: number | null; wantedExaminerName?: string | null;
    exposeUrl?: string | null;
  }> | undefined)?.find((r) => r.id === selectedId);

  if (isLoading) return (
    <div className="flex items-center gap-2 text-sm text-gray-500 py-8">
      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      Wird geladen…
    </div>
  );

  if (!requests?.length) return (
    <div className="bg-white rounded-2xl p-10 border border-gray-100 shadow-sm text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-700">Keine Abschlussarbeitsanträge vorhanden</p>
      <p className="text-xs text-gray-400 mt-1">Sobald Sie einen Antrag gestellt haben, erscheint hier die vollständige Verlaufshistorie.</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Antrag-Auswahl (nur wenn mehrere vorhanden) */}
      {(requests as { id: number }[]).length > 1 && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 shrink-0">Antrag:</label>
          <select
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : null)}
            className="flex-1 max-w-sm px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white"
          >
            {(requests as { id: number; title: string }[]).map((r) => (
              <option key={r.id} value={r.id}>{r.title}</option>
            ))}
          </select>
        </div>
      )}

      {/* Antrag-Header-Karte */}
      {selectedRequest && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between gap-4" style={{ background: "linear-gradient(135deg, #f0f7e6 0%, #e8f5d0 100%)" }}>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 text-base truncate">{selectedRequest.title}</h3>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {selectedRequest.createdAt && (
                  <span className="text-xs text-gray-500">
                    Eingereicht: {new Date(selectedRequest.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
                  </span>
                )}
                {selectedRequest.wantedExaminerName && (
                  <span className="text-xs text-gray-500">• Erstbetreuung: {selectedRequest.wantedExaminerName}</span>
                )}
              </div>
            </div>
            <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${getStatusBadge(selectedRequest.status).className}`}>
              {getStatusBadge(selectedRequest.status).label}
            </span>
          </div>

          {/* Timeline */}
          <div className="p-6">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-5">Chronologischer Verlauf</h4>

            {historyLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Verlauf wird geladen…
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">Noch keine Ereignisse vorhanden.</p>
            ) : (
              <ol className="relative">
                {(history as Array<{
                  id: string;
                  kind: "audit" | "notification";
                  title: string;
                  detail: string | null;
                  fromStatus: string | null;
                  toStatus: string | null;
                  actorName: string | null;
                  actorRole: string | null;
                  createdAt: string;
                  read?: boolean;
                }>).map((entry, i) => {
                  const isNotif = entry.kind === "notification";
                  const isUnread = isNotif && !entry.read;
                  const isLast = i === history.length - 1;

                  let dotColor = "#76B900";
                  let dotIcon = (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  );
                  if (isNotif) {
                    const titleLc = entry.title.toLowerCase();
                    if (titleLc.includes("abgelehnt") || titleLc.includes("rejected")) {
                      dotColor = "#ef4444";
                      dotIcon = (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      );
                    } else if (titleLc.includes("bestätigt") || titleLc.includes("angenommen") || titleLc.includes("accepted")) {
                      dotColor = "#22c55e";
                    } else {
                      dotColor = "#3b82f6";
                      dotIcon = (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                      );
                    }
                  }

                  return (
                    <li key={entry.id} className={`relative flex gap-4 ${!isLast ? "pb-6" : ""}`}>
                      {!isLast && (
                        <div className="absolute left-3 top-7 bottom-0 w-px bg-gray-200" />
                      )}
                      <div
                        className="relative z-10 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ring-4 ring-white"
                        style={{ backgroundColor: dotColor }}
                      >
                        {dotIcon}
                      </div>
                      <div className={`flex-1 min-w-0 rounded-xl px-4 py-3 ${
                        isUnread ? "bg-blue-50 border border-blue-100" : "bg-gray-50"
                      }`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900">
                              {isNotif ? entry.title : (AUDIT_ACTION_LABELS[entry.title] ?? entry.title)}
                            </p>
                            {entry.fromStatus && entry.toStatus && (
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(entry.fromStatus).className}`}>
                                  {getStatusBadge(entry.fromStatus).label}
                                </span>
                                <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(entry.toStatus).className}`}>
                                  {getStatusBadge(entry.toStatus).label}
                                </span>
                              </div>
                            )}
                            {isNotif && entry.detail && (
                              <p className="text-xs text-gray-600 mt-1 leading-relaxed">{entry.detail}</p>
                            )}
                            {!isNotif && entry.detail && (
                              <p className="text-xs text-gray-500 italic mt-1">Begründung: {entry.detail}</p>
                            )}
                            {entry.actorName && (
                              <p className="text-xs text-gray-400 mt-1">
                                {entry.actorRole === "admin" || entry.actorRole === "pav"
                                  ? "Verwaltung"
                                  : entry.actorRole === "examiner"
                                  ? "Prüfer:in"
                                  : "System"}: {entry.actorName}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            {isUnread && (
                              <button
                                onClick={() => {
                                  const notifId = parseInt(entry.id.replace("notif-", ""), 10);
                                  markRead.mutate({ id: notifId });
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
                              >
                                Als gelesen markieren
                              </button>
                            )}
                            <time className="text-xs text-gray-400 whitespace-nowrap">
                              {new Date(entry.createdAt).toLocaleString("de-DE", {
                                day: "2-digit", month: "2-digit", year: "numeric",
                                hour: "2-digit", minute: "2-digit"
                              })}
                            </time>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────────────────────────────
// ─── Benachrichtigungs-Banner ────────────────────────────────────────────────
function StatusNotificationBanner() {
  const utils = trpc.useUtils();
  const { data: notifications = [] } = trpc.notifications.list.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  // Nur ungelesene Status-Änderungen anzeigen
  const unread = notifications.filter(
    (n) => !n.read && n.type === "status_change"
  );

  if (unread.length === 0) return null;

  const latest = unread[0];
  const isAccepted = latest.title.toLowerCase().includes("angenommen") || latest.title.toLowerCase().includes("bestätigt");

  return (
    <div
      className={`mb-5 rounded-2xl border p-4 flex items-start gap-3 shadow-sm ${
        isAccepted
          ? "bg-green-50 border-green-200"
          : "bg-red-50 border-red-200"
      }`}
    >
      {/* Icon */}
      <div
        className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isAccepted ? "bg-green-100" : "bg-red-100"
        }`}
      >
        {isAccepted ? (
          <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${
          isAccepted ? "text-green-800" : "text-red-800"
        }`}>
          {latest.title}
        </p>
        <p className={`text-sm mt-0.5 ${
          isAccepted ? "text-green-700" : "text-red-700"
        }`}>
          {latest.message}
        </p>
        {unread.length > 1 && (
          <p className="text-xs mt-1 text-gray-500">
            +{unread.length - 1} weitere ungelesene Benachrichtigung{unread.length - 1 > 1 ? "en" : ""}
          </p>
        )}
      </div>

      {/* Schließen-Button */}
      <button
        onClick={() => unread.forEach((n) => markRead.mutate({ id: n.id }))}
        className={`flex-shrink-0 p-1 rounded-lg transition-colors ${
          isAccepted ? "hover:bg-green-100 text-green-600" : "hover:bg-red-100 text-red-600"
        }`}
        title="Als gelesen markieren"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ─── Favorites List ─────────────────────────────────────────────────────────
function FavoritesList() {
  const { data: favorites, isLoading, refetch } = trpc.favorites.list.useQuery();
  const toggleMutation = trpc.favorites.toggle.useMutation({ onSuccess: () => refetch() });
  const updateNoteMutation = trpc.favorites.updateNote.useMutation({ onSuccess: () => refetch() });
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [noteText, setNoteText] = useState<string>("");

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-[#76B900] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!favorites || favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
        <h3 className="font-semibold text-gray-900 mb-1">Keine Einträge in der Merkliste</h3>
        <p className="text-sm text-gray-500">Markieren Sie interessante Prüfer:innen in der Suche mit dem Herz-Symbol.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">{favorites.length} Prüfer:in{favorites.length !== 1 ? "nen" : ""} in Ihrer Merkliste</p>
      {favorites.map((fav) => {
        const ex = fav.examiner;
        if (!ex) return null;
        const profile = ex.profile;
        const tags = Array.isArray(profile?.tags) ? profile.tags as string[] : [];
        return (
          <div key={fav.examinerId} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#76B900]/10 flex items-center justify-center text-[#76B900] font-bold text-lg">
              {(ex.user?.firstName?.charAt(0) ?? ex.user?.lastName?.charAt(0) ?? ex.user?.name?.charAt(0) ?? "?").toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {buildFullName({ firstName: ex.user?.firstName, lastName: ex.user?.lastName, academicTitle: ex.user?.academicTitle ?? profile?.title, name: ex.user?.name }) || "Unbekannt"}
                  </h3>
                  {profile?.department && (
                    <p className="text-sm text-gray-500">{profile.department}</p>
                  )}
                </div>
                <button
                  onClick={() => toggleMutation.mutate({ examinerId: fav.examinerId })}
                  title="Aus Merkliste entfernen"
                  className="p-1.5 rounded-full hover:bg-red-50 transition-colors flex-shrink-0"
                >
                  <svg className="w-5 h-5" fill="#ef4444" stroke="#ef4444" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              </div>
              {profile?.bio && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{profile.bio}</p>
              )}
              {tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tags.slice(0, 5).map((tag) => (
                    <span key={tag} className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#F1F8E9] text-[#4A7C00]">{tag}</span>
                  ))}
                </div>
              )}
              {/* Notiz-Bereich */}
              <div className="mt-3">
                {editingNoteId === fav.examinerId ? (
                  <div className="space-y-2">
                    <textarea
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] placeholder-gray-300"
                      rows={3}
                      maxLength={512}
                      placeholder="Persönliche Notiz (max. 512 Zeichen)…"
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          updateNoteMutation.mutate({ examinerId: fav.examinerId, note: noteText });
                          setEditingNoteId(null);
                        }}
                        disabled={updateNoteMutation.isPending}
                        className="px-3 py-1 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                        style={{ backgroundColor: "#76B900" }}
                      >
                        Speichern
                      </button>
                      <button
                        onClick={() => setEditingNoteId(null)}
                        className="px-3 py-1 rounded-lg text-xs font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200"
                      >
                        Abbrechen
                      </button>
                      <span className="text-xs text-gray-300 ml-auto">{noteText.length}/512</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    {fav.note ? (
                      <p className="flex-1 text-xs text-gray-500 italic bg-gray-50 rounded-lg px-3 py-2">„{fav.note}“</p>
                    ) : (
                      <p className="flex-1 text-xs text-gray-300 italic">Noch keine Notiz…</p>
                    )}
                    <button
                      onClick={() => { setEditingNoteId(fav.examinerId); setNoteText(fav.note ?? ""); }}
                      title={fav.note ? "Notiz bearbeiten" : "Notiz hinzufügen"}
                      className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-2 flex items-center gap-3">
                <a
                  href={`/examiner/profile/${fav.examinerId}`}
                  className="text-xs font-semibold hover:opacity-80 transition-opacity"
                  style={{ color: "#76B900" }}
                >
                  Profil ansehen →
                </a>
                <span className="text-xs text-gray-300">·</span>
                <span className="text-xs text-gray-400">Hinzugefügt: {new Date(fav.createdAt).toLocaleDateString("de-DE")}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProfileCompletionBanner({ onGoToProfile, onDismiss }: { onGoToProfile: () => void; onDismiss: () => void }) {
  const { t } = useLanguage();
  const { data: profile } = trpc.profile.get.useQuery();
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem("htw-profile-banner-dismissed") === "1"; } catch { return false; }
  });

  if (dismissed || !profile) return null;

  const missingFields: string[] = [];
  if (!profile.firstName?.trim() || !profile.lastName?.trim()) missingFields.push(t.student.profileCompleteFirstName);
  if (!profile.bio?.trim()) missingFields.push(t.student.profileCompleteBio);
  if (!profile.matrikelNr?.trim()) missingFields.push(t.student.profileCompleteMatrikel);

  // Nur anzeigen wenn mindestens ein Feld fehlt
  if (missingFields.length === 0) return null;

  const completionPct = Math.round(((3 - missingFields.length) / 3) * 100);

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem("htw-profile-banner-dismissed", "1"); } catch {}
    onDismiss();
  };

  return (
    <div className="mb-5 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-gray-900 text-sm">{t.student.profileCompleteTitle}</h3>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{completionPct}% vollständig</span>
            </div>
            <p className="text-xs text-gray-600 mb-3">{t.student.profileCompleteDesc}</p>
            {/* Fortschrittsbalken */}
            <div className="w-full bg-amber-100 rounded-full h-1.5 mb-3 max-w-xs">
              <div
                className="h-1.5 rounded-full transition-all"
                style={{ width: `${completionPct}%`, backgroundColor: "#f59e0b" }}
              />
            </div>
            {/* Fehlende Felder */}
            <p className="text-xs font-medium text-gray-700 mb-1.5">{t.student.profileCompleteMissing}</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {missingFields.map((f) => (
                <span key={f} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-white border border-amber-200 text-amber-800">
                  <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                  </svg>
                  {f}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={onGoToProfile}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white transition-colors"
                style={{ backgroundColor: "#f59e0b" }}
              >
                {t.student.profileCompleteBtn}
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 rounded-xl text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-amber-100 transition-colors"
              >
                {t.student.profileCompleteDismiss}
              </button>
            </div>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          aria-label="Schließen"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function WelcomeBanner({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useLanguage();
  const steps = [
    { icon: "\uD83D\uDD0D", title: t.student.welcomeStep1Title, desc: t.student.welcomeStep1Desc },
    { icon: "\uD83D\uDCDD", title: t.student.welcomeStep2Title, desc: t.student.welcomeStep2Desc },
    { icon: "\uD83D\uDD14", title: t.student.welcomeStep3Title, desc: t.student.welcomeStep3Desc },
  ];
  return (
    <div className="mb-6 bg-gradient-to-br from-[#76b900]/10 to-[#5a8f00]/5 border border-[#76b900]/30 rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">\uD83C\uDF89</span>
            <h2 className="text-lg font-bold text-gray-900">{t.student.welcomeNewTitle}</h2>
          </div>
          <p className="text-sm text-gray-600">{t.student.welcomeNewDesc}</p>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 transition-colors mt-1 shrink-0"
          aria-label="Schlie\xDFen"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        {steps.map((step, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-[#76b900]/20 shadow-sm">
            <div className="text-2xl mb-2">{step.icon}</div>
            <h3 className="font-semibold text-gray-900 text-sm mb-1">{step.title}</h3>
            <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </div>
      <button
        onClick={onDismiss}
        className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-sm text-white transition-colors"
        style={{ backgroundColor: "#76b900" }}
      >
        {t.student.welcomeDismiss}
      </button>
    </div>
  );
}

export default function StudentDashboard() {
  const [location, setLocation] = useLocation();
  // URL-Parameter ?examiner=<id> auslesen (von Prüfer:innen-Profil-Button)
  const preselectExaminerId = (() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return parseInt(params.get("examiner") ?? "0", 10) || 0;
    } catch { return 0; }
  })();
  // ?welcome=1 erkennen (nach Registrierung)
  const isNewUser = (() => {
    try { return new URLSearchParams(window.location.search).get("welcome") === "1"; } catch { return false; }
  })();
  const [showWelcome, setShowWelcome] = useState(isNewUser);
  const [activeTab, setActiveTab] = useState<"requests" | "new" | "examiners" | "colloquiums" | "history" | "favorites" | "profile">(
    location.startsWith("/student/new") || preselectExaminerId > 0 ? "new" :
    location === "/student/examiners" ? "examiners" :
    location === "/student/colloquiums" ? "colloquiums" :
    location === "/student/history" ? "history" :
    location === "/student/favorites" ? "favorites" :
    location === "/student/profile" ? "profile" : "requests"
  );
  const utils = trpc.useUtils();
  const [reuseFormDraft, setReuseFormDraft] = useState<Partial<FormDraft> | undefined>(undefined);
  // Prüfen ob offene Anfrage vorhanden (immer aktiv, für Sperr-Banner und Navigation)
  const { data: hasOpenReq } = trpc.thesis.hasOpenRequest.useQuery(undefined, {
    refetchOnWindowFocus: true,
  });

  const navItems = useNavItems();
  const currentNavItems = navItems.map((item) => ({
    ...item,
    disabled: item.href === "/student/new" && !!hasOpenReq,
    disabledTooltip: item.href === "/student/new" && !!hasOpenReq
      ? "Bitte zuerst die offene Anfrage zurückziehen, bevor Sie eine neue stellen."
      : undefined,
    onClick: () => {
      if (item.href === "/student") setActiveTab("requests");
      else if (item.href === "/student/new") setActiveTab("new");
      else if (item.href === "/student/examiners") setActiveTab("examiners");
      else if (item.href === "/student/colloquiums") setActiveTab("colloquiums");
      else if (item.href === "/student/history") setActiveTab("history");
      else if (item.href === "/student/favorites") setActiveTab("favorites");
      else if (item.href === "/student/profile") setActiveTab("profile");
    },
  }));

  const { t } = useLanguage();
  const titles: Record<string, string> = {
    requests: t.student.tabRequests,
    new: t.student.tabNew,
    examiners: t.student.tabExaminers,
    colloquiums: t.student.tabColloquiums,
    history: t.student.tabHistory,
    favorites: "Merkliste",
    profile: t.student.tabProfile,
  };

  return (
    <ThesisDashboardLayout navItems={currentNavItems} title={titles[activeTab]}>
      {/* Globales Benachrichtigungs-Banner – erscheint auf allen Tabs */}
      <StatusNotificationBanner />
      {activeTab === "new" && (
        <div className="max-w-2xl">
          {hasOpenReq && (
            /* Sperr-Banner oben – kein Overlay, damit Nutzer:in den Kontext sieht */
            <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">{t.student.openRequestBlockTitle ?? "Offene Anfrage vorhanden"}</p>
                <p className="text-xs text-amber-700 mt-0.5">{t.student.openRequestBlockDesc ?? "Sie haben bereits eine offene Betreuungsanfrage. Bitte warten Sie auf eine Antwort oder ziehen Sie die bestehende Anfrage zurück, bevor Sie eine neue stellen."}</p>
              </div>
              <button
                onClick={() => setActiveTab("requests")}
                className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg text-white"
                style={{ backgroundColor: "#76B900" }}
              >
                {t.student.openRequestBlockBtn ?? "Meine Anfragen"}
              </button>
            </div>
          )}
          <div className={`bg-white rounded-2xl p-6 border border-gray-100 shadow-sm${hasOpenReq ? " opacity-40 pointer-events-none select-none" : ""}`}>
            <h2 className="font-semibold text-gray-900 mb-1">{t.student.submitIdea}</h2>
            <p className="text-sm text-gray-500 mb-6">{t.student.submitIdeaDesc}</p>
            <NewRequestForm key={JSON.stringify(reuseFormDraft)} onSuccess={() => {
              utils.thesis.myRequests.invalidate();
              utils.thesis.hasOpenRequest.invalidate();
              setReuseFormDraft(undefined);
              setActiveTab("requests");
            }} preselectExaminerId={preselectExaminerId} initialDraft={reuseFormDraft} />
          </div>
        </div>
      )}
      {activeTab === "requests" && (
        <div>
          {showWelcome && (
            <WelcomeBanner onDismiss={() => {
              setShowWelcome(false);
              // ?welcome=1 aus URL entfernen ohne Seiten-Reload
              const url = new URL(window.location.href);
              url.searchParams.delete("welcome");
              window.history.replaceState({}, "", url.pathname + (url.search || ""));
            }} />
          )}
          {!showWelcome && (
            <ProfileCompletionBanner
              onGoToProfile={() => setActiveTab("profile")}
              onDismiss={() => {}}
            />
          )}
          <MyRequests onReuseRequest={(draft) => { setReuseFormDraft(draft); setActiveTab("new"); }} />
        </div>
      )}
      {activeTab === "examiners" && (
        <div>
          <div className="mb-5">
            <h2 className="font-semibold text-gray-900">{t.student.browseExaminers}</h2>
            <p className="text-sm text-gray-500 mt-1">{t.student.browseExaminersDesc}</p>
          </div>
          <ExaminerList />
        </div>
      )}
      {activeTab === "colloquiums" && <MyColloquiums />}
      {activeTab === "history" && <StatusHistory />}
      {activeTab === "favorites" && <FavoritesList />}
      {activeTab === "profile" && <Profile embedded={true} />}
    </ThesisDashboardLayout>
  );
}
