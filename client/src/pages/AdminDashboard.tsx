import { StatusBadge, ThesisDashboardLayout } from "@/components/ThesisDashboardLayout";
import { AdminAssignExaminersModal } from "@/components/AdminAssignExaminersModal";
import { InvolvedPersonsTable, type PersonRow } from "@/components/InvolvedPersonsTable";
import RoleApprovalTab from "@/components/RoleApprovalTab";
import { EmailTemplatesTab } from "./EmailTemplatesTab";
import { trpc } from "@/lib/trpc";
import { UserAvatar } from "@/components/UserAvatar";
import { useState, useEffect, useRef, useMemo } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { buildFullName, getStatusBadge, getRoleBadge } from "@shared/const";
import { getProgrammeFilterValue, matchesAdminRequestFilters, type SecondExaminerFilter } from "@shared/adminRequestFilters";

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icons = {
  home: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  list: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
  log: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  users: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
};

const IconSettings = <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const IconStats = <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const IconCalendar = <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;

function useNavItems(pendingCount = 0) {
  const { t } = useLanguage();
  return [
    { href: "/admin/role-approvals", label: `Freischaltungen${pendingCount > 0 ? ` (${pendingCount})` : ""}`, icon: Icons.users },
    { href: "/admin", label: t.admin.overview, icon: Icons.home },
    { href: "/admin/requests", label: t.admin.requests, icon: Icons.list },
    { href: "/admin/audit", label: t.admin.audit, icon: Icons.log },
    { href: "/admin/users", label: t.admin.users, icon: Icons.users },
    { href: "/admin/settings", label: t.admin.settings, icon: IconSettings },
    { href: "/admin/stats", label: t.admin.stats, icon: IconStats },
    { href: "/admin/colloquiums", label: t.admin.colloquiums, icon: IconCalendar },
    { href: "/admin/email-templates", label: "E-Mail-Vorlagen", icon: Icons.list },
    { href: "/admin/login-attempts", label: "Login-Protokoll", icon: Icons.log },
  ];
}

// ─── Assign Examiner Modal ────────────────────────────────────────────────────
function AssignExaminerModal({
  thesisId,
  thesisTitle,
  onClose,
}: {
  thesisId: number;
  thesisTitle: string;
  onClose: () => void;
}) {
  const { data: examiners } = trpc.examiner.list.useQuery();
  const [selectedExaminer, setSelectedExaminer] = useState<number | null>(null);
  const [slot, setSlot] = useState<"first" | "second">("first");
  const utils = trpc.useUtils();

  const assignMutation = trpc.thesis.assignExaminer.useMutation({
    onSuccess: () => {
      toast.success("Prüfer:in erfolgreich zugewiesen!");
      utils.thesis.all.invalidate();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-gray-900 mb-1">Prüfer:in zuweisen</h3>
        <p className="text-sm text-gray-500 mb-5 truncate">{thesisTitle}</p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Slot</label>
          <div className="grid grid-cols-2 gap-2">
            {(["first", "second"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSlot(s)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                  slot === s ? "border-transparent text-white" : "border-gray-200 text-gray-600"
                }`}
                style={slot === s ? { backgroundColor: "#76B900" } : undefined}
              >
                {s === "first" ? "Erstprüfer:in" : "Zweitprüfer:in"}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Prüfer:in auswählen</label>
          <div className="max-h-48 overflow-y-auto space-y-2 border border-gray-200 rounded-xl p-2">
            {examiners?.map(({ user, profile }) => (
              <button
                key={user.id}
                onClick={() => setSelectedExaminer(user.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                  selectedExaminer === user.id ? "text-white" : "hover:bg-gray-50"
                }`}
                style={selectedExaminer === user.id ? { backgroundColor: "#76B900" } : undefined}
              >
                <UserAvatar name={buildFullName({ firstName: (user as any).firstName, lastName: (user as any).lastName, academicTitle: (user as any).academicTitle ?? profile?.title, name: user.name })} email={user.email} avatarUrl={user.avatarUrl} size="md" />
                <div className="min-w-0">
                  <div className={`text-sm font-medium truncate ${selectedExaminer === user.id ? "text-white" : "text-gray-900"}`}>
                    {buildFullName({ firstName: (user as any).firstName, lastName: (user as any).lastName, academicTitle: (user as any).academicTitle ?? profile?.title, name: user.name })}
                  </div>
                  {profile?.department && (
                    <div className={`text-xs truncate ${selectedExaminer === user.id ? "text-white/70" : "text-gray-500"}`}>
                      {profile.department}
                    </div>
                  )}
                </div>
              </button>
            ))}
            {!examiners?.length && (
              <p className="text-sm text-gray-500 text-center py-4">Keine Prüfer:innen gefunden.</p>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              if (!selectedExaminer) { toast.error("Bitte Prüfer:in auswählen"); return; }
              assignMutation.mutate({ thesisId, examinerId: selectedExaminer, slot });
            }}
            disabled={assignMutation.isPending || !selectedExaminer}
            className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#76B900" }}
          >
            {assignMutation.isPending ? "Wird zugewiesen..." : "Zuweisen"}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-colors">
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Deadline Modal ──────────────────────────────────────────────────────────
function DeadlineModal({
  thesisId, thesisTitle, currentDeadline, onClose,
}: { thesisId: number; thesisTitle: string; currentDeadline?: Date | string | null; onClose: () => void; }) {
  const utils = trpc.useUtils();
  const [dateValue, setDateValue] = useState(
    currentDeadline ? new Date(currentDeadline).toISOString().split("T")[0] : ""
  );
  const setDeadlineMutation = trpc.admin.setDeadline.useMutation({
    onSuccess: () => { toast.success("Deadline gespeichert!"); utils.thesis.all.invalidate(); onClose(); },
    onError: (err) => toast.error(err.message),
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-gray-900 mb-1">Deadline setzen</h3>
        <p className="text-sm text-gray-500 mb-5 truncate">{thesisTitle}</p>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Abgabedatum</label>
        <input type="date" value={dateValue} onChange={(e) => setDateValue(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none mb-5" />
        <div className="flex gap-3">
          <button onClick={() => setDeadlineMutation.mutate({ thesisId, deadline: dateValue || null })}
            disabled={setDeadlineMutation.isPending}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: "#76B900" }}>
            {setDeadlineMutation.isPending ? "Speichern..." : "Deadline speichern"}
          </button>
          {currentDeadline && (
            <button onClick={() => setDeadlineMutation.mutate({ thesisId, deadline: null })}
              disabled={setDeadlineMutation.isPending}
              className="px-4 py-2.5 rounded-xl text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50">
              Entfernen
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">Abbrechen</button>
        </div>
      </div>
    </div>
  );
}
// ─── All Requests ─────────────────────────────────────────────────────────────
type AdminSortKey = "name" | "programme" | "semester" | "title" | "date" | "status";

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button onClick={onRemove} className="inline-flex items-center gap-1 rounded-full bg-[#76B900]/10 px-2.5 py-1 font-medium text-[#4c7600] hover:bg-[#76B900]/20">
      {label}<span aria-hidden="true" className="text-base leading-none">×</span>
    </button>
  );
}

function FilterToggleGroup<T extends string>({
  label, options, selected, onToggle,
}: { label: string; options: Array<{ value: T; label: string }>; selected: T[]; onToggle: (value: T) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-32 text-xs font-semibold text-gray-600">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = selected.includes(option.value);
          return <button key={option.value} type="button" onClick={() => onToggle(option.value)} aria-pressed={active}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${active ? "border-[#76B900] bg-[#76B900] text-white" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}>
            {option.label}
          </button>;
        })}
      </div>
    </div>
  );
}

