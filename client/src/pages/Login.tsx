import { useState, useRef } from "react";
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
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLanguage, LanguageSwitcher } from "@/contexts/LanguageContext";
import { Checkbox } from "@/components/ui/checkbox";

type Role = "student" | "examiner" | "second_examiner" | "admin";

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
  const [resetSent, setResetSent] = useState(false);
  const [loginStatus, setLoginStatus] = useState<"pending" | "rejected" | null>(null);

  // Registrierungs-State
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPasswordConfirm, setRegPasswordConfirm] = useState("");
  const [regMatrikelNr, setRegMatrikelNr] = useState("");
  const [showRegPw, setShowRegPw] = useState(false);
  const [registered, setRegistered] = useState(false);
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
        return L.emailDomainErrorStudent ?? "Bitte verwenden Sie Ihre Studierenden-E-Mail-Adresse (@student.htw-berlin.de).";
      }
    } else if (role === "examiner") {
      if (!regEmailLower.endsWith("@htw-berlin.de") && !regEmailLower.endsWith("@htw-berlin.com")) {
        return L.emailDomainErrorExaminer ?? "Bitte verwenden Sie Ihre HTW-Berlin-E-Mail-Adresse (@htw-berlin.de oder @htw-berlin.com).";
      }
    } else if (role === "admin") {
      if (!regEmailLower.endsWith("@htw-berlin.de") && !regEmailLower.endsWith("@htw-berlin.com")) {
        return L.emailDomainErrorExaminer ?? "Bitte verwenden Sie Ihre HTW-Berlin-E-Mail-Adresse (@htw-berlin.de oder @htw-berlin.com).";
      }
    }
    return null;
  })();

  // Studiengang-Auswahl bei Registrierung (nur Studierende)
  const [regDegreeType, setRegDegreeType] = useState<"bachelor" | "master">("bachelor");
  const [regFachbereich, setRegFachbereich] = useState("FB3");
  const [regProgrammeId, setRegProgrammeId] = useState<number | null>(null);
  const programmesQuery = trpc.programmes.list.useQuery(undefined, { enabled: step === "register" && selectedRole === "student" });

  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get("returnTo") ?? "/";
  const urlError = params.get("error");
  const inviteToken = params.get("inviteToken") ?? undefined;

  const loginMutation = trpc.auth.loginWithPassword.useMutation({
    onSuccess: (data) => {
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
        else if (hasR("pav") || hasR("dean") || hasR("vice_dean")) target = "/admin";
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
      } else {
        setLoginStatus(null);
        toast.error(msg || L.loginFailed);
      }
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      setRegistered(true);
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
    loginMutation.mutate({ email: loginEmail.trim(), password: loginPassword });
  }

  function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!regFirstName.trim() || !regLastName.trim() || !regEmail.trim() || !regPassword || !regPasswordConfirm) return;
    if ((selectedRole ?? "student") === "student" && !regMatrikelNr.trim()) {
      toast.error(L.matrikelNrRequired);
      return;
    }
    if ((selectedRole ?? "student") === "student" && !regProgrammeId) {
      toast.error("Bitte wählen Sie Ihren Studiengang aus.");
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
      matrikelNr: regMatrikelNr.trim() || undefined,
      programmeId: (selectedRole === "student" && regProgrammeId) ? regProgrammeId : undefined,
      department: (selectedRole === "student") ? regFachbereich : undefined,
      thesisType: (selectedRole === "student") ? regDegreeType : undefined,
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
      <div className="absolute top-6 right-6">
        <LanguageSwitcher />
      </div>

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
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(118,185,0,0.2)", color: "#76b900" }}>Bereits registriert</span>
                  </div>
                  <div className="text-white/60 text-xs mt-1 leading-relaxed">
                    Sie haben bereits ein Konto und möchten sich anmelden.
                  </div>
                </div>
                <div className="text-white/30 text-lg">→</div>
              </button>

              {/* Trennlinie */}
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                <span className="text-white/30 text-xs">oder</span>
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
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}>Erstmalig</span>
                  </div>
                  <div className="text-white/50 text-xs mt-0.5 leading-relaxed">
                    Noch kein Konto? Jetzt registrieren – Freischaltung durch die Verwaltung erforderlich.
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
                <CardTitle className="text-white text-xl">{L.signInTitle ?? "Anmelden"}</CardTitle>
                <CardDescription className="text-white/50">{L.signInDesc ?? "Melden Sie sich mit Ihrer HTW-Berlin-E-Mail-Adresse an."}</CardDescription>
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
                    <div className="flex items-center justify-between">
                      <Label className="text-white/70 text-sm">{L.passwordLabel}</Label>
                      <button
                        type="button"
                        onClick={() => {
                          if (!loginEmail.trim()) {
                            toast.error(L.enterEmailFirst ?? "Bitte geben Sie zuerst Ihre E-Mail-Adresse ein.");
                            return;
                          }
                          requestReset.mutate({ email: loginEmail.trim(), origin: window.location.origin });
                        }}
                        className="text-xs text-white/40 hover:text-white/70 transition-colors"
                      >
                        {L.forgotPassword}
                      </button>
                    </div>
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
                    {L.noAccountYet ?? "Noch kein Konto?"}{" "}
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
                {L.selectRoleTitle ?? "Welche Rolle trifft auf Sie zu?"}
              </h2>
              <p className="text-white/50 text-sm">
                {L.selectRoleSubtitle ?? "Wählen Sie Ihre Rolle, um fortzufahren."}
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
              className="flex items-center gap-3 rounded-xl px-4 py-3 mb-5"
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

            {registered ? (
              <Card
                className="border-0 shadow-2xl"
                style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)" }}
              >
                <CardContent className="pt-8 pb-8 text-center">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: "rgba(118,185,0,0.15)" }}
                  >
                    <CheckCircle2 className="w-8 h-8" style={{ color: "#76b900" }} />
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">{L.registrationSubmitted}</h3>
                  <p className="text-white/50 text-sm leading-relaxed mb-6">{L.registrationSubmittedDesc}</p>
                  <Button
                    variant="outline"
                    onClick={() => { setRegistered(false); setStep("login"); }}
                    className="border-white/20 text-white/70 hover:text-white hover:bg-white/10"
                  >
                    {L.toLogin}
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
                                {type === "bachelor" ? "🎓 Bachelor" : "🎖️ Master"}
                              </button>
                            ))}
                          </div>
                          {/* Fachbereich */}
                          <select
                            value={regFachbereich}
                            onChange={(e) => { setRegFachbereich(e.target.value); setRegProgrammeId(null); }}
                            className="w-full px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white/80 focus:outline-none focus:border-[#76b900]"
                          >
                            {[
                              { value: "FB1", label: "FB 1 – Ingenieurwissenschaften I" },
                              { value: "FB2", label: "FB 2 – Ingenieurwissenschaften II" },
                              { value: "FB3", label: "FB 3 – Wirtschafts- und Rechtswissenschaften" },
                              { value: "FB4", label: "FB 4 – Informatik, Kommunikation und Wirtschaft" },
                              { value: "FB5", label: "FB 5 – Gestaltung und Kultur" },
                            ].map(fb => (
                              <option key={fb.value} value={fb.value} className="bg-gray-900">{fb.label}</option>
                            ))}
                          </select>
                          {/* Studiengang-Dropdown */}
                          {programmesQuery.isLoading ? (
                            <div className="text-white/30 text-xs py-2">Lade Studiengänge...</div>
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
                      </>
                    )}
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-white/70 text-sm">Vorname</Label>
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
                          <Label className="text-white/70 text-sm">Nachname</Label>
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
                      <div
                        className="flex items-start gap-2 px-3 py-2 rounded-lg text-xs"
                        style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}
                      >
                        <span className="mt-0.5 flex-shrink-0">⚠️</span>
                        <span><strong>{lang === 'de' ? 'Sicherheitshinweis' : 'Security notice'}:</strong> {L.securityHint.replace(/^[^:]+:\s*/, '')}</span>
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
                          ? (L.studentAutoApproval ?? "✅ Studierende mit @student.htw-berlin.de werden sofort freigeschaltet und können sich direkt nach der Registrierung anmelden.")
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
                        ((selectedRole ?? "student") === "student" && !regProgrammeId)
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
                      {L.alreadyHaveAccount ?? "Bereits registriert?"}{" "}
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
