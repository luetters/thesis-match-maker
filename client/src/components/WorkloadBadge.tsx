/**
 * WorkloadBadge – zeigt die Auslastung einer Prüfer:in als farbiges Badge an.
 *
 * Stufen:
 *  - Verfügbar   (< 50 % belegt)  → grün
 *  - Teilweise   (50–79 % belegt) → amber
 *  - Ausgelastet (≥ 80 % belegt)  → rot
 *  - Unbekannt   (keine Daten)    → grau
 */

export type WorkloadLevel = "available" | "partial" | "full" | "unknown";

export function getWorkloadLevel(
  active: number | null | undefined,
  max: number | null | undefined
): WorkloadLevel {
  if (max == null || max <= 0) return "unknown";
  if (active == null) return "unknown";
  const ratio = active / max;
  if (ratio < 0.5) return "available";
  if (ratio < 0.8) return "partial";
  return "full";
}

const LEVEL_CONFIG: Record<
  WorkloadLevel,
  { label: string; className: string; dot: string }
> = {
  available: {
    label: "Verfügbar",
    className: "bg-primary/10 text-primary border border-primary/20",
    dot: "bg-primary",
  },
  partial: {
    label: "Teilweise belegt",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
    dot: "bg-amber-500",
  },
  full: {
    label: "Ausgelastet",
    className: "bg-red-50 text-red-700 border border-red-200",
    dot: "bg-red-500",
  },
  unknown: {
    label: "Keine Angabe",
    className: "bg-gray-50 text-gray-500 border border-gray-200",
    dot: "bg-gray-400",
  },
};

interface WorkloadBadgeProps {
  active?: number | null;
  max?: number | null;
  /** Wenn true, wird zusätzlich "X / Y" angezeigt */
  showCount?: boolean;
  /** Kompaktmodus: nur Punkt + Kurztext */
  compact?: boolean;
  className?: string;
}

export function WorkloadBadge({
  active,
  max,
  showCount = false,
  compact = false,
  className = "",
}: WorkloadBadgeProps) {
  const level = getWorkloadLevel(active, max);
  const cfg = LEVEL_CONFIG[level];

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className} ${className}`}
        title={showCount && max ? `${active ?? 0} / ${max} Betreuungen` : cfg.label}
      >
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
        {cfg.label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.className} ${className}`}
    >
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
      {showCount && max != null && (
        <span className="opacity-70 font-normal">
          ({active ?? 0}/{max})
        </span>
      )}
    </span>
  );
}
