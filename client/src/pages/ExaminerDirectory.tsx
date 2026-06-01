import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useState } from "react";
import { Link } from "wouter";
import { WorkloadBadge } from "@/components/WorkloadBadge";
import { useLanguage } from "@/contexts/LanguageContext";

// ─── Examiner Card ────────────────────────────────────────────────────────────
type ExaminerListItem = {
  user: {
    id: number;
    name: string | null;
    email: string | null;
    role: string;
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
  programmes?: Array<{ id: number; name: string; abbreviation: string; level: string }>;
};

function ExaminerCard({ examiner }: { examiner: ExaminerListItem }) {
  const { t } = useLanguage();
  const D = t.directory;
  const profile = examiner.profile;
  const tags = Array.isArray(profile?.tags) ? profile.tags as string[] : [];
  const languages = Array.isArray(profile?.languages) ? profile.languages as string[] : [];
  const programmes = examiner.programmes ?? [];
  const isSecondExaminer = (profile as { isSecondExaminer?: number } | null | undefined)?.isSecondExaminer === 1;
  const activeSupervisions = (examiner as any).activeSupervisions as number | undefined;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {profile?.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt={examiner.user?.name ?? D.unknownName}
                className="w-14 h-14 rounded-xl object-cover"
              />
            ) : (
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold"
                style={{ backgroundColor: "#76B900" }}
              >
                {(examiner.user?.name ?? "?")[0]?.toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-gray-900 leading-tight">
                  {profile?.title ? `${profile.title} ` : ""}{examiner.user?.name ?? D.unknownName}
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

        {/* Bio */}
        {profile?.bio && (
          <p className="text-sm text-gray-600 mt-3 line-clamp-2">{profile.bio}</p>
        )}

        {/* Research Focus */}
        {profile?.researchFocus && (
          <p className="text-xs text-gray-500 mt-2 italic line-clamp-1">
            {D.researchFocusLabel} {profile.researchFocus}
          </p>
        )}
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="px-5 pb-3 flex flex-wrap gap-1.5">
          {tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: "#F1F8E9", color: "#4A7C00" }}
            >
              {tag}
            </span>
          ))}
          {tags.length > 4 && (
            <span className="px-2 py-0.5 rounded-full text-xs text-gray-400 bg-gray-50">
              +{tags.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Studiengänge */}
      {programmes.length > 0 && (
        <div className="px-5 pb-3 flex flex-wrap gap-1.5">
          {programmes.slice(0, 4).map((p) => (
            <span
              key={p.id}
              className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
              title={p.name}
            >
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

      {/* Footer */}
      <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between">
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

  const { data: examiners, isLoading } = trpc.examiner.list.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: programmes } = trpc.programmes.list.useQuery(undefined, {
    enabled: !!user,
  });

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
    const name = ex.user?.name ?? "";
    const dept = ex.profile?.department ?? "";
    const bio = ex.profile?.bio ?? "";
    const tags = Array.isArray(ex.profile?.tags) ? (ex.profile.tags as string[]).join(" ") : "";
    const searchLower = search.toLowerCase();

    const matchesSearch = !search ||
      name.toLowerCase().includes(searchLower) ||
      dept.toLowerCase().includes(searchLower) ||
      bio.toLowerCase().includes(searchLower) ||
      tags.toLowerCase().includes(searchLower);

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

    return matchesSearch && matchesProgramme && matchesCapacity && matchesRole;
  });

  const bachelorProgrammes = (programmes ?? []).filter((p) => p.level === "bachelor");
  const masterProgrammes = (programmes ?? []).filter((p) => p.level === "master");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <img
                src="/manus-storage/IconMaleMale_c7af7f10.webp"
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
        <div className="max-w-6xl mx-auto flex flex-wrap gap-3 items-center">
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
            <select
              value={filterProgramme}
              onChange={(e) => setFilterProgramme(e.target.value === "" ? "" : Number(e.target.value))}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
            >
              <option value="">{D.allProgrammesOpt}</option>
              <optgroup label="Bachelor">
                {bachelorProgrammes.map((p) => (
                  <option key={p.id} value={p.id}>{p.abbreviation} – {p.name}</option>
                ))}
              </optgroup>
              <optgroup label="Master">
                {masterProgrammes.map((p) => (
                  <option key={p.id} value={p.id}>{p.abbreviation} – {p.name}</option>
                ))}
              </optgroup>
            </select>
          )}

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

          {/* Result count */}
          <span className="text-sm text-gray-400 ml-auto">
            {filtered.length} {filtered.length !== 1 ? D.resultsPlural : D.results}
          </span>
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
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{D.noExaminers}</h3>
            <p className="text-sm text-gray-500">
              {search || filterProgramme || filterCapacity !== "all" || filterRole !== "all"
                ? D.noExaminersFiltered
                : D.noExaminersEmpty}
            </p>
            {(search || filterProgramme || filterCapacity !== "all") && (
              <button
                onClick={() => { setSearch(""); setFilterProgramme(""); setFilterCapacity("all"); setFilterRole("all"); }}
                className="mt-4 text-sm font-medium transition-opacity hover:opacity-80"
                style={{ color: "#76B900" }}
              >
                {D.resetFilters}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((ex) => (
              <ExaminerCard key={ex.user.id} examiner={ex as ExaminerListItem} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
