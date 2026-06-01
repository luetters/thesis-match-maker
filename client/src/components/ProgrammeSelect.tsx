/**
 * ProgrammeSelect – Benutzerdefiniertes Dropdown mit Studiengangs-Piktogrammen
 * Ersetzt native <select>-Elemente, um Bilder in den Optionen anzuzeigen.
 */
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

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
}

function ProgrammeIcon({
  programme,
  size = "sm",
}: {
  programme: ProgrammeOption;
  size?: "sm" | "md";
}) {
  const [imgError, setImgError] = useState(false);
  const dim = size === "sm" ? "w-5 h-5" : "w-7 h-7";

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
}: ProgrammeSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.id === value) ?? null;

  // Schließen bei Klick außerhalb
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Keyboard-Navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") setOpen(false);
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen((v) => !v);
    }
  }

  const bachelorOptions = grouped ? options.filter((o) => o.level === "bachelor") : [];
  const masterOptions = grouped ? options.filter((o) => o.level === "master") : [];

  function renderOption(o: ProgrammeOption) {
    const isSelected = o.id === value;
    return (
      <button
        key={o.id}
        type="button"
        role="option"
        aria-selected={isSelected}
        onClick={() => {
          onChange(o.id);
          setOpen(false);
        }}
        className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 transition-colors text-left ${
          isSelected ? "bg-[#76B900]/5" : ""
        }`}
      >
        <ProgrammeIcon programme={o} size="sm" />
        <span className="flex-1 min-w-0">
          <span className="font-medium text-gray-900">{o.abbreviation}</span>
          <span className="text-gray-500 ml-1.5 truncate">{o.name}</span>
        </span>
        {isSelected && <Check className="w-4 h-4 text-[#76B900] flex-shrink-0" />}
      </button>
    );
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onKeyDown={handleKeyDown}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 border rounded-xl text-sm text-left transition-all bg-white focus:outline-none focus:ring-2 focus:ring-[#76B900]/30
          ${error ? "border-red-400" : open ? "border-[#76B900]" : "border-gray-200 hover:border-gray-300"}
          ${disabled ? "opacity-60 cursor-not-allowed bg-gray-50" : "cursor-pointer"}
        `}
      >
        {selected ? (
          <>
            <ProgrammeIcon programme={selected} size="sm" />
            <span className="flex-1 min-w-0 truncate">
              <span className="font-medium text-gray-900">{selected.abbreviation}</span>
              <span className="text-gray-500 ml-1.5">{selected.name}</span>
            </span>
          </>
        ) : (
          <span className="flex-1 text-gray-400">{placeholder}</span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown-Liste */}
      {open && (
        <div
          role="listbox"
          className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
          style={{ maxHeight: "260px", overflowY: "auto" }}
        >
          {/* Leer-Option */}
          {!required && (
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 transition-colors text-left ${
                value === "" ? "bg-[#76B900]/5" : ""
              }`}
            >
              <span className="w-5 h-5 flex-shrink-0" />
              <span className="text-gray-400">{placeholder}</span>
              {value === "" && <Check className="w-4 h-4 text-[#76B900] flex-shrink-0 ml-auto" />}
            </button>
          )}

          {grouped ? (
            <>
              {bachelorOptions.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 border-b border-gray-100">
                    Bachelor
                  </div>
                  {bachelorOptions.map(renderOption)}
                </>
              )}
              {masterOptions.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 border-b border-gray-100 mt-1">
                    Master
                  </div>
                  {masterOptions.map(renderOption)}
                </>
              )}
            </>
          ) : (
            options.map(renderOption)
          )}

          {options.length === 0 && (
            <div className="px-3 py-4 text-sm text-gray-400 text-center">
              Keine Studiengänge verfügbar
            </div>
          )}
        </div>
      )}
    </div>
  );
}
