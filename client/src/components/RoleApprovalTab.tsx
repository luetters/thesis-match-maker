import { useState } from "react";
import { CheckCircle, XCircle, Clock, User, RefreshCw, AlertCircle, Pencil, GraduationCap, BookOpen, Building2, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { buildFullName } from "@shared/const";

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
};

const ALL_ASSIGNABLE_ROLES = [
  "student",
  "examiner",
  "second_examiner",
  "admin",
  "pav",
  "dean",
  "vice_dean",
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
};

type RejectDialogState = { open: boolean; user: PendingUser | null; reason: string };
type EditRoleDialogState = { open: boolean; user: PendingUser | null; selectedRole: string };
type ApproveAllDialogState = { open: boolean; users: PendingUser[]; groupTitle: string };

// ── Einzelne Nutzer-Karte ─────────────────────────────────────────────────────
function UserCard({
  user,
  onApprove,
  onReject,
  onEditRole,
  approvePending,
  rejectPending,
}: {
  user: PendingUser;
  onApprove: (id: number) => void;
  onReject: (u: PendingUser) => void;
  onEditRole: (u: PendingUser) => void;
  approvePending: boolean;
  rejectPending: boolean;
}) {
  const displayName = buildFullName({
    firstName: user.firstName,
    lastName: user.lastName,
    academicTitle: user.academicTitle,
    name: user.name,
  }) || user.email || `Nutzer:in #${user.id}`;

  const requestedLabel = ROLE_LABELS[user.requestedRole ?? ""] ?? user.requestedRole ?? "–";
  const registeredAt = user.createdAt ? new Date(user.createdAt).toLocaleDateString("de-DE") : "–";

  return (
    <Card className="border border-gray-200 shadow-none">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Nutzer-Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-900 truncate">{displayName}</span>
              <Badge variant="outline" className="text-xs shrink-0">
                {requestedLabel}
              </Badge>
              <button
                onClick={() => onEditRole(user)}
                className="text-gray-400 hover:text-blue-600 transition-colors"
                title="Gewünschte Rolle anpassen"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-0.5 truncate">{user.email}</p>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Registriert: {registeredAt}
              </span>
              {user.department && (
                <span className="truncate">{user.department}</span>
              )}
              {user.matrikelNr && (
                <span>Matr.-Nr.: {user.matrikelNr}</span>
              )}
            </div>
          </div>

          {/* Aktions-Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => onReject(user)}
              disabled={rejectPending}
            >
              <XCircle className="w-4 h-4" />
              Ablehnen
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-[#76B900] hover:bg-[#5a8c00] text-white"
              onClick={() => onApprove(user.id)}
              disabled={approvePending}
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
}: {
  title: string;
  icon: React.ReactNode;
  users: PendingUser[];
  onApprove: (id: number) => void;
  onReject: (u: PendingUser) => void;
  onEditRole: (u: PendingUser) => void;
  onApproveAll: (users: PendingUser[]) => void;
  approvePending: boolean;
  rejectPending: boolean;
  accentColor: string;
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
        {users.length > 1 && (
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
          />
        ))}
      </div>
    </section>
  );
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────
export default function RoleApprovalTab({ canApproveAll = false }: { canApproveAll?: boolean }) {
  const utils = trpc.useUtils();

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

  const pendingQuery = trpc.roleApproval.getPending.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const approveMutation = trpc.roleApproval.approve.useMutation({
    onSuccess: async () => {
      await utils.roleApproval.getPending.invalidate();
      toast.success("Nutzer:in wurde freigeschaltet.");
    },
    onError: (err) => {
      toast.error(err.message ?? "Fehler beim Freischalten.");
    },
  });

  const approveManyMutation = trpc.roleApproval.approveMany.useMutation({
    onSuccess: async (data) => {
      await utils.roleApproval.getPending.invalidate();
      setApproveAllDialog({ open: false, users: [], groupTitle: "" });
      if (data.failed > 0) {
        toast.warning(`${data.succeeded} freigeschaltet, ${data.failed} fehlgeschlagen.`);
      } else {
        toast.success(`${data.succeeded} Person${data.succeeded !== 1 ? "en" : ""} wurden freigeschaltet.`);
      }
    },
    onError: (err) => {
      toast.error(err.message ?? "Fehler bei der Gruppen-Freischaltung.");
    },
  });

  const rejectMutation = trpc.roleApproval.reject.useMutation({
    onSuccess: async () => {
      await utils.roleApproval.getPending.invalidate();
      setRejectDialog({ open: false, user: null, reason: "" });
      toast.success("Registrierung wurde abgelehnt.");
    },
    onError: (err) => {
      toast.error(err.message ?? "Fehler beim Ablehnen.");
    },
  });

  const updateRoleMutation = trpc.roleApproval.updateRequestedRole.useMutation({
    onSuccess: async () => {
      await utils.roleApproval.getPending.invalidate();
      setEditRoleDialog({ open: false, user: null, selectedRole: "" });
      toast.success("Gewünschte Rolle wurde angepasst.");
    },
    onError: (err) => {
      toast.error(err.message ?? "Fehler beim Anpassen der Rolle.");
    },
  });

  const pending = pendingQuery.data ?? [];

  // Gruppen aufteilen nach requestedRole
  const VERWALTUNG_ROLES = ["admin", "pav", "dean", "vice_dean", "superadmin"];
  const PRUEFER_ROLES = ["examiner", "second_examiner"];
  const STUDENT_ROLES = ["student"];

  const groupVerwaltung = pending.filter((u) => VERWALTUNG_ROLES.includes(u.requestedRole ?? u.role ?? ""));
  const groupStudierende = pending.filter((u) => STUDENT_ROLES.includes(u.requestedRole ?? u.role ?? ""));
  const groupPruefer = pending.filter((u) => PRUEFER_ROLES.includes(u.requestedRole ?? u.role ?? ""));
  const groupSonstige = pending.filter(
    (u) => ![...VERWALTUNG_ROLES, ...PRUEFER_ROLES, ...STUDENT_ROLES].includes(u.requestedRole ?? u.role ?? "")
  );

  const handleApprove = (userId: number) => {
    approveMutation.mutate({ userId });
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
          <h2 className="text-xl font-bold text-gray-900">Freischaltungen</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Neue Registrierungen, die auf Freischaltung warten
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
            <p className="font-medium text-gray-700">Keine ausstehenden Registrierungen</p>
            <p className="text-sm text-gray-400 mt-1">Alle Anfragen wurden bearbeitet.</p>
          </CardContent>
        </Card>
      )}

      {/* Anfragen-Liste – nach Gruppen unterteilt */}
      {pending.length > 0 && (
        <div className="space-y-8">
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
            />
          )}
        </div>
      )}

      {/* Hinweis */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p>
          Bei jeder neuen Registrierung erhalten Sie automatisch eine E-Mail-Benachrichtigung.
          Die Verwaltung kann <strong>Studierende</strong>, <strong>Erstprüfer:innen</strong> und <strong>Zweitprüfer:innen</strong> freischalten.
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
