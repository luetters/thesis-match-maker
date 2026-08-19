import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Mail,
  GraduationCap,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  BookOpen,
  Settings,
  UserPlus,
  LogIn,
  CheckCircle2,
  User,
  ShieldCheck,
  HelpCircle,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLanguage, LanguageSwitcher } from "@/contexts/LanguageContext";
import { Checkbox } from "@/components/ui/checkbox";

type Role = "student" | "examiner" | "second_examiner" | "admin";
type Department = "FB1" | "FB2" | "FB3" | "FB4" | "FB5";

// ─── FAQ-Modal ────────────────────────────────────────────────────────────────
const faqItems = (lang: string) => lang === "de" ? [
  { q: "Ich habe eine HTW Berlin E-Mail-Adresse. Kann ich mich damit direkt anmelden?", a: "Nein. Ihre HTW Berlin E-Mail-Adresse ist Ihr Benutzername in diesem System, aber Sie müssen sich zunächst einmalig registrieren. Erst nach der Registrierung und gegebenenfalls Freischaltung können Sie sich anmelden." },
  { q: "Welches Passwort soll ich verwenden?", a: "Bitte wählen Sie ein neues, eigenes Passwort ausschließlich für dieses System. Verwenden Sie auf keinen Fall Ihr HTW Berlin-Passwort. Das Passwort muss mindestens 8 Zeichen lang sein." },
  { q: "Ich habe mein Passwort vergessen. Was kann ich tun?", a: "Klicken Sie auf „Passwort vergessen?“. Geben Sie Ihre E-Mail-Adresse ein und Sie erhalten einen Link zum Zurücksetzen des Passworts." },
  { q: "Ich habe mich registriert, kann mich aber nicht anmelden.", a: "Prüfer:innen und Verwaltungsmitarbeitende werden nach der Registrierung durch die Verwaltung freigeschaltet. Studierende mit einer @student.htw-berlin.de-Adresse werden automatisch freigeschaltet." },
  { q: "Welche E-Mail-Adresse muss ich verwenden?", a: "Studierende verwenden @student.htw-berlin.de. Prüfer:innen und Verwaltungsmitarbeitende verwenden @htw-berlin.de oder @htw-berlin.com. Externe Zweitgutachter:innen können eine beliebige E-Mail-Adresse verwenden." },
  { q: "Ich erhalte keine E-Mail mit dem Passwort-Reset-Link.", a: "Bitte prüfen Sie Ihren Spam-Ordner. Falls die E-Mail dort nicht zu finden ist, wenden Sie sich an die Verwaltung der HTW Berlin." },
] : [
  { q: "I have an HTW Berlin email address. Can I sign in directly?", a: "No. Your HTW Berlin email address is your username in this system, but you must register first. You can sign in after registration and, where applicable, approval." },
  { q: "Which password should I use?", a: "Please choose a new, personal password exclusively for this system. Never use your HTW Berlin password. The password must be at least 8 characters long." },
  { q: "I forgot my password. What can I do?", a: "Select “Forgot password?”, enter your email address, and you will receive a reset link." },
  { q: "I registered but cannot sign in.", a: "Examiners and administration staff are activated by administration after registration. Students with a @student.htw-berlin.de address are activated automatically." },
  { q: "Which email address should I use?", a: "Students use @student.htw-berlin.de. Examiners and administration staff use @htw-berlin.de or @htw-berlin.com. External second examiners may use any email address." },
  { q: "I did not receive a password reset email.", a: "Please check your spam folder. If you cannot find the email, contact HTW Berlin administration." },
];

