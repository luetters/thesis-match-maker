import { useState, useRef, useCallback, KeyboardEvent } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
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
  examiner:   { label: "Prüfer:in",                 color: "#2563eb", bg: "#eff6ff", border: "#93c5fd" },
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

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────
function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("de-DE", {
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
function FieldView({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      <p className="text-sm text-gray-800">
        {value ? value : <span className="text-gray-400 italic">Nicht angegeben</span>}
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

// ─── Tag-Liste-Komponente ─────────────────────────────────────────────────────
function TagInput({
  label, tags, onChange,
  placeholder = "Tag eingeben und Enter drücken…",
}: {
  label: string; tags: string[]; onChange: (tags: string[]) => void; placeholder?: string;
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
            <button type="button" onClick={() => onChange(tags.filter((_, j) => j !== i))} className="ml-0.5 hover:text-red-500 transition-colors" aria-label={tag + " entfernen"}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </span>
        ))}
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} onBlur={addTag}
          placeholder={tags.length === 0 ? placeholder : "Weiteren Tag hinzufügen…"}
          className="flex-1 min-w-[120px] text-sm outline-none bg-transparent" />
      </div>
      <p className="text-xs text-gray-400 mt-1">Enter oder Komma zum Hinzufügen · Backspace zum Löschen des letzten Tags</p>
    </div>
  );
}

