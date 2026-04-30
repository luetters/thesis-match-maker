import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Mail, GraduationCap, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function Login() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"student" | "examiner">("student");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  // URL-Fehler auslesen
  const params = new URLSearchParams(window.location.search);
  const urlError = params.get("error");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-origin": window.location.origin,
        },
        body: JSON.stringify({ email: email.trim(), role }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Ein Fehler ist aufgetreten");
        return;
      }

      setSent(true);
    } catch {
      toast.error("Verbindungsfehler – bitte versuchen Sie es erneut");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative"
      style={{
        background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)",
      }}
    >
      {/* HTW-Grün-Akzentlinie oben */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "#76b900" }} />

      {/* Zurück-Link */}
      <Link
        href="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Zurück zur Startseite
      </Link>

      <div className="w-full max-w-md px-4">
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

        {/* Fehler-Banner */}
        {urlError && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
            {urlError === "invalid_token"
              ? "Der Anmeldelink ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen an."
              : "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut."}
          </div>
        )}

        <Card className="border-0 shadow-2xl" style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)" }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-xl">
              {sent ? "E-Mail gesendet" : "Anmelden"}
            </CardTitle>
            <CardDescription className="text-white/50">
              {sent
                ? "Prüfen Sie Ihr E-Mail-Postfach"
                : "Kein Passwort erforderlich – wir senden Ihnen einen Anmeldelink"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-16 h-16 mx-auto mb-4" style={{ color: "#76b900" }} />
                <p className="text-white/80 text-sm leading-relaxed">
                  Ein Anmeldelink wurde an <strong className="text-white">{email}</strong> gesendet.
                  Der Link ist <strong className="text-white">30 Minuten</strong> gültig.
                </p>
                <p className="text-white/40 text-xs mt-4">
                  Keine E-Mail erhalten? Prüfen Sie Ihren Spam-Ordner.
                </p>
                <Button
                  variant="outline"
                  className="mt-6 w-full border-white/20 text-white/70 hover:text-white hover:border-white/40 bg-transparent"
                  onClick={() => setSent(false)}
                >
                  Andere E-Mail-Adresse verwenden
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
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
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[#76b900] focus:ring-[#76b900]/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/70 text-sm">Ich bin …</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as "student" | "examiner")}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white focus:border-[#76b900]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Studierende:r</SelectItem>
                      <SelectItem value="examiner">Prüfer:in / Professor:in</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full font-semibold h-11"
                  style={{ background: "#76b900", color: "white" }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sende Link …
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Anmeldelink senden
                    </>
                  )}
                </Button>

                <p className="text-white/30 text-xs text-center leading-relaxed">
                  Durch die Anmeldung stimmen Sie der Verarbeitung Ihrer Daten gemäß der
                  Datenschutzerklärung der HTW Berlin zu.
                </p>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-white/25 text-xs mt-6">
          HTW Berlin – Hochschule für Technik und Wirtschaft Berlin
        </p>
      </div>
    </div>
  );
}
