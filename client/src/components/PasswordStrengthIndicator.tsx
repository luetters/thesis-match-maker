import { CheckCircle2, CircleAlert } from "lucide-react";
import { getPasswordStrength, PASSWORD_MIN_LENGTH } from "@shared/passwordPolicy";

type PasswordStrengthIndicatorProps = {
  password: string;
  lang: "de" | "en";
  dark?: boolean;
};

const LABELS = {
  de: ["Sehr schwach", "Schwach", "Ausreichend", "Gut", "Stark"],
  en: ["Very weak", "Weak", "Adequate", "Good", "Strong"],
};

const COLORS = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#76b900"];

export function PasswordStrengthIndicator({ password, lang, dark = false }: PasswordStrengthIndicatorProps) {
  const strength = getPasswordStrength(password);
  const textColor = dark ? "text-white/75" : "text-gray-700";
  const mutedColor = dark ? "text-white/50" : "text-gray-500";
  const panel = dark ? "bg-white/[0.045] border-white/10" : "bg-gray-50 border-gray-200";

  if (!password) return null;

  return (
    <div className={`rounded-xl border p-3 ${panel}`} aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <span className={`text-xs font-semibold ${textColor}`}>
          {lang === "de" ? "Passwortstärke" : "Password strength"}
        </span>
        <span className="text-xs font-semibold" style={{ color: COLORS[strength.score] }}>
          {LABELS[lang][strength.score]}
        </span>
      </div>
      <div
        className="mt-2 grid grid-cols-4 gap-1"
        role="progressbar"
        aria-label={lang === "de" ? `Passwortstärke: ${LABELS.de[strength.score]}` : `Password strength: ${LABELS.en[strength.score]}`}
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={strength.score}
      >
        {[1, 2, 3, 4].map((segment) => (
          <span
            key={segment}
            className="h-1.5 rounded-full"
            style={{ backgroundColor: segment <= strength.score ? COLORS[strength.score] : (dark ? "rgba(255,255,255,0.12)" : "#e5e7eb") }}
          />
        ))}
      </div>
      <div className={`mt-2 space-y-1 text-xs ${mutedColor}`}>
        <p className="flex items-start gap-1.5">
          {strength.hasMinimumLength ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#76b900]" /> : <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-400" />}
          {lang === "de" ? `Mindestens ${PASSWORD_MIN_LENGTH} Zeichen` : `At least ${PASSWORD_MIN_LENGTH} characters`}
        </p>
        <p className="flex items-start gap-1.5">
          {strength.hasRequiredVariety ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#76b900]" /> : <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-400" />}
          {lang === "de" ? "Mindestens drei Zeichengruppen: Klein-/Großbuchstaben, Ziffern, Sonderzeichen" : "At least three character groups: lower/upper case, digits, symbols"}
        </p>
      </div>
    </div>
  );
}