function FaqModal({ open, onClose, lang }: { open: boolean; onClose: () => void; lang: string }) {
  const [expanded, setExpanded] = React.useState<number | null>(null);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.1)", maxHeight: "85vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(118,185,0,0.15)" }}>
              <HelpCircle className="w-4 h-4" style={{ color: "#76b900" }} />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">{lang === 'de' ? 'H\u00e4ufige Fragen' : 'Frequently Asked Questions'}</h2>
              <p className="text-white/40 text-xs">{lang === 'de' ? 'Registrierung & Anmeldung' : 'Registration & Login'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* FAQ Items */}
        <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          {faqItems(lang).map((item, i) => (
            <div key={i}>
              <button
                type="button"
                className="w-full text-left px-5 py-4 flex items-start justify-between gap-3 hover:bg-white/5 transition-colors"
                onClick={() => setExpanded(expanded === i ? null : i)}
              >
                <span className="text-sm font-medium text-white/90 leading-snug">{item.q}</span>
                {expanded === i
                  ? <ChevronUp className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#76b900" }} />
                  : <ChevronDown className="w-4 h-4 flex-shrink-0 mt-0.5 text-white/30" />}
              </button>
              {expanded === i && (
                <div className="px-5 pb-4">
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        {/* Footer */}
        <div className="px-5 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            {lang === 'de' ? 'Bei weiteren Fragen wenden Sie sich an die Verwaltung der HTW Berlin.' : 'For further questions, please contact the HTW Berlin administration.'}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Login-Flow:
 *  Schritt 1 "action"  → Anmelden oder Registrieren wählen
 *  Schritt 2a "login"  → E-Mail/Passwort-Formular (direkt, keine Rolle nötig)
 *  Schritt 2b "role"   → Rolle wählen (nur bei Registrierung)
 *  Schritt 3  "register" → Registrierungsformular
 */
export default function Login() {
  const { t, lang } = useLanguage();
  const L = t.login;

  const ROLE_OPTIONS: {
    id: Role;
    label: string;
    description: string;
    icon: React.ReactNode;
    accentColor: string;
    bgColor: string;
  }[] = [
    {
      id: "student",
      label: L.roleStudent,
      description: L.roleStudentDesc,
      icon: <GraduationCap className="w-7 h-7" />,
      accentColor: "#76b900",
      bgColor: "rgba(118,185,0,0.08)",
    },
    {
      id: "examiner",
      label: L.roleExaminer,
      description: L.roleExaminerDesc,
      icon: <BookOpen className="w-7 h-7" />,
      accentColor: "#3b82f6",
      bgColor: "rgba(59,130,246,0.08)",
    },
    {
      id: "second_examiner",
      label: L.roleSecondExaminer,
      description: L.roleSecondExaminerDesc,
      icon: <BookOpen className="w-7 h-7" />,
      accentColor: "#0891b2",
      bgColor: "rgba(8,145,178,0.08)",
    },
    {
      id: "admin",
      label: L.roleAdmin,
      description: L.roleAdminDesc,
      icon: <Settings className="w-7 h-7" />,
      accentColor: "#a855f7",
      bgColor: "rgba(168,85,247,0.08)",
    },
  ];
  const departmentOptions = ["FB1", "FB2", "FB3", "FB4", "FB5"] as const;

  // Schritte: "action" → "login" | ("role" → "register")
  const [step, setStep] = useState<"action" | "login" | "role" | "register">("action");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // "Angemeldet bleiben" – E-Mail aus localStorage vorausfüllen
  const REMEMBER_KEY = "tmm_remember_email";
  const savedEmail = typeof window !== "undefined" ? localStorage.getItem(REMEMBER_KEY) ?? "" : "";

  // Login-State
  const [loginEmail, setLoginEmail] = useState(savedEmail);
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(savedEmail !== "");
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [loginStatus, setLoginStatus] = useState<"pending" | "rejected" | "not_found" | "two_factor" | null>(null);
  const [showFaq, setShowFaq] = useState(false);

  // Registrierungs-State
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPasswordConfirm, setRegPasswordConfirm] = useState("");
  const [regMatrikelNr, setRegMatrikelNr] = useState("");
  const [regPlagiarismConsent, setRegPlagiarismConsent] = useState(false);
  const [regAiReviewConsent, setRegAiReviewConsent] = useState(false);
  const [showRegPw, setShowRegPw] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [registeredRole, setRegisteredRole] = useState<string | null>(null);
  const [regEmailTouched, setRegEmailTouched] = useState(false);
  // Bei Rollenwechsel E-Mail-Touched zurücksetzen
  const prevSelectedRole = useRef(selectedRole);
  if (prevSelectedRole.current !== selectedRole) {
    prevSelectedRole.current = selectedRole;
    // Fehlermeldung zurücksetzen wenn Rolle wechselt und E-Mail noch nicht passt
    // (wird im nächsten Render neu berechnet)
  }

  // Echtzeit-E-Mail-Domain-Validierung
  const regEmailLower = regEmail.trim().toLowerCase();
  const regEmailError: string | null = (() => {
    if (!regEmailTouched || !regEmailLower) return null;
    const role = selectedRole ?? "student";
    if (role === "student") {
      if (!regEmailLower.endsWith("@student.htw-berlin.de")) {
        return L.emailDomainErrorStudent;
      }
    } else if (role === "examiner") {
      if (!regEmailLower.endsWith("@htw-berlin.de") && !regEmailLower.endsWith("@htw-berlin.com")) {
        return L.emailDomainErrorExaminer;
      }
    } else if (role === "admin") {
      if (!regEmailLower.endsWith("@htw-berlin.de") && !regEmailLower.endsWith("@htw-berlin.com")) {
        return L.emailDomainErrorExaminer;
      }
    }
    return null;
  })();

  // Studiengang-Auswahl bei Registrierung (nur Studierende)
  const [regDegreeType, setRegDegreeType] = useState<"bachelor" | "master">("bachelor");
  const [regFachbereich, setRegFachbereich] = useState<Department>("FB3");
  const [regExaminerDepartment, setRegExaminerDepartment] = useState<Department | "">("");
  const [regAcademicTitle, setRegAcademicTitle] = useState("");
  const [regProgrammeId, setRegProgrammeId] = useState<number | null>(null);
  const programmesQuery = trpc.programmes.list.useQuery(undefined, { enabled: step === "register" && selectedRole === "student" });

  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get("returnTo") ?? "/";
  const urlError = params.get("error");
  const inviteToken = params.get("inviteToken") ?? undefined;
  const samlStatusQuery = trpc.saml.status.useQuery();

  const loginMutation = trpc.auth.loginWithPassword.useMutation({
    onSuccess: (data) => {
      if ((data as any).requiresTwoFactor) {
        setLoginStatus("two_factor");
        return;
      }
      setLoginStatus(null);
      // Multi-Rollen: Routing nach Priorität (roles[] hat Vorrang vor role)
      const roles: string[] = (data as any).roles?.length ? (data as any).roles : [data.role];
      const hasR = (r: string) => roles.includes(r);
      let target = returnTo;
      if (target === "/" || target === "") {
        if (hasR("superadmin")) target = "/superadmin";
        else if (hasR("admin")) target = "/admin";
        else if (hasR("student")) target = "/student";
        else if (hasR("examiner") || hasR("second_examiner")) target = "/examiner";
        else if (hasR("pav") || hasR("dean") || hasR("vice_dean") || hasR("programme_director")) target = "/admin";
        else target = "/";
      }
      setLocation(target);
    },
    onError: (error) => {
      const msg = error.message ?? "";
      if (msg.includes("noch nicht freigeschaltet") || msg.includes("pending")) {
        setLoginStatus("pending");
      } else if (msg.includes("abgelehnt") || msg.includes("rejected")) {
        setLoginStatus("rejected");
      } else if (msg.includes("ungültig") || msg.includes("not found") || msg.includes("UNAUTHORIZED") || msg.toLowerCase().includes("invalid")) {
        // Prüfen ob E-Mail mit @student.htw-berlin.de endet – dann Registrierungs-Hinweis
        const emailLower = loginEmail.trim().toLowerCase();
        if (emailLower.endsWith("@student.htw-berlin.de") || emailLower.endsWith("@htw-berlin.de") || emailLower.endsWith("@htw-berlin.com")) {
          setLoginStatus("not_found");
        } else {
          setLoginStatus(null);
          toast.error(msg || L.loginFailed);
        }
      } else {
        setLoginStatus(null);
        toast.error(msg || L.loginFailed);
      }
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (data) => {
      // Studierende werden automatisch freigeschaltet – direkt einloggen
      const role = selectedRole ?? "student";
      if (role === "student" && (data as any)?.autoApproved) {
        // Auto-Login: E-Mail + Passwort direkt verwenden
        loginMutation.mutate(
          { email: regEmail.trim(), password: regPassword },
          {
            onSuccess: (loginData) => {
              const roles: string[] = (loginData as any).roles?.length ? (loginData as any).roles : [loginData.role];
              const target = roles.includes("student") ? "/student?welcome=1" : "/";
              setLocation(target);
            },
            onError: () => {
              // Fallback: Zur Login-Seite mit Hinweis
              setRegistered(true);
            },
          }
        );
      } else {
        setRegisteredRole(selectedRole ?? "student");
        setRegistered(true);
      }
    },
    onError: (error) => {
      toast.error(error.message ?? L.registerFailed);
    },
  });

  const requestReset = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => {
      setResetSent(true);
      toast.success(L.resetSent);
    },
    onError: (e) => toast.error(e.message),
  });

  function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) return;
    setLoginStatus(null);
    // E-Mail bei Bedarf im localStorage speichern oder löschen
    if (rememberMe) {
      localStorage.setItem(REMEMBER_KEY, loginEmail.trim());
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }
    loginMutation.mutate({ email: loginEmail.trim(), password: loginPassword, ...(twoFactorCode ? { twoFactorCode } : {}) });
  }

  function startSamlLogin() {
    window.location.assign(`/api/auth/saml/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!regFirstName.trim() || !regLastName.trim() || !regEmail.trim() || !regPassword || !regPasswordConfirm) return;
    if ((selectedRole ?? "student") === "student" && !regMatrikelNr.trim()) {
      toast.error(L.matrikelNrRequired);
      return;
    }
    if ((selectedRole ?? "student") === "student" && !regProgrammeId) {
      toast.error(L.selectProgrammeRequired);
      return;
    }
    if (selectedRole === "examiner" && !regExaminerDepartment) {
      toast.error(lang === "de" ? "Bitte wählen Sie Ihren Fachbereich aus." : "Please select your department.");
      return;
    }
    if (regPassword !== regPasswordConfirm) {
      toast.error(L.passwordMismatch);
      return;
    }
    if (regPassword.length < 8) {
      toast.error(L.passwordTooShort);
      return;
    }
    setRegEmailTouched(true);
    const emailLower = regEmail.trim().toLowerCase();
    const role = selectedRole ?? "student";
    if (role === "student") {
      if (!emailLower.endsWith("@student.htw-berlin.de")) {
        toast.error(L.emailDomainErrorStudent ?? "Bitte verwenden Sie Ihre Studierenden-E-Mail-Adresse (@student.htw-berlin.de).");
        return;
      }
    } else if (role === "examiner" || role === "admin") {
      if (!emailLower.endsWith("@htw-berlin.de") && !emailLower.endsWith("@htw-berlin.com")) {
        toast.error(L.emailDomainErrorExaminer ?? "Bitte verwenden Sie Ihre HTW-Berlin-E-Mail-Adresse (@htw-berlin.de oder @htw-berlin.com).");
        return;
      }
    }
    const regPayload: Parameters<typeof registerMutation.mutate>[0] = {
      name: [regFirstName.trim(), regLastName.trim()].filter(Boolean).join(' '),
      firstName: regFirstName.trim(),
      lastName: regLastName.trim(),
      email: regEmail.trim(),
      password: regPassword,
      role: selectedRole ?? "student",
      academicTitle: regAcademicTitle || undefined,
      matrikelNr: regMatrikelNr.trim() || undefined,
      programmeId: (selectedRole === "student" && regProgrammeId) ? regProgrammeId : undefined,
      department: selectedRole === "student" ? regFachbereich : selectedRole === "examiner" ? regExaminerDepartment || undefined : undefined,
      thesisType: (selectedRole === "student") ? regDegreeType : undefined,
      plagiarismConsent: selectedRole === "student" ? regPlagiarismConsent : false,
      aiReviewConsent: selectedRole === "student" ? regAiReviewConsent : false,
      origin: window.location.origin,
      ...(inviteToken ? { inviteToken } : {}),
    };
    registerMutation.mutate(regPayload);
  }

  const selectedRoleOption = ROLE_OPTIONS.find((r) => r.id === selectedRole);

  function resetToAction() {
    setStep("action");
    setSelectedRole(null);
    setLoginEmail("");
    setLoginPassword("");
    setRegFirstName("");
    setRegLastName("");
    setRegEmail("");
    setRegPassword("");
    setRegPlagiarismConsent(false);
    setRegAiReviewConsent(false);
    setRegExaminerDepartment("");
    setRegAcademicTitle("");
    setRegPasswordConfirm("");
    setResetSent(false);
    setRegistered(false);
    setLoginStatus(null);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative"
      style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)" }}
    >
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "#76b900" }} />
      <Link
        href="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        {L.backToHome}
      </Link>
      <div className="absolute top-6 right-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setShowFaq(true)}
          className="flex items-center gap-1.5 text-white/50 hover:text-white/80 transition-colors text-sm"
          title={lang === 'de' ? 'Häufige Fragen' : 'FAQ'}
        >
          <HelpCircle className="w-4 h-4" />
          <span className="hidden sm:inline">{lang === 'de' ? 'Hilfe' : 'Help'}</span>
        </button>
        <LanguageSwitcher />
      </div>
      <FaqModal open={showFaq} onClose={() => setShowFaq(false)} lang={lang} />

      <div className="w-full max-w-lg px-4 py-12">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4"
            style={{ background: "#76b900" }}
          >
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Thesis Match Maker</h1>
          <p className="text-white/50 text-sm mt-1">HTW Berlin</p>
        </div>

        {urlError && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
            {urlError === "invalid_token" ? L.errorInvalidToken : L.errorGeneric}
          </div>
        )}

        {/* ── SCHRITT 1: Anmelden oder Registrieren ── */}
        {step === "action" && (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-white mb-1">{L.welcomeTitle}</h2>
              <p className="text-white/50 text-sm">{L.welcomeSubtitle}</p>
            </div>
            {/* Info-Banner: Erstmalig hier? */}
            <div
              className="flex items-start gap-3 rounded-xl p-3 mb-4 text-sm"
              style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.25)" }}
            >
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#60a5fa" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div style={{ color: "rgba(147,197,253,0.9)" }}>
                <span className="font-semibold">{L.firstTimeTitle}</span> {L.firstTimeHintBefore}<button type="button" onClick={() => setStep("role")} className="underline font-semibold hover:text-white transition-colors">{L.firstTimeHintLink}</button>{L.firstTimeHintAfter}
              </div>
            </div>
            <div className="space-y-3">
              {/* Anmelden */}
              <button
                type="button"
                onClick={() => setStep("login")}
                className="w-full text-left rounded-xl border-2 transition-all duration-200 p-4 flex items-center gap-4 hover:scale-[1.01]"
                style={{ background: "rgba(118,185,0,0.06)", borderColor: "#76b900" }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.background = "rgba(118,185,0,0.12)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.background = "rgba(118,185,0,0.06)";
                }}
              >
                <div
                  className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(118,185,0,0.15)", color: "#76b900" }}
                >
                  <LogIn className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base">{L.signInBtn}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(118,185,0,0.2)", color: "#76b900" }}>{L.registeredBadge}</span>
                  </div>
                  <div className="text-white/60 text-xs mt-1 leading-relaxed">
                    {L.signInCardDescription}
                  </div>
                </div>
                <div className="text-white/30 text-lg">→</div>
              </button>

              {samlStatusQuery.data?.enabled && samlStatusQuery.data.ready && (
                <>
                  <div className="flex items-center gap-3 py-1">
                    <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                    <span className="text-white/30 text-xs">{L.or}</span>
                    <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                  </div>
                  <button type="button" onClick={startSamlLogin} className="w-full text-left rounded-xl border transition-all duration-200 p-4 flex items-center gap-4 hover:scale-[1.01]" style={{ background: "rgba(59,130,246,0.07)", borderColor: "rgba(59,130,246,0.35)" }}>
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(59,130,246,0.14)", color: "#93c5fd" }}><ShieldCheck className="w-7 h-7" /></div>
                    <div className="flex-1 min-w-0"><div className="font-bold text-white text-base">{L.samlSignInTitle}</div><div className="text-white/60 text-xs mt-1 leading-relaxed">{L.samlSignInDescription}</div></div><div className="text-white/30 text-lg">→</div>
                  </button>
                </>
              )}

              {/* Trennlinie */}
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                <span className="text-white/30 text-xs">{L.or}</span>
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
              </div>

              {/* Registrieren */}
              <button
                type="button"
                onClick={() => setStep("role")}
                className="w-full text-left rounded-xl border transition-all duration-200 p-4 flex items-center gap-4 hover:scale-[1.01]"
                style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.12)" }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.background = "rgba(59,130,246,0.08)";
                  el.style.borderColor = "rgba(59,130,246,0.5)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.background = "rgba(255,255,255,0.03)";
                  el.style.borderColor = "rgba(255,255,255,0.12)";
                }}
              >
                <div
                  className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(59,130,246,0.08)", color: "#3b82f6" }}
                >
                  <UserPlus className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white/90 text-sm">{L.createAccount}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}>{L.firstTimeBadge}</span>
                  </div>
                  <div className="text-white/50 text-xs mt-0.5 leading-relaxed">
                    {L.createAccountCardDescription}
                  </div>
                </div>
                <div className="text-white/20 text-lg">→</div>
              </button>
            </div>
          </div>
        )}

        {/* ── SCHRITT 2a: Login-Formular (direkt, ohne Rollenauswahl) ── */}
        {step === "login" && (
          <>
            <button
              type="button"
              onClick={resetToAction}
              className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors text-sm mb-5"
            >
              <ArrowLeft className="w-4 h-4" />
              {L.back}
            </button>

            <Card
              className="border-0 shadow-2xl"
              style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)" }}
            >
              <CardHeader className="pb-4">
                <CardTitle className="text-white text-xl">{L.signInTitle}</CardTitle>
                <CardDescription className="text-white/50">{L.signInDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-white/70 text-sm">{L.emailLabel}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <Input
                        type="email"
                        placeholder={L.emailPlaceholderLogin ?? "ihre@htw-berlin.de"}
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        autoComplete="email"
                        autoFocus
                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[#76b900] focus:ring-[#76b900]/20"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70 text-sm">{L.passwordLabel}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <Input
                        type={showLoginPw ? "text" : "password"}
                        placeholder={L.passwordPlaceholder ?? "Passwort"}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[#76b900] focus:ring-[#76b900]/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPw(!showLoginPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                        tabIndex={-1}
                      >
                        {showLoginPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {loginStatus === "two_factor" && (
                      <div className="space-y-2 rounded-lg border border-[#76b900]/40 bg-[#76b900]/10 p-3">
                        <Label className="text-white text-sm">Sicherheits- oder Wiederherstellungscode</Label>
                        <Input
                          maxLength={11}
                          placeholder="123456 oder A1B2C-D3E4F"
                          value={twoFactorCode}
                          onChange={(e) => setTwoFactorCode(e.target.value.toUpperCase().replace(/[^A-F0-9-]/g, "").slice(0, 11))}
                          autoComplete="one-time-code"
                          autoFocus
                          className="bg-white/5 border-white/20 text-white placeholder:text-white/25 focus:border-[#76b900] focus:ring-[#76b900]/20"
                        />
                        <p className="text-xs text-white/70">Geben Sie den sechsstelligen Code aus 2FAS oder einen einmaligen Wiederherstellungscode ein.</p>
                      </div>
                    )}
                    {/* Passwort-Hinweis: nicht das HTW-Passwort */}
                    <div
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs mt-1"
                      style={{ background: "rgba(234,179,8,0.07)", border: "1px solid rgba(234,179,8,0.2)", color: "rgba(253,224,71,0.75)" }}
                    >
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                      <span>{L.passwordSystemNotice}</span>
                    </div>
                    {/* Passwort vergessen – prominent direkt unter dem Eingabefeld */}
                    <div className="flex justify-end pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (!loginEmail.trim()) {
                            toast.error(L.enterEmailFirst);
                            return;
                          }
                          requestReset.mutate({ email: loginEmail.trim(), origin: window.location.origin });
                        }}
                        className="text-sm font-medium text-[#76b900] hover:text-[#8fd400] underline underline-offset-2 transition-colors"
                      >
                        {L.forgotPassword}
                      </button>
                    </div>
                  </div>

                  {loginStatus === "pending" && (
                    <div
                      className="p-3 rounded-lg text-sm"
                      style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.35)", color: "#eab308" }}
                    >
                      <p className="font-semibold mb-1">{L.pendingTitle}</p>
                      <p style={{ color: "rgba(234,179,8,0.75)" }}>{L.pendingText}</p>
                    </div>
                  )}

                  {loginStatus === "rejected" && (
                    <div
                      className="p-3 rounded-lg text-sm"
                      style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)" }}
                    >
                      <p className="font-semibold mb-1" style={{ color: "#ef4444" }}>{L.rejectedTitle}</p>
                      <p style={{ color: "rgba(239,68,68,0.75)" }}>{L.rejectedText}</p>
                    </div>
                  )}

                  {loginStatus === "not_found" && (
                    <div
                      className="p-3 rounded-xl text-sm"
                      style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.3)" }}
                    >
                      <p className="font-semibold mb-1" style={{ color: "#60a5fa" }}>{L.noAccountFoundTitle}</p>
                      <p style={{ color: "rgba(147,197,253,0.85)" }} className="mb-2">
                        {L.noAccountFoundBefore} <strong>{loginEmail.trim()}</strong>. {L.noAccountFoundAfter}
                      </p>
                      <button
                        type="button"
                        onClick={() => { setLoginStatus(null); setStep("role"); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        style={{ background: "rgba(59,130,246,0.2)", color: "#93c5fd" }}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        {L.registerNow}
                      </button>
                    </div>
                  )}

                  {resetSent && (
                    <div
                      className="p-3 rounded-lg text-sm"
                      style={{ background: "rgba(118,185,0,0.1)", border: "1px solid rgba(118,185,0,0.3)", color: "#76b900" }}
                    >
                      {L.resetSent}
                    </div>
                  )}

                  {/* Angemeldet bleiben */}
                  <div className="flex items-center gap-2.5 py-1">
                    <Checkbox
                      id="remember-me"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                      className="border-white/30 data-[state=checked]:bg-[#76b900] data-[state=checked]:border-[#76b900]"
                    />
                    <label
                      htmlFor="remember-me"
                      className="text-sm text-white/60 cursor-pointer select-none leading-none"
                    >
                      {L.rememberMe}
                    </label>
                  </div>

                  <Button
                    type="submit"
                    disabled={loginMutation.isPending || !loginEmail.trim() || !loginPassword}
                    className="w-full font-semibold h-11"
                    style={{ background: "#76b900", color: "white" }}
                  >
                    {loginMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{L.signingIn}</>
                    ) : (
                      L.signInBtn
                    )}
                  </Button>
                  <p className="text-white/30 text-xs text-center leading-relaxed">{L.privacyConsent}</p>

                  {/* Wechsel zu Registrierung */}
                  <p className="text-center text-white/40 text-xs">
                      {L.noAccountYet}{" "}
                    <button
                      type="button"
                      onClick={() => setStep("role")}
                      className="text-[#76b900] hover:underline"
                    >
                      {L.createAccount}
                    </button>
                  </p>
                </form>
              </CardContent>
            </Card>
          </>
        )}

        {/* ── SCHRITT 2b: Rollenauswahl (nur bei Registrierung) ── */}
        {step === "role" && (
          <div>
            <button
              type="button"
              onClick={resetToAction}
              className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors text-sm mb-5"
            >
              <ArrowLeft className="w-4 h-4" />
              {L.back}
            </button>
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-white mb-1">
                {L.selectRoleTitle}
              </h2>
              <p className="text-white/50 text-sm">
                {L.selectRoleSubtitle}
              </p>
            </div>
            <div className="space-y-3">
              {ROLE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setSelectedRole(option.id);
                    setStep("register");
                  }}
                  className="w-full text-left rounded-xl border transition-all duration-200 p-4 flex items-center gap-4 group hover:scale-[1.01]"
                  style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)" }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.background = option.bgColor;
                    el.style.borderColor = option.accentColor;
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.background = "rgba(255,255,255,0.04)";
                    el.style.borderColor = "rgba(255,255,255,0.1)";
                  }}
                >
                  <div
                    className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: option.bgColor, color: option.accentColor }}
                  >
                    {option.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white text-sm">{option.label}</div>
                    <div className="text-white/50 text-xs mt-0.5 leading-relaxed">{option.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── SCHRITT 3: Registrierungsformular ── */}
        {step === "register" && selectedRoleOption && (
          <>
            <button
              type="button"
              onClick={() => setStep("role")}
              className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors text-sm mb-5"
            >
              <ArrowLeft className="w-4 h-4" />
              {L.back}
            </button>

            {/* Gewählte Rolle anzeigen */}
            <div
              className="flex items-center gap-3 rounded-xl px-4 py-3 mb-4"
              style={{
                background: selectedRoleOption.bgColor,
                border: `1px solid ${selectedRoleOption.accentColor}40`,
              }}
            >
              <div style={{ color: selectedRoleOption.accentColor }}>{selectedRoleOption.icon}</div>
              <div>
                <div className="text-white text-sm font-semibold">{selectedRoleOption.label}</div>
                <div className="text-white/50 text-xs">{L.selectedRole}</div>
              </div>
            </div>

            {/* Hinweis: second_examiner ist ausschließlich für externe Personen */}
            {selectedRole === "second_examiner" && (
              <div className="flex items-start gap-3 rounded-xl px-4 py-3 mb-5" style={{ background: "rgba(168,85,247,0.10)", border: "1px solid rgba(168,85,247,0.3)" }}>
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#a855f7" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <div>
                  <div className="text-xs font-semibold mb-0.5" style={{ color: "#c084fc" }}>
                    {lang === "de" ? "Nur für externe Personen ohne Erstprüfer:innen-Berechtigung" : "For external persons without first examiner authorization only"}
                  </div>
                  <div className="text-xs leading-relaxed" style={{ color: "rgba(216,180,254,0.8)" }}>
                    {lang === "de"
                      ? "Wählen Sie diese Rolle ausschließlich, wenn Sie keine HTW-Berlin-Zugehörigkeit haben und nur als Zweitgutachter:in tätig sein möchten. HTW-Angehörige wählen bitte \u201ePrüfer:in\u201c – diese Rolle umfasst automatisch auch Zweitprüfer:innen-Rechte."
                      : "Choose this role only if you have no HTW Berlin affiliation and wish to act exclusively as a second examiner. HTW members should select \"Examiner\" instead – that role automatically includes second examiner rights."}
                  </div>
                </div>
              </div>
            )}

            {/* Hinweis: examiner umfasst automatisch Zweitprüfer-Rechte */}
            {selectedRole === "examiner" && (
              <div className="flex items-start gap-3 rounded-xl px-4 py-3 mb-5" style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)" }}>
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <div className="text-blue-300 text-xs font-semibold mb-0.5">
                    {lang === "de" ? "Automatische Zweitprüfer:innen-Berechtigung" : "Automatic Second Examiner Authorization"}
                  </div>
                  <div className="text-blue-200/70 text-xs leading-relaxed">
                    {lang === "de"
                      ? "Die Rolle „Prüfer:in“ umfasst automatisch alle Rechte einer Zweitprüfer:in. Sie können Abschlussarbeiten sowohl als Erst- als auch als Zweitgutachter:in betreuen – ohne separate Registrierung."
                      : "The \"Examiner\" role automatically includes all rights of a second examiner. You can supervise theses as both first and second examiner – without separate registration."}
                  </div>
                </div>
              </div>
            )}

            {registered ? (
              <Card
                className="border-0 shadow-2xl"
                style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)" }}
              >
                <CardContent className="pt-8 pb-8">
                  {/* Erfolgs-Icon */}
                  <div className="text-center mb-6">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                      style={{ backgroundColor: "rgba(118,185,0,0.15)" }}
                    >
                      <CheckCircle2 className="w-8 h-8" style={{ color: "#76b900" }} />
                    </div>
                    <h3 className="text-white font-semibold text-xl mb-1">
                      {lang === 'de' ? 'Registrierung erfolgreich!' : 'Registration successful!'}
                    </h3>
                    <p className="text-white/50 text-sm">
                      {lang === 'de' ? 'Ihr Konto wurde angelegt.' : 'Your account has been created.'}
                    </p>
                  </div>

                  {/* Rollenspezifische nächste Schritte */}
                  {(registeredRole === 'examiner' || registeredRole === 'second_examiner' || registeredRole === 'admin') ? (
                    <div className="space-y-3 mb-6">
                      {/* Freischaltungs-Hinweis */}
                      <div className="rounded-xl p-4 border" style={{ background: "rgba(251,191,36,0.08)", borderColor: "rgba(251,191,36,0.25)" }}>
                        <div className="flex items-start gap-3">
                          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#fbbf24" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: "#fbbf24" }}>
                              {lang === 'de' ? 'Freischaltung erforderlich' : 'Approval required'}
                            </p>
                            <p className="text-xs mt-1" style={{ color: "rgba(251,191,36,0.75)" }}>
                              {lang === 'de'
                                ? registeredRole === 'admin'
                                  ? 'Ihre Anmeldung als Verwaltungsmitarbeiter:in muss zunächst von einem Superadmin freigeschaltet werden. Sie erhalten eine E-Mail, sobald Ihr Zugang aktiv ist.'
                                  : 'Ihr Konto muss zunächst von der Verwaltung freigeschaltet werden. Sie erhalten eine E-Mail, sobald Ihr Zugang aktiv ist.'
                                : registeredRole === 'admin'
                                  ? 'Your administration registration must first be approved by a superadmin. You will receive an email once your access is active.'
                                  : 'Your account must first be approved by the administration. You will receive an email once your access is active.'}
                            </p>
                          </div>
                        </div>
                      </div>
                      {/* Schritte */}
                      <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <p className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-3">
                          {lang === 'de' ? 'Nächste Schritte' : 'Next steps'}
                        </p>
                        <ol className="space-y-2">
                          {[
                            lang === 'de' ? 'E-Mail-Postfach prüfen – Bestätigungs-E-Mail ist unterwegs' : 'Check your inbox – a confirmation email is on its way',
                            lang === 'de'
                              ? registeredRole === 'admin' ? 'Auf Freischaltung durch einen Superadmin warten' : 'Auf Freischaltung durch die Verwaltung warten'
                              : registeredRole === 'admin' ? 'Wait for approval by a superadmin' : 'Wait for approval by the administration',
                            lang === 'de' ? 'Nach Erhalt der Freischaltungs-E-Mail anmelden' : 'Sign in after receiving the approval email',
                          ].map((step, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-xs text-white/60">
                              <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "rgba(118,185,0,0.2)", color: "#76b900" }}>{i + 1}</span>
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  ) : (
                    // Studierende: sofort anmelden
                    <div className="space-y-3 mb-6">
                      <div className="rounded-xl p-4 border" style={{ background: "rgba(118,185,0,0.08)", borderColor: "rgba(118,185,0,0.25)" }}>
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#76b900" }} />
                          <div>
                            <p className="text-sm font-semibold" style={{ color: "#76b900" }}>
                              {lang === 'de' ? 'Konto sofort aktiv' : 'Account immediately active'}
                            </p>
                            <p className="text-xs mt-1" style={{ color: "rgba(118,185,0,0.75)" }}>
                              {lang === 'de'
                                ? 'Als Studierende:r der HTW Berlin können Sie sich sofort anmelden und Ihre Thesis-Anfrage stellen.'
                                : 'As an HTW Berlin student, you can sign in immediately and submit your thesis request.'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <p className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-3">
                          {lang === 'de' ? 'Nächste Schritte' : 'Next steps'}
                        </p>
                        <ol className="space-y-2">
                          {[
                            lang === 'de' ? 'Mit E-Mail und Ihrem neuen Passwort anmelden' : 'Sign in with your email and new password',
                            lang === 'de' ? 'Thesis-Anfrage im Studierenden-Dashboard stellen' : 'Submit your thesis request in the student dashboard',
                            lang === 'de' ? 'Passende Prüfer:innen werden vorgeschlagen' : 'Matching examiners will be suggested',
                          ].map((step, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-xs text-white/60">
                              <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "rgba(118,185,0,0.2)", color: "#76b900" }}>{i + 1}</span>
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  )}

                  {/* Passwort-Hinweis */}
                  <div className="rounded-xl p-3 mb-5" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {lang === 'de'
                        ? '\uD83D\uDD12 Merken Sie sich Ihr Passwort – es ist nicht Ihr HTW-Passwort. Bei Verlust: '
                        : '\uD83D\uDD12 Remember your password – it is not your HTW password. If forgotten: '}
                      <button
                        type="button"
                        onClick={() => { setRegistered(false); setStep("login"); }}
                        className="underline hover:opacity-80"
                        style={{ color: "#76b900" }}
                      >
                        {lang === 'de' ? '"Passwort vergessen"' : '"Forgot password"'}
                      </button>
                    </p>
                  </div>

                  <Button
                    style={{ background: "#76b900" }}
                    className="w-full text-white font-semibold hover:opacity-90"
                    onClick={() => { setRegistered(false); setStep("login"); }}
                  >
                    {lang === 'de' ? 'Zur Anmeldung' : 'Go to Sign In'}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card
                className="border-0 shadow-2xl"
                style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)" }}
              >
                <CardHeader className="pb-4">
                  <CardTitle className="text-white text-xl">{L.createAccountTitle}</CardTitle>
                  <CardDescription className="text-white/50">{L.createAccountDesc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegisterSubmit} className="space-y-4">
                    {(selectedRole ?? "student") === "student" && (
                      <>
                        {/* Matrikelnummer */}
                        <div className="space-y-2">
                          <Label className="text-white/70 text-sm">
                            {L.matrikelNr} <span className="text-red-400">*</span>
                          </Label>
                          <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                            </svg>
                            <Input
                              type="text"
                              placeholder={L.matrikelNrPlaceholder}
                              value={regMatrikelNr}
                              onChange={(e) => setRegMatrikelNr(e.target.value)}
                              required
                              autoComplete="off"
                              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[#76b900] focus:ring-[#76b900]/20"
                            />
                          </div>
                        </div>

                        {/* Studiengang-Auswahl */}
                        <div className="space-y-3">
                          <Label className="text-white/70 text-sm">
                            {L.programmesLabel} <span className="text-red-400">*</span>
                          </Label>
                          {/* Abschlussart */}
                          <div className="flex gap-2">
                            {(["bachelor", "master"] as const).map((type) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => { setRegDegreeType(type); setRegProgrammeId(null); }}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                                  regDegreeType === type
                                    ? "border-[#76b900] bg-[#76b900]/20 text-[#76b900]"
                                    : "border-white/10 text-white/40 hover:border-white/30 hover:text-white/60"
                                }`}
                              >
                            {type === "bachelor" ? `🎓 ${L.degreeBachelor}` : `🎖️ ${L.degreeMaster}`}
                              </button>
                            ))}
                          </div>
                          {/* Fachbereich */}
                          <select
                            value={regFachbereich}
                            onChange={(e) => { setRegFachbereich(e.target.value as Department); setRegProgrammeId(null); }}
                            className="w-full px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white/80 focus:outline-none focus:border-[#76b900]"
                          >
                            {departmentOptions.map((department) => (
                              <option key={department} value={department} className="bg-gray-900">{L.departmentNames[department]}</option>
                            ))}
                          </select>
                          {/* Studiengang-Dropdown */}
                          {programmesQuery.isLoading ? (
                            <div className="text-white/30 text-xs py-2">{L.loadingProgrammes}</div>
                          ) : (
                            <select
                              value={regProgrammeId ?? ""}
                              onChange={(e) => setRegProgrammeId(e.target.value ? Number(e.target.value) : null)}
                              required
                              className="w-full px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white/80 focus:outline-none focus:border-[#76b900]"
                            >
                              <option value="" className="bg-gray-900">{L.selectProgramme}</option>
                              {(programmesQuery.data ?? []).filter((p: any) => p.level === regDegreeType && (p.fachbereich === regFachbereich || (!p.fachbereich && regFachbereich === 'FB3'))).map((p: any) => (
                                <option key={p.id} value={p.id} className="bg-gray-900">
                                  {p.abbreviation ? `${p.abbreviation} – ${p.name}` : p.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                          <div>
                            <p className="text-sm font-medium text-white/85">{L.optionalConsentsTitle}</p>
                            <p className="mt-0.5 text-xs text-white/45">{L.optionalConsentsDescription}</p>
                          </div>
                          <label htmlFor="plagiarism-consent" className="flex cursor-pointer items-start gap-3 text-sm text-white/75">
                            <Checkbox
                              id="plagiarism-consent"
                              checked={regPlagiarismConsent}
                              onCheckedChange={(checked) => setRegPlagiarismConsent(checked === true)}
                              className="mt-0.5 border-white/30 data-[state=checked]:bg-[#76b900] data-[state=checked]:border-[#76b900]"
                            />
                            <span>{L.plagiarismConsent}</span>
                          </label>
                          <label htmlFor="ai-review-consent" className="flex cursor-pointer items-start gap-3 text-sm text-white/75">
                            <Checkbox
                              id="ai-review-consent"
                              checked={regAiReviewConsent}
                              onCheckedChange={(checked) => setRegAiReviewConsent(checked === true)}
                              className="mt-0.5 border-white/30 data-[state=checked]:bg-[#76b900] data-[state=checked]:border-[#76b900]"
                            />
                            <span>{L.aiReviewConsent}</span>
                          </label>
                        </div>
                      </>
                    )}
                    {selectedRole === "examiner" && (
                      <div className="rounded-xl border border-blue-400/30 bg-blue-400/10 p-4">
                        <Label htmlFor="examiner-registration-department" className="text-white/80 text-sm">
                          {lang === "de" ? "Eigener Fachbereich" : "Your department"} <span className="text-red-400">*</span>
                        </Label>
                        <p className="mt-1 text-xs text-white/50">
                          {lang === "de"
                            ? "Als interne Erstprüfer:in gehören Sie einem Fachbereich der HTW Berlin an."
                            : "As an internal first examiner, you belong to an HTW Berlin department."}
                        </p>
                        <select
                          id="examiner-registration-department"
                          value={regExaminerDepartment}
                          onChange={(event) => setRegExaminerDepartment(event.target.value as Department | "")}
                          required
                          className="mt-3 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/90 focus:outline-none focus:border-[#76b900]"
                        >
                          <option value="" className="bg-gray-900">{lang === "de" ? "Bitte auswählen" : "Please select"}</option>
                          {departmentOptions.map((department) => (
                            <option key={department} value={department} className="bg-gray-900">{L.departmentNames[department]}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {selectedRole === "second_examiner" && (
                      <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-4 text-sm text-cyan-50">
                        <p className="font-semibold">{lang === "de" ? "Externe Zweitgutachter:in" : "External Second Examiner"}</p>
                        <p className="mt-1 text-xs text-cyan-100/75">
                          {lang === "de"
                            ? "Diese Rolle ist für externe Personen vorgesehen. Sie ermöglicht ausschließlich Zweitprüfungen; ein Fachbereich und eine HTW-Berlin-E-Mail-Adresse sind nicht erforderlich."
                            : "This role is intended for external people. It permits second examinations only; an HTW Berlin department and email address are not required."}
                        </p>
                      </div>
                    )}
                    {(selectedRole === "examiner" || selectedRole === "second_examiner") && (
                      <div className="space-y-2">
                        <Label htmlFor="academic-title" className="text-white/70 text-sm">
                          {lang === "de" ? "Akademischer Titel" : "Academic title"}
                        </Label>
                        <select
                          id="academic-title"
                          value={regAcademicTitle}
                          onChange={(event) => setRegAcademicTitle(event.target.value)}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 focus:outline-none focus:border-[#76b900]"
                        >
                          <option value="" className="bg-gray-900">{lang === "de" ? "Ohne akademischen Titel" : "No academic title"}</option>
                          <option value="Prof." className="bg-gray-900">Prof.</option>
                          <option value="Prof. Dr." className="bg-gray-900">Prof. Dr.</option>
                          <option value="Dr." className="bg-gray-900">Dr.</option>
                          <option value="Dr.-Ing." className="bg-gray-900">Dr.-Ing.</option>
                        </select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-white/70 text-sm">{L.firstName}</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                            <Input
                              type="text"
                              placeholder="Maria"
                              value={regFirstName}
                              onChange={(e) => setRegFirstName(e.target.value)}
                              required
                              autoComplete="given-name"
                              autoFocus
                              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[#76b900] focus:ring-[#76b900]/20"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white/70 text-sm">{L.lastName}</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                            <Input
                              type="text"
                              placeholder="Muster"
                              value={regLastName}
                              onChange={(e) => setRegLastName(e.target.value)}
                              required
                              autoComplete="family-name"
                              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[#76b900] focus:ring-[#76b900]/20"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/70 text-sm">{L.emailLabel}</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <Input
                          type="email"
                          placeholder={
                            selectedRole === "student"
                              ? L.emailPlaceholderStudent
                              : selectedRole === "second_examiner"
                              ? L.emailPlaceholderSecondExaminer
                              : L.emailPlaceholderExaminer
                          }
                          value={regEmail}
                          onChange={(e) => { setRegEmail(e.target.value); setRegEmailTouched(true); }}
                          onBlur={() => setRegEmailTouched(true)}
                          required
                          autoComplete="email"
                          className={`pl-10 bg-white/5 text-white placeholder:text-white/25 focus:ring-[#76b900]/20 ${
                            regEmailError
                              ? "border-red-500 focus:border-red-500"
                              : "border-white/10 focus:border-[#76b900]"
                          }`}
                        />
                      </div>
                      {regEmailError && (
                        <div className="flex items-start gap-2 mt-1 px-1">
                          <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                          </svg>
                          <p className="text-red-400 text-xs leading-snug">{regEmailError}</p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/70 text-sm">{L.passwordLabel}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <Input
                          type={showRegPw ? "text" : "password"}
                          placeholder={L.passwordMin}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          required
                          autoComplete="new-password"
                          className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[#76b900] focus:ring-[#76b900]/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPw(!showRegPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                          tabIndex={-1}
                        >
                          {showRegPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {/* Deutliche Passwort-Warnung */}
                      <div
                        className="rounded-xl p-3 text-sm"
                        style={{ background: "rgba(239,68,68,0.1)", border: "2px solid rgba(239,68,68,0.45)" }}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <svg className="w-4 h-4 flex-shrink-0" style={{ color: "#f87171" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                          <span className="font-bold text-sm" style={{ color: "#f87171" }}>
                            {lang === 'de' ? 'Wichtiger Sicherheitshinweis' : 'Important security notice'}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: "#fca5a5" }}>
                          {lang === 'de'
                            ? <><strong>Verwenden Sie auf keinen Fall Ihr HTW Berlin-Passwort!</strong> Wählen Sie ein eigenes, neues Passwort ausschließlich für dieses System. Mindestlänge: 8 Zeichen.</>
                            : <><strong>Do not use your HTW Berlin password!</strong> Choose a new, unique password exclusively for this system. Minimum length: 8 characters.</>
                          }
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/70 text-sm">{L.confirmPassword}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <Input
                          type={showRegPw ? "text" : "password"}
                          placeholder={L.passwordRepeat}
                          value={regPasswordConfirm}
                          onChange={(e) => setRegPasswordConfirm(e.target.value)}
                          required
                          autoComplete="new-password"
                          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[#76b900] focus:ring-[#76b900]/20"
                        />
                      </div>
                    </div>
                    <div
                      className="p-3 rounded-lg text-xs leading-relaxed space-y-1"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}
                    >
                      <p>
                        {selectedRole === "student"
                          ? L.emailDomainStudent
                          : selectedRole === "second_examiner"
                          ? L.emailDomainSecondExaminer
                          : L.emailDomainExaminer}
                      </p>
                      <p>
                        {selectedRole === "student"
                          ? L.studentAutoApproval
                          : L.pendingApproval}
                      </p>
                    </div>
                    <Button
                      type="submit"
                      disabled={
                        registerMutation.isPending ||
                        !regFirstName.trim() ||
                        !regLastName.trim() ||
                        !regEmail.trim() ||
                        !!regEmailError ||
                        !regPassword ||
                        !regPasswordConfirm ||
                        ((selectedRole ?? "student") === "student" && !regMatrikelNr.trim()) ||
                        ((selectedRole ?? "student") === "student" && !regProgrammeId) ||
                        (selectedRole === "examiner" && !regExaminerDepartment)
                      }
                      className="w-full font-semibold h-11"
                      style={{ background: "#3b82f6", color: "white" }}
                    >
                      {registerMutation.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{L.registering}</>
                      ) : (
                        L.createAccount
                      )}
                    </Button>
                    <p className="text-white/30 text-xs text-center leading-relaxed">{L.registerPrivacyConsent}</p>

                    {/* Wechsel zu Login */}
                    <p className="text-center text-white/40 text-xs">
                      {L.alreadyHaveAccount}{" "}
                      <button
                        type="button"
                        onClick={() => setStep("login")}
                        className="text-[#76b900] hover:underline"
                      >
                        {L.signInBtn}
                      </button>
                    </p>
                  </form>
                </CardContent>
              </Card>
            )}
          </>
        )}

        <p className="text-center text-white/25 text-xs mt-6">{L.footer}</p>
      </div>
    </div>
  );
}
