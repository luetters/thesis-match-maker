/**
 * ExaminerOnboarding – 5-Schritt-Assistent für Prüfer:innen
 * Schritte: 1) Willkommen  2) Profildaten  3) Foto  4) Studiengänge  5) Kapazität & Abschluss
 */
import { trpc } from "@/lib/trpc";
import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Typen ────────────────────────────────────────────────────────────────────
interface Programme {
  id: number;
  name: string;
  abbreviation: string;
  level: "bachelor" | "master";
  pictogramUrl: string | null;
}

type Step = 1 | 2 | 3 | 4 | 5;

// STEPS werden dynamisch in der Komponente erzeugt (abhängig von t)

const LANGUAGE_OPTIONS = ["Deutsch", "Englisch", "Französisch", "Spanisch", "Arabisch", "Türkisch", "Russisch", "Chinesisch", "Japanisch"];

// ─── Fortschrittsleiste ───────────────────────────────────────────────────────
function StepBar({ current, steps }: { current: Step; steps: { id: number; label: string }[] }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center flex-1">
          <div className="flex flex-col items-center flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
                ${current === s.id ? "bg-[#76B900] text-white shadow-lg scale-110" : current > s.id ? "bg-[#76B900] text-white" : "bg-gray-200 text-gray-400"}`}
            >
              {current > s.id ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : s.id}
            </div>
            <span className={`text-xs mt-1 font-medium hidden sm:block ${current === s.id ? "text-[#76B900]" : current > s.id ? "text-[#76B900]" : "text-gray-400"}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-0.5 flex-1 mx-1 rounded transition-all ${current > s.id ? "bg-[#76B900]" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Schritt 1: Willkommen ────────────────────────────────────────────────────
function Step1Welcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-[#76B900]/10 flex items-center justify-center">
          <img src="/manus-storage/IconFemaleFemale_210f65cb.webp" alt="HTW Berlin" className="w-14 h-14 object-contain" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Willkommen beim Thesis Match Maker</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          Dieser Assistent führt Sie in wenigen Schritten durch die Einrichtung Ihres Prüfer:innen-Profils.
          Die Angaben helfen Studierenden, die passende Betreuungsperson zu finden.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: "👤", title: "Profildaten", desc: "Name, Fachgebiet, Kontakt" },
          { icon: "📚", title: "Studiengänge", desc: "Ihre Betreuungsbereiche" },
          { icon: "⚡", title: "Kapazität", desc: "Wie viele Arbeiten Sie betreuen" },
        ].map((item) => (
          <div key={item.title} className="bg-gray-50 rounded-xl p-4 text-center space-y-1">
            <div className="text-2xl">{item.icon}</div>
            <div className="font-semibold text-sm text-gray-800">{item.title}</div>
            <div className="text-xs text-gray-500">{item.desc}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-center text-gray-400">
        Die Einrichtung dauert ca. 3–5 Minuten. Sie können alle Angaben später jederzeit ändern.
      </p>
      <button
        onClick={onNext}
        className="w-full py-3 rounded-xl text-white font-semibold text-base transition-all hover:opacity-90"
        style={{ backgroundColor: "#76B900" }}
      >
        Einrichtung starten →
      </button>
    </div>
  );
}

// ─── Schritt 2: Profildaten ───────────────────────────────────────────────────
interface ProfileData {
  title: string;
  department: string;
  bio: string;
  researchFocus: string;
  officeHours: string;
  websiteUrl: string;
  phone: string;
  languages: string[];
}

function Step2Profile({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: ProfileData;
  onChange: (d: Partial<ProfileData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const toggleLang = (lang: string) => {
    const next = data.languages.includes(lang)
      ? data.languages.filter((l) => l !== lang)
      : [...data.languages, lang];
    onChange({ languages: next });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Profildaten</h2>
        <p className="text-sm text-gray-500 mt-1">Diese Informationen sind für Studierende sichtbar.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Akademischer Titel</label>
          <input
            type="text"
            value={data.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="z.B. Prof. Dr."
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#76B900]/30"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Fachbereich / Abteilung</label>
          <input
            type="text"
            value={data.department}
            onChange={(e) => onChange({ department: e.target.value })}
            placeholder="z.B. Fachbereich 3 – Wirtschaft"
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#76B900]/30"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Kurzbiografie <span className="text-gray-400 font-normal">(optional)</span></label>
        <textarea
          value={data.bio}
          onChange={(e) => onChange({ bio: e.target.value })}
          rows={3}
          placeholder="Kurze Beschreibung Ihrer Tätigkeit und Expertise…"
          className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#76B900]/30 resize-none"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Forschungsschwerpunkte <span className="text-gray-400 font-normal">(optional)</span></label>
        <input
          type="text"
          value={data.researchFocus}
          onChange={(e) => onChange({ researchFocus: e.target.value })}
          placeholder="z.B. Controlling, Unternehmensführung, Digitalisierung"
          className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#76B900]/30"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Sprechstunden <span className="text-gray-400 font-normal">(optional)</span></label>
          <input
            type="text"
            value={data.officeHours}
            onChange={(e) => onChange({ officeHours: e.target.value })}
            placeholder="z.B. Di 14–16 Uhr, Raum C 123"
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#76B900]/30"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Telefon <span className="text-gray-400 font-normal">(optional)</span></label>
          <input
            type="tel"
            value={data.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder="z.B. +49 30 5019-XXXX"
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#76B900]/30"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-2">Betreuungssprachen</label>
        <div className="flex flex-wrap gap-2">
          {LANGUAGE_OPTIONS.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => toggleLang(lang)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all
                ${data.languages.includes(lang) ? "border-[#76B900] bg-[#76B900]/10 text-[#76B900]" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-all">
          ← Zurück
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90"
          style={{ backgroundColor: "#76B900" }}
        >
          Weiter →
        </button>
      </div>
    </div>
  );
}

// ─── Schritt 3: Foto ─────────────────────────────────────────────────────────
function Step3Photo({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const handleFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Das Foto darf maximal 5 MB groß sein.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    // Upload via fetch (multipart)
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch("/api/upload/photo", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? "Upload fehlgeschlagen");
      }
      toast.success("Foto erfolgreich hochgeladen.");
    } catch {
      toast.error("Foto-Upload fehlgeschlagen. Sie können es später im Profil nachholen.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Profilfoto</h2>
        <p className="text-sm text-gray-500 mt-1">Ein Foto erhöht das Vertrauen bei Studierenden. <span className="text-gray-400">(Optional – max. 5 MB, JPG/PNG)</span></p>
      </div>
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-32 h-32 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-[#76B900] transition-colors overflow-hidden bg-gray-50"
          onClick={() => fileRef.current?.click()}
        >
          {preview ? (
            <img src={preview} alt="Vorschau" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center text-gray-400 text-xs p-4">
              <svg className="w-8 h-8 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Foto hochladen
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        {uploading && <p className="text-xs text-[#76B900] animate-pulse">Wird hochgeladen…</p>}
        {preview && (
          <button
            type="button"
            onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
            className="text-xs text-red-400 hover:text-red-600 transition-colors"
          >
            Foto entfernen
          </button>
        )}
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-all">
          ← Zurück
        </button>
        <button
          onClick={onNext}
          disabled={uploading}
          className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "#76B900" }}
        >
          {uploading ? "Hochladen…" : "Weiter →"}
        </button>
      </div>
    </div>
  );
}

// ─── Schritt 4: Studiengänge ──────────────────────────────────────────────────

/** Einzelne Kachel mit Skeleton-Loader für das Piktogramm */
function ProgrammeTile({
  p,
  isSelected,
  onToggle,
}: {
  p: { id: number; name: string; abbreviation: string; pictogramUrl: string | null };
  isSelected: boolean;
  onToggle: () => void;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onToggle}
            className={`relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all text-center
              ${isSelected ? "border-[#76B900] bg-[#76B900]/5" : "border-gray-200 hover:border-[#76B900]/40"}`}
          >
            {isSelected && (
              <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#76B900] flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {/* Feste Größe w-14 h-14 hält das Layout stabil */}
            <div className="relative w-14 h-14 flex-shrink-0">
              {p.pictogramUrl && !imgError ? (
                <>
                  {!imgLoaded && (
                    <div className="absolute inset-0 rounded-lg bg-gray-200 animate-pulse" />
                  )}
                  <img
                    src={p.pictogramUrl}
                    alt={p.name}
                    className={`w-14 h-14 object-contain transition-opacity duration-300 ${
                      imgLoaded ? "opacity-100" : "opacity-0"
                    }`}
                    onLoad={() => setImgLoaded(true)}
                    onError={() => setImgError(true)}
                  />
                </>
              ) : (
                <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs font-bold">
                  {p.abbreviation}
                </div>
              )}
            </div>
            <div className="text-xs font-bold text-[#76B900]">{p.abbreviation}</div>
            <div className="text-xs text-gray-500 leading-tight">{p.name}</div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-center text-sm font-medium">
          {p.name}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function Step4Programmes({
  selected,
  onChange,
  onNext,
  onBack,
}: {
  selected: number[];
  onChange: (ids: number[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { data: programmes, isLoading } = trpc.programmes.list.useQuery();

  const toggle = (id: number) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const bachelor = (programmes ?? []).filter((p) => p.level === "bachelor");
  const master = (programmes ?? []).filter((p) => p.level === "master");

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Studiengänge</h2>
        <p className="text-sm text-gray-500 mt-1">
          Wählen Sie alle Studiengänge, in denen Sie Abschlussarbeiten betreuen möchten.
          {selected.length > 0 && <span className="ml-2 text-[#76B900] font-semibold">{selected.length} ausgewählt</span>}
        </p>
      </div>
      {isLoading ? (
        /* Skeleton-Grid während die Liste vom Server geladen wird */
        <div className="space-y-5">
          {["Bachelor", "Master"].map((label) => (
            <div key={label}>
              <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-3" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 border-gray-100">
                    <div className="w-14 h-14 rounded-lg bg-gray-200 animate-pulse" />
                    <div className="h-3 w-10 bg-gray-200 rounded animate-pulse" />
                    <div className="h-2.5 w-16 bg-gray-100 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-5 max-h-80 overflow-y-auto pr-1">
          {[{ label: "Bachelor", items: bachelor }, { label: "Master", items: master }].map(({ label, items }) => (
            <div key={label}>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">{label}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {items.map((p) => (
                  <ProgrammeTile
                    key={p.id}
                    p={p}
                    isSelected={selected.includes(p.id)}
                    onToggle={() => toggle(p.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-all">
          ← Zurück
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90"
          style={{ backgroundColor: "#76B900" }}
        >
          Weiter →
        </button>
      </div>
    </div>
  );
}

// ─── Schritt 5: Kapazität & Abschluss ────────────────────────────────────────
function Step5Capacity({
  maxSupervisions,
  isSecondExaminer,
  alternativeEmail,
  onChangeMax,
  onChangeSecond,
  onChangeAltEmail,
  onFinish,
  onBack,
  isPending,
}: {
  maxSupervisions: number;
  isSecondExaminer: boolean | null;
  alternativeEmail: string;
  onChangeMax: (v: number) => void;
  onChangeSecond: (v: boolean) => void;
  onChangeAltEmail: (v: string) => void;
  onFinish: () => void;
  onBack: () => void;
  isPending: boolean;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Kapazität & Prüfer:innen-Typ</h2>
        <p className="text-sm text-gray-500 mt-1">Legen Sie fest, wie viele Arbeiten Sie betreuen können und welche Rolle Sie übernehmen.</p>
      </div>
      {/* Kapazität */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-2">
          Maximale Betreuungskapazität: <span className="text-[#76B900] font-bold">{maxSupervisions}</span>
        </label>
        <input
          type="range"
          min={1}
          max={15}
          value={maxSupervisions}
          onChange={(e) => onChangeMax(Number(e.target.value))}
          className="w-full accent-[#76B900]"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>1</span><span>5</span><span>10</span><span>15</span>
        </div>
      </div>
      {/* Prüfer:innen-Typ */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-2">Prüfer:innen-Typ <span className="text-red-400">*</span></label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: false, label: "Erstprüfer:in", sub: "HTW-Berlin-Lehrperson (@htw-berlin.de / @htw-berlin.com)", icon: "🎓" },
            { value: true, label: "Zweitprüfer:in", sub: "Externe Fachperson (beliebige E-Mail)", icon: "👥" },
          ].map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => onChangeSecond(opt.value)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                ${isSecondExaminer === opt.value ? "border-[#76B900] bg-[#76B900]/5 text-[#76B900]" : "border-gray-200 hover:border-gray-300 text-gray-600"}`}
            >
              <span className="text-2xl">{opt.icon}</span>
              <span className="text-sm font-semibold">{opt.label}</span>
              <span className="text-xs text-center opacity-70">{opt.sub}</span>
            </button>
          ))}
        </div>
      </div>
      {/* Alternative E-Mail (nur für Zweitprüfer:innen) */}
      {isSecondExaminer === true && (
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Alternative E-Mail-Adresse <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="email"
            value={alternativeEmail}
            onChange={(e) => onChangeAltEmail(e.target.value)}
            placeholder="z.B. vorname.nachname@extern.de"
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#76B900]/30"
          />
          <p className="text-xs text-gray-400 mt-1">E-Mail-Adresse für Benachrichtigungen (ersetzt die Anmelde-E-Mail).</p>
        </div>
      )}
      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-all">
          ← Zurück
        </button>
        <button
          onClick={onFinish}
          disabled={isSecondExaminer === null || isPending}
          className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-40"
          style={{ backgroundColor: "#76B900" }}
        >
          {isPending ? "Wird gespeichert…" : "Profil abschließen ✓"}
        </button>
      </div>
    </div>
  );
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────
export default function ExaminerOnboarding() {
  const [, navigate] = useLocation();
  const { t } = useLanguage();
  const STEPS = [
    { id: 1, label: t.onboarding.step1 },
    { id: 2, label: t.onboarding.step2 },
    { id: 3, label: t.onboarding.step3 },
    { id: 4, label: t.onboarding.step4 },
    { id: 5, label: t.onboarding.step5 },
  ];
  const [step, setStep] = useState<Step>(1);

  // Profildaten
  const [profile, setProfile] = useState<ProfileData>({
    title: "",
    department: "",
    bio: "",
    researchFocus: "",
    officeHours: "",
    websiteUrl: "",
    phone: "",
    languages: ["Deutsch"],
  });
  const [programmeIds, setProgrammeIds] = useState<number[]>([]);
  const [maxSupervisions, setMaxSupervisions] = useState(5);
  const [isSecondExaminer, setIsSecondExaminer] = useState<boolean | null>(null);
  const [alternativeEmail, setAlternativeEmail] = useState("");

  const utils = trpc.useUtils();
  const completeOnboarding = trpc.examiner.completeOnboarding.useMutation({
    onSuccess: () => {
      utils.examiner.myProfile.invalidate();
      toast.success("Profil erfolgreich eingerichtet – willkommen!");
      navigate("/examiner");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleFinish = () => {
    if (isSecondExaminer === null) {
      toast.error("Bitte wählen Sie Ihren Prüfer:innen-Typ aus.");
      return;
    }
    completeOnboarding.mutate({
      ...profile,
      programmeIds,
      maxSupervisions,
      isSecondExaminer,
      alternativeEmail: alternativeEmail || null,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fdf5] via-white to-[#f0f7ff] flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src="/manus-storage/IconFemaleFemale_210f65cb.webp" alt="HTW Berlin" className="w-8 h-8 object-contain" />
            <span className="text-sm font-bold text-[#76B900]">HTW Berlin · Thesis Match Maker</span>
          </div>
          <p className="text-xs text-gray-400">Prüfer:innen-Profil einrichten</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
          <StepBar current={step} steps={STEPS} />

          {step === 1 && <Step1Welcome onNext={() => setStep(2)} />}
          {step === 2 && (
            <Step2Profile
              data={profile}
              onChange={(d) => setProfile((p) => ({ ...p, ...d }))}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <Step3Photo
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          )}
          {step === 4 && (
            <Step4Programmes
              selected={programmeIds}
              onChange={setProgrammeIds}
              onNext={() => setStep(5)}
              onBack={() => setStep(3)}
            />
          )}
          {step === 5 && (
            <Step5Capacity
              maxSupervisions={maxSupervisions}
              isSecondExaminer={isSecondExaminer}
              alternativeEmail={alternativeEmail}
              onChangeMax={setMaxSupervisions}
              onChangeSecond={setIsSecondExaminer}
              onChangeAltEmail={setAlternativeEmail}
              onFinish={handleFinish}
              onBack={() => setStep(4)}
              isPending={completeOnboarding.isPending}
            />
          )}
        </div>

        {/* Überspringen */}
        <div className="text-center mt-4">
          <button
            onClick={() => navigate("/examiner")}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors underline"
          >
            Einrichtung überspringen (später im Profil nachholen)
          </button>
        </div>
      </div>
    </div>
  );
}