function AllRequests({ userFilter, onClearUserFilter, highlightId, onHighlightClear }: { userFilter?: { userId: number; userName: string } | null; onClearUserFilter?: () => void; highlightId?: number | null; onHighlightClear?: () => void } = {}) {
  const { data: requests, isLoading } = trpc.thesis.all.useQuery();
  const rowRefs = useRef<Record<number, HTMLTableRowElement | null>>({});
  const [highlightedId, setHighlightedId] = useState<number | null>(null);

  // Scroll to and highlight the target row when highlightId changes
  useEffect(() => {
    if (!highlightId || isLoading) return;
    setHighlightedId(highlightId);
    // Wait for render, then scroll
    const timer = setTimeout(() => {
      const el = rowRefs.current[highlightId];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      // Remove highlight after 3 seconds
      const clearTimer = setTimeout(() => {
        setHighlightedId(null);
        onHighlightClear?.();
      }, 3000);
      return () => clearTimeout(clearTimer);
    }, 300);
    return () => clearTimeout(timer);
  }, [highlightId, isLoading]);

  const [statusFilters, setStatusFilters] = useState<Array<"PENDING" | "ACCEPTED" | "REJECTED" | "MATCHED">>([]);
  const [secondExaminerFilters, setSecondExaminerFilters] = useState<SecondExaminerFilter[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [programmeFilter, setProgrammeFilter] = useState("ALL");
  const [semesterFilter, setSemesterFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<AdminSortKey>("date");
  const [assignModal, setAssignModal] = useState<{ id: number; title: string } | null>(null);
  const [deadlineModal, setDeadlineModal] = useState<{ id: number; title: string; deadline?: Date | string | null } | null>(null);
  const [adminAssignModal, setAdminAssignModal] = useState<{
    id: number; title?: string | null; studentName?: string | null;
    targetSemester?: string | null; department?: string | null; examinerId?: number | null; secondExaminerId?: number | null;
  } | null>(null);
  const [remindingId, setRemindingId] = useState<number | null>(null);
  // Cooldown: requestId -> timestamp of last sent reminder (10 min)
  const [reminderCooldowns, setReminderCooldowns] = useState<Record<number, number>>({});
  // Log: requestId -> { sentTo, sentAt }
  const [reminderLog, setReminderLog] = useState<Record<number, { sentTo: string[]; sentAt: Date }>>({});
  const utils = trpc.useUtils();

  const filterOptions = useMemo(() => {
    const allRequests = requests ?? [];
    const departments = Array.from(new Set(allRequests.map((request) => request.department).filter(Boolean) as string[])).sort();
    const programmes = Array.from(new Map(allRequests
      .filter((request) => request.programmeAbbreviation || request.programmeName)
      .map((request) => [getProgrammeFilterValue(request as any), {
        value: getProgrammeFilterValue(request as any),
        label: request.programmeAbbreviation ?? request.programmeName ?? "Studiengang",
        department: request.department ?? "",
      }])).values())
      .filter((programme) => departmentFilter === "ALL" || programme.department === departmentFilter)
      .sort((a, b) => a.label.localeCompare(b.label, "de"));
    const semesters = Array.from(new Set(allRequests.map((request) => request.targetSemester).filter(Boolean) as string[]))
      .sort((a, b) => b.localeCompare(a, "de"));
    return { departments, programmes, semesters };
  }, [requests, departmentFilter]);

  const toggleStatusFilter = (status: "PENDING" | "ACCEPTED" | "REJECTED" | "MATCHED") => {
    setStatusFilters((previous) => previous.includes(status) ? previous.filter((item) => item !== status) : [...previous, status]);
  };
  const toggleSecondExaminerFilter = (status: SecondExaminerFilter) => {
    setSecondExaminerFilters((previous) => previous.includes(status) ? previous.filter((item) => item !== status) : [...previous, status]);
  };
  const clearAllFilters = () => {
    setStatusFilters([]); setSecondExaminerFilters([]); setDepartmentFilter("ALL"); setProgrammeFilter("ALL"); setSemesterFilter("ALL"); setSearch("");
  };
  const activeFilterCount = statusFilters.length + secondExaminerFilters.length
    + (departmentFilter !== "ALL" ? 1 : 0)
    + (programmeFilter !== "ALL" ? 1 : 0)
    + (semesterFilter !== "ALL" ? 1 : 0)
    + (search.trim() ? 1 : 0);

  const sendReminderMutation = (trpc as any).admin.sendExaminerReminder.useMutation({
    onSuccess: (data: { sentTo: string[] }, variables: { thesisRequestId: number }) => {
      const now = new Date();
      toast.success(`✅ Erinnerung gesendet an: ${data.sentTo.join(", ")}`);
      setRemindingId(null);
      setReminderCooldowns((prev) => ({ ...prev, [variables.thesisRequestId]: Date.now() }));
      setReminderLog((prev) => ({ ...prev, [variables.thesisRequestId]: { sentTo: data.sentTo, sentAt: now } }));
    },
    onError: (err: { message: string }) => {
      toast.error(`Erinnerung fehlgeschlagen: ${err.message}`);
      setRemindingId(null);
    },
  });

  const updateStatus = trpc.thesis.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status aktualisiert!");
      utils.thesis.all.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const filtered = requests?.filter((r) => {
    const matchFilters = matchesAdminRequestFilters(r as any, {
      statusFilters,
      secondExaminerFilters,
      department: departmentFilter,
      programme: programmeFilter,
      semester: semesterFilter,
      search,
    });
    // Nutzer-Filter (aus Nutzerverwaltung)
    let matchUser = true;
    if (userFilter?.userId) {
      const uid = userFilter.userId;
      matchUser = (
        (r as any).studentId === uid ||
        (r as any).examinerId === uid ||
        (r as any).secondExaminerId === uid ||
        (r as any).wantedExaminerId === uid ||
        (r as any).wantedSecondExaminerId === uid
      );
    }
    return matchFilters && matchUser;
  });

  const sorted = filtered ? [...filtered].sort((a, b) => {
    switch (sortKey) {
      case "name": return (a.studentName ?? "").localeCompare(b.studentName ?? "", "de");
      case "programme": return (a.programmeAbbreviation ?? a.programmeName ?? a.department ?? "").localeCompare(b.programmeAbbreviation ?? b.programmeName ?? b.department ?? "", "de");
      case "semester": return (a.targetSemester ?? "").localeCompare(b.targetSemester ?? "", "de");
      case "title": return (a.title ?? "").localeCompare(b.title ?? "", "de");
      case "status": return a.status.localeCompare(b.status);
      case "date": return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
      default: return 0;
    }
  }) : [];

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}</div>;
  }

  return (
    <div>
      {/* Nutzer-Filter-Badge */}
      {userFilter && (
        <div className="flex items-center gap-2 mb-4 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
          <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          <span className="text-sm text-blue-800 font-medium">Gefiltert nach: <span className="font-semibold">{userFilter.userName}</span></span>
          <button
            onClick={onClearUserFilter}
            className="ml-auto text-blue-500 hover:text-blue-700 transition-colors text-xs font-semibold flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            Filter aufheben
          </button>
        </div>
      )}
      {/* Kombinierbare Filter */}
      <section className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Anfragen filtern</h2>
            <p className="mt-0.5 text-xs text-gray-500">Alle Filter können gleichzeitig kombiniert werden.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-500">{sorted.length} von {requests?.length ?? 0} Anfragen</span>
            {activeFilterCount > 0 && <button onClick={clearAllFilters} className="text-xs font-semibold text-[#5a8c00] hover:underline">Alle Filter zurücksetzen</button>}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative xl:col-span-1">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" placeholder="Titel, Person, Fachbereich …" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2" />
          </div>
          <select value={departmentFilter} onChange={(e) => { setDepartmentFilter(e.target.value); setProgrammeFilter("ALL"); }} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2">
            <option value="ALL">Alle Fachbereiche</option>
            {filterOptions.departments.map((department) => <option key={department} value={department}>{department}</option>)}
          </select>
          <select value={programmeFilter} onChange={(e) => setProgrammeFilter(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2">
            <option value="ALL">Alle Studiengänge</option>
            {filterOptions.programmes.map((programme) => <option key={programme.value} value={programme.value}>{programme.label} · {programme.department}</option>)}
          </select>
          <select value={semesterFilter} onChange={(e) => setSemesterFilter(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2">
            <option value="ALL">Alle Semester</option>
            {filterOptions.semesters.map((semester) => <option key={semester} value={semester}>{semester}</option>)}
          </select>
        </div>
        <div className="mt-4 grid gap-4 border-t border-gray-100 pt-4 lg:grid-cols-2">
          <FilterToggleGroup label="Status" options={[
            { value: "PENDING", label: "Ausstehend" }, { value: "ACCEPTED", label: "Angenommen" },
            { value: "MATCHED", label: "Matched" }, { value: "REJECTED", label: "Abgelehnt" },
          ]} selected={statusFilters} onToggle={toggleStatusFilter} />
          <FilterToggleGroup label="Zweitgutachter:in" options={[
            { value: "NONE", label: "Keine:r" }, { value: "REQUESTED", label: "Angefragt" },
            { value: "ACCEPTED", label: "Zugesagt" }, { value: "REJECTED", label: "Abgelehnt" },
          ]} selected={secondExaminerFilters} onToggle={toggleSecondExaminerFilter} />
        </div>
        {activeFilterCount > 0 && <div className="mt-4 flex flex-wrap gap-1.5 border-t border-gray-100 pt-3 text-xs">
          <span className="mr-1 self-center font-medium text-gray-500">Aktiv:</span>
          {departmentFilter !== "ALL" && <FilterChip label={departmentFilter} onRemove={() => setDepartmentFilter("ALL")} />}
          {programmeFilter !== "ALL" && <FilterChip label={filterOptions.programmes.find((programme) => programme.value === programmeFilter)?.label ?? "Studiengang"} onRemove={() => setProgrammeFilter("ALL")} />}
          {semesterFilter !== "ALL" && <FilterChip label={semesterFilter} onRemove={() => setSemesterFilter("ALL")} />}
          {statusFilters.map((status) => <FilterChip key={status} label={{ PENDING: "Ausstehend", ACCEPTED: "Angenommen", MATCHED: "Matched", REJECTED: "Abgelehnt" }[status]} onRemove={() => toggleStatusFilter(status)} />)}
          {secondExaminerFilters.map((status) => <FilterChip key={status} label={{ NONE: "Keine:r Zweitgutachter:in", REQUESTED: "Zweitgutachter:in angefragt", ACCEPTED: "Zweitgutachter:in zugesagt", REJECTED: "Zweitgutachter:in abgelehnt" }[status]} onRemove={() => toggleSecondExaminerFilter(status)} />)}
        </div>}
      </section>

      {/* Export-Button */}
      <div className="flex justify-end mb-2">
        <button
          onClick={async () => {
            try {
              const url = `/api/export/theses.pdf${statusFilters.length === 1 ? `?status=${statusFilters[0]}` : ''}`;
              const res = await fetch(url, { credentials: 'include' });
              if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Unbekannter Fehler' }));
                toast.error(err.error ?? 'PDF-Export fehlgeschlagen');
                return;
              }
              const blob = await res.blob();
              const blobUrl = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = blobUrl;
              a.download = `HTW_Antraege_${new Date().toISOString().slice(0, 10)}.pdf`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(blobUrl);
            } catch {
              toast.error('PDF-Export fehlgeschlagen');
            }
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ backgroundColor: '#76B900' }}
          title="Anfragen als PDF herunterladen"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Als PDF exportieren
        </button>
      </div>

      {/* Sortier-Leiste */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <span className="text-xs text-gray-500 font-medium">Sortieren nach:</span>
        <div className="flex flex-wrap gap-1.5">
          {([
            { value: "date" as AdminSortKey, label: "Neueste zuerst" },
            { value: "name" as AdminSortKey, label: "Name A–Z" },
            { value: "programme" as AdminSortKey, label: "Study Programme A–Z" },
            { value: "semester" as AdminSortKey, label: "Semester" },
            { value: "title" as AdminSortKey, label: "Thema A–Z" },
            { value: "status" as AdminSortKey, label: "Status" },
          ]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSortKey(opt.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                sortKey === opt.value
                  ? "bg-[#76B900] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {!sorted?.length ? (
          <div className="text-center py-12 text-gray-500 text-sm">Keine Anfragen gefunden.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Thema / Studierende:r</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden md:table-cell">Study Programme</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden lg:table-cell">Zielsemester</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden xl:table-cell">Gutachter:innen</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden xl:table-cell">Datum</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Status</th>
                  <th className="text-right text-xs font-semibold text-gray-500 px-5 py-3">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((req) => (
                  <tr
                    key={req.id}
                    ref={(el) => { rowRefs.current[req.id] = el; }}
                    className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors ${
                      highlightedId === req.id ? 'ring-2 ring-inset ring-[#76B900] bg-[#76B900]/5' : ''
                    }`}
                  >
                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-900 text-sm truncate max-w-xs">{req.title || "(kein Titel)"}</div>
                      {req.studentName && <div className="text-xs font-medium text-[#76B900] mt-0.5">{req.studentName}</div>}
                      <div className="text-xs text-gray-500 mt-0.5 md:hidden">{req.programmeAbbreviation ?? req.programmeName ?? req.department}</div>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className="text-sm text-gray-600">{req.programmeAbbreviation ?? req.programmeName ?? req.department ?? "–"}</span>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <span className="text-sm text-gray-600">{req.targetSemester ?? "–"}</span>
                    </td>
                    <td className="px-5 py-4 hidden xl:table-cell">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-20 shrink-0">Erst:</span>
                          {req.firstExaminerName ? (
                            <span className="text-xs font-medium text-gray-800 truncate max-w-[140px]">{req.firstExaminerName}</span>
                          ) : (req as any).wantedExaminerName ? (
                            <span className="text-xs font-medium text-amber-700 truncate max-w-[140px]">{(req as any).wantedExaminerName} <span className="text-[10px] text-amber-400">(angefragt)</span></span>
                          ) : (
                            <span className="text-xs text-gray-300">–</span>
                          )}
                        </div>
                        {(req.secondExaminerName || (req as any).wantedSecondExaminerName) && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-20 shrink-0">Zweit:</span>
                            {req.secondExaminerName ? (
                              <span className="text-xs font-medium text-gray-800 truncate max-w-[140px]">{req.secondExaminerName}</span>
                            ) : (
                              <span className="text-xs font-medium text-amber-700 truncate max-w-[140px]">{(req as any).wantedSecondExaminerName} <span className="text-[10px] text-amber-400">(angefragt)</span></span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden xl:table-cell">
                      <span className="text-xs text-gray-500">
                        {req.createdAt ? new Date(req.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" }) : "–"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={req.status} />
                        {/* Angefragter Zweitgutachter-Name unter dem Badge */}
                        {req.status === "PENDING_SECOND_EXAMINER" && (req as any).wantedSecondExaminerId && !(req as any).secondExaminerId && !(req as any).secondExaminerRejectedAt && (() => {
                          const requestedAt = (req as any).secondExaminerRequestedAt;
                          const dateStr = requestedAt
                            ? new Date(requestedAt).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })
                            : null;
                          return (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-[11px] text-amber-700 font-medium leading-tight cursor-default underline decoration-dotted decoration-amber-400 underline-offset-2">
                                  {(req as any).wantedSecondExaminerName
                                    ? (req as any).wantedSecondExaminerName
                                    : `ID #${(req as any).wantedSecondExaminerId}`}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                {dateStr
                                  ? `Angefragt am ${dateStr}`
                                  : "Anfragedatum nicht bekannt"}
                              </TooltipContent>
                            </Tooltip>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setAssignModal({ id: req.id, title: req.title })}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          Prüfer:in
                        </button>
                        <button
                          onClick={() => setAdminAssignModal({
                            id: req.id,
                            title: req.title,
                            studentName: req.studentName,
                            targetSemester: req.targetSemester,
                            department: req.department,
                            examinerId: (req as any).examinerId ?? null,
                            secondExaminerId: (req as any).secondExaminerId ?? null,
                          })}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-green-300 text-green-700 hover:bg-green-50 transition-colors"
                          title="Gutachter:innen direkt zuweisen (mit Verfügbarkeits-Prüfung)"
                        >
                          Zuweisen
                        </button>
                        {/* Erinnerung senden – nur wenn Gutachter:in angefragt aber noch nicht bestätigt */}
                        {(
                          ((req as any).wantedExaminerId && !(req as any).examinerId) ||
                          ((req as any).wantedSecondExaminerId && !(req as any).secondExaminerId)
                        ) && (() => {
                          const cooldownTs = reminderCooldowns[req.id];
                          const cooldownActive = cooldownTs && (Date.now() - cooldownTs) < 10 * 60 * 1000;
                          const log = reminderLog[req.id];
                          return (
                            <div className="flex flex-col items-start gap-0.5">
                              <button
                                onClick={() => {
                                  if (cooldownActive) return;
                                  setRemindingId(req.id);
                                  sendReminderMutation.mutate({ thesisRequestId: req.id });
                                }}
                                disabled={remindingId === req.id || !!cooldownActive}
                                className="px-2 py-1 rounded text-[11px] font-medium border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title={cooldownActive ? "Cooldown aktiv – bitte 10 Minuten warten" : "Erinnerungsmail an ausstehende Gutachter:in senden"}
                              >
                                {remindingId === req.id ? "Sendet…" : cooldownActive ? "⏳ Cooldown" : "🔔 Reminder"}
                              </button>
                              {log && (
                                <span className="text-[10px] text-gray-400 leading-tight">
                                  Gesendet {log.sentAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} an {log.sentTo.length} Empf.
                                </span>
                              )}
                            </div>
                          );
                        })()}
                        <button
                          onClick={() => setDeadlineModal({ id: req.id, title: req.title, deadline: req.deadline })}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                          title={req.deadline ? `Deadline: ${new Date(req.deadline).toLocaleDateString("de-DE")}` : "Deadline setzen"}
                        >
                          {req.deadline ? "📅" : "Deadline"}
                        </button>
                        {req.deadline && (
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
                            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                            title="Kalender-Export (.ics)"
                          >
                            .ics
                          </button>
                        )}
                        <select
                          value={req.status}
                          onChange={(e) =>
                            updateStatus.mutate({
                              id: req.id,
                              status: e.target.value as "PENDING" | "ACCEPTED" | "REJECTED" | "MATCHED",
                              origin: window.location.origin,
                            })
                          }
                          className="px-3 py-1.5 rounded-lg text-xs border border-gray-200 text-gray-600 bg-white focus:outline-none cursor-pointer"
                        >
                          <option value="PENDING">Ausstehend</option>
                          <option value="ACCEPTED">Angenommen</option>
                          <option value="REJECTED">Abgelehnt</option>
                          <option value="MATCHED">Matched</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {assignModal && (
        <AssignExaminerModal
          thesisId={assignModal.id}
          thesisTitle={assignModal.title}
          onClose={() => setAssignModal(null)}
        />
      )}
      {adminAssignModal && (
        <AdminAssignExaminersModal
          open={true}
          thesis={adminAssignModal}
          onClose={() => setAdminAssignModal(null)}
          onSuccess={() => { utils.thesis.all.invalidate(); setAdminAssignModal(null); }}
        />
      )}
      {deadlineModal && (
        <DeadlineModal
          thesisId={deadlineModal.id}
          thesisTitle={deadlineModal.title}
          currentDeadline={deadlineModal.deadline}
          onClose={() => setDeadlineModal(null)}
        />
      )}
    </div>
  );
}

// ─── Audit Log ────────────────────────────────────────────────────────────────
function AuditLogView({ onNavigateToRequest }: { onNavigateToRequest?: (requestId: number) => void } = {}) {
  const { data: logs, isLoading } = trpc.auditLog.all.useQuery();
  const [auditSearch, setAuditSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedAction, setSelectedAction] = useState("");

  const actionLabels: Record<string, string> = {
    THESIS_CREATED: "Anfrage erstellt",
    STATUS_CHANGED: "Status geändert",
    FIRST_EXAMINER_ASSIGNED: "Erstprüfer:in zugewiesen",
    SECOND_EXAMINER_ASSIGNED: "Zweitprüfer:in zugewiesen",
    EXAMINER_ACCEPTED: "Prüfer:in angenommen",
    EXAMINER_REJECTED: "Prüfer:in abgelehnt",
    THESIS_UPDATED_BY_STUDENT: "Anfrage bearbeitet",
    THESIS_WITHDRAWN: "Anfrage zurückgezogen",
    SECOND_EXAMINER_INVITED: "Zweitgutachter:in eingeladen",
    SECOND_EXAMINER_SUGGESTED: "Zweitgutachter:in vorgeschlagen",
    CONDITIONAL_ACCEPTANCE: "Bedingte Annahme",
    SECOND_EXAMINER_ACCEPTED: "Zweitgutachter:in bestätigt",
    SECOND_EXAMINER_REJECTED: "Zweitgutachter:in abgelehnt",
    THESIS_MATCHED: "Thesis Match",
  };

  const actionColors: Record<string, string> = {
    THESIS_CREATED: "bg-blue-100 text-blue-700",
    STATUS_CHANGED: "bg-amber-100 text-amber-700",
    FIRST_EXAMINER_ASSIGNED: "bg-primary/10 text-primary",
    SECOND_EXAMINER_ASSIGNED: "bg-primary/10 text-primary",
    EXAMINER_ACCEPTED: "bg-primary/10 text-primary",
    EXAMINER_REJECTED: "bg-red-100 text-red-700",
    THESIS_UPDATED_BY_STUDENT: "bg-indigo-100 text-indigo-700",
    THESIS_WITHDRAWN: "bg-red-100 text-red-700",
    SECOND_EXAMINER_INVITED: "bg-amber-100 text-amber-700",
    SECOND_EXAMINER_SUGGESTED: "bg-amber-100 text-amber-700",
    CONDITIONAL_ACCEPTANCE: "bg-orange-100 text-orange-700",
    SECOND_EXAMINER_ACCEPTED: "bg-primary/10 text-primary",
    SECOND_EXAMINER_REJECTED: "bg-red-100 text-red-700",
    THESIS_MATCHED: "bg-purple-100 text-purple-700",
  };

  // Diff-Anzeige für THESIS_UPDATED_BY_STUDENT
  function DiffView({ metadata }: { metadata: unknown }) {
    if (!metadata || typeof metadata !== "object") return null;
    const meta = metadata as { diff?: Array<{ field: string; label: string; oldValue: string | null; newValue: string | null }>; changedFieldCount?: number };
    if (!meta.diff || meta.diff.length === 0) return <span className="text-xs text-gray-400">Keine Änderungen</span>;
    return (
      <div className="space-y-1.5 mt-1">
        {meta.diff.map((d) => (
          <div key={d.field} className="text-xs">
            <span className="font-medium text-gray-700">{d.label}:</span>
            <div className="ml-2 mt-0.5 space-y-0.5">
              {d.oldValue !== null && (
                <div className="flex items-start gap-1">
                  <span className="text-red-500 font-mono text-[10px] mt-0.5 flex-shrink-0">−</span>
                  <span className="text-red-700 bg-red-50 px-1.5 py-0.5 rounded line-clamp-2 break-all">{d.oldValue}</span>
                </div>
              )}
              {d.newValue !== null && (
                <div className="flex items-start gap-1">
                  <span className="text-green-500 font-mono text-[10px] mt-0.5 flex-shrink-0">+</span>
                  <span className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded line-clamp-2 break-all">{d.newValue}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }
  const [expandedDiffId, setExpandedDiffId] = useState<number | null>(null);

  const filteredLogs = logs?.filter((log) => {
    // Textsuche
    if (auditSearch) {
      const q = auditSearch.toLowerCase();
      const matchesSearch =
        ((log as any).actorName ?? "").toLowerCase().includes(q) ||
        (log.action ?? "").toLowerCase().includes(q) ||
        String(log.thesisRequestId ?? "").includes(q) ||
        ((log as any).studentName ?? "").toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }
    // Datumsfilter
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (new Date(log.createdAt) < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(log.createdAt) > to) return false;
    }
    // Aktionsfilter
    if (selectedAction && log.action !== selectedAction) return false;
    return true;
  });
  const hasActiveFilter = auditSearch || dateFrom || dateTo || selectedAction;

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>;
  }

  if (!logs?.length) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-gray-900 font-semibold mb-1">Keine Einträge</h3>
        <p className="text-gray-500 text-sm">Alle Statusänderungen werden hier protokolliert.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter-Leiste */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Suchfeld */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Nach Nutzer:in, Aktion oder Anfrage-ID suchen..."
            value={auditSearch}
            onChange={(e) => setAuditSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#76B900]/30 focus:border-[#76B900] transition-all"
          />
        </div>
        {/* Datumsfilter Von */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 whitespace-nowrap">Von</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#76B900]/30 focus:border-[#76B900] transition-all"
          />
        </div>
        {/* Datumsfilter Bis */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 whitespace-nowrap">Bis</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#76B900]/30 focus:border-[#76B900] transition-all"
          />
        </div>
        {/* Aktions-Dropdown */}
        <select
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#76B900]/30 focus:border-[#76B900] transition-all bg-white text-gray-700"
        >
          <option value="">Alle Aktionen</option>
          <option value="THESIS_CREATED">Anfrage erstellt</option>
          <option value="STATUS_CHANGED">Status geändert</option>
          <option value="FIRST_EXAMINER_ASSIGNED">Erstprüfer:in zugewiesen</option>
          <option value="SECOND_EXAMINER_ASSIGNED">Zweitprüfer:in zugewiesen</option>
          <option value="EXAMINER_ACCEPTED">Prüfer:in angenommen</option>
          <option value="EXAMINER_REJECTED">Prüfer:in abgelehnt</option>
          <option value="THESIS_UPDATED_BY_STUDENT">Anfrage bearbeitet</option>
          <option value="THESIS_WITHDRAWN">Anfrage zurückgezogen</option>
          <option value="SECOND_EXAMINER_INVITED">Zweitgutachter:in eingeladen</option>
          <option value="SECOND_EXAMINER_SUGGESTED">Zweitgutachter:in vorgeschlagen</option>
          <option value="CONDITIONAL_ACCEPTANCE">Bedingte Annahme</option>
          <option value="SECOND_EXAMINER_ACCEPTED">Zweitgutachter:in bestätigt</option>
          <option value="SECOND_EXAMINER_REJECTED">Zweitgutachter:in abgelehnt</option>
          <option value="THESIS_MATCHED">Thesis Match</option>
        </select>
        {/* Filter zurücksetzen */}
        {hasActiveFilter && (
          <button
            type="button"
            onClick={() => { setAuditSearch(""); setDateFrom(""); setDateTo(""); setSelectedAction(""); }}
            className="text-xs text-gray-500 hover:text-gray-700 underline whitespace-nowrap"
          >
            Filter zurücksetzen
          </button>
        )}
      </div>
      {filteredLogs?.length === 0 && hasActiveFilter && (
        <p className="text-sm text-gray-500 py-4 text-center">Keine Einträge für die gewählten Filter gefunden.</p>
      )}
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Zeitpunkt</th>
              <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Aktion</th>
              <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden sm:table-cell">Nutzer:in</th>
              <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden md:table-cell">Studierende:r</th>
              <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden md:table-cell">Anfrage-ID</th>
              <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden lg:table-cell">Von → Nach</th>
              <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden lg:table-cell">Notiz / Änderungen</th>
            </tr>
          </thead>
          <tbody>
            {(filteredLogs ?? []).map((log) => {
              const hasDiff: boolean = log.action === "THESIS_UPDATED_BY_STUDENT" && !!log.metadata && typeof log.metadata === "object" && Array.isArray((log.metadata as any).diff) && (log.metadata as any).diff.length > 0;
              const isExpanded = expandedDiffId === log.id;
              return (
                <>
                  <tr key={log.id} className={`border-b border-gray-50 last:border-0 transition-colors ${hasDiff ? "cursor-pointer hover:bg-indigo-50/40" : "hover:bg-gray-50/50"}`}
                    onClick={() => hasDiff ? setExpandedDiffId(isExpanded ? null : log.id) : undefined}
                  >
                    <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${actionColors[log.action] ?? "bg-gray-100 text-gray-700"}`}>
                          {actionLabels[log.action] ?? log.action}
                        </span>
                        {hasDiff && (
                          <span className="text-xs text-indigo-500 font-medium">
                            {String((log.metadata as { changedFieldCount?: number }).changedFieldCount ?? 0)} Feld{(log.metadata as { changedFieldCount?: number }).changedFieldCount !== 1 ? "er" : ""} geändert
                            <span className="ml-1">{isExpanded ? "▲" : "▼"}</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      <span className="text-xs text-gray-700 font-medium">{(log as any).actorName ?? <span className="text-gray-400">System</span>}</span>
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      {(log as any).studentName && log.thesisRequestId
                        ? (
                          <button
                            type="button"
                            onClick={() => onNavigateToRequest?.(log.thesisRequestId!)}
                            className="text-xs font-medium text-[#76B900] hover:underline hover:text-[#5a8f00] transition-colors text-left group flex items-center gap-1"
                            title="Zur Anfrage springen"
                          >
                            {(log as any).studentName}
                            <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          </button>
                        )
                        : (log as any).studentName
                          ? <span className="text-xs font-medium text-[#76B900]">{(log as any).studentName}</span>
                          : <span className="text-xs text-gray-400">—</span>
                      }
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      {log.thesisRequestId
                        ? (
                          <button
                            type="button"
                            onClick={() => onNavigateToRequest?.(log.thesisRequestId!)}
                            className="text-xs text-gray-600 font-mono hover:text-[#76B900] hover:underline transition-colors group flex items-center gap-1"
                            title="Zur Anfrage springen"
                          >
                            #{log.thesisRequestId}
                            <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          </button>
                        )
                        : <span className="text-xs text-gray-400">—</span>
                      }
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell">
                      {log.fromStatus || log.toStatus ? (
                        <span className="text-xs text-gray-600">
                          {log.fromStatus && <StatusBadge status={log.fromStatus} />}
                          {log.fromStatus && log.toStatus && <span className="mx-1.5 text-gray-400">→</span>}
                          {log.toStatus && <StatusBadge status={log.toStatus} />}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell">
                      {hasDiff
                        ? <span className="text-xs text-indigo-500">{isExpanded ? "Zum Schließen klicken" : "Zum Anzeigen klicken"}</span>
                        : <span className="text-xs text-gray-500 line-clamp-1">{log.reason ?? "—"}</span>
                      }
                    </td>
                  </tr>
                  {hasDiff && isExpanded && (
                    <tr key={`diff-${log.id}`} className="bg-indigo-50/60 border-b border-indigo-100">
                      <td colSpan={6} className="px-8 py-4">
                        <div className="text-xs font-semibold text-indigo-700 mb-2">Geänderte Felder im Vergleich zur vorherigen Version:</div>
                        <DiffView metadata={log.metadata} />
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
}

// ─── Create Examiner Modal ──────────────────────────────────────────────────────────────────
function CreateExaminerModal({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", title: "", department: "", bio: "", maxSupervisions: 5 });
  const createExaminer = trpc.admin.createExaminer.useMutation({
    onSuccess: () => {
      toast.success("Prüfer:in erfolgreich angelegt!");
      utils.admin.users.invalidate();
      utils.examiner.list.invalidate();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });
  const sendInvite = trpc.admin.sendInvite.useMutation({
    onSuccess: () => toast.success("Einladungs-E-Mail gesendet!"),
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-gray-900 mb-1">Prüfer:in anlegen</h3>
        <p className="text-sm text-gray-500 mb-5">Neues Konto erstellen und optional Einladung senden</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Vorname *</label>
              <input value={form.firstName} onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Maria" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nachname *</label>
              <input value={form.lastName} onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Muster" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Akademischer Titel</label>
              <input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Prof. Dr." className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">E-Mail *</label>
              <input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="muster@htw-berlin.de" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Fachbereich</label>
            <input value={form.department} onChange={(e) => setForm(f => ({ ...f, department: e.target.value }))} placeholder="FB 4 – Informatik" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Kurzbiografie</label>
            <textarea value={form.bio} onChange={(e) => setForm(f => ({ ...f, bio: e.target.value }))} rows={2} placeholder="Forschungsschwerpunkte, Interessen ..." className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Max. Betreuungen: {form.maxSupervisions}</label>
            <input type="range" min={1} max={20} value={form.maxSupervisions} onChange={(e) => setForm(f => ({ ...f, maxSupervisions: +e.target.value }))} className="w-full" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={() => createExaminer.mutate({ ...form, name: [form.title, form.firstName, form.lastName].filter(Boolean).join(' ') })}
            disabled={createExaminer.isPending || !form.firstName || !form.lastName || !form.email}
            className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
            style={{ backgroundColor: "#76B900" }}
          >
            {createExaminer.isPending ? "Wird angelegt..." : "Anlegen"}
          </button>
          <button
            onClick={() => sendInvite.mutate({ email: form.email, role: "examiner", origin: window.location.origin })}
            disabled={sendInvite.isPending || !form.email}
            className="px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Einladen
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
// ─── Rollenwechsel-Warnungen ──────────────────────────────────────────────────────────────────────────────────
const ROLE_CHANGE_WARNINGS: Record<string, Record<string, string>> = {
  examiner: {
    student: "Diese Person ist als Prüfer:in registriert und hat möglicherweise offene Betreuungsanfragen. Ein Rollenwechsel zu Studierende:r entfernt den Prüfer:innen-Zugang.",
    pav: "Diese Person ist als Prüfer:in registriert. Ein Wechsel zur PAV-Rolle entfernt den Prüfer:innen-Zugang. Offene Anfragen bleiben bestehen.",
    user: "Diese Person ist als Prüfer:in registriert. Ein Wechsel zur Nutzer:in-Rolle entfernt alle Prüfer:innen-Rechte.",
  },
  pav: {
    examiner: "Diese Person ist PA-Vorsitzende:r. Ein Wechsel zur Prüfer:in-Rolle entfernt alle PAV-Rechte und Studiengang-Zuweisungen.",
    student: "Diese Person ist PA-Vorsitzende:r. Ein Wechsel zur Studierenden-Rolle entfernt alle PAV-Rechte.",
    user: "Diese Person ist PA-Vorsitzende:r. Ein Wechsel zur Nutzer:in-Rolle entfernt alle PAV-Rechte und Studiengang-Zuweisungen.",
  },
  admin: {
    user: "Diese Person ist Admin. Ein Wechsel zur Nutzer:in-Rolle entfernt alle Administrationsrechte.",
    student: "Diese Person ist Admin. Ein Wechsel zur Studierenden-Rolle entfernt alle Administrationsrechte.",
    examiner: "Diese Person ist Admin. Ein Wechsel zur Prüfer:in-Rolle entfernt alle Administrationsrechte.",
  },
  dean: {
    user: "Diese Person ist Dekan:in. Ein Rollenwechsel entfernt den Lesezugriff auf alle Anträge.",
    student: "Diese Person ist Dekan:in. Ein Rollenwechsel entfernt den Lesezugriff auf alle Anträge.",
    examiner: "Diese Person ist Dekan:in. Ein Rollenwechsel entfernt den Lesezugriff auf alle Anträge.",
  },
  vice_dean: {
    user: "Diese Person ist Prodekan:in. Ein Rollenwechsel entfernt den Lesezugriff auf alle Anträge.",
    student: "Diese Person ist Prodekan:in. Ein Rollenwechsel entfernt den Lesezugriff auf alle Anträge.",
    examiner: "Diese Person ist Prodekan:in. Ein Rollenwechsel entfernt den Lesezugriff auf alle Anträge.",
  },
};

const ROLE_LABELS: Record<string, string> = {
  user: "Nutzer:in", student: "Studierende:r", examiner: "Prüfer:in (Erstprüfer:in)",
  second_examiner: "Zweitprüfer:in",
  pav: "PA-Vorsitzende:r", dean: "Dekan:in", vice_dean: "Prodekan:in",
  admin: "Admin", superadmin: "Superadmin",
};

function RoleChangeConfirmDialog({
  userName, fromRole, toRole, onConfirm, onCancel,
}: { userName: string; fromRole: string; toRole: string; onConfirm: () => void; onCancel: () => void; }) {
  const warning = ROLE_CHANGE_WARNINGS[fromRole]?.[toRole];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-base">Rolle ändern?</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              <strong>{userName}</strong>: {ROLE_LABELS[fromRole] ?? fromRole} → {ROLE_LABELS[toRole] ?? toRole}
            </p>
          </div>
        </div>
        {warning && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <p className="text-sm text-amber-800">{warning}</p>
          </div>
        )}
        <p className="text-sm text-gray-600 mb-5">Möchten Sie die Rolle wirklich ändern? Diese Aktion kann rückgängig gemacht werden.</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Abbrechen
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-colors" style={{ backgroundColor: "#76B900" }}>
            Rolle ändern
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── User Management ──────────────────────────────────────────────────────────────────────────────────
function LastResetInfo({ userId }: { userId: number }) {
  const { data } = trpc.admin.getLastPasswordResetSent.useQuery({ userId });
  if (!data?.lastSentAt) return <span className="block mt-2 text-xs text-gray-400">Noch kein Reset-Link gesendet.</span>;
  return (
    <span className="block mt-2 text-xs text-gray-400">
      Zuletzt gesendet: {new Date(data.lastSentAt).toLocaleString("de-DE")}
    </span>
  );
}

function UserManagement({ onNavigateToRequests }: { onNavigateToRequests?: (userId: number, userName: string) => void } = {}) {
  const { data: users, isLoading } = trpc.admin.users.useQuery();
  const utils = trpc.useUtils();
  const [showCreate, setShowCreate] = useState(false);
  const [userTab, setUserTab] = useState<"examiners" | "students">("examiners");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;
  const [pendingRoleChange, setPendingRoleChange] = useState<{ userId: number; userName: string; fromRole: string; toRole: string } | null>(null);
  const [capacityFilter, setCapacityFilter] = useState<"all" | "hasCapacity" | "noCapacity">("all");
  const [examinerTypeFilter, setExaminerTypeFilter] = useState<"all" | "intern" | "extern">("all");

  const updateRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("Rolle aktualisiert!");
      utils.admin.users.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const resetOnboarding = trpc.adminExtra.resetExaminerOnboarding.useMutation({
    onSuccess: () => {
      toast.success("Onboarding zurückgesetzt – Prüfer:in wird beim nächsten Login erneut befragt.");
      utils.admin.users.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const setSecondFlag = trpc.examiner.setSecondExaminerFlag.useMutation({
    onSuccess: () => {
      toast.success("Zweitprüfer:in-Flag aktualisiert!");
      utils.admin.users.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteUser = trpc.admin.deleteUser.useMutation({
    onSuccess: () => {
      toast.success("Nutzer:in gelöscht!");
      utils.admin.users.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const sendPasswordReset = trpc.admin.sendPasswordResetEmail.useMutation({
    onSuccess: () => toast.success("Passwort-Reset-E-Mail wurde versendet!"),
    onError: (err) => toast.error(err.message),
  });

  const [showBulkResetDialog, setShowBulkResetDialog] = useState(false);
  const [bulkResetDone, setBulkResetDone] = useState<{ sent: number; failed: number } | null>(null);
  const magicLinkUsersQuery = trpc.admin.getMagicLinkUsersCount.useQuery(
    { origin: window.location.origin },
    { enabled: showBulkResetDialog }
  );
  const bulkReset = trpc.admin.sendPasswordResetToMagicLinkUsers.useMutation({
    onSuccess: (data) => {
      setBulkResetDone({ sent: data.sent, failed: data.failed });
      setShowBulkResetDialog(false);
      toast.success(`Passwort-Reset-E-Mails versendet: ${data.sent} erfolgreich, ${data.failed} fehlgeschlagen.`);
    },
    onError: (err) => toast.error(err.message),
  });

  const addRole = trpc.admin.addUserRole.useMutation({
    onSuccess: () => {
      toast.success("Rolle hinzugefügt!");
      utils.admin.users.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const removeRole = trpc.admin.removeUserRole.useMutation({
    onSuccess: () => {
      toast.success("Rolle entfernt!");
      utils.admin.users.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const roleLabels: Record<string, string> = {
    student: "Studierende:r",
    examiner: "Prüfer:in",
    second_examiner: "Zweitprüfer:in",
    admin: "Admin",
    user: "Nutzer:in",
    pav: "PA-Vorsitzende:r",
    dean: "Dekan:in",
    vice_dean: "Prodekan:in",
    programme_director: "Studiengangsleitung",
  };

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>;
  }

  const examinerRoles = ["examiner", "second_examiner", "programme_director", "pav", "dean", "vice_dean", "admin", "user"];
  const studentRoles = ["student"];
  const query = searchQuery.trim().toLowerCase();
  const filteredUsers = users?.filter(({ user, profile }) => {
    // Multi-Rollen: Tab-Filter prüft alle Rollen des Nutzers
    const allRoles: string[] = (user as any).roles?.length ? (user as any).roles : [user.role];
    const matchesTab = userTab === "examiners"
      ? allRoles.some((r) => examinerRoles.includes(r))
      : allRoles.some((r) => studentRoles.includes(r));
    if (!matchesTab) return false;
    // Kapazitäts-Filter (nur für Prüfer:innen relevant)
    if (userTab === "examiners" && capacityFilter !== "all") {
      const maxSup = (profile as any)?.maxSupervisions ?? 0;
      if (capacityFilter === "hasCapacity" && maxSup <= 0) return false;
      if (capacityFilter === "noCapacity" && maxSup > 0) return false;
    }
    // Intern/Extern-Filter (examiner = intern, second_examiner = extern)
    if (userTab === "examiners" && examinerTypeFilter !== "all") {
      if (examinerTypeFilter === "intern" && !allRoles.includes("examiner")) return false;
      if (examinerTypeFilter === "extern" && allRoles.includes("examiner")) return false;
    }
    if (!query) return true;
    return (
      buildFullName({ firstName: (user as any).firstName, lastName: (user as any).lastName, academicTitle: (user as any).academicTitle, name: user.name }).toLowerCase().includes(query) ||
      (user.email ?? "").toLowerCase().includes(query)
    );
  }) ?? [];
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedUsers = filteredUsers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Bulk-Passwort-Reset-Dialog */}
      {showBulkResetDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Passwort-Reset an alle bisherigen Magic-Link-Nutzer:innen senden</h3>
                <p className="text-sm text-gray-500 mt-1">Alle Konten, die bisher per E-Mail-Link angemeldet waren und noch kein Passwort vergeben haben, erhalten eine E-Mail mit einem 48-Stunden-Reset-Link.</p>
              </div>
            </div>
            {magicLinkUsersQuery.isLoading ? (
              <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm text-gray-500 animate-pulse">Betroffene Nutzer:innen werden ermittelt…</div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <p className="text-sm font-semibold text-amber-800 mb-2">
                  {magicLinkUsersQuery.data?.count ?? 0} Nutzer:in{(magicLinkUsersQuery.data?.count ?? 0) !== 1 ? "nen" : ""} betroffen
                </p>
                {(magicLinkUsersQuery.data?.users ?? []).length > 0 && (
                  <ul className="text-xs text-amber-700 space-y-0.5 max-h-32 overflow-y-auto">
                    {magicLinkUsersQuery.data!.users.map((u) => (
                      <li key={u.id} className="truncate">{u.name || "—"} &lt;{u.email}&gt;</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowBulkResetDialog(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >Abbrechen</button>
              <button
                onClick={() => bulkReset.mutate({ origin: window.location.origin })}
                disabled={bulkReset.isPending || (magicLinkUsersQuery.data?.count ?? 0) === 0}
                className="px-4 py-2 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-50"
                style={{ backgroundColor: "#006937" }}
              >
                {bulkReset.isPending ? "Wird gesendet…" : `E-Mails jetzt senden`}
              </button>
            </div>
          </div>
        </div>
      )}
      {showCreate && <CreateExaminerModal onClose={() => setShowCreate(false)} />}
      {pendingRoleChange && (
        <RoleChangeConfirmDialog
          userName={pendingRoleChange.userName}
          fromRole={pendingRoleChange.fromRole}
          toRole={pendingRoleChange.toRole}
          onConfirm={() => {
            updateRole.mutate({ userId: pendingRoleChange.userId, role: pendingRoleChange.toRole as "student" | "examiner" | "second_examiner" | "admin" | "user" | "pav" | "dean" | "vice_dean" });
            setPendingRoleChange(null);
          }}
          onCancel={() => setPendingRoleChange(null)}
        />
      )}
      {/* Bulk-Reset-Ergebnis-Banner */}
      {bulkResetDone && (
        <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
          <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          <span><strong>{bulkResetDone.sent}</strong> Passwort-Reset-E-Mail{bulkResetDone.sent !== 1 ? "s" : ""} erfolgreich versendet{bulkResetDone.failed > 0 ? `, ${bulkResetDone.failed} fehlgeschlagen` : ""}.</span>
          <button onClick={() => setBulkResetDone(null)} className="ml-auto text-green-600 hover:text-green-800">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}
      {/* Suchleiste + Bulk-Reset-Button */}
      <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          placeholder="Nach Name oder E-Mail suchen…"
          className="w-full pl-9 pr-9 py-2 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Suche löschen"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>
      {/* Bulk-Reset-Button */}
      <button
        onClick={() => setShowBulkResetDialog(true)}
        title="Passwort-Reset-E-Mails an alle bisherigen Magic-Link-Nutzer:innen senden"
        className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs font-semibold hover:bg-amber-100 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
        Migration: Passwort-Reset senden
      </button>
      </div>
      {/* Tab-Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1 gap-1">
          <button
            onClick={() => { setUserTab("examiners"); setCurrentPage(1); }}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              userTab === "examiners"
                ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Prüfer:innen
            <span className="ml-2 text-xs font-normal text-gray-400">
              ({users?.filter(({ user }) => examinerRoles.includes(user.role)).length ?? 0})
            </span>
          </button>
          <button
            onClick={() => { setUserTab("students"); setCurrentPage(1); }}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              userTab === "students"
                ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Studierende
            <span className="ml-2 text-xs font-normal text-gray-400">
              ({users?.filter(({ user }) => studentRoles.includes(user.role)).length ?? 0})
            </span>
          </button>
        </div>
        {userTab === "examiners" && (
          <>
            {/* Intern/Extern-Filter */}
            <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1 gap-1">
              {(["all", "intern", "extern"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => { setExaminerTypeFilter(f); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    examinerTypeFilter === f
                      ? f === "intern"
                        ? "bg-blue-600 text-white shadow-sm"
                        : f === "extern"
                        ? "bg-purple-600 text-white shadow-sm"
                        : "bg-white text-gray-900 shadow-sm border border-gray-200"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {f === "all" ? "Alle Typen" : f === "intern" ? "🏢 Intern" : "👤 Extern"}
                </button>
              ))}
            </div>
            {/* Kapazitäts-Filter */}
            <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1 gap-1">
              {(["all", "hasCapacity", "noCapacity"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => { setCapacityFilter(f); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    capacityFilter === f
                      ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {f === "all" ? "Alle" : f === "hasCapacity" ? "Freie Kapazität" : "Keine Kapazität"}
                </button>
              ))}
            </div>
          </>
        )}
        </div>
        {userTab === "examiners" && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold"
            style={{ backgroundColor: "#76B900" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Prüfer:in anlegen
          </button>
        )}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Name</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden md:table-cell">E-Mail</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Rolle</th>
                <th className="text-right text-xs font-semibold text-gray-500 px-5 py-3">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-400">
                  {query ? `Keine Ergebnisse für „${searchQuery}“.` : "Keine Einträge vorhanden."}
                </td></tr>
              )}
              {pagedUsers.map(({ user, profile }) => (
                <tr key={user.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={buildFullName({ firstName: (user as any).firstName, lastName: (user as any).lastName, academicTitle: (user as any).academicTitle ?? profile?.title, name: user.name })} email={user.email} avatarUrl={user.avatarUrl} size="md" />
                      <div>
                        <span className="text-sm font-medium text-gray-900">{buildFullName({ firstName: (user as any).firstName, lastName: (user as any).lastName, academicTitle: (user as any).academicTitle ?? profile?.title, name: user.name }) || "—"}</span>
                        {profile?.department && <div className="text-xs text-gray-400">{profile.department}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 hidden md:table-cell">
                    <span className="text-sm text-gray-600">{user.email ?? "—"}</span>
                  </td>
                  <td className="px-5 py-3">
                    {/* Multi-Rollen: alle Rollen als Badges anzeigen */}
                    <div className="flex flex-wrap gap-1">
                      {Array.from(new Set<string>((user as any).roles?.length ? (user as any).roles : [user.role])).map((r: string, idx: number) => {
                          const badge = getRoleBadge(r);
                          return (
                            <span key={`${r}-${idx}`} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${badge.className}`}>
                              {badge.label}
                              {((user as any).roles?.length ?? 0) > 1 && (
                                <button
                                  type="button"
                                  title={`Rolle "${badge.label}" entfernen`}
                                  onClick={() => removeRole.mutate({ userId: user.id, role: r as any })}
                                  className="ml-0.5 opacity-60 hover:opacity-100 hover:text-red-600 transition-opacity leading-none"
                                >×</button>
                              )}
                            </span>
                          );
                        })}
                      {/* Rolle hinzufügen */}
                      <select
                        value=""
                        onChange={(e) => {
                          const r = e.target.value;
                          if (!r) return;
                          const existingRoles: string[] = (user as any).roles?.length ? (user as any).roles : [user.role];
                          if (existingRoles.includes(r)) { toast.error("Diese Rolle ist bereits zugewiesen."); return; }
                          addRole.mutate({ userId: user.id, role: r as any });
                        }}
                        className="px-2 py-0.5 rounded-full text-xs border border-dashed border-gray-300 text-gray-400 bg-white focus:outline-none cursor-pointer hover:border-primary hover:text-primary transition-colors"
                        title="Weitere Rolle hinzufügen"
                      >
                        <option value="">+ Rolle</option>
                        <option value="student">Studierende:r</option>
                        <option value="examiner">Prüfer:in</option>
                        <option value="second_examiner">Zweitprüfer:in</option>
                        <option value="pav">PA-Vorsitzende:r</option>
                        <option value="dean">Dekan:in</option>
                        <option value="vice_dean">Prodekan:in</option>
                        <option value="admin">Admin</option>
                        <option value="user">Nutzer:in</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Anfragen dieser Person anzeigen */}
                      {onNavigateToRequests && (
                        <button
                          type="button"
                          title="Alle Anfragen dieser Person anzeigen"
                          onClick={() => onNavigateToRequests(
                            user.id,
                            buildFullName({ firstName: (user as any).firstName, lastName: (user as any).lastName, academicTitle: (user as any).academicTitle ?? profile?.title, name: user.name }) || user.email || `Nutzer:in #${user.id}`
                          )}
                          className="px-2 py-1 rounded-lg text-xs font-semibold border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          Anfragen
                        </button>
                      )}
                      {/* Multi-Rollen: Onboarding-Reset nur wenn examiner in Rollen */}
                      {((user as any).roles?.length ? (user as any).roles : [user.role]).includes("examiner") && (
                        <button
                          type="button"
                          title="Onboarding zurücksetzen (Prüfer:in wird beim nächsten Login erneut befragt)"
                          onClick={() => resetOnboarding.mutate({ userId: user.id })}
                          className="px-2 py-1 rounded-lg text-xs font-semibold border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors"
                        >
                          Onboarding ↺
                        </button>
                      )}
                      {(() => {
                        const userRoles = (user as any).roles?.length ? (user as any).roles : [user.role];
                        if (userRoles.includes("examiner")) {
                          // Erstprüfer:innen haben automatisch Zweitprüfer:innen-Rechte – schreibgeschützt anzeigen
                          return (
                            <span
                              title="Erstprüfer:innen haben automatisch Zweitprüfer:innen-Rechte. Dieses Recht kann nicht deaktiviert werden."
                              className="px-2 py-1 rounded-lg text-xs font-semibold border cursor-default select-none bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1"
                            >
                              <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                              Erst- &amp; Zweit
                            </span>
                          );
                        }
                        if (userRoles.includes("second_examiner")) {
                          // Reine Zweitprüfer:innen: Toggle bleibt editierbar
                          const isActive = (profile as { isSecondExaminer?: number } | undefined)?.isSecondExaminer === 1;
                          return (
                            <button
                              type="button"
                              title={isActive ? "Zweitprüfer:in (klicken zum Deaktivieren)" : "Nur Zweitprüfer:in (klicken zum Aktivieren)"}
                              onClick={() => setSecondFlag.mutate({ isSecondExaminer: !isActive, userId: user.id })}
                              className={`px-2 py-1 rounded-lg text-xs font-semibold border transition-colors ${isActive ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100" : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"}`}
                            >
                              {isActive ? "Zweitprüfer:in" : "Inaktiv"}
                            </button>
                          );
                        }
                        return null;
                      })()}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            title="Neues Passwort senden"
                            disabled={sendPasswordReset.isPending}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Passwort-Reset-E-Mail senden?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Es wird ein Passwort-Reset-Link an <strong>{user.email}</strong> gesendet. Der Link ist 1 Stunde gültig.
                              <LastResetInfo userId={user.id} />
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction onClick={() => sendPasswordReset.mutate({ userId: user.id, origin: window.location.origin })}>E-Mail senden</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Nutzer:in löschen"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Nutzer:in wirklich löschen?</AlertDialogTitle>
                            <AlertDialogDescription>
                              <strong>{buildFullName({ firstName: (user as any).firstName, lastName: (user as any).lastName, academicTitle: (user as any).academicTitle, name: user.name }) || user.email}</strong> wird dauerhaft aus dem System entfernt. Alle zugehörigen Daten (Profil, Rollen, Anfragen) werden gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700 text-white"
                              onClick={() => deleteUser.mutate({ userId: user.id })}
                            >Endgültig löschen</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Paginierung */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-gray-400">
            {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredUsers.length)} von {filteredUsers.length} Einträgen
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={safePage === 1}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Erste Seite"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M18 19l-7-7 7-7" /></svg>
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Vorherige Seite"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === "..." ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-xs text-gray-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p as number)}
                    className={`min-w-[2rem] h-8 rounded-lg text-xs font-semibold transition-colors ${
                      safePage === p
                        ? "text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                    style={safePage === p ? { backgroundColor: "#76B900" } : {}}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Nächste Seite"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={safePage === totalPages}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Letzte Seite"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M6 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────
function Overview() {
  const { data: requests } = trpc.thesis.all.useQuery();
  const { data: users } = trpc.admin.users.useQuery();
  const { data: logs } = trpc.auditLog.all.useQuery();
  const { data: pendingRoles, refetch: refetchPending } = trpc.roleApproval.getPending.useQuery();
  const { data: thesisStats } = trpc.admin.stats.useQuery();
  const utils = trpc.useUtils();

  const approveMutation = trpc.roleApproval.approve.useMutation({
    onSuccess: () => { toast.success("Nutzer:in wurde freigeschaltet."); refetchPending(); utils.admin.users.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const rejectMutation = trpc.roleApproval.reject.useMutation({
    onSuccess: () => { toast.success("Registrierung wurde abgelehnt."); refetchPending(); },
    onError: (e) => toast.error(e.message),
  });

  // KPI-Berechnungen
  const total = requests?.length ?? 0;
  const pending = requests?.filter((r) => r.status === "PENDING").length ?? 0;
  const matched = requests?.filter((r) => r.status === "MATCHED").length ?? 0;
  const approved = requests?.filter((r) => r.status === "FIRST_EXAMINER_ACCEPTED" || r.status === "PENDING_SECOND_EXAMINER").length ?? 0;
  const completed = requests?.filter((r) => r.status === "COMPLETED").length ?? 0;
  const rejected = requests?.filter((r) => r.status === "REJECTED").length ?? 0;
  const pendingRoleCount = (pendingRoles ?? []).filter(u => u.roleStatus === "pending").length;
  const totalUsers = users?.length ?? 0;
  // Multi-Rollen: Nutzer zählen anhand user.role (Legacy-Feld, wird synchron gehalten)
  const studentCount = users?.filter(u => u.user.role === "student").length ?? 0;
  const examinerCount = users?.filter(u => u.user.role === "examiner").length ?? 0;
  // Intern/Extern-Aufschlüsselung
  const internCount = users?.filter(u => {
    const allRoles = (u.user as any).roles?.length ? (u.user as any).roles : [u.user.role];
    return allRoles.includes("examiner");
  }).length ?? 0;
  const externCount = users?.filter(u => {
    const allRoles = (u.user as any).roles?.length ? (u.user as any).roles : [u.user.role];
    return !allRoles.includes("examiner") && allRoles.includes("second_examiner");
  }).length ?? 0;

  // Statusverteilung für Balkendiagramm
  const statusData = [
    { name: "Ausstehend", value: pending, color: "#f59e0b" },
    { name: "Matched", value: matched, color: "#3b82f6" },
    { name: "Genehmigt", value: approved, color: "#76B900" },
    { name: "Abgeschlossen", value: completed, color: "#8b5cf6" },
    { name: "Abgelehnt", value: rejected, color: "#ef4444" },
  ].filter(d => d.value > 0);

  // Letzte 6 Monate für Trendlinie
  const monthData = (thesisStats?.byMonth ?? []).slice(-6);

  return (
    <div className="space-y-6">
      {/* Hauptkennzahlen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Anfragen gesamt", value: total, sub: `${pending} ausstehend`, color: "#76B900", bg: "bg-[#76B900]/5" },
          { label: "Aktive Nutzer:innen", value: totalUsers, sub: `${studentCount} Stud. · ${internCount} intern / ${externCount} extern`, color: "#3b82f6", bg: "bg-blue-50" },
          { label: "Rollenanfragen offen", value: pendingRoleCount, sub: "Warten auf Bestätigung", color: pendingRoleCount > 0 ? "#f59e0b" : "#6b7280", bg: pendingRoleCount > 0 ? "bg-amber-50" : "bg-gray-50" },
          { label: "Abgeschlossen", value: completed, sub: `${approved} genehmigt`, color: "#8b5cf6", bg: "bg-purple-50" },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.bg} rounded-2xl p-5 border border-white shadow-sm`}>
            <div className="text-3xl font-bold mb-1" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-sm font-medium text-gray-700">{stat.label}</div>
            <div className="text-xs text-gray-500 mt-0.5">{stat.sub}</div>
          </div>
        ))}
      </div>

      <section className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm" aria-labelledby="admin-responsibilities-title">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-semibold">i</div>
          <div className="min-w-0 flex-1">
            <h2 id="admin-responsibilities-title" className="font-semibold text-gray-900">Ihre Zuständigkeiten in der Verwaltung</h2>
            <p className="text-sm text-gray-500 mt-1">Sie bearbeiten operative Vorgänge. Rollen mit erweiterten Systemrechten werden ausschließlich durch Superadmins verwaltet.</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4 mt-4 text-sm">
          <div className="rounded-xl bg-[#76B900]/5 border border-[#76B900]/20 p-4">
            <p className="font-semibold text-[#4d7900]">Sie können freigeben oder ablehnen</p>
            <ul className="mt-2 space-y-1 text-gray-700 list-disc list-inside">
              <li>Studierende des eigenen Fachbereichs</li>
            </ul>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
            <p className="font-semibold text-amber-800">Superadmin-Freigabe erforderlich</p>
            <ul className="mt-2 space-y-1 text-gray-700 list-disc list-inside">
              <li>Studierende anderer Fachbereiche</li>
              <li>Erstprüfer:innen und Zweitprüfer:innen</li>
              <li>Verwaltungsmitarbeiter:innen</li>
              <li>PA-Vorsitz, Dekanat und Studiengangsleitung</li>
              <li>Superadmin-Rollen</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Prüfer:innen-Aufschlüsselung: Intern vs. Extern */}
      {(internCount > 0 || externCount > 0) && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-3 text-sm">Prüfer:innen-Übersicht</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 flex-1">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-700">{internCount}</div>
                <div className="text-xs text-gray-500">Intern (Erst- &amp; Zweit)</div>
              </div>
            </div>
            <div className="w-px h-10 bg-gray-200" />
            <div className="flex items-center gap-2 flex-1">
              <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-700">{externCount}</div>
                <div className="text-xs text-gray-500">Extern (nur Zweit)</div>
              </div>
            </div>
            <div className="w-px h-10 bg-gray-200" />
            <div className="flex-1">
              {/* Balken: Anteil intern vs. extern */}
              {(internCount + externCount) > 0 && (
                <div>
                  <div className="flex h-3 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 transition-all"
                      style={{ width: `${Math.round((internCount / (internCount + externCount)) * 100)}%` }}
                    />
                    <div
                      className="bg-purple-400 transition-all"
                      style={{ width: `${Math.round((externCount / (internCount + externCount)) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-blue-600">{Math.round((internCount / (internCount + externCount)) * 100)} % intern</span>
                    <span className="text-[10px] text-purple-600">{Math.round((externCount / (internCount + externCount)) * 100)} % extern</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fortschrittsbalken: Bearbeitungsstand */}
      {total > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Bearbeitungsstand aller Anfragen</h2>
          <div className="space-y-3">
            {[
              { label: "Ausstehend", value: pending, color: "bg-amber-400" },
              { label: "Matched", value: matched, color: "bg-blue-500" },
              { label: "Genehmigt", value: approved, color: "bg-[#76B900]" },
              { label: "Abgeschlossen", value: completed, color: "bg-purple-500" },
              { label: "Abgelehnt", value: rejected, color: "bg-red-400" },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="w-28 text-xs text-gray-600 shrink-0">{item.label}</div>
                <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${item.color}`}
                    style={{ width: `${Math.round((item.value / total) * 100)}%` }}
                  />
                </div>
                <div className="w-12 text-xs text-gray-500 text-right shrink-0">
                  {item.value} ({Math.round((item.value / total) * 100)} %)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Statusverteilung als Balkendiagramm */}
        {statusData.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4">Statusverteilung</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={statusData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <RechartsTooltip />
                <Bar dataKey="value" name="Anfragen" radius={[4, 4, 0, 0]}>
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Trendlinie: Anfragen pro Monat */}
        {monthData.length > 1 && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4">Anfragen pro Monat</h2>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={monthData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <RechartsTooltip />
                <Line type="monotone" dataKey="count" name="Anfragen" stroke="#76B900" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Offene Rollenanfragen */}
        {pendingRoleCount > 0 && (
          <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Offene Rollenanfragen
            </h2>
            <p className="text-sm text-gray-500 mb-4">{pendingRoleCount} Nutzer:in warten auf Bestätigung ihrer Rolle.</p>
            <div className="space-y-2">
              {(pendingRoles ?? []).filter(u => u.roleStatus === "pending").slice(0, 10).map(u => (
                <div key={u.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-amber-100 gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{buildFullName({ firstName: (u as any).firstName, lastName: (u as any).lastName, academicTitle: (u as any).academicTitle, name: u.name }) || u.email}</p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium whitespace-nowrap shrink-0">
                    {u.requestedRole === "student" ? "Studierende:r" : u.requestedRole === "examiner" ? "Prüfer:in" : "Verwaltung"}
                  </span>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => approveMutation.mutate({ userId: u.id })}
                      disabled={approveMutation.isPending}
                      className="text-xs px-2.5 py-1 rounded-lg bg-[#76b900] text-white font-medium hover:bg-[#5a8c00] transition-colors disabled:opacity-50"
                    >
                      Freischalten
                    </button>
                    <button
                      onClick={() => {
                        const reason = window.prompt("Begründung (optional):") ?? undefined;
                        rejectMutation.mutate({ userId: u.id, reason });
                      }}
                      disabled={rejectMutation.isPending}
                      className="text-xs px-2.5 py-1 rounded-lg bg-red-50 text-red-600 font-medium hover:bg-red-100 transition-colors border border-red-200 disabled:opacity-50"
                    >
                      Ablehnen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Neueste Anfragen */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Neueste Anfragen</h2>
            <a href="/admin/requests" className="text-xs text-[#76B900] hover:underline font-medium">Alle anzeigen →</a>
          </div>
          {!requests?.length ? (
            <p className="text-sm text-gray-500">Noch keine Anfragen.</p>
          ) : (
            <div className="space-y-3">
              {requests.slice(0, 5).map((req) => (
                <div key={req.id} className="py-3 border-b border-gray-50 last:border-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{req.title || "(kein Titel)"}</p>
                      {req.studentName && (
                        <p className="text-xs font-medium text-[#76B900] mt-0.5">{req.studentName}</p>
                      )}
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                        {(req.programmeAbbreviation ?? req.programmeName ?? req.department) && (
                          <span className="text-xs text-gray-500">
                            <span className="font-medium">Study Programme:</span>{" "}
                            {req.programmeAbbreviation ?? req.programmeName ?? req.department}
                          </span>
                        )}
                        {req.targetSemester && (
                          <span className="text-xs text-gray-500">
                            <span className="font-medium">Semester:</span>{" "}{req.targetSemester}
                          </span>
                        )}
                        {req.createdAt && (
                          <span className="text-xs text-gray-400">
                            {new Date(req.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                        )}
                      </div>
                      {/* Beteiligte Personen – kompakte Pill-Liste */}
                      <div className="mt-2 flex flex-col gap-1">
                        {(req.firstExaminerName || (req as any).wantedExaminerName) && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-gray-400 shrink-0">Erstgutachter:in:</span>
                            {req.firstExaminerName ? (
                              <span className="font-medium text-gray-800 truncate">{req.firstExaminerName}</span>
                            ) : (
                              <span className="font-medium text-amber-700 truncate">{(req as any).wantedExaminerName} <span className="text-[10px] text-amber-500">(angefragt)</span></span>
                            )}
                          </div>
                        )}
                        {(req.secondExaminerName || (req as any).wantedSecondExaminerName) && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-gray-400 shrink-0">Zweitgutachter:in:</span>
                            {req.secondExaminerName ? (
                              <span className="flex items-center gap-1">
                                <span className="font-medium text-gray-800 truncate">{req.secondExaminerName}</span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">Zugesagt</span>
                              </span>
                            ) : (req as any).secondExaminerRejectedAt ? (
                              <span className="flex items-center gap-1">
                                <span className="font-medium text-red-700 truncate">{(req as any).wantedSecondExaminerName}</span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">Abgelehnt</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <span className="font-medium text-amber-700 truncate">{(req as any).wantedSecondExaminerName}</span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">Angefragt</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Aktivitäts-Timeline */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Letzte Aktivitäten</h2>
          {!logs?.length ? (
            <p className="text-sm text-gray-500">Noch keine Aktivitäten.</p>
          ) : (
            <div className="relative">
              <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-100" />
              <div className="space-y-4">
                {logs.slice(0, 6).map((log) => (
                  <div key={log.id} className="flex gap-4 pl-8 relative">
                    <div className="absolute left-2 top-1.5 w-3 h-3 rounded-full bg-[#76B900]/20 border-2 border-[#76B900] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{log.action.replace(/_/g, " ")}</p>
                      <p className="text-xs text-gray-500">Anfrage #{log.thesisRequestId} · {new Date(log.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// // ─── Settings (SMTP-Test) ─────────────────────────────────────────────────────
function SettingsView() {
  const [testEmail, setTestEmail] = useState("");
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const testSmtp = trpc.system2.testSmtp.useMutation({
    onSuccess: (data) => setResult(data),
    onError: (err) => setResult({ success: false, message: err.message }),
  });
  return (
    <div className="max-w-xl">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-1">SMTP-Verbindungstest</h2>
        <p className="text-sm text-gray-500 mb-5">
          Senden Sie eine Test-E-Mail, um zu prüfen, ob der SMTP-Server korrekt konfiguriert ist.
        </p>
        <div className="flex gap-3">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="test@htw-berlin.de"
            className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all"
          />
          <button
            onClick={() => { setResult(null); testSmtp.mutate({ email: testEmail }); }}
            disabled={!testEmail || testSmtp.isPending}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#76B900" }}
          >
            {testSmtp.isPending ? "Wird gesendet..." : "Test senden"}
          </button>
        </div>
        {result && (
          <div className={`mt-4 p-3.5 rounded-xl text-sm font-medium flex items-center gap-2 ${
            result.success ? "bg-primary/5 text-primary border border-primary/15" : "bg-red-50 text-red-700 border border-red-100"
          }`}>
            {result.success ? (
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            ) : (
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            )}
            {result.message}
          </div>
        )}
        <div className="mt-6 pt-5 border-t border-gray-100">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">Konfigurierte Variablen</p>
          <div className="space-y-1.5">
            {["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_FROM"].map((key) => (
              <div key={key} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded-lg">
                <span className="text-xs font-mono text-gray-600">{key}</span>
                <span className="text-xs text-gray-400">in Geheimnissen gespeichert</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Statistics ───────────────────────────────────────────────────────────────
// STATUS_COLORS – hex-Werte aus zentraler Quelle
const STATUS_COLORS: Record<string, string> = new Proxy({}, {
  get: (_t, key: string) => getStatusBadge(key).hex,
}) as Record<string, string>;
function StatisticsView() {
  const { data: stats, isLoading } = trpc.admin.stats.useQuery();
  const [crossDepartmentSemester, setCrossDepartmentSemester] = useState("ALL");
  const [timeSeriesMetric, setTimeSeriesMetric] = useState<"total" | "internal" | "incoming">("total");
  const [capacityComparisonDepartment, setCapacityComparisonDepartment] = useState<"ALL" | "FB1" | "FB2" | "FB3" | "FB4" | "FB5">("ALL");
  const { data: crossDepartment, isLoading: crossDepartmentLoading } = trpc.reporting.getCrossDepartmentSupervisions.useQuery(
    crossDepartmentSemester === "ALL" ? undefined : { semester: crossDepartmentSemester },
  );
  const { data: crossDepartmentTimeSeries, isLoading: crossDepartmentTimeSeriesLoading } = trpc.reporting.getCrossDepartmentTimeSeries.useQuery();
  const timeSeriesChartData = useMemo(() => crossDepartmentTimeSeries?.points.map((point) => ({
    semester: point.semester,
    ...Object.fromEntries(point.workloadByExaminerDepartment.map((volume) => [volume.department, volume[timeSeriesMetric]])),
  })) ?? [], [crossDepartmentTimeSeries, timeSeriesMetric]);
  const capacityComparisonData = useMemo(() => crossDepartmentTimeSeries?.points.map((point) => {
    const workload = capacityComparisonDepartment === "ALL"
      ? point.workloadByExaminerDepartment.reduce((sum, item) => sum + item.total, 0)
      : point.workloadByExaminerDepartment.find((item) => item.department === capacityComparisonDepartment)?.total ?? 0;
    const capacity = capacityComparisonDepartment === "ALL"
      ? point.capacityByExaminerDepartment.reduce((sum, item) => sum + item.capacity, 0)
      : point.capacityByExaminerDepartment.find((item) => item.department === capacityComparisonDepartment)?.capacity ?? 0;
    return { semester: point.semester, workload, capacity };
  }) ?? [], [capacityComparisonDepartment, crossDepartmentTimeSeries]);
  const departmentSeriesColors: Record<string, string> = {
    FB1: "#2563eb",
    FB2: "#0f766e",
    FB3: "#76B900",
    FB4: "#7c3aed",
    FB5: "#ea580c",
  };
  const timeSeriesMetricLabels = {
    total: "Gesamtvolumen",
    internal: "Interne Betreuungen",
    incoming: "Fachbereichsübergreifende Betreuungen",
  } as const;
  if (isLoading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-[#76B900] border-t-transparent rounded-full animate-spin" /></div>;
  if (!stats) return <p className="text-sm text-gray-400 text-center py-8">Keine Statistikdaten verfügbar.</p>;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.byStatus.map((s) => (
          <div key={s.name} className="rounded-2xl p-5 border border-gray-100 bg-white shadow-sm">
            <div className="text-3xl font-bold" style={{ color: getStatusBadge(s.name).hex }}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1 font-medium">{getStatusBadge(s.name).label}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Anfragen nach Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={stats.byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {stats.byStatus.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "#76B900"} />
                ))}
              </Pie>
              <RechartsTooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Anfragen nach Studiengang</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.byDepartment} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <RechartsTooltip />
              <Bar dataKey="value" fill="#76B900" radius={[4, 4, 0, 0]} name="Anfragen" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {stats.byMonth.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Anfragen pro Monat</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={stats.byMonth} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <RechartsTooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#76B900" strokeWidth={2} dot={{ r: 4 }} name="Anfragen" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Fachbereichsübergreifende Betreuungen</h3>
            <p className="mt-1 text-xs text-gray-500">Zeilen: Herkunftsfachbereich der Studierenden · Spalten: Fachbereich der Erstprüfer:innen</p>
          </div>
          {crossDepartment && (
            <div className="flex gap-2 text-xs font-semibold">
              <span className="rounded-full bg-[#76B900]/10 px-3 py-1.5 text-[#557f00]">{crossDepartment.internalCount} intern</span>
              <span className="rounded-full bg-violet-50 px-3 py-1.5 text-violet-700">{crossDepartment.crossDepartmentCount} übergreifend</span>
            </div>
          )}
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5">
          <label htmlFor="cross-department-semester" className="text-xs font-semibold text-gray-600">Semester</label>
          <select id="cross-department-semester" value={crossDepartmentSemester} onChange={(event) => setCrossDepartmentSemester(event.target.value)} className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#76B900]/40">
            <option value="ALL">Alle Semester</option>
            {crossDepartment?.availableSemesters.map((semester) => <option key={semester} value={semester}>{semester}</option>)}
          </select>
          <span className="text-xs text-gray-500">Die Tabelle und Volumenkennzahlen werden gemeinsam zeitlich eingegrenzt.</span>
        </div>
        {crossDepartmentLoading ? (
          <div className="py-8 text-center text-sm text-gray-400">Auswertung wird geladen …</div>
        ) : !crossDepartment || crossDepartment.total === 0 ? (
          <div className="rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">Noch keine gematchten Betreuungen für die Auswertung vorhanden.</div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="min-w-[740px] w-full text-sm">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-500">
                  <tr><th className="px-4 py-3 text-left">Studierende ↓ / Prüfer:innen →</th>{crossDepartment.departments.map((department) => <th key={department} className="px-3 py-3 text-center">{department}</th>)}</tr>
                </thead>
                <tbody>
                  {crossDepartment.matrix.map((row) => (
                    <tr key={row.studentDepartment} className="border-t border-gray-100">
                      <th className="bg-gray-50/70 px-4 py-3 text-left text-xs font-semibold text-gray-700">{row.studentDepartment}</th>
                      {row.values.map((cell) => <td key={cell.examinerDepartment} className={`px-3 py-3 text-center font-semibold ${cell.count > 0 && row.studentDepartment !== cell.examinerDepartment ? "bg-violet-50 text-violet-700" : cell.count > 0 ? "bg-[#76B900]/10 text-[#557f00]" : "text-gray-300"}`}>{cell.count || "—"}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Betreuungsvolumen je Fachbereich der Erstprüfer:innen</p>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                {crossDepartment.workloadByExaminerDepartment.map((volume) => (
                  <div key={volume.department} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                    <div className="flex items-baseline justify-between"><span className="text-xs font-semibold text-gray-600">{volume.department}</span><span className="text-lg font-bold text-gray-900">{volume.total}</span></div>
                    <p className="mt-1 text-[11px] text-gray-500"><span className="text-[#557f00]">{volume.internal} intern</span> · <span className="text-violet-700">{volume.incoming} eingehend</span></p>
                  </div>
                ))}
              </div>
            </div>
            {crossDepartment.cases.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Aktuelle fachbereichsübergreifende Fälle</p>
                <div className="divide-y divide-gray-100 rounded-xl border border-gray-100">
                  {crossDepartment.cases.slice(0, 8).map((item) => (
                    <div key={item.requestId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                      <div className="min-w-0"><p className="truncate font-medium text-gray-800">{item.title}</p><p className="mt-0.5 text-xs text-gray-500">{item.studentName ?? "Studierende:r"} · {item.examinerName ?? "Prüfer:in"}</p></div>
                      <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">{item.studentDepartment} → {item.examinerDepartment}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-900">Entwicklung der Betreuungsvolumina</h3>
            <p className="mt-1 text-xs text-gray-500">Vergleich der Betreuungsvolumina je Fachbereich über alle vorhandenen Semester.</p>
          </div>
          <div className="inline-flex rounded-xl bg-gray-100 p-1" role="group" aria-label="Volumenart auswählen">
            {(Object.entries(timeSeriesMetricLabels) as Array<[typeof timeSeriesMetric, string]>).map(([metric, label]) => (
              <button
                key={metric}
                type="button"
                onClick={() => setTimeSeriesMetric(metric)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${timeSeriesMetric === metric ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                aria-pressed={timeSeriesMetric === metric}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {crossDepartmentTimeSeriesLoading ? (
          <div className="py-12 text-center text-sm text-gray-400">Zeitreihe wird geladen …</div>
        ) : timeSeriesChartData.length === 0 ? (
          <div className="mt-4 rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">Noch keine Betreuungen mit Semesterangabe für die Zeitreihenansicht vorhanden.</div>
        ) : (
          <div className="mt-5 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeriesChartData} margin={{ top: 8, right: 20, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="semester" tick={{ fontSize: 11, fill: "#6b7280" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6b7280" }} />
                <RechartsTooltip />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                {crossDepartmentTimeSeries?.departments.map((department) => (
                  <Line
                    key={department}
                    type="monotone"
                    dataKey={department}
                    name={department}
                    stroke={departmentSeriesColors[department] ?? "#6b7280"}
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        {timeSeriesChartData.length > 0 && (
          <div className="mt-8 border-t border-gray-100 pt-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h4 className="font-semibold text-gray-900">Betreuungsvolumen im Vergleich zur Kapazität</h4>
                <p className="mt-1 text-xs text-gray-500">Die gestrichelte Linie zeigt die wirksame Erstbetreuungskapazität; administrative Überschreibungen haben Vorrang.</p>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="capacity-comparison-department" className="text-xs font-semibold text-gray-600">Fachbereich</label>
                <select
                  id="capacity-comparison-department"
                  value={capacityComparisonDepartment}
                  onChange={(event) => setCapacityComparisonDepartment(event.target.value as typeof capacityComparisonDepartment)}
                  className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#76B900]/40"
                >
                  <option value="ALL">Alle Fachbereiche</option>
                  {crossDepartmentTimeSeries?.departments.map((department) => <option key={department} value={department}>{department}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-4 h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={capacityComparisonData} margin={{ top: 8, right: 20, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="semester" tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <RechartsTooltip />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                  <Line type="monotone" dataKey="workload" name="Tatsächliches Betreuungsvolumen" stroke="#76B900" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="capacity" name="Wirksame Erstbetreuungskapazität" stroke="#475569" strokeWidth={2.5} strokeDasharray="6 4" dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Login-Protokoll ─────────────────────────────────────────────────────────
// Hilfsfunktion: User-Agent in lesbare Browser/OS-Kombination umwandeln
function parseUserAgent(ua: string | null | undefined): string {
  if (!ua) return "—";
  let browser = "Unbekannt";
  let os = "";
  // Browser
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/.test(ua)) browser = "Opera";
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = "Safari";
  else if (/MSIE|Trident/.test(ua)) browser = "Internet Explorer";
  // OS
  if (/Windows NT 10/.test(ua)) os = "Windows 10/11";
  else if (/Windows NT 6/.test(ua)) os = "Windows";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad/.test(ua)) os = "iOS";
  else if (/Linux/.test(ua)) os = "Linux";
  return os ? `${browser} / ${os}` : browser;
}

function LoginAttemptsView() {
  const [searchText, setSearchText] = useState("");
  const [onlyFailed, setOnlyFailed] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const queryInput = useMemo(() => ({
    onlyFailed,
    limit: 500,
    search: searchText.trim() || undefined,
    dateFrom: dateFrom ? new Date(dateFrom) : undefined,
    dateTo: dateTo ? new Date(dateTo) : undefined,
  }), [onlyFailed, searchText, dateFrom, dateTo]);
  const { data: attempts, isLoading } = trpc.admin.getLoginAttempts.useQuery(
    queryInput,
    { refetchInterval: 30000 }
  );
  const filtered = attempts ?? [];
  const failureLabels: Record<string, string> = {
    user_not_found: "Konto nicht gefunden",
    wrong_password: "Falsches Passwort",
    account_not_approved: "Konto nicht freigeschaltet",
    account_rejected: "Registrierungsantrag abgelehnt",
    // neue, deutschsprachige Gründe (direkt aus Backend)
    "Konto nicht gefunden": "Konto nicht gefunden",
    "Falsches Passwort": "Falsches Passwort",
    "Kein Passwort gesetzt (ehemaliges Magic-Link-Konto)": "Kein Passwort gesetzt",
    "Konto noch nicht freigeschaltet": "Konto noch nicht freigeschaltet",
    "Registrierungsantrag abgelehnt": "Registrierungsantrag abgelehnt",
    "Ung\u00fcltige E-Mail-Dom\u00e4ne (keine HTW-Berlin-Adresse)": "Ung\u00fcltige E-Mail-Dom\u00e4ne",
  };
  // Farb-Mapping pro Fehlergrund
  const failureColors: Record<string, string> = {
    "Falsches Passwort": "bg-red-50 text-red-700",
    wrong_password: "bg-red-50 text-red-700",
    "Konto nicht gefunden": "bg-orange-50 text-orange-700",
    user_not_found: "bg-orange-50 text-orange-700",
    "Kein Passwort gesetzt (ehemaliges Magic-Link-Konto)": "bg-amber-50 text-amber-700",
    "Kein Passwort gesetzt": "bg-amber-50 text-amber-700",
    "Konto noch nicht freigeschaltet": "bg-yellow-50 text-yellow-700",
    account_not_approved: "bg-yellow-50 text-yellow-700",
    "Registrierungsantrag abgelehnt": "bg-red-50 text-red-700",
    account_rejected: "bg-red-50 text-red-700",
    "Ung\u00fcltige E-Mail-Dom\u00e4ne (keine HTW-Berlin-Adresse)": "bg-purple-50 text-purple-700",
    "Ung\u00fcltige E-Mail-Dom\u00e4ne": "bg-purple-50 text-purple-700",
  };
  return (
    <div className="space-y-4">
      {/* Filterzeile */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Nach E-Mail oder Fehlergrund suchen..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 whitespace-nowrap">Von</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 whitespace-nowrap">Bis</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        {(dateFrom || dateTo || searchText) && (
          <button
            onClick={() => { setSearchText(""); setDateFrom(""); setDateTo(""); }}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >Filter zurücksetzen</button>
        )}
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={onlyFailed} onChange={(e) => setOnlyFailed(e.target.checked)} className="rounded" />
          Nur fehlgeschlagene
        </label>
        <span className="text-xs text-gray-400">{filtered.length} Einträge</span>
      </div>
      {/* Statistik-Zeile */}
      {attempts && attempts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Gesamt", value: attempts.length, color: "text-gray-700", bg: "bg-gray-50" },
            { label: "Erfolgreich", value: attempts.filter(a => a.success).length, color: "text-green-700", bg: "bg-green-50" },
            { label: "Fehlgeschlagen", value: attempts.filter(a => !a.success).length, color: "text-red-700", bg: "bg-red-50" },
            { label: "Heute", value: attempts.filter(a => new Date(a.createdAt).toDateString() === new Date().toDateString()).length, color: "text-blue-700", bg: "bg-blue-50" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl px-4 py-3 flex flex-col`}>
              <span className={`text-2xl font-bold ${s.color}`}>{s.value}</span>
              <span className="text-xs text-gray-500 mt-0.5">{s.label}</span>
            </div>
          ))}
        </div>
      )}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Zeitpunkt</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">E-Mail</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Grund</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden lg:table-cell">Browser / OS</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden md:table-cell">IP-Adresse</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-400">Lade...</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-400">Keine Einträge vorhanden.</td></tr>
              )}
              {filtered.map((a) => (
                <tr key={a.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{new Date(a.createdAt).toLocaleString("de-DE")}</td>
                  <td className="px-5 py-3 text-sm font-medium text-gray-900">{a.email}</td>
                  <td className="px-5 py-3">
                    {a.success
                      ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Erfolgreich</span>
                      : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Fehlgeschlagen</span>
                    }
                  </td>
                  <td className="px-5 py-3">
                    {a.failureReason ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${failureColors[a.failureReason] ?? "bg-gray-100 text-gray-600"}`}>
                        {failureLabels[a.failureReason] ?? a.failureReason}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500 hidden lg:table-cell">
                    {parseUserAgent((a as any).userAgent)}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-400 hidden md:table-cell font-mono">{a.ipAddress ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, hasRole } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"overview" | "requests" | "audit" | "users" | "stats" | "settings" | "role_approvals" | "email_templates" | "login_attempts">("overview");
  const [selectedUserFilter, setSelectedUserFilter] = useState<{ userId: number; userName: string } | null>(null);
  const [highlightRequestId, setHighlightRequestId] = useState<number | null>(null);

  // Zugriffskontrolle: Nur Admins und Superadmins – navigate in useEffect, nie in Render-Phase
  useEffect(() => {
    if (user && !hasRole("admin") && !hasRole("superadmin")) {
      setLocation("/");
    }
  }, [user, hasRole, setLocation]);

  if (user && !hasRole("admin") && !hasRole("superadmin")) return null;
  const { data: pendingForNav } = trpc.roleApproval.getPending.useQuery(undefined, { refetchInterval: 60000 });
  const pendingNavCount = (pendingForNav ?? []).length;
  const navItems = useNavItems(pendingNavCount);
  const currentNavItems = navItems.map((item) => ({
    ...item,
    onClick: () => {
      if (item.href === "/admin/role-approvals") setActiveTab("role_approvals");
      else if (item.href === "/admin") setActiveTab("overview");
      else if (item.href === "/admin/requests") setActiveTab("requests");
      else if (item.href === "/admin/audit") setActiveTab("audit");
      else if (item.href === "/admin/users") setActiveTab("users");
      else if (item.href === "/admin/stats") setActiveTab("stats");
      else if (item.href === "/admin/settings") setActiveTab("settings");
      else if (item.href === "/admin/email-templates") setActiveTab("email_templates");
      else if (item.href === "/admin/login-attempts") setActiveTab("login_attempts");
    },
  }));
  const titles: Record<string, string> = {
    role_approvals: "Freischaltungen",
    overview: "Verwaltungs-Dashboard",
    requests: "Alle Anfragen",
    audit: "Audit-Log",
    users: "Nutzerverwaltung",
    stats: "Statistiken",
    settings: "Einstellungen",
    email_templates: "E-Mail-Vorlagen",
    login_attempts: "Login-Protokoll",
  };
  return (
    <ThesisDashboardLayout navItems={currentNavItems} title={titles[activeTab]}>
      {activeTab === "role_approvals" && <RoleApprovalTab canApproveAll={true} />}
      {activeTab === "overview" && <Overview />}
      {activeTab === "requests" && <AllRequests userFilter={selectedUserFilter} onClearUserFilter={() => setSelectedUserFilter(null)} highlightId={highlightRequestId} onHighlightClear={() => setHighlightRequestId(null)} />}
      {activeTab === "audit" && <AuditLogView onNavigateToRequest={(id) => { setHighlightRequestId(id); setActiveTab("requests"); }} />}
      {activeTab === "users" && <UserManagement onNavigateToRequests={(userId, userName) => { setSelectedUserFilter({ userId, userName }); setActiveTab("requests"); }} />}
      {activeTab === "stats" && <StatisticsView />}
      {activeTab === "settings" && <SettingsView />}
      {activeTab === "email_templates" && <EmailTemplatesTab />}
      {activeTab === "login_attempts" && <LoginAttemptsView />}
    </ThesisDashboardLayout>
  );
}