// ─── Link-Anzeige-Komponente ──────────────────────────────────────────────────
function LinkDisplay({
  href, label, iconBg, iconColor, iconContent, hoverBorderColor, hoverBgColor, textColor,
}: {
  href: string; label: string; iconBg: string; iconColor?: string;
  iconContent: React.ReactNode; hoverBorderColor: string; hoverBgColor: string; textColor: string;
}) {
  const displayText = (() => {
    try {
      return new URL(href).hostname.replace(/^www\./, "") + (new URL(href).pathname !== "/" ? new URL(href).pathname : "");
    } catch {
      return href;
    }
  })();
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className={`inline-flex items-center gap-2.5 px-3 py-2 rounded-xl border border-gray-200 transition-all group max-w-full ${hoverBorderColor} ${hoverBgColor}`}>
      <span className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: iconBg, color: iconColor }}>
        {iconContent}
      </span>
      <span className={`text-sm group-hover:underline truncate ${textColor}`}>{label || displayText}</span>
      <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
    </a>
  );
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────
export default function Profile() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: profile, isLoading, refetch } = trpc.profile.get.useQuery();
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
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const updateMutation = trpc.profile.update.useMutation({
    onSuccess: () => { toast.success("Profil gespeichert"); setEditMode(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const [deletingAvatar, setDeletingAvatar] = useState(false);

  const deleteAvatarMutation = trpc.profile.deleteAvatar.useMutation({
    onSuccess: () => {
      setAvatarPreview(null);
      utils.profile.get.invalidate();
      setTimeout(() => refetch(), 300);
      toast.success(
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Profilfoto wurde zurückgesetzt</span>
        </div>
      );
    },
    onError: (e) => toast.error(`Fehler: ${e.message}`),
    onSettled: () => setDeletingAvatar(false),
  });

  const handleDeleteAvatar = () => {
    if (!window.confirm("Profilfoto wirklich löschen und auf Standard-Avatar zurücksetzen?")) return;
    setDeletingAvatar(true);
    deleteAvatarMutation.mutate();
  };

  const uploadAvatarMutation = trpc.profile.uploadAvatar.useMutation({
    onSuccess: (data) => {
      setAvatarPreview(data.avatarUrl);
      toast.success(
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Profilfoto erfolgreich aktualisiert</span>
        </div>
      );
      utils.profile.get.invalidate();
    },
    onError: (e) => {
      console.error("[Avatar Upload] Error:", e);
      toast.error(`Fehler beim Upload: ${e.message}`);
      setUploadingAvatar(false);
    },
    onSettled: () => setUploadingAvatar(false),
  });

  const handleEditStart = () => {
    if (!profile) return;
    setResearchTagList(profile.researchTags ? profile.researchTags.split(",").map((t) => t.trim()).filter(Boolean) : []);
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

  const handleSave = () => {
    updateMutation.mutate({
      name: form.name || undefined, bio: form.bio || undefined, phone: form.phone || undefined, department: form.department || undefined,
      matrikelNr: form.matrikelNr || undefined, thesisType: (form.thesisType as "bachelor" | "master") || undefined,
      enrollmentSemester: form.enrollmentSemester || undefined, targetSemester: form.targetSemester || undefined,
      academicTitle: form.academicTitle || undefined, officeRoom: form.officeRoom || undefined, officeHours: form.officeHours || undefined,
      researchTags: researchTagList.join(", ") || undefined,
      staffId: form.staffId || undefined, responsibilityArea: form.responsibilityArea || undefined, officeLocation: form.officeLocation || undefined,
      secondEmail: form.secondEmail || undefined, website: form.website || undefined, linkedIn: form.linkedIn || undefined, researchGate: form.researchGate || undefined,
      htwProfileUrl: form.htwProfileUrl || undefined, miscLink: form.miscLink || undefined, bookingUrl: form.bookingUrl || undefined,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (file.size > 5 * 1024 * 1024) { toast.error("Datei zu groß – bitte max. 5 MB."); return; }
    if (!["image/jpeg","image/png","image/webp","image/gif"].includes(file.type)) { toast.error("Ungültiges Format – erlaubt sind JPEG, PNG, WebP und GIF."); return; }
    setUploadingAvatar(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) { setUploadingAvatar(false); toast.error("Datei konnte nicht gelesen werden."); return; }
      setAvatarPreview(dataUrl);
      const base64 = dataUrl.split(",")[1];
      if (!base64) { setUploadingAvatar(false); toast.error("Datei konnte nicht kodiert werden."); return; }
      uploadAvatarMutation.mutate({ base64, mimeType: file.type as "image/jpeg"|"image/png"|"image/webp"|"image/gif", fileName: file.name });
    };
    reader.onerror = () => { setUploadingAvatar(false); toast.error("Fehler beim Lesen der Datei."); };
    reader.readAsDataURL(file);
  };

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <svg className="w-8 h-8 animate-spin text-[#76b900]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm text-gray-500">Profil wird geladen…</span>
      </div>
    </div>
  );
  if (!profile) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500 mb-4">Profil konnte nicht geladen werden.</p>
        <Link href="/" className="text-[#76b900] hover:underline text-sm">Zur Startseite</Link>
      </div>
    </div>
  );

  const roleConf = ROLE_CONFIG[profile.role] ?? { label: profile.role, color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" };
  const statusConf = ROLE_STATUS_CONFIG[profile.roleStatus] ?? { label: profile.roleStatus, color: "#6b7280", bg: "#f9fafb" };
  const avatarSrc = avatarPreview ?? profile.avatarUrl;
  const initials = getInitials(profile.name, profile.email);
  const backLink = profile.role === "student" ? "/student" : profile.role === "examiner" ? "/examiner" : (profile.role === "admin" || profile.role === "superadmin") ? "/admin" : "/";
  const isStudent  = profile.role === "student";
  const isExaminer = profile.role === "examiner";
  const isAdmin    = ["admin","pav","dean","vice_dean"].includes(profile.role);
  const displayTags = profile.researchTags ? profile.researchTags.split(",").map((t) => t.trim()).filter(Boolean) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={backLink} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Zurück
          </Link>
          <span className="text-sm font-semibold text-gray-700">Mein Profil</span>
          {!editMode ? (
            <button onClick={handleEditStart} className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:border-[#76b900] hover:text-[#76b900] transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Bearbeiten
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => setEditMode(false)} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 transition-colors">Abbrechen</button>
              <button onClick={handleSave} disabled={updateMutation.isPending} className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg text-white transition-colors disabled:opacity-60" style={{ backgroundColor: "#76b900" }}>
                {updateMutation.isPending
                  ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                Speichern
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Inhalt ── */}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* ── Profilkarte ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="h-24 w-full" style={{ background: `linear-gradient(135deg, ${roleConf.color}22, ${roleConf.color}44)` }} />
          <div className="px-6 pb-6">
            <div className="flex items-end gap-4 -mt-12 mb-4">
              <div className="relative flex-shrink-0">
                <div className="w-24 h-24 rounded-2xl border-4 border-white shadow-md flex items-center justify-center overflow-hidden" style={{ background: avatarSrc ? "transparent" : roleConf.bg }}>
                  {avatarSrc ? <img src={avatarSrc} alt="Profilfoto" className="w-full h-full object-cover" /> : <span className="text-2xl font-bold" style={{ color: roleConf.color }}>{initials}</span>}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center rounded-2xl gap-2">
                      <svg className="w-8 h-8 animate-spin text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      <span className="text-xs text-white font-medium">Wird hochgeladen…</span>
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-white border-2 border-gray-200 shadow flex items-center justify-center hover:border-[#76b900] hover:bg-[#76b900]/5 transition-all disabled:opacity-50 cursor-pointer group"
                  title={uploadingAvatar ? "Wird hochgeladen…" : "Profilfoto hochladen"}>
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
                {avatarSrc && (
                  <button
                    type="button"
                    onClick={handleDeleteAvatar}
                    disabled={deletingAvatar || uploadingAvatar}
                    className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-white border-2 border-gray-200 shadow flex items-center justify-center hover:border-red-400 hover:bg-red-50 transition-all disabled:opacity-50 cursor-pointer group"
                    title="Profilfoto löschen">
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
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border" style={{ color: roleConf.color, background: roleConf.bg, borderColor: roleConf.border }}>{roleConf.label}</span>
              {profile.department && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 border border-gray-200">
                  {getDepartmentLabel(profile.department) ?? profile.department}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Persönliche Daten ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            Persönliche Daten
          </h2>
          <div className="space-y-4">
            {editMode ? <FieldInput label="Vollständiger Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Vor- und Nachname" /> : <FieldView label="Vollständiger Name" value={profile.name} />}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">E-Mail-Adresse</label>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-800">{profile.email ?? "—"}</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Nicht änderbar</span>
              </div>
            </div>
            {editMode ? (
              <FieldInput label="Zweite E-Mail-Adresse" value={form.secondEmail} onChange={(v) => setForm((f) => ({ ...f, secondEmail: v }))} placeholder="alternative@beispiel.de" type="email" />
            ) : (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Zweite E-Mail-Adresse</label>
                {profile.secondEmail ? (
                  <a href={`mailto:${profile.secondEmail}`}
                    className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-[#76b900] transition-colors group">
                    <span className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "#f3f4f6" }}>
                      <svg className="w-3.5 h-3.5 text-gray-500 group-hover:text-[#76b900] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </span>
                    <span className="group-hover:underline">{profile.secondEmail}</span>
                  </a>
                ) : <span className="text-sm text-gray-400 italic">Nicht angegeben</span>}
              </div>
            )}
            {editMode ? <FieldInput label="Telefonnummer" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} placeholder="+49 30 12345678" type="tel" /> : <FieldView label="Telefonnummer" value={profile.phone} />}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Fachbereich</label>
              {editMode ? (
                <select value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#76b900]/30 focus:border-[#76b900] transition-all bg-white">
                  <option value="">Bitte wählen…</option>
                  {DEPARTMENTS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              ) : (
                <p className="text-sm text-gray-800">{profile.department ? getDepartmentLabel(profile.department) : <span className="text-gray-400 italic">Nicht angegeben</span>}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Über mich</label>
              {editMode ? (
                <>
                  <textarea value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} placeholder="Kurze Beschreibung Ihrer Person, Interessen oder Schwerpunkte…" rows={4} maxLength={1000} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#76b900]/30 focus:border-[#76b900] transition-all resize-none" />
                  <p className="text-xs text-gray-400 mt-1 text-right">{form.bio.length}/1000 Zeichen</p>
                </>
              ) : (
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{profile.bio ? profile.bio : <span className="text-gray-400 italic">Keine Beschreibung angegeben</span>}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Online-Präsenz ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
            Online-Präsenz
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            {/* Website */}
            {editMode ? (
              <FieldInput label="Website" value={form.website} onChange={(v) => setForm((f) => ({ ...f, website: v }))} placeholder="https://www.beispiel.de" type="url" />
            ) : (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Website</label>
                {profile.website ? (
                  <LinkDisplay
                    href={profile.website}
                    label={profile.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    iconBg="#f0fdf4"
                    iconColor="#76b900"
                    hoverBorderColor="hover:border-[#76b900]"
                    hoverBgColor="hover:bg-[#f6ffe0]"
                    textColor="text-[#76b900]"
                    iconContent={
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
                      </svg>
                    }
                  />
                ) : <span className="text-sm text-gray-400 italic">Nicht angegeben</span>}
              </div>
            )}

            {/* LinkedIn */}
            {editMode ? (
              <FieldInput label="LinkedIn-Profil" value={form.linkedIn} onChange={(v) => setForm((f) => ({ ...f, linkedIn: v }))} placeholder="https://www.linkedin.com/in/…" type="url" />
            ) : (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">LinkedIn-Profil</label>
                {profile.linkedIn ? (
                  <LinkDisplay
                    href={profile.linkedIn}
                    label={profile.linkedIn.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "").replace(/\/$/, "") || "LinkedIn"}
                    iconBg="#0a66c2"
                    hoverBorderColor="hover:border-[#0a66c2]"
                    hoverBgColor="hover:bg-[#eff6ff]"
                    textColor="text-[#0a66c2]"
                    iconContent={
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                    }
                  />
                ) : <span className="text-sm text-gray-400 italic">Nicht angegeben</span>}
              </div>
            )}

            {/* ResearchGate */}
            {editMode ? (
              <FieldInput label="ResearchGate-Profil" value={form.researchGate} onChange={(v) => setForm((f) => ({ ...f, researchGate: v }))} placeholder="https://www.researchgate.net/profile/…" type="url" />
            ) : (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">ResearchGate-Profil</label>
                {profile.researchGate ? (
                  <LinkDisplay
                    href={profile.researchGate}
                    label={profile.researchGate.replace(/^https?:\/\/(www\.)?researchgate\.net\/profile\//, "").replace(/\/$/, "") || "ResearchGate"}
                    iconBg="#00d0af"
                    hoverBorderColor="hover:border-[#00d0af]"
                    hoverBgColor="hover:bg-[#ecfdf5]"
                    textColor="text-[#00a896]"
                    iconContent={<span className="text-white font-bold text-xs" style={{ letterSpacing: "-0.5px" }}>RG</span>}
                  />
                ) : <span className="text-sm text-gray-400 italic">Nicht angegeben</span>}
              </div>
            )}

            {/* HTW Berlin Profil */}
            {editMode ? (
              <FieldInput label="HTW Berlin Profil" value={form.htwProfileUrl} onChange={(v) => setForm((f) => ({ ...f, htwProfileUrl: v }))} placeholder="https://www.htw-berlin.de/hochschule/personen/…" type="url" />
            ) : (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">HTW Berlin Profil</label>
                {profile.htwProfileUrl ? (
                  <LinkDisplay
                    href={profile.htwProfileUrl}
                    label="HTW Berlin"
                    iconBg="#1a5490"
                    hoverBorderColor="hover:border-[#1a5490]"
                    hoverBgColor="hover:bg-[#f0f4f8]"
                    textColor="text-[#1a5490]"
                    iconContent={<span className="text-white font-bold text-xs">HTW</span>}
                  />
                ) : <span className="text-sm text-gray-400 italic">Nicht angegeben</span>}
              </div>
            )}

            {/* Weiterer Link (miscLink) */}
            {editMode ? (
              <FieldInput label="Weiterer Link" value={form.miscLink} onChange={(v) => setForm((f) => ({ ...f, miscLink: v }))} placeholder="https://…" type="url" />
            ) : (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Weiterer Link</label>
                {profile.miscLink ? (
                  <LinkDisplay
                    href={profile.miscLink}
                    label={profile.miscLink.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    iconBg="#f3f4f6"
                    iconColor="#6b7280"
                    hoverBorderColor="hover:border-gray-400"
                    hoverBgColor="hover:bg-gray-50"
                    textColor="text-gray-700"
                    iconContent={
                      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    }
                  />
                ) : <span className="text-sm text-gray-400 italic">Nicht angegeben</span>}
              </div>
            )}

            {/* Terminbuchung (bookingUrl) */}
            {editMode ? (
              <FieldInput label="Terminbuchungs-Link" value={form.bookingUrl} onChange={(v) => setForm((f) => ({ ...f, bookingUrl: v }))} placeholder="https://calendly.com/… oder ähnlich" type="url" />
            ) : (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Terminbuchung</label>
                {profile.bookingUrl ? (
                  <LinkDisplay
                    href={profile.bookingUrl}
                    label="Termin buchen"
                    iconBg="#faf5ff"
                    iconColor="#7c3aed"
                    hoverBorderColor="hover:border-[#7c3aed]"
                    hoverBgColor="hover:bg-[#faf5ff]"
                    textColor="text-[#7c3aed]"
                    iconContent={
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    }
                  />
                ) : <span className="text-sm text-gray-400 italic">Nicht angegeben</span>}
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
              <span style={{ color: "#16a34a" }}>Studierenden-Informationen</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {editMode ? <FieldInput label="Matrikelnummer" value={form.matrikelNr} onChange={(v) => setForm((f) => ({ ...f, matrikelNr: v }))} placeholder="z.B. 567890" /> : <FieldView label="Matrikelnummer" value={profile.matrikelNr} />}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Angestrebter Abschluss</label>
                {editMode ? (
                  <select value={form.thesisType} onChange={(e) => setForm((f) => ({ ...f, thesisType: e.target.value as "" | "bachelor" | "master" }))} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#76b900]/30 focus:border-[#76b900] transition-all bg-white">
                    <option value="">Bitte wählen…</option>
                    <option value="bachelor">Bachelor</option>
                    <option value="master">Master</option>
                  </select>
                ) : (
                  <p className="text-sm text-gray-800">{profile.thesisType === "bachelor" ? "Bachelor" : profile.thesisType === "master" ? "Master" : <span className="text-gray-400 italic">Nicht angegeben</span>}</p>
                )}
              </div>
              {editMode ? <FieldInput label="Immatrikulationssemester" value={form.enrollmentSemester} onChange={(v) => setForm((f) => ({ ...f, enrollmentSemester: v }))} placeholder="z.B. WiSe 2022/23" /> : <FieldView label="Immatrikulationssemester" value={profile.enrollmentSemester} />}
              {editMode ? <FieldInput label="Zielsemester (Abschluss)" value={form.targetSemester} onChange={(v) => setForm((f) => ({ ...f, targetSemester: v }))} placeholder="z.B. SoSe 2025" /> : <FieldView label="Zielsemester (Abschluss)" value={profile.targetSemester} />}
            </div>
          </div>
        )}

        {/* ── Prüfer:innen ── */}
        {isExaminer && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <svg className="w-5 h-5" style={{ color: "#2563eb" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              <span style={{ color: "#2563eb" }}>Prüfer:innen-Informationen</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {editMode ? <FieldInput label="Akademischer Titel" value={form.academicTitle} onChange={(v) => setForm((f) => ({ ...f, academicTitle: v }))} placeholder="z.B. Prof. Dr." /> : <FieldView label="Akademischer Titel" value={profile.academicTitle} />}
              {editMode ? <FieldInput label="Büro / Raum" value={form.officeRoom} onChange={(v) => setForm((f) => ({ ...f, officeRoom: v }))} placeholder="z.B. Gebäude C, Raum 307" /> : <FieldView label="Büro / Raum" value={profile.officeRoom} />}
            </div>
            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Sprechzeiten</label>
              {editMode ? (
                <>
                  <textarea value={form.officeHours} onChange={(e) => setForm((f) => ({ ...f, officeHours: e.target.value }))} placeholder="z.B. Dienstag 10–12 Uhr, Donnerstag 14–16 Uhr (nach Vereinbarung)" rows={3} maxLength={500} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#76b900]/30 focus:border-[#76b900] transition-all resize-none" />
                  <p className="text-xs text-gray-400 mt-1 text-right">{form.officeHours.length}/500 Zeichen</p>
                </>
              ) : (
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{profile.officeHours ? profile.officeHours : <span className="text-gray-400 italic">Nicht angegeben</span>}</p>
              )}
            </div>
            <div className="mt-4">
              {editMode ? (
                <TagInput label="Forschungsschwerpunkte" tags={researchTagList} onChange={setResearchTagList} placeholder="z.B. Machine Learning, Nachhaltigkeit…" />
              ) : (
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Forschungsschwerpunkte</label>
                  {displayTags.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {displayTags.map((tag, i) => <span key={i} className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #93c5fd" }}>{tag}</span>)}
                    </div>
                  ) : <span className="text-sm text-gray-400 italic">Nicht angegeben</span>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Verwaltung ── */}
        {isAdmin && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <svg className="w-5 h-5" style={{ color: "#7c3aed" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              <span style={{ color: "#7c3aed" }}>Verwaltungs-Informationen</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {editMode ? <FieldInput label="Personalnummer" value={form.staffId} onChange={(v) => setForm((f) => ({ ...f, staffId: v }))} placeholder="z.B. P-12345" /> : <FieldView label="Personalnummer" value={profile.staffId} />}
              {editMode ? <FieldInput label="Zuständigkeitsbereich" value={form.responsibilityArea} onChange={(v) => setForm((f) => ({ ...f, responsibilityArea: v }))} placeholder="z.B. Prüfungsamt FB 3" /> : <FieldView label="Zuständigkeitsbereich" value={profile.responsibilityArea} />}
              {editMode ? <FieldInput label="Bürostandort" value={form.officeLocation} onChange={(v) => setForm((f) => ({ ...f, officeLocation: v }))} placeholder="z.B. Gebäude A, Raum 101" /> : <FieldView label="Bürostandort" value={profile.officeLocation} />}
            </div>
          </div>
        )}

        {/* ── Konto-Informationen ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            Konto-Informationen
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Rolle</label>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border" style={{ color: roleConf.color, background: roleConf.bg, borderColor: roleConf.border }}>{roleConf.label}</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Status</label>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium" style={{ color: statusConf.color, background: statusConf.bg }}>
                <span className="w-2 h-2 rounded-full" style={{ background: statusConf.color }} />
                {statusConf.label}
              </span>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Registriert am</label>
              <p className="text-sm text-gray-800">{formatDate(profile.createdAt)}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Zuletzt angemeldet</label>
              <p className="text-sm text-gray-800">{formatDate(profile.lastSignedIn)}</p>
            </div>
          </div>
        </div>

        {/* ── Hinweis ── */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <p className="text-sm text-blue-700">Klicken Sie auf das Kamera-Symbol am Profilfoto, um ein neues Bild hochzuladen. Erlaubte Formate: JPEG, PNG, WebP, GIF (max. 5 MB).</p>
        </div>
      </div>
    </div>
  );
}
