import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ChevronLeft, Edit2, AlertCircle, Upload, Download, CheckCircle2, XCircle } from "lucide-react";
import { WorkloadBadge } from "@/components/WorkloadBadge";
import { toast } from "sonner";
import Papa from "papaparse";
import * as XLSX from "xlsx";

// ─── CSV-Vorlage ──────────────────────────────────────────────────────────────
const CSV_TEMPLATE_HEADERS = ["name", "email", "rolle", "titel", "fachbereich", "fachgebiete"];
const CSV_TEMPLATE_EXAMPLE = [
  ["Prof. Dr. Erika Mustermann", "e.mustermann@htw-berlin.de", "1. Prüfer", "Prof. Dr.", "Informatik", "KI; Maschinelles Lernen"],
  ["Dr. Max Beispiel", "m.beispiel@htw-berlin.de", "2. Prüfer", "Dr.", "Wirtschaftsinformatik", "Datenbanken; Cloud"],
];

function downloadCsvTemplate() {
  const rows = [CSV_TEMPLATE_HEADERS, ...CSV_TEMPLATE_EXAMPLE];
  const csv = "\uFEFF" + rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "prueferinnen_vorlage.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Zeile parsen ─────────────────────────────────────────────────────────────
function parseRole(raw: string): "examiner" | "second_examiner" | null {
  const s = (raw ?? "").trim().toLowerCase();
  if (s === "1. prüfer" || s === "1. pruefer" || s === "examiner" || s === "erstprüfer" || s === "erstpruefer") return "examiner";
  if (s === "2. prüfer" || s === "2. pruefer" || s === "second_examiner" || s === "zweitprüfer" || s === "zweitpruefer") return "second_examiner";
  return null;
}

interface ParsedRow {
  name: string;
  email: string;
  role: "examiner" | "second_examiner";
  title?: string;
  department?: string;
  tags?: string;
  _raw: string;
}

interface ParseError {
  line: number;
  message: string;
}

function parseRows(data: Record<string, string>[]): { rows: ParsedRow[]; errors: ParseError[] } {
  const rows: ParsedRow[] = [];
  const errors: ParseError[] = [];
  data.forEach((record, idx) => {
    const lineNum = idx + 2; // 1-based + header
    // Normalisiere Spaltenbezeichnungen
    const keys = Object.keys(record);
    const get = (candidates: string[]) => {
      for (const c of candidates) {
        const key = keys.find((k) => k.trim().toLowerCase() === c.toLowerCase());
        if (key) return (record[key] ?? "").trim();
      }
      return "";
    };
    const name = get(["name"]);
    const email = get(["email", "e-mail"]);
    const rolleRaw = get(["rolle", "role", "rollen"]);
    const title = get(["titel", "title", "akademischer titel"]);
    const department = get(["fachbereich", "department", "fb"]);
    const tags = get(["fachgebiete", "tags", "themengebiete", "forschungsgebiete"]);

    if (!name) { errors.push({ line: lineNum, message: "Name fehlt" }); return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { errors.push({ line: lineNum, message: `Ungültige E-Mail: "${email}"` }); return; }
    const role = parseRole(rolleRaw);
    if (!role) { errors.push({ line: lineNum, message: `Unbekannte Rolle: "${rolleRaw}" – erlaubt: "1. Prüfer" oder "2. Prüfer"` }); return; }
    rows.push({ name, email, role, title: title || undefined, department: department || undefined, tags: tags || undefined, _raw: JSON.stringify(record) });
  });
  return { rows, errors };
}

// ─── Import-Dialog ────────────────────────────────────────────────────────────
function ImportDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const importMutation = trpc.superadmin.importExaminers.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setImporting(false);
      if (data.errors.length === 0) {
        toast.success(`Import abgeschlossen: ${data.created} angelegt, ${data.updated} aktualisiert.`);
        onSuccess();
      } else {
        toast.warning(`Import mit Fehlern: ${data.created} angelegt, ${data.updated} aktualisiert, ${data.errors.length} Fehler.`);
      }
    },
    onError: (err) => {
      setImporting(false);
      toast.error(err.message);
    },
  });

  const handleFile = (file: File) => {
    setFileName(file.name);
    setParsedRows([]);
    setParseErrors([]);
    setResult(null);

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        encoding: "UTF-8",
        complete: (res) => {
          const { rows, errors } = parseRows(res.data as Record<string, string>[]);
          setParsedRows(rows);
          setParseErrors(errors);
        },
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
        const { rows, errors } = parseRows(json);
        setParsedRows(rows);
        setParseErrors(errors);
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast.error("Nur CSV- oder Excel-Dateien (.csv, .xlsx, .xls) werden unterstützt.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = () => {
    if (parsedRows.length === 0) return;
    setImporting(true);
    importMutation.mutate({ rows: parsedRows.map(({ _raw: _, ...r }) => r) });
  };

  const handleClose = () => {
    setParsedRows([]);
    setParseErrors([]);
    setFileName("");
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Prüfer:innen importieren
          </DialogTitle>
        </DialogHeader>

        {/* Vorlage-Download */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-100">
          <div>
            <p className="text-sm font-medium text-blue-800">CSV-Vorlage herunterladen</p>
            <p className="text-xs text-blue-600 mt-0.5">Spalten: name, email, rolle, titel, fachbereich, fachgebiete</p>
          </div>
          <Button size="sm" variant="outline" onClick={downloadCsvTemplate} className="gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-100">
            <Download className="w-3.5 h-3.5" />
            Vorlage
          </Button>
        </div>

        {/* Datei-Dropzone */}
        {!result && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-[#76B900]/50 hover:bg-[#76B900]/5 transition-colors"
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm font-medium text-gray-700">
              {fileName ? fileName : "CSV oder Excel-Datei hier ablegen"}
            </p>
            <p className="text-xs text-gray-400 mt-1">oder klicken zum Auswählen (.csv, .xlsx, .xls)</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
            />
          </div>
        )}

        {/* Vorschau-Tabelle */}
        {parsedRows.length > 0 && !result && (
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Vorschau: {parsedRows.length} Zeile{parsedRows.length !== 1 ? "n" : ""} erkannt
              {parseErrors.length > 0 && <span className="ml-2 text-amber-600">({parseErrors.length} Fehler)</span>}
            </p>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2 font-semibold">Name</th>
                    <th className="text-left p-2 font-semibold">E-Mail</th>
                    <th className="text-left p-2 font-semibold">Rolle</th>
                    <th className="text-left p-2 font-semibold">Fachbereich</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="p-2">{row.title ? `${row.title} ` : ""}{row.name}</td>
                      <td className="p-2 text-gray-500">{row.email}</td>
                      <td className="p-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${row.role === "examiner" ? "bg-[#76B900]/10 text-[#76B900]" : "bg-blue-50 text-blue-600"}`}>
                          {row.role === "examiner" ? "1. Prüfer:in" : "2. Prüfer:in"}
                        </span>
                      </td>
                      <td className="p-2 text-gray-500">{row.department || "—"}</td>
                    </tr>
                  ))}
                  {parsedRows.length > 10 && (
                    <tr className="border-t border-gray-100 bg-gray-50">
                      <td colSpan={4} className="p-2 text-center text-gray-400">… und {parsedRows.length - 10} weitere</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Parse-Fehler */}
        {parseErrors.length > 0 && !result && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-800 mb-1">Zeilen mit Fehlern (werden übersprungen):</p>
            <ul className="space-y-0.5">
              {parseErrors.map((e, i) => (
                <li key={i} className="text-xs text-amber-700">Zeile {e.line}: {e.message}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Ergebnis */}
        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200">
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800">Import abgeschlossen</p>
                <p className="text-xs text-green-600 mt-0.5">
                  {result.created} neu angelegt · {result.updated} aktualisiert
                </p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-xs font-semibold text-red-800 mb-1 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> {result.errors.length} Fehler beim Import:
                </p>
                <ul className="space-y-0.5">
                  {result.errors.map((e, i) => (
                    <li key={i} className="text-xs text-red-700">{e}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {result ? "Schließen" : "Abbrechen"}
          </Button>
          {!result && (
            <Button
              onClick={handleImport}
              disabled={parsedRows.length === 0 || importing}
              className="gap-1.5 bg-[#76B900] hover:bg-[#5a8f00] text-white"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {importing ? "Importiere…" : `${parsedRows.length} Zeile${parsedRows.length !== 1 ? "n" : ""} importieren`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────
export default function ExaminerManagement() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const { data: user } = trpc.auth.me.useQuery();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [showImport, setShowImport] = useState(false);

  const [editData, setEditData] = useState({
    title: "",
    department: "",
    bio: "",
    researchFocus: "",
    maxSupervisions: 5,
  });

  // Redirect if not superadmin or admin
  if (user && user.role !== "admin" && user.role !== "superadmin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-lg font-semibold mb-2">{t.common.forbidden}</h2>
          <p className="text-sm text-muted-foreground mb-4">{t.common.accessDenied}</p>
          <Button onClick={() => setLocation("/")} variant="outline" className="w-full">
            {t.common.backHome}
          </Button>
        </Card>
      </div>
    );
  }

  const { data: examiners, isLoading, refetch } = trpc.superadmin.listExaminers.useQuery({});
  const updateMutation = trpc.superadmin.updateExaminerProfile.useMutation({
    onSuccess: () => {
      toast.success(t.superadmin.profileUpdated);
      setEditingId(null);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || t.common.error);
    },
  });

  const handleEdit = (examiner: any) => {
    setEditingId(examiner.id);
    setEditData({
      title: examiner.title || "",
      department: examiner.department || "",
      bio: examiner.bio || "",
      researchFocus: examiner.researchFocus || "",
      maxSupervisions: examiner.maxSupervisions || 5,
    });
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    updateMutation.mutate({ examinerId: editingId, ...editData });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/superadmin")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{t.superadmin.examinerManagement}</h1>
            <p className="text-sm text-muted-foreground">{t.superadmin.manageExaminerProfiles}</p>
          </div>
          <Button
            onClick={() => setShowImport(true)}
            className="gap-2 bg-[#76B900] hover:bg-[#5a8f00] text-white"
          >
            <Upload className="w-4 h-4" />
            Importieren
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="container py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !examiners || examiners.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">{t.superadmin.noExaminers}</p>
            <Button onClick={() => setShowImport(true)} className="gap-2 bg-[#76B900] hover:bg-[#5a8f00] text-white">
              <Upload className="w-4 h-4" />
              Prüfer:innen importieren
            </Button>
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-semibold">{t.common.name}</th>
                  <th className="text-left p-3 font-semibold">{t.common.email}</th>
                  <th className="text-left p-3 font-semibold">{t.superadmin.department}</th>
                  <th className="text-left p-3 font-semibold">Rolle</th>
                  <th className="text-left p-3 font-semibold">Auslastung</th>
                  <th className="text-right p-3 font-semibold">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {examiners.map((examiner: any) => (
                  <tr key={examiner.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="p-3 font-medium">
                      {examiner.title ? <span className="text-gray-500 mr-1">{examiner.title}</span> : null}
                      {examiner.name || "—"}
                    </td>
                    <td className="p-3 text-gray-500">{examiner.email}</td>
                    <td className="p-3">{examiner.department || "—"}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        examiner.role === "examiner"
                          ? "bg-[#76B900]/10 text-[#76B900]"
                          : "bg-blue-50 text-blue-600"
                      }`}>
                        {examiner.role === "examiner" ? "1. Prüfer:in" : "2. Prüfer:in"}
                      </span>
                    </td>
                    <td className="p-3">
                      <WorkloadBadge
                        active={examiner.activeSupervisions}
                        max={examiner.maxSupervisions}
                        showCount
                        compact
                      />
                    </td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(examiner)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Dialog open={editingId !== null} onOpenChange={() => setEditingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.superadmin.editProfile}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t.superadmin.title}</label>
              <Input
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                placeholder="Prof. Dr."
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t.superadmin.department}</label>
              <Input
                value={editData.department}
                onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                placeholder="Informatik"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t.superadmin.bio}</label>
              <Textarea
                value={editData.bio}
                onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                placeholder="Kurze Biografie..."
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t.superadmin.researchFocus}</label>
              <Textarea
                value={editData.researchFocus}
                onChange={(e) => setEditData({ ...editData, researchFocus: e.target.value })}
                placeholder="Forschungsschwerpunkte..."
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t.superadmin.maxSupervisions}</label>
              <Input
                type="number"
                min="1"
                max="20"
                value={editData.maxSupervisions}
                onChange={(e) => setEditData({ ...editData, maxSupervisions: parseInt(e.target.value) || 5 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {t.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <ImportDialog
        open={showImport}
        onClose={() => setShowImport(false)}
        onSuccess={() => { setShowImport(false); refetch(); }}
      />
    </div>
  );
}
