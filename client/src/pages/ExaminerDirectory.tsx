import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useState, useMemo } from "react";
import { buildFullName } from "@shared/const";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProgrammeSelect } from "@/components/ProgrammeSelect";
import { Link } from "wouter";
import { WorkloadBadge } from "@/components/WorkloadBadge";
import { useLanguage } from "@/contexts/LanguageContext";
import { UserAvatar } from "@/components/UserAvatar";
import { ProgrammeLogo } from "@/components/ProgrammeLogo";

// ─── Examiner Card ────────────────────────────────────────────────────────────
type ExaminerListItem = {
  user: {
    id: number;
    name: string | null;
    firstName?: string | null;
    lastName?: string | null;
    academicTitle?: string | null;
    email: string | null;
    role: string;
    isFictitiousExample?: number | null;
  };
  profile: {
    id: number;
    userId: number;
    title?: string | null;
    department?: string | null;
    bio?: string | null;
    tags?: unknown;
    languages?: unknown;
    studyPrograms?: unknown;
    maxSupervisions?: number | null;
    photoUrl?: string | null;
    photoKey?: string | null;
    researchFocus?: string | null;
    officeHours?: string | null;
    websiteUrl?: string | null;
  } | null;
  programmes?: Array<{ id: number; name: string; abbreviation: string; level: string; pictogramUrl?: string | null }>;
};

