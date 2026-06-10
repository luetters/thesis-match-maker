import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { UserAvatar } from "@/components/UserAvatar";
import { buildFullName } from "@shared/const";

// ─── Konstanten ───────────────────────────────────────────────────────────────
const ROLE_CONFIG: Record<string, { label: string; labelEn: string; color: string; bg: string; border: string }> = {
  student:         { label: "Studierende:r",             labelEn: "Student",          color: "#16a34a", bg: "#f0fdf4", border: "#86efac" },
  examiner:        { label: "Prüfer:in",                 labelEn: "Examiner",         color: "#2563eb", bg: "#eff6ff", border: "#93c5fd" },
  second_examiner: { label: "Zweitprüfer:in",            labelEn: "Second Examiner",  color: "#0891b2", bg: "#ecfeff", border: "#67e8f9" },
  admin:           { label: "Verwaltungsmitarbeiter:in", labelEn: "Administration",   color: "#7c3aed", bg: "#faf5ff", border: "#c4b5fd" },
  superadmin:      { label: "Superadmin",                labelEn: "Superadmin",       color: "#dc2626", bg: "#fef2f2", border: "#fca5a5" },
  pav:             { label: "PAV",                       labelEn: "PAV",              color: "#d97706", bg: "#fffbeb", border: "#fcd34d" },
  dean:            { label: "Dekan:in",                  labelEn: "Dean",             color: "#0891b2", bg: "#ecfeff", border: "#67e8f9" },
};

const DEPARTMENTS: Record<string, string> = {
  FB1: "FB 1 – Ingenieurwissenschaften I",
  FB2: "FB 2 – Ingenieurwissenschaften II",
  FB3: "FB 3 – Wirtschafts- und Rechtswissenschaften",
  FB4: "FB 4 – Informatik, Kommunikation und Wirtschaft",
  FB5: "FB 5 – Gestaltung und Kultur",
};

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "??";
}

