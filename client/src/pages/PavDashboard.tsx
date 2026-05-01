import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

// ─── Typen ────────────────────────────────────────────────────────────────────
type ExaminerRole = "first" | "second";

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────
function formatDate(d: Date | string | null | undefined) {
  if (!d) return "–";
  return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:  { label: "Ausstehend", cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    accepted: { label: "Angenommen", cls: "bg-green-50 text-green-700 border-green-200" },
    declined: { label: "Abgelehnt",  cls: "bg-red-50 text-red-700 border-red-200" },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-50 text-gray-600 border-gray-200" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${s.cls}`}>
      {s.label}
    </span>
  );
}

// ─── ProposeDialog ────────────────────────────────────────────────────────────
function ProposeDialog({
  thesisRequestId,
  thesisTitle,
  onClose,
}: {
  thesisRequestId: number;
  thesisTitle: string;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [examinerId, setExaminerId] = useState<number | "">("");
  const [examinerRole, setExaminerRole] = useState<ExaminerRole>("first");

  const { data: examiners } = trpc.examiner.list.useQuery();
  const propose = trpc.pav.proposeExaminer.useMutation({
    onSuccess: () => {
      toast.success("Anfrage erfolgreich versendet.");
      utils.pav.getProposals.invalidate();
      utils.pav.getUnassignedStudents.invalidate();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Prüfer:in vorschlagen</h3>
        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{thesisTitle}</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rolle</label>
            <div className="flex gap-2">
              {(["first", "second"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setExaminerRole(r)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                    examinerRole === r
                      ? r === "first" ? "bg-green-600 text-white border-green-600" : "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {r === "first" ? "Erstprüfer:in" : "Zweitprüfer:in"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prüfer:in auswählen</label>
            <select
              value={examinerId}
              onChange={(e) => setExaminerId(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
            >
              <option value="">– Bitte auswählen –</option>
              {(examiners ?? [])
                .filter((ex) => {
                  if (examinerRole === "first") return (ex.profile as { isSecondExaminer?: number } | null)?.isSecondExaminer !== 1;
                  return (ex.profile as { isSecondExaminer?: number } | null)?.isSecondExaminer === 1;
                })
                .map((ex) => (
                  <option key={ex.user?.id} value={ex.user?.id ?? 0}>
                    {ex.profile?.title ? `${ex.profile.title} ` : ""}{ex.user?.name ?? "–"}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Abbrechen
          </button>
          <button
            disabled={!examinerId || propose.isPending}
            onClick={() => {
              if (!examinerId) return;
              propose.mutate({
                thesisRequestId,
                examinerId: Number(examinerId),
                examinerRole,
                origin: window.location.origin,
              });
            }}
            className="flex-1 py-2.5 rounded-xl bg-[#006937] text-white text-sm font-medium hover:bg-[#005a2f] disabled:opacity-50 transition-colors"
          >
            {propose.isPending ? "Wird gesendet…" : "Anfrage senden"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PavDashboard() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<"unassigned" | "proposals">("unassigned");
  const [proposeFor, setProposeFor] = useState<{ id: number; title: string } | null>(null);

  const { data: unassigned, isLoading: loadingUnassigned } = trpc.pav.getUnassignedStudents.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: proposals, isLoading: loadingProposals } = trpc.pav.getProposals.useQuery(undefined, {
    enabled: !!user,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#006937] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !["pav", "admin", "superadmin"].includes(user.role ?? "")) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Sie haben keinen Zugriff auf diesen Bereich.</p>
          <Link href="/" className="text-[#006937] hover:underline text-sm">Zur Startseite</Link>
        </div>
      </div>
    );
  }

  const pendingCount = (proposals ?? []).filter((p) => p.proposal.status === "pending").length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">PA-Vorsitz</h1>
              <p className="text-xs text-gray-500">Prüfungsausschuss-Dashboard</p>
            </div>
          </div>
          <span className="text-sm text-gray-500">{user.name}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 flex gap-1">
          {(["unassigned", "proposals"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-[#006937] text-[#006937]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "unassigned" ? "Unzugeteilte Studierende" : (
                <span className="flex items-center gap-1.5">
                  Meine Vorschläge
                  {pendingCount > 0 && (
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-yellow-400 text-white text-[10px] font-bold">
                      {pendingCount}
                    </span>
                  )}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Tab: Unzugeteilte Studierende */}
        {activeTab === "unassigned" && (
          <>
            {loadingUnassigned ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}
              </div>
            ) : (unassigned ?? []).length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>Alle Studierenden sind bereits zugeteilt.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(unassigned ?? []).map(({ request, student }) => (
                  <div key={request.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-start justify-between gap-4 shadow-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{request.title}</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {student.name ?? "–"} · {request.department} · {request.degreeType === "master" ? "Master" : "Bachelor"}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Eingereicht: {formatDate(request.createdAt)}
                        {!request.examinerId && <span className="ml-2 text-orange-500 font-medium">Kein Erstprüfer:in</span>}
                        {!request.secondExaminerId && <span className="ml-2 text-blue-500 font-medium">Kein Zweitprüfer:in</span>}
                      </p>
                    </div>
                    <button
                      onClick={() => setProposeFor({ id: request.id, title: request.title })}
                      className="shrink-0 px-4 py-2 rounded-xl bg-[#006937] text-white text-sm font-medium hover:bg-[#005a2f] transition-colors"
                    >
                      Prüfer:in vorschlagen
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Tab: Meine Vorschläge */}
        {activeTab === "proposals" && (
          <>
            {loadingProposals ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}
              </div>
            ) : (proposals ?? []).length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p>Noch keine Vorschläge unterbreitet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(proposals ?? []).map(({ proposal, request }) => (
                  <div key={proposal.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{request.title}</p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          Rolle: {proposal.examinerRole === "first" ? "Erstprüfer:in" : "Zweitprüfer:in"} ·
                          Gesendet: {formatDate(proposal.emailSentAt)}
                        </p>
                        {proposal.declineReason && (
                          <p className="text-xs text-red-500 mt-1">Ablehnungsgrund: {proposal.declineReason}</p>
                        )}
                      </div>
                      <StatusBadge status={proposal.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {proposeFor && (
        <ProposeDialog
          thesisRequestId={proposeFor.id}
          thesisTitle={proposeFor.title}
          onClose={() => setProposeFor(null)}
        />
      )}
    </div>
  );
}
