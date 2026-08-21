type ProfileLike = Record<string, unknown>;

type CompletionItem = {
  key: string;
  labelDe: string;
  labelEn: string;
  completed: boolean;
  benefitDe: string;
  benefitEn: string;
};

const hasText = (value: unknown) => typeof value === "string" && value.trim().length > 0;

function getItems(profile: ProfileLike, role: string): CompletionItem[] {
  const base: CompletionItem[] = [
    { key: "name", labelDe: "Name", labelEn: "Name", completed: hasText(profile.name) || (hasText(profile.firstName) && hasText(profile.lastName)), benefitDe: "für eine klare Zuordnung im Portal", benefitEn: "for clear identification in the portal" },
    { key: "language", labelDe: "Kommunikationssprache", labelEn: "Communication language", completed: hasText(profile.preferredLanguage), benefitDe: "für verständliche Systemnachrichten", benefitEn: "for understandable system messages" },
  ];

  if (role === "student") {
    return [
      ...base,
      { key: "department", labelDe: "Fachbereich", labelEn: "Department", completed: hasText(profile.department), benefitDe: "für die richtige Zuständigkeit", benefitEn: "for the correct administrative responsibility" },
      { key: "matrikel", labelDe: "Matrikelnummer", labelEn: "Matriculation number", completed: hasText(profile.matrikelNr), benefitDe: "für die eindeutige Prüfungszuordnung", benefitEn: "for unambiguous examination assignment" },
    ];
  }

  if (role === "admin" || role === "superadmin" || role === "pav" || role === "dean") {
    return [
      ...base,
      { key: "department", labelDe: "Fachbereich", labelEn: "Department", completed: hasText(profile.department), benefitDe: "für klar abgegrenzte Zuständigkeiten", benefitEn: "for clearly defined responsibilities" },
      { key: "responsibility", labelDe: "Zuständigkeitsbereich", labelEn: "Area of responsibility", completed: hasText(profile.responsibilityArea), benefitDe: "für transparente Aufgabenverteilung", benefitEn: "for transparent task allocation" },
    ];
  }

  return [
    ...base,
    { key: "department", labelDe: "Fachbereich", labelEn: "Department", completed: hasText(profile.department), benefitDe: "damit passende Anfragen sichtbar werden", benefitEn: "so relevant requests are visible" },
    { key: "title", labelDe: "Akademischer Titel", labelEn: "Academic title", completed: hasText(profile.academicTitle), benefitDe: "für eine korrekte Ansprache", benefitEn: "for an appropriate form of address" },
    { key: "bio", labelDe: "Kurzprofil", labelEn: "Short profile", completed: hasText(profile.examinerBio) || hasText(profile.bio), benefitDe: "damit Studierende Ihre Betreuung besser einschätzen können", benefitEn: "so students can better assess your supervision profile" },
    { key: "research", labelDe: "Forschungsschwerpunkte", labelEn: "Research focus", completed: hasText(profile.examinerResearchFocus) || hasText(profile.researchTags), benefitDe: "für passendere Themenanfragen", benefitEn: "for better matched topic requests" },
  ];
}

export function ProfileCompletionCard({ profile, role, language, onEdit }: { profile: ProfileLike; role: string; language: "de" | "en"; onEdit: () => void }) {
  const de = language === "de";
  const items = getItems(profile, role);
  const completed = items.filter((item) => item.completed).length;
  const percent = Math.round((completed / items.length) * 100);
  const next = items.find((item) => !item.completed);

  if (percent === 100) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4" aria-label={de ? "Profil vollständig" : "Profile complete"}>
        <p className="text-sm font-semibold text-emerald-900">{de ? "Ihr Profil ist vollständig." : "Your profile is complete."}</p>
        <p className="mt-1 text-sm text-emerald-800">{de ? "Vielen Dank. Ihre Angaben unterstützen klare Abläufe im Thesis Match Maker." : "Thank you. Your details support clear processes in Thesis Match Maker."}</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[#b8e77a] bg-[#f8ffeb] p-5" aria-labelledby="profile-completion-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p id="profile-completion-title" className="text-sm font-semibold text-[#3f6200]">{de ? "Ihr Profil Schritt für Schritt vervollständigen" : "Complete your profile step by step"}</p>
          <p className="mt-1 text-sm text-gray-700">{de ? "Alle Ergänzungen sind freiwillig. Sie entscheiden selbst, welche Angaben Sie im Portal hinterlegen möchten." : "All additions are voluntary. You decide which details you want to provide in the portal."}</p>
        </div>
        <span className="inline-flex shrink-0 items-center rounded-full bg-white px-3 py-1.5 text-sm font-bold text-[#4f7800] ring-1 ring-[#cce99d]">{percent}%</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e3f4c5]" aria-hidden="true"><div className="h-full rounded-full bg-[#76b900] transition-[width]" style={{ width: `${percent}%` }} /></div>
      <p className="mt-2 text-xs text-gray-600">{de ? `${completed} von ${items.length} sinnvollen Angaben vorhanden` : `${completed} of ${items.length} helpful details available`}</p>
      {next && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-white bg-white/85 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-800"><span className="font-semibold">{de ? "Nächster sinnvoller Schritt:" : "Suggested next step:"}</span> {de ? next.labelDe : next.labelEn} – {de ? next.benefitDe : next.benefitEn}.</p>
          <button type="button" onClick={onEdit} className="shrink-0 rounded-lg bg-[#76b900] px-3 py-2 text-sm font-semibold text-white hover:bg-[#5e9200] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3f6200]">{de ? "Profil ergänzen" : "Complete profile"}</button>
        </div>
      )}
    </section>
  );
}