// ─── Link-Karte ───────────────────────────────────────────────────────────────
function LinkCard({
  href, label, iconBg, iconColor, iconContent, hoverBorder, hoverBg, textColor,
}: {
  href: string; label: string; iconBg: string; iconColor?: string;
  iconContent: React.ReactNode; hoverBorder: string; hoverBg: string; textColor: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 transition-all group ${hoverBorder} ${hoverBg}`}
    >
      <span className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: iconBg, color: iconColor }}>
        {iconContent}
      </span>
      <span className={`text-sm font-medium group-hover:underline truncate ${textColor}`}>{label}</span>
      <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────
export default function PublicProfile() {
  const params = useParams<{ userId: string }>();
  const userId = parseInt(params.userId ?? "0", 10);
  const { lang } = useLanguage();
  const isDE = lang === "de";

  const { data: profile, isLoading, error } = trpc.examiner.getPublicProfile.useQuery(
    { userId },
    { enabled: !isNaN(userId) && userId > 0, retry: false }
  );

  if (isNaN(userId) || userId <= 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{isDE ? "Ungültige Profil-ID." : "Invalid profile ID."}</p>
          <Link href="/" className="text-[#76b900] hover:underline text-sm">{isDE ? "Zur Startseite" : "Back to Home"}</Link>
        </div>
      </div>
    );
  }

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <svg className="w-8 h-8 animate-spin text-[#76b900]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm text-gray-500">{isDE ? "Profil wird geladen…" : "Loading profile…"}</span>
      </div>
    </div>
  );

  if (error || !profile) {
    const isForbidden = error?.data?.code === "FORBIDDEN" || error?.data?.code === "UNAUTHORIZED";
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isForbidden
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />}
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            {isForbidden
              ? (isDE ? "Zugriff nicht erlaubt" : "Access Denied")
              : (isDE ? "Profil nicht gefunden" : "Profile Not Found")}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {isForbidden
              ? (isDE ? "Sie haben keine Berechtigung, dieses Profil einzusehen." : "You do not have permission to view this profile.")
              : (isDE ? "Das angeforderte Profil existiert nicht." : "The requested profile does not exist.")}
          </p>
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#76b900] hover:underline">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            {isDE ? "Zur Startseite" : "Back to Home"}
          </Link>
        </div>
      </div>
    );
  }

  const roleConf = ROLE_CONFIG[profile.role] ?? { label: profile.role, labelEn: profile.role, color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" };
  const roleLabel = isDE ? roleConf.label : roleConf.labelEn;
  const avatarSrc = profile.photoUrl ?? profile.avatarUrl;
  const isExaminer = profile.role === "examiner" || profile.role === "second_examiner";
  const departmentLabel = profile.department ? (DEPARTMENTS[profile.department] ?? profile.department) : null;
  const researchTagList = profile.researchTags ? profile.researchTags.split(",").map((t) => t.trim()).filter(Boolean) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            {isDE ? "Zurück" : "Back"}
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wide" style={{ color: "#1a5490" }}>HTW Berlin</span>
            <span className="text-xs text-gray-400">|</span>
            <span className="text-xs text-gray-500">{isDE ? "Thesis Match Maker" : "Thesis Match Maker"}</span>
          </div>
        </div>
      </div>

      {/* ── Inhalt ── */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* ── Profilkarte ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Hintergrund-Banner */}
          <div className="h-28 w-full" style={{ background: `linear-gradient(135deg, ${roleConf.color}18, ${roleConf.color}38)` }} />

          <div className="px-6 pb-6">
            <div className="flex items-end gap-4 -mt-14 mb-4">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-2xl border-4 border-white shadow-md overflow-hidden flex-shrink-0">
                <UserAvatar name={buildFullName({ firstName: (profile as any).firstName, lastName: (profile as any).lastName, academicTitle: profile.academicTitle, name: profile.name })} email={profile.email} avatarUrl={avatarSrc} size="xl" className="w-full h-full rounded-2xl" />
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <h1 className="text-xl font-bold text-gray-900 truncate">{buildFullName({ firstName: (profile as any).firstName, lastName: (profile as any).lastName, academicTitle: profile.academicTitle, name: profile.name }) || (isDE ? "Unbekannt" : "Unknown")}</h1>
              </div>
            </div>

            {/* Rolle & Fachbereich */}
            <div className="flex flex-wrap gap-2 mb-5">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border"
                style={{ color: roleConf.color, background: roleConf.bg, borderColor: roleConf.border }}
              >
                {roleLabel}
              </span>
              {departmentLabel && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 border border-gray-200">
                  {departmentLabel}
                </span>
              )}
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
            )}
          </div>
        </div>

        {/* ── Prüfer:in-spezifische Infos ── */}
        {isExaminer && (profile.officeHours || profile.researchFocus || researchTagList.length > 0) && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5" style={{ color: "#2563eb" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span style={{ color: "#2563eb" }}>{isDE ? "Prüfer:in-Informationen" : "Examiner Information"}</span>
            </h2>

            {profile.officeHours && (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  {isDE ? "Sprechstunden" : "Office Hours"}
                </label>
                <p className="text-sm text-gray-800">{profile.officeHours}</p>
              </div>
            )}

            {profile.researchFocus && (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  {isDE ? "Forschungsschwerpunkte" : "Research Focus"}
                </label>
                <p className="text-sm text-gray-800">{profile.researchFocus}</p>
              </div>
            )}

            {researchTagList.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  {isDE ? "Forschungsgebiete" : "Research Areas"}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {researchTagList.map((tag, i) => (
                    <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #93c5fd" }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Kontakt & Links ── */}
        {(profile.email || profile.phone || profile.website || profile.linkedIn || profile.researchGate || profile.htwProfileUrl || profile.miscLink || profile.bookingUrl || profile.websiteUrl) && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              {isDE ? "Kontakt & Links" : "Contact & Links"}
            </h2>
            <div className="space-y-3">
              {profile.email && (
                <LinkCard
                  href={`mailto:${profile.email}`}
                  label={profile.email}
                  iconBg="#f3f4f6" iconColor="#374151"
                  hoverBorder="hover:border-gray-400" hoverBg="hover:bg-gray-50" textColor="text-gray-700"
                  iconContent={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                />
              )}
              {profile.phone && (
                <LinkCard
                  href={`tel:${profile.phone}`}
                  label={profile.phone}
                  iconBg="#f0fdf4" iconColor="#16a34a"
                  hoverBorder="hover:border-[#16a34a]" hoverBg="hover:bg-[#f0fdf4]" textColor="text-gray-700"
                  iconContent={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
                />
              )}
              {(profile.bookingUrl) && (
                <LinkCard
                  href={profile.bookingUrl}
                  label={isDE ? "Termin buchen" : "Book Appointment"}
                  iconBg="#faf5ff" iconColor="#7c3aed"
                  hoverBorder="hover:border-[#7c3aed]" hoverBg="hover:bg-[#faf5ff]" textColor="text-[#7c3aed]"
                  iconContent={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                />
              )}
              {(profile.website || profile.websiteUrl) && (
                <LinkCard
                  href={(profile.website ?? profile.websiteUrl)!}
                  label={(profile.website ?? profile.websiteUrl)!.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  iconBg="#f0fdf4" iconColor="#76b900"
                  hoverBorder="hover:border-[#76b900]" hoverBg="hover:bg-[#f6ffe0]" textColor="text-[#76b900]"
                  iconContent={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" /></svg>}
                />
              )}
              {profile.htwProfileUrl && (
                <LinkCard
                  href={profile.htwProfileUrl}
                  label="HTW Berlin"
                  iconBg="#1a5490"
                  hoverBorder="hover:border-[#1a5490]" hoverBg="hover:bg-[#f0f4f8]" textColor="text-[#1a5490]"
                  iconContent={<span className="text-white font-bold text-xs">HTW</span>}
                />
              )}
              {profile.linkedIn && (
                <LinkCard
                  href={profile.linkedIn}
                  label={profile.linkedIn.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "").replace(/\/$/, "") || "LinkedIn"}
                  iconBg="#0a66c2"
                  hoverBorder="hover:border-[#0a66c2]" hoverBg="hover:bg-[#eff6ff]" textColor="text-[#0a66c2]"
                  iconContent={<svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>}
                />
              )}
              {profile.researchGate && (
                <LinkCard
                  href={profile.researchGate}
                  label={profile.researchGate.replace(/^https?:\/\/(www\.)?researchgate\.net\/profile\//, "").replace(/\/$/, "") || "ResearchGate"}
                  iconBg="#00d0af"
                  hoverBorder="hover:border-[#00d0af]" hoverBg="hover:bg-[#ecfdf5]" textColor="text-[#00a896]"
                  iconContent={<span className="text-white font-bold text-xs">RG</span>}
                />
              )}
              {profile.miscLink && (
                <LinkCard
                  href={profile.miscLink}
                  label={profile.miscLink.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  iconBg="#f3f4f6" iconColor="#6b7280"
                  hoverBorder="hover:border-gray-400" hoverBg="hover:bg-gray-50" textColor="text-gray-700"
                  iconContent={<svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>}
                />
              )}
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="text-center pb-4">
          <p className="text-xs text-gray-400">
            {isDE ? "HTW Berlin – Thesis Match Maker" : "HTW Berlin – Thesis Match Maker"}
          </p>
        </div>
      </div>
    </div>
  );
}
