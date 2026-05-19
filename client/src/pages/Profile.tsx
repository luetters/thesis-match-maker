import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Link } from "wouter";

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

// ─── Feld-Komponenten ─────────────────────────────────────────────────────────
function FieldView({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      <p className="text-sm text-gray-800">
        {value ?? <span className="text-gray-400 italic">Nicht angegeben</span>}
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

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────
export default function Profile() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading, refetch } = trpc.profile.get.useQuery();

  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    // Allgemein
    name: "", bio: "", phone: "", department: "",
    // Studierende
    matrikelNr: "", thesisType: "" as "" | "bachelor" | "master", enrollmentSemester: "", targetSemester: "",
    // Prüfer:innen
    academicTitle: "", officeRoom: "", officeHours: "", researchTags: "",
    // Verwaltung
    staffId: "", responsibilityArea: "", officeLocation: "",
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const updateMutation = trpc.profile.update.useMutation({
    onSuccess: () => {
      toast.success("Profil gespeichert");
      setEditMode(false);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const uploadAvatarMutation = trpc.profile.uploadAvatar.useMutation({
    onSuccess: (data) => {
      setAvatarPreview(data.avatarUrl);
      toast.success("Foto hochgeladen");
      refetch();
    },
    onError: (e) => {
      toast.error(e.message);
      setUploadingAvatar(false);
    },
    onSettled: () => setUploadingAvatar(false),
  });

  const handleEditStart = () => {
    if (!profile) return;
    setForm({
      name: profile.name ?? "",
      bio: profile.bio ?? "",
      phone: profile.phone ?? "",
      department: profile.department ?? "",
      matrikelNr: profile.matrikelNr ?? "",
      thesisType: (profile.thesisType as "" | "bachelor" | "master") ?? "",
      enrollmentSemester: profile.enrollmentSemester ?? "",
      targetSemester: (profile as any).targetSemester ?? "",
      academicTitle: profile.academicTitle ?? "",
      officeRoom: profile.officeRoom ?? "",
      officeHours: (profile as any).officeHours ?? "",
      researchTags: (profile as any).researchTags ?? "",
      staffId: profile.staffId ?? "",
      responsibilityArea: profile.responsibilityArea ?? "",
      officeLocation: (profile as any).officeLocation ?? "",
    });
    setEditMode(true);
  };

  const handleSave = () => {
    updateMutation.mutate({
      name: form.name || undefined,
      bio: form.bio || undefined,
      phone: form.phone || undefined,
      department: form.department || undefined,
      matrikelNr: form.matrikelNr || undefined,
      thesisType: (form.thesisType as "bachelor" | "master") || undefined,
      enrollmentSemester: form.enrollmentSemester || undefined,
      targetSemester: form.targetSemester || undefined,
      academicTitle: form.academicTitle || undefined,
      officeRoom: form.officeRoom || undefined,
      officeHours: form.officeHours || undefined,
      researchTags: form.researchTags || undefined,
      staffId: form.staffId || undefined,
      responsibilityArea: form.responsibilityArea || undefined,
      officeLocation: form.officeLocation || undefined,
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Datei zu groß – bitte max. 5 MB."); return; }
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) { toast.error("Ungültiges Format – erlaubt sind JPEG, PNG, WebP und GIF."); return; }
    setUploadingAvatar(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setAvatarPreview(dataUrl);
      const base64 = dataUrl.split(",")[1];
      uploadAvatarMutation.mutate({
        base64,
        mimeType: file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  if (isLoading) {
    return (
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
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Profil konnte nicht geladen werden.</p>
          <Link href="/" className="text-[#76b900] hover:underline text-sm">Zur Startseite</Link>
        </div>
      </div>
    );
  }

  const roleConf = ROLE_CONFIG[profile.role] ?? { label: profile.role, color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" };
  const statusConf = ROLE_STATUS_CONFIG[profile.roleStatus] ?? { label: profile.roleStatus, color: "#6b7280", bg: "#f9fafb" };
  const avatarSrc = avatarPreview ?? profile.avatarUrl;
  const initials = getInitials(profile.name, profile.email);

  const backLink = profile.role === "student" ? "/student"
    : profile.role === "examiner" ? "/examiner"
    : profile.role === "admin" || profile.role === "superadmin" ? "/admin"
    : "/";

  const isStudent  = profile.role === "student";
  const isExaminer = profile.role === "examiner";
  const isAdmin    = profile.role === "admin" || profile.role === "pav" || profile.role === "dean" || profile.role === "vice_dean";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={backLink} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Zurück
          </Link>
          <span className="text-sm font-semibold text-gray-700">Mein Profil</span>
          {!editMode ? (
            <button
              onClick={handleEditStart}
              className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:border-[#76b900] hover:text-[#76b900] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Bearbeiten
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditMode(false)}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg text-white transition-colors disabled:opacity-60"
                style={{ backgroundColor: "#76b900" }}
              >
                {updateMutation.isPending ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                Speichern
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Inhalt */}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* ── Profilkarte ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="h-24 w-full" style={{ background: `linear-gradient(135deg, ${roleConf.color}22, ${roleConf.color}44)` }} />
          <div className="px-6 pb-6">
            <div className="flex items-end gap-4 -mt-12 mb-4">
              <div className="relative">
                <div
                  className="w-24 h-24 rounded-2xl border-4 border-white shadow-md flex items-center justify-center overflow-hidden"
                  style={{ background: avatarSrc ? "transparent" : roleConf.bg }}
                >
                  {avatarSrc ? (
                    <img src={avatarSrc} alt="Profilfoto" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold" style={{ color: roleConf.color }}>{initials}</span>
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-2xl">
                      <svg className="w-6 h-6 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border-2 border-gray-200 shadow flex items-center justify-center hover:border-[#76b900] transition-colors disabled:opacity-50"
                  title="Foto hochladen"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <h1 className="text-xl font-bold text-gray-900 truncate">
                  {profile.name ?? profile.email ?? "Unbekannt"}
                </h1>
                <p className="text-sm text-gray-500 truncate">{profile.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"
                style={{ color: roleConf.color, background: roleConf.bg, borderColor: roleConf.border }}
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                {roleConf.label}
              </span>
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                style={{ color: statusConf.color, background: statusConf.bg }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusConf.color }} />
                {statusConf.label}
              </span>
            </div>
          </div>
        </div>

        {/* ── Persönliche Daten ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Persönliche Daten
          </h2>
          <div className="space-y-4">
            {/* Name */}
            {editMode ? (
              <FieldInput label="Vollständiger Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Vor- und Nachname" />
            ) : (
              <FieldView label="Vollständiger Name" value={profile.name} />
            )}

            {/* E-Mail (nicht editierbar) */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">E-Mail-Adresse</label>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-800">{profile.email ?? "—"}</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Nicht änderbar</span>
              </div>
            </div>

            {/* Telefon */}
            {editMode ? (
              <FieldInput label="Telefonnummer" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} placeholder="+49 30 12345678" type="tel" />
            ) : (
              <FieldView label="Telefonnummer" value={profile.phone} />
            )}

            {/* Fachbereich */}
            {editMode ? (
              <FieldInput label="Fachbereich / Institut" value={form.department} onChange={(v) => setForm((f) => ({ ...f, department: v }))} placeholder="z.B. Fachbereich 3 – Wirtschaft" />
            ) : (
              <FieldView label="Fachbereich / Institut" value={profile.department} />
            )}

            {/* Bio */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Über mich</label>
              {editMode ? (
                <>
                  <textarea
                    value={form.bio}
                    onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                    placeholder="Kurze Beschreibung Ihrer Person, Interessen oder Schwerpunkte…"
                    rows={4}
                    maxLength={1000}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#76b900]/30 focus:border-[#76b900] transition-all resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">{form.bio.length}/1000 Zeichen</p>
                </>
              ) : (
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {profile.bio ?? <span className="text-gray-400 italic">Keine Beschreibung angegeben</span>}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Rollenspezifische Daten: Studierende ── */}
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
              {/* Matrikelnummer */}
              {editMode ? (
                <FieldInput label="Matrikelnummer" value={form.matrikelNr} onChange={(v) => setForm((f) => ({ ...f, matrikelNr: v }))} placeholder="z.B. 567890" />
              ) : (
                <FieldView label="Matrikelnummer" value={profile.matrikelNr} />
              )}

              {/* Abschlussart */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Angestrebter Abschluss</label>
                {editMode ? (
                  <select
                    value={form.thesisType}
                    onChange={(e) => setForm((f) => ({ ...f, thesisType: e.target.value as "" | "bachelor" | "master" }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#76b900]/30 focus:border-[#76b900] transition-all bg-white"
                  >
                    <option value="">Bitte wählen…</option>
                    <option value="bachelor">Bachelor</option>
                    <option value="master">Master</option>
                  </select>
                ) : (
                  <p className="text-sm text-gray-800">
                    {profile.thesisType === "bachelor" ? "Bachelor" : profile.thesisType === "master" ? "Master" : <span className="text-gray-400 italic">Nicht angegeben</span>}
                  </p>
                )}
              </div>

              {/* Immatrikulationssemester */}
              {editMode ? (
                <FieldInput label="Immatrikulationssemester" value={form.enrollmentSemester} onChange={(v) => setForm((f) => ({ ...f, enrollmentSemester: v }))} placeholder="z.B. WiSe 2022/23" />
              ) : (
                <FieldView label="Immatrikulationssemester" value={profile.enrollmentSemester} />
              )}

              {/* Zielsemester */}
              {editMode ? (
                <FieldInput label="Zielsemester (Abschluss)" value={form.targetSemester} onChange={(v) => setForm((f) => ({ ...f, targetSemester: v }))} placeholder="z.B. SoSe 2025" />
              ) : (
                <FieldView label="Zielsemester (Abschluss)" value={(profile as any).targetSemester} />
              )}
            </div>
          </div>
        )}

        {/* ── Rollenspezifische Daten: Prüfer:innen ── */}
        {isExaminer && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <svg className="w-5 h-5" style={{ color: "#2563eb" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span style={{ color: "#2563eb" }}>Prüfer:innen-Informationen</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Akademischer Titel */}
              {editMode ? (
                <FieldInput label="Akademischer Titel" value={form.academicTitle} onChange={(v) => setForm((f) => ({ ...f, academicTitle: v }))} placeholder="z.B. Prof. Dr." />
              ) : (
                <FieldView label="Akademischer Titel" value={profile.academicTitle} />
              )}

              {/* Büro / Raum */}
              {editMode ? (
                <FieldInput label="Büro / Raum" value={form.officeRoom} onChange={(v) => setForm((f) => ({ ...f, officeRoom: v }))} placeholder="z.B. Gebäude C, Raum 307" />
              ) : (
                <FieldView label="Büro / Raum" value={profile.officeRoom} />
              )}
            </div>

            {/* Sprechzeiten */}
            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Sprechzeiten</label>
              {editMode ? (
                <>
                  <textarea
                    value={form.officeHours}
                    onChange={(e) => setForm((f) => ({ ...f, officeHours: e.target.value }))}
                    placeholder="z.B. Dienstag 10–12 Uhr, Donnerstag 14–16 Uhr (nach Vereinbarung)"
                    rows={3}
                    maxLength={500}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#76b900]/30 focus:border-[#76b900] transition-all resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">{form.officeHours.length}/500 Zeichen</p>
                </>
              ) : (
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {(profile as any).officeHours ?? <span className="text-gray-400 italic">Nicht angegeben</span>}
                </p>
              )}
            </div>

            {/* Forschungsgebiete / Tags */}
            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Forschungsgebiete / Schwerpunkte</label>
              {editMode ? (
                <>
                  <textarea
                    value={form.researchTags}
                    onChange={(e) => setForm((f) => ({ ...f, researchTags: e.target.value }))}
                    placeholder="z.B. Machine Learning, Softwareentwicklung, Wirtschaftsinformatik (kommagetrennt)"
                    rows={2}
                    maxLength={500}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#76b900]/30 focus:border-[#76b900] transition-all resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">{form.researchTags.length}/500 Zeichen</p>
                </>
              ) : (
                (profile as any).researchTags ? (
                  <div className="flex flex-wrap gap-1.5">
                    {((profile as any).researchTags as string).split(",").map((tag: string) => tag.trim()).filter(Boolean).map((tag: string, i: number) => (
                      <span key={i} className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #93c5fd" }}>{tag}</span>
                    ))}
                  </div>
                ) : <span className="text-sm text-gray-400 italic">Nicht angegeben</span>
              )}
            </div>

            {/* Hinweis auf erweitertes Prüfer-Profil */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-2">
              <svg className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-blue-700">
                Weitere Angaben wie Sprechzeiten, Forschungsschwerpunkte und Betreuungskapazitäten können Sie im Bereich <strong>Mein Profil</strong> innerhalb des Prüfer-Dashboards pflegen.
              </p>
            </div>
          </div>
        )}

        {/* ── Rollenspezifische Daten: Verwaltung ── */}
        {isAdmin && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <svg className="w-5 h-5" style={{ color: "#7c3aed" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span style={{ color: "#7c3aed" }}>Verwaltungs-Informationen</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Personalnummer */}
              {editMode ? (
                <FieldInput label="Personalnummer" value={form.staffId} onChange={(v) => setForm((f) => ({ ...f, staffId: v }))} placeholder="z.B. P-12345" />
              ) : (
                <FieldView label="Personalnummer" value={profile.staffId} />
              )}

              {/* Zuständigkeitsbereich */}
              {editMode ? (
                <FieldInput label="Zuständigkeitsbereich" value={form.responsibilityArea} onChange={(v) => setForm((f) => ({ ...f, responsibilityArea: v }))} placeholder="z.B. Prüfungsamt FB 3" />
              ) : (
                <FieldView label="Zuständigkeitsbereich" value={profile.responsibilityArea} />
              )}

              {/* Bürostandort */}
              {editMode ? (
                <FieldInput label="Bürostandort" value={form.officeLocation} onChange={(v) => setForm((f) => ({ ...f, officeLocation: v }))} placeholder="z.B. Gebäude A, Raum 101" />
              ) : (
                <FieldView label="Bürostandort" value={(profile as any).officeLocation} />
              )}
            </div>
          </div>
        )}

        {/* ── Konto-Informationen ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Konto-Informationen
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Rolle</label>
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border"
                style={{ color: roleConf.color, background: roleConf.bg, borderColor: roleConf.border }}
              >
                {roleConf.label}
              </span>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Status</label>
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium"
                style={{ color: statusConf.color, background: statusConf.bg }}
              >
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

        {/* ── Foto-Hinweis ── */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-blue-700">
            Klicken Sie auf das Kamera-Symbol am Profilfoto, um ein neues Bild hochzuladen. Erlaubte Formate: JPEG, PNG, WebP, GIF (max. 5 MB).
          </p>
        </div>

      </div>
    </div>
  );
}
