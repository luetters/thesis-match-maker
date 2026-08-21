import { useState } from "react";
import { Download, FileCheck2, ShieldAlert, Upload } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";

type Preview = {
  manifest: { archiveId: string; createdAt: string; warnings: string[] };
  records: Array<{ name: string; rows: number; sha256Valid: boolean }>;
  assetFiles: number;
  totalAssetBytes: number;
  valid: boolean;
  errors: string[];
};

export function PortableTransferTab() {
  const { lang } = useLanguage();
  const en = lang === "en";
  const [archive, setArchive] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [importToken, setImportToken] = useState("");
  const createDownload = trpc.superadmin.createPortableTransferDownload.useMutation({
    onSuccess: ({ token }) => window.location.assign(`/api/admin/portable-transfer/export?token=${encodeURIComponent(token)}`),
    onError: (error) => toast.error(error.message),
  });

  const inspect = async () => {
    if (!archive) return toast.error(en ? "Please choose an archive first." : "Bitte wählen Sie zuerst ein Archiv aus.");
    setPreviewing(true); setPreview(null);
    try {
      const form = new FormData(); form.append("archive", archive);
      const response = await fetch("/api/admin/portable-transfer/preview", { method: "POST", credentials: "include", headers: { "X-Thesis-Transfer-Confirmation": "VORSCHAU" }, body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Vorschau fehlgeschlagen.");
      setPreview(body); toast.success(en ? "Archive validated." : "Archiv erfolgreich geprüft.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Vorschau fehlgeschlagen."); }
    finally { setPreviewing(false); }
  };

  const importArchive = async () => {
    if (!archive || !preview?.valid || confirmation !== "IMPORTIEREN" || !importToken) return;
    setImporting(true);
    try {
      const form = new FormData(); form.append("archive", archive);
      const response = await fetch("/api/admin/portable-transfer/import", { method: "POST", credentials: "include", headers: { "X-Thesis-Transfer-Confirmation": "IMPORTIEREN", "X-Thesis-Transfer-Token": importToken }, body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Import fehlgeschlagen.");
      toast.success(en ? `Import completed: ${body.importedRows} records.` : `Import abgeschlossen: ${body.importedRows} Datensätze.`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Import fehlgeschlagen."); }
    finally { setImporting(false); }
  };

  const records = preview?.records ?? [];
  return <div className="space-y-6">
    <section className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-start gap-3"><Download className="w-5 h-5 text-emerald-700 mt-0.5" /><div><h3 className="font-semibold text-gray-900">{en ? "Portable data export" : "Portabler Datenexport"}</h3><p className="text-sm text-gray-600 mt-1">{en ? "Creates a versioned ZIP containing portal data, matching processes and referenced files. Passwords, sessions, two-factor secrets and infrastructure credentials are excluded." : "Erstellt ein versioniertes ZIP mit Portaldaten, Matchingprozessen und referenzierten Dateien. Passwörter, Sitzungen, Zwei-Faktor-Geheimnisse und Infrastrukturzugänge sind ausgeschlossen."}</p></div></div>
      <button onClick={() => createDownload.mutate()} disabled={createDownload.isPending} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"><Download className="w-4 h-4" />{createDownload.isPending ? (en ? "Creating…" : "Wird erstellt…") : (en ? "Create secure download" : "Sicheren Download erstellen")}</button>
      <p className="mt-3 text-xs text-gray-500">{en ? "The download link is single-use and expires after five minutes. The archive is streamed and is not retained on the server." : "Der Downloadlink ist einmalig und fünf Minuten gültig. Das Archiv wird direkt gestreamt und nicht auf dem Server abgelegt."}</p>
    </section>

    <section className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-start gap-3"><Upload className="w-5 h-5 text-sky-700 mt-0.5" /><div><h3 className="font-semibold text-gray-900">{en ? "Import preview" : "Importvorschau"}</h3><p className="text-sm text-gray-600 mt-1">{en ? "The archive is checked for format version, record checksums, file paths and asset counts before any data can be imported." : "Das Archiv wird vor jeder Übernahme auf Formatversion, Datensatzprüfsummen, Dateipfade und Dateianzahl geprüft."}</p></div></div>
      <input className="mt-4 block w-full text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-sky-50 file:px-3 file:py-2 file:text-sky-800" type="file" accept=".zip,application/zip" onChange={(event) => { setArchive(event.target.files?.[0] ?? null); setPreview(null); }} />
      <button onClick={inspect} disabled={!archive || previewing} className="mt-3 inline-flex items-center gap-2 px-4 py-2 border border-sky-700 text-sky-800 rounded-lg text-sm font-medium disabled:opacity-50"><FileCheck2 className="w-4 h-4" />{previewing ? (en ? "Checking…" : "Prüfung läuft…") : (en ? "Check archive" : "Archiv prüfen")}</button>
      {preview && <div className={`mt-5 p-4 rounded-lg border ${preview.valid ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}><p className="font-medium text-gray-900">{preview.valid ? (en ? "Archive is valid" : "Archiv ist gültig") : (en ? "Archive is blocked" : "Archiv ist blockiert")}</p><p className="text-sm text-gray-600 mt-1">ID: {preview.manifest.archiveId} · {new Date(preview.manifest.createdAt).toLocaleString(en ? "en-GB" : "de-DE")}</p><div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm"><span>{en ? "Records" : "Datensätze"}: <strong>{records.reduce((sum, item) => sum + item.rows, 0)}</strong></span><span>{en ? "Files" : "Dateien"}: <strong>{preview.assetFiles}</strong></span><span>{en ? "File size" : "Dateigröße"}: <strong>{(preview.totalAssetBytes / 1024 / 1024).toFixed(1)} MB</strong></span></div>{preview.errors.length > 0 && <ul className="mt-3 text-sm text-red-800 list-disc ml-5">{preview.errors.map((error) => <li key={error}>{error}</li>)}</ul>}</div>}
    </section>

    <section className="bg-amber-50 border border-amber-200 rounded-xl p-6"><div className="flex gap-3"><ShieldAlert className="w-5 h-5 text-amber-700 mt-0.5" /><div className="min-w-0"><h3 className="font-semibold text-amber-950">{en ? "Final import — only into an empty target environment" : "Finaler Import – nur in eine leere Zielumgebung"}</h3><p className="text-sm text-amber-900 mt-1">{en ? "The final import is blocked unless the archive is valid, the database contains no users or thesis requests, and an import key is explicitly entered. Imported accounts must reset their password afterwards." : "Der finale Import bleibt gesperrt, bis das Archiv gültig ist, die Datenbank keine Nutzer:innen oder Anträge enthält und ein Import-Schlüssel ausdrücklich eingegeben wurde. Importierte Konten müssen anschließend ihr Passwort zurücksetzen."}</p><div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3"><input value={importToken} onChange={(event) => setImportToken(event.target.value)} type="password" placeholder={en ? "Import key from server environment" : "Import-Schlüssel aus der Serverumgebung"} className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm" /><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={en ? "Type IMPORTIEREN" : "IMPORTIEREN eingeben"} className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm" /></div><button onClick={importArchive} disabled={!archive || !preview?.valid || confirmation !== "IMPORTIEREN" || !importToken || importing} className="mt-3 px-4 py-2 bg-amber-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">{importing ? (en ? "Importing…" : "Import läuft…") : (en ? "Start final import" : "Finalen Import starten")}</button></div></div></section>
  </div>;
}
