import { useEffect } from "react";
import { useLocation } from "wouter";
import { GraduationCap, Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

const ROLE_LABELS: Record<string, string> = {
  student: "Studierende:r",
  examiner: "Prüfer:in",
  admin: "Verwaltung",
};

export default function RolePending() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const statusQuery = trpc.roleApproval.myStatus.useQuery(undefined, {
    refetchInterval: 10000, // alle 10 Sekunden prüfen
  });

  const status = statusQuery.data;

  // Wenn Rolle bestätigt wurde → zur richtigen Dashboard-Seite weiterleiten
  useEffect(() => {
    if (!status) return;
    if (status.roleStatus === "approved") {
      const role = status.role;
      if (role === "student") navigate("/student");
      else if (role === "examiner") navigate("/examiner");
      else if (role === "admin") navigate("/admin");
      else navigate("/");
    }
  }, [status, navigate]);

  const handleRetry = async () => {
    await utils.roleApproval.myStatus.invalidate();
    navigate("/select-role");
  };

  const handleLogout = () => {
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#006937] flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-gray-500 leading-none">HTW Berlin</p>
            <p className="text-sm font-semibold text-gray-900 leading-tight">Thesis Match Maker</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg text-center">

          {status?.roleStatus === "pending" && (
            <>
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-100 mb-6">
                <Clock className="w-10 h-10 text-amber-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Rollenanfrage ausstehend</h1>
              <p className="text-gray-600 mb-4">
                Ihre Anfrage für die Rolle <strong>{ROLE_LABELS[status.requestedRole ?? ""] ?? status.requestedRole}</strong> wurde
                eingereicht und wartet auf Bestätigung.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8 text-sm text-amber-800 text-left">
                <p className="font-semibold mb-1">Was passiert als nächstes?</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    {status.requestedRole === "student"
                      ? "Die Verwaltung oder ein Superadmin bestätigt Ihre Anfrage."
                      : "Ein Superadmin bestätigt Ihre Anfrage."}
                  </li>
                  <li>Diese Seite aktualisiert sich automatisch alle 10 Sekunden.</li>
                  <li>Nach Bestätigung werden Sie automatisch weitergeleitet.</li>
                </ul>
              </div>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => utils.roleApproval.myStatus.invalidate()}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Jetzt prüfen
                </Button>
                <Button variant="ghost" onClick={handleLogout} className="text-gray-500">
                  Abmelden
                </Button>
              </div>
            </>
          )}

          {status?.roleStatus === "rejected" && (
            <>
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-6">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Rollenanfrage abgelehnt</h1>
              <p className="text-gray-600 mb-8">
                Ihre Anfrage für die Rolle <strong>{ROLE_LABELS[status.requestedRole ?? ""] ?? status.requestedRole}</strong> wurde
                leider abgelehnt. Sie können eine neue Anfrage stellen oder sich an die Verwaltung wenden.
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  className="bg-[#006937] hover:bg-[#005a2f] text-white gap-2"
                  onClick={handleRetry}
                >
                  Neue Rollenanfrage stellen
                </Button>
                <Button variant="ghost" onClick={handleLogout} className="text-gray-500">
                  Abmelden
                </Button>
              </div>
            </>
          )}

          {status?.roleStatus === "approved" && (
            <>
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
                <CheckCircle className="w-10 h-10 text-[#006937]" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Rolle bestätigt!</h1>
              <p className="text-gray-600 mb-4">Sie werden weitergeleitet …</p>
            </>
          )}

          {!status && !statusQuery.isLoading && (
            <>
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-6">
                <GraduationCap className="w-10 h-10 text-gray-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Keine Rollenanfrage gefunden</h1>
              <p className="text-gray-600 mb-8">
                Bitte wählen Sie zunächst eine Rolle aus.
              </p>
              <Button
                className="bg-[#006937] hover:bg-[#005a2f] text-white"
                onClick={() => navigate("/select-role")}
              >
                Rolle auswählen
              </Button>
            </>
          )}

          {statusQuery.isLoading && (
            <div className="flex items-center justify-center gap-3 text-gray-500">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Status wird geladen …</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
