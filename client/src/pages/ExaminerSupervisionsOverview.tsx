import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Loader2, Download } from "lucide-react";

export default function ExaminerSupervisionsOverview() {
  const { t } = useLanguage();
  const [selectedSemester, setSelectedSemester] = useState<string>("");

  // Hole alle Semester mit Betreuungen
  const { data: semesters, isLoading: semestersLoading } = trpc.examiner.getAllSemesters.useQuery();

  // Hole Betreuungen für das ausgewählte Semester
  const { data: supervisions, isLoading: supervisionsLoading } = trpc.examiner.getSupervisionsBySemester.useQuery(
    { semester: selectedSemester },
    { enabled: !!selectedSemester }
  );

  // Hole Statistiken für das ausgewählte Semester
  const { data: stats } = trpc.examiner.getSupervisionStats.useQuery(
    { semester: selectedSemester },
    { enabled: !!selectedSemester }
  );

  // Setze das erste Semester als Standard
  useEffect(() => {
    if (semesters && semesters.length > 0 && !selectedSemester) {
      setSelectedSemester(semesters[0]);
    }
  }, [semesters, selectedSemester]);

  const getStatusBadge = (status: any) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      FIRST_EXAMINER_ACCEPTED: { label: "Akzeptiert", color: "bg-green-100 text-green-800" },
      PENDING_FIRST_EXAMINER: { label: "Ausstehend", color: "bg-yellow-100 text-yellow-800" },
      PENDING_SECOND_EXAMINER: { label: "Zweitgutachter ausstehend", color: "bg-blue-100 text-blue-800" },
      COMPLETED: { label: "Abgeschlossen", color: "bg-gray-100 text-gray-800" },
    };
    const s = statusMap[status] || { label: status, color: "bg-gray-100 text-gray-800" };
    return <Badge className={s.color}>{s.label}</Badge>;
  };

  const getDegreeTypeBadge = (degreeType: string) => {
    const typeMap: Record<string, string> = {
      BACHELOR: "Bachelor",
      MASTER: "Master",
    };
    return typeMap[degreeType] || degreeType;
  };

  const handleExportCSV = (): void => {
    if (!supervisions) return;

    const headers = ["Name", "Matrikel", "Thema", "Abschlussart", "Status", "Rolle"];
    const rows = supervisions.map((s: any) => [
      s.studentName,
      s.matrikelNumber,
      s.title,
      getDegreeTypeBadge(s.degreeType),
      s.status,
      s.role,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `betreuungen-${selectedSemester}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (semestersLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!semesters || semesters.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Keine Betreuungen vorhanden</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Sie haben noch keine Betreuungen in diesem System.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Betreuungsübersicht</h1>
        <p className="text-gray-600">Semesterweise Übersicht Ihrer Betreuungen</p>
      </div>

      <Tabs value={selectedSemester} onValueChange={setSelectedSemester} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-6">
          {semesters.map((semester: any) => (
                   <TabsTrigger key={semester} value={semester}>
          {semester}
        </TabsTrigger>
      ))}
    </TabsList>

    {semesters.map((semester: any) => (
          <TabsContent key={semester} value={semester} className="space-y-6">
            {/* Statistik-Karten */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Gesamt</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.total}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Aktiv</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Bachelor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.byDegreeType.bachelor}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Master</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.byDegreeType.master}</div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Betreuungs-Tabelle */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Betreuungen {semester}</CardTitle>
                  <CardDescription>Alle Ihre Betreuungen für dieses Semester</CardDescription>
                </div>
                <Button onClick={handleExportCSV} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  CSV Export
                </Button>
              </CardHeader>
              <CardContent>
                {supervisionsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : supervisions && supervisions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Matrikel</TableHead>
                        <TableHead>Thema</TableHead>
                        <TableHead>Abschlussart</TableHead>
                        <TableHead>Rolle</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supervisions.map((supervision: any) => (
                        <TableRow key={supervision.id}>
                          <TableCell className="font-medium">{supervision.studentName}</TableCell>
                          <TableCell>{supervision.matrikelNumber}</TableCell>
                          <TableCell className="max-w-xs truncate">{supervision.title}</TableCell>
                          <TableCell>{getDegreeTypeBadge(supervision.degreeType)}</TableCell>
                          <TableCell>{supervision.role}</TableCell>
                          <TableCell>{getStatusBadge(supervision.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Keine Betreuungen für dieses Semester vorhanden
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
