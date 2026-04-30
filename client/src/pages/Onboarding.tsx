import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

/**
 * Onboarding-Seite: Wird nach dem ersten Login angezeigt,
 * wenn der Nutzer noch keine spezifische Rolle (student/examiner) hat.
 */
export default function Onboarding() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [selected, setSelected] = useState<"student" | "examiner" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setRole = trpc.onboarding.setRole.useMutation({
    onSuccess: (data) => {
      toast.success("Willkommen! Ihr Profil wurde eingerichtet.");
      if (data.role === "student") navigate("/student");
      else if (data.role === "examiner") navigate("/examiner");
    },
    onError: (err) => {
      toast.error(err.message);
      setSubmitting(false);
    },
  });

  const handleConfirm = () => {
    if (!selected) return;
    setSubmitting(true);
    setRole.mutate({ role: selected });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f5f5f5" }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "#76B900", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ backgroundColor: "#f5f5f5" }}>
      {/* HTW Logo / Header */}
      <div className="mb-8 text-center">
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl mb-4"
          style={{ backgroundColor: "#0e2a06" }}
        >
          <span className="text-lg font-black tracking-tight" style={{ color: "#76B900" }}>HTW</span>
          <span className="text-lg font-light text-white">Berlin</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Willkommen beim Thesis Match Maker</h1>
        <p className="text-gray-500 max-w-md">
          Hallo{user?.name ? `, ${user.name}` : ""}! Bitte wählen Sie Ihre Rolle, um fortzufahren.
          Diese Einstellung kann später von einem Administrator geändert werden.
        </p>
      </div>

      {/* Rollenwahl */}
      <div className="w-full max-w-lg grid sm:grid-cols-2 gap-4 mb-8">
        {/* Student */}
        <button
          onClick={() => setSelected("student")}
          className="relative flex flex-col items-center text-center p-6 rounded-2xl border-2 transition-all duration-200 bg-white"
          style={{
            borderColor: selected === "student" ? "#76B900" : "#E5E5E5",
            boxShadow: selected === "student" ? "0 0 0 3px rgba(118,185,0,0.15)" : "none",
          }}
        >
          {selected === "student" && (
            <div
              className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#76B900" }}
            >
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ backgroundColor: selected === "student" ? "#F1F8E9" : "#F5F5F5" }}
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"
              style={{ color: selected === "student" ? "#76B900" : "#AFAFAF" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <h3 className="font-bold text-gray-900 mb-1">Studierende:r</h3>
          <p className="text-sm text-gray-500">
            Ich möchte eine Abschlussarbeit anmelden und Prüfer:innen finden.
          </p>
        </button>

        {/* Prüfer:in */}
        <button
          onClick={() => setSelected("examiner")}
          className="relative flex flex-col items-center text-center p-6 rounded-2xl border-2 transition-all duration-200 bg-white"
          style={{
            borderColor: selected === "examiner" ? "#76B900" : "#E5E5E5",
            boxShadow: selected === "examiner" ? "0 0 0 3px rgba(118,185,0,0.15)" : "none",
          }}
        >
          {selected === "examiner" && (
            <div
              className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#76B900" }}
            >
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ backgroundColor: selected === "examiner" ? "#F1F8E9" : "#F5F5F5" }}
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"
              style={{ color: selected === "examiner" ? "#76B900" : "#AFAFAF" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="font-bold text-gray-900 mb-1">Prüfer:in</h3>
          <p className="text-sm text-gray-500">
            Ich bin Lehrende:r und möchte Abschlussarbeiten betreuen und begutachten.
          </p>
        </button>
      </div>

      {/* Bestätigen */}
      <button
        onClick={handleConfirm}
        disabled={!selected || submitting}
        className="px-8 py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ backgroundColor: "#76B900" }}
      >
        {submitting ? (
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Wird gespeichert...
          </span>
        ) : (
          "Rolle bestätigen und fortfahren"
        )}
      </button>

      <p className="mt-4 text-xs text-gray-400 text-center max-w-sm">
        Ihre Rolle kann später von einem Administrator angepasst werden.
        Bei Fragen wenden Sie sich an das Prüfungsamt.
      </p>
    </div>
  );
}
