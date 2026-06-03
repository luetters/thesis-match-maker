/**
 * ProgrammeLogo – Einheitliche Studiengang-Logo-Komponente mit Fallback.
 *
 * Zeigt das Piktogramm eines Studiengangs. Falls das Bild nicht geladen
 * werden kann (fehlerhafter URL, Netzwerkfehler, gelöschte Datei), wird
 * automatisch ein Fallback-Icon mit dem Kürzel des Studiengangs angezeigt.
 *
 * Verwendung:
 *   <ProgrammeLogo abbreviation="BWL" pictogramUrl={prog.pictogramUrl} size="md" />
 */
import { useState, useEffect } from "react";

export type ProgrammeLogoSize = "xs" | "sm" | "md" | "lg" | "xl";

interface ProgrammeLogoProps {
  abbreviation: string;
  pictogramUrl?: string | null;
  /** Größe des Logos. Voreinstellung: "md" */
  size?: ProgrammeLogoSize;
  className?: string;
}

const SIZE_MAP: Record<
  ProgrammeLogoSize,
  { container: string; text: string; radius: string }
> = {
  xs: { container: "w-4 h-4",   text: "text-[7px]",  radius: "rounded" },
  sm: { container: "w-5 h-5",   text: "text-[8px]",  radius: "rounded" },
  md: { container: "w-7 h-7",   text: "text-[9px]",  radius: "rounded-md" },
  lg: { container: "w-9 h-9",   text: "text-[11px]", radius: "rounded-lg" },
  xl: { container: "w-14 h-14", text: "text-sm",     radius: "rounded-xl" },
};

/**
 * Deterministische Farbe aus dem Kürzel ableiten – immer konsistent
 * für denselben Studiengang.
 */
function getColorFromAbbreviation(abbr: string): {
  bg: string;
  border: string;
  text: string;
} {
  const palette: Array<{ bg: string; border: string; text: string }> = [
    { bg: "#e8f5d0", border: "#76B900", text: "#4a7400" },  // HTW-Grün
    { bg: "#dbeafe", border: "#3b82f6", text: "#1d4ed8" },  // Blau
    { bg: "#fce7f3", border: "#ec4899", text: "#be185d" },  // Pink
    { bg: "#ede9fe", border: "#8b5cf6", text: "#6d28d9" },  // Violett
    { bg: "#fef3c7", border: "#f59e0b", text: "#b45309" },  // Amber
    { bg: "#d1fae5", border: "#10b981", text: "#065f46" },  // Smaragd
    { bg: "#fee2e2", border: "#ef4444", text: "#b91c1c" },  // Rot
    { bg: "#e0f2fe", border: "#0ea5e9", text: "#0369a1" },  // Hellblau
  ];
  // Hash aus dem Kürzel berechnen
  let hash = 0;
  for (let i = 0; i < abbr.length; i++) {
    hash = (hash * 31 + abbr.charCodeAt(i)) & 0xffff;
  }
  return palette[hash % palette.length];
}

/**
 * Fallback-Icon: Zeigt das Kürzel des Studiengangs in einem farbigen,
 * abgerundeten Quadrat – konsistente Farbe pro Kürzel.
 */
function FallbackIcon({
  abbreviation,
  size,
}: {
  abbreviation: string;
  size: ProgrammeLogoSize;
}) {
  const { container, text, radius } = SIZE_MAP[size];
  const colors = getColorFromAbbreviation(abbreviation);
  // Kürzel auf max. 4 Zeichen kürzen für kleine Größen
  const maxChars = size === "xs" || size === "sm" ? 3 : 4;
  const label = abbreviation.length > maxChars
    ? abbreviation.slice(0, maxChars)
    : abbreviation;

  return (
    <span
      className={`${container} ${radius} flex items-center justify-center flex-shrink-0 select-none font-bold leading-none`}
      style={{
        background: colors.bg,
        border: `1.5px solid ${colors.border}`,
        color: colors.text,
      }}
      aria-label={abbreviation}
      title={abbreviation}
    >
      <span className={`${text} font-bold tracking-tight`}>{label}</span>
    </span>
  );
}

export function ProgrammeLogo({
  abbreviation,
  pictogramUrl,
  size = "md",
  className = "",
}: ProgrammeLogoProps) {
  const [imgError, setImgError] = useState(false);
  const { container, radius } = SIZE_MAP[size];

  // Fehler-State zurücksetzen wenn sich die URL ändert (z.B. nach Upload)
  useEffect(() => {
    setImgError(false);
  }, [pictogramUrl]);

  if (pictogramUrl && !imgError) {
    return (
      <img
        src={pictogramUrl}
        alt={abbreviation}
        className={`${container} ${radius} object-contain flex-shrink-0 ${className}`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <span className={className}>
      <FallbackIcon abbreviation={abbreviation} size={size} />
    </span>
  );
}
