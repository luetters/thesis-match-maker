import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";

export default function PavRespond() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") ?? "";
  const action = params.get("action") as "accept" | "decline" | null;

  const [declineReason, setDeclineReason] = useState("");
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<"accepted" | "declined" | null>(null);

  const respond = trpc.pav.respondToProposal.useMutation({
    onSuccess: (data) => {
      setResult(data.action as "accepted" | "declined");
      setDone(true);
    },
    onError: () => {
      setDone(true);
    },
  });

  // Automatisch ausführen wenn action=accept (kein weiterer Input nötig)
  useEffect(() => {
    if (token && action === "accept" && !respond.isPending && !done) {
      respond.mutate({ token, action: "accept" });
    }
  }, [token, action]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!token || !action) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full mx-4 text-center">
          <p className="text-red-500 font-medium">Ungültiger Link.</p>
          <p className="text-sm text-gray-500 mt-2">Bitte verwenden Sie den Link aus der E-Mail.</p>
        </div>
      </div>
    );
  }

  if (done) {
    const accepted = result === "accepted";
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full mx-4 text-center">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${accepted ? "bg-green-100" : "bg-gray-100"}`}>
            {accepted ? (
              <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            {accepted ? "Anfrage angenommen" : "Anfrage abgelehnt"}
          </h2>
          <p className="text-sm text-gray-500">
            {accepted
              ? "Vielen Dank. Sie wurden als Prüfer:in eingetragen. Der Prüfungsausschuss wurde informiert."
              : "Ihre Ablehnung wurde registriert. Der Prüfungsausschuss wurde informiert."}
          </p>
          <p className="text-xs text-gray-400 mt-4">HTW Berlin – Thesis Match Maker</p>
        </div>
      </div>
    );
  }

  if (respond.isError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full mx-4 text-center">
          <p className="text-red-500 font-medium">{respond.error?.message ?? "Fehler beim Verarbeiten der Anfrage."}</p>
          <p className="text-sm text-gray-500 mt-2">Möglicherweise wurde dieser Link bereits verwendet.</p>
        </div>
      </div>
    );
  }

  // action === "decline" → Ablehnungsgrund eingeben
  if (action === "decline") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full mx-4">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Anfrage ablehnen</h2>
          <p className="text-sm text-gray-500 mb-5">
            Sie können optional einen Ablehnungsgrund angeben. Dieser wird dem Prüfungsausschuss mitgeteilt.
          </p>
          <textarea
            rows={4}
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="Ablehnungsgrund (optional)…"
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200 resize-none mb-4"
          />
          <div className="flex gap-3">
            <button
              onClick={() => respond.mutate({ token, action: "decline", declineReason: declineReason || undefined })}
              disabled={respond.isPending}
              className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {respond.isPending ? "Wird gesendet…" : "Ablehnen bestätigen"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // action === "accept" → Lade-Spinner
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#006937] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Anfrage wird verarbeitet…</p>
      </div>
    </div>
  );
}
