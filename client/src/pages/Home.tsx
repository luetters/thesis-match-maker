import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { LanguageSwitcher, useLanguage } from "@/contexts/LanguageContext";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { getStatusBadge } from "@shared/const";
import { LANDING_HERO_MEDIA } from "@shared/landingHeroMedia";
import { buildLandingPortalMetrics } from "@shared/landingPortalHighlights";

// ─── Status Badge ───────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const { label, className } = getStatusBadge(status);
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

// ─── Login Modal ────────────────────────────────────────────────────────────
type LoginRole = "student" | "examiner" | "admin";
const LOGIN_ROLES: { id: LoginRole; label: string; description: string; accentColor: string; bgColor: string; borderColor: string }[] = [
  { id: "student", label: "Studierende:r", description: "Ich möchte eine Abschlussarbeit anmelden und Prüfer:innen finden.", accentColor: "#76b900", bgColor: "#f0f9e8", borderColor: "#76b900" },
  { id: "examiner", label: "Prüfer:in", description: "Ich betreue Abschlussarbeiten als Erst- oder Zweitprüfer:in.", accentColor: "#3b82f6", bgColor: "#eff6ff", borderColor: "#3b82f6" },
  { id: "admin", label: "Verwaltungsmitarbeiter:in", description: "Ich bin in der Studiengangs- oder Prüfungsverwaltung tätig.", accentColor: "#a855f7", bgColor: "#faf5ff", borderColor: "#a855f7" },
];

function LoginModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<"role" | "email">("role");
  const [selectedRole, setSelectedRole] = useState<LoginRole | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      else if (data.role === "examiner" || data.role === "second_examiner") navigate("/examiner");
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

  const selectedRoleOption = LOGIN_ROLES.find((r) => r.id === selectedRole);

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
            src="/manus-storage/logo-icon_b7dba00c.webp"
            alt="Thesis Match Maker Logo"
            className="w-10 h-10 object-contain"
          />
          <div>
            <div className="font-bold text-gray-900">Thesis Match Maker</div>
            <div className="text-xs text-gray-500">HTW Berlin</div>
          </div>
        </div>

        {/* ── SCHRITT 1: Rollenauswahl ── */}
        {step === "role" && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Wie möchten Sie sich anmelden?</h2>
            <p className="text-sm text-gray-500 mb-5">Bitte wählen Sie Ihre Rolle an der HTW Berlin.</p>
            <div className="space-y-3">
              {LOGIN_ROLES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => { setSelectedRole(option.id); setStep("email"); }}
                  className="w-full text-left rounded-xl border-2 transition-all duration-150 p-4 flex items-center gap-3 hover:shadow-sm"
                  style={{ borderColor: "#e5e7eb" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = option.borderColor; (e.currentTarget as HTMLButtonElement).style.background = option.bgColor; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e5e7eb"; (e.currentTarget as HTMLButtonElement).style.background = "white"; }}
                >
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 text-sm">{option.label}</div>
                    <div className="text-gray-500 text-xs mt-0.5 leading-relaxed">{option.description}</div>
                  </div>
                  <svg className="w-5 h-5 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
            <button onClick={onClose} className="mt-5 w-full text-sm text-gray-400 hover:text-gray-600 transition-colors">
              Abbrechen
            </button>
          </div>
        )}

        {/* ── SCHRITT 2: Anmelden ── */}
        {step === "email" && (
          <>
            <button
              type="button"
              onClick={() => { setStep("role"); setError(""); setEmail(""); setPassword(""); setResetSent(false); }}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-4"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Rolle ändern
            </button>
            {selectedRoleOption && (
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-2 mb-4 text-sm font-medium"
                style={{ background: selectedRoleOption.bgColor, border: `1px solid ${selectedRoleOption.accentColor}40`, color: selectedRoleOption.accentColor }}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                {selectedRoleOption.label}
              </div>
            )}
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Anmelden</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">E-Mail-Adresse</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePasswordLogin()}
                placeholder="vorname.nachname@htw-berlin.de"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 transition-all"
                autoFocus
              />
            </div>
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
            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
            {resetSent && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2.5 text-sm text-primary mb-2">
                Eine E-Mail mit dem Reset-Link wurde gesendet. Bitte prüfen Sie Ihr Postfach.
              </div>
            )}
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
            {!resetSent && (
              <button
                type="button"
                onClick={() => {
                  if (!email.includes("@")) { setError("Bitte zuerst Ihre E-Mail-Adresse eingeben."); return; }
                  setError("");
                  requestReset.mutate({ email, origin: window.location.origin });
                }}
                disabled={requestReset.isPending}
                className="w-full text-center text-xs text-gray-400 hover:text-[#76B900] transition-colors mt-2"
              >
                {requestReset.isPending ? "Wird gesendet…" : "Passwort vergessen?"}
              </button>
            )}
            <div className="mt-4 border-t border-gray-100 pt-4 text-center">
              <p className="text-xs text-gray-500">
                Noch kein Konto?{" "}
                <a href="/login" className="font-medium hover:underline" style={{ color: "#76B900" }}>Jetzt registrieren</a>
              </p>
            </div>
            <button
              onClick={onClose}
              className="mt-3 w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
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
  const { user, isAuthenticated, loading } = useAuth();
  const { t } = useLanguage();
  const [showLogin, setShowLogin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isHeroVideoPaused, setIsHeroVideoPaused] = useState(false);
  const [processStepsVisible, setProcessStepsVisible] = useState(false);
  const [, navigate] = useLocation();
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const processSectionRef = useRef<HTMLElement>(null);
  const { data: portalHighlights } = trpc.landing.getPortalHighlights.useQuery(undefined, { staleTime: 60_000 });
  const portalMetrics = buildLandingPortalMetrics(portalHighlights);

  // Auto-Redirect: Eingeloggte Nutzer:innen direkt zum Dashboard weiterleiten
  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || !user) return;
    const role = (user as any).role as string;
    const roles: string[] = (user as any).roles ?? (role ? [role] : []);
    const hasR = (r: string) => roles.includes(r);
    if (hasR("superadmin")) navigate("/superadmin");
    else if (hasR("admin") || hasR("pav") || hasR("dean") || hasR("vice_dean") || hasR("programme_director")) navigate("/admin");
    else if (hasR("student")) navigate("/student");
    else if (hasR("examiner") || hasR("second_examiner")) navigate("/examiner");
  }, [isAuthenticated, loading, user, navigate]);

  useEffect(() => {
    const section = processSectionRef.current;
    if (!section) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      setProcessStepsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setProcessStepsVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.18 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const toggleHeroVideo = () => {
    const video = heroVideoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().then(() => setIsHeroVideoPaused(false)).catch(() => setIsHeroVideoPaused(true));
    } else {
      video.pause();
      setIsHeroVideoPaused(true);
    }
  };

  const handleRoleNavigate = (path: string) => {
    setMobileMenuOpen(false);
    if (isAuthenticated) {
      navigate(path);
    } else {
      navigate("/login");
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
              src="/manus-storage/logo-icon_b7dba00c.webp"
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
              { label: t.nav.student, path: "/student" },
              { label: t.nav.examiner, path: "/examiner" },
              { label: t.nav.admin, path: "/admin" },
              { label: t.nav.directory, path: "/examiners" },
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
                  else if (role === "examiner" || role === "second_examiner") navigate("/examiner");
                  else if (role === "admin") navigate("/admin");
                  else navigate("/student");
                }}
                className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: "#76B900" }}
              >
                {t.nav.dashboard}
              </button>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="hidden md:flex px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: "#76B900" }}
              >
                {t.nav.login}
              </button>
            )}
            {/* Hamburger-Button für mobile */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Menü öffnen"
            >
              {mobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown-Menü */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white shadow-lg">
            <div className="container py-3 space-y-1">
              {[
                { label: t.nav.student, path: "/student" },
                { label: t.nav.examiner, path: "/examiner" },
                { label: t.nav.admin, path: "/admin" },
                { label: t.nav.directory, path: "/examiners" },
              ].map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleRoleNavigate(item.path)}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all"
                >
                  {item.label}
                </button>
              ))}
              <div className="pt-2 border-t border-gray-100">
                {isAuthenticated ? (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      const role = user?.role;
                      if (role === "student") navigate("/student");
                      else if (role === "examiner" || role === "second_examiner") navigate("/examiner");
                      else if (role === "admin") navigate("/admin");
                      else navigate("/student");
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                    style={{ backgroundColor: "#76B900" }}
                  >
                    {t.nav.dashboard}
                  </button>
                ) : (
                  <button
                    onClick={() => { setMobileMenuOpen(false); navigate("/login"); }}
                    className="w-full px-4 py-3 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                    style={{ backgroundColor: "#76B900" }}
                  >
                    {t.nav.login}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
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
                {t.landing.fachbereich}
              </span>
              <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight mb-4" style={{ color: "#0d1b2a" }}>
                {t.landing.title}
              </h1>
              <p className="text-xl font-medium mb-3 leading-snug max-w-lg" style={{ color: "#76B900" }}>
                {t.landing.subtitle}
              </p>
              <p className="text-base text-gray-600 mb-8 leading-relaxed max-w-lg">
                {t.landing.heroDesc}
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => handleRoleNavigate("/student")}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all hover:opacity-90 active:scale-95"
                  style={{ backgroundColor: "#76B900" }}
                >
                  {t.landing.startAsStudent}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => handleRoleNavigate("/examiner")}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold border-2 text-gray-700 hover:bg-gray-50 transition-all" style={{ borderColor: "#76B900" }}
                >
                  {t.landing.examinerArea}
                </button>
              </div>

              {/* Aktuelle, ausschließlich aggregierte Portalkennzahlen */}
              <div className="flex flex-wrap gap-x-8 gap-y-4 mt-12" aria-label="Aktuelle Portalkennzahlen">
                {portalMetrics.map((stat) => (
                  <div key={stat.label}>
                    <div className="text-3xl font-extrabold" style={{ color: "#76B900" }}>{stat.value}</div>
                    <div className="text-sm text-gray-500">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ruhige Hero-Animation mit Bildfallback bei reduzierter Bewegung. */}
            <div className="hidden lg:block">
              <div className="relative h-[302px] overflow-hidden rounded-2xl border border-emerald-900/20 bg-[#0d1b2a] shadow-2xl">
                <img
                  src={LANDING_HERO_MEDIA.fallbackImageUrl}
                  alt="HTW Berlin Campus"
                  className="home-hero-fallback h-full w-full object-cover opacity-75"
                />
                <video
                  ref={heroVideoRef}
                  className="home-hero-video absolute inset-0 h-full w-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  poster={LANDING_HERO_MEDIA.posterUrl}
                  aria-hidden="true"
                >
                  <source src={LANDING_HERO_MEDIA.videoUrl} type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d1b2a]/85 via-[#0d1b2a]/15 to-transparent" />
                <button
                  type="button"
                  onClick={toggleHeroVideo}
                  aria-pressed={isHeroVideoPaused}
                  aria-label={isHeroVideoPaused ? "Videoanimation starten" : "Videoanimation pausieren"}
                  className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-[#0d1b2a]/70 text-white backdrop-blur-sm transition-colors hover:bg-[#0d1b2a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {isHeroVideoPaused ? (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h3v14H7zm7 0h3v14h-3z" /></svg>
                  )}
                </button>
                <div className="absolute inset-x-0 bottom-0 p-7 text-white">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#b5e86a]">
                    <span className="inline-block h-2 w-2 rounded-full bg-[#b5e86a]" />
                    Abschlussarbeiten im Blick
                  </div>
                  <p className="max-w-sm text-lg font-semibold leading-snug">
                    Von der Themenidee bis zur Verteidigung – strukturiert begleitet.
                  </p>
                </div>
              </div>
              <div
                className="-mt-6 mx-5 relative rounded-2xl p-6 shadow-xl border border-gray-200 bg-white"
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
              {t.landing.roles.title}
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              {t.landing.roles.subtitle}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <RoleCard
              title={t.landing.roles.student}
              description={t.landing.roles.studentFeatures.join(", ")}
              features={[...t.landing.roles.studentFeatures]}
              icon="/manus-storage/icon-female_612c1055.webp"
              onClick={() => handleRoleNavigate("/student")}
            />
            <RoleCard
              title={t.landing.roles.examiner}
              description={t.landing.roles.examinerFeatures.join(", ")}
              features={[...t.landing.roles.examinerFeatures]}
              icon="/manus-storage/icon-male2_9e670c3a.webp"
              onClick={() => handleRoleNavigate("/examiner")}
            />
            <RoleCard
              title={t.landing.roles.admin}
              description={t.landing.roles.adminFeatures.join(", ")}
              features={[...t.landing.roles.adminFeatures]}
              icon="/manus-storage/icon-allgender_64b60a63.webp"
              onClick={() => handleRoleNavigate("/admin")}
            />
          </div>
        </div>
      </section>

      {/* ─── Ablauf ──────────────────────────────────────────────────────── */}
      <section ref={processSectionRef} className="py-20" style={{ backgroundColor: "#f0f8f0" }}>
        <div className="container">
          <div className="text-center mb-12">
            <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "#76B900" }}>
              {t.landing.process.label}
            </p>
            <h2 className="text-3xl font-bold" style={{ color: "#76B900" }}>{t.landing.process.title}</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.landing.process.steps.map((step, i) => (
              <div
                key={step.number}
                className={`transition-all duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:transition-none ${processStepsVisible ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"}`}
                style={{ transitionDelay: `${Math.min(i * 90, 450)}ms` }}
              >
                <PhaseStep
                  number={step.number}
                  title={step.title}
                  description={step.description}
                  icon={[
                  <svg key="s" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
                  <svg key="s" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
                  <svg key="s" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
                  <svg key="s" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
                  <svg key="s" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
                  <svg key="s" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>,
                  ][i]}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Technischer Rahmen ──────────────────────────────────────────── */}
      <section className="py-20" style={{ backgroundColor: "#f0f8f0" }}>
        <div className="container">
          <div className="text-center mb-12">
            <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "#76B900" }}>
              {t.landing.tech.label}
            </p>
            <h2 className="text-3xl font-bold" style={{ color: "#76B900" }}>{t.landing.tech.title}</h2>
            <p className="mt-3 max-w-xl mx-auto" style={{ color: "#555" }}>
              {t.landing.tech.desc}{" "}
              <code className="text-gray-800 bg-gray-200 px-1.5 py-0.5 rounded text-sm">
                thesis@htw-berlin.com
              </code>{" "}
              {t.landing.tech.descSuffix}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {t.landing.tech.items.map((item) => (
              <div key={item.title} className="rounded-2xl p-6 bg-white border-2" style={{ borderColor: "#76B900" }}>
                <div className="text-2xl mb-3">{item.icon}</div>
                <h3 className="font-semibold mb-2" style={{ color: "#76B900" }}>{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#555" }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
      <footer style={{ backgroundColor: "#76B900" }}>
        <div className="container py-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img
                  src="/manus-storage/icon-female_612c1055.webp"
                  alt="Thesis Match Maker Logo"
                  className="w-9 h-9 object-contain rounded-lg"
                />
                <div>
                  <div className="text-sm font-bold text-white">Thesis Match</div>
                  <div className="text-xs text-white/40">thesis@htw-berlin.com</div>
                </div>
              </div>
              <p className="text-sm text-white/50 leading-relaxed">
                {t.landing.tagline}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">{t.landing.footer.forStudents}</h4>
              <ul className="space-y-2">
                {t.landing.footer.studentLinks.map((l) => (
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
              <h4 className="text-sm font-semibold text-white mb-4">{t.landing.footer.forExaminers}</h4>
              <ul className="space-y-2">
                {t.landing.footer.examinerLinks.map((l) => (
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
              <h4 className="text-sm font-semibold text-white mb-4">{t.landing.footer.contact}</h4>
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
            <p className="text-xs text-white/40">{t.landing.footer.copyright}</p>
            <div className="flex gap-6">
              {[t.landing.footer.imprint, t.landing.footer.privacy, t.landing.footer.accessibility].map((l) => (
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
