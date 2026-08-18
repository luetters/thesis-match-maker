import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import RoleApprovalTab from "@/components/RoleApprovalTab";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ThesisDashboardLayout } from "@/components/ThesisDashboardLayout";
import { EmailTemplatesTab } from "./EmailTemplatesTab";
import { AdminManagementTab } from "./AdminManagementTab";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";
import { ProgrammeLogo } from "@/components/ProgrammeLogo";
import { buildFullName, getRoleBadge } from "@shared/const";
import { SamlConfigurationTab } from "@/components/SamlConfigurationTab";

// ─── Infrastruktur-Tab ──────────────────────────────────────────────────────
function InfrastructureTab() {
  const infraStatus = trpc.superadmin.getInfrastructureStatus.useQuery();
  const updateConfig = trpc.superadmin.updateInfrastructureConfig.useMutation({
    onSuccess: (data) => {
      toast.success(data.note || "Konfiguration gespeichert.");
      infraStatus.refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  const testS3 = trpc.superadmin.testS3Connection.useMutation({
    onSuccess: (data) => {
      if (data.success) toast.success(data.message);
      else toast.error(data.message);
      setS3TestResult(data);
    },
    onError: (err) => toast.error(err.message),
  });
  const backupConfig = trpc.superadmin.getBackupConfig.useQuery();
  const updateBackup = trpc.superadmin.updateBackupConfig.useMutation({
    onSuccess: (data) => {
      toast.success(data.note || "Backup-Konfiguration gespeichert.");
      backupConfig.refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  const [configForm, setConfigForm] = useState({
    siteUrl: "",
    emailLogoUrl: "",
    s3Endpoint: "",
    s3Bucket: "",
    s3Region: "",
    s3AccessKey: "",
    s3SecretKey: "",
  });
  const [configLoaded, setConfigLoaded] = useState(false);
  const [s3TestResult, setS3TestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [backupForm, setBackupForm] = useState({
    backupEnabled: false,
    backupInterval: "daily" as "hourly" | "daily" | "weekly",
    backupTime: "03:00",
    backupRetentionDays: 30,
  });
  const [backupLoaded, setBackupLoaded] = useState(false);
  const [migrationStep, setMigrationStep] = useState(0);

  useEffect(() => {
    if (infraStatus.data && !configLoaded) {
      const c = infraStatus.data.config;
      setConfigForm({
        siteUrl: c.siteUrl || "",
        emailLogoUrl: c.emailLogoUrl || "",
        s3Endpoint: c.s3Endpoint || "",
        s3Bucket: c.s3Bucket || "",
        s3Region: c.s3Region || "",
        s3AccessKey: "",
        s3SecretKey: "",
      });
      setConfigLoaded(true);
    }
  }, [infraStatus.data, configLoaded]);

  useEffect(() => {
    if (backupConfig.data && !backupLoaded) {
      setBackupForm({
        backupEnabled: backupConfig.data.backupEnabled,
        backupInterval: backupConfig.data.backupInterval as "hourly" | "daily" | "weekly",
        backupTime: backupConfig.data.backupTime,
        backupRetentionDays: backupConfig.data.backupRetentionDays,
      });
      setBackupLoaded(true);
    }
  }, [backupConfig.data, backupLoaded]);

  if (infraStatus.isLoading) return <div className="text-center py-8 text-gray-500">Lade Infrastruktur-Status…</div>;

  const data = infraStatus.data;
  const providerLabels: Record<string, string> = { forge: "Manus Forge", ionos: "IONOS S3", hetzner: "Hetzner Storage Box", local: "Lokales Dateisystem" };

  return (
    <div className="space-y-6">
      {/* Status-Dashboard */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 text-base mb-4">Status-Dashboard</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Speicher-Status */}
          <div className={`p-4 rounded-lg border ${data?.storage.healthy ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-3 h-3 rounded-full ${data?.storage.healthy ? "bg-green-500" : "bg-red-500"}`}></span>
              <span className="font-medium text-gray-900">Dateispeicher</span>
            </div>
            <p className="text-sm text-gray-600">Modus: <strong>{data?.storage.mode}</strong></p>
            <p className="text-sm text-gray-600">Anbieter: <strong>{providerLabels[data?.config.storageProvider || "local"]}</strong></p>
            <p className="text-sm text-gray-600">{data?.storage.message}</p>
            {data?.storage.bucket && <p className="text-sm text-gray-500">Bucket: {data.storage.bucket}</p>}
            {data?.storage.endpoint && <p className="text-sm text-gray-500">Endpunkt: {data.storage.endpoint}</p>}
          </div>
          {/* Scheduler-Status */}
          <div className={`p-4 rounded-lg border ${data?.scheduler.enabled ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-3 h-3 rounded-full ${data?.scheduler.enabled ? "bg-green-500" : "bg-yellow-500"}`}></span>
              <span className="font-medium text-gray-900">Hintergrund-Scheduler</span>
            </div>
            <p className="text-sm text-gray-600">
              {data?.scheduler.enabled ? `Aktiv (${data.scheduler.jobCount} Jobs)` : "Deaktiviert (Manus Heartbeat wird verwendet)"}
            </p>
            {data?.scheduler.jobs.map((job) => (
              <div key={job.name} className="mt-2 text-xs text-gray-500 border-t border-gray-200 pt-2">
                <p className="font-medium">{job.name}</p>
                <p>Zeitplan: {job.schedule} UTC</p>
                {job.lastExecution && (
                  <p>Letzte Ausführung: {new Date(job.lastExecution.lastRun!).toLocaleString("de-DE")} – Status: {job.lastExecution.lastStatus ?? "Fehler"}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* S3-Konfiguration */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 text-base mb-2">Speicher-Konfiguration (S3)</h3>
        <p className="text-sm text-gray-500 mb-4">Unterstützte Anbieter: IONOS Object Storage, Hetzner Storage Box. Umgebungsvariablen haben Vorrang vor diesen Einstellungen.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">S3-Endpunkt</label>
            <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="https://s3.eu-central-1.ionoscloud.com" value={configForm.s3Endpoint} onChange={(e) => setConfigForm(f => ({ ...f, s3Endpoint: e.target.value }))} />
            <p className="text-xs text-gray-400 mt-1">IONOS: s3.eu-central-1.ionoscloud.com | Hetzner: fsn1.your-objectstorage.com</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bucket-Name</label>
            <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="thesis-match-storage" value={configForm.s3Bucket} onChange={(e) => setConfigForm(f => ({ ...f, s3Bucket: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
            <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="de" value={configForm.s3Region} onChange={(e) => setConfigForm(f => ({ ...f, s3Region: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Access Key</label>
            <input type="password" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="••••••••" value={configForm.s3AccessKey} onChange={(e) => setConfigForm(f => ({ ...f, s3AccessKey: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Secret Key</label>
            <input type="password" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="••••••••" value={configForm.s3SecretKey} onChange={(e) => setConfigForm(f => ({ ...f, s3SecretKey: e.target.value }))} />
          </div>
        </div>
        <h4 className="font-medium text-gray-900 text-sm mt-6 mb-2">Allgemeine Einstellungen</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Site-URL</label>
            <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="https://thesis.htw-berlin.com" value={configForm.siteUrl} onChange={(e) => setConfigForm(f => ({ ...f, siteUrl: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail-Logo-URL</label>
            <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="/manus-storage/ThesisMatchMaker.jpg" value={configForm.emailLogoUrl} onChange={(e) => setConfigForm(f => ({ ...f, emailLogoUrl: e.target.value }))} />
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button
            className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-50"
            disabled={updateConfig.isPending}
            onClick={() => {
              const payload: Record<string, string> = {};
              for (const [k, v] of Object.entries(configForm)) {
                if (v) payload[k] = v;
              }
              updateConfig.mutate(payload as any);
            }}
          >
            {updateConfig.isPending ? "Wird gespeichert…" : "Konfiguration speichern"}
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            disabled={testS3.isPending || !configForm.s3Endpoint || !configForm.s3Bucket || !configForm.s3AccessKey || !configForm.s3SecretKey}
            onClick={() => {
              setS3TestResult(null);
              testS3.mutate({
                endpoint: configForm.s3Endpoint,
                bucket: configForm.s3Bucket,
                region: configForm.s3Region || "de",
                accessKey: configForm.s3AccessKey,
                secretKey: configForm.s3SecretKey,
              });
            }}
          >
            {testS3.isPending ? "Teste…" : "🔌 Verbindung testen"}
          </button>
        </div>
        {s3TestResult && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${s3TestResult.success ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
            {s3TestResult.success ? "✅" : "❌"} {s3TestResult.message}
          </div>
        )}
      </div>

      {/* Backup-Konfiguration */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 text-base mb-2">Automatische Backups</h3>
        <p className="text-sm text-gray-500 mb-4">Konfigurieren Sie die Intervalle für automatische System-Backups. Backups werden über den Scheduler ausgeführt und erfordern einen konfigurierten S3-Speicher.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <div className="flex items-center gap-2 mt-2">
              <button
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${backupForm.backupEnabled ? "bg-green-600" : "bg-gray-300"}`}
                onClick={() => setBackupForm(f => ({ ...f, backupEnabled: !f.backupEnabled }))}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${backupForm.backupEnabled ? "translate-x-6" : "translate-x-1"}`} />
              </button>
              <span className="text-sm text-gray-600">{backupForm.backupEnabled ? "Aktiviert" : "Deaktiviert"}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Intervall</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" value={backupForm.backupInterval} onChange={(e) => setBackupForm(f => ({ ...f, backupInterval: e.target.value as any }))}>
              <option value="hourly">Stündlich</option>
              <option value="daily">Täglich</option>
              <option value="weekly">Wöchentlich</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Uhrzeit (UTC)</label>
            <input type="time" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" value={backupForm.backupTime} onChange={(e) => setBackupForm(f => ({ ...f, backupTime: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Aufbewahrung (Tage)</label>
            <input type="number" min={1} max={365} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" value={backupForm.backupRetentionDays} onChange={(e) => setBackupForm(f => ({ ...f, backupRetentionDays: parseInt(e.target.value) || 30 }))} />
          </div>
        </div>
        {backupConfig.data?.lastBackup && (
          <p className="text-xs text-gray-500 mt-3">Letztes Backup: {new Date(backupConfig.data.lastBackup).toLocaleString("de-DE")}</p>
        )}
        <button
          className="mt-4 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-50"
          disabled={updateBackup.isPending}
          onClick={() => updateBackup.mutate(backupForm)}
        >
          {updateBackup.isPending ? "Wird gespeichert…" : "Backup-Konfiguration speichern"}
        </button>
      </div>

      {/* Migrationsassistent */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 text-base mb-2">Migrationsassistent</h3>
        <p className="text-sm text-gray-500 mb-4">Schritt-für-Schritt-Anleitung für den Umzug auf einen eigenen Server (IONOS, Hetzner oder andere).</p>
        {(() => {
          const steps = [
            {
              title: "1. Server vorbereiten",
              description: "Richten Sie einen Linux-Server (Ubuntu 22.04+) mit Docker und Docker Compose ein.",
              details: [
                "Mindestanforderungen: 2 vCPU, 4 GB RAM, 40 GB SSD",
                "Docker und Docker Compose installieren: apt install docker.io docker-compose-plugin",
                "Domain (z. B. thesis.htw-berlin.com) auf die neue Server-IP umleiten",
                "SSL-Zertifikat vorbereiten (Let's Encrypt empfohlen)",
              ],
              check: "Docker-Version prüfen: docker --version",
            },
            {
              title: "2. S3-Speicher einrichten",
              description: "Erstellen Sie einen S3-kompatiblen Object Storage bei IONOS oder Hetzner.",
              details: [
                "IONOS: Cloud Panel → Object Storage → Bucket erstellen",
                "Hetzner: Cloud Console → Object Storage → Bucket erstellen",
                "Access Key und Secret Key generieren",
                "Testen Sie die Verbindung oben im Abschnitt 'Speicher-Konfiguration'",
              ],
              check: "Verbindungstest oben durchführen",
            },
            {
              title: "3. Datenbank migrieren",
              description: "Exportieren Sie die aktuelle Datenbank und importieren Sie sie auf dem neuen Server.",
              details: [
                "Aktuellen Dump erstellen: mysqldump über die Datenbankverwaltung",
                "MySQL 8.0+ auf dem Zielserver installieren oder als Docker-Container starten",
                "Dump importieren: mysql -u root -p thesis_match < dump.sql",
                "DATABASE_URL in der .env-Datei anpassen",
              ],
              check: "Tabellen prüfen: mysql -e 'SHOW TABLES' thesis_match",
            },
            {
              title: "4. Migrations-ZIP herunterladen",
              description: "Laden Sie alle Projektdateien, Konfigurationen und Assets herunter.",
              details: [
                "Klicken Sie unten auf 'Migrations-ZIP herunterladen'",
                "ZIP auf dem Zielserver entpacken",
                "deploy/docker-compose.yml und deploy/Dockerfile prüfen",
                ".env-Datei aus deploy/env.example.md erstellen und ausfüllen",
              ],
              check: "Dateien prüfen: ls -la deploy/ drizzle/ docs/",
            },
            {
              title: "5. Umgebungsvariablen konfigurieren",
              description: "Erstellen Sie die .env-Datei mit allen erforderlichen Werten.",
              details: [
                "DATABASE_URL: mysql://user:pass@host:3306/thesis_match",
                "JWT_SECRET: Zufälliger 64-Zeichen-String (openssl rand -hex 32)",
                "SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS: E-Mail-Server",
                "S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY: Speicher",
                "SITE_URL: Öffentliche URL des Portals",
                "SCHEDULER_ENABLED=true: Hintergrundjobs aktivieren",
                "CRON_SECRET: Zufälliger String für Scheduler-Authentifizierung",
              ],
              check: "Variablen prüfen: cat .env | grep -v SECRET",
            },
            {
              title: "6. Container starten und testen",
              description: "Starten Sie die Anwendung mit Docker Compose und prüfen Sie die Funktionalität.",
              details: [
                "docker compose up -d --build",
                "Logs prüfen: docker compose logs -f app",
                "Portal im Browser öffnen und Anmeldung testen",
                "E-Mail-Versand testen (Admin → SMTP-Test)",
                "Speicher testen (Profilbild hochladen)",
              ],
              check: "docker compose ps -- alle Container sollten 'running' zeigen",
            },
            {
              title: "7. DNS und SSL umstellen",
              description: "Leiten Sie die Domain auf den neuen Server um und aktivieren Sie HTTPS.",
              details: [
                "DNS A-Record auf die neue Server-IP ändern",
                "Let's Encrypt mit Certbot: certbot --nginx -d thesis.htw-berlin.com",
                "Nginx als Reverse Proxy konfigurieren (Port 3000 → 443)",
                "HSTS-Header aktivieren",
              ],
              check: "curl -I https://thesis.htw-berlin.com – Status 200 erwartet",
            },
          ];
          return (
            <div>
              {/* Fortschrittsleiste */}
              <div className="flex items-center gap-1 mb-6">
                {steps.map((_, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <button
                      onClick={() => setMigrationStep(i)}
                      className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                        i < migrationStep ? "bg-green-600 text-white" :
                        i === migrationStep ? "bg-blue-600 text-white ring-2 ring-blue-300" :
                        "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {i < migrationStep ? "✓" : i + 1}
                    </button>
                    {i < steps.length - 1 && <div className={`w-6 h-0.5 ${i < migrationStep ? "bg-green-400" : "bg-gray-200"}`} />}
                  </div>
                ))}
              </div>
              {/* Aktueller Schritt */}
              <div className="border border-blue-200 bg-blue-50 rounded-lg p-5">
                <h4 className="font-semibold text-gray-900 text-sm mb-1">{steps[migrationStep].title}</h4>
                <p className="text-sm text-gray-700 mb-3">{steps[migrationStep].description}</p>
                <ul className="space-y-1 mb-3">
                  {steps[migrationStep].details.map((d, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span> {d}
                    </li>
                  ))}
                </ul>
                <div className="bg-gray-800 text-green-400 rounded-lg p-3 text-xs font-mono">
                  $ {steps[migrationStep].check}
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                    disabled={migrationStep === 0}
                    onClick={() => setMigrationStep(s => s - 1)}
                  >
                    ← Zurück
                  </button>
                  <button
                    className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-30"
                    disabled={migrationStep === steps.length - 1}
                    onClick={() => setMigrationStep(s => s + 1)}
                  >
                    Weiter →
                  </button>
                  {migrationStep === steps.length - 1 && (
                    <span className="text-sm text-green-700 font-medium flex items-center gap-1">✅ Migration abgeschlossen</span>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Migrations-Export */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 text-base mb-2">Migrations-Export</h3>
        <p className="text-sm text-gray-500 mb-4">Laden Sie alle statischen Assets, das Datenbankschema, die Docker-Konfiguration und die Migrationsdokumentation als ZIP-Datei herunter.</p>
        <a
          href="/api/admin/export/migration"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          download
        >
          <span>📦</span> Migrations-ZIP herunterladen
        </a>
        <p className="text-xs text-gray-400 mt-2">Enthält: Storage-Assets, Drizzle-Migrationen, Dockerfile, docker-compose.yml, Migrationsleitfaden.</p>
      </div>
    </div>
  );
}

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  superadmin: "Superadmin",
  admin: "Admin / Verwaltung",
  examiner: "Prüfer:in",
  student: "Studierende:r",
  user: "Nutzer:in",
  second_examiner: "Zweitprüfer:in",
  pav: "PA-Vorsitzende:r",
  dean: "Dekan:in",
  vice_dean: "Prodekan:in",
  programme_director: "Studiengangsleitung",
};

function RoleBadge({ role }: { role: string }) {
  const badge = getRoleBadge(role);
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.className}`}>
      {ROLE_LABELS[role] ?? badge.label}
    </span>
  );
}

// ─── Nutzer-Rollen-Verwaltung ─────────────────────────────────────────────────

function UserManagementTab() {
  const { data: users, isLoading, refetch } = trpc.admin.users.useQuery();
  const updateRole = trpc.admin.updateUserRole.useMutation({ onSuccess: () => refetch() });
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  const filtered = useMemo(() => {
    if (!users) return [];
    return users.filter((u) => {
      const matchSearch =
        !search ||
        buildFullName({ firstName: (u.user as any).firstName, lastName: (u.user as any).lastName, academicTitle: (u.user as any).academicTitle, name: u.user.name }).toLowerCase().includes(search.toLowerCase()) ||
        u.user.email?.toLowerCase().includes(search.toLowerCase());
      const matchRole = filterRole === "all" || u.user.role === filterRole;
      return matchSearch && matchRole;
    });
  }, [users, search, filterRole]);

  if (isLoading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-gray-300 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          type="text"
          placeholder="Suche nach Name oder E-Mail…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2"
        />
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 bg-white"
        >
          <option value="all">Alle Rollen</option>
          {Object.entries(ROLE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">E-Mail</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Aktuelle Rolle</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Rolle ändern</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.user.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{u.user.name ?? "–"}</td>
                <td className="px-4 py-3 text-gray-600">{u.user.email ?? "–"}</td>
                <td className="px-4 py-3"><RoleBadge role={u.user.role} /></td>
                <td className="px-4 py-3">
                  <select
                    value={u.user.role}
                    onChange={(e) => updateRole.mutate({ userId: u.user.id, role: e.target.value as any })}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 bg-white"
                  >
                    {Object.entries(ROLE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">Keine Nutzer:innen gefunden.</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-2">{filtered.length} von {users?.length ?? 0} Nutzer:innen angezeigt</p>
    </div>
  );
}

// ─── Audit-Log-Export ─────────────────────────────────────────────────────────

function AuditLogTab() {
  const { data: logs, isLoading } = trpc.auditLog.all.useQuery();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!logs) return [];
    if (!search) return logs;
    const q = search.toLowerCase();
    return logs.filter(
      (l: any) =>
        l.action?.toLowerCase().includes(q) ||
        JSON.stringify(l.metadata ?? {}).toLowerCase().includes(q)
    );
  }, [logs, search]);

  const exportCSV = () => {
    if (!filtered.length) return;
    const header = ["ID", "Aktion", "Akteur-ID", "Zeitstempel", "Details"];
    const rows = (filtered as any[]).map((l) => [
      l.id,
      l.action,
      l.actorId ?? "",
      new Date(l.createdAt).toLocaleString("de-DE"),
      JSON.stringify(l.metadata ?? {}),
    ]);
    const csv = [header, ...rows]
      .map((r: any[]) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-gray-300 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          type="text"
          placeholder="Suche in Aktionen und Details…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2"
        />
        <button
          onClick={exportCSV}
          disabled={!filtered.length}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90 disabled:opacity-40"
          style={{ backgroundColor: "#76B900" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          CSV exportieren ({filtered.length})
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Zeitstempel</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Aktion</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Akteur-ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((l: any) => (
                <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(l.createdAt).toLocaleString("de-DE")}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-gray-100 text-gray-700">
                      {l.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{l.actorId ?? "–"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono max-w-xs truncate">
                    {JSON.stringify(l.metadata ?? {})}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">Keine Einträge gefunden.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 100 && (
          <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">
            Zeige 100 von {filtered.length} Einträgen. Exportieren Sie die CSV für alle Daten.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Phase 40: Nutzer-Details Modal ────────────────────────────────────────────────────────

function UserDetailsModal({ userId, onClose }: { userId?: number; onClose: () => void }) {
  const { data: user, isLoading, refetch } = trpc.superadmin.getUserDetails.useQuery(
    { userId: userId || 0 },
    { enabled: !!userId }
  );
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const setRoleMutation = trpc.superadmin.setUserRole.useMutation({
    onSuccess: () => {
      setIsEditingRole(false);
      setShowConfirm(false);
      toast.success("Rolle erfolgreich geändert.");
      setStatusMessage({ type: 'success', text: 'Rolle erfolgreich geändert' });
      setTimeout(() => setStatusMessage(null), 3000);
      refetch();
    },
    onError: (error) => {
      console.error("Fehler beim Aendern der Rolle:", error);
      toast.error("Fehler beim Ändern der Rolle: " + error.message);
      setStatusMessage({ type: 'error', text: 'Fehler beim Aendern der Rolle' });
      setTimeout(() => setStatusMessage(null), 3000);
    },
  });

  const handleRoleChange = (newRole: string) => {
    setSelectedRole(newRole);
    setShowConfirm(true);
  };

  const confirmRoleChange = async () => {
    if (userId && selectedRole) {
      await setRoleMutation.mutateAsync({
        userId,
        role: selectedRole as any,
      });
    }
  };

  if (!userId) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Nutzer-Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Lädt...</div>
        ) : user ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-600">Email</label>
              <p className="text-gray-900">{user.email}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600">Name</label>
              <p className="text-gray-900">{user.name || "-"}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600">Rolle</label>
              {isEditingRole ? (
                <select
                  value={selectedRole || user.role}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                >
                  <option value="student">Studierende:r</option>
                  <option value="examiner">Pruefer:in</option>
                  <option value="pav">PAV</option>
                  <option value="admin">Admin</option>
                  <option value="dean">Dekan:in</option>
                  <option value="vice_dean">Vizedekan:in</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              ) : (
                <div className="flex items-center justify-between">
                  <RoleBadge role={user.role} />
                  <button
                    onClick={() => {
                      setIsEditingRole(true);
                      setSelectedRole(user.role);
                    }}
                    className="px-3 py-1 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    Aendern
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600">Registriert am</label>
              <p className="text-gray-900">{new Date(user.createdAt).toLocaleDateString("de-DE")}</p>
            </div>

            {statusMessage && (
              <div className={`mt-4 p-4 rounded-lg border ${
                statusMessage.type === 'success'
                  ? 'bg-primary/5 border-primary/20'
                  : 'bg-red-50 border-red-200'
              }`}>
                <p className={`text-sm ${
                  statusMessage.type === 'success'
                    ? 'text-primary-foreground'
                    : 'text-red-900'
                }`}>
                  {statusMessage.text}
                </p>
              </div>
            )}

            {showConfirm && (
              <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-900 mb-3">
                  Moechten Sie die Rolle wirklich von <strong>{user.role}</strong> zu <strong>{selectedRole}</strong> aendern?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={confirmRoleChange}
                    disabled={setRoleMutation.isPending}
                    className="flex-1 px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {setRoleMutation.isPending ? "Speichert..." : "Bestaetigen"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">Nutzer nicht gefunden</div>
        )}
      </div>
    </div>
  );
}

// ─── Phase 40: Nutzer-Verwaltungs-Dashboard ─────────────────────────────────────

function UserDashboardTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const pageSize = 20;
  // Debounced Suche (300ms Verzögerung)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  // Abrufe Statistiken
  const { data: stats, isLoading: statsLoading } = trpc.superadmin.getUserStatistics.useQuery();
  // Suche Nutzer
  const { data: searchResults, isLoading: searchLoading } = trpc.superadmin.searchUsers.useQuery(
    {
      query: debouncedSearchQuery,
      role: roleFilter || undefined,
      limit: pageSize,
      offset: currentPage * pageSize,
    },
    { enabled: debouncedSearchQuery.length > 0 || roleFilter.length > 0 }
  );
  // Abrufe alle Nutzer wenn keine Suche aktiv
  const { data: allUsers, isLoading: usersLoading } = trpc.superadmin.getAllUsers.useQuery(
    {
      limit: pageSize,
      offset: currentPage * pageSize,
    },
    { enabled: debouncedSearchQuery.length === 0 && roleFilter.length === 0 }
  );

  const users = searchResults || allUsers;
  const isLoading = searchLoading || usersLoading;

  // Berechne Statistik-Karten
  const statCards = useMemo(() => {
    if (!stats) return [];
    return [
      {
        label: "Gesamt Nutzer",
        value: stats.total || 0,
        icon: "👥",
        color: "bg-blue-50",
      },
      {
        label: "Studierende",
        value: stats.student || 0,
        icon: "📚",
        color: "bg-amber-50",
      },
      {
        label: "Prüfer:innen",
        value: stats.examiner || 0,
        icon: "🎓",
        color: "bg-primary/5",
      },
      {
        label: "Admins",
        value: stats.admin || 0,
        icon: "🛡️",
        color: "bg-red-50",
      },
    ];
  }, [stats]);

  const handleViewDetails = (userId: number) => {
    setSelectedUser(userId);
    setShowDetailsModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailsModal(false);
    setSelectedUser(null);
  };

  const totalPages = users?.total ? Math.ceil(users.total / pageSize) : 1;

  return (
    <div className="space-y-6">
      {/* Statistik-Karten */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className={`${card.color} rounded-2xl border border-gray-100 shadow-sm p-5`}>
            <div className="text-2xl mb-2">{card.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{card.value}</div>
            <div className="text-xs text-gray-500 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Suchbereich */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Nutzer verwalten</h3>
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <input
            type="text"
            placeholder="Email oder Name suchen…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(0);
            }}
            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(0);
            }}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
          >
            <option value="">Alle Rollen</option>
            <option value="student">Studierende</option>
            <option value="examiner">Prüfer:innen</option>
            <option value="pav">PAV</option>
            <option value="admin">Admin</option>
            <option value="dean">Dekan</option>
            <option value="superadmin">Superadmin</option>
          </select>
        </div>
      </div>

      {/* Nutzer-Tabelle */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Alle Nutzer ({users?.total || 0})</h3>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Lädt...</div>
        ) : users?.users && users.users.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Rolle</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Registriert</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {users.users.map((u: any) => (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{u.email}</td>
                      <td className="px-4 py-3 text-gray-600">{u.name || "-"}</td>
                      <td className="px-4 py-3">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleDateString("de-DE")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleViewDetails(u.id)}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium hover:bg-gray-50 transition-colors"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                Seite {currentPage + 1} von {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  Zurück
                </button>
                <button
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  Weiter
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">Keine Nutzer gefunden</div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && <UserDetailsModal userId={selectedUser} onClose={handleCloseModal} />}
    </div>
  );
}

// ─── Systemstatistiken ────────────────────────────────────────────────────────
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const ROLE_PIE_COLORS = ["#76B900", "#0082D1", "#FF5F00", "#AFAFAF", "#7C3AED", "#DB2777"];
const STATUS_BAR_COLORS: Record<string, string> = {
  PENDING: "#AFAFAF",
  ACCEPTED: "#76B900",
  REJECTED: "#FF5F00",
  COMPLETED: "#0082D1",
  CANCELLED: "#DB2777",
};
const STATUS_LABELS_MAP: Record<string, string> = {
  PENDING: "Ausstehend",
  ACCEPTED: "Angenommen",
  REJECTED: "Abgelehnt",
  COMPLETED: "Abgeschlossen",
  CANCELLED: "Storniert",
};

function SystemStatsTab() {
  const { data: users } = trpc.admin.users.useQuery();
  const { data: stats } = trpc.admin.stats.useQuery();

  const roleCount = useMemo(() => {
    if (!users) return {};
    return users.reduce((acc: Record<string, number>, u) => {
      acc[u.user.role] = (acc[u.user.role] ?? 0) + 1;
      return acc;
    }, {});
  }, [users]);

  // Daten für Pie-Chart (Rollen-Verteilung)
  const rolePieData = useMemo(() => {
    return Object.entries(ROLE_LABELS)
      .map(([role, label]) => ({ name: label, value: roleCount[role] ?? 0 }))
      .filter((d) => d.value > 0);
  }, [roleCount]);

  // Daten für Bar-Chart (Thesis-Status)
  const statusBarData = useMemo(() => {
    if (!stats?.byStatus) return [];
    return (stats.byStatus as any[]).map((s) => ({
      name: STATUS_LABELS_MAP[s.name] ?? s.name,
      Anzahl: s.value ?? s.count ?? 0,
      fill: STATUS_BAR_COLORS[s.name] ?? "#AFAFAF",
    }));
  }, [stats]);

  const statCards = [
    { label: "Nutzer:innen gesamt", value: users?.length ?? 0, icon: "\u{1F465}" },
    { label: "Superadmins", value: roleCount["superadmin"] ?? 0, icon: "\u{1F511}" },
    { label: "Admins / Verwaltung", value: roleCount["admin"] ?? 0, icon: "\u{1F6E1}\uFE0F" },
    { label: "Prüfer:innen", value: roleCount["examiner"] ?? 0, icon: "\u{1F393}" },
    { label: "Studierende", value: roleCount["student"] ?? 0, icon: "\u{1F4DA}" },
    { label: "Abschlussarbeiten gesamt", value: (stats?.byStatus?.reduce((a: number, s: any) => a + (s.value ?? s.count ?? 0), 0) ?? 0), icon: "\u{1F4C4}" },
    { label: "Ausstehende Anfragen", value: (stats?.byStatus as any[])?.find((s) => s.name === "PENDING")?.value ?? 0, icon: "\u23F3" },
    { label: "Angenommene Anfragen", value: (stats?.byStatus as any[])?.find((s) => s.name === "ACCEPTED")?.value ?? 0, icon: "\u2705" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="text-2xl mb-2">{c.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{c.value}</div>
            <div className="text-xs text-gray-500 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Charts-Reihe */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie-Chart: Rollen-Verteilung */}
        {rolePieData.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Rollen-Verteilung</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={rolePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {rolePieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={ROLE_PIE_COLORS[index % ROLE_PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value} Nutzer:innen`, "Anzahl"]} />
              </PieChart>
            </ResponsiveContainer>
            {/* Legende */}
            <div className="flex flex-wrap gap-2 mt-3">
              {rolePieData.map((d, index) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: ROLE_PIE_COLORS[index % ROLE_PIE_COLORS.length] }} />
                  {d.name} ({d.value})
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bar-Chart: Abschlussarbeiten nach Status */}
        {statusBarData.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Abschlussarbeiten nach Status</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={statusBarData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="Anzahl" radius={[4, 4, 0, 0]}>
                  {statusBarData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {stats?.byDepartment && stats.byDepartment.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Anfragen nach Studiengang</h3>
          <div className="space-y-3">
            {stats.byDepartment.map((d: any) => (
              <div key={d.name ?? d.department} className="flex items-center gap-3">
                <div className="text-sm text-gray-600 w-40 truncate">{(d.name ?? d.department) || "Nicht angegeben"}</div>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${Math.min(100, ((d.value ?? d.count ?? 0) / Math.max(...stats.byDepartment.map((x: any) => x.value ?? x.count ?? 1))) * 100)}%`,
                      backgroundColor: "#76B900",
                    }}
                  />
                </div>
                <div className="text-sm font-medium text-gray-900 w-8 text-right">{d.value ?? d.count ?? 0}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────


// --- Systemkonfiguration ---

function SystemConfigTab() {
  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.superadmin.getSettings.useQuery();
  const { data: twoFactorGaps, isLoading: twoFactorGapsLoading } = trpc.superadmin.getTwoFactorEnrollmentGaps.useQuery();
  const twoFactorRoleLabels: Record<string, string> = { examiner: "Erstprüfer:in", second_examiner: "Zweitprüfer:in", admin: "Verwaltung", dean: "Dekanat", vice_dean: "Prodekanat", programme_director: "Studiengangsleitung", pav: "PA-Vorsitz", superadmin: "Superadmin" };
  const updateSettings = trpc.superadmin.updateSettings.useMutation({
    onSuccess: () => utils.superadmin.getSettings.invalidate(),
  });

  type FormState = {
    systemName: string;
    contactEmail: string;
    maintenanceMode: "true" | "false";
    maxSupervisionDefault: string;
    allowStudentRegistration: "true" | "false";
    footerText: string;
    thesisDeadlineWarningDays: string;
    pdfDisclaimerDe: string;
    pdfDisclaimerEn: string;
    administrationEmail: string;
    twoFactorRequiredRoles: Array<"student" | "examiner" | "second_examiner" | "pav" | "admin" | "dean" | "vice_dean" | "programme_director" | "superadmin">;
  };
  const [form, setForm] = useState<FormState | null>(null);
  const [saved, setSaved] = useState(false);

  // Formular mit Serverdaten befüllen (einmalig nach dem ersten Laden)
  useEffect(() => {
    if (settings && !form) {
      setForm({
        systemName: settings.systemName,
        contactEmail: settings.contactEmail,
        maintenanceMode: settings.maintenanceMode as "true" | "false",
        maxSupervisionDefault: settings.maxSupervisionDefault,
        allowStudentRegistration: settings.allowStudentRegistration as "true" | "false",
        footerText: settings.footerText,
        thesisDeadlineWarningDays: settings.thesisDeadlineWarningDays,
        pdfDisclaimerDe: (settings as any).pdfDisclaimerDe ?? "",
        pdfDisclaimerEn: (settings as any).pdfDisclaimerEn ?? "",
        administrationEmail: (settings as any).administrationEmail ?? "",
        twoFactorRequiredRoles: ((settings as any).twoFactorRequiredRoles ?? []) as FormState["twoFactorRequiredRoles"],
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const handleSave = async () => {
    if (!form) return;
    try {
      await updateSettings.mutateAsync(form);
      setSaved(true);
      toast.success("Einstellungen erfolgreich gespeichert.");
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      toast.error("Fehler beim Speichern: " + (err?.message ?? "Unbekannter Fehler"));
    }
  };

  if (isLoading || !form) {
    return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-gray-300 border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h3 className="font-semibold text-gray-900 text-base">Allgemeine Einstellungen</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Systemname</label>
          <input type="text" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.systemName} onChange={(e) => setForm((f) => f ? { ...f, systemName: e.target.value } : f)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kontakt-E-Mail</label>
          <input type="email" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.contactEmail} onChange={(e) => setForm((f) => f ? { ...f, contactEmail: e.target.value } : f)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Verwaltungs-E-Mail (LVVO-Nachweis)</label>
          <input type="email" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="z.B. pruefungsamt@htw-berlin.de" value={form.administrationEmail} onChange={(e) => setForm((f) => f ? { ...f, administrationEmail: e.target.value } : f)} />
          <p className="text-xs text-gray-400 mt-1">Wird als Standard-Empfänger beim Versenden des LVVO-Nachweises vorausgefüllt.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fusszeilen-Text</label>
          <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" rows={3} value={form.footerText} onChange={(e) => setForm((f) => f ? { ...f, footerText: e.target.value } : f)} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <h3 className="font-semibold text-gray-900 text-base">Betrieb</h3>
        <div className="flex items-start gap-4">
          <button type="button" onClick={() => setForm((f) => f ? { ...f, maintenanceMode: f.maintenanceMode === "true" ? "false" : "true" } : f)} className={"relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none " + (form.maintenanceMode === "true" ? "bg-primary" : "bg-gray-200")}>
            <span className={"pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 " + (form.maintenanceMode === "true" ? "translate-x-5" : "translate-x-0")} />
          </button>
          <div>
            <div className="text-sm font-medium text-gray-700">Wartungsmodus</div>
            <div className="text-xs text-gray-500">Wenn aktiv, ist das System fuer normale Nutzer:innen gesperrt.</div>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <button type="button" onClick={() => setForm((f) => f ? { ...f, allowStudentRegistration: f.allowStudentRegistration === "true" ? "false" : "true" } : f)} className={"relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none " + (form.allowStudentRegistration === "true" ? "bg-primary" : "bg-gray-200")}>
            <span className={"pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 " + (form.allowStudentRegistration === "true" ? "translate-x-5" : "translate-x-0")} />
          </button>
          <div>
            <div className="text-sm font-medium text-gray-700">Studierenden-Registrierung erlauben</div>
            <div className="text-xs text-gray-500">Wenn deaktiviert, koennen sich keine neuen Studierenden registrieren.</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h3 className="font-semibold text-gray-900 text-base">Schwellenwerte</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Standard-Betreuungskapazitaet (Pruefer:in)</label>
          <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.maxSupervisionDefault} onChange={(e) => setForm((f) => f ? { ...f, maxSupervisionDefault: e.target.value } : f)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Deadline-Warnung (Tage vorher)</label>
          <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.thesisDeadlineWarningDays} onChange={(e) => setForm((f) => f ? { ...f, thesisDeadlineWarningDays: e.target.value } : f)} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-6 space-y-4">
        <div><h3 className="font-semibold text-gray-900 text-base">Verpflichtende Zwei-Faktor-Authentifizierung</h3><p className="mt-1 text-xs text-gray-600">Ausgewählte Rollen müssen 2FA eingerichtet haben, bevor sie sich anmelden können. Aktivieren Sie eine Rolle erst, nachdem die betroffenen Personen die Einrichtung abgeschlossen haben.</p></div>
        <div className="grid gap-2 sm:grid-cols-2">
          {([['examiner','Erstprüfer:innen'],['second_examiner','Zweitprüfer:innen'],['admin','Verwaltung'],['dean','Dekanat'],['vice_dean','Prodekanat'],['programme_director','Studiengangsleitung'],['pav','PA-Vorsitz'],['superadmin','Superadmins']] as const).map(([role, label]) => <label key={role} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"><input type="checkbox" checked={form.twoFactorRequiredRoles.includes(role)} onChange={() => setForm((current) => current ? { ...current, twoFactorRequiredRoles: current.twoFactorRequiredRoles.includes(role) ? current.twoFactorRequiredRoles.filter((entry) => entry !== role) : [...current.twoFactorRequiredRoles, role] } : current)} />{label}</label>)}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold text-gray-900 text-base">Ausstehende verpflichtende 2FA-Einrichtungen</h3><p className="mt-1 text-xs text-gray-600">Diese Personen haben eine Rolle mit verpflichtender Zwei-Faktor-Authentifizierung, die Einrichtung aber noch nicht abgeschlossen.</p></div><span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900">{twoFactorGaps?.length ?? 0}</span></div>
        {twoFactorGapsLoading ? <p className="mt-4 text-sm text-gray-500">Liste wird geladen …</p> : twoFactorGaps?.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="border-b border-gray-200 text-xs text-gray-500"><tr><th className="px-3 py-2 font-medium">Name</th><th className="px-3 py-2 font-medium">E-Mail</th><th className="px-3 py-2 font-medium">Rolle</th><th className="px-3 py-2 font-medium">Frist</th><th className="px-3 py-2 font-medium">Status</th></tr></thead><tbody>{twoFactorGaps.map((user) => <tr key={user.id} className={`border-b last:border-0 ${user.twoFactorOverdue ? "border-red-200 bg-red-50" : "border-gray-100"}`}><td className={`px-3 py-3 font-medium ${user.twoFactorOverdue ? "text-red-950" : "text-gray-900"}`}>{user.name ?? "Ohne Namen"}</td><td className={`px-3 py-3 ${user.twoFactorOverdue ? "text-red-800" : "text-gray-600"}`}>{user.email}</td><td className={`px-3 py-3 ${user.twoFactorOverdue ? "text-red-800" : "text-gray-600"}`}>{twoFactorRoleLabels[user.role ?? ""] ?? user.role}</td><td className={`px-3 py-3 ${user.twoFactorOverdue ? "font-semibold text-red-800" : "text-gray-600"}`}>{new Date(user.twoFactorDeadline).toLocaleDateString("de-DE")}</td><td className="px-3 py-3">{user.twoFactorOverdue ? <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800"><svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>Frist abgelaufen</span> : <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">Einrichtung ausstehend</span>}</td></tr>)}</tbody></table></div> : <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-800">Für die aktuell ausgewählten Rollen stehen keine verpflichtenden 2FA-Einrichtungen aus.</p>}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-gray-900 text-base mb-1">PDF-Disclaimer</h3>
          <p className="text-xs text-gray-500 mb-4">Dieser Text erscheint klein am Ende des Anmeldedokuments in beiden Sprachen. Er kann hier jederzeit angepasst werden.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Deutsch</label>
          <textarea
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            rows={5}
            value={form.pdfDisclaimerDe}
            onChange={(e) => setForm((f) => f ? { ...f, pdfDisclaimerDe: e.target.value } : f)}
            placeholder="Deutschen Disclaimer-Text eingeben..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">English</label>
          <textarea
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            rows={5}
            value={form.pdfDisclaimerEn}
            onChange={(e) => setForm((f) => f ? { ...f, pdfDisclaimerEn: e.target.value } : f)}
            placeholder="Enter English disclaimer text..."
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={updateSettings.isPending} className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
          {updateSettings.isPending ? "Wird gespeichert..." : "Einstellungen speichern"}
        </button>
        {saved && <span className="text-sm text-primary font-medium">Gespeichert</span>}
        {updateSettings.isError && <span className="text-sm text-red-600">{updateSettings.error?.message}</span>}
      </div>
    </div>
  );
}

// --- PAV-Verwaltungs-Komponente ---
function PavManagementTab() {
  const { data: pavUsers, refetch } = trpc.superadmin.getPavUsers.useQuery();
  const { data: allProgrammes } = trpc.programmes.list.useQuery();
  const assignProg = trpc.superadmin.assignPavProgramme.useMutation({
    onSuccess: () => { refetch(); toast.success("Studiengang erfolgreich zugewiesen."); },
    onError: (err) => toast.error("Fehler beim Zuweisen: " + err.message),
  });
  const removeProg = trpc.superadmin.removePavProgramme.useMutation({
    onSuccess: () => { refetch(); toast.success("Studiengang erfolgreich entfernt."); },
    onError: (err) => toast.error("Fehler beim Entfernen: " + err.message),
  });

  if (!pavUsers || pavUsers.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
        <p className="text-gray-400 text-sm">Keine PAV-Vorsitzenden vorhanden.</p>
        <p className="text-gray-400 text-xs mt-1">Weisen Sie Nutzer:innen zunaechst die Rolle "PAV" zu (Tab Nutzer:innen & Rollen).</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Weisen Sie PA-Vorsitzenden Studiengaenge zu. PAV-Vorsitzende sehen im PAV-Dashboard nur Studierende ihrer zugeordneten Studiengaenge.
      </p>
      {(pavUsers ?? []).map(({ user: u, programmes: assigned }) => (
        <div key={u.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <p className="font-semibold text-gray-900">{u.name ?? u.email}</p>
            <p className="text-xs text-gray-400">{u.email}</p>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(allProgrammes ?? []).map((prog) => {
              const isAssigned = assigned.some((a) => a.programmeId === prog.id);
              return (
                <div
                  key={prog.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    isAssigned ? "border-[#76B900] bg-primary/5" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ProgrammeLogo abbreviation={prog.abbreviation ?? ''} pictogramUrl={(prog as any).pictogramUrl} size="lg" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{prog.name}</p>
                      <p className="text-xs text-gray-400">{prog.level === "master" ? "Master" : "Bachelor"} · {prog.abbreviation}</p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      isAssigned
                        ? removeProg.mutate({ userId: u.id, programmeId: prog.id })
                        : assignProg.mutate({ userId: u.id, programmeId: prog.id })
                    }
                    disabled={assignProg.isPending || removeProg.isPending}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      isAssigned
                        ? "bg-red-50 text-red-600 hover:bg-red-100"
                        : "bg-[#76B900] text-white hover:bg-[var(--primary)]"
                    } disabled:opacity-50`}
                  >
                    {isAssigned ? "Entfernen" : "Zuweisen"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// TABS werden dynamisch in der Komponente erzeugt (abhängig von t)

const navItems = [
  { label: "Superadmin", href: "/superadmin", icon: "🔑" },
  { label: "Admin-Dashboard", href: "/admin", icon: "🛡️" },
  { label: "Startseite", href: "/", icon: "🏠" },
];

export default function SuperadminDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("stats");

  const TABS = [
    { id: "role_approvals", label: "Rollenanfragen", icon: "✅" },
    { id: "stats", label: t.superadmin.tabs.overview, icon: "📊" },
    { id: "users", label: t.superadmin.tabs.users, icon: "👥" },
    { id: "user_dashboard", label: "Nutzer-Verwaltung", icon: "👤" },
    { id: "examiners", label: t.superadmin.examinerManagement, icon: "🎓", action: () => setLocation("/superadmin/examiners") },
    { id: "pav", label: "PAV", icon: "🏫" },
    { id: "audit", label: "Audit-Log", icon: "📋" },
    { id: "config", label: t.superadmin.tabs.settings, icon: "⚙️" },
    { id: "saml", label: "SAML 2.0", icon: "🔐" },
    { id: "email_templates", label: t.superadmin.tabs.emailTemplates, icon: "✉️" },
    { id: "admin_management", label: "Rechteverwaltung", icon: "🛡️" },
    { id: "infrastructure", label: "Infrastruktur", icon: "🖥️" },
  ];

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'superadmin')) {
      navigate('/');
    }
  }, [loading, isAuthenticated, user?.role]);

  if (loading) return null;
  if (!isAuthenticated || user?.role !== 'superadmin') return null;

  return (
      <ThesisDashboardLayout navItems={navItems} title={t.superadmin.title}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">🔑</span>
          <h1 className="text-2xl font-bold text-gray-900">{t.superadmin.title}</h1>
        </div>
        <p className="text-sm text-gray-500">
          Exklusiver Bereich für <strong>{buildFullName({ firstName: (user as any)?.firstName, lastName: (user as any)?.lastName, academicTitle: (user as any)?.academicTitle, name: user?.name }) || user?.email}</strong> – vollständige Systemverwaltung.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.action) tab.action();
              else setActiveTab(tab.id);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-white shadow text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab-Inhalt */}
      {activeTab === "role_approvals" && <RoleApprovalTab canApproveAll={true} />}
      {activeTab === "stats" && <SystemStatsTab />}
      {activeTab === "users" && <UserManagementTab />}
      {activeTab === "user_dashboard" && <UserDashboardTab />}
      {activeTab === "pav" && <PavManagementTab />}
      {activeTab === "audit" && <AuditLogTab />}
      {activeTab === "config" && <SystemConfigTab />}
      {activeTab === "saml" && <SamlConfigurationTab />}
      {activeTab === "email_templates" && <EmailTemplatesTab />}
      {activeTab === "admin_management" && <AdminManagementTab />}
      {activeTab === "infrastructure" && <InfrastructureTab />}
    </ThesisDashboardLayout>
  );
}
