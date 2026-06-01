import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState, useRef } from "react";
import { Link, useParams } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { UserAvatar } from "@/components/UserAvatar";

function TagBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/5 text-primary border border-primary/15">
      {label}
    </span>
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
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              {E.cancelBtn}
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "#76B900" }}
            >
              {updateMutation.isPending ? E.savingBtn : E.saveBtn}
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
  const { user: currentUser } = useAuth();
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

  // getPublicProfile gibt ein flaches Objekt zurück (kein user/profile-Wrapper)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = data as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = data as any;
  const photoUrl = localPhotoUrl ?? (data as any).photoUrl;
  const tags = ((data as any).tags as string[] | null | undefined) ?? [];
  const languages = ((data as any).languages as string[] | null | undefined) ?? [];
  const studyPrograms = ((data as any).studyPrograms as string[] | null | undefined) ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#76B900" }}>
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <span className="text-sm font-bold text-gray-800">Thesis Match Maker</span>
          </Link>
          <div className="flex items-center gap-2">
            {currentUser ? (
              <Link
                href={currentUser.role === "student" ? "/student" : currentUser.role === "examiner" ? "/examiner" : "/admin"}
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

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Profil-Hero */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          {/* Banner */}
          <div className="h-28 relative" style={{ backgroundColor: "#76B900" }}>
            <div className="absolute inset-0 opacity-10">
              <svg viewBox="0 0 400 112" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
                <rect width="400" height="112" fill="url(#grid)" />
              </svg>
            </div>
          </div>

          {/* Profil-Info */}
          <div className="px-6 pb-6">
            <div className="flex items-end gap-4 -mt-12 mb-4">
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
                  <h1 className="text-xl font-bold text-gray-900">
                    {profile?.title ? `${profile.title} ` : ""}{user.name ?? E.unknownName}
                  </h1>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/5 text-primary border border-primary/15">
                    {E.examinerLabel}
                  </span>
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

            {/* Kapazitäts-Badge + Rolle-Badge */}
            {profile?.maxSupervisions !== undefined && (
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                {/* Erst-/Zweitprüfer:in-Badge */}
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
                  (profile as { isSecondExaminer?: number }).isSecondExaminer === 1
                    ? "bg-blue-50 border-blue-100"
                    : "bg-primary/5 border-primary/15"
                }`}>
                  <svg className={`w-4 h-4 ${
                    (profile as { isSecondExaminer?: number }).isSecondExaminer === 1 ? "text-blue-400" : "text-primary"
                  }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </svg>
                  <span className={`text-xs font-semibold ${
                    (profile as { isSecondExaminer?: number }).isSecondExaminer === 1 ? "text-blue-700" : "text-primary"
                  }`}>
                    {(profile as { isSecondExaminer?: number }).isSecondExaminer === 1 ? E.secondExaminerLabel : E.firstExaminerLabel}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-xs font-medium text-gray-600">
                    {E.supervisionCapacity.replace("{n}", String(profile.maxSupervisions))}
                  </span>
                </div>
                {profile.officeHours && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs font-medium text-gray-600">{profile.officeHours}</span>
                  </div>
                )}
              </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {tags.map((tag) => <TagBadge key={tag} label={tag} />)}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Linke Spalte: Kontakt + Details */}
          <div className="space-y-4">
            {/* Kontakt */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">{t.common.contact ?? "Kontakt"}</h3>
              <div className="space-y-2.5">
                {user.email && (
                  <a href={`mailto:${user.email}`} className="flex items-center gap-2.5 text-sm text-gray-600 hover:text-primary transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="truncate">{user.email}</span>
                  </a>
                )}
                {profile?.phone && (
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    {profile.phone}
                  </div>
                )}
                {profile?.websiteUrl && (
                  <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-sm text-gray-600 hover:text-primary transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                    <span className="truncate">Website</span>
                  </a>
                )}
              </div>
            </div>

            {/* Sprachen */}
            {languages.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">{E.supervisionLanguages}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {languages.map((lang) => (
                    <span key={lang} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg border border-blue-100">
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Studiengänge */}
            {studyPrograms.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">{E.programmes}</h3>
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

          {/* Rechte Spalte: Bio + Forschung */}
          <div className="md:col-span-2 space-y-4">
            {profile?.bio && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">{t.common.aboutMe ?? "Über mich"}</h3>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{profile.bio}</p>
              </div>
            )}

            {profile?.researchFocus && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">{E.researchFocusSection}</h3>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{profile.researchFocus}</p>
              </div>
            )}

            {/* Anfrage stellen CTA (nur für Studierende) */}
            {currentUser?.role === "student" && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">{E.supervisionRequest}</h3>
                <p className="text-sm text-gray-500 mb-4">
                  {E.supervisionRequestDesc.replace("{name}", `${profile?.title ? `${profile.title} ` : ""}${user.name}`)}
                </p>
                <Link
                  href="/student"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90"
                  style={{ backgroundColor: "#76B900" }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {E.submitRequest}
                </Link>
              </div>
            )}

            {!profile?.bio && !profile?.researchFocus && !isOwnProfile && (
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
