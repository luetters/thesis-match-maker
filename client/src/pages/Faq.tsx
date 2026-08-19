import { LanguageSwitcher, useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft, CheckCircle2, ChevronDown, FileQuestion, HeartHandshake, Search, ShieldCheck, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";

type Audience = "general" | "student" | "firstExaminer" | "secondExaminer" | "admin";
type FaqItem = { question: string; answer: string };

export const FAQ_DE: Record<Audience, FaqItem[]> = {
  general: [
    { question: "Was ist Thesis Match?", answer: "Thesis Match unterstützt die HTW Berlin bei dem Teil der Abschlussarbeitsorganisation, der bisher häufig per E-Mail erfolgt: passende Prüfer:innen finden, Anfragen strukturiert bearbeiten, eine Kommission bilden und den weiteren Ablauf nachvollziehbar dokumentieren." },
    { question: "Ist die Teilnahme verpflichtend?", answer: "Nein. Die Nutzung ist freiwillig. Das Portal soll bestehende Verfahren nicht ersetzen, sondern die Suche nach passenden Prüfer:innen und die Abstimmung rund um Abschlussarbeiten erleichtern." },
    { question: "Ersetzt das Portal Moodle, die Prüfungsverwaltung oder die Abgabe nach den geltenden Regelungen?", answer: "Nein. Die verbindlichen Regeln und bestehenden Systeme der HTW Berlin bleiben maßgeblich. Das Portal ergänzt den Prozess insbesondere bei Matching, Kommissionsbildung, Fristenüberblick und Kommunikation." },
    { question: "Ist dies ein offizielles System der HTW Berlin?", answer: "Das Portal wird derzeit im Testbetrieb evaluiert. Es soll transparent zeigen, welche Abläufe es unterstützt; eine institutionelle Einbindung und der Serverbetrieb bei der HTW Berlin können nach erfolgreicher Erprobung weiterentwickelt werden." },
    { question: "Welche Daten werden verarbeitet?", answer: "Es werden nur Daten verarbeitet, die für die Organisation einer Abschlussarbeit erforderlich sind, etwa Name, Hochschul-E-Mail-Adresse, Studiengang, Thema, beteiligte Prüfer:innen und prozessbezogene Fristen. Noten und vergleichbare Leistungsdaten gehören nicht in dieses Portal." },
    { question: "Darf ich mein übliches Passwort der HTW Berlin verwenden?", answer: "Bitte nicht. Verwenden Sie ein eigenes, einzigartiges Passwort für dieses Portal. Eine mögliche spätere Anmeldung über das zentrale Single-Sign-On der HTW Berlin wird getrennt vorbereitet." },
    { question: "Was mache ich bei Fehlern oder Verbesserungsvorschlägen?", answer: "Das Portal wird weiterentwickelt. Melden Sie Fehler, Unklarheiten und Ideen bitte mit einer kurzen Beschreibung sowie – falls möglich – einem Screenshot an die im Portal angegebene Kontaktadresse. Rückmeldungen verbessern die Nutzung für alle Beteiligten." },
  ],
  student: [
    { question: "Wie beginne ich als Studierende:r?", answer: "Erstellen Sie zunächst ein Konto mit Ihrer Hochschul-E-Mail-Adresse und einem eigenen Passwort. Nach einer notwendigen Freischaltung können Sie Ihr Studienprofil vervollständigen, ein Thema beschreiben und eine Anfrage an eine:n Erstprüfer:in stellen." },
    { question: "Muss ich Erst- und Zweitprüfer:in sofort kennen?", answer: "Nein. Die Anfrage beginnt in der Regel mit der Suche nach einer passenden Erstprüfung. Nach deren Zusage kann die Suche nach einer geeigneten Zweitprüfung gezielt fortgesetzt werden." },
    { question: "Was passiert nach Zusagen der Prüfer:innen?", answer: "Sobald die Kommission zustande gekommen ist, erhalten Sie das offizielle Anmeldedokument. Dieses ist in den bestehenden Prozess der HTW Berlin einzureichen. Im Portal sehen Sie den weiteren Status Ihrer Anfrage." },
    { question: "Kann ich meine Anfrage noch verändern oder zurückziehen?", answer: "Solange der Prozess dies zulässt, können Sie eine Anfrage zurückziehen. Inhaltliche Änderungen oder ein Wechsel von Prüfer:innen sollten Sie nachvollziehbar mit den Beteiligten abstimmen." },
  ],
  firstExaminer: [
    { question: "Warum sollte ich ein Profil anlegen?", answer: "Ein sichtbares Profil mit fachlichen Schwerpunkten, Kapazitäten und optionalen öffentlichen Links hilft Studierenden, passende Anfragen zu stellen. Das reduziert unpassende E-Mails und macht Expertise im Kollegium besser auffindbar." },
    { question: "Wie bearbeite ich Anfragen?", answer: "Sie erhalten strukturierte Anfragen und können sie zusagen, ablehnen oder – soweit vorgesehen – unter Vorbehalt behandeln. Im Verlauf bleiben Thema, Studiengang, Fristen und Beteiligte nachvollziehbar." },
    { question: "Habe ich automatisch Rechte als Zweitprüfer:in?", answer: "Ja. Personen mit Erstprüfungsrecht erhalten im Portal automatisch auch die Berechtigung als Zweitprüfer:in. Damit können Sie bei passenden Arbeiten sowohl Erst- als auch Zweitprüfungen übernehmen." },
    { question: "Wie behalte ich meine Kapazitäten im Blick?", answer: "Sie können Ihre Betreuungskapazitäten für kommende Semester hinterlegen. Diese Angaben unterstützen die Orientierung und helfen der Verwaltung, Betreuungsvolumina besser einzuordnen." },
  ],
  secondExaminer: [
    { question: "Warum lohnt sich die Registrierung als Zweitprüfer:in?", answer: "Ein Profil macht Ihre Expertise für Studierende und Kolleg:innen sichtbar. Gerade externe oder Lehrbeauftragte Zweitprüfer:innen können dadurch gezielter für passende Themen angefragt werden." },
    { question: "Kann ich eigene Themen verwalten?", answer: "Nein. Zweitprüfer:innen verwalten im Portal keine eigenen Themenangebote. Ihr Profil, Ihre fachlichen Schwerpunkte und Ihre Kapazitäten dienen dazu, passende Zweitprüfungsanfragen zu ermöglichen." },
    { question: "Wie organisiere ich meine Teilnahme am Kolloquium?", answer: "Sie sehen die Verteidigungen, bei denen Sie eingeteilt sind, und können an der abgestimmten Terminfindung teilnehmen. Kalenderdateien unterstützen die Übernahme bestätigter Termine." },
    { question: "Was soll ich nach der Freischaltung tun?", answer: "Pflegen Sie zunächst Ihr Profil und Ihre Betreuungskapazitäten. Ein Foto sowie Links zu offiziellen öffentlichen Profilen sind freiwillig, können aber die Auffindbarkeit verbessern." },
  ],
  admin: [
    { question: "Welche Aufgaben unterstützt die Verwaltung?", answer: "Die Verwaltung kann berechtigte Registrierungen prüfen, Fristen je Fachbereich, Studiengang und Semester pflegen, Anfragen überblicken und nachvollziehen, welche Fälle noch eine Bearbeitung benötigen." },
    { question: "Was bedeutet die Fachbereichszuständigkeit?", answer: "Verwaltungsmitarbeiter:innen arbeiten innerhalb ihrer zugewiesenen Fachbereiche. Dadurch bleiben Freigaben und Prozessverantwortung nachvollziehbar; fachbereichsübergreifende Sonderfälle können im Superadmin-Bereich bearbeitet werden." },
    { question: "Wie werden individuelle Fristen dokumentiert?", answer: "Für einzelne Abschlussarbeiten kann ein abweichender Abgabetermin hinterlegt werden. Änderungen werden mit einem kurzen Hinweis dokumentiert, sodass Prüfer:innen und Verwaltung den Verlauf nachvollziehen können." },
    { question: "Wie hilft das Portal bei der Akzeptanz?", answer: "Klare Informationen, kurze Wege und sichtbare Zuständigkeiten sind entscheidend. Verweisen Sie bei Anfragen auf die FAQ, erklären Sie den Testcharakter offen und sammeln Sie Rückmeldungen aus der Praxis." },
  ],
};

export const FAQ_EN: Record<Audience, FaqItem[]> = {
  general: [
    { question: "What is Thesis Match?", answer: "Thesis Match supports HTW Berlin with the parts of thesis administration that are often handled by email: finding suitable examiners, processing requests in a structured way, forming a committee and keeping the process traceable." },
    { question: "Is participation mandatory?", answer: "No. Participation is voluntary. The portal does not replace existing procedures; it is intended to make matching and coordination around theses easier." },
    { question: "Does the portal replace Moodle, examination administration or formal submission procedures?", answer: "No. Binding regulations and existing HTW Berlin systems remain authoritative. The portal complements matching, committee formation, deadline overview and communication." },
    { question: "Which data is processed?", answer: "Only data required to organise a thesis is processed, such as name, university email address, programme, topic, participating examiners and process-related deadlines. Grades do not belong in this portal." },
    { question: "May I use my usual HTW Berlin password?", answer: "Please do not. Use a unique password for this portal. A potential future central single sign-on integration is being prepared separately." },
  ],
  student: [
    { question: "How do I get started as a student?", answer: "Create an account with your university email address and a separate password. After approval, complete your profile, describe your topic and submit a request to a first examiner." },
    { question: "Do I need to know both examiners immediately?", answer: "No. The process generally begins with finding a suitable first examiner. After acceptance, the search for a second examiner can continue in a targeted way." },
    { question: "What happens after both examiners accept?", answer: "Once the committee has been formed, you receive the official registration document and can follow the status of your request in the portal." },
  ],
  firstExaminer: [
    { question: "Why should I create a profile?", answer: "A visible profile with academic interests, capacities and optional public links helps students submit suitable requests and makes expertise easier to find." },
    { question: "How do I manage requests?", answer: "You receive structured requests and can accept, decline or, where provided, accept conditionally. Topic, programme, deadlines and participants remain traceable." },
    { question: "Do I automatically have second-examiner permissions?", answer: "Yes. First-examiner permissions automatically include second-examiner permissions in the portal." },
  ],
  secondExaminer: [
    { question: "Why register as a second examiner?", answer: "A profile makes your expertise visible to students and colleagues. This is particularly helpful for external or adjunct second examiners." },
    { question: "Can I manage my own topics?", answer: "No. Second examiners do not manage their own topic offers. Your profile, expertise and capacities help to identify suitable second-examiner requests." },
    { question: "How do I organise my colloquium participation?", answer: "You see only the defences for which you are assigned and can participate in the coordinated scheduling process." },
  ],
  admin: [
    { question: "Which tasks are supported for administration?", answer: "Administration can review registrations, maintain deadlines by department, programme and semester, monitor requests and identify cases that still need action." },
    { question: "What does departmental responsibility mean?", answer: "Administrative staff work within their assigned departments. This keeps approvals and responsibilities traceable; cross-departmental exceptions can be handled by superadmins." },
    { question: "How are individual deadlines documented?", answer: "An individual due date can be recorded for a thesis. Changes are documented with a short note so that the process remains transparent." },
  ],
};

const AUDIENCES: Array<{ id: Audience; de: string; en: string; icon: string }> = [
  { id: "general", de: "Allgemein", en: "General", icon: "•" },
  { id: "student", de: "Studierende", en: "Students", icon: "01" },
  { id: "firstExaminer", de: "Erstprüfer:innen", en: "First examiners", icon: "02" },
  { id: "secondExaminer", de: "Zweitprüfer:innen", en: "Second examiners", icon: "03" },
  { id: "admin", de: "Verwaltung", en: "Administration", icon: "04" },
];

export default function Faq() {
  const { lang } = useLanguage();
  const [, navigate] = useLocation();
  const [audience, setAudience] = useState<Audience>("general");
  const [search, setSearch] = useState("");
  const de = lang === "de";
  const content = de ? FAQ_DE : FAQ_EN;
  const visibleItems = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return content[audience];
    return AUDIENCES.flatMap(({ id }) => content[id]).filter((item) => `${item.question} ${item.answer}`.toLocaleLowerCase().includes(term));
  }, [audience, content, search]);

  const copy = de ? {
    eyebrow: "Hilfe & Orientierung", title: "Fragen dürfen einfach sein.", intro: "Diese FAQ erklärt das Portal ohne Fachsprache. Wählen Sie Ihre Rolle oder suchen Sie nach einem Begriff. So finden Sie schnell den passenden nächsten Schritt.", search: "Zum Beispiel: Freischaltung, Frist, Passwort oder Zweitprüfung", noResults: "Dazu wurde noch keine Antwort gefunden.", contact: "Ihre Frage fehlt? Hinweise aus der Praxis helfen, das Portal verständlicher zu machen.", contactLink: "Feedback geben", back: "Zur Startseite", trustTitle: "Für eine gute Zusammenarbeit", trust: ["Freiwillige Nutzung und transparente Abläufe", "Eigene Passwörter statt Zugangsdaten anderer Systeme", "Keine Noten oder vergleichbare Leistungsdaten im Portal", "Testphase: Rückmeldungen sind ausdrücklich erwünscht"],
  } : {
    eyebrow: "Help & guidance", title: "Questions should be easy.", intro: "This FAQ explains the portal without unnecessary jargon. Select your role or search for a term to find the next step quickly.", search: "For example: approval, deadline, password or second examiner", noResults: "No answer has been found for this topic yet.", contact: "Is your question missing? Practical feedback helps make the portal easier to use.", contactLink: "Send feedback", back: "Back to homepage", trustTitle: "For productive collaboration", trust: ["Voluntary use and transparent processes", "Separate passwords instead of credentials from other systems", "No grades or comparable performance data in the portal", "Pilot phase: feedback is explicitly welcome"],
  };

  return (
    <div className="min-h-screen bg-[#f7faf5] text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="container flex min-h-20 items-center justify-between gap-4">
          <button onClick={() => navigate("/")} className="flex items-center gap-3 text-left" aria-label={copy.back}>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#76B900] font-black text-white">TM</div>
            <div><p className="font-bold leading-tight">Thesis Match</p><p className="text-xs text-slate-500">HTW Berlin</p></div>
          </button>
          <div className="flex items-center gap-3"><LanguageSwitcher /><button onClick={() => navigate("/")} className="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#547f00]"><ArrowLeft className="h-4 w-4" />{copy.back}</button></div>
        </div>
      </header>

      <main>
        <section className="border-b border-[#dff0c4] bg-gradient-to-br from-[#f4fbe9] via-white to-[#e7f5d4]">
          <div className="container py-16 sm:py-20">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#e5f5cc] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#527b00]"><Sparkles className="h-3.5 w-3.5" />{copy.eyebrow}</div>
              <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">{copy.title}</h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">{copy.intro}</p>
              <div className="relative mt-8 max-w-2xl"><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm shadow-sm outline-none ring-[#76B900] transition focus:ring-2" /></div>
            </div>
          </div>
        </section>

        <section className="container py-10 sm:py-14">
          <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{de ? "Ihre Perspektive" : "Your perspective"}</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                {AUDIENCES.map((item) => <button key={item.id} onClick={() => { setAudience(item.id); setSearch(""); }} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${audience === item.id && !search ? "bg-[#76B900] text-white shadow-sm" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-[#f4fbe9]"}`}><span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] ${audience === item.id && !search ? "bg-white/20" : "bg-[#e5f5cc] text-[#527b00]"}`}>{item.icon}</span>{de ? item.de : item.en}</button>)}
              </div>
              <div className="mt-8 rounded-2xl border border-[#cdeca3] bg-[#f5fbe9] p-5"><HeartHandshake className="h-5 w-5 text-[#649800]" /><h2 className="mt-3 font-bold text-slate-800">{copy.trustTitle}</h2><ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">{copy.trust.map((item) => <li key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#76B900]" />{item}</li>)}</ul></div>
            </aside>

            <div>
              <div className="mb-5 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-900 text-white"><FileQuestion className="h-5 w-5" /></div><div><p className="text-sm text-slate-500">{search ? (de ? "Suchergebnisse" : "Search results") : (de ? AUDIENCES.find((entry) => entry.id === audience)?.de : AUDIENCES.find((entry) => entry.id === audience)?.en)}</p><h2 className="text-2xl font-bold">{visibleItems.length} {de ? "Antworten" : "answers"}</h2></div></div>
              {visibleItems.length ? <div className="space-y-3">{visibleItems.map((item) => <details key={item.question} className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 open:ring-[#b9e279]"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-800"><span>{item.question}</span><ChevronDown className="h-5 w-5 shrink-0 text-[#679900] transition group-open:rotate-180" /></summary><p className="mt-4 border-t border-slate-100 pt-4 leading-relaxed text-slate-600">{item.answer}</p></details>)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600"><p className="font-semibold">{copy.noResults}</p><p className="mt-2 text-sm">{copy.contact}</p></div>}
              <div className="mt-10 flex flex-col justify-between gap-4 rounded-2xl bg-slate-900 p-6 text-white sm:flex-row sm:items-center"><div><div className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5 text-[#b8e77a]" />{de ? "Ihre Rückmeldung zählt." : "Your feedback matters."}</div><p className="mt-1 text-sm leading-relaxed text-slate-300">{copy.contact}</p></div><a href="mailto:thesis@htw-berlin.com?subject=Feedback%20zum%20Thesis%20Match%20Portal" className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#76B900] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#649800]">{copy.contactLink}</a></div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
