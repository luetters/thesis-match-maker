import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";

function parseUserAgent(ua: string | null | undefined): string {
  if (!ua) return "—";
  let browser = "Unbekannt";
  let os = "";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/.test(ua)) browser = "Opera";
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = "Safari";
  else if (/MSIE|Trident/.test(ua)) browser = "Internet Explorer";
  if (/Windows NT 10/.test(ua)) os = "Windows 10/11";
  else if (/Windows NT 6/.test(ua)) os = "Windows";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad/.test(ua)) os = "iOS";
  else if (/Linux/.test(ua)) os = "Linux";
  return os ? `${browser} / ${os}` : browser;
}

/** Filterbare Übersicht der protokollierten Anmeldeversuche. */
export function LoginAttemptsView() {
  const [searchText, setSearchText] = useState("");
  const [onlyFailed, setOnlyFailed] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const queryInput = useMemo(() => ({
    onlyFailed,
    limit: 500,
    search: searchText.trim() || undefined,
    dateFrom: dateFrom ? new Date(dateFrom) : undefined,
    dateTo: dateTo ? new Date(dateTo) : undefined,
  }), [onlyFailed, searchText, dateFrom, dateTo]);
  const { data: attempts, isLoading } = trpc.admin.getLoginAttempts.useQuery(queryInput, { refetchInterval: 30000 });
  const filtered = attempts ?? [];
  const failureLabels: Record<string, string> = {
    user_not_found: "Konto nicht gefunden",
    wrong_password: "Falsches Passwort",
    account_not_approved: "Konto nicht freigeschaltet",
    account_rejected: "Registrierungsantrag abgelehnt",
    "Konto nicht gefunden": "Konto nicht gefunden",
    "Falsches Passwort": "Falsches Passwort",
    "Kein Passwort gesetzt (ehemaliges Magic-Link-Konto)": "Kein Passwort gesetzt",
    "Konto noch nicht freigeschaltet": "Konto noch nicht freigeschaltet",
    "Registrierungsantrag abgelehnt": "Registrierungsantrag abgelehnt",
    "Ungültige E-Mail-Domäne (keine HTW-Berlin-Adresse)": "Ungültige E-Mail-Domäne",
  };
  const failureColors: Record<string, string> = {
    "Falsches Passwort": "bg-red-50 text-red-700",
    wrong_password: "bg-red-50 text-red-700",
    "Konto nicht gefunden": "bg-orange-50 text-orange-700",
    user_not_found: "bg-orange-50 text-orange-700",
    "Kein Passwort gesetzt (ehemaliges Magic-Link-Konto)": "bg-amber-50 text-amber-700",
    "Kein Passwort gesetzt": "bg-amber-50 text-amber-700",
    "Konto noch nicht freigeschaltet": "bg-yellow-50 text-yellow-700",
    account_not_approved: "bg-yellow-50 text-yellow-700",
    "Registrierungsantrag abgelehnt": "bg-red-50 text-red-700",
    account_rejected: "bg-red-50 text-red-700",
    "Ungültige E-Mail-Domäne (keine HTW-Berlin-Adresse)": "bg-purple-50 text-purple-700",
    "Ungültige E-Mail-Domäne": "bg-purple-50 text-purple-700",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Nach E-Mail oder Fehlergrund suchen..." className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="flex items-center gap-2"><label className="whitespace-nowrap text-xs text-gray-500">Von</label><input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
        <div className="flex items-center gap-2"><label className="whitespace-nowrap text-xs text-gray-500">Bis</label><input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
        {(dateFrom || dateTo || searchText) && <button onClick={() => { setSearchText(""); setDateFrom(""); setDateTo(""); }} className="text-xs text-gray-400 underline hover:text-gray-600">Filter zurücksetzen</button>}
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={onlyFailed} onChange={(event) => setOnlyFailed(event.target.checked)} className="rounded" />Nur fehlgeschlagene</label>
        <span className="text-xs text-gray-400">{filtered.length} Einträge</span>
      </div>
      {attempts && attempts.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Gesamt", value: attempts.length, color: "text-gray-700", bg: "bg-gray-50" },
          { label: "Erfolgreich", value: attempts.filter((attempt) => attempt.success).length, color: "text-green-700", bg: "bg-green-50" },
          { label: "Fehlgeschlagen", value: attempts.filter((attempt) => !attempt.success).length, color: "text-red-700", bg: "bg-red-50" },
          { label: "Heute", value: attempts.filter((attempt) => new Date(attempt.createdAt).toDateString() === new Date().toDateString()).length, color: "text-blue-700", bg: "bg-blue-50" },
        ].map((statistic) => <div key={statistic.label} className={`${statistic.bg} flex flex-col rounded-xl px-4 py-3`}><span className={`text-2xl font-bold ${statistic.color}`}>{statistic.value}</span><span className="mt-0.5 text-xs text-gray-500">{statistic.label}</span></div>)}
      </div>}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-gray-100 bg-gray-50"><th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Zeitpunkt</th><th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">E-Mail</th><th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Status</th><th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Grund</th><th className="hidden px-5 py-3 text-left text-xs font-semibold text-gray-500 lg:table-cell">Browser / OS</th><th className="hidden px-5 py-3 text-left text-xs font-semibold text-gray-500 md:table-cell">IP-Adresse</th></tr></thead><tbody>
        {isLoading && <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-400">Lade...</td></tr>}
        {!isLoading && filtered.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-400">Keine Einträge vorhanden.</td></tr>}
        {filtered.map((attempt) => <tr key={attempt.id} className="border-b border-gray-50 transition-colors last:border-0 hover:bg-gray-50/50"><td className="whitespace-nowrap px-5 py-3 text-sm text-gray-600">{new Date(attempt.createdAt).toLocaleString("de-DE")}</td><td className="px-5 py-3 text-sm font-medium text-gray-900">{attempt.email}</td><td className="px-5 py-3">{attempt.success ? <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Erfolgreich</span> : <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Fehlgeschlagen</span>}</td><td className="px-5 py-3">{attempt.failureReason ? <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${failureColors[attempt.failureReason] ?? "bg-gray-100 text-gray-600"}`}>{failureLabels[attempt.failureReason] ?? attempt.failureReason}</span> : <span className="text-sm text-gray-400">—</span>}</td><td className="hidden px-5 py-3 text-xs text-gray-500 lg:table-cell">{parseUserAgent((attempt as { userAgent?: string | null }).userAgent)}</td><td className="hidden px-5 py-3 font-mono text-sm text-gray-400 md:table-cell">{attempt.ipAddress ?? "—"}</td></tr>)}
      </tbody></table></div></div>
    </div>
  );
}
