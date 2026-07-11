import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { InvolvedPersonsTable, type PersonRow } from "@/components/InvolvedPersonsTable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CheckCircle, XCircle, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { getStatusBadge } from "@shared/const";

interface RequestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: any;
  onStatusChange?: () => void;
}

export function RequestDetailModal({ isOpen, onClose, request, onStatusChange }: RequestDetailModalProps) {
  const { t } = useLanguage();
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // tRPC Mutations
  const acceptMutation = (trpc.examiner as any).acceptRequest?.useMutation?.() || { mutateAsync: async () => {} };
  const rejectMutation = (trpc.examiner as any).rejectRequest?.useMutation?.() || { mutateAsync: async () => {} };
  const withdrawMutation = (trpc.examiner as any).withdrawRequest?.useMutation?.() || { mutateAsync: async () => {} };

  if (!request) return null;

  const handleAccept = async () => {
    try {
      setIsLoading(true);
      await acceptMutation.mutateAsync({ thesisRequestId: request.id });
      toast.success("Anfrage akzeptiert");
      onStatusChange?.();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Fehler beim Akzeptieren");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setIsLoading(true);
      await rejectMutation.mutateAsync({
        thesisRequestId: request.id,
        rejectionReason: rejectionReason || undefined,
      });
      toast.success("Anfrage abgelehnt");
      onStatusChange?.();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Fehler beim Ablehnen");
    } finally {
      setIsLoading(false);
      setShowRejectDialog(false);
      setRejectionReason("");
    }
  };

  const handleWithdraw = async () => {
    try {
      setIsLoading(true);
      await withdrawMutation.mutateAsync({ thesisRequestId: request.id });
      toast.success("Anfrage zurückgezogen");
      onStatusChange?.();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Fehler beim Zurückziehen");
    } finally {
      setIsLoading(false);
      setShowWithdrawDialog(false);
    }
  };


  const canAccept = request.status === "PENDING_FIRST_EXAMINER";
  const canReject = request.status === "PENDING_FIRST_EXAMINER";
  const canWithdraw = request.status === "FIRST_EXAMINER_REJECTED";

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{request.title}</DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={getStatusBadge(request.status).className}>
                  {getStatusBadge(request.status).label}
                </Badge>
                <span className="text-sm text-gray-600">
                  Eingereicht: {new Date(request.createdAt).toLocaleDateString("de-DE")}
                </span>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Rahmendaten */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-lg px-3 py-2">
                <p className="text-xs text-gray-400 mb-0.5">Studiengang</p>
                <p className="text-sm font-semibold text-gray-900">{request.programmeAbbreviation ?? request.programmeName ?? request.department ?? "–"}</p>
              </div>
              <div className="bg-gray-50 rounded-lg px-3 py-2">
                <p className="text-xs text-gray-400 mb-0.5">Semester</p>
                <p className="text-sm font-semibold text-gray-900">{request.targetSemester ?? "–"}</p>
              </div>
              <div className="bg-gray-50 rounded-lg px-3 py-2">
                <p className="text-xs text-gray-400 mb-0.5">Sprache</p>
                <p className="text-sm font-semibold text-gray-900">{request.language === "de" ? "Deutsch" : request.language === "en" ? "Englisch" : request.language ?? "–"}</p>
              </div>
            </div>

            {/* Beteiligte Personen */}
            {(() => {
              const rows: PersonRow[] = [];
              // Studierende:r
              rows.push({
                role: "Studierende:r",
                name: request.studentFirstName || request.studentLastName
                  ? `${request.studentFirstName ?? ""} ${request.studentLastName ?? ""}`.trim()
                  : (request.studentName ?? "–"),
                contact: request.studentEmail ?? "",
                profileId: request.studentId ?? null,
                status: request.programmeAbbreviation ?? request.programmeName ?? request.department ?? "",
                note: request.programmeAbbreviation ?? request.programmeName ?? request.department ?? "",
              });
              // Erstgutachter:in
              if (request.examinerId) {
                rows.push({ role: "Erstgutachter:in", name: request.firstExaminerName ?? request.examinerName ?? "–", contact: request.firstExaminerEmail ?? "", profileId: request.examinerId, status: "zugewiesen" });
              } else if (request.wantedExaminerName) {
                rows.push({ role: "Erstgutachter:in", name: request.wantedExaminerName, contact: "", profileId: request.wantedExaminerId ?? null, status: "angefragt" });
              } else {
                rows.push({ role: "Erstgutachter:in", name: "–", contact: "", status: "ausstehend" });
              }
              // Zweitgutachter:in
              if (request.secondExaminerId) {
                rows.push({ role: "Zweitgutachter:in", name: request.secondExaminerName ?? "–", contact: request.secondExaminerEmail ?? "", profileId: request.secondExaminerId, status: "zugewiesen" });
              } else if (request.wantedSecondExaminerName) {
                rows.push({ role: "Zweitgutachter:in", name: request.wantedSecondExaminerName, contact: request.wantedSecondExaminerEmail ?? "", profileId: request.wantedSecondExaminerId ?? null, status: "angefragt" });
              } else if (request.externalSecondExaminerFirstName) {
                const extName = `${request.externalSecondExaminerTitle ? request.externalSecondExaminerTitle + " " : ""}${request.externalSecondExaminerFirstName} ${request.externalSecondExaminerLastName ?? ""}`.trim();
                rows.push({ role: "Zweitgutachter:in", name: extName, contact: request.externalSecondExaminerEmail ?? "", status: "extern" });
              }
              return <InvolvedPersonsTable rows={rows} compact />;
            })()}

            {/* Beschreibung */}
            <div>
              <label className="text-sm font-medium text-gray-600">Beschreibung</label>
              <p className="text-base mt-2 p-3 bg-gray-50 rounded-lg">{request.description}</p>
            </div>

            {/* Abstract */}
            {request.abstract && (
              <div>
                <label className="text-sm font-medium text-gray-600">Abstract</label>
                <p className="text-base mt-2 p-3 bg-gray-50 rounded-lg">{request.abstract}</p>
              </div>
            )}

            {/* Persönliche Angaben der Studierenden */}
            {(request.studySpecializations || request.personalInterests || request.keywords) && (
              <div className="rounded-xl border border-[#76B900]/20 bg-[#76B900]/5 p-4 space-y-3">
                <h4 className="text-sm font-semibold text-[#76B900] uppercase tracking-widest">Persönliche Angaben</h4>

                {request.studySpecializations && (
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gewählte Vertiefungen im Studium</label>
                    <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">{request.studySpecializations}</p>
                  </div>
                )}

                {request.personalInterests && (
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Besondere Interessen</label>
                    <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">{request.personalInterests}</p>
                  </div>
                )}

                {request.keywords && (() => {
                  const tags: string[] = (() => {
                    try { return JSON.parse(request.keywords); } catch {
                      return request.keywords.split(",").map((k: string) => k.trim()).filter((k: string) => k.length > 0);
                    }
                  })();
                  if (tags.length === 0) return null;
                  return (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Schlagwörter</label>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {tags.map((tag: string, i: number) => (
                          <span
                            key={i}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                            style={{ backgroundColor: "#F1F8E9", color: "#4a7a00", border: "1px solid #c8e6a0" }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Exposé */}
            {request.exposeUrl && (
              <div>
                <label className="text-sm font-medium text-gray-600">Exposé</label>
                <a
                  href={request.exposeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
                >
                  <FileText className="w-4 h-4" />
                  PDF herunterladen
                </a>
              </div>
            )}

            {/* Ablehnung-Grund (falls abgelehnt) */}
            {request.status === "FIRST_EXAMINER_REJECTED" && request.rejectionReason && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <label className="text-sm font-medium text-red-800">Ablehnung-Grund</label>
                <p className="text-sm mt-1 text-red-700">{request.rejectionReason}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end pt-4 border-t">
              {canAccept && (
                <Button
                  onClick={handleAccept}
                  disabled={isLoading}
                  className="bg-primary hover:bg-primary/90"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Akzeptieren
                </Button>
              )}

              {canReject && (
                <Button
                  onClick={() => setShowRejectDialog(true)}
                  disabled={isLoading}
                  variant="destructive"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Ablehnen
                </Button>
              )}

              {canWithdraw && (
                <Button
                  onClick={() => setShowWithdrawDialog(true)}
                  disabled={isLoading}
                  variant="outline"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Zurückziehen
                </Button>
              )}

              <Button onClick={onClose} variant="outline" disabled={isLoading}>
                Schließen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anfrage ablehnen?</AlertDialogTitle>
            <AlertDialogDescription>
              Bitte geben Sie einen Grund für die Ablehnung an (optional).
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <Textarea
              placeholder="Grund für Ablehnung..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-24"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              Ablehnen
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Withdraw Dialog */}
      <AlertDialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anfrage zurückziehen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Die Student:in kann eine neue Anfrage einreichen.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex gap-2 justify-end pt-4">
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleWithdraw}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              Zurückziehen
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
