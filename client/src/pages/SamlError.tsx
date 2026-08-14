import { AlertTriangle, ArrowLeft, CircleHelp, LogIn, UserPlus } from "lucide-react";
import { Link } from "wouter";
import { getSamlErrorInfo } from "@shared/samlErrorInfo";

export default function SamlError() {
  const code = new URLSearchParams(window.location.search).get("code");
  const error = getSamlErrorInfo(code);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4 py-10 text-white">
      <div className="mx-auto flex min-h-[80vh] max-w-2xl items-center">
        <section className="w-full rounded-3xl border border-white/10 bg-white/5 p-7 shadow-2xl backdrop-blur sm:p-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300"><AlertTriangle className="h-7 w-7" /></div>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-[#a6d85f]">HTW Berlin · Thesis Match Maker</p>
          <h1 className="mt-3 text-2xl font-bold sm:text-3xl">{error.title}</h1>
          <p className="mt-4 text-base leading-7 text-white/75">{error.description}</p>
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/15 p-4 text-sm leading-6 text-white/80"><span className="font-semibold text-white">Was können Sie tun?</span><br />{error.guidance}</div>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#76b900] px-4 py-3 text-sm font-semibold text-white hover:bg-[#629900]"><LogIn className="h-4 w-4" /> Zur Anmeldung</Link>
            {error.showRegistrationHint ? <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"><UserPlus className="h-4 w-4" /> Registrierung starten</Link> : <Link href="/" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"><ArrowLeft className="h-4 w-4" /> Zur Startseite</Link>}
          </div>
          <p className="mt-6 flex items-start gap-2 text-xs leading-5 text-white/45"><CircleHelp className="mt-0.5 h-3.5 w-3.5 shrink-0" />Für technische Rückfragen notieren Sie bitte den ungefähren Zeitpunkt und wenden sich an die Verwaltung der HTW Berlin.</p>
        </section>
      </div>
    </main>
  );
}
