import { useEffect, useState } from "react";
import { useParams } from "wouter";

interface VerifyResult {
  valid: boolean;
  revoked?: boolean;
  studentName: string;
  matrikelNr: string | null;
  programmeName: string | null;
  title: string | null;
  firstExaminerName: string | null;
  secondExaminerName: string | null;
  targetSemester: string | null;
  degreeType: string | null;
  issuedAt: string;
  error?: string;
}

export default function VerifyDocument() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [revoked, setRevoked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/verify/${token}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (res.status === 410 && body.revoked) {
          // Token wurde widerrufen
          setRevoked(body.error ?? "Dieses Dokument wurde widerrufen.");
          return null;
        }
        if (!res.ok) {
          throw new Error(body.error ?? "Dokument konnte nicht verifiziert werden.");
        }
        return body as VerifyResult;
      })
      .then((data) => { if (data) setResult(data); })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[#76B900] flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="text-xl font-semibold text-gray-900">HTW Berlin – Dokumentenverifikation</span>
        </div>
        <p className="text-sm text-gray-500">
          Dieses Portal bestätigt die Echtheit eines Anmeldedokuments zur Abschlussarbeit.
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading && (
          <div className="p-10 flex flex-col items-center gap-3 text-gray-400">
            <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm">Dokument wird verifiziert …</span>
          </div>
        )}

        {!loading && revoked && (
          <div className="p-8 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-red-700 text-base mb-1">Dokument widerrufen</p>
              <p className="text-sm text-gray-600 max-w-sm">{revoked}</p>
              <p className="text-xs text-gray-400 mt-3">
                Dieses Anmeldedokument ist nicht mehr gültig. Die Betreuungszusage wurde nachträglich zurückgezogen oder storniert.
                Bitte wenden Sie sich an die zuständige Verwaltung des Fachbereichs 3.
              </p>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="p-8 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
              <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-1">Dokument ungültig</p>
              <p className="text-sm text-gray-500">{error}</p>
            </div>
          </div>
        )}

        {!loading && result && (
          <>
            {/* Status-Banner */}
            <div className="bg-[#76B900] px-6 py-4 flex items-center gap-3">
              <svg className="w-6 h-6 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="text-white font-semibold text-sm">Dokument verifiziert</p>
                <p className="text-green-100 text-xs">
                  Ausgestellt am {new Date(result.issuedAt).toLocaleDateString("de-DE", {
                    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
                  })} Uhr
                </p>
              </div>
            </div>

            {/* Felder */}
            <div className="p-6 space-y-4">
              <Field label="Thema / Topic" value={result.title} />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Name" value={result.studentName} />
                <Field label="Matrikelnummer" value={result.matrikelNr} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Studiengang / Programme" value={result.programmeName} />
                <Field label="Abschluss / Degree" value={result.degreeType} />
              </div>
              <Field label="Erstgutachter:in / First Supervisor" value={result.firstExaminerName} />
              <Field label="Zweitgutachter:in / Second Supervisor" value={result.secondExaminerName} />
              <Field label="Semester der Thesis / Semester of Thesis" value={result.targetSemester} />
            </div>

            <div className="px-6 pb-6 pt-0">
              <p className="text-xs text-gray-400 text-center">
                Dieses Dokument wurde durch das Thesis-Management-System der HTW Berlin ausgestellt.
                Die Echtheit kann ausschließlich über diesen Link verifiziert werden.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value ?? "—"}</p>
    </div>
  );
}
