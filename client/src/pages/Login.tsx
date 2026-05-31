import { useState } from "react";
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

type Role = "student" | "examiner" | "second_examiner" | "admin";

export default function Login() {
  const { t } = useLanguage();
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

  // Schritte: "role" → "action" → "login" oder "register"
  const [step, setStep] = useState<"role" | "action" | "login" | "register">("role");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Login-State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [loginStatus, setLoginStatus] = useState<"pending" | "rejected" | null>(null);

  // Registrierungs-State
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPasswordConfirm, setRegPasswordConfirm] = useState("");
  const [regMatrikelNr, setRegMatrikelNr] = useState("");
  const [showRegPw, setShowRegPw] = useState(false);
  const [registered, setRegistered] = useState(false);

  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get("returnTo") ?? "/";
  const urlError = params.get("error");

  const loginMutation = trpc.auth.loginWithPassword.useMutation({
    onSuccess: (data) => {
      setLoginStatus(null);
      const role = data.role;
      let target = returnTo;
      if (target === "/" || target === "") {
        if (role === "student") target = "/student";
        else if (role === "examiner") target = "/examiner";
        else if (role === "admin" || role === "pav" || role === "dean" || role === "vice_dean") target = "/admin";
        else if (role === "superadmin") target = "/superadmin";
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
    loginMutation.mutate({ email: loginEmail.trim(), password: loginPassword });
  }

  function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword || !regPasswordConfirm) return;
    if ((selectedRole ?? "student") === "student" && !regMatrikelNr.trim()) {
      toast.error(L.matrikelNrRequired);
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
    const emailLower = regEmail.trim().toLowerCase();
    const role = selectedRole ?? "student";
    if (role === "student") {
      if (!emailLower.endsWith("@student.htw-berlin.de")) {
        toast.error(L.emailDomainErrorStudent);
        return;
      }
    } else if (role === "examiner" || role === "admin") {
      if (!emailLower.endsWith("@htw-berlin.de") && !emailLower.endsWith("@htw-berlin.com")) {
        toast.error(L.emailDomainErrorExaminer);
        return;
      }
    }
    registerMutation.mutate({
      name: regName.trim(),
      email: regEmail.trim(),
      password: regPassword,
      role: selectedRole ?? "student",
      matrikelNr: regMatrikelNr.trim() || undefined,
    });
  }

  const selectedRoleOption = ROLE_OPTIONS.find((r) => r.id === selectedRole);

  function resetToRole() {
    setStep("role");
    setSelectedRole(null);
    setLoginEmail("");
    setLoginPassword("");
    setRegName("");
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

        {/* ── SCHRITT 1: Rollenauswahl ── */}
        {step === "role" && (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-white mb-1">{L.welcomeTitle}</h2>
              <p className="text-white/50 text-sm">{L.welcomeSubtitle}</p>
            </div>
            <div className="space-y-3">
              {ROLE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setSelectedRole(option.id);
                    setStep("action");
                  }}
                  className="w-full text-left rounded-xl border transition-all duration-200 p-4 flex items-center gap-4 group hover:scale-[1.01]"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    borderColor: "rgba(255,255,255,0.1)",
                  }}
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
            <p className="text-center text-white/25 text-xs mt-8">{L.footer}</p>
          </div>
        )}

        {/* ── SCHRITT 2: Anmelden oder Registrieren ── */}
        {step === "action" && selectedRoleOption && (
          <div>
            <button
              type="button"
              onClick={resetToRole}
              className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors text-sm mb-5"
            >
              <ArrowLeft className="w-4 h-4" />
              {L.changeRole}
            </button>

            {/* Rollen-Badge */}
            <div
              className="flex items-center gap-3 rounded-xl px-4 py-3 mb-6"
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

            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-white mb-1">{L.whatToDo}</h2>
              <p className="text-white/50 text-sm">{L.whatToDoSub}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setStep("login")}
                className="rounded-xl border p-5 flex flex-col items-center gap-3 transition-all duration-200 hover:scale-[1.02]"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  borderColor: "rgba(255,255,255,0.1)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(118,185,0,0.08)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#76b900";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)";
                }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(118,185,0,0.12)", color: "#76b900" }}>
                  <LogIn className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-white text-sm">{L.signIn}</div>
                  <div className="text-white/40 text-xs mt-0.5">{L.signInSub}</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setStep("register")}
                className="rounded-xl border p-5 flex flex-col items-center gap-3 transition-all duration-200 hover:scale-[1.02]"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  borderColor: "rgba(255,255,255,0.1)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(59,130,246,0.08)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#3b82f6";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)";
                }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(59,130,246,0.12)", color: "#3b82f6" }}>
                  <UserPlus className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-white text-sm">{L.register}</div>
                  <div className="text-white/40 text-xs mt-0.5">{L.registerSub}</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── SCHRITT 3a: Anmelden ── */}
        {step === "login" && selectedRoleOption && (
          <>
            <button
              type="button"
              onClick={() => setStep("action")}
              className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors text-sm mb-5"
            >
              <ArrowLeft className="w-4 h-4" />
              {L.back}
            </button>

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

            <Card
              className="border-0 shadow-2xl"
              style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)" }}
            >
              <CardHeader className="pb-4">
                <CardTitle className="text-white text-xl">{L.signIn}</CardTitle>
                <CardDescription className="text-white/50">{L.signInDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLoginSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-white/70 text-sm">{L.emailLabel}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <Input
                        type="email"
                        placeholder={L.emailPlaceholderLogin}
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        autoComplete="email"
                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[#76b900] focus:ring-[#76b900]/20"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-white/70 text-sm">{L.passwordLabel}</Label>
                      {!resetSent && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!loginEmail.includes("@")) {
                              toast.error(L.enterEmailFirst);
                              return;
                            }
                            requestReset.mutate({ email: loginEmail.trim(), origin: window.location.origin });
                          }}
                          disabled={requestReset.isPending}
                          className="text-xs text-[#76b900] hover:text-[#8fd400] underline underline-offset-2 transition-colors font-medium"
                        >
                          {requestReset.isPending ? L.sendingReset : L.forgotPassword}
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <Input
                        type={showLoginPw ? "text" : "password"}
                        placeholder={L.passwordPlaceholder}
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

                  {/* Persistente Statusmeldung: Konto ausstehend */}
                  {loginStatus === "pending" && (
                    <div
                      className="p-4 rounded-xl text-sm leading-relaxed"
                      style={{
                        background: "rgba(251,191,36,0.08)",
                        border: "1px solid rgba(251,191,36,0.35)",
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5"
                          style={{ background: "rgba(251,191,36,0.15)" }}
                        >
                          <svg className="w-4 h-4" style={{ color: "#f59e0b" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold mb-1" style={{ color: "#f59e0b" }}>{L.pendingTitle}</p>
                          <p style={{ color: "rgba(251,191,36,0.75)" }}>{L.pendingText}</p>
                          <p className="mt-2 text-xs" style={{ color: "rgba(251,191,36,0.5)" }}>{L.pendingNote}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Persistente Statusmeldung: Konto abgelehnt */}
                  {loginStatus === "rejected" && (
                    <div
                      className="p-4 rounded-xl text-sm leading-relaxed"
                      style={{
                        background: "rgba(239,68,68,0.08)",
                        border: "1px solid rgba(239,68,68,0.35)",
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5"
                          style={{ background: "rgba(239,68,68,0.15)" }}
                        >
                          <svg className="w-4 h-4" style={{ color: "#ef4444" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold mb-1" style={{ color: "#ef4444" }}>{L.rejectedTitle}</p>
                          <p style={{ color: "rgba(239,68,68,0.75)" }}>{L.rejectedText}</p>
                        </div>
                      </div>
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

                  <Button
                    type="submit"
                    disabled={loginMutation.isPending || !loginEmail.trim() || !loginPassword}
                    className="w-full font-semibold h-11"
                    style={{ background: "#76b900", color: "white" }}
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {L.signingIn}
                      </>
                    ) : (
                      L.signInBtn
                    )}
                  </Button>
                  <p className="text-white/30 text-xs text-center leading-relaxed">{L.privacyConsent}</p>
                </form>
              </CardContent>
            </Card>
          </>
        )}

        {/* ── SCHRITT 3b: Registrieren ── */}
        {step === "register" && selectedRoleOption && (
          <>
            <button
              type="button"
              onClick={() => setStep("action")}
              className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors text-sm mb-5"
            >
              <ArrowLeft className="w-4 h-4" />
              {L.back}
            </button>

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
                    onClick={() => setStep("login")}
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
                    )}
                    <div className="space-y-2">
                      <Label className="text-white/70 text-sm">{L.fullName}</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <Input
                          type="text"
                          placeholder={L.fullNamePlaceholder}
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          required
                          autoComplete="name"
                          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[#76b900] focus:ring-[#76b900]/20"
                        />
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
                          onChange={(e) => setRegEmail(e.target.value)}
                          required
                          autoComplete="email"
                          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[#76b900] focus:ring-[#76b900]/20"
                        />
                      </div>
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
                      <p>{L.pendingApproval}</p>
                    </div>
                    <Button
                      type="submit"
                      disabled={
                        registerMutation.isPending ||
                        !regName.trim() ||
                        !regEmail.trim() ||
                        !regPassword ||
                        !regPasswordConfirm ||
                        ((selectedRole ?? "student") === "student" && !regMatrikelNr.trim())
                      }
                      className="w-full font-semibold h-11"
                      style={{ background: "#3b82f6", color: "white" }}
                    >
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {L.registering}
                        </>
                      ) : (
                        L.createAccount
                      )}
                    </Button>
                    <p className="text-white/30 text-xs text-center leading-relaxed">{L.registerPrivacyConsent}</p>
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
