import { BookOpenCheck, Download, PlayCircle, SearchCheck, Send, ShieldCheck, UsersRound } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const INTRO_VIDEO_URL = "/manus-storage/thesis-match-einstieg_6541f57a.mp4";

export function LandingOnboarding() {
  const { lang } = useLanguage();
  const de = lang === "de";
  return (
    <section className="relative z-10 bg-slate-950 py-18 text-white sm:py-20">
      <div className="container grid items-center gap-10 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#c9f58e]"><UsersRound className="h-3.5 w-3.5" />{de ? "Ein gemeinsamer Einstieg" : "One shared starting point"}</div>
          <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">{de ? "Vom ersten Thema bis zur abgestimmten Kommission." : "From the first topic to a coordinated committee."}</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-300">{de ? "Das kurze Video zeigt, wie Studierende, Prüfer:innen und Verwaltung im Portal zusammenarbeiten – ruhig, transparent und ohne Umwege." : "This short video shows how students, examiners and administration collaborate in the portal – calmly, transparently and without unnecessary detours."}</p>
          <a href="/api/export/examiner-quick-guide.pdf" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#76B900] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#649800]"><Download className="h-4 w-4" />{de ? "Kompaktleitfaden für Prüfer:innen herunterladen" : "Download examiner quick guide"}</a>
          <p className="mt-3 text-xs leading-relaxed text-slate-400"><BookOpenCheck className="mr-1 inline h-3.5 w-3.5 text-[#b8e77a]" />{de ? "Der Leitfaden fasst Profil, Anfragen, Kapazitäten, Fristen und Kolloquien kompakt zusammen." : "The guide summarises profiles, requests, capacities, deadlines and colloquia."}</p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl">
          <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold text-slate-300"><PlayCircle className="h-4 w-4 text-[#b8e77a]" />{de ? "Einführung in Thesis Match" : "Introduction to Thesis Match"}</div>
          <video className="block aspect-video w-full object-cover" controls playsInline preload="metadata" aria-label={de ? "Einführungsvideo für das Portal" : "Portal introduction video"}>
            <source src={INTRO_VIDEO_URL} type="video/mp4" />
            {de ? "Ihr Browser unterstützt dieses Video nicht." : "Your browser does not support this video."}
          </video>
        </div>
      </div>
      <div className="container mt-14 border-t border-white/10 pt-12">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#b8e77a]/25 bg-[#76B900]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#c9f58e]"><ShieldCheck className="h-3.5 w-3.5" />{de ? "Start für Studierende" : "Student quick start"}</div>
          <h3 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">{de ? "So nutzen Sie den Thesis Match Maker Schritt für Schritt." : "How to use Thesis Match Maker step by step."}</h3>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">{de ? "Sie behalten jederzeit den Status Ihrer Anfrage im Blick. Für die Registrierung verwenden Sie ein eigenes Portalpasswort – niemals Ihr HTW Berlin Passwort." : "You can track the status of your request at any time. For registration, use a dedicated portal password – never your HTW Berlin password."}</p>
        </div>
        <ol className="mt-7 grid gap-4 md:grid-cols-3">
          {[
            { icon: <ShieldCheck className="h-5 w-5" />, title: de ? "1. Registrieren" : "1. Register", text: de ? "Erstellen Sie ein Konto mit Ihrer Studierenden-E-Mail-Adresse und einem eigenen Passwort." : "Create an account with your student email address and a dedicated password." },
            { icon: <SearchCheck className="h-5 w-5" />, title: de ? "2. Arbeit vorbereiten" : "2. Prepare your thesis", text: de ? "Erfassen Sie Studiengang, Thema, Arbeitsart und die benötigten Angaben für Ihre Thesis-Anfrage." : "Enter your programme, topic, work type and the details needed for your thesis request." },
            { icon: <Send className="h-5 w-5" />, title: de ? "3. Anfrage verfolgen" : "3. Track your request", text: de ? "Wählen Sie eine Erstbetreuung und verfolgen Sie Zusagen, Dokumente und die nächsten Schritte im Dashboard." : "Select a first supervisor and track approvals, documents and next steps in your dashboard." },
          ].map((step) => (
            <li key={step.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#76B900]/20 text-[#c9f58e]">{step.icon}</div>
              <h4 className="mt-4 text-sm font-bold text-white">{step.title}</h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{step.text}</p>
            </li>
          ))}
        </ol>
        <a href="/login" className="mt-6 inline-flex items-center rounded-xl border border-[#b8e77a]/45 px-4 py-2.5 text-sm font-bold text-[#d9f5b5] transition hover:bg-[#76B900]/15">{de ? "Jetzt registrieren oder anmelden" : "Register or sign in now"}</a>
      </div>
    </section>
  );
}
