import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { LanguageSwitcher } from "@/contexts/LanguageContext";
import { useState } from "react";
import { useLocation } from "wouter";

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "badge-pending",
    ACCEPTED: "badge-accepted",
    REJECTED: "badge-rejected",
    MATCHED: "badge-matched",
  };
  const labels: Record<string, string> = {
    PENDING: "Ausstehend",
    ACCEPTED: "Angenommen",
    REJECTED: "Abgelehnt",
    MATCHED: "Matched",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] ?? "bg-gray-100 text-gray-700"}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

// ─── Login Modal (Magic Link) ────────────────────────────────────────────────
function LoginModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginMode, setLoginMode] = useState<"magic" | "password">("magic");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [, navigate] = useLocation();
  const requestReset = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => setResetSent(true),
    onError: (e) => setError(e.message),
  });
  const loginWithPassword = trpc.auth.loginWithPassword.useMutation({
    onSuccess: (data) => {
      onClose();
      if (data.role === "student") navigate("/student");
      else if (data.role === "examiner") navigate("/examiner");
      else if (data.role === "admin") navigate("/admin");
      else navigate("/student");
    },
    onError: (e) => setError(e.message),
  });
  const handlePasswordLogin = () => {
    if (!email.includes("@")) { setError("Bitte eine gültige E-Mail-Adresse eingeben."); return; }
    if (!password) { setError("Bitte ein Passwort eingeben."); return; }
    setError("");
    loginWithPassword.mutate({ email, password });
  };
  const handleSend = async () => {
    if (!email.includes("@")) { setError("Bitte eine gültige E-Mail-Adresse eingeben."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Fehler"); }
      setSent(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-6">
          <img
            src="/manus-storage/thesis-logo-512_d468512d.png"
            alt="Thesis Match Maker Logo"
            className="w-10 h-10 object-contain"
          />
          <div>
            <div className="font-bold text-gray-900">Thesis Match Maker</div>
            <div className="text-xs text-gray-500">HTW Berlin</div>
          </div>
        </div>
        {sent ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#F1F8E9" }}>
              <svg className="w-7 h-7" style={{ color: "#76B900" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">E-Mail gesendet!</h2>
            <p className="text-sm text-gray-600 mb-6">
              Wir haben einen Anmeldelink an <strong>{email}</strong> gesendet. Bitte prüfen Sie Ihr Postfach.
            </p>
            <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">Schließen</button>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Anmelden</h2>
            {/* Tab-Umschalter */}
            <div className="flex rounded-xl bg-gray-100 p-1 mb-5">
              <button
                onClick={() => { setLoginMode("magic"); setError(""); }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${loginMode === "magic" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
              >
                Magic Link
              </button>
              <button
                onClick={() => { setLoginMode("password"); setError(""); }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${loginMode === "password" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
              >
                Passwort
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">E-Mail-Adresse</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (loginMode === "password" ? handlePasswordLogin() : handleSend())}
                placeholder="vorname.nachname@htw-berlin.de"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 transition-all"
                autoFocus
              />
            </div>
            {loginMode === "password" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Passwort</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePasswordLogin()}
                  placeholder="Ihr Passwort"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 transition-all"
                />
              </div>
            )}
            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
            {loginMode === "password" && resetSent && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 text-sm text-green-700 mb-2">
                Eine E-Mail mit dem Reset-Link wurde gesendet. Bitte prüfen Sie Ihr Postfach.
              </div>
            )}
            {loginMode === "password" ? (
              <button
                onClick={handlePasswordLogin}
                disabled={loginWithPassword.isPending || !email || !password}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                style={{ backgroundColor: "#76B900" }}
              >
                {loginWithPassword.isPending ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : null}
                {loginWithPassword.isPending ? "Anmelden..." : "Anmelden"}
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={loading || !email}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                style={{ backgroundColor: "#76B900" }}
              >
                {loading ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                )}
                {loading ? "Wird gesendet..." : "Anmeldelink senden"}
              </button>
            )}
            {loginMode === "password" && !resetSent && (
              <button
                type="button"
                onClick={() => {
                  if (!email.includes("@")) { setError("Bitte zuerst Ihre E-Mail-Adresse eingeben."); return; }
                  setError("");
                  requestReset.mutate({ email, origin: window.location.origin });
                }}
                disabled={requestReset.isPending}
                className="w-full text-center text-xs text-gray-400 hover:text-[#006937] transition-colors mt-2"
              >
                {requestReset.isPending ? "Wird gesendet…" : "Passwort vergessen?"}
              </button>
            )}
            {loginMode === "magic" && (
              <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-gray-50 border border-gray-100">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#76B900" }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="text-xs text-gray-600">
                  Kein Passwort erforderlich. Der Link ist 24 Stunden gültig und kann nur einmal verwendet werden.
                </p>
              </div>
            )}
            <button
              onClick={onClose}
              className="mt-4 w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Abbrechen
            </button>
          </>
        )}
      </div>
    </div>
  );
}


// ─── Phase Step ───────────────────────────────────────────────────────────────
function PhaseStep({
  number,
  title,
  description,
  icon,
}: {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 card-hover">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold mb-4"
        style={{ backgroundColor: "#0e2a06" }}
      >
        {number}
      </div>
      <div className="mb-3 text-gray-400">{icon}</div>
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}

// ─── Role Card ────────────────────────────────────────────────────────────────
function RoleCard({
  title,
  description,
  features,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  features: string[];
  icon?: string;
  onClick: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 card-hover flex flex-col">
      {icon && (
        <img src={icon} alt={title} className="w-16 h-16 object-contain mb-4 rounded-xl" />
      )}
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm mb-4">{description}</p>
      <ul className="space-y-2 mb-6 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4 flex-shrink-0" style={{ color: "#76B900" }} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {f}
          </li>
        ))}
      </ul>
      <button
        onClick={onClick}
        className="flex items-center gap-2 text-sm font-semibold transition-colors"
        style={{ color: "#76B900" }}
      >
        Bereich öffnen
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [, navigate] = useLocation();

  const handleRoleNavigate = (path: string) => {
    if (isAuthenticated) {
      navigate(path);
    } else {
      setShowLogin(true);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ─── Navigation ─────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-40 border-b border-gray-200 bg-white shadow-sm">
        <div className="container flex items-center justify-between h-16">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-3 text-gray-900 hover:opacity-80 transition-opacity"
          >
            <img
              src="/manus-storage/IconFemaleFemale_210f65cb.webp"
              alt="Thesis Match Maker Logo"
              className="w-9 h-9 object-contain rounded-lg"
            />
            <div className="text-left">
              <div className="text-sm font-bold leading-tight text-gray-900">Thesis Match Maker</div>
              <div className="text-xs text-gray-500 leading-tight">HTW Berlin · FB 3</div>
            </div>
          </button>

          <div className="hidden md:flex items-center gap-1">
            {[
              { label: "Studierende:r", path: "/student" },
              { label: "Prüfer:in", path: "/examiner" },
              { label: "Verwaltung", path: "/admin" },
              { label: "Prüfer:innen-Verzeichnis", path: "/examiners" },
            ].map((item) => (
              <button
                key={item.path}
                onClick={() => handleRoleNavigate(item.path)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher className="text-gray-600" />
            {isAuthenticated ? (
              <button
                onClick={() => {
                  const role = user?.role;
                  if (role === "student") navigate("/student");
                  else if (role === "examiner") navigate("/examiner");
                  else if (role === "admin") navigate("/admin");
                  else navigate("/student");
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: "#006937" }}
              >
                Dashboard
              </button>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: "#006937" }}
              >
                Anmelden
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────────────────────── */}
      <section className="hero-gradient pt-16 min-h-screen flex items-center">
        <div className="container py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
                style={{ backgroundColor: "#76B900", color: "white" }}
              >
                <span className="w-2 h-2 rounded-full bg-white/80 animate-pulse" />
                Fachbereich 3
              </span>
              <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight mb-4" style={{ color: "#0d1b2a" }}>
                Thesis Match Maker
              </h1>
              <p className="text-xl font-medium mb-3 leading-snug max-w-lg" style={{ color: "#006937" }}>
                Find your 2 supervisors with your brilliant academic idea
              </p>
              <p className="text-base text-gray-600 mb-8 leading-relaxed max-w-lg">
                Die zentrale Plattform der HTW Berlin für das Matchmaking zwischen Studierenden
                und Prüfer:innen – von der ersten Betreuungsanfrage bis zum Kolloquium.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => handleRoleNavigate("/student")}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all hover:opacity-90 active:scale-95"
                  style={{ backgroundColor: "#76B900" }}
                >
                  Als Studierende:r starten
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => handleRoleNavigate("/examiner")}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold border-2 text-gray-700 hover:bg-gray-50 transition-all" style={{ borderColor: "#006937" }}
                >
                  Prüfer:innen-Bereich
                </button>
              </div>

              {/* Stats */}
              <div className="flex gap-8 mt-12">
                {[
                  { value: "480+", label: "Arbeiten / Jahr" },
                  { value: "365+", label: "Prüfer:innen" },
                  { value: "7 + 12", label: "Bachelor / Master" },
                ].map((stat) => (
                  <div key={stat.label}>
                    <div className="text-3xl font-extrabold" style={{ color: "#006937" }}>{stat.value}</div>
                    <div className="text-sm text-gray-500">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Demo Card */}
            <div className="hidden lg:block">
              {/* HTW-Foto */}
              <div className="rounded-2xl overflow-hidden shadow-xl border border-gray-200 mb-4">
                <img
                  src="/manus-storage/htw-banner_493070b6.jpg"
                  alt="HTW Berlin Campus"
                  className="w-full h-48 object-cover"
                />
              </div>
              <div
                className="rounded-2xl p-6 shadow-xl border border-gray-200 bg-white"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-500 text-sm font-medium">Matching-Anfrage</span>
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: "#76B900" }}
                  >
                    Bestätigt
                  </span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Thema", value: "LLMs in der Kundenbetreuung" },
                    { label: "Studiengang", value: "M.Sc. Wirtschaftsinformatik" },
                    { label: "Sprache", value: "Deutsch" },
                    { label: "Semester", value: "WS 2025/26" },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between">
                      <span className="text-gray-400 text-sm">{row.label}</span>
                      <span className="text-gray-800 text-sm font-medium">{row.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: "#76B900" }}
                  >
                    AS
                  </div>
                  <div>
                    <div className="text-gray-800 text-sm font-semibold">Prof. Dr. Anna Schmidt</div>
                    <div className="text-gray-400 text-xs">Erstprüferin</div>
                  </div>
                  <div className="ml-auto">
                    <svg className="w-5 h-5" style={{ color: "#76B900" }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Drei Perspektiven ───────────────────────────────────────────── */}
      <section className="py-20 bg-gray-50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Eine Plattform – drei Perspektiven
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Wähle deine Rolle und steige direkt in den für dich relevanten Bereich ein.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <RoleCard
              title="Studierende"
              description="Thema einreichen, Prüfer:innen finden, Arbeit hochladen und Kolloquium planen."
              features={["Prüfer:innen-Suche", "Matching-Workflow", "Abgabeportal"]}
              icon="/manus-storage/IconFemaleFemale_210f65cb.webp"
              onClick={() => handleRoleNavigate("/student")}
            />
            <RoleCard
              title="Prüfer:innen"
              description="Verfügbarkeit pflegen, Anfragen beantworten, Betreute verwalten."
              features={["Anfragen verwalten", "Kommissionen bilden", "Gutachten hochladen"]}
              icon="/manus-storage/IconMaleMale_76ef2e5e.webp"
              onClick={() => handleRoleNavigate("/examiner")}
            />
            <RoleCard
              title="Verwaltung"
              description="Zulassungen erteilen, Akten prüfen, Räume buchen und Dokumente versenden."
              features={["Zulassungs-Workflow", "Akte X", "Audit-Log"]}
              icon="/manus-storage/Iconallgender_aaebc30a.webp"
              onClick={() => handleRoleNavigate("/admin")}
            />
          </div>
        </div>
      </section>

      {/* ─── Ablauf ──────────────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className="text-center mb-12">
            <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "#76B900" }}>
              Der Ablauf
            </p>
            <h2 className="text-3xl font-bold text-gray-900">Von der Idee bis zur Urkunde</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <PhaseStep
              number="01"
              title="Matchmaking"
              description="Thema einreichen und passende Prüfer:innen kontaktieren."
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
            />
            <PhaseStep
              number="02"
              title="Zulassung"
              description="Verwaltung prüft Voraussetzungen und erteilt offizielle Zulassung."
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
            />
            <PhaseStep
              number="03"
              title="Abgabe"
              description="Upload der Arbeit bis 23:59 des Abgabetermins mit Opt-ins."
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
            />
            <PhaseStep
              number="04"
              title="Gutachtenphase"
              description="Erst- und Zweitprüfer:in verfassen unabhängig ihre Gutachten."
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
            />
            <PhaseStep
              number="05"
              title="Kolloquium"
              description="Terminfindung, Raumbuchung und Einladung mit Kalender-Anhang."
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
            />
            <PhaseStep
              number="06"
              title="Abschluss"
              description="Protokoll, Notenblatt und Urkunde mit digitaler Signatur."
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>}
            />
          </div>
        </div>
      </section>

      {/* ─── Technischer Rahmen ──────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className="text-center mb-12">
            <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "#76B900" }}>
              Technischer Rahmen
            </p>
            <h2 className="text-3xl font-bold text-gray-900">Selbstgehostet. Souverän. Sicher.</h2>
            <p className="text-gray-600 mt-3 max-w-xl mx-auto">
              Die Plattform läuft vollständig unter{" "}
              <code className="text-gray-800 bg-gray-200 px-1.5 py-0.5 rounded text-sm">
                thesis@htw-berlin.com
              </code>{" "}
              – ohne externe Authentifizierungs-Dienste oder US-Cloud-Anbieter.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "On-Premise Hosting",
                desc: "Vollständige Datenhoheit, keine externen Zwischenebenen.",
                icon: "🏗️",
              },
              {
                title: "SMTP-Authentifizierung",
                desc: "Login und Benachrichtigungen direkt über den HTW-Mailserver.",
                icon: "✉️",
              },
              {
                title: "DSGVO-konform",
                desc: "Studentische Telefonnummern bleiben für Kommilitonen unsichtbar.",
                icon: "🔒",
              },
              {
                title: "JWT-gesicherte CTAs",
                desc: "Prüfer:innen können Anfragen per E-Mail-Link ohne Login beantworten.",
                icon: "🔑",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl p-6 bg-gray-50 border border-gray-100">
                <div className="text-2xl mb-3">{item.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
      <footer style={{ backgroundColor: "#006937" }}>
        <div className="container py-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img
                  src="/manus-storage/IconFemaleFemale_210f65cb.webp"
                  alt="Thesis Match Maker Logo"
                  className="w-9 h-9 object-contain rounded-lg"
                />
                <div>
                  <div className="text-sm font-bold text-white">Thesis Match</div>
                  <div className="text-xs text-white/40">thesis@htw-berlin.com</div>
                </div>
              </div>
              <p className="text-sm text-white/50 leading-relaxed">
                Die zentrale Plattform des Fachbereichs 3 für die Abwicklung von Abschlussarbeiten
                an der HTW Berlin.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Für Studierende</h4>
              <ul className="space-y-2">
                {["Prüfer:innen finden", "Thema einreichen", "Abgabeportal", "Kolloquium planen", "FAQ & Leitfaden"].map((l) => (
                  <li key={l}>
                    <button
                      onClick={() => handleRoleNavigate("/student")}
                      className="text-sm text-white/50 hover:text-white transition-colors"
                    >
                      {l}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Für Prüfer:innen</h4>
              <ul className="space-y-2">
                {["Anfragen verwalten", "Verfügbarkeit pflegen", "Gutachten-Vorlagen", "LVVO-Export", "Kommissions-Tools"].map((l) => (
                  <li key={l}>
                    <button
                      onClick={() => handleRoleNavigate("/examiner")}
                      className="text-sm text-white/50 hover:text-white transition-colors"
                    >
                      {l}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Kontakt</h4>
              <ul className="space-y-2 text-sm text-white/50">
                <li>
                  <a href="mailto:thesis@htw-berlin.com" className="hover:text-white transition-colors">
                    thesis@htw-berlin.com
                  </a>
                </li>
                <li>Treskowallee 8</li>
                <li>10318 Berlin</li>
                <li>
                  <a href="https://www.htw-berlin.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    www.htw-berlin.com
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-white/40">© 2026 HTW Berlin</p>
            <div className="flex gap-6">
              {["Impressum", "Datenschutz", "Barrierefreiheit"].map((l) => (
                <button key={l} className="text-xs text-white/40 hover:text-white/70 transition-colors">
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}
