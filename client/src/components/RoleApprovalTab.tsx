import { useState } from "react";
import { CheckCircle, XCircle, Clock, User, RefreshCw, AlertCircle, Pencil, GraduationCap, BookOpen, Building2, CheckCheck, Mail, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { buildFullName, getRoleBadge } from "@shared/const";
import { useLanguage } from "@/contexts/LanguageContext";

const ROLE_LABELS: Record<string, string> = {
  student: "Studierende:r",
  examiner: "Prüfer:in (Erstprüfer:in)",
  second_examiner: "Zweitprüfer:in",
  admin: "Verwaltung",
  pav: "PA-Vorsitz",
  dean: "Dekan:in",
  vice_dean: "Prodekan:in",
  superadmin: "Superadmin",
  user: "Unbekannt",
  programme_director: "Studiengangsleitung",
};

const ALL_ASSIGNABLE_ROLES = [
  "student",
  "examiner",
  "second_examiner",
  "admin",
  "pav",
  "dean",
  "vice_dean",
  "programme_director",
] as const;

type PendingUser = {
  id: number;
  name: string | null;
  email: string | null;
  role: string;
  requestedRole: string | null;
  roleStatus: string;
  createdAt: Date;
  loginMethod: string | null;
  firstName?: string | null;
  lastName?: string | null;
  academicTitle?: string | null;
  department?: string | null;
  matrikelNr?: string | null;
  thesisType?: string | null;
  programmeName?: string | null;
  programmeAbbreviation?: string | null;
};

type RejectDialogState = { open: boolean; user: PendingUser | null; reason: string };
type EditRoleDialogState = { open: boolean; user: PendingUser | null; selectedRole: string };
type ApproveAllDialogState = { open: boolean; users: PendingUser[]; groupTitle: string };
const ADMIN_DEPARTMENTS = ["FB1", "FB2", "FB3", "FB4", "FB5"] as const;

// ── Einzelne Nutzer-Karte ─────────────────────────────────────────────────────
function UserCard({
  user,
  onApprove,
  onReject,
  onEditRole,
  approvePending,
  rejectPending,
  canApproveAdministrative,
}: {
  user: PendingUser;
  onApprove: (user: PendingUser, adminDepartment?: string) => void;
  onReject: (u: PendingUser) => void;
  onEditRole: (u: PendingUser) => void;
  approvePending: boolean;
  rejectPending: boolean;
  canApproveAdministrative: boolean;
}) {
  const [adminDepartment, setAdminDepartment] = useState<(typeof ADMIN_DEPARTMENTS)[number]>("FB3");
  const [examinerDepartment, setExaminerDepartment] = useState<(typeof ADMIN_DEPARTMENTS)[number]>("FB3");
  const utils = trpc.useUtils();
  const assignDepartmentMutation = trpc.roleApproval.assignPendingExaminerDepartment.useMutation({
    onSuccess: async () => {
      await utils.roleApproval.getPending.invalidate();
      toast.success("Fachbereich wurde ergänzt. Die Freigabe kann jetzt direkt erfolgen.");
    },
    onError: (error) => toast.error(error.message ?? "Fachbereich konnte nicht ergänzt werden."),
  });
  const displayName = buildFullName({
    firstName: user.firstName,
    lastName: user.lastName,
    academicTitle: user.academicTitle,
    name: user.name,
  }) || user.email || `Nutzer:in #${user.id}`;

  const requestedLabel = ROLE_LABELS[user.requestedRole ?? ""] ?? user.requestedRole ?? "–";
  const requestedBadge = getRoleBadge(user.requestedRole ?? "");
  const registeredAt = user.createdAt ? new Date(user.createdAt).toLocaleDateString("de-DE") : "–";
  const canActOnUser = canApproveAdministrative || user.requestedRole === "student" || (user.requestedRole === "examiner" && Boolean(user.department));
  const hasMissingExaminerDepartment = user.requestedRole === "examiner" && !user.department;

  return (
    <Card className="border border-gray-200 shadow-none">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Nutzer-Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-900 truncate">{displayName}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${requestedBadge.className}`}>
                {requestedLabel}
              </span>
              <button
                onClick={() => onEditRole(user)}
                disabled={!canActOnUser}
                className="text-gray-400 hover:text-blue-600 transition-colors"
                title={canActOnUser ? "Gewünschte Rolle anpassen" : "Diese Rolle kann nur durch Superadmins bearbeitet werden"}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-sm font-medium text-slate-700">
              <Mail className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              <span className="shrink-0 text-slate-500">E-Mail:</span>
              <span className="truncate">{user.email ?? "nicht angegeben"}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {user.department ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">
                  <Building2 className="h-3.5 w-3.5 text-blue-600" />
                  Fachbereich {user.department}
                </span>
              ) : user.requestedRole === "student" || user.requestedRole === "examiner" ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Fachbereich nicht angegeben{user.requestedRole === "examiner" ? " · Bitte direkt ergänzen" : ""}
                </span>
              ) : null}
              {(user.programmeAbbreviation || user.programmeName) && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-800">
                  <BookOpen className="h-3.5 w-3.5 text-violet-600" />
                  <span>Studiengang: {user.programmeAbbreviation ?? user.programmeName}</span>
                  {user.programmeAbbreviation && user.programmeName && <span className="font-normal text-violet-700">· {user.programmeName}</span>}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Registriert: {registeredAt}
              </span>
              {user.matrikelNr && (
                <span>Matr.-Nr.: {user.matrikelNr}</span>
              )}
            </div>
          </div>

          {/* Aktions-Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {hasMissingExaminerDepartment && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs">
                {canApproveAdministrative ? (
                  <select
                    value={examinerDepartment}
                    onChange={(event) => setExaminerDepartment(event.target.value as (typeof ADMIN_DEPARTMENTS)[number])}
                    disabled={assignDepartmentMutation.isPending}
                    className="h-7 rounded border border-amber-200 bg-white px-1.5 text-xs text-gray-800"
                    aria-label="Fachbereich für Erstprüfer:in"
                  >
                    {ADMIN_DEPARTMENTS.map((department) => <option key={department} value={department}>{department}</option>)}
                  </select>
                ) : (
                  <span className="font-medium text-amber-900">Eigenen Fachbereich übernehmen</span>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 border-amber-300 bg-white px-2 text-xs text-amber-900 hover:bg-amber-100"
                  onClick={() => assignDepartmentMutation.mutate({ userId: user.id, department: canApproveAdministrative ? examinerDepartment : undefined })}
                  disabled={assignDepartmentMutation.isPending}
                >
                  {assignDepartmentMutation.isPending ? "Wird ergänzt …" : "Zuordnen"}
                </Button>
              </div>
            )}
            {user.requestedRole === "admin" && (
              <div className="flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1.5 text-xs">
                <span className="font-medium text-purple-900">Verwaltungsrecht:</span>
                <select
                  value={adminDepartment}
                  onChange={(event) => setAdminDepartment(event.target.value as (typeof ADMIN_DEPARTMENTS)[number])}
                  disabled={!canApproveAdministrative || approvePending}
                  className="h-7 rounded border border-purple-200 bg-white px-1.5 text-xs text-gray-800 disabled:cursor-not-allowed"
                  aria-label="Fachbereichsrecht der Verwaltung"
                >
                  {ADMIN_DEPARTMENTS.map((department) => <option key={department} value={department}>Verwaltung {department}</option>)}
                </select>
              </div>
            )}
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => onReject(user)}
              disabled={rejectPending || !canActOnUser}
              title={!canActOnUser ? "Diese Rolle kann nur durch Superadmins bearbeitet werden" : undefined}
            >
              <XCircle className="w-4 h-4" />
              Ablehnen
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-[#76B900] hover:bg-[#5a8c00] text-white"
              onClick={() => onApprove(user, user.requestedRole === "admin" ? adminDepartment : undefined)}
              disabled={approvePending || !canActOnUser || (user.requestedRole === "admin" && !canApproveAdministrative)}
              title={!canActOnUser ? "Diese Rolle kann nur durch Superadmins bearbeitet werden" : user.requestedRole === "admin" && !canApproveAdministrative ? "Die Freischaltung der Verwaltung erfolgt ausschließlich durch Superadmins." : undefined}
            >
              <CheckCircle className="w-4 h-4" />
              Freischalten
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Gruppen-Abschnitt ─────────────────────────────────────────────────────────
function GroupSection({
  title,
  icon,
  users,
  onApprove,
  onReject,
  onEditRole,
  onApproveAll,
  approvePending,
  rejectPending,
  accentColor,
  canApproveAdministrative,
}: {
  title: string;
  icon: React.ReactNode;
  users: PendingUser[];
  onApprove: (user: PendingUser, adminDepartment?: string) => void;
  onReject: (u: PendingUser) => void;
  onEditRole: (u: PendingUser) => void;
  onApproveAll: (users: PendingUser[]) => void;
  approvePending: boolean;
  rejectPending: boolean;
  accentColor: string;
  canApproveAdministrative: boolean;
}) {
  if (users.length === 0) return null;
  return (
    <section>
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accentColor}`}>
          {icon}
        </div>
        <span className="text-sm font-semibold text-gray-800">{title}</span>
        <span className="text-xs font-medium text-white bg-amber-500 rounded-full px-2 py-0.5 leading-none">
          {users.length}
        </span>
        {users.length > 1 && !users.some((user) => user.requestedRole === "admin") && (canApproveAdministrative || users.every((user) => user.requestedRole === "student" || (user.requestedRole === "examiner" && Boolean(user.department)))) && (
          <Button
            size="sm"
            variant="outline"
            className="ml-auto gap-1.5 text-xs h-7 border-[#76B900] text-[#76B900] hover:bg-[#76B900]/10"
            onClick={() => onApproveAll(users)}
            disabled={approvePending}
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Alle {users.length} freischalten
          </Button>
        )}
      </div>
      <div className="space-y-3 pl-0">
        {users.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            onApprove={onApprove}
            onReject={onReject}
            onEditRole={onEditRole}
            approvePending={approvePending}
            rejectPending={rejectPending}
            canApproveAdministrative={canApproveAdministrative}
          />
        ))}
      </div>
    </section>
  );
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────
export default function RoleApprovalTab({
  canApproveAll = false,
  view = "standard",
}: {
  canApproveAll?: boolean;
  view?: "standard" | "cross_department";
}) {
  const utils = trpc.useUtils();
  const { lang } = useLanguage();
  const messages = lang === "en"
    ? {
        approved: "User has been approved.",
        approveError: "Unable to approve the user.",
        manyPartial: (succeeded: number, failed: number) => `${succeeded} approved, ${failed} failed.`,
        manyApproved: (count: number) => `${count} ${count === 1 ? "person has" : "people have"} been approved.`,
        rejected: "Registration has been declined.",
        rejectError: "Unable to decline the registration.",
        roleUpdated: "Requested role has been updated.",
        roleError: "Unable to update the requested role.",
      }
    : {
        approved: "Nutzer:in wurde freigeschaltet.",
        approveError: "Fehler beim Freischalten.",
        manyPartial: (succeeded: number, failed: number) => `${succeeded} freigeschaltet, ${failed} fehlgeschlagen.`,
        manyApproved: (count: number) => `${count} Person${count !== 1 ? "en" : ""} wurden freigeschaltet.`,
        rejected: "Registrierung wurde abgelehnt.",
        rejectError: "Fehler beim Ablehnen.",
        roleUpdated: "Gewünschte Rolle wurde angepasst.",
        roleError: "Fehler beim Anpassen der Rolle.",
      };

  const [rejectDialog, setRejectDialog] = useState<RejectDialogState>({
    open: false,
    user: null,
    reason: "",
  });

  const [editRoleDialog, setEditRoleDialog] = useState<EditRoleDialogState>({
    open: false,
    user: null,
    selectedRole: "",
  });

  const [approveAllDialog, setApproveAllDialog] = useState<ApproveAllDialogState>({
    open: false,
    users: [],
    groupTitle: "",
  });
  const [searchTerm, setSearchTerm] = useState("");

  const pendingQuery = trpc.roleApproval.getPending.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const approveMutation = trpc.roleApproval.approve.useMutation({
    onSuccess: async () => {
      await utils.roleApproval.getPending.invalidate();
      toast.success(messages.approved);
    },
    onError: (err) => {
      toast.error(err.message ?? messages.approveError);
    },
  });

  const approveManyMutation = trpc.roleApproval.approveMany.useMutation({
    onSuccess: async (data) => {
      await utils.roleApproval.getPending.invalidate();
      setApproveAllDialog({ open: false, users: [], groupTitle: "" });
      if (data.failed > 0) {
        toast.warning(messages.manyPartial(data.succeeded, data.failed));
      } else {
        toast.success(messages.manyApproved(data.succeeded));
      }
    },
    onError: (err) => {
      toast.error(err.message ?? messages.approveError);
    },
  });

  const rejectMutation = trpc.roleApproval.reject.useMutation({
    onSuccess: async () => {
      await utils.roleApproval.getPending.invalidate();
      setRejectDialog({ open: false, user: null, reason: "" });
      toast.success(messages.rejected);
    },
    onError: (err) => {
      toast.error(err.message ?? messages.rejectError);
    },
  });

  const updateRoleMutation = trpc.roleApproval.updateRequestedRole.useMutation({
    onSuccess: async () => {
      await utils.roleApproval.getPending.invalidate();
      setEditRoleDialog({ open: false, user: null, selectedRole: "" });
      toast.success(messages.roleUpdated);
    },
    onError: (err) => {
      toast.error(err.message ?? messages.roleError);
    },
  });

  const searchValue = searchTerm.trim().toLocaleLowerCase("de-DE");
  const pending = (pendingQuery.data ?? []).filter((user) => {
    if (!searchValue) return true;
    const name = buildFullName({ firstName: user.firstName, lastName: user.lastName, academicTitle: user.academicTitle, name: user.name }) ?? "";
    return `${name} ${user.email ?? ""}`.toLocaleLowerCase("de-DE").includes(searchValue);
  });

  // Gruppen aufteilen nach requestedRole
  const VERWALTUNG_ROLES = ["admin", "pav", "dean", "vice_dean", "superadmin", "programme_director"];
  const PRUEFER_ROLES = ["examiner", "second_examiner"];
  const STUDENT_ROLES = ["student"];

  const groupVerwaltung = pending.filter((u) => VERWALTUNG_ROLES.includes(u.requestedRole ?? u.role ?? ""));
  const groupStudierende = pending.filter((u) => STUDENT_ROLES.includes(u.requestedRole ?? u.role ?? ""));
  const groupPruefer = pending.filter((u) => PRUEFER_ROLES.includes(u.requestedRole ?? u.role ?? ""));
  const groupSonstige = pending.filter(
    (u) => ![...VERWALTUNG_ROLES, ...PRUEFER_ROLES, ...STUDENT_ROLES].includes(u.requestedRole ?? u.role ?? "")
  );
  const studentsByDepartment = ADMIN_DEPARTMENTS.map((department) => ({
    department,
    users: groupStudierende.filter((user) => user.department === department),
  }));
  const centralApprovals = pending.filter((user) => {
    const role = user.requestedRole ?? user.role ?? "";
    return role !== "student" || !user.department;
  });

  const handleApprove = (user: PendingUser, adminDepartment?: string) => {
    approveMutation.mutate({
      userId: user.id,
      adminDepartment: adminDepartment as "FB1" | "FB2" | "FB3" | "FB4" | "FB5" | undefined,
    });
  };

  const handleApproveAllOpen = (users: PendingUser[], groupTitle: string) => {
    setApproveAllDialog({ open: true, users, groupTitle });
  };

  const handleApproveAllConfirm = () => {
    approveManyMutation.mutate({ userIds: approveAllDialog.users.map((u) => u.id) });
  };

  const handleRejectOpen = (user: PendingUser) => {
    setRejectDialog({ open: true, user, reason: "" });
  };

  const handleRejectConfirm = () => {
    if (!rejectDialog.user) return;
    rejectMutation.mutate({
      userId: rejectDialog.user.id,
      reason: rejectDialog.reason || undefined,
    });
  };

  const handleEditRoleOpen = (user: PendingUser) => {
    setEditRoleDialog({
      open: true,
      user,
      selectedRole: user.requestedRole ?? "student",
    });
  };

  const handleEditRoleConfirm = () => {
    if (!editRoleDialog.user || !editRoleDialog.selectedRole) return;
    updateRoleMutation.mutate({
      userId: editRoleDialog.user.id,
      newRole: editRoleDialog.selectedRole as any,
    });
  };

  const anyPending = approveMutation.isPending || approveManyMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{view === "cross_department" ? "Fachbereichsübergreifende Freigaben" : "Freischaltungen"}</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {view === "cross_department" ? "Alle fachbereichsbezogenen Anfragen und zentral zu bearbeitenden Rollen auf einen Blick." : "Neue Registrierungen, die auf Freischaltung warten"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => utils.roleApproval.getPending.invalidate()}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Aktualisieren
        </Button>
      </div>

      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Nach Name oder E-Mail suchen"
          aria-label="Offene Registrierungen nach Name oder E-Mail durchsuchen"
          className="h-10 w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#76B900] focus:ring-2 focus:ring-[#76B900]/20"
        />
      </div>

      {/* Leer-Zustand */}
      {pendingQuery.isLoading && (
        <div className="flex items-center justify-center py-12 text-gray-400 gap-3">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Wird geladen …</span>
        </div>
      )}

      {!pendingQuery.isLoading && pending.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle className="w-12 h-12 text-primary/60 mb-3" />
            <p className="font-medium text-gray-700">{searchValue ? "Keine passenden Registrierungen" : "Keine ausstehenden Registrierungen"}</p>
            <p className="text-sm text-gray-400 mt-1">{searchValue ? "Passen Sie den Suchbegriff an oder setzen Sie ihn zurück." : "Alle Anfragen wurden bearbeitet."}</p>
          </CardContent>
        </Card>
      )}

      {/* Anfragen-Liste – nach Gruppen unterteilt */}
      {pending.length > 0 && (
        <div className="space-y-8">
          {view === "cross_department" ? (
            <>
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                <strong>{groupStudierende.length}</strong> studentische Anfragen verteilen sich auf die fünf Fachbereiche. Die Aktionen in jeder Gruppe werden direkt auf die ausgewählten Personen angewendet.
              </div>
              {studentsByDepartment.map(({ department, users }) => (
                <GroupSection
                  key={department}
                  title={`${department} · Studierende`}
                  icon={<Building2 className="w-4 h-4 text-blue-600" />}
                  accentColor="bg-blue-100"
                  users={users}
                  onApprove={handleApprove}
                  onReject={handleRejectOpen}
                  onEditRole={handleEditRoleOpen}
                  onApproveAll={(u) => handleApproveAllOpen(u, `${department} · Studierende`)}
                  approvePending={anyPending}
                  rejectPending={rejectMutation.isPending}
                  canApproveAdministrative={canApproveAll}
                />
              ))}
              <GroupSection
                title="Zentrale Rollenfreigaben"
                icon={<AlertCircle className="w-4 h-4 text-amber-600" />}
                accentColor="bg-amber-100"
                users={centralApprovals}
                onApprove={handleApprove}
                onReject={handleRejectOpen}
                onEditRole={handleEditRoleOpen}
                onApproveAll={(u) => handleApproveAllOpen(u, "Zentrale Rollenfreigaben")}
                approvePending={anyPending}
                rejectPending={rejectMutation.isPending}
                canApproveAdministrative={canApproveAll}
              />
            </>
          ) : <>
            <GroupSection
              title="Verwaltung"
              icon={<Building2 className="w-4 h-4 text-purple-600" />}
              accentColor="bg-purple-100"
              users={groupVerwaltung}
              onApprove={handleApprove}
              onReject={handleRejectOpen}
              onEditRole={handleEditRoleOpen}
              onApproveAll={(u) => handleApproveAllOpen(u, "Verwaltung")}
              approvePending={anyPending}
              rejectPending={rejectMutation.isPending}
              canApproveAdministrative={canApproveAll}
            />
            <GroupSection
              title="Studierende"
              icon={<GraduationCap className="w-4 h-4 text-blue-600" />}
              accentColor="bg-blue-100"
              users={groupStudierende}
              onApprove={handleApprove}
              onReject={handleRejectOpen}
              onEditRole={handleEditRoleOpen}
              onApproveAll={(u) => handleApproveAllOpen(u, "Studierende")}
              approvePending={anyPending}
              rejectPending={rejectMutation.isPending}
              canApproveAdministrative={canApproveAll}
            />
            <GroupSection
              title="Prüfer:innen"
              icon={<BookOpen className="w-4 h-4 text-green-600" />}
              accentColor="bg-green-100"
              users={groupPruefer}
              onApprove={handleApprove}
              onReject={handleRejectOpen}
              onEditRole={handleEditRoleOpen}
              onApproveAll={(u) => handleApproveAllOpen(u, "Prüfer:innen")}
              approvePending={anyPending}
              rejectPending={rejectMutation.isPending}
              canApproveAdministrative={canApproveAll}
            />
            {groupSonstige.length > 0 && (
            <GroupSection
              title="Sonstige"
              icon={<User className="w-4 h-4 text-gray-600" />}
              accentColor="bg-gray-100"
              users={groupSonstige}
              onApprove={handleApprove}
              onReject={handleRejectOpen}
              onEditRole={handleEditRoleOpen}
              onApproveAll={(u) => handleApproveAllOpen(u, "Sonstige")}
              approvePending={anyPending}
              rejectPending={rejectMutation.isPending}
              canApproveAdministrative={canApproveAll}
            />
            )}
          </>}
        </div>
      )}

      {/* Hinweis */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p>
          Bei jeder neuen Registrierung erhalten Sie automatisch eine E-Mail-Benachrichtigung.
          {canApproveAll ? <> Als Superadmin können Sie alle Anfragen bearbeiten und Fachbereichsrechte zuweisen.</> : <> Sie können <strong>Studierende sowie interne Erstprüfer:innen Ihres zugeordneten Fachbereichs</strong> freischalten oder ablehnen.</>}
          Die gewünschte Rolle kann vor der Freischaltung über das Stift-Symbol angepasst werden.
          Nach der Freischaltung wird die Person per E-Mail informiert.
        </p>
      </div>

      {/* Alle freischalten – Bestätigungs-Dialog */}
      <Dialog
        open={approveAllDialog.open}
        onOpenChange={(open) => setApproveAllDialog((s) => ({ ...s, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alle {approveAllDialog.groupTitle} freischalten?</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-gray-600 space-y-2">
            <p>
              Sie sind dabei,{" "}
              <strong>
                {approveAllDialog.users.length} Person{approveAllDialog.users.length !== 1 ? "en" : ""}
              </strong>{" "}
              aus der Gruppe <strong>{approveAllDialog.groupTitle}</strong> auf einmal freizuschalten:
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-gray-500 max-h-48 overflow-y-auto">
              {approveAllDialog.users.map((u) => (
                <li key={u.id} className="truncate">
                  {buildFullName({ firstName: u.firstName, lastName: u.lastName, academicTitle: u.academicTitle, name: u.name }) || u.email}
                </li>
              ))}
            </ul>
            <p className="text-gray-400 text-xs pt-1">
              Jede Person erhält nach der Freischaltung automatisch eine E-Mail-Benachrichtigung.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setApproveAllDialog({ open: false, users: [], groupTitle: "" })}
            >
              Abbrechen
            </Button>
            <Button
              className="bg-[#76B900] hover:bg-[#5a8c00] text-white gap-2"
              onClick={handleApproveAllConfirm}
              disabled={approveManyMutation.isPending}
            >
              <CheckCheck className="w-4 h-4" />
              {approveManyMutation.isPending
                ? "Wird verarbeitet …"
                : `Alle ${approveAllDialog.users.length} freischalten`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rolle anpassen – Dialog */}
      <Dialog
        open={editRoleDialog.open}
        onOpenChange={(open) => setEditRoleDialog((s) => ({ ...s, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gewünschte Rolle anpassen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600">
              Passen Sie die Rolle für{" "}
              <strong>
                {buildFullName({
                  firstName: (editRoleDialog.user as any)?.firstName,
                  lastName: (editRoleDialog.user as any)?.lastName,
                  academicTitle: (editRoleDialog.user as any)?.academicTitle,
                  name: editRoleDialog.user?.name,
                }) || editRoleDialog.user?.email}
              </strong>{" "}
              vor der endgültigen Freischaltung an.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="edit-role-select">Neue Rolle</Label>
              <Select
                value={editRoleDialog.selectedRole}
                onValueChange={(val) => setEditRoleDialog((s) => ({ ...s, selectedRole: val }))}
              >
                <SelectTrigger id="edit-role-select">
                  <SelectValue placeholder="Rolle wählen …" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_ASSIGNABLE_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setEditRoleDialog({ open: false, user: null, selectedRole: "" })}
            >
              Abbrechen
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleEditRoleConfirm}
              disabled={updateRoleMutation.isPending || !editRoleDialog.selectedRole}
            >
              Rolle speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ablehnen – Dialog */}
      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) => setRejectDialog((s) => ({ ...s, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrierung ablehnen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600">
              Möchten Sie die Registrierung von{" "}
              <strong>
                {buildFullName({
                  firstName: (rejectDialog.user as any)?.firstName,
                  lastName: (rejectDialog.user as any)?.lastName,
                  academicTitle: (rejectDialog.user as any)?.academicTitle,
                  name: rejectDialog.user?.name,
                }) || rejectDialog.user?.email}
              </strong>{" "}
              ablehnen?
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="reject-reason">Begründung (optional)</Label>
              <Textarea
                id="reject-reason"
                placeholder="Optionale Begründung für die Ablehnung …"
                value={rejectDialog.reason}
                onChange={(e) => setRejectDialog((s) => ({ ...s, reason: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRejectDialog({ open: false, user: null, reason: "" })}
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectMutation.isPending}
            >
              Ablehnen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
