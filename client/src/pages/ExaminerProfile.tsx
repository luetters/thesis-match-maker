import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState, useRef } from "react";
import { Link, useParams } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { UserAvatar } from "@/components/UserAvatar";

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

/** Gibt eine Farbe für einen Tag-Index zurück */
function tagColor(index: number): { bg: string; text: string; border: string } {
  const colors = [
    { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
    { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
    { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
    { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
    { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  ];
  return colors[index % colors.length];
}

/** Berechnet den Auslastungsgrad (0–1) */
function loadRatio(active: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(active / max, 1);
}

/** Gibt Farbe je nach Auslastung zurück */
function capacityColor(ratio: number): { bar: string; text: string; bg: string } {
  if (ratio >= 1) return { bar: "bg-red-400", text: "text-red-700", bg: "bg-red-50" };
  if (ratio >= 0.75) return { bar: "bg-amber-400", text: "text-amber-700", bg: "bg-amber-50" };
  return { bar: "bg-emerald-400", text: "text-emerald-700", bg: "bg-emerald-50" };
}

// ─── Kapazitäts-Widget ────────────────────────────────────────────────────────

function CapacityBar({
  label,
  active,
  max,
}: {
  label: string;
  active: number;
  max: number;
}) {
  const ratio = loadRatio(active, max);
  const colors = capacityColor(ratio);
  const free = Math.max(0, max - active);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-gray-600">{label}</span>
        <span className={`font-semibold ${colors.text}`}>
          {free > 0 ? `${free} frei` : "Ausgebucht"}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colors.bar}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <div className="flex items-center gap-1 text-xs text-gray-400">
        <span>{active} belegt</span>
        <span>·</span>
        <span>{max} gesamt</span>
      </div>
    </div>
  );
}

function CapacityWidget({
  semesterCapacities,
  activeFirstCount,
  activeSecondCount,
  isSecondExaminer,
}: {
  semesterCapacities: Array<{ semester: string; maxFirst: number; maxSecond: number }>;
  activeFirstCount: number;
  activeSecondCount: number;
  isSecondExaminer: boolean;
}) {
  // Gesamtkapazität aus allen Semestern (max über alle Semester)
  const totalMaxFirst = semesterCapacities.reduce((sum, s) => sum + s.maxFirst, 0);
  const totalMaxSecond = semesterCapacities.reduce((sum, s) => sum + s.maxSecond, 0);

  // Nächste 3 Semester anzeigen
  const upcomingSemesters = semesterCapacities.slice(0, 3);

  if (semesterCapacities.length === 0 && activeFirstCount === 0 && activeSecondCount === 0) {
    return null;
  }

  const overallFreeFirst = Math.max(0, totalMaxFirst - activeFirstCount);
  const overallFreeSecond = Math.max(0, totalMaxSecond - activeSecondCount);
  const hasCapacity = overallFreeFirst > 0 || overallFreeSecond > 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#F1F8E9" }}>
            <svg className="w-4 h-4" style={{ color: "#76B900" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-800">Betreuungskapazitäten</h3>
        </div>
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
            hasCapacity
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${hasCapacity ? "bg-emerald-500" : "bg-red-500"}`} />
          {hasCapacity ? "Kapazität verfügbar" : "Ausgebucht"}
        </span>
      </div>

      <div className="p-5 space-y-5">
        {/* Aktuelle Gesamtlast */}
        <div className="grid grid-cols-2 gap-3">
          {!isSecondExaminer && totalMaxFirst > 0 && (
            <div className="rounded-xl p-3.5 border" style={{ backgroundColor: "#F9FFF0", borderColor: "#D4EDAA" }}>
              <p className="text-xs text-gray-500 mb-1">Erstprüfungen</p>
              <p className="text-2xl font-bold" style={{ color: "#76B900" }}>{overallFreeFirst}</p>
              <p className="text-xs text-gray-400">freie Plätze</p>
            </div>
          )}
          {totalMaxSecond > 0 && (
            <div className="rounded-xl p-3.5 bg-blue-50 border border-blue-100">
              <p className="text-xs text-gray-500 mb-1">Zweitprüfungen</p>
              <p className="text-2xl font-bold text-blue-600">{overallFreeSecond}</p>
              <p className="text-xs text-gray-400">freie Plätze</p>
            </div>
          )}
        </div>

        {/* Semesterweise Aufschlüsselung */}
        {upcomingSemesters.length > 0 && (
          <div className="space-y-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Semesterübersicht</p>
            {upcomingSemesters.map((sc) => (
              <div key={sc.semester} className="space-y-3">
                <p className="text-xs font-semibold text-gray-700">{sc.semester}</p>
                {!isSecondExaminer && sc.maxFirst > 0 && (
                  <CapacityBar
                    label="Erstprüfung"
                    active={activeFirstCount}
                    max={sc.maxFirst}
                  />
                )}
                {sc.maxSecond > 0 && (
                  <CapacityBar
                    label="Zweitprüfung"
                    active={activeSecondCount}
                    max={sc.maxSecond}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Themengebiete-Karte ──────────────────────────────────────────────────────

function ResearchTopicsCard({ tags, researchFocus }: { tags: string[]; researchFocus?: string | null }) {
  if (tags.length === 0 && !researchFocus) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#F1F8E9" }}>
          <svg className="w-4 h-4" style={{ color: "#76B900" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-gray-800">Themengebiete &amp; Forschung</h3>
      </div>
      <div className="p-5 space-y-4">
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, i) => {
              const c = tagColor(i);
              return (
                <span
                  key={tag}
                  className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}
                >
                  {tag}
                </span>
              );
            })}
          </div>
        )}
        {researchFocus && (
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{researchFocus}</p>
        )}
      </div>
    </div>
  );
}

// ─── Foto-Upload-Komponente ───────────────────────────────────────────────────

function PhotoUploadButton({
  currentPhotoUrl,
  onUploaded,
}: {
  currentPhotoUrl?: string | null;
  onUploaded: (url: string) => void;
}) {
  const { t } = useLanguage();
  const E = t.examiner;
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(E.toastOnlyImages);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(E.toastFileTooLarge);
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch("/api/upload/photo", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? E.toastUploadFailed);
      }
      const data = await res.json();
      onUploaded(data.url);
      toast.success(E.toastPhotoUploaded);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : E.toastUploadFailed);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="relative group">
      <div
        className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-md cursor-pointer"
        onClick={() => fileRef.current?.click()}
      >
        {currentPhotoUrl ? (
          <img src={currentPhotoUrl} alt={E.photoAlt} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
          {uploading ? (
            <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </div>
  );
}

// ─── Bearbeitungs-Modal ───────────────────────────────────────────────────────

function EditProfileModal({
  profile,
  onClose,
  onSaved,
}: {
  profile: {
    title?: string | null;
    department?: string | null;
    bio?: string | null;
    researchFocus?: string | null;
    officeHours?: string | null;
    websiteUrl?: string | null;
    phone?: string | null;
    tags?: string[] | null;
    languages?: string[] | null;
    studyPrograms?: string[] | null;
    maxSupervisions?: number | null;
  };
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLanguage();
  const E = t.examiner;
  const [form, setForm] = useState({
    title: profile.title ?? "",
    department: profile.department ?? "",
    bio: profile.bio ?? "",
    researchFocus: profile.researchFocus ?? "",
    officeHours: profile.officeHours ?? "",
    websiteUrl: profile.websiteUrl ?? "",
    phone: profile.phone ?? "",
    tags: (profile.tags ?? []).join(", "),
    languages: (profile.languages ?? []).join(", "),
    studyPrograms: (profile.studyPrograms ?? []).join(", "),
    maxSupervisions: profile.maxSupervisions ?? 5,
  });

  const utils = trpc.useUtils();
  const updateMutation = trpc.examiner.updateProfileExtended.useMutation({
    onSuccess: () => {
      toast.success(E.toastProfileSaved);
      utils.examiner.getPublicProfile.invalidate();
      utils.examiner.myProfile.invalidate();
      onSaved();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      title: form.title || undefined,
      department: form.department || undefined,
      bio: form.bio || undefined,
      researchFocus: form.researchFocus || undefined,
      officeHours: form.officeHours || undefined,
      websiteUrl: form.websiteUrl || undefined,
      phone: form.phone || undefined,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      languages: form.languages ? form.languages.split(",").map((l) => l.trim()).filter(Boolean) : [],
      studyPrograms: form.studyPrograms ? form.studyPrograms.split(",").map((s) => s.trim()).filter(Boolean) : [],
      maxSupervisions: form.maxSupervisions,
    });
  };

  const inputClass = "w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all";
  const labelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{E.editProfileTitle}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Titel (Prof. Dr. etc.)</label>
              <input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Prof. Dr." />
            </div>
            <div>
              <label className={labelClass}>{E.fieldDepartment}</label>
              <input className={inputClass} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Informatik und Medien" />
            </div>
          </div>
          <div>
            <label className={labelClass}>{E.fieldBio}</label>
            <textarea className={inputClass} rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder={E.fieldBioPlaceholder} />
          </div>
          <div>
            <label className={labelClass}>{E.fieldResearch}</label>
            <textarea className={inputClass} rows={2} value={form.researchFocus} onChange={(e) => setForm({ ...form, researchFocus: e.target.value })} placeholder="Machine Learning, Datenbanken, ..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{E.fieldOfficeHours}</label>
              <input className={inputClass} value={form.officeHours} onChange={(e) => setForm({ ...form, officeHours: e.target.value })} placeholder="Di 14-16 Uhr, Raum 4.23" />
            </div>
            <div>
              <label className={labelClass}>Telefon</label>
              <input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+49 30 5019-..." />
            </div>
          </div>
          <div>
            <label className={labelClass}>{E.fieldWebsite}</label>
            <input className={inputClass} value={form.websiteUrl} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} placeholder="https://..." />
          </div>
          <div>
            <label className={labelClass}>{E.fieldTags}</label>
            <input className={inputClass} value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="KI, Datenbanken, Web-Technologien" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{E.fieldLanguages}</label>
              <input className={inputClass} value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} placeholder="Deutsch, Englisch" />
            </div>
            <div>
              <label className={labelClass}>Studiengänge (kommagetrennt)</label>
              <input className={inputClass} value={form.studyPrograms} onChange={(e) => setForm({ ...form, studyPrograms: e.target.value })} placeholder="Informatik, Wirtschaftsinformatik" />
            </div>
          </div>
          <div>
            <label className={labelClass}>{E.fieldMaxSupervisions}</label>
            <input type="number" min={0} max={20} className={inputClass} value={form.maxSupervisions} onChange={(e) => setForm({ ...form, maxSupervisions: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "#76B900" }}
            >
              {updateMutation.isPending ? "Wird gespeichert…" : E.saveBtn}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              {E.cancelBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Hauptseite ───────────────────────────────────────────────────────────────

export default function ExaminerProfile() {
  const { t } = useLanguage();
  const E = t.examiner;
  const params = useParams<{ id: string }>();
  const userId = parseInt(params.id ?? "0", 10);
  const { user: currentUser, hasRole } = useAuth();
  const [showEdit, setShowEdit] = useState(false);
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.examiner.getPublicProfile.useQuery(
    { userId },
    { enabled: !isNaN(userId) && userId > 0 }
  );

  const isOwnProfile = currentUser?.id === userId;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">{E.profileLoading}</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-1">{E.profileNotFound}</h2>
          <p className="text-sm text-gray-500 mb-4">{E.profileNotFoundDesc}</p>
          <Link href="/" className="text-sm font-medium" style={{ color: "#76B900" }}>{E.backHome}</Link>
        </div>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = data as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = data as any;
  const photoUrl = localPhotoUrl ?? (data as any).photoUrl;
  const tags: string[] = ((data as any).tags as string[] | null | undefined) ?? [];
  const researchTagsRaw: string | null = (data as any).researchTags ?? null;
  const researchTags: string[] = researchTagsRaw
    ? researchTagsRaw.split(",").map((s: string) => s.trim()).filter(Boolean)
    : [];
  const allTagsSet = new Set([...tags, ...researchTags]);
  const allTags = Array.from(allTagsSet);
  const languages: string[] = ((data as any).languages as string[] | null | undefined) ?? [];
  const studyPrograms: string[] = ((data as any).studyPrograms as string[] | null | undefined) ?? [];
  const semesterCapacities: Array<{ semester: string; maxFirst: number; maxSecond: number }> =
    (data as any).semesterCapacities ?? [];
  const activeFirstCount: number = (data as any).activeFirstCount ?? 0;
  const activeSecondCount: number = (data as any).activeSecondCount ?? 0;
  const isSecondExaminer = profile?.isSecondExaminer === 1 || hasRole("second_examiner");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#76B900" }}>
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <span className="text-sm font-bold text-gray-800">Thesis Match Maker</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/examiners" className="text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600">
              ← Verzeichnis
            </Link>
            {currentUser ? (
              <Link
                href={currentUser.role === "student" ? "/student" : currentUser.role === "examiner" || currentUser.role === "second_examiner" ? "/examiner" : "/admin"}
                className="text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600"
              >
                Dashboard
              </Link>
            ) : (
              <Link href="/login" className="text-sm font-medium px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" style={{ backgroundColor: "#76B900" }}>
                {E.loginBtn}
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Profil-Hero */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          {/* Banner mit Muster */}
          <div className="h-32 relative" style={{ background: "linear-gradient(135deg, #76B900 0%, #5a8e00 100%)" }}>
            <div className="absolute inset-0 opacity-10">
              <svg viewBox="0 0 800 128" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <pattern id="dots" width="32" height="32" patternUnits="userSpaceOnUse">
                    <circle cx="16" cy="16" r="2" fill="white" />
                  </pattern>
                </defs>
                <rect width="800" height="128" fill="url(#dots)" />
              </svg>
            </div>
            {/* HTW Berlin Label */}
            <div className="absolute top-4 right-5 flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="text-xs font-semibold text-white">HTW Berlin</span>
            </div>
          </div>

          {/* Profil-Info */}
          <div className="px-6 pb-6">
            <div className="flex items-end gap-4 -mt-12 mb-5">
              {isOwnProfile ? (
                <PhotoUploadButton
                  currentPhotoUrl={photoUrl}
                  onUploaded={(url) => {
                    setLocalPhotoUrl(url);
                    utils.examiner.getPublicProfile.invalidate();
                  }}
                />
              ) : (
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md flex-shrink-0">
                  <UserAvatar name={user.name} email={user.email} avatarUrl={photoUrl ?? user.avatarUrl} size="xl" className="w-full h-full" />
                </div>
              )}
              <div className="pb-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {profile?.academicTitle ? `${profile.academicTitle} ` : ""}{user.name ?? E.unknownName}
                  </h1>
                </div>
                {profile?.department && (
                  <p className="text-sm text-gray-500 mt-0.5">{profile.department} · HTW Berlin</p>
                )}
              </div>
              {isOwnProfile && (
                <button
                  onClick={() => setShowEdit(true)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {E.editProfile}
                </button>
              )}
            </div>

            {/* Rolle + Sprechstunden-Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
                isSecondExaminer ? "bg-blue-50 border-blue-100" : "border-primary/15"
              }`} style={!isSecondExaminer ? { backgroundColor: "#F1F8E9" } : {}}>
                <svg className={`w-4 h-4 ${isSecondExaminer ? "text-blue-500" : ""}`} style={!isSecondExaminer ? { color: "#76B900" } : {}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
                <span className={`text-xs font-semibold ${isSecondExaminer ? "text-blue-700" : ""}`} style={!isSecondExaminer ? { color: "#76B900" } : {}}>
                  {isSecondExaminer ? E.secondExaminerLabel : E.firstExaminerLabel}
                </span>
              </div>
              {profile?.officeHours && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs font-medium text-gray-600">{profile.officeHours}</span>
                </div>
              )}
              {languages.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  <span className="text-xs font-medium text-blue-700">{languages.join(" · ")}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hauptinhalt: 3-Spalten-Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Linke Spalte */}
          <div className="space-y-4">
            {/* Kapazitäts-Widget — prominenteste Karte */}
            <CapacityWidget
              semesterCapacities={semesterCapacities}
              activeFirstCount={activeFirstCount}
              activeSecondCount={activeSecondCount}
              isSecondExaminer={isSecondExaminer}
            />

            {/* Kontakt */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {t.common.contact ?? "Kontakt"}
              </h3>
              <div className="space-y-2.5">
                {user.email && (
                  <a href={`mailto:${user.email}`} className="flex items-center gap-2.5 text-sm text-gray-600 hover:text-primary transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-primary/5 transition-colors flex-shrink-0">
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="truncate">{user.email}</span>
                  </a>
                )}
                {profile?.phone && (
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    {profile.phone}
                  </div>
                )}
                {profile?.websiteUrl && (
                  <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-sm text-gray-600 hover:text-primary transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-primary/5 transition-colors flex-shrink-0">
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                    <span className="truncate">Website</span>
                  </a>
                )}
                {user.bookingUrl && (
                  <a href={user.bookingUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-sm text-gray-600 hover:text-primary transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-primary/5 transition-colors flex-shrink-0">
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="truncate">Termin buchen</span>
                  </a>
                )}
              </div>
            </div>

            {/* Studiengänge */}
            {studyPrograms.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  {E.programmes}
                </h3>
                <div className="space-y-1.5">
                  {studyPrograms.map((sp) => (
                    <div key={sp} className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#76B900" }} />
                      {sp}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Rechte Spalte: Bio + Themengebiete + CTA */}
          <div className="md:col-span-2 space-y-4">
            {/* Über mich */}
            {profile?.bio && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {t.common.aboutMe ?? "Über mich"}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{profile.bio}</p>
              </div>
            )}

            {/* Themengebiete & Forschung — prominente Karte */}
            <ResearchTopicsCard tags={allTags} researchFocus={profile?.researchFocus} />

            {/* Anfrage stellen CTA */}
            {(() => {
              const examinerName = `${profile?.academicTitle ? `${profile.academicTitle} ` : ""}${user.name}`;
              const requestUrl = `/student/new?examiner=${userId}`;
              const isExaminerRole = currentUser?.role === "examiner" || currentUser?.role === "second_examiner";
              // Prüfer:innen sehen keinen CTA
              if (isOwnProfile || isExaminerRole) return null;
              return (
                <div className="rounded-2xl overflow-hidden border border-primary/20" style={{ background: "linear-gradient(135deg, #F1F8E9 0%, #E8F5D0 100%)" }}>
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#76B900" }}>
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-gray-900 mb-1">{E.supervisionRequest}</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          {E.supervisionRequestDesc.replace("{name}", examinerName)}
                        </p>
                        {currentUser?.role === "student" ? (
                          <Link
                            href={requestUrl}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 shadow-sm"
                            style={{ backgroundColor: "#76B900" }}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            {E.submitRequest}
                          </Link>
                        ) : (
                          // Nicht eingeloggt oder andere Rolle → Login mit returnTo
                          <Link
                            href={`/login?returnTo=${encodeURIComponent(requestUrl)}`}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 shadow-sm"
                            style={{ backgroundColor: "#76B900" }}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                            </svg>
                            {E.loginBtn}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {!profile?.bio && allTags.length === 0 && !profile?.researchFocus && !isOwnProfile && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500">{E.incompleteProfile}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showEdit && profile && (
        <EditProfileModal
          profile={profile as any}
          onClose={() => setShowEdit(false)}
          onSaved={() => utils.examiner.getPublicProfile.invalidate({ userId })}
        />
      )}
    </div>
  );
}
