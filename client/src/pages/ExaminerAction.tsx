import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";

// ─── Prüfer-Aktionsseite (Login-frei via JWT-Token) ───────────────────────────
export default function ExaminerAction() {
  const [, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const defaultAction = (params.get("action") as "accept" | "reject") ?? "accept";

  const [action, setAction] = useState<"accept" | "reject">(defaultAction);
  const [rejectionReason, setRejectionReason] = useState("");
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<"accepted" | "rejected" | null>(null);

  const respondMutation = trpc.examiner.respondViaToken.useMutation({
    onSuccess: (data) => {
      setResult(data.action === "accept" ? "accepted" : "rejected");
      setDone(true);
    },
    onError: () => {
      setDone(false);
    },
  });

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ungültiger Link</h2>
          <p className="text-gray-500 text-sm mb-6">
            Dieser Link ist ungültig oder unvollständig. Bitte verwende den Link aus der E-Mail.
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: "oklch(38.5% 0.12 152)" }}
          >
            Zur Startseite
          </button>
        </div>
      </div>
    );
  }

  if (done && result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 max-w-md w-full mx-4 text-center">
          {result === "accepted" ? (
            <>
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: "oklch(95% 0.05 152)" }}
              >
                <svg className="w-8 h-8" style={{ color: "oklch(38.5% 0.12 152)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Anfrage angenommen</h2>
              <p className="text-gray-500 text-sm mb-6">
                Du hast die Betreuungsanfrage erfolgreich angenommen. Die Studierenden und die
                Verwaltung wurden automatisch benachrichtigt.
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Anfrage abgelehnt</h2>
              <p className="text-gray-500 text-sm mb-6">
                Du hast die Betreuungsanfrage abgelehnt. Die Studierenden wurden benachrichtigt.
              </p>
            </>
          )}
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-500 mb-6">
            Diese Seite kann geschlossen werden. Für weitere Verwaltung melde dich im
            Prüfer:innen-Dashboard an.
          </div>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: "oklch(38.5% 0.12 152)" }}
          >
            Zur Startseite
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold"
            style={{ backgroundColor: "oklch(38.5% 0.12 152)" }}
          >
            T
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm">Thesis Match</div>
            <div className="text-xs text-gray-500">HTW Berlin · FB 3</div>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">Betreuungsanfrage</h2>
        <p className="text-gray-500 text-sm mb-6">
          Du hast eine Betreuungsanfrage erhalten. Bitte wähle, ob du die Anfrage annehmen oder
          ablehnen möchtest. Kein Login erforderlich.
        </p>

        {/* Action Selector */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => setAction("accept")}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
              action === "accept"
                ? "border-transparent text-white"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
            style={action === "accept" ? { backgroundColor: "oklch(38.5% 0.12 152)" } : undefined}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Annehmen
          </button>
          <button
            onClick={() => setAction("reject")}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
              action === "reject"
                ? "border-red-500 bg-red-500 text-white"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Ablehnen
          </button>
        </div>

        {action === "reject" && (
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Ablehnungsgrund <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="z.B. Thema außerhalb meiner Expertise, keine Kapazität..."
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all resize-none"
            />
          </div>
        )}

        {respondMutation.isError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-sm text-red-700">
              {respondMutation.error?.message ?? "Ein Fehler ist aufgetreten. Der Token könnte abgelaufen sein."}
            </p>
          </div>
        )}

        <button
          onClick={() =>
            respondMutation.mutate({
              token,
              action,
              rejectionReason: action === "reject" ? rejectionReason : undefined,
            })
          }
          disabled={respondMutation.isPending}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
          style={{
            backgroundColor:
              action === "accept" ? "oklch(38.5% 0.12 152)" : "oklch(55% 0.22 27)",
          }}
        >
          {respondMutation.isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Wird verarbeitet...
            </>
          ) : action === "accept" ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Anfrage annehmen
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Anfrage ablehnen
            </>
          )}
        </button>

        <p className="mt-4 text-xs text-center text-gray-400">
          Dieser Link ist 24 Stunden gültig · HTW Berlin Fachbereich 3
        </p>
      </div>
    </div>
  );
}
