import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRouter } from "wouter";
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
import { AlertCircle, CheckCircle, XCircle, Clock } from "lucide-react";
import { RequestDetailModal } from "@/components/RequestDetailModal";

export function ExaminerRequestDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Queries für alle Anfrage-Kategorien
  const { data: pendingRequests = [] } = (trpc.examiner as any).getPendingRequests?.useQuery?.() || { data: [] };
  const { data: acceptedRequests = [] } = (trpc.examiner as any).getAcceptedRequests?.useQuery?.() || { data: [] };
  const { data: rejectedRequests = [] } = (trpc.examiner as any).getRejectedRequests?.useQuery?.() || { data: [] };
  const { data: secondExaminerRequests = [] } = (trpc.examiner as any).getSecondExaminerRequests?.useQuery?.() || { data: [] };
  const { data: stats } = (trpc.examiner as any).getRequestStats?.useQuery?.() || { data: undefined };

  if (!user) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_FIRST_EXAMINER":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            {t.status?.PENDING || "Ausstehend"}
          </Badge>
        );
      case "FIRST_EXAMINER_ACCEPTED":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            {t.status?.ACCEPTED || "Akzeptiert"}
          </Badge>
        );
      case "FIRST_EXAMINER_REJECTED":
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            {t.status?.REJECTED || "Abgelehnt"}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleViewRequest = (request: any) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

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
              <TabsTrigger value="secondExaminer">
                Zweitgutachter:in ({secondExaminerRequests.length})
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
              <RequestTable requests={secondExaminerRequests} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Request Detail Modal */}
      <RequestDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        request={selectedRequest}
        onStatusChange={() => {
          // Refresh queries
          (trpc.examiner as any).getPendingRequests?.invalidate?.();
          (trpc.examiner as any).getAcceptedRequests?.invalidate?.();
          (trpc.examiner as any).getRejectedRequests?.invalidate?.();
          (trpc.examiner as any).getSecondExaminerRequests?.invalidate?.();
          (trpc.examiner as any).getRequestStats?.invalidate?.();
        }}
      />
    </div>
  );
}
