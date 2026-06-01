import { useState, useRef, useCallback, KeyboardEvent } from "react";
import { AvatarCropModal } from "@/components/AvatarCropModal";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Link } from "wouter";

// ─── Konstanten ───────────────────────────────────────────────────────────────
const DEPARTMENTS = [
  { value: "FB1", label: "FB 1 – Ingenieurwissenschaften I" },
  { value: "FB2", label: "FB 2 – Ingenieurwissenschaften II" },
  { value: "FB3", label: "FB 3 – Wirtschaftswissenschaften" },
  { value: "FB4", label: "FB 4 – Informatik, Kommunikation und Wirtschaft" },
  { value: "FB5", label: "FB 5 – Gestaltung und Kultur" },
];

// ─── Rollen-Konfiguration ─────────────────────────────────────────────────────
const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  student:    { label: "Studierende:r",             color: "#16a34a", bg: "#f0fdf4", border: "#86efac" },
  examiner:   { label: "Prüfer:in (Erstprüfer:in)",   color: "#2563eb", bg: "#eff6ff", border: "#93c5fd" },
  second_examiner: { label: "Zweitprüfer:in",          color: "#0891b2", bg: "#ecfeff", border: "#67e8f9" },
  admin:      { label: "Verwaltungsmitarbeiter:in",  color: "#7c3aed", bg: "#faf5ff", border: "#c4b5fd" },
  superadmin: { label: "Superadmin",                color: "#dc2626", bg: "#fef2f2", border: "#fca5a5" },
  pav:        { label: "PAV",                       color: "#d97706", bg: "#fffbeb", border: "#fcd34d" },
  dean:       { label: "Dekan:in",                  color: "#0891b2", bg: "#ecfeff", border: "#67e8f9" },
};
const ROLE_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  approved: { label: "Bestätigt",  color: "#16a34a", bg: "#f0fdf4" },
  pending:  { label: "Ausstehend", color: "#d97706", bg: "#fffbeb" },
  rejected: { label: "Abgelehnt", color: "#dc2626", bg: "#fef2f2" },
};

// ─── URL-Validierung ──────────────────────────────────────────────────────────
function isValidUrl(value: string): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────
function formatDate(date: Date | string | null | undefined, lang: string): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString(lang === "de" ? "de-DE" : "en-GB", {
    day: "2-digit", month: "long", year: "numeric",
  });
}
function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "??";
}
function getDepartmentLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return DEPARTMENTS.find((d) => d.value === value)?.label ?? value;
}

// ─── Feld-Komponenten ─────────────────────────────────────────────────────────
function FieldView({ label, value, notSpecified }: { label: string; value: string | null | undefined; notSpecified: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      <p className="text-sm text-gray-800">
        {value ? value : <span className="text-gray-400 italic">{notSpecified}</span>}
      </p>
    </div>
  );
}

function FieldInput({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#76b900]/30 focus:border-[#76b900] transition-all"
      />
    </div>
  );
}

