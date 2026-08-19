import { useState } from "react";
import { trpc } from "@/lib/trpc";

export function HostingGuideHelp() {
  const [storageResult, setStorageResult] = useState<{ success: boolean; mode: string; provider: string; message: string; diagnostics: Array<{ code: string; title: string; detail: string; action: string; statusCode?: number }> } | null>(null);
  const testStorage = trpc.admin.testConfiguredStorage.useMutation({
    onSuccess: (result) => setStorageResult(result),
    onError: (error) => setStorageResult({ success: false, mode: "–", provider: "–", message: error.message, diagnostics: [{ code: "REQUEST_FAILED", title: "Test konnte nicht ausgeführt werden", detail: error.message, action: "Prüfen Sie Ihre Anmeldung und versuchen Sie den Test erneut." }] }),
  });
  const sections = [
    ["Server und Sicherheit", "Ubuntu 24.04 LTS bereitstellen, SSH-Schlüssel verwenden sowie nur SSH aus bekannten Netzen und HTTP/HTTPS in der Firewall freigeben."],
    ["Privater S3-Speicher", "Bei IONOS oder Hetzner einen privaten Bucket sowie ein eigenes Anwendungsschlüsselpaar anlegen. Die Zugangsdaten vor dem Speichern im Infrastruktur-Bereich testen."],
    ["Daten und Anwendung", "Migrations-ZIP herunterladen, MySQL-Dump separat exportieren, auf dem Zielsystem importieren und die .env-Datei mit Datenbank-, SMTP-, S3- und Schedulerwerten erstellen."],
    ["Test und Produktivwechsel", "Zuerst mit einer Testdomain testen. Anmeldung, 2FA, E-Mail, Uploads, Downloads, Scheduler und Backups prüfen; erst danach DNS und HTTPS produktiv umstellen."],
  ];

  return (
    <div className="space-y-6">
      <section className="bg-gradient-to-br from-emerald-900 to-emerald-700 text-white rounded-2xl p-7">
        <p className="text-emerald-200 text-sm font-medium">Hilfe für die Hochschul-IT</p>
        <h2 className="text-2xl font-bold mt-1">Bereitstellungsleitfaden: IONOS oder Hetzner</h2>
        <p className="mt-3 text-emerald-50 max-w-3xl leading-relaxed">Dieser Leitfaden führt durch den sicheren Umzug des Thesis Match Makers auf einen eigenen Server. Starten Sie immer mit einem Testsystem und nehmen Sie den Produktivwechsel erst nach der vollständigen Abnahme vor.</p>
        <a href="/api/export/hosting-deployment-guide.pdf" download className="inline-flex mt-5 px-4 py-2.5 rounded-lg bg-white text-emerald-900 font-semibold text-sm hover:bg-emerald-50">
          PDF für das IT-Team herunterladen
        </a>
      </section>

      <section className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="font-semibold text-blue-950">S3-Verbindung direkt prüfen</h3>
            <p className="text-sm text-blue-900/80 mt-1">Testet die aktuell im Portal konfigurierte IONOS- oder Hetzner-Speicherverbindung. Zugangsdaten werden dabei nicht angezeigt.</p>
          </div>
          <button
            onClick={() => { setStorageResult(null); testStorage.mutate(); }}
            disabled={testStorage.isPending}
            className="shrink-0 px-4 py-2.5 rounded-lg bg-blue-700 text-white font-semibold text-sm hover:bg-blue-800 disabled:opacity-60"
          >
            {testStorage.isPending ? "Verbindung wird geprüft…" : "S3-Verbindung testen"}
          </button>
        </div>
        {storageResult && (
          <div className={`mt-4 rounded-lg border p-3 text-sm ${storageResult.success ? "bg-green-50 border-green-200 text-green-900" : "bg-red-50 border-red-200 text-red-900"}`}>
            <p className="font-semibold">{storageResult.success ? "Verbindung erfolgreich" : "Verbindung fehlgeschlagen"}</p>
            <p className="mt-1">Anbieter: {storageResult.provider} · Modus: {storageResult.mode}</p>
            <p className="mt-1">{storageResult.message}</p>
            {!storageResult.success && (
              <details className="mt-3 rounded-md bg-white/70 border border-current/20 p-3">
                <summary className="cursor-pointer font-semibold">Technische Diagnose und Fehlerbehebung anzeigen</summary>
                <div className="mt-3 space-y-3">
                  {storageResult.diagnostics.map((diagnostic) => (
                    <div key={`${diagnostic.code}-${diagnostic.title}`} className="border-l-2 border-current/40 pl-3">
                      <p className="font-semibold">{diagnostic.title}</p>
                      <p className="mt-1 text-xs font-mono break-words">Code: {diagnostic.code}{diagnostic.statusCode ? ` · HTTP ${diagnostic.statusCode}` : ""}</p>
                      <p className="mt-1">Fehlerdetail: {diagnostic.detail}</p>
                      <p className="mt-1 font-medium">Empfohlene Maßnahme: {diagnostic.action}</p>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map(([title, text], index) => (
          <article key={title} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm flex items-center justify-center mb-3">{index + 1}</div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed mt-2">{text}</p>
          </article>
        ))}
      </section>

      <section className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h3 className="font-semibold text-amber-900">Abnahme vor dem DNS-Wechsel</h3>
        <ul className="text-sm text-amber-900/80 mt-3 space-y-2 list-disc pl-5">
          <li>Der S3-Bucket ist privat und der Verbindungstest im Infrastruktur-Bereich erfolgreich.</li>
          <li>Passwort-Login, Zwei-Faktor-Authentifizierung, E-Mail-Versand, Uploads und Downloads funktionieren.</li>
          <li>Die Datenbank ist nicht öffentlich erreichbar und die Firewall lässt ausschließlich benötigte Ports zu.</li>
          <li>Ein Backup wurde erstellt und auf einem separaten Testsystem erfolgreich wiederhergestellt.</li>
        </ul>
      </section>
    </div>
  );
}
