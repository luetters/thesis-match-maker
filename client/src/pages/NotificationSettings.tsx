import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { useState, useEffect } from "react";

// ─── Icons ───────────────────────────────────────────────────────────────────
const BellIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
);

// ─── Toggle-Komponente ────────────────────────────────────────────────────────
function Toggle({ enabled, onChange, disabled }: { enabled: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
        enabled ? "bg-green-500" : "bg-gray-200"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────
export default function NotificationSettings({ embedded = false }: { embedded?: boolean }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: settings, isLoading } = trpc.notificationSettings.getAll.useQuery();

  const setMutation = trpc.notificationSettings.set.useMutation({
    onSuccess: () => {
      utils.notificationSettings.getAll.invalidate();
    },
    onError: (err) => toast.error(err.message ?? "Fehler beim Speichern."),
  });

  // Lokaler State für optimistische Updates
  const [localState, setLocalState] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      const initial: Record<string, boolean> = {};
      for (const s of settings) {
        initial[s.key] = s.enabled;
      }
      setLocalState(initial);
      setHasChanges(false);
    }
  }, [settings]);

  function handleToggle(key: string, enabled: boolean) {
    setLocalState((prev) => ({ ...prev, [key]: enabled }));
    setHasChanges(true);
    // Sofort speichern (kein separater Speichern-Button nötig)
    setMutation.mutate({ notificationType: key, enabled });
  }

  // Nur Benachrichtigungstypen anzeigen, die für die aktuelle Rolle relevant sind
  const userRole = user?.role ?? "";
  const relevantSettings = settings?.filter((s) => {
    if (!s.roles || (s.roles as unknown as string[]).length === 0) return true;
    return (s.roles as unknown as string[]).some((r: string) =>
      r === userRole ||
      userRole === "superadmin" ||
      userRole === "admin"
    );
  }) ?? [];

  const content = (
    <div className="space-y-4">
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : relevantSettings.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">
          Keine Benachrichtigungseinstellungen verfügbar.
        </p>
      ) : (
        <div className="divide-y divide-gray-100">
          {relevantSettings.map((s) => {
            const isEnabled = localState[s.key] ?? Boolean(s.enabled);
            return (
              <div key={s.key} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800">{s.labelDe}</span>
                    {!s.defaultEnabled && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                        Opt-in
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{s.descDe}</p>
                </div>
                <div className="flex-shrink-0 pt-0.5">
                  <Toggle
                    enabled={isEnabled}
                    onChange={(v) => handleToggle(s.key, v)}
                    disabled={setMutation.isPending}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hinweis */}
      <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-xs text-blue-700 leading-relaxed">
        <strong>Hinweis:</strong> Systemkritische E-Mails (z. B. Magic-Link-Anmeldung, Passwort-Reset) können nicht deaktiviert werden und werden immer zugestellt.
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#f0fdf4" }}>
            <span style={{ color: "#76B900" }}><BellIcon /></span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">E-Mail-Benachrichtigungen</h1>
            <p className="text-sm text-gray-500">Wählen Sie, welche E-Mail-Benachrichtigungen Sie erhalten möchten.</p>
          </div>
        </div>
        {content}
      </div>
    </div>
  );
}