function ExaminerCard({ examiner, highlightTags, isFavorite, onToggleFavorite }: {
  examiner: ExaminerListItem;
  highlightTags?: string[];
  isFavorite?: boolean;
  onToggleFavorite?: (examinerId: number) => void;
}) {
  const { t } = useLanguage();
  const D = t.directory;
  const profile = examiner.profile;
  const tags = Array.isArray(profile?.tags) ? profile.tags as string[] : [];
  const languages = Array.isArray(profile?.languages) ? profile.languages as string[] : [];
  const programmes = examiner.programmes ?? [];
  const isSecondExaminer = (profile as { isSecondExaminer?: number } | null | undefined)?.isSecondExaminer === 1;
  const activeSupervisions = (examiner as any).activeSupervisions as number | undefined;
  const isFictitious = (examiner.user as any)?.isFictitiousExample === 1;
  const [expanded, setExpanded] = useState(false);

  const hasVitaContent = profile?.bio || profile?.researchFocus || (tags.length > 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-5 pb-4 flex-1">
        {isFictitious && (
          <div className="mb-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 w-fit">
            <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-medium text-amber-700">{D.fictitiousExample}</span>
          </div>
        )}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <UserAvatar
              name={buildFullName({ firstName: examiner.user?.firstName, lastName: examiner.user?.lastName, academicTitle: examiner.user?.academicTitle, name: examiner.user?.name })}
              email={examiner.user?.email}
              avatarUrl={profile?.photoUrl ?? (examiner.user as any)?.avatarUrl}
              size="xl"
              rounded="lg"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-gray-900 leading-tight">
                  {buildFullName({ firstName: examiner.user?.firstName, lastName: examiner.user?.lastName, academicTitle: examiner.user?.academicTitle ?? profile?.title, name: examiner.user?.name }) || D.unknownName}
                </h3>
                {profile?.department && (
                  <p className="text-sm text-gray-500 mt-0.5">{profile.department}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <WorkloadBadge
                  active={activeSupervisions}
                  max={profile?.maxSupervisions}
                  showCount
                />
                <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                  isSecondExaminer
                    ? "bg-blue-50 text-blue-600 border border-blue-100"
                    : "bg-gray-50 text-gray-500 border border-gray-100"
                }`}>
                  {isSecondExaminer ? D.roleSecond : D.roleFirst}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bio (immer sichtbar, 2 Zeilen) */}
        {profile?.bio && (
          <div className="text-sm text-gray-600 mt-3 line-clamp-2 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: profile.bio }} />
        )}

        {/* Tags (hervorgehoben wenn gefiltert) */}
        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.slice(0, 4).map((tag) => {
              const isHighlighted = highlightTags?.some(
                (h) => tag.toLowerCase().includes(h.toLowerCase())
              );
              return (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: isHighlighted ? "#76B900" : "#F1F8E9",
                    color: isHighlighted ? "#fff" : "#4A7C00",
                  }}
                >
                  {tag}
                </span>
              );
            })}
            {tags.length > 4 && (
              <span className="px-2 py-0.5 rounded-full text-xs text-gray-400 bg-gray-50">
                +{tags.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Studiengänge */}
        {programmes.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {programmes.slice(0, 4).map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
                title={p.name}
              >
                <ProgrammeLogo abbreviation={p.abbreviation} pictogramUrl={p.pictogramUrl} size="xs" />
                {p.abbreviation}
              </span>
            ))}
            {programmes.length > 4 && (
              <span className="px-2 py-0.5 rounded-full text-xs text-gray-400 bg-gray-50">
                +{programmes.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Aufklappbare Vita / Forschungsgebiete */}
      {hasVitaContent && (
        <div className="border-t border-gray-50">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-2.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Vita &amp; Forschungsgebiete
            </span>
            <svg
              className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expanded && (
            <div className="px-5 pb-4 space-y-3 bg-gray-50 border-t border-gray-100">
              {/* Vollständige Bio */}
              {profile?.bio && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 mt-3">Kurzbiografie</p>
                  <div className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: profile.bio }} />
                </div>
              )}

              {/* Forschungsgebiete */}
              {profile?.researchFocus && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Forschungsgebiete</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{profile.researchFocus}</p>
                </div>
              )}

              {/* Alle Tags */}
              {tags.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Themengebiete &amp; Schlagworte</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => {
                      const isHighlighted = highlightTags?.some(
                        (h) => tag.toLowerCase().includes(h.toLowerCase())
                      );
                      return (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: isHighlighted ? "#76B900" : "#F1F8E9",
                            color: isHighlighted ? "#fff" : "#4A7C00",
                          }}
                        >
                          {tag}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sprechstunde */}
              {profile?.officeHours && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Sprechstunde</p>
                  <p className="text-sm text-gray-700">{profile.officeHours}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between">
        {/* Favoriten-Button */}
        {onToggleFavorite && (
          <button
            onClick={(e) => { e.preventDefault(); onToggleFavorite(examiner.user.id); }}
            title={isFavorite ? "Aus Merkliste entfernen" : "Zur Merkliste hinzufügen"}
            className="mr-2 p-1.5 rounded-full transition-colors hover:bg-gray-100"
          >
            <svg
              className="w-5 h-5 transition-colors"
              fill={isFavorite ? "#ef4444" : "none"}
              stroke={isFavorite ? "#ef4444" : "#9ca3af"}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        )}
        {/* original footer left side starts here */}
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {languages.length > 0 && (
            <span>{(languages as string[]).join(" · ")}</span>
          )}
          {profile?.websiteUrl && (
            <a
              href={profile.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-600 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {D.website} ↗
            </a>
          )}
        </div>
        <Link
          href={`/examiner/profile/${examiner.user.id}`}
          className="text-xs font-semibold transition-opacity hover:opacity-80"
          style={{ color: "#76B900" }}
        >
          {D.viewProfile}
        </Link>
      </div>
    </div>
  );
}

// ─── Login Gate ───────────────────────────────────────────────────────────────
function LoginGate() {
  const { t } = useLanguage();
  const D = t.directory;
  const loginUrl = getLoginUrl();
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 max-w-md w-full text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ backgroundColor: "#76B900" }}
        >
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{D.loginRequired}</h2>
        <p className="text-sm text-gray-500 mb-6">{D.loginRequiredDesc}</p>
        <a
          href={loginUrl}
          className="inline-block w-full py-3 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#76B900" }}
        >
          {D.loginBtn}
        </a>
        <Link href="/" className="block mt-4 text-sm text-gray-400 hover:text-gray-600 transition-colors">
          {D.backHome}
        </Link>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ExaminerDirectory() {
  const { t } = useLanguage();
  const D = t.directory;
  const { user, loading: authLoading } = useAuth();
  const [search, setSearch] = useState("");
  const [filterProgramme, setFilterProgramme] = useState<number | "">("");
  const [filterCapacity, setFilterCapacity] = useState<"all" | "available" | "partial">("all");
  const [filterRole, setFilterRole] = useState<"all" | "first" | "second">("all");
  const [filterTag, setFilterTag] = useState<string>("");
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "capacity_asc" | "capacity_desc">("name");

  const { data: examiners, isLoading } = trpc.examiner.list.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: programmes } = trpc.programmes.list.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: allTags } = trpc.examiner.allTags.useQuery(undefined, {
    enabled: !!user,
  });

  const isStudent = user?.role === "student";
  const { data: favoriteIds, refetch: refetchFavorites } = trpc.favorites.myIds.useQuery(undefined, {
    enabled: !!user && isStudent,
  });
  const toggleFavMutation = trpc.favorites.toggle.useMutation({
    onSuccess: () => { refetchFavorites(); },
  });
  const handleToggleFavorite = (examinerId: number) => {
    toggleFavMutation.mutate({ examinerId });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#76B900] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginGate />;
  }

  const filtered = (examiners ?? []).filter((ex) => {
    const name = buildFullName({ firstName: ex.user?.firstName, lastName: ex.user?.lastName, academicTitle: ex.user?.academicTitle, name: ex.user?.name });
    const dept = ex.profile?.department ?? "";
    const bio = ex.profile?.bio ?? "";
    const researchFocus = ex.profile?.researchFocus ?? "";
    const tags = Array.isArray(ex.profile?.tags) ? (ex.profile.tags as string[]).join(" ") : "";
    const searchLower = search.toLowerCase();

    const matchesSearch = !search ||
      name.toLowerCase().includes(searchLower) ||
      dept.toLowerCase().includes(searchLower) ||
      bio.toLowerCase().includes(searchLower) ||
      tags.toLowerCase().includes(searchLower) ||
      researchFocus.toLowerCase().includes(searchLower);

    const matchesProgramme = !filterProgramme ||
      (ex as ExaminerListItem).programmes?.some((p) => p.id === filterProgramme);

    const maxSup = ex.profile?.maxSupervisions ?? 0;
    const activeSup = (ex as any).activeSupervisions as number ?? 0;
    const ratio = maxSup > 0 ? activeSup / maxSup : null;
    const matchesCapacity =
      filterCapacity === "all" ||
      (filterCapacity === "available" && ratio !== null && ratio < 0.8) ||
      (filterCapacity === "partial" && ratio !== null && ratio >= 0.5 && ratio < 0.8);

    const isSecond = (ex.profile as { isSecondExaminer?: number } | null)?.isSecondExaminer === 1;
    const matchesRole =
      filterRole === "all" ||
      (filterRole === "first" && !isSecond) ||
      (filterRole === "second" && isSecond);

    const matchesTag = !filterTag ||
      (Array.isArray(ex.profile?.tags) &&
        (ex.profile.tags as string[]).some((tag) =>
          tag.toLowerCase().includes(filterTag.toLowerCase())
        )) ||
      (ex.profile?.researchFocus ?? "").toLowerCase().includes(filterTag.toLowerCase());

    return matchesSearch && matchesProgramme && matchesCapacity && matchesRole && matchesTag;
  });

  const hasActiveFilters = search || filterProgramme || filterCapacity !== "all" || filterRole !== "all" || filterTag;

  // Sortierung
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === "name") {
        const na = buildFullName({ firstName: a.user?.firstName, lastName: a.user?.lastName, academicTitle: a.user?.academicTitle, name: a.user?.name });
        const nb = buildFullName({ firstName: b.user?.firstName, lastName: b.user?.lastName, academicTitle: b.user?.academicTitle, name: b.user?.name });
        return na.localeCompare(nb, "de");
      }
      // Kapazität: freie Slots = max - aktiv
      const freeA = (a.profile?.maxSupervisions ?? 0) - ((a as any).activeSupervisions as number ?? 0);
      const freeB = (b.profile?.maxSupervisions ?? 0) - ((b as any).activeSupervisions as number ?? 0);
      return sortBy === "capacity_asc" ? freeA - freeB : freeB - freeA;
    });
  }, [filtered, sortBy]);

  // Tags für Dropdown filtern (Suche im Tag-Dropdown)
  const [tagSearch, setTagSearch] = useState("");
  const filteredTagOptions = useMemo(() =>
    (allTags ?? []).filter((t) => !tagSearch || t.toLowerCase().includes(tagSearch.toLowerCase())),
    [allTags, tagSearch]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <img
                src="/manus-storage/logo-icon_b7dba00c.webp"
                alt="HTW Berlin Thesis Match Maker"
                className="w-8 h-8 rounded-lg object-contain"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = "none";
                  const fb = document.createElement("div");
                  fb.className = "w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm";
                  fb.style.backgroundColor = "#76B900";
                  fb.textContent = "H";
                  target.parentNode?.insertBefore(fb, target);
                }}
              />
              <span className="font-semibold text-gray-900 hidden sm:block">HTW Berlin Thesis Match Maker</span>
            </Link>
            <span className="text-gray-300">|</span>
            <h1 className="text-sm font-semibold text-gray-700">{D.directoryTitle}</h1>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            {D.back}
          </Link>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="text-white py-10 px-4" style={{ backgroundColor: "#76B900" }}>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-1">{D.directoryTitle}</h2>
          <p className="text-white/80 text-sm">{D.directorySubtitle}</p>
          <p className="text-white/60 text-xs mt-1">
            {examiners?.length ?? 0} {D.registered}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-100 py-4 px-4">
        <div className="max-w-6xl mx-auto space-y-3">
          {/* Zeile 1: Freitextsuche + Studiengang */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={D.searchPlaceholder}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            {/* Studiengang Filter */}
            {(programmes ?? []).length > 0 && (
              <ProgrammeSelect
                options={(programmes ?? []).map((p) => ({
                  id: p.id,
                  name: p.name,
                  abbreviation: p.abbreviation ?? p.name.slice(0, 4),
                  level: p.level,
                  pictogramUrl: (p as any).pictogramUrl,
                }))}
                value={filterProgramme}
                onChange={(id) => setFilterProgramme(id)}
                placeholder={D.allProgrammesOpt}
                grouped
                className="w-56"
              />
            )}

            {/* Tag / Forschungsgebiet Filter */}
            <div className="relative">
              <button
                onClick={() => setShowTagDropdown((v) => !v)}
                className={`flex items-center gap-2 px-3 py-2.5 border rounded-xl text-sm transition-all ${
                  filterTag
                    ? "border-[#76B900] bg-[#F1F8E9] text-[#4A7C00] font-medium"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span className="max-w-[120px] truncate">
                  {filterTag || "Themengebiet / Schlagwort"}
                </span>
                {filterTag ? (
                  <span
                    className="ml-1 text-[#76B900] hover:text-red-500 font-bold"
                    onClick={(e) => { e.stopPropagation(); setFilterTag(""); }}
                  >×</span>
                ) : (
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>

              {showTagDropdown && (
                <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-xl border border-gray-200 shadow-lg z-20">
                  <div className="p-2 border-b border-gray-100">
                    <input
                      type="text"
                      value={tagSearch}
                      onChange={(e) => setTagSearch(e.target.value)}
                      placeholder="Schlagwort suchen…"
                      className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#76B900]"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-52 overflow-y-auto py-1">
                    <button
                      onClick={() => { setFilterTag(""); setShowTagDropdown(false); setTagSearch(""); }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
                    >
                      Alle Themengebiete
                    </button>
                    {filteredTagOptions.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-gray-400">Keine Schlagworte gefunden</p>
                    ) : (
                      filteredTagOptions.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => { setFilterTag(tag); setShowTagDropdown(false); setTagSearch(""); }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                            filterTag === tag ? "font-semibold text-[#4A7C00]" : "text-gray-700"
                          }`}
                        >
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: "#76B900" }}
                          />
                          {tag}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Zeile 2: Rolle + Kapazität + Ergebniszahl */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Rollenfilter */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              {(["all", "first", "second"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setFilterRole(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filterRole === r
                      ? r === "second" ? "bg-blue-600 text-white shadow" : "bg-primary text-white shadow"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {r === "all" ? D.roleAll : r === "first" ? D.roleFirst : D.roleSecond}
                </button>
              ))}
            </div>

            {/* Kapazitäts-Filter */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              {([
                { value: "all" as const, label: D.allCapacities },
                { value: "available" as const, label: D.freeCapacity },
                { value: "partial" as const, label: D.partialCapacity },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilterCapacity(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    filterCapacity === opt.value
                      ? opt.value === "available"
                        ? "bg-primary text-white shadow"
                        : opt.value === "partial"
                          ? "bg-amber-500 text-white shadow"
                          : "bg-white text-gray-800 shadow"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {(opt.value === "available" || opt.value === "partial") && (
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1.5 align-middle" />
                  )}
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Sortierung */}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="h-8 text-xs border-gray-200 rounded-xl w-44">
                <svg className="w-3.5 h-3.5 text-gray-400 mr-1.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
                <SelectValue placeholder="Sortieren nach" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name (A–Z)</SelectItem>
                <SelectItem value="capacity_desc">Kapazität (meiste frei)</SelectItem>
                <SelectItem value="capacity_asc">Kapazität (wenigste frei)</SelectItem>
              </SelectContent>
            </Select>

            {/* Result count + Reset */}
            <div className="ml-auto flex items-center gap-3">
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setSearch(""); setFilterProgramme(""); setFilterCapacity("all");
                    setFilterRole("all"); setFilterTag("");
                  }}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Filter zurücksetzen
                </button>
              )}
              <span className="text-sm text-gray-400">
                {filtered.length} {filtered.length !== 1 ? D.resultsPlural : D.results}
              </span>
            </div>
          </div>

          {/* Aktive Filter-Chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2">
              {search && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                  Suche: „{search}"
                  <button onClick={() => setSearch("")} className="hover:text-red-500 ml-0.5">×</button>
                </span>
              )}
              {filterTag && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-[#F1F8E9] text-[#4A7C00]">
                  Thema: {filterTag}
                  <button onClick={() => setFilterTag("")} className="hover:text-red-500 ml-0.5">×</button>
                </span>
              )}
              {filterProgramme && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-blue-50 text-blue-700">
                  Studiengang: {(programmes ?? []).find((p) => p.id === filterProgramme)?.abbreviation ?? filterProgramme}
                  <button onClick={() => setFilterProgramme("")} className="hover:text-red-500 ml-0.5">×</button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-56 bg-white rounded-2xl animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{D.noExaminers}</h3>
            <p className="text-sm text-gray-500">
              {hasActiveFilters ? D.noExaminersFiltered : D.noExaminersEmpty}
            </p>
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setSearch(""); setFilterProgramme(""); setFilterCapacity("all");
                  setFilterRole("all"); setFilterTag("");
                }}
                className="mt-4 text-sm font-medium transition-opacity hover:opacity-80"
                style={{ color: "#76B900" }}
              >
                {D.resetFilters}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {sorted.map((ex) => (
              <ExaminerCard
                key={ex.user.id}
                examiner={ex as ExaminerListItem}
                highlightTags={filterTag ? [filterTag] : search ? [search] : undefined}
                isFavorite={isStudent ? (favoriteIds ?? []).includes(ex.user.id) : undefined}
                onToggleFavorite={isStudent ? handleToggleFavorite : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dropdown schließen bei Klick außerhalb */}
      {showTagDropdown && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowTagDropdown(false)}
        />
      )}
    </div>
  );
}
