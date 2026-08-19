import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

/** Persönliche, 2FAS-kompatible Kontosicherung für alle angemeldeten Rollen. */
export function TwoFactorProfilePanel() {
  const utils = trpc.useUtils();
  const { data: status, isLoading } = trpc.auth.twoFactorStatus.useQuery();
  const [setup, setSetup] = useState<{ qrCodeDataUrl: string; manualKey: string } | null>(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  const begin = trpc.auth.beginTwoFactorSetup.useMutation({
    onSuccess: setSetup,
    onError: (error) => toast.error(error.message),
  });
  const confirm = trpc.auth.confirmTwoFactorSetup.useMutation({
    onSuccess: (result) => {
      setRecoveryCodes(result.recoveryCodes);
      setSetup(null);
      setCode("");
      utils.auth.twoFactorStatus.invalidate();
      toast.success("Die Zwei-Faktor-Authentifizierung wurde für Ihr Konto aktiviert.");
    },
    onError: (error) => toast.error(error.message),
  });
  const disable = trpc.auth.disableTwoFactor.useMutation({
    onSuccess: () => {
      setCode("");
      utils.auth.twoFactorStatus.invalidate();
      toast.success("Die Zwei-Faktor-Authentifizierung wurde deaktiviert.");
    },
    onError: (error) => toast.error(error.message),
  });

  if (isLoading || !status?.eligible) return null;

  const setNumericCode = (value: string) => setCode(value.replace(/\D/g, "").slice(0, 6));

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6" aria-labelledby="profile-two-factor-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="profile-two-factor-title" className="text-base font-semibold text-gray-900">Zwei-Faktor-Authentifizierung</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-600">
            Schützen Sie Ihr Konto zusätzlich mit 2FAS oder einer kompatiblen Authenticator-App. Nach der Aktivierung ist der Sicherheitscode bei jeder Passwortanmeldung für Ihr Konto erforderlich.
          </p>
        </div>
        <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${status.enabled ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>
          {status.enabled ? "Aktiviert" : "Nicht aktiviert"}
        </span>
      </div>

      {!status.enabled && !setup && (
        <button type="button" onClick={() => begin.mutate()} disabled={begin.isPending} className="mt-5 rounded-lg bg-[#2f6f2f] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          {begin.isPending ? "Einrichtung wird vorbereitet …" : "2FAS einrichten"}
        </button>
      )}

      {setup && (
        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <h3 className="font-semibold text-blue-950">Authenticator-App verbinden</h3>
          <p className="mt-1 text-sm text-blue-900">Scannen Sie den QR-Code mit 2FAS oder geben Sie den manuellen Schlüssel ein. Bestätigen Sie anschließend den sechsstelligen Code.</p>
          <img src={setup.qrCodeDataUrl} alt="QR-Code zur Einrichtung von 2FAS" className="mt-4 h-40 w-40 rounded-lg bg-white p-2" />
          <p className="mt-3 break-all rounded-lg bg-white px-3 py-2 font-mono text-xs text-gray-700">Manueller Schlüssel: {setup.manualKey}</p>
          <label className="mt-4 block text-sm font-medium text-gray-700" htmlFor="profile-two-factor-confirm">Sicherheitscode</label>
          <input id="profile-two-factor-confirm" value={code} onChange={(event) => setNumericCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="Sechsstelliger Code" className="mt-1 w-full max-w-sm rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => confirm.mutate({ code })} disabled={code.length !== 6 || confirm.isPending} className="rounded-lg bg-[#2f6f2f] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Aktivierung bestätigen</button>
            <button type="button" onClick={() => { setSetup(null); setCode(""); }} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700">Abbrechen</button>
          </div>
        </div>
      )}

      {recoveryCodes && (
        <div className="mt-5 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <h3 className="font-semibold">Einmalige Wiederherstellungscodes</h3>
          <p className="mt-1">Bewahren Sie diese Codes an einem sicheren Ort auf. Jeder Code kann nur einmal verwendet werden und wird nach dem Schließen nicht erneut angezeigt.</p>
          <div className="mt-3 grid max-w-md grid-cols-2 gap-2 font-mono text-sm">{recoveryCodes.map((recoveryCode) => <code key={recoveryCode} className="rounded bg-white px-2 py-1">{recoveryCode}</code>)}</div>
          <button type="button" onClick={() => setRecoveryCodes(null)} className="mt-4 rounded-lg bg-amber-800 px-3 py-2 text-sm font-semibold text-white">Ich habe die Codes sicher aufbewahrt</button>
        </div>
      )}

      {status.enabled && !recoveryCodes && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
          <h3 className="font-semibold text-red-950">2FAS deaktivieren</h3>
          <p className="mt-1 text-sm text-red-800">Geben Sie einen aktuellen Code aus Ihrer Authenticator-App ein. Danach ist die zusätzliche Anmeldeabsicherung für Ihr Konto nicht mehr erforderlich.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input value={code} onChange={(event) => setNumericCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="Sechsstelliger Code" className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm" />
            <button type="button" onClick={() => disable.mutate({ code })} disabled={code.length !== 6 || disable.isPending} className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">Deaktivieren</button>
          </div>
        </div>
      )}
    </section>
  );
}
