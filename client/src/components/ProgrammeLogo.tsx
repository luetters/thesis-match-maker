/**
 * ProgrammeLogo – Einheitliche Studiengang-Logo-Komponente mit Fallback.
 *
 * Zeigt das Piktogramm eines Studiengangs. Falls das Bild nicht geladen
 * werden kann (fehlerhafter URL, Netzwerkfehler, gelöschte Datei), wird
 * automatisch ein Fallback-Icon mit dem Kürzel angezeigt.
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

const SIZE_MAP: Record<ProgrammeLogoSize, { container: string; text: string }> = {
  xs: { container: "w-4 h-4",  text: "text-[8px]" },
  sm: { container: "w-5 h-5",  text: "text-[9px]" },
  md: { container: "w-7 h-7",  text: "text-[10px]" },
  lg: { container: "w-9 h-9",  text: "text-xs" },
  xl: { container: "w-14 h-14", text: "text-sm" },
};

/**
 * Fallback-SVG-Icon: stilisiertes Buch-Piktogramm in HTW-Grün.
 * Wird angezeigt wenn kein Bild vorhanden ist oder das Laden fehlschlägt.
 */
function FallbackIcon({ size }: { size: ProgrammeLogoSize }) {
  const { container, text } = SIZE_MAP[size];
  return (
    <span
      className={`${container} rounded bg-[#f0f7e6] flex items-center justify-center flex-shrink-0`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#76B900"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`${text} w-[65%] h-[65%]`}
      >
        {/* Buch-Icon */}
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
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
  const { container } = SIZE_MAP[size];

  // Fehler-State zurücksetzen wenn sich die URL ändert (z.B. nach Upload)
  useEffect(() => {
    setImgError(false);
  }, [pictogramUrl]);

  if (pictogramUrl && !imgError) {
    return (
      <img
        src={pictogramUrl}
        alt={abbreviation}
        className={`${container} object-contain flex-shrink-0 ${className}`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <span className={className}>
      <FallbackIcon size={size} />
    </span>
  );
}
