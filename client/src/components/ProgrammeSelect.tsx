/**
 * ProgrammeSelect – Benutzerdefiniertes Dropdown mit Studiengangs-Piktogrammen
 * Ersetzt native <select>-Elemente, um Bilder in den Optionen anzuzeigen.
 * Mobile-optimiert: vergrößerte Touch-Flächen, Bottom-Sheet auf kleinen Bildschirmen.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Check, X } from "lucide-react";

export interface ProgrammeOption {
  id: number;
  name: string;
  abbreviation: string;
  level?: string;
  pictogramUrl?: string | null;
}

interface ProgrammeSelectProps {
  options: ProgrammeOption[];
  value: number | string | "";
  onChange: (value: number | "") => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  /** Wenn true, werden Optionen nach Bachelor/Master gruppiert */
  grouped?: boolean;
  /** Label für den Bottom-Sheet-Header auf Mobilgeräten */
  label?: string;
}

function ProgrammeIcon({
  programme,
  size = "sm",
}: {
  programme: ProgrammeOption;
  size?: "sm" | "md" | "lg";
}) {
  const [imgError, setImgError] = useState(false);
  const dim =
    size === "lg" ? "w-8 h-8" : size === "md" ? "w-6 h-6" : "w-5 h-5";

  if (programme.pictogramUrl && !imgError) {
    return (
      <img
        src={programme.pictogramUrl}
        alt={programme.abbreviation}
        className={`${dim} object-contain flex-shrink-0`}
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <span
      className={`${dim} rounded bg-gray-100 flex items-center justify-center text-[9px] font-bold text-gray-500 flex-shrink-0`}
    >
      {programme.abbreviation?.slice(0, 3)}
    </span>
  );
}

export function ProgrammeSelect({
  options,
  value,
  onChange,
  placeholder = "Bitte wählen",
  required,
  disabled,
  error,
  className = "",
  grouped = false,
  label,
}: ProgrammeSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.id === value) ?? null;

  // Erkennen ob Mobilgerät (Viewport < 640px)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Schließen bei Klick außerhalb (nur Desktop)
  useEffect(() => {
    if (isMobile) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isMobile]);

  // Body-Scroll sperren wenn Bottom-Sheet offen
  useEffect(() => {
    if (isMobile && open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isMobile, open]);

  // Keyboard-Navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") setOpen(false);
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen((v) => !v);
    }
  }

  const handleSelect = useCallback((id: number | "") => {
    onChange(id);
    setOpen(false);
  }, [onChange]);

  const bachelorOptions = grouped ? options.filter((o) => o.level === "bachelor") : [];
  const masterOptions = grouped ? options.filter((o) => o.level === "master") : [];

  // Option-Zeile – auf Mobilgeräten größere Touch-Fläche (py-3.5 statt py-2)
  function renderOption(o: ProgrammeOption) {
    const isSelected = o.id === value;
    return (
      <button
        key={o.id}
        type="button"
        role="option"
        aria-selected={isSelected}
        onClick={() => handleSelect(o.id)}
        className={`w-full flex items-center gap-3 px-4 text-sm transition-colors text-left active:bg-gray-100
          ${isMobile ? "py-3.5 min-h-[52px]" : "py-2 hover:bg-gray-50"}
          ${isSelected ? "bg-[#76B900]/5" : ""}
        `}
      >
        <ProgrammeIcon programme={o} size={isMobile ? "md" : "sm"} />
        <span className="flex-1 min-w-0">
          <span className="font-semibold text-gray-900">{o.abbreviation}</span>
          <span className={`text-gray-500 ml-1.5 ${isMobile ? "text-xs block mt-0.5" : "truncate"}`}>
            {o.name}
          </span>
        </span>
        {isSelected && (
          <Check className={`text-[#76B900] flex-shrink-0 ${isMobile ? "w-5 h-5" : "w-4 h-4"}`} />
        )}
      </button>
    );
  }

  // Leer-Option
  const emptyOption = !required ? (
    <button
      type="button"
      onClick={() => handleSelect("")}
      className={`w-full flex items-center gap-3 px-4 text-sm transition-colors text-left active:bg-gray-100
        ${isMobile ? "py-3.5 min-h-[52px]" : "py-2 hover:bg-gray-50"}
        ${value === "" ? "bg-[#76B900]/5" : ""}
      `}
    >
      <span className={`flex-shrink-0 ${isMobile ? "w-6 h-6" : "w-5 h-5"}`} />
      <span className="text-gray-400 flex-1">{placeholder}</span>
      {value === "" && (
        <Check className={`text-[#76B900] flex-shrink-0 ${isMobile ? "w-5 h-5" : "w-4 h-4"}`} />
      )}
    </button>
  ) : null;

  // Gruppen-Header
  function groupHeader(label: string) {
    return (
      <div className={`px-4 font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 border-b border-gray-100
        ${isMobile ? "py-2 text-xs" : "py-1.5 text-xs"}
      `}>
        {label}
      </div>
    );
  }

  const listContent = (
    <>
      {emptyOption}
      {grouped ? (
        <>
          {bachelorOptions.length > 0 && (
            <>{groupHeader("Bachelor")}{bachelorOptions.map(renderOption)}</>
          )}
          {masterOptions.length > 0 && (
            <>{groupHeader("Master")}{masterOptions.map(renderOption)}</>
          )}
        </>
      ) : (
        options.map(renderOption)
      )}
      {options.length === 0 && (
        <div className="px-4 py-6 text-sm text-gray-400 text-center">
          Keine Studiengänge verfügbar
        </div>
      )}
    </>
  );

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* ── Trigger-Button ── */}
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onKeyDown={handleKeyDown}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`w-full flex items-center gap-2.5 border rounded-xl text-sm text-left transition-all bg-white focus:outline-none focus:ring-2 focus:ring-[#76B900]/30
          ${isMobile ? "px-4 py-3.5 min-h-[52px]" : "px-3.5 py-2.5"}
          ${error ? "border-red-400" : open ? "border-[#76B900]" : "border-gray-200 hover:border-gray-300"}
          ${disabled ? "opacity-60 cursor-not-allowed bg-gray-50" : "cursor-pointer"}
        `}
      >
        {selected ? (
          <>
            <ProgrammeIcon programme={selected} size={isMobile ? "md" : "sm"} />
            <span className="flex-1 min-w-0">
              <span className="font-semibold text-gray-900">{selected.abbreviation}</span>
              <span className={`text-gray-500 ml-1.5 ${isMobile ? "text-xs" : ""}`}>
                {selected.name}
              </span>
            </span>
          </>
        ) : (
          <span className="flex-1 text-gray-400">{placeholder}</span>
        )}
        <ChevronDown
          className={`text-gray-400 flex-shrink-0 transition-transform duration-200
            ${isMobile ? "w-5 h-5" : "w-4 h-4"}
            ${open ? "rotate-180" : ""}
          `}
        />
      </button>

      {/* ── Desktop: klassisches Dropdown ── */}
      {!isMobile && open && (
        <div
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
          style={{ maxHeight: "260px", overflowY: "auto" }}
        >
          {listContent}
        </div>
      )}

      {/* ── Mobile: Bottom-Sheet mit Overlay ── */}
      {isMobile && open && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          {/* Sheet */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label={label ?? placeholder}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl"
            style={{ maxHeight: "80dvh", display: "flex", flexDirection: "column" }}
          >
            {/* Sheet-Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <span className="font-semibold text-gray-900 text-base">
                {label ?? placeholder}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 -mr-1 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
                aria-label="Schließen"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            {/* Scrollbare Liste */}
            <div
              ref={listRef}
              role="listbox"
              className="overflow-y-auto overscroll-contain flex-1"
              style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
            >
              {listContent}
            </div>
            {/* Safe-Area-Abstand für iOS */}
            <div className="flex-shrink-0" style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }} />
          </div>
        </>
      )}
    </div>
  );
}
