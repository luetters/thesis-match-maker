import { useState } from "react";
import { CheckCircle, XCircle, Clock, User, RefreshCw, AlertCircle, Pencil } from "lucide-react";
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
  targetSemester?: string | null;
  staffId?: string | null;
  phone?: string | null;
};

type RejectDialogState = {
  open: boolean;
  user: PendingUser | null;
  reason: string;
};

type EditRoleDialogState = {
  open: boolean;
  user: PendingUser | null;
  selectedRole: string;
};

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
  const visiblePending = pending;

  const handleApprove = (userId: number) => {
    approveMutation.mutate({ userId });
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Freischaltung neuer Kolleg:innen</h2>
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

      {!pendingQuery.isLoading && visiblePending.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle className="w-12 h-12 text-primary/60 mb-3" />
            <p className="font-medium text-gray-700">Keine ausstehenden Registrierungen</p>
            <p className="text-sm text-gray-400 mt-1">Alle Anfragen wurden bearbeitet.</p>
          </CardContent>
        </Card>
      )}

      {/* Anfragen-Liste */}
      {visiblePending.length > 0 && (
        <div className="space-y-3">
          {visiblePending.map((user) => (
            <Card key={user.id} className="border border-amber-200 bg-amber-50/30">
              <CardContent className="flex items-start gap-4 p-4">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-5 h-5 text-amber-600" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 truncate">
                      {buildFullName({ firstName: (user as any).firstName, lastName: (user as any).lastName, academicTitle: (user as any).academicTitle, name: user.name }) || user.email || `Nutzer #${user.id}`}
                    </span>
                    <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                      <Clock className="w-3 h-3 mr-1" />
                      Ausstehend
                    </Badge>
                  </div>
                  {/* E-Mail */}
                  <p className="text-sm text-gray-500 mt-0.5 truncate">{user.email}</p>

                  {/* Detailzeile 1: Rolle + Datum */}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      Gewünschte Rolle:
                      <strong className="text-gray-700 ml-1">
                        {ROLE_LABELS[user.requestedRole ?? ""] ?? user.requestedRole ?? "–"}
                      </strong>
                      <button
                        type="button"
                        title="Rolle anpassen"
                        onClick={() => handleEditRoleOpen(user)}
                        className="ml-1 text-blue-500 hover:text-blue-700 transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </span>
                    <span>·</span>
                    <span>
                      {new Date(user.createdAt).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </span>
                    {user.loginMethod && (
                      <>
                        <span>·</span>
                        <span>{user.loginMethod}</span>
                      </>
                    )}
                  </div>

                  {/* Detailzeile 2: rollenspezifische Zusatzinfos */}
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                    {/* Prüfer:innen: Fachbereich + Personalnummer */}
                    {(user.requestedRole === "examiner" || user.requestedRole === "second_examiner") && (
                      <>
                        {user.department && (
                          <span className="inline-flex items-center gap-1">
                            <span className="font-medium text-gray-600">FB:</span> {user.department}
                          </span>
                        )}
                        {user.staffId && (
                          <>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1">
                              <span className="font-medium text-gray-600">Personal-Nr.:</span> {user.staffId}
                            </span>
                          </>
                        )}
                        {user.phone && (
                          <>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1">
                              <span className="font-medium text-gray-600">Tel.:</span> {user.phone}
                            </span>
                          </>
                        )}
                      </>
                    )}
                    {/* Studierende: Matrikelnummer + Studiengang + Semester */}
                    {user.requestedRole === "student" && (
                      <>
                        {user.matrikelNr && (
                          <span className="inline-flex items-center gap-1">
                            <span className="font-medium text-gray-600">Matr.-Nr.:</span> {user.matrikelNr}
                          </span>
                        )}
                        {user.department && (
                          <>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1">
                              <span className="font-medium text-gray-600">Studiengang:</span> {user.department}
                            </span>
                          </>
                        )}
                        {user.thesisType && (
                          <>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1">
                              <span className="font-medium text-gray-600">Abschluss:</span>{" "}
                              {user.thesisType === "master" ? "Master" : "Bachelor"}
                            </span>
                          </>
                        )}
                        {user.targetSemester && (
                          <>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1">
                              <span className="font-medium text-gray-600">Geplantes Semester:</span> {user.targetSemester}
                            </span>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Aktionen */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    className="bg-[#76B900] hover:bg-[#5a8c00] text-white gap-1"
                    onClick={() => handleApprove(user.id)}
                    disabled={approveMutation.isPending}
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">Freischalten</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50 gap-1"
                    onClick={() => handleRejectOpen(user)}
                    disabled={rejectMutation.isPending}
                  >
                    <XCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">Ablehnen</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
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
              <strong>{buildFullName({ firstName: (editRoleDialog.user as any)?.firstName, lastName: (editRoleDialog.user as any)?.lastName, academicTitle: (editRoleDialog.user as any)?.academicTitle, name: editRoleDialog.user?.name }) || editRoleDialog.user?.email}</strong> vor der
              endgültigen Freischaltung an.
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
              <strong>{buildFullName({ firstName: (rejectDialog.user as any)?.firstName, lastName: (rejectDialog.user as any)?.lastName, academicTitle: (rejectDialog.user as any)?.academicTitle, name: rejectDialog.user?.name }) || rejectDialog.user?.email}</strong> ablehnen?
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
              className="bg-red-600 hover:bg-red-700 text-white"
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
