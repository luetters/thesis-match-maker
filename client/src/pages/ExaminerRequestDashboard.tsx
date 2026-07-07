import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle, XCircle } from "lucide-react";
import { getStatusBadge as getStatusBadgeData } from "@shared/const";
import { RequestDetailModal } from "@/components/RequestDetailModal";

export function ExaminerRequestDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Zweitgutachter-Ablehnen-Dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Queries für alle Anfrage-Kategorien
  const utils = trpc.useUtils();
  const { data: pendingRequests = [] } = (trpc.examiner as any).getPendingRequests?.useQuery?.() || { data: [] };
  const { data: acceptedRequests = [] } = (trpc.examiner as any).getAcceptedRequests?.useQuery?.() || { data: [] };
  const { data: rejectedRequests = [] } = (trpc.examiner as any).getRejectedRequests?.useQuery?.() || { data: [] };
  const { data: secondExaminerRequests = [], refetch: refetchSecond } = (trpc.examiner as any).getSecondExaminerRequests?.useQuery?.() || { data: [], refetch: () => {} };
  const { data: stats } = (trpc.examiner as any).getRequestStats?.useQuery?.() || { data: undefined };

  // Mutations für Zweitgutachter-Accept/Reject
  const acceptMutation = (trpc.examiner as any).acceptAsSecondExaminer?.useMutation?.({
    onSuccess: () => {
      toast.success("Betreuung als Zweitgutachter:in bestätigt. Erstgutachter:in und Studierende:r wurden benachrichtigt.");
      invalidateAll();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Fehler beim Bestätigen der Betreuung.");
    },
  }) || { mutate: () => {}, isPending: false };

  const rejectMutation = (trpc.examiner as any).rejectAsSecondExaminer?.useMutation?.({
    onSuccess: () => {
      toast.success("Anfrage abgelehnt. Die/der Studierende wurde benachrichtigt.");
      setRejectDialogOpen(false);
      setRejectReason("");
      setRejectTargetId(null);
      invalidateAll();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Fehler beim Ablehnen der Anfrage.");
    },
  }) || { mutate: () => {}, isPending: false };

  const invalidateAll = () => {
    (utils.examiner as any).getPendingRequests?.invalidate?.();
    (utils.examiner as any).getAcceptedRequests?.invalidate?.();
    (utils.examiner as any).getRejectedRequests?.invalidate?.();
    (utils.examiner as any).getSecondExaminerRequests?.invalidate?.();
    (utils.examiner as any).getRequestStats?.invalidate?.();
  };

  if (!user) return null;

  const getStatusBadge = (status: string) => {
    const { label, className } = getStatusBadgeData(status);
    return <Badge className={className}>{label}</Badge>;
  };

  const handleViewRequest = (request: any) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  const handleAccept = (requestId: number) => {
    acceptMutation.mutate({ thesisRequestId: requestId });
  };

  const handleOpenRejectDialog = (requestId: number) => {
    setRejectTargetId(requestId);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const handleConfirmReject = () => {
    if (!rejectTargetId) return;
    rejectMutation.mutate({
      thesisRequestId: rejectTargetId,
      rejectionReason: rejectReason.trim() || undefined,
    });
  };

  // Standard-Tabelle für Erst-/Abgelehnt-/Akzeptiert-Anfragen
  const RequestTable = ({ requests }: { requests: any[] }) => (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Thema</TableHead>
            <TableHead>Student:in</TableHead>
            <TableHead>Studiengang</TableHead>
            <TableHead>Semester</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                {t.common?.noData || "Keine Anfragen"}
              </TableCell>
            </TableRow>
          ) : (
            requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-medium">{request.title}</TableCell>
                <TableCell>{request.studentName}</TableCell>
                <TableCell>{request.department}</TableCell>
                <TableCell>{request.targetSemester}</TableCell>
                <TableCell>{getStatusBadge(request.status)}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewRequest(request)}
                  >
                    Ansehen
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  // Spezielle Tabelle für Zweitgutachter-Anfragen mit Accept/Reject
  const SecondExaminerTable = ({ requests }: { requests: any[] }) => (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Thema</TableHead>
            <TableHead>Student:in</TableHead>
            <TableHead>Erstgutachter:in</TableHead>
            <TableHead>Semester</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                Keine ausstehenden Zweitgutachter-Anfragen
              </TableCell>
            </TableRow>
          ) : (
            requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-medium max-w-[200px]">
                  <span className="line-clamp-2">{request.title}</span>
                </TableCell>
                <TableCell>{request.studentName}</TableCell>
                <TableCell>{request.examinerName || "—"}</TableCell>
                <TableCell>{request.targetSemester || "—"}</TableCell>
                <TableCell>{getStatusBadge(request.status)}</TableCell>
                <TableCell>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewRequest(request)}
                    >
                      Ansehen
                    </Button>
                    {request.status === "PENDING_SECOND_EXAMINER" && (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white gap-1"
                          onClick={() => handleAccept(request.id)}
                          disabled={acceptMutation.isPending}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Bestätigen
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50 gap-1"
                          onClick={() => handleOpenRejectDialog(request.id)}
                          disabled={rejectMutation.isPending}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Ablehnen
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Statistik-Karten */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {t.status?.PENDING || "Ausstehend"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingAsFirstExaminer || 0}</div>
            <p className="text-xs text-gray-500 mt-1">als Erstgutachter:in</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {t.status?.ACCEPTED || "Akzeptiert"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.acceptedAsFirstExaminer || 0}</div>
            <p className="text-xs text-gray-500 mt-1">als Erstgutachter:in</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {t.status?.REJECTED || "Abgelehnt"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.rejectedAsFirstExaminer || 0}</div>
            <p className="text-xs text-gray-500 mt-1">als Erstgutachter:in</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Zweitgutachter:in
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingAsSecondExaminer || 0}</div>
            <p className="text-xs text-gray-500 mt-1">ausstehend</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs für verschiedene Anfrage-Status */}
      <Card>
        <CardHeader>
          <CardTitle>{t.examiner?.requests || "Anfrage-Verwaltung"}</CardTitle>
          <CardDescription>
            Verwalten Sie alle Ihre Anfragen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pending">
                {t.status?.PENDING || "Ausstehend"} ({pendingRequests.length})
              </TabsTrigger>
              <TabsTrigger value="accepted">
                {t.status?.ACCEPTED || "Akzeptiert"} ({acceptedRequests.length})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                {t.status?.REJECTED || "Abgelehnt"} ({rejectedRequests.length})
              </TabsTrigger>
              <TabsTrigger value="secondExaminer" className="relative">
                Zweitgutachter:in ({secondExaminerRequests.length})
                {secondExaminerRequests.filter((r: any) => r.status === "PENDING_SECOND_EXAMINER").length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {secondExaminerRequests.filter((r: any) => r.status === "PENDING_SECOND_EXAMINER").length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-6">
              <RequestTable requests={pendingRequests} />
            </TabsContent>

            <TabsContent value="accepted" className="mt-6">
              <RequestTable requests={acceptedRequests} />
            </TabsContent>

            <TabsContent value="rejected" className="mt-6">
              <RequestTable requests={rejectedRequests} />
            </TabsContent>

            <TabsContent value="secondExaminer" className="mt-6">
              {secondExaminerRequests.filter((r: any) => r.status === "PENDING_SECOND_EXAMINER").length > 0 && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-sm text-amber-800">
                  <span className="font-semibold">
                    {secondExaminerRequests.filter((r: any) => r.status === "PENDING_SECOND_EXAMINER").length} ausstehende Anfrage(n)
                  </span>
                  – Bitte bestätigen oder lehnen Sie die Zweitbetreuung ab.
                </div>
              )}
              <SecondExaminerTable requests={secondExaminerRequests} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Request Detail Modal */}
      <RequestDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        request={selectedRequest}
        onStatusChange={invalidateAll}
      />

      {/* Ablehnen-Dialog mit optionaler Begründung */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Zweitbetreuung ablehnen</DialogTitle>
            <DialogDescription>
              Möchten Sie diese Anfrage als Zweitgutachter:in ablehnen? Die/der Studierende wird benachrichtigt und kann eine andere Person auswählen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="rejectReason">Begründung (optional)</Label>
            <Textarea
              id="rejectReason"
              placeholder="z. B. Kapazitätsengpass im gewählten Semester …"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              maxLength={500}
              rows={3}
            />
            <p className="text-xs text-gray-400 text-right">{rejectReason.length}/500</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? "Wird abgelehnt …" : "Ablehnen bestätigen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
