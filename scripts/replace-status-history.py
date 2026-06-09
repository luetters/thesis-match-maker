#!/usr/bin/env python3
"""Ersetzt die StatusHistory-Komponente im StudentDashboard."""

path = "/home/ubuntu/thesis-match-maker/client/src/pages/StudentDashboard.tsx"

with open(path, "r") as f:
    content = f.read()

# Marker für Anfang und Ende der alten Komponente
start_marker = "Statushistorie"
end_marker = "Main Component"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print(f"FEHLER: Marker nicht gefunden (start={start_idx}, end={end_idx})")
    exit(1)

# Gehe zurück zum Beginn der Kommentarzeile (// ─── ...)
# Suche rückwärts nach dem letzten Zeilenumbruch vor start_idx
line_start = content.rfind("\n", 0, start_idx - 5) + 1

print(f"Ersetze von Zeichen {line_start} bis {end_idx - 2}")

NEW_COMPONENT = '''// \u2500\u2500\u2500 Statushistorie \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

// Lesbare Labels f\u00fcr Audit-Aktionen
const AUDIT_ACTION_LABELS: Record<string, string> = {
  THESIS_CREATED: "Antrag eingereicht",
  STATUS_CHANGED: "Status ge\u00e4ndert",
  EXAMINER_ACCEPTED: "Betreuung angenommen",
  EXAMINER_REJECTED: "Betreuung abgelehnt",
  FIRST_EXAMINER_ASSIGNED: "Erstgutachter:in zugewiesen",
  SECOND_EXAMINER_ASSIGNED: "Zweitgutachter:in zugewiesen",
  COLLOQUIUM_CREATED: "Kolloquium angelegt",
  DEADLINE_SET: "Abgabefrist gesetzt",
  DEADLINE_EXTENDED: "Abgabefrist verl\u00e4ngert",
  ENROLLMENT_ELIGIBILITY_SET: "Zulassungspr\u00fcfung abgeschlossen",
  DEFENSE_ELIGIBILITY_SET: "Verteidigungsfreigabe erteilt",
  REGISTRATION_SET: "Offizielle Anmeldung eingetragen",
  ADMISSION_SET: "Zulassung eingetragen",
  CASE_CLOSED: "Vorgang abgeschlossen",
  DRAFT_WITHDRAWN: "Einladung zur\u00fcckgezogen",
  STUDENT_CONFIRMED: "Einladung best\u00e4tigt",
};

// Status-Badges
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Ausstehend", color: "bg-amber-100 text-amber-800" },
  PENDING_FIRST_EXAMINER: { label: "Wartet auf Erstgutachter:in", color: "bg-blue-100 text-blue-800" },
  PENDING_SECOND_EXAMINER: { label: "Wartet auf Zweitgutachter:in", color: "bg-blue-100 text-blue-800" },
  PENDING_STUDENT_CONFIRMATION: { label: "Wartet auf Ihre Best\u00e4tigung", color: "bg-amber-100 text-amber-800" },
  FIRST_EXAMINER_ACCEPTED: { label: "Erstgutachter:in zugestimmt", color: "bg-green-100 text-green-800" },
  FIRST_EXAMINER_REJECTED: { label: "Erstgutachter:in abgelehnt", color: "bg-red-100 text-red-800" },
  ACCEPTED: { label: "Angenommen", color: "bg-green-100 text-green-800" },
  REJECTED: { label: "Abgelehnt", color: "bg-red-100 text-red-800" },
  MATCHED: { label: "Zugewiesen", color: "bg-green-100 text-green-800" },
  WITHDRAWN: { label: "Zur\u00fcckgezogen", color: "bg-gray-100 text-gray-600" },
  COMPLETED: { label: "Abgeschlossen", color: "bg-emerald-100 text-emerald-800" },
  DRAFT_BY_EXAMINER: { label: "Entwurf", color: "bg-gray-100 text-gray-600" },
};

function StatusHistory() {
  const { data: requests, isLoading } = trpc.thesis.myRequests.useQuery();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  // Ersten Antrag automatisch ausw\u00e4hlen
  useEffect(() => {
    if (requests?.length && selectedId === null) {
      setSelectedId((requests as { id: number }[])[0].id);
    }
  }, [requests, selectedId]);

  // Kombinierte Historien-Abfrage (Audit-Log + Benachrichtigungen)
  const { data: history = [], isLoading: historyLoading } = trpc.auditLog.studentHistory.useQuery(
    { thesisRequestId: selectedId! },
    { enabled: selectedId !== null }
  );

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const selectedRequest = (requests as Array<{
    id: number; title: string; status: string;
    createdAt?: number | null; wantedExaminerName?: string | null;
    exposeUrl?: string | null;
  }> | undefined)?.find((r) => r.id === selectedId);

  if (isLoading) return (
    <div className="flex items-center gap-2 text-sm text-gray-500 py-8">
      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      Wird geladen\u2026
    </div>
  );

  if (!requests?.length) return (
    <div className="bg-white rounded-2xl p-10 border border-gray-100 shadow-sm text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-700">Keine Abschlussarbeitsantr\u00e4ge vorhanden</p>
      <p className="text-xs text-gray-400 mt-1">Sobald Sie einen Antrag gestellt haben, erscheint hier die vollst\u00e4ndige Verlaufshistorie.</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Antrag-Auswahl (nur wenn mehrere vorhanden) */}
      {(requests as { id: number }[]).length > 1 && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 shrink-0">Antrag:</label>
          <select
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : null)}
            className="flex-1 max-w-sm px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white"
          >
            {(requests as { id: number; title: string }[]).map((r) => (
              <option key={r.id} value={r.id}>{r.title}</option>
            ))}
          </select>
        </div>
      )}

      {/* Antrag-Header-Karte */}
      {selectedRequest && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between gap-4" style={{ background: "linear-gradient(135deg, #f0f7e6 0%, #e8f5d0 100%)" }}>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 text-base truncate">{selectedRequest.title}</h3>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {selectedRequest.createdAt && (
                  <span className="text-xs text-gray-500">
                    Eingereicht: {new Date(selectedRequest.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
                  </span>
                )}
                {selectedRequest.wantedExaminerName && (
                  <span className="text-xs text-gray-500">\u2022 Erstbetreuung: {selectedRequest.wantedExaminerName}</span>
                )}
              </div>
            </div>
            <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${
              STATUS_LABELS[selectedRequest.status]?.color ?? "bg-gray-100 text-gray-600"
            }`}>
              {STATUS_LABELS[selectedRequest.status]?.label ?? selectedRequest.status}
            </span>
          </div>

          {/* Timeline */}
          <div className="p-6">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-5">Chronologischer Verlauf</h4>

            {historyLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Verlauf wird geladen\u2026
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">Noch keine Ereignisse vorhanden.</p>
            ) : (
              <ol className="relative">
                {(history as Array<{
                  id: string;
                  kind: "audit" | "notification";
                  title: string;
                  detail: string | null;
                  fromStatus: string | null;
                  toStatus: string | null;
                  actorName: string | null;
                  actorRole: string | null;
                  createdAt: string;
                  read?: boolean;
                }>).map((entry, i) => {
                  const isNotif = entry.kind === "notification";
                  const isUnread = isNotif && !entry.read;
                  const isLast = i === history.length - 1;

                  let dotColor = "#76B900";
                  let dotIcon = (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  );
                  if (isNotif) {
                    const titleLc = entry.title.toLowerCase();
                    if (titleLc.includes("abgelehnt") || titleLc.includes("rejected")) {
                      dotColor = "#ef4444";
                      dotIcon = (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      );
                    } else if (titleLc.includes("best\u00e4tigt") || titleLc.includes("angenommen") || titleLc.includes("accepted")) {
                      dotColor = "#22c55e";
                    } else {
                      dotColor = "#3b82f6";
                      dotIcon = (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                      );
                    }
                  }

                  return (
                    <li key={entry.id} className={`relative flex gap-4 ${!isLast ? "pb-6" : ""}`}>
                      {!isLast && (
                        <div className="absolute left-3 top-7 bottom-0 w-px bg-gray-200" />
                      )}
                      <div
                        className="relative z-10 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ring-4 ring-white"
                        style={{ backgroundColor: dotColor }}
                      >
                        {dotIcon}
                      </div>
                      <div className={`flex-1 min-w-0 rounded-xl px-4 py-3 ${
                        isUnread ? "bg-blue-50 border border-blue-100" : "bg-gray-50"
                      }`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900">
                              {isNotif ? entry.title : (AUDIT_ACTION_LABELS[entry.title] ?? entry.title)}
                            </p>
                            {entry.fromStatus && entry.toStatus && (
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  STATUS_LABELS[entry.fromStatus]?.color ?? "bg-gray-100 text-gray-600"
                                }`}>
                                  {STATUS_LABELS[entry.fromStatus]?.label ?? entry.fromStatus}
                                </span>
                                <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  STATUS_LABELS[entry.toStatus]?.color ?? "bg-gray-100 text-gray-600"
                                }`}>
                                  {STATUS_LABELS[entry.toStatus]?.label ?? entry.toStatus}
                                </span>
                              </div>
                            )}
                            {isNotif && entry.detail && (
                              <p className="text-xs text-gray-600 mt-1 leading-relaxed">{entry.detail}</p>
                            )}
                            {!isNotif && entry.detail && (
                              <p className="text-xs text-gray-500 italic mt-1">Begr\u00fcndung: {entry.detail}</p>
                            )}
                            {entry.actorName && (
                              <p className="text-xs text-gray-400 mt-1">
                                {entry.actorRole === "admin" || entry.actorRole === "pav"
                                  ? "Verwaltung"
                                  : entry.actorRole === "examiner"
                                  ? "Pr\u00fcfer:in"
                                  : "System"}: {entry.actorName}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            {isUnread && (
                              <button
                                onClick={() => {
                                  const notifId = parseInt(entry.id.replace("notif-", ""), 10);
                                  markRead.mutate({ id: notifId });
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
                              >
                                Als gelesen markieren
                              </button>
                            )}
                            <time className="text-xs text-gray-400 whitespace-nowrap">
                              {new Date(entry.createdAt).toLocaleString("de-DE", {
                                day: "2-digit", month: "2-digit", year: "numeric",
                                hour: "2-digit", minute: "2-digit"
                              })}
                            </time>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

'''

new_content = content[:line_start] + NEW_COMPONENT + content[end_idx - 1:]

with open(path, "w") as f:
    f.write(new_content)

print(f"Erfolgreich ersetzt: {len(content)} -> {len(new_content)} Zeichen")
