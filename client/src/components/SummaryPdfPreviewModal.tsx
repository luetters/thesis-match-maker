import { useState, useEffect } from "react";
import { toast } from "sonner";

interface Props {
  thesisId: number;
  thesisTitle?: string;
  onClose: () => void;
}

/**
 * Zeigt die Antrag-Zusammenfassung als PDF-Vorschau im Browser an.
 * Das PDF wird per fetch geladen (mit Credentials) und als Blob-URL
 * in einem <iframe> dargestellt.
 */
export function SummaryPdfPreviewModal({ thesisId, thesisTitle, onClose }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState(`HTW_Antrag_${thesisId}.pdf`);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let objectUrl: string | null = null;
    setLoading(true);
    setError(null);
    setBlobUrl(null);

    async function load() {
      try {
        const res = await fetch(`/api/export/thesis/${thesisId}/summary.pdf`, {
          credentials: "include",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const rawErr: string = (body as any).error ?? "PDF konnte nicht geladen werden.";
          throw new Error(rawErr);
        }
        // Dateiname aus Content-Disposition auslesen
        const cd = res.headers.get("content-disposition") ?? "";
        const match = cd.match(/filename\*?=(?:UTF-8'')?([^;]+)/i);
        if (match) setFilename(decodeURIComponent(match[1].replace(/"/g, "")));

        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "PDF konnte nicht geladen werden.");
        toast.error("PDF-Vorschau fehlgeschlagen");
      } finally {
        setLoading(false);
      }
    }

    load();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [thesisId, retryKey]);

  function handleDownload() {
    if (!blobUrl) return;
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("PDF heruntergeladen");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 flex flex-col"
        style={{ height: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <svg className="w-4 h-4 text-[#76B900] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div className="min-w-0">
              <span className="font-semibold text-gray-900 text-sm block">Antrag-Zusammenfassung</span>
              {thesisTitle && (
                <span className="text-xs text-gray-400 truncate block max-w-xs">{thesisTitle}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {blobUrl && (
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                style={{ backgroundColor: "#F1F8E9", color: "#76B900" }}
                title="PDF herunterladen"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Herunterladen
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title="Schließen"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden rounded-b-2xl bg-gray-50">
          {loading && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
              <svg className="w-8 h-8 animate-spin text-[#76B900]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <span className="text-sm">PDF wird geladen…</span>
            </div>
          )}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-1">PDF konnte nicht geladen werden</p>
                <p className="text-sm text-gray-500 max-w-sm">{error}</p>
              </div>
              <button
                onClick={() => setRetryKey(k => k + 1)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-[#76B900] text-white hover:bg-[#5a8f00] transition-colors"
              >
                Erneut versuchen
              </button>
            </div>
          )}
          {blobUrl && !loading && (
            <iframe
              src={blobUrl}
              className="w-full h-full border-0"
              title="Antrag-Zusammenfassung PDF"
            />
          )}
        </div>
      </div>
    </div>
  );
}
