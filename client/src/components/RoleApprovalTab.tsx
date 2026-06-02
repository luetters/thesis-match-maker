import { useState } from "react";
import { CheckCircle, XCircle, Clock, User, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, string> = {
  student: "Studierende:r",
  examiner: "Prüfer:in",
  admin: "Verwaltung",
  superadmin: "Superadmin",
  user: "Unbekannt",
};

type PendingUser = {
  id: number;
  name: string | null;
  email: string | null;
  role: string;
  requestedRole: string | null;
  roleStatus: string;
  createdAt: Date;
  loginMethod: string | null;
};

type RejectDialogState = {
  open: boolean;
  user: PendingUser | null;
  reason: string;
};

export default function RoleApprovalTab({ canApproveAll = false }: { canApproveAll?: boolean }) {
  const utils = trpc.useUtils();
  const [rejectDialog, setRejectDialog] = useState<RejectDialogState>({
    open: false,
    user: null,
    reason: "",
  });

  const pendingQuery = trpc.roleApproval.getPending.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const approveMutation = trpc.roleApproval.approve.useMutation({
    onSuccess: async (_, vars) => {
      await utils.roleApproval.getPending.invalidate();
      toast.success("Rollenanfrage wurde bestätigt.");
    },
    onError: (err) => {
      toast.error(err.message ?? "Fehler beim Bestätigen der Rollenanfrage.");
    },
  });

  const rejectMutation = trpc.roleApproval.reject.useMutation({
    onSuccess: async () => {
      await utils.roleApproval.getPending.invalidate();
      setRejectDialog({ open: false, user: null, reason: "" });
      toast.success("Rollenanfrage wurde abgelehnt.");
    },
    onError: (err) => {
      toast.error(err.message ?? "Fehler beim Ablehnen der Rollenanfrage.");
    },
  });

  const pending = pendingQuery.data ?? [];

  // Admin sieht alle ausstehenden Registrierungen
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
            <p className="font-medium text-gray-700">Keine ausstehenden Rollenanfragen</p>
            <p className="text-sm text-gray-400 mt-1">Alle Anfragen wurden bearbeitet.</p>
          </CardContent>
        </Card>
      )}

      {/* Anfragen-Liste */}
      {visiblePending.length > 0 && (
        <div className="space-y-3">
          {visiblePending.map((user) => (
            <Card key={user.id} className="border border-amber-200 bg-amber-50/30">
              <CardContent className="flex items-center gap-4 p-4">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-amber-600" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 truncate">
                      {user.name ?? user.email ?? `Nutzer #${user.id}`}
                    </span>
                    <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                      <Clock className="w-3 h-3 mr-1" />
                      Ausstehend
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5 truncate">{user.email}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>
                      Beantragt: <strong className="text-gray-700">{ROLE_LABELS[user.requestedRole ?? ""] ?? user.requestedRole}</strong>
                    </span>
                    <span>·</span>
                    <span>Anmeldung: {user.loginMethod ?? "–"}</span>
                    <span>·</span>
                    <span>
                      {new Date(user.createdAt).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                {/* Aktionen */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    className="bg-[#76B900] hover:bg-[var(--primary)] text-white gap-1"
                    onClick={() => handleApprove(user.id)}
                    disabled={approveMutation.isPending}
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">Bestätigen</span>
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

      {/* Hinweis: E-Mail-Benachrichtigung */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p>
          Bei jeder neuen Registrierung erhalten Sie automatisch eine E-Mail-Benachrichtigung.
          Nach der Freischaltung wird die Person per E-Mail informiert und kann sich anmelden.
        </p>
      </div>

      {/* Ablehnen-Dialog */}
      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) => setRejectDialog((s) => ({ ...s, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rollenanfrage ablehnen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600">
              Möchten Sie die Rollenanfrage von{" "}
              <strong>{rejectDialog.user?.name ?? rejectDialog.user?.email}</strong> für die Rolle{" "}
              <strong>{ROLE_LABELS[rejectDialog.user?.requestedRole ?? ""] ?? rejectDialog.user?.requestedRole}</strong> ablehnen?
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
