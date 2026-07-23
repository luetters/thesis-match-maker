import { Link } from "wouter";

export type PersonStatus = "zugewiesen" | "angefragt" | "extern" | "ausstehend" | string;

export interface PersonRow {
  role: string;
  name: string;
  contact?: string;
  profileId?: number | null;
  status: PersonStatus;
  /** Optionaler Hinweis in der Kontaktspalte (z.B. Studiengang) */
  note?: string;
}

interface InvolvedPersonsTableProps {
  rows: PersonRow[];
  /** Kompakter Modus: kleinere Schrift, weniger Padding */
  compact?: boolean;
}

const STATUS_COLORS: Record<PersonStatus, { bg: string; text: string; border: string }> = {
  zugewiesen: { bg: "bg-[#76B900]/10", text: "text-[#4a7a00]", border: "border-[#76B900]/30" },
  angefragt:  { bg: "bg-amber-50",     text: "text-amber-700",  border: "border-amber-200"    },
  extern:     { bg: "bg-indigo-50",    text: "text-indigo-700", border: "border-indigo-200"   },
  ausstehend: { bg: "bg-red-50",       text: "text-red-700",    border: "border-red-200"      },
};

function statusColors(status: PersonStatus) {
  return STATUS_COLORS[status] ?? { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" };
}

export function InvolvedPersonsTable({ rows, compact = false }: InvolvedPersonsTableProps) {
  if (rows.length === 0) return null;

  const textSm = compact ? "text-xs" : "text-sm";
  const textXs = compact ? "text-[11px]" : "text-xs";
  const cellPy = compact ? "py-2" : "py-3";

  return (
    <>
      {/* ── Desktop-Tabelle (ab sm) ─────────────────────────────────────── */}
      <div className="hidden sm:block w-full overflow-hidden rounded-xl border border-gray-100 shadow-sm">
        {/* Tabellen-Header */}
        <div
          className="grid gap-0 text-white font-semibold"
          style={{
            gridTemplateColumns: "22% 30% 33% 15%",
            background: "linear-gradient(90deg, #76B900 0%, #5a8f00 100%)",
          }}
        >
          {["Rolle", "Name", "Kontakt / E-Mail", "Status"].map((h) => (
            <div key={h} className={`px-3 ${compact ? "py-2" : "py-2.5"} text-xs font-semibold tracking-wide`}>
              {h}
            </div>
          ))}
        </div>

        {/* Datenzeilen */}
        {rows.map((row, idx) => {
          const { bg, text, border } = statusColors(row.status);
          const rowBg = idx % 2 === 0 ? "bg-white" : "bg-gray-50/60";

          return (
            <div
              key={idx}
              className={`grid gap-0 border-t border-gray-100 ${rowBg} hover:bg-[#76B900]/5 transition-colors`}
              style={{ gridTemplateColumns: "22% 30% 33% 15%" }}
            >
              {/* Rolle */}
              <div className={`px-3 ${cellPy} flex items-center`}>
                <span className={`${textXs} font-semibold text-gray-500`}>{row.role}</span>
              </div>

              {/* Name */}
              <div className={`px-3 ${cellPy} flex items-center min-w-0`}>
                {row.profileId ? (
                  <Link
                    href={`/profile/${row.profileId}`}
                    className={`${textSm} font-semibold text-[#2563eb] hover:underline truncate`}
                  >
                    {row.name || "–"}
                  </Link>
                ) : (
                  <span className={`${textSm} font-semibold text-gray-900 truncate`}>
                    {row.name || "–"}
                  </span>
                )}
              </div>

              {/* Kontakt */}
              <div className={`px-3 ${cellPy} flex flex-col justify-center min-w-0`}>
                {row.contact ? (
                  <a
                    href={`mailto:${row.contact}`}
                    className={`${textXs} text-gray-500 hover:text-[#76B900] truncate`}
                  >
                    {row.contact}
                  </a>
                ) : (
                  <span className={`${textXs} text-gray-300`}>–</span>
                )}
                {row.note && (
                  <span className={`${textXs} font-medium text-[#76B900] mt-0.5 truncate`}>
                    {row.note}
                  </span>
                )}
              </div>

              {/* Status-Pill */}
              <div className={`px-3 ${cellPy} flex items-center`}>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${bg} ${text} ${border} whitespace-nowrap`}
                >
                  {row.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Mobile-Karten (bis sm) ──────────────────────────────────────── */}
      <div className="sm:hidden space-y-2">
        {rows.map((row, idx) => {
          const { bg, text, border } = statusColors(row.status);
          return (
            <div
              key={idx}
              className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden"
            >
              {/* Farbiger Kopfstreifen mit Rolle + Status */}
              <div
                className="flex items-center justify-between px-3 py-1.5"
                style={{ background: "linear-gradient(90deg, #76B900 0%, #5a8f00 100%)" }}
              >
                <span className="text-[11px] font-semibold text-white tracking-wide">{row.role}</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${bg} ${text} ${border} whitespace-nowrap`}
                >
                  {row.status}
                </span>
              </div>

              {/* Name + Kontakt */}
              <div className="px-3 py-2.5">
                {row.profileId ? (
                  <Link
                    href={`/profile/${row.profileId}`}
                    className="text-sm font-semibold text-[#2563eb] hover:underline block truncate"
                  >
                    {row.name || "–"}
                  </Link>
                ) : (
                  <span className="text-sm font-semibold text-gray-900 block truncate">
                    {row.name || "–"}
                  </span>
                )}
                {row.contact && (
                  <a
                    href={`mailto:${row.contact}`}
                    className="text-xs text-gray-500 hover:text-[#76B900] block truncate mt-0.5"
                  >
                    {row.contact}
                  </a>
                )}
                {row.note && (
                  <span className="text-xs font-medium text-[#76B900] block mt-0.5 truncate">
                    {row.note}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
