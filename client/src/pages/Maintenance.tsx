import { trpc } from "@/lib/trpc";

export default function Maintenance() {
  // Öffentliche Systemstatus-Prozedur (kein Auth erforderlich)
  const { data: status } = trpc.maintenanceStatus.useQuery(undefined, { retry: false });
  const contactEmail = status?.contactEmail ?? "support@htw-berlin.de";
  const systemName = status?.systemName ?? "Thesis Match Maker";

  return (
    <div className="min-h-screen bg-[#1a2e1a] flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <img
          src="/manus-storage/logo-icon_b7dba00c.webp"
          alt="HTW Berlin Logo"
          className="w-20 h-20 object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <div className="text-center">
          <div className="text-white/60 text-sm font-medium tracking-widest uppercase">
            HTW Berlin
          </div>
          <div className="text-white text-xl font-bold">{systemName}</div>
        </div>
      </div>

      {/* Karte */}
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
        {/* Icon */}
        <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg
            className="w-8 h-8 text-amber-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"
            />
          </svg>
        </div>

        <h1 className="text-white text-2xl font-bold mb-3">
          Wartungsmodus aktiv
        </h1>
        <p className="text-white/70 text-sm leading-relaxed mb-6">
          Das System wird derzeit gewartet und steht vorübergehend nicht zur
          Verfügung. Wir arbeiten daran, den Dienst so schnell wie möglich
          wiederherzustellen.
        </p>

        <div className="border-t border-white/10 pt-5">
          <p className="text-white/50 text-xs mb-2">Bei dringenden Anfragen:</p>
          <a
            href={`mailto:${contactEmail}`}
            className="text-[#76b900] hover:text-[#8fd400] text-sm font-medium transition-colors"
          >
            {contactEmail}
          </a>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-white/30 text-xs">
        © {new Date().getFullYear()} HTW Berlin – Hochschule für Technik und Wirtschaft
      </p>
    </div>
  );
}
