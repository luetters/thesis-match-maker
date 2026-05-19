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

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────
export default function Profile() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading, refetch } = trpc.profile.get.useQuery();

  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: "", bio: "", phone: "", department: "" });
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
    });
    setEditMode(true);
  };

  const handleSave = () => {
    updateMutation.mutate({
      name: form.name || undefined,
      bio: form.bio || undefined,
      phone: form.phone || undefined,
      department: form.department || undefined,
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Datei zu groß – bitte max. 5 MB.");
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      toast.error("Ungültiges Format – erlaubt sind JPEG, PNG, WebP und GIF.");
      return;
    }
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

  // Zurück-Link je nach Rolle
  const backLink = profile.role === "student" ? "/student"
    : profile.role === "examiner" ? "/examiner"
    : profile.role === "admin" || profile.role === "superadmin" ? "/admin"
    : "/";

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
          {/* Farbiger Banner */}
          <div className="h-24 w-full" style={{ background: `linear-gradient(135deg, ${roleConf.color}22, ${roleConf.color}44)` }} />

          <div className="px-6 pb-6">
            {/* Avatar */}
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
                {/* Upload-Button */}
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

            {/* Rollen-Badges */}
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
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Vollständiger Name</label>
              {editMode ? (
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Vor- und Nachname"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#76b900]/30 focus:border-[#76b900] transition-all"
                />
              ) : (
                <p className="text-sm text-gray-800">{profile.name ?? <span className="text-gray-400 italic">Nicht angegeben</span>}</p>
              )}
            </div>

            {/* E-Mail (nicht editierbar) */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">E-Mail-Adresse</label>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-800">{profile.email ?? "—"}</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Nicht änderbar</span>
              </div>
            </div>

            {/* Telefon */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Telefonnummer</label>
              {editMode ? (
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+49 30 12345678"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#76b900]/30 focus:border-[#76b900] transition-all"
                />
              ) : (
                <p className="text-sm text-gray-800">{profile.phone ?? <span className="text-gray-400 italic">Nicht angegeben</span>}</p>
              )}
            </div>

            {/* Fachbereich */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Fachbereich / Institut</label>
              {editMode ? (
                <input
                  type="text"
                  value={form.department}
                  onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                  placeholder="z.B. Fachbereich 3 – Wirtschaft"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#76b900]/30 focus:border-[#76b900] transition-all"
                />
              ) : (
                <p className="text-sm text-gray-800">{profile.department ?? <span className="text-gray-400 italic">Nicht angegeben</span>}</p>
              )}
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Über mich</label>
              {editMode ? (
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  placeholder="Kurze Beschreibung Ihrer Person, Interessen oder Schwerpunkte…"
                  rows={4}
                  maxLength={1000}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#76b900]/30 focus:border-[#76b900] transition-all resize-none"
                />
              ) : (
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {profile.bio ?? <span className="text-gray-400 italic">Keine Beschreibung angegeben</span>}
                </p>
              )}
              {editMode && (
                <p className="text-xs text-gray-400 mt-1 text-right">{form.bio.length}/1000 Zeichen</p>
              )}
            </div>
          </div>
        </div>

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
