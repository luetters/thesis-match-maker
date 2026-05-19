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
  ChevronRight,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

type Role = "student" | "examiner" | "admin";

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
    label: "Studierende:r",
    description: "Ich möchte eine Abschlussarbeit anmelden und Prüfer:innen finden.",
    icon: <GraduationCap className="w-7 h-7" />,
    accentColor: "#76b900",
    bgColor: "rgba(118,185,0,0.08)",
  },
  {
    id: "examiner",
    label: "Prüfer:in",
    description: "Ich betreue Abschlussarbeiten als Erst- oder Zweitprüfer:in.",
    icon: <BookOpen className="w-7 h-7" />,
    accentColor: "#3b82f6",
    bgColor: "rgba(59,130,246,0.08)",
  },
  {
    id: "admin",
    label: "Verwaltungsmitarbeiter:in",
    description: "Ich bin in der Studiengangs- oder Prüfungsverwaltung tätig.",
    icon: <Settings className="w-7 h-7" />,
    accentColor: "#a855f7",
    bgColor: "rgba(168,85,247,0.08)",
  },
];

export default function Login() {
  const [step, setStep] = useState<"role" | "email">("role");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginMode, setLoginMode] = useState<"magic" | "password">("magic");
  const [magicSent, setMagicSent] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [, setLocation] = useLocation();

  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get("returnTo") ?? "/";
  const urlError = params.get("error");

  const loginMutation = trpc.auth.loginWithPassword.useMutation({
    onSuccess: (data) => {
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
      toast.error(error.message ?? "Anmeldung fehlgeschlagen");
    },
  });

  const requestReset = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => {
      setResetSent(true);
      toast.success("Reset-Link wurde gesendet. Bitte prüfen Sie Ihr Postfach.");
    },
    onError: (e) => toast.error(e.message),
  });

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    loginMutation.mutate({ email: email.trim(), password });
  }

  async function handleMagicLinkSend(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.error("Bitte eine gültige E-Mail-Adresse eingeben.");
      return;
    }
    setMagicLoading(true);
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Origin": window.location.origin,
        },
        body: JSON.stringify({ email: email.trim(), role: selectedRole ?? "student" }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Fehler beim Senden");
      }
      setMagicSent(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setMagicLoading(false);
    }
  }

  const selectedRoleOption = ROLE_OPTIONS.find((r) => r.id === selectedRole);

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
        Zurück zur Startseite
      </Link>

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
            {urlError === "invalid_token"
              ? "Der Anmeldelink ist ungültig oder abgelaufen. Bitte melden Sie sich erneut an."
              : "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut."}
          </div>
        )}

        {/* ── SCHRITT 1: Rollenauswahl ── */}
        {step === "role" && (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-white mb-1">Wie möchten Sie sich anmelden?</h2>
              <p className="text-white/50 text-sm">Bitte wählen Sie Ihre Rolle an der HTW Berlin.</p>
            </div>
            <div className="space-y-3">
              {ROLE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setSelectedRole(option.id);
                    setStep("email");
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
                  <ChevronRight className="w-5 h-5 text-white/30 flex-shrink-0 group-hover:text-white/60 transition-colors" />
                </button>
              ))}
            </div>
            <p className="text-center text-white/25 text-xs mt-8">
              HTW Berlin – Hochschule für Technik und Wirtschaft Berlin
            </p>
          </div>
        )}

        {/* ── SCHRITT 2: E-Mail & Anmeldung ── */}
        {step === "email" && (
          <>
            <button
              type="button"
              onClick={() => {
                setStep("role");
                setMagicSent(false);
                setResetSent(false);
                setEmail("");
                setPassword("");
              }}
              className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors text-sm mb-5"
            >
              <ArrowLeft className="w-4 h-4" />
              Rolle ändern
            </button>

            {selectedRoleOption && (
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
                  <div className="text-white/50 text-xs">Ausgewählte Rolle</div>
                </div>
              </div>
            )}

            <Card
              className="border-0 shadow-2xl"
              style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)" }}
            >
              <CardHeader className="pb-4">
                <CardTitle className="text-white text-xl">Anmelden</CardTitle>
                <CardDescription className="text-white/50">
                  Melden Sie sich mit Ihrer HTW-Berlin-E-Mail-Adresse an
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Tab-Umschalter */}
                <div className="flex rounded-xl p-1 mb-5" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <button
                    type="button"
                    onClick={() => { setLoginMode("magic"); setResetSent(false); }}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                      loginMode === "magic" ? "bg-white text-gray-900 shadow" : "text-white/50 hover:text-white/80"
                    }`}
                  >
                    Magic Link
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLoginMode("password"); setMagicSent(false); }}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                      loginMode === "password" ? "bg-white text-gray-900 shadow" : "text-white/50 hover:text-white/80"
                    }`}
                  >
                    Passwort
                  </button>
                </div>

                {/* Magic Link */}
                {loginMode === "magic" && (
                  <>
                    {magicSent ? (
                      <div className="text-center py-6">
                        <div
                          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                          style={{ backgroundColor: "rgba(118,185,0,0.15)" }}
                        >
                          <Mail className="w-7 h-7" style={{ color: "#76b900" }} />
                        </div>
                        <h3 className="text-white font-semibold mb-2">E-Mail gesendet!</h3>
                        <p className="text-white/50 text-sm mb-4">
                          Wir haben einen Anmeldelink an{" "}
                          <strong className="text-white/70">{email}</strong> gesendet. Bitte prüfen Sie Ihr Postfach.
                        </p>
                        <button
                          type="button"
                          onClick={() => setMagicSent(false)}
                          className="text-sm text-white/40 hover:text-white/70 transition-colors"
                        >
                          Anderen Link anfordern
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleMagicLinkSend} className="space-y-5">
                        <div className="space-y-2">
                          <Label className="text-white/70 text-sm">E-Mail-Adresse</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                            <Input
                              type="email"
                              placeholder="vorname.nachname@htw-berlin.de"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              required
                              autoComplete="email"
                              autoFocus
                              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[#76b900] focus:ring-[#76b900]/20"
                            />
                          </div>
                        </div>
                        <Button
                          type="submit"
                          disabled={magicLoading || !email.trim()}
                          className="w-full font-semibold h-11"
                          style={{ background: "#76b900", color: "white" }}
                        >
                          {magicLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Wird gesendet …
                            </>
                          ) : (
                            <>
                              <Mail className="w-4 h-4 mr-2" />
                              Anmeldelink senden
                            </>
                          )}
                        </Button>
                        <div
                          className="flex items-start gap-2 p-3 rounded-lg"
                          style={{ background: "rgba(118,185,0,0.08)", border: "1px solid rgba(118,185,0,0.2)" }}
                        >
                          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#76b900" }} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <p className="text-xs text-white/50">
                            Kein Passwort erforderlich. Der Link ist 24 Stunden gültig und kann nur einmal verwendet werden.
                          </p>
                        </div>
                      </form>
                    )}
                  </>
                )}

                {/* Passwort */}
                {loginMode === "password" && (
                  <form onSubmit={handlePasswordSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-white/70 text-sm">E-Mail-Adresse</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <Input
                          type="email"
                          placeholder="vorname.nachname@htw-berlin.de"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          autoComplete="email"
                          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[#76b900] focus:ring-[#76b900]/20"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-white/70 text-sm">Passwort</Label>
                        {!resetSent && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!email.includes("@")) {
                                toast.error("Bitte zuerst Ihre E-Mail-Adresse eingeben.");
                                return;
                              }
                              requestReset.mutate({ email: email.trim(), origin: window.location.origin });
                            }}
                            disabled={requestReset.isPending}
                            className="text-xs text-white/40 hover:text-white/70 transition-colors"
                          >
                            {requestReset.isPending ? "Wird gesendet…" : "Passwort vergessen?"}
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Ihr Passwort"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          autoComplete="current-password"
                          className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[#76b900] focus:ring-[#76b900]/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    {resetSent && (
                      <div
                        className="p-3 rounded-lg text-sm"
                        style={{ background: "rgba(118,185,0,0.1)", border: "1px solid rgba(118,185,0,0.3)", color: "#76b900" }}
                      >
                        Eine E-Mail mit dem Reset-Link wurde gesendet. Bitte prüfen Sie Ihr Postfach.
                      </div>
                    )}
                    <Button
                      type="submit"
                      disabled={loginMutation.isPending || !email.trim() || !password}
                      className="w-full font-semibold h-11"
                      style={{ background: "#76b900", color: "white" }}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Anmeldung läuft …
                        </>
                      ) : (
                        "Anmelden"
                      )}
                    </Button>
                    <p className="text-white/30 text-xs text-center leading-relaxed">
                      Durch die Anmeldung stimmen Sie der Verarbeitung Ihrer Daten gemäß der Datenschutzerklärung der HTW Berlin zu.
                    </p>
                  </form>
                )}
              </CardContent>
            </Card>

            <p className="text-center text-white/25 text-xs mt-6">
              HTW Berlin – Hochschule für Technik und Wirtschaft Berlin
            </p>
          </>
        )}
      </div>
    </div>
  );
}
