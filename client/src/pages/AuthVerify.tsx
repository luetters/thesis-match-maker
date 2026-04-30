import { useEffect } from "react";
import { GraduationCap, Loader2 } from "lucide-react";

/**
 * Diese Seite wird aufgerufen, wenn der Nutzer auf den Magic-Link in der E-Mail klickt.
 * Der Browser navigiert zu /auth/verify?token=... → der Express-Server verarbeitet das
 * und leitet weiter. Diese React-Seite dient nur als visuelles Zwischenladen.
 */
export default function AuthVerify() {
  useEffect(() => {
    // Token aus URL extrahieren und an den Server weiterleiten
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      // Direkt zum Server-Endpunkt navigieren (kein fetch – Server setzt Cookie und redirectet)
      window.location.href = `/api/auth/verify?token=${encodeURIComponent(token)}`;
    } else {
      window.location.href = "/?error=no_token";
    }
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)" }}
    >
      <div className="text-center">
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-xl mb-6"
          style={{ background: "#76b900" }}
        >
          <GraduationCap className="w-8 h-8 text-white" />
        </div>
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-white/50" />
        <p className="text-white/60 text-sm">Anmeldung wird verarbeitet …</p>
        <p className="text-white/30 text-xs mt-2">HTW Berlin – Thesis Match Maker</p>
      </div>
    </div>
  );
}