// ─── URL-Eingabe mit Echtzeit-Validierung ─────────────────────────────────────
function UrlInput({
  label, value, onChange, placeholder, errorMsg,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; errorMsg: string;
}) {
  const [touched, setTouched] = useState(false);
  const isValid = isValidUrl(value);
  const showError = touched && value.length > 0 && !isValid;

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      <div className="relative">
        <input
          type="url"
          value={value}
          onChange={(e) => { onChange(e.target.value); setTouched(true); }}
          onBlur={() => setTouched(true)}
          placeholder={placeholder ?? "https://…"}
          className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all pr-9 ${
            showError
              ? "border-red-400 focus:ring-red-200 focus:border-red-500 bg-red-50"
              : isValid && value.length > 0
              ? "border-[#76b900] focus:ring-[#76b900]/30 focus:border-[#76b900] bg-[#f9ffe6]"
              : "border-gray-200 focus:ring-[#76b900]/30 focus:border-[#76b900]"
          }`}
        />
        {value.length > 0 && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {isValid ? (
              <svg className="w-4 h-4 text-[#76b900]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </span>
        )}
      </div>
      {showError && (
        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {errorMsg}
        </p>
      )}
    </div>
  );
}

// ─── Tag-Liste-Komponente ─────────────────────────────────────────────────────
function TagInput({
  label, tags, onChange, placeholder, hint,
}: {
  label: string; tags: string[]; onChange: (tags: string[]) => void; placeholder?: string; hint?: string;
}) {
  const [input, setInput] = useState("");
  const addTag = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const newTags = trimmed.split(",").map((t) => t.trim()).filter(Boolean);
    onChange(Array.from(new Set([...tags, ...newTags])));
    setInput("");
  }, [input, tags, onChange]);
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
    else if (e.key === "Backspace" && input === "" && tags.length > 0) onChange(tags.slice(0, -1));
  };
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      <div className="min-h-[44px] w-full px-3 py-2 rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-[#76b900]/30 focus-within:border-[#76b900] transition-all flex flex-wrap gap-1.5 items-center">
        {tags.map((tag, i) => (
          <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #93c5fd" }}>
            {tag}
            <button type="button" onClick={() => onChange(tags.filter((_, j) => j !== i))} className="ml-0.5 hover:text-red-500 transition-colors">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </span>
        ))}
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} onBlur={addTag}
          placeholder={tags.length === 0 ? placeholder : undefined}
          className="flex-1 min-w-[120px] text-sm outline-none bg-transparent" />
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

// ─── Kopier-Button ────────────────────────────────────────────────────────────
function CopyButton({ url, copiedMsg, failMsg }: { url: string; copiedMsg: string; failMsg: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success(
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[#76b900]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <span>{copiedMsg}</span>
        </div>,
        { duration: 2000 }
      );
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error(failMsg);
    });
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${
        copied
          ? "border-[#76b900] bg-[#f0fdf4] text-[#76b900]"
          : "border-gray-200 bg-white text-gray-400 hover:border-[#76b900] hover:bg-[#f6ffe0] hover:text-[#76b900]"
      }`}
    >
      {copied ? (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}

// ─── Link-Anzeige-Komponente mit Kopier-Button ────────────────────────────────
function LinkDisplay({
  href, label, iconBg, iconColor, iconContent,
  hoverBorderColor, hoverBgColor, textColor, copiedMsg, failMsg,
}: {
  href: string; label: string; iconBg: string; iconColor?: string;
  iconContent: React.ReactNode; hoverBorderColor: string; hoverBgColor: string; textColor: string;
  copiedMsg: string; failMsg: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex-1 inline-flex items-center gap-2.5 px-3 py-2 rounded-xl border border-gray-200 transition-all group min-w-0 ${hoverBorderColor} ${hoverBgColor}`}
      >
        <span className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: iconBg, color: iconColor }}>
          {iconContent}
        </span>
        <span className={`text-sm group-hover:underline truncate ${textColor}`}>{label}</span>
        <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
      <CopyButton url={href} copiedMsg={copiedMsg} failMsg={failMsg} />
    </div>
  );
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────
export default function Profile() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const p = t.myProfilePage;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: profile, isLoading, refetch } = trpc.profile.get.useQuery(undefined, {
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
  const utils = trpc.useUtils();
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    name: "", bio: "", phone: "", department: "",
    matrikelNr: "", thesisType: "" as "" | "bachelor" | "master", enrollmentSemester: "", targetSemester: "",
    academicTitle: "", officeRoom: "", officeHours: "",
    staffId: "", responsibilityArea: "", officeLocation: "",
    secondEmail: "", website: "", linkedIn: "", researchGate: "",
    htwProfileUrl: "", miscLink: "", bookingUrl: "",
  });
  const [researchTagList, setResearchTagList] = useState<string[]>([]);
  const [examinerLanguages, setExaminerLanguages] = useState<string[]>([]);
  const [examinerKeywords, setExaminerKeywords] = useState<string[]>([]);
  const [examinerProgrammeIds, setExaminerProgrammeIds] = useState<number[] | null>(null); // null = alle
  const { data: allProgrammes } = trpc.programmes.list.useQuery(undefined, { enabled: !!profile && (profile.role === 'examiner' || profile.role === 'second_examiner') });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deletingAvatar, setDeletingAvatar] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAvatarPreviewModal, setShowAvatarPreviewModal] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);

  const urlFields = ["website", "linkedIn", "researchGate", "htwProfileUrl", "miscLink", "bookingUrl"] as const;
  const hasUrlErrors = urlFields.some((field) => form[field].length > 0 && !isValidUrl(form[field]));

  const updateMutation = trpc.profile.update.useMutation({
    onSuccess: () => { toast.success(p.profileSaved); setEditMode(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteAvatarMutation = trpc.profile.deleteAvatar.useMutation({
    onSuccess: () => {
      setAvatarPreview(null);
      setShowDeleteConfirm(false);
      utils.profile.get.invalidate();
      setTimeout(() => refetch(), 300);
      toast.success(p.avatarDeleted);
    },
    onError: (e) => toast.error(`${p.avatarDeleteTitle}: ${e.message}`),
    onSettled: () => setDeletingAvatar(false),
  });

  // Profilbild-Upload via multipart/form-data (kein Base64 – robuster und schneller)
  const uploadAvatar = async (file: File) => {
    setUploadingAvatar(true);
    // Sofortige lokale Vorschau (Blob-URL)
    const localPreview = URL.createObjectURL(file);
    setAvatarPreview(localPreview);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const resp = await fetch("/api/upload/avatar", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || !json.success) {
        throw new Error(json.error ?? `HTTP ${resp.status}`);
      }
      const newAvatarUrl: string = json.avatarUrl;
      // S3-URL als Vorschau setzen – bleibt dauerhaft (kein Reset)
      setAvatarPreview(newAvatarUrl);
      toast.success(p.avatarSuccess);
      // Sofortiger Cache-Update ohne Netzwerkwartzeit (verhindert Flash of old content)
      utils.profile.get.setData(undefined, (old) => old ? { ...old, avatarUrl: newAvatarUrl } : old);
      utils.auth.me.setData(undefined, (old) => old ? { ...old, avatarUrl: newAvatarUrl } : old);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(p.avatarUploadError ? p.avatarUploadError.replace("{msg}", msg) : msg);
      URL.revokeObjectURL(localPreview);
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleEditStart = () => {
    if (!profile) return;
    setResearchTagList(profile.researchTags ? profile.researchTags.split(",").map((t) => t.trim()).filter(Boolean) : []);
    // Prüfer:innen-spezifische Felder initialisieren
    if (profile.role === 'examiner' || profile.role === 'second_examiner') {
      setExaminerLanguages(Array.isArray(profile.examinerLanguages) ? profile.examinerLanguages : []);
      setExaminerKeywords(Array.isArray(profile.examinerKeywords) ? profile.examinerKeywords : []);
      // null = alle Studiengänge (Default), leeres Array = keine
      setExaminerProgrammeIds(Array.isArray(profile.examinerProgrammeIds) && profile.examinerProgrammeIds.length > 0
        ? profile.examinerProgrammeIds
        : null);
    }
    setForm({
      name: profile.name ?? "", bio: profile.bio ?? "", phone: profile.phone ?? "", department: profile.department ?? "",
      matrikelNr: profile.matrikelNr ?? "", thesisType: (profile.thesisType as "" | "bachelor" | "master") ?? "",
      enrollmentSemester: profile.enrollmentSemester ?? "", targetSemester: profile.targetSemester ?? "",
      academicTitle: profile.academicTitle ?? "", officeRoom: profile.officeRoom ?? "", officeHours: profile.officeHours ?? "",
      staffId: profile.staffId ?? "", responsibilityArea: profile.responsibilityArea ?? "", officeLocation: profile.officeLocation ?? "",
      secondEmail: profile.secondEmail ?? "", website: profile.website ?? "", linkedIn: profile.linkedIn ?? "", researchGate: profile.researchGate ?? "",
      htwProfileUrl: profile.htwProfileUrl ?? "", miscLink: profile.miscLink ?? "", bookingUrl: profile.bookingUrl ?? "",
    });
    setEditMode(true);
  };

  const isExaminerRole = profile?.role === 'examiner' || profile?.role === 'second_examiner';
  const handleSave = () => {
    if (hasUrlErrors) {
      toast.error(p.urlSaveBlocked);
      return;
    }
    // Studiengänge: null = alle (leeres Array an Backend), sonst die ausgewählten IDs
    const programmeIdsToSave = isExaminerRole
      ? (examinerProgrammeIds === null ? [] : examinerProgrammeIds)
      : undefined;
    updateMutation.mutate({
      name: form.name || undefined, bio: form.bio || undefined, phone: form.phone || undefined, department: form.department || undefined,
      matrikelNr: form.matrikelNr || undefined, thesisType: (form.thesisType as "bachelor" | "master") || undefined,
      enrollmentSemester: form.enrollmentSemester || undefined, targetSemester: form.targetSemester || undefined,
      academicTitle: form.academicTitle || undefined, officeRoom: form.officeRoom || undefined, officeHours: form.officeHours || undefined,
      researchTags: researchTagList.join(", ") || undefined,
      ...(isExaminerRole ? {
        examinerLanguages,
        examinerKeywords,
        examinerProgrammeIds: programmeIdsToSave,
      } : {}),
      staffId: form.staffId || undefined, responsibilityArea: form.responsibilityArea || undefined, officeLocation: form.officeLocation || undefined,
      secondEmail: form.secondEmail || undefined, website: form.website || undefined, linkedIn: form.linkedIn || undefined, researchGate: form.researchGate || undefined,
      htwProfileUrl: form.htwProfileUrl || undefined, miscLink: form.miscLink || undefined, bookingUrl: form.bookingUrl || undefined,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (file.size > 5 * 1024 * 1024) { toast.error(p.avatarTooLarge); return; }
    if (!["image/jpeg","image/png","image/webp","image/gif"].includes(file.type)) { toast.error(p.avatarInvalidFormat); return; }
    // Crop-Modal öffnen statt direkt hochladen
    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
    setShowCropModal(true);
  };
  const handleCropComplete = useCallback(async (croppedBlob: Blob) => {
    setShowCropModal(false);
    if (cropSrc) { URL.revokeObjectURL(cropSrc); setCropSrc(null); }
    const croppedFile = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" });
    await uploadAvatar(croppedFile);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropSrc]);
  const handleCropClose = useCallback(() => {
    setShowCropModal(false);
    if (cropSrc) { URL.revokeObjectURL(cropSrc); setCropSrc(null); }
  }, [cropSrc]);

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <svg className="w-8 h-8 animate-spin text-[#76b900]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm text-gray-500">{p.profileLoading}</span>
      </div>
    </div>
  );
  if (!profile) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500 mb-4">{p.profileLoadError}</p>
        <Link href="/" className="text-[#76b900] hover:underline text-sm">{p.backHome}</Link>
      </div>
    </div>
  );

  const roleConf = ROLE_CONFIG[profile.role] ?? { label: profile.role, color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" };
  const avatarSrc = avatarPreview ?? profile.avatarUrl ?? user?.avatarUrl;
  const initials = getInitials(profile.name, profile.email);
  const backLink = profile.role === "student" ? "/student" : profile.role === "examiner" ? "/examiner" : (profile.role === "admin" || profile.role === "superadmin") ? "/admin" : "/";
  const isStudent  = profile.role === "student";
  const isExaminer = profile.role === "examiner" || profile.role === "second_examiner";
  const isAdmin    = ["admin","pav","dean","vice_dean"].includes(profile.role);
  const displayTags = profile.researchTags ? profile.researchTags.split(",").map((t) => t.trim()).filter(Boolean) : [];

  // Öffentlicher Profil-Link
  const publicProfileUrl = `${window.location.origin}/profile/${profile.id}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={backLink} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            {p.back}
          </Link>
          <span className="text-sm font-semibold text-gray-700">{p.title}</span>
          {!editMode ? (
            <button onClick={handleEditStart} className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:border-[#76b900] hover:text-[#76b900] transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              {p.edit}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => setEditMode(false)} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 transition-colors">{p.cancel}</button>
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending || hasUrlErrors}
                title={hasUrlErrors ? p.urlSaveBlocked : undefined}
                className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#76b900" }}
              >
                {updateMutation.isPending
                  ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                {p.save}
              </button>
            </div>
          )}
        </div>
        {/* URL-Fehler-Banner */}
        {editMode && hasUrlErrors && (
          <div className="bg-red-50 border-t border-red-200 px-4 py-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-red-600">{p.urlErrorBanner}</p>
          </div>
        )}
      </div>

      {/* ── Inhalt ── */}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* ── Profilkarte ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="h-24 w-full" style={{ background: `linear-gradient(135deg, ${roleConf.color}22, ${roleConf.color}44)` }} />
          <div className="px-6 pb-6">
            <div className="flex items-end gap-4 -mt-12 mb-4">
              <div className="relative flex-shrink-0">
                {/* Avatar-Bild */}
                <div
                  className="w-24 h-24 rounded-2xl border-4 border-white shadow-md flex items-center justify-center overflow-hidden cursor-pointer"
                  style={{ background: avatarSrc ? "transparent" : roleConf.bg }}
                  onClick={() => avatarSrc && !uploadingAvatar && setShowAvatarPreviewModal(true)}
                  title={avatarSrc ? p.avatarPreview : undefined}
                >
                  {avatarSrc
                    ? <img src={avatarSrc} alt={p.avatarPreview} className="w-full h-full object-cover" />
                    : <span className="text-2xl font-bold" style={{ color: roleConf.color }}>{initials}</span>}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center rounded-2xl gap-2">
                      <svg className="w-8 h-8 animate-spin text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      <span className="text-xs text-white font-medium">{p.avatarUploading}</span>
                    </div>
                  )}
                </div>

                {/* Kamera-Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-white border-2 border-gray-200 shadow flex items-center justify-center hover:border-[#76b900] hover:bg-[#76b900]/5 transition-all disabled:opacity-50 cursor-pointer group"
                  title={uploadingAvatar ? p.avatarUploading : p.avatarUploadTitle}
                >
                  {uploadingAvatar ? (
                    <svg className="w-5 h-5 animate-spin text-[#76b900]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  ) : (
                    <svg className="w-5 h-5 text-gray-500 group-hover:text-[#76b900] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>

                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: "none" }} onChange={handleFileChange} />

                {/* Löschen-Button */}
                {avatarSrc && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={deletingAvatar || uploadingAvatar}
                    className="absolute -top-1 -left-1 w-7 h-7 rounded-full bg-white border-2 border-gray-200 shadow flex items-center justify-center hover:border-red-400 hover:bg-red-50 transition-all disabled:opacity-50 cursor-pointer group"
                    title={p.avatarDeleteTitle}
                  >
                    {deletingAvatar ? (
                      <svg className="w-3.5 h-3.5 animate-spin text-red-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    ) : (
                      <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <h1 className="text-xl font-bold text-gray-900 truncate">{profile.name ?? profile.email ?? "Unbekannt"}</h1>
                <p className="text-sm text-gray-500 truncate">{profile.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border" style={{ color: roleConf.color, background: roleConf.bg, borderColor: roleConf.border }}>{roleConf.label}</span>
              {profile.department && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 border border-gray-200">
                  {getDepartmentLabel(profile.department) ?? profile.department}
                </span>
              )}
            </div>
            {/* Öffentlicher Profil-Link */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{p.profileLink}</span>
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <Link href={`/profile/${profile.id}`} className="text-xs text-[#76b900] hover:underline truncate">{publicProfileUrl}</Link>
                <CopyButton url={publicProfileUrl} copiedMsg={p.profileLinkCopied} failMsg={p.profileLinkCopyFailed} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Persönliche Daten ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            {p.sectionPersonal}
          </h2>
          <div className="space-y-4">
            {editMode
              ? <FieldInput label={p.fieldFullName} value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder={p.fieldNamePlaceholder} />
              : <FieldView label={p.fieldFullName} value={profile.name} notSpecified={p.notSpecified} />}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">{p.fieldEmail}</label>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-800">{profile.email ?? "—"}</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">{p.notChangeable}</span>
              </div>
            </div>
            {editMode ? (
              <FieldInput label={p.fieldSecondEmail} value={form.secondEmail} onChange={(v) => setForm((f) => ({ ...f, secondEmail: v }))} placeholder={p.fieldSecondEmailPlaceholder} type="email" />
            ) : (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">{p.fieldSecondEmail}</label>
                {profile.secondEmail ? (
                  <a href={`mailto:${profile.secondEmail}`} className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-[#76b900] transition-colors group">
                    <span className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "#f3f4f6" }}>
                      <svg className="w-3.5 h-3.5 text-gray-500 group-hover:text-[#76b900] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </span>
                    <span className="group-hover:underline">{profile.secondEmail}</span>
                  </a>
                ) : <span className="text-sm text-gray-400 italic">{p.notSpecified}</span>}
              </div>
            )}
            {editMode
              ? <FieldInput label={p.fieldPhone} value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} placeholder={p.fieldPhonePlaceholder} type="tel" />
              : <FieldView label={p.fieldPhone} value={profile.phone} notSpecified={p.notSpecified} />}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">{p.fieldDepartment}</label>
              {editMode ? (
                <select value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#76b900]/30 focus:border-[#76b900] transition-all bg-white">
                  <option value="">{p.fieldDepartmentPlaceholder}</option>
                  {DEPARTMENTS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              ) : (
                <p className="text-sm text-gray-800">{profile.department ? getDepartmentLabel(profile.department) : <span className="text-gray-400 italic">{p.notSpecified}</span>}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">{p.fieldBio}</label>
              {editMode ? (
                <>
                  <textarea value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} placeholder={p.fieldBioPlaceholder} rows={4} maxLength={1000} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#76b900]/30 focus:border-[#76b900] transition-all resize-none" />
                  <p className="text-xs text-gray-400 mt-1 text-right">{p.fieldBioChars.replace("{n}", String(form.bio.length))}</p>
                </>
              ) : (
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{profile.bio ? profile.bio : <span className="text-gray-400 italic">{p.notSpecified}</span>}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Online-Präsenz ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
            {p.sectionOnline}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {editMode ? (
              <UrlInput label={p.fieldWebsite} value={form.website} onChange={(v) => setForm((f) => ({ ...f, website: v }))} placeholder={p.fieldWebsitePlaceholder} errorMsg={p.urlInvalid} />
            ) : (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{p.fieldWebsite}</label>
                {profile.website ? (
                  <LinkDisplay href={profile.website} label={profile.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    iconBg="#f0fdf4" iconColor="#76b900" hoverBorderColor="hover:border-[#76b900]" hoverBgColor="hover:bg-[#f6ffe0]" textColor="text-[#76b900]"
                    copiedMsg={p.profileLinkCopied} failMsg={p.profileLinkCopyFailed}
                    iconContent={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" /></svg>}
                  />
                ) : <span className="text-sm text-gray-400 italic">{p.notSpecified}</span>}
              </div>
            )}
            {editMode ? (
              <UrlInput label={p.fieldLinkedIn} value={form.linkedIn} onChange={(v) => setForm((f) => ({ ...f, linkedIn: v }))} placeholder={p.fieldLinkedInPlaceholder} errorMsg={p.urlInvalid} />
            ) : (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{p.fieldLinkedIn}</label>
                {profile.linkedIn ? (
                  <LinkDisplay href={profile.linkedIn} label={profile.linkedIn.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "").replace(/\/$/, "") || "LinkedIn"}
                    iconBg="#0a66c2" hoverBorderColor="hover:border-[#0a66c2]" hoverBgColor="hover:bg-[#eff6ff]" textColor="text-[#0a66c2]"
                    copiedMsg={p.profileLinkCopied} failMsg={p.profileLinkCopyFailed}
                    iconContent={<svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>}
                  />
                ) : <span className="text-sm text-gray-400 italic">{p.notSpecified}</span>}
              </div>
            )}
            {editMode ? (
              <UrlInput label={p.fieldResearchGate} value={form.researchGate} onChange={(v) => setForm((f) => ({ ...f, researchGate: v }))} placeholder={p.fieldResearchGatePlaceholder} errorMsg={p.urlInvalid} />
            ) : (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{p.fieldResearchGate}</label>
                {profile.researchGate ? (
                  <LinkDisplay href={profile.researchGate} label={profile.researchGate.replace(/^https?:\/\/(www\.)?researchgate\.net\/profile\//, "").replace(/\/$/, "") || "ResearchGate"}
                    iconBg="#00d0af" hoverBorderColor="hover:border-[#00d0af]" hoverBgColor="hover:bg-[#ecfdf5]" textColor="text-[#00a896]"
                    copiedMsg={p.profileLinkCopied} failMsg={p.profileLinkCopyFailed}
                    iconContent={<span className="text-white font-bold text-xs" style={{ letterSpacing: "-0.5px" }}>RG</span>}
                  />
                ) : <span className="text-sm text-gray-400 italic">{p.notSpecified}</span>}
              </div>
            )}
            {editMode ? (
              <UrlInput label={p.fieldHtwProfile} value={form.htwProfileUrl} onChange={(v) => setForm((f) => ({ ...f, htwProfileUrl: v }))} placeholder={p.fieldHtwProfilePlaceholder} errorMsg={p.urlInvalid} />
            ) : (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{p.fieldHtwProfile}</label>
                {profile.htwProfileUrl ? (
                  <LinkDisplay href={profile.htwProfileUrl} label="HTW Berlin"
                    iconBg="#1a5490" hoverBorderColor="hover:border-[#1a5490]" hoverBgColor="hover:bg-[#f0f4f8]" textColor="text-[#1a5490]"
                    copiedMsg={p.profileLinkCopied} failMsg={p.profileLinkCopyFailed}
                    iconContent={<span className="text-white font-bold text-xs">HTW</span>}
                  />
                ) : <span className="text-sm text-gray-400 italic">{p.notSpecified}</span>}
              </div>
            )}
            {editMode ? (
              <UrlInput label={p.fieldMiscLink} value={form.miscLink} onChange={(v) => setForm((f) => ({ ...f, miscLink: v }))} placeholder={p.fieldMiscLinkPlaceholder} errorMsg={p.urlInvalid} />
            ) : (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{p.fieldMiscLink}</label>
                {profile.miscLink ? (
                  <LinkDisplay href={profile.miscLink} label={profile.miscLink.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    iconBg="#f3f4f6" iconColor="#6b7280" hoverBorderColor="hover:border-gray-400" hoverBgColor="hover:bg-gray-50" textColor="text-gray-700"
                    copiedMsg={p.profileLinkCopied} failMsg={p.profileLinkCopyFailed}
                    iconContent={<svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>}
                  />
                ) : <span className="text-sm text-gray-400 italic">{p.notSpecified}</span>}
              </div>
            )}
            {editMode ? (
              <UrlInput label={p.fieldBookingUrl} value={form.bookingUrl} onChange={(v) => setForm((f) => ({ ...f, bookingUrl: v }))} placeholder={p.fieldBookingUrlPlaceholder} errorMsg={p.urlInvalid} />
            ) : (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{p.fieldBookingUrl}</label>
                {profile.bookingUrl ? (
                  <LinkDisplay href={profile.bookingUrl} label={p.fieldBookingLabel}
                    iconBg="#faf5ff" iconColor="#7c3aed" hoverBorderColor="hover:border-[#7c3aed]" hoverBgColor="hover:bg-[#faf5ff]" textColor="text-[#7c3aed]"
                    copiedMsg={p.profileLinkCopied} failMsg={p.profileLinkCopyFailed}
                    iconContent={<svg className="w-4 h-4" style={{ color: "#7c3aed" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                  />
                ) : <span className="text-sm text-gray-400 italic">{p.notSpecified}</span>}
              </div>
            )}
          </div>
        </div>

        {/* ── Studierende ── */}
        {isStudent && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <svg className="w-5 h-5" style={{ color: "#16a34a" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422A12.083 12.083 0 0121 13c0 6.075-4.925 11-11 11S-1 19.075-1 13c0-.832.086-1.644.25-2.43L12 14z" />
              </svg>
              <span style={{ color: "#16a34a" }}>{p.sectionStudent}</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {editMode
                ? <FieldInput label={p.fieldMatrikelNr} value={form.matrikelNr} onChange={(v) => setForm((f) => ({ ...f, matrikelNr: v }))} placeholder={p.fieldMatrikelNrPlaceholder} />
                : <FieldView label={p.fieldMatrikelNr} value={profile.matrikelNr} notSpecified={p.notSpecified} />}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">{p.fieldThesisType}</label>
                {editMode ? (
                  <select value={form.thesisType} onChange={(e) => setForm((f) => ({ ...f, thesisType: e.target.value as "" | "bachelor" | "master" }))} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#76b900]/30 focus:border-[#76b900] transition-all bg-white">
                    <option value="">{p.fieldDepartmentPlaceholder}</option>
                    <option value="bachelor">Bachelor</option>
                    <option value="master">Master</option>
                  </select>
                ) : (
                  <p className="text-sm text-gray-800">{profile.thesisType === "bachelor" ? "Bachelor" : profile.thesisType === "master" ? "Master" : <span className="text-gray-400 italic">{p.notSpecified}</span>}</p>
                )}
              </div>
              {editMode
                ? <FieldInput label={p.fieldEnrollmentSemester} value={form.enrollmentSemester} onChange={(v) => setForm((f) => ({ ...f, enrollmentSemester: v }))} placeholder={p.fieldEnrollmentSemesterPlaceholder} />
                : <FieldView label={p.fieldEnrollmentSemester} value={profile.enrollmentSemester} notSpecified={p.notSpecified} />}
              {editMode
                ? <FieldInput label={p.fieldTargetSemester} value={form.targetSemester} onChange={(v) => setForm((f) => ({ ...f, targetSemester: v }))} placeholder={p.fieldTargetSemesterPlaceholder} />
                : <FieldView label={p.fieldTargetSemester} value={profile.targetSemester} notSpecified={p.notSpecified} />}
            </div>
          </div>
        )}

        {/* ── Prüfer:innen ── */}
        {isExaminer && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <svg className="w-5 h-5" style={{ color: "#2563eb" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              <span style={{ color: "#2563eb" }}>{p.sectionExaminer}</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {editMode
                ? <FieldInput label={p.fieldAcademicTitle} value={form.academicTitle} onChange={(v) => setForm((f) => ({ ...f, academicTitle: v }))} placeholder={p.fieldAcademicTitlePlaceholder} />
                : <FieldView label={p.fieldAcademicTitle} value={profile.academicTitle} notSpecified={p.notSpecified} />}
              {editMode
                ? <FieldInput label={p.fieldOfficeRoom} value={form.officeRoom} onChange={(v) => setForm((f) => ({ ...f, officeRoom: v }))} placeholder={p.fieldOfficeRoomPlaceholder} />
                : <FieldView label={p.fieldOfficeRoom} value={profile.officeRoom} notSpecified={p.notSpecified} />}
              <div className="sm:col-span-2">
                {editMode
                  ? <FieldInput label={p.fieldOfficeHours} value={form.officeHours} onChange={(v) => setForm((f) => ({ ...f, officeHours: v }))} placeholder={p.fieldOfficeHoursPlaceholder} />
                  : <FieldView label={p.fieldOfficeHours} value={profile.officeHours} notSpecified={p.notSpecified} />}
              </div>
              <div className="sm:col-span-2">
                {editMode ? (
                  <TagInput label={p.fieldResearchTags} tags={researchTagList} onChange={setResearchTagList} placeholder={p.fieldResearchTagsPlaceholder} hint={p.fieldResearchTagsHint} />
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">{p.fieldResearchTags}</label>
                    {displayTags.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {displayTags.map((tag, i) => (
                          <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #93c5fd" }}>{tag}</span>
                        ))}
                      </div>
                    ) : <span className="text-sm text-gray-400 italic">{p.notSpecified}</span>}
                  </div>
                )}
              </div>

              {/* ── Prüfungssprachen ── */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  {lang === 'de' ? 'Prüfungssprachen' : 'Examination Languages'}
                </label>
                {editMode ? (
                  <div className="flex gap-4">
                    {(['Deutsch', 'English'] as const).map((lang_) => (
                      <label key={lang_} className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={examinerLanguages.includes(lang_)}
                          onChange={(e) => {
                            if (e.target.checked) setExaminerLanguages(prev => [...prev, lang_]);
                            else setExaminerLanguages(prev => prev.filter(l => l !== lang_));
                          }}
                          className="w-4 h-4 rounded border-gray-300 accent-[#2563eb]"
                        />
                        <span className="text-sm text-gray-700">{lang_}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {(Array.isArray(profile.examinerLanguages) && profile.examinerLanguages.length > 0)
                      ? profile.examinerLanguages.map((l, i) => (
                          <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #93c5fd" }}>{l}</span>
                        ))
                      : <span className="text-sm text-gray-400 italic">{p.notSpecified}</span>}
                  </div>
                )}
              </div>

              {/* ── Schlagworte für Interessen/Themen ── */}
              <div className="sm:col-span-2">
                {editMode ? (
                  <TagInput
                    label={lang === 'de' ? 'Schlagworte (Interessen / Themen)' : 'Keywords (Interests / Topics)'}
                    tags={examinerKeywords}
                    onChange={setExaminerKeywords}
                    placeholder={lang === 'de' ? 'Schlagwort eingeben und Enter drücken…' : 'Enter keyword and press Enter…'}
                    hint={lang === 'de' ? 'Themen, die Sie bei Abschlussarbeiten betreuen möchten' : 'Topics you are willing to supervise in theses'}
                  />
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      {lang === 'de' ? 'Schlagworte (Interessen / Themen)' : 'Keywords (Interests / Topics)'}
                    </label>
                    {(Array.isArray(profile.examinerKeywords) && profile.examinerKeywords.length > 0)
                      ? (
                        <div className="flex flex-wrap gap-1.5">
                          {profile.examinerKeywords.map((kw, i) => (
                            <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #93c5fd" }}>{kw}</span>
                          ))}
                        </div>
                      )
                      : <span className="text-sm text-gray-400 italic">{p.notSpecified}</span>}
                  </div>
                )}
              </div>

              {/* ── Studiengänge in denen geprüft wird ── */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  {lang === 'de' ? 'Studiengänge (Prüfungsberechtigung)' : 'Study Programmes (Examination Eligibility)'}
                </label>
                {editMode ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-3">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={examinerProgrammeIds === null}
                          onChange={(e) => {
                            if (e.target.checked) setExaminerProgrammeIds(null);
                            else setExaminerProgrammeIds([]);
                          }}
                          className="w-4 h-4 rounded border-gray-300 accent-[#2563eb]"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          {lang === 'de' ? 'Alle Studiengänge (Standard)' : 'All study programmes (default)'}
                        </span>
                      </label>
                    </div>
                    {examinerProgrammeIds !== null && (
                      <div className="grid grid-cols-1 gap-1.5 max-h-64 overflow-y-auto border border-gray-200 rounded-xl p-3 bg-gray-50">
                        {(allProgrammes ?? []).map(prog => (
                          <label key={prog.id} className="flex items-center gap-2.5 cursor-pointer select-none py-1 hover:bg-white rounded-lg px-2 transition-colors">
                            <input
                              type="checkbox"
                              checked={examinerProgrammeIds.includes(prog.id)}
                              onChange={(e) => {
                                if (e.target.checked) setExaminerProgrammeIds(prev => prev ? [...prev, prog.id] : [prog.id]);
                                else setExaminerProgrammeIds(prev => prev ? prev.filter(id => id !== prog.id) : []);
                              }}
                              className="w-4 h-4 rounded border-gray-300 accent-[#2563eb] flex-shrink-0"
                            />
                            <span className="text-xs font-semibold text-[#2563eb] w-16 flex-shrink-0">{prog.abbreviation}</span>
                            <span className="text-sm text-gray-700 truncate">{prog.name}</span>
                            <span className="text-xs text-gray-400 flex-shrink-0 capitalize">{prog.level}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {(Array.isArray(profile.examinerProgrammeIds) && profile.examinerProgrammeIds.length > 0) ? (
                      <div className="flex flex-wrap gap-1.5">
                        {(allProgrammes ?? []).filter(p => profile.examinerProgrammeIds!.includes(p.id)).map((prog, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #93c5fd" }}>
                            <span className="font-bold">{prog.abbreviation}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">
                        {lang === 'de' ? 'Alle Studiengänge' : 'All study programmes'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Verwaltung ── */}
        {isAdmin && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <svg className="w-5 h-5" style={{ color: "#7c3aed" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              <span style={{ color: "#7c3aed" }}>{p.sectionAdmin}</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {editMode
                ? <FieldInput label={p.fieldStaffId} value={form.staffId} onChange={(v) => setForm((f) => ({ ...f, staffId: v }))} />
                : <FieldView label={p.fieldStaffId} value={profile.staffId} notSpecified={p.notSpecified} />}
              {editMode
                ? <FieldInput label={p.fieldOfficeLocation} value={form.officeLocation} onChange={(v) => setForm((f) => ({ ...f, officeLocation: v }))} />
                : <FieldView label={p.fieldOfficeLocation} value={profile.officeLocation} notSpecified={p.notSpecified} />}
              <div className="sm:col-span-2">
                {editMode
                  ? <FieldInput label={p.fieldResponsibilityArea} value={form.responsibilityArea} onChange={(v) => setForm((f) => ({ ...f, responsibilityArea: v }))} />
                  : <FieldView label={p.fieldResponsibilityArea} value={profile.responsibilityArea} notSpecified={p.notSpecified} />}
              </div>
            </div>
          </div>
        )}

        {/* ── Konto-Informationen ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            {p.sectionAccount}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldView label={p.memberSince} value={formatDate(profile.createdAt, lang)} notSpecified="—" />
            <FieldView label={p.lastLogin} value={formatDate(profile.lastSignedIn, lang)} notSpecified="—" />
          </div>
        </div>

      </div>

      {/* ── Crop-Modal ── */}
      <AvatarCropModal
        open={showCropModal}
        imageSrc={cropSrc}
        onClose={handleCropClose}
        onCropComplete={handleCropComplete}
      />

      {/* ── Avatar-Vorschau-Modal ── */}
      {showAvatarPreviewModal && avatarSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAvatarPreviewModal(false)}>
          <div className="relative max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <img src={avatarSrc} alt={p.avatarPreview} className="w-full rounded-2xl shadow-2xl object-cover" />
            <button onClick={() => setShowAvatarPreviewModal(false)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Avatar-Löschen-Bestätigung ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-900 mb-2">{p.avatarDeleteConfirmTitle}</h3>
            <p className="text-sm text-gray-500 mb-6">{p.avatarDeleteConfirmDesc}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">{p.cancel}</button>
              <button
                onClick={() => { setDeletingAvatar(true); deleteAvatarMutation.mutate(); }}
                disabled={deletingAvatar}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {deletingAvatar && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                {p.avatarDeleteConfirmBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
