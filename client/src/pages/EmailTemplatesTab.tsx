import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { RichTextEditor } from "@/components/RichTextEditor";
import { fillEmailTemplatePreview } from "@shared/emailTemplatePreview";

const PLACEHOLDER_COLORS: Record<string, string> = {
  "{{studentName}}": "bg-blue-100 text-blue-700",
  "{{examinerName}}": "bg-primary/10 text-primary",
  "{{thesisTitle}}": "bg-purple-100 text-purple-700",
  "{{actionUrl}}": "bg-orange-100 text-orange-700",
  "{{rejectionReason}}": "bg-red-100 text-red-700",
  "{{colloquiumDate}}": "bg-teal-100 text-teal-700",
  "{{colloquiumTime}}": "bg-teal-100 text-teal-700",
  "{{colloquiumLocation}}": "bg-teal-100 text-teal-700",
  "{{newStatus}}": "bg-amber-100 text-amber-700",
  "{{recipientName}}": "bg-blue-100 text-blue-700",
};

type Lang = "de" | "en";

interface EditForm {
  subject: string;
  htmlBody: string;
  textBody: string;
  subjectDe: string;
  htmlBodyDe: string;
  textBodyDe: string;
  subjectEn: string;
  htmlBodyEn: string;
  textBodyEn: string;
}

export function EmailTemplatesTab() {
  const { data: templates, isLoading, refetch } = trpc.emailTemplates.getAll.useQuery();
  const updateMutation = trpc.emailTemplates.update.useMutation({
    onSuccess: () => {
      refetch();
      setEditingKey(null);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(null), 2000);
    },
    onError: () => setSaveStatus("error"),
  });
  const sendPreviewMutation = trpc.emailTemplates.sendPreviewToSelf.useMutation();

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saving" | "saved" | "error" | null>(null);
  // Aktive Sprach-Tab im Editor (DE oder EN)
  const [activeLang, setActiveLang] = useState<Lang>("de");
  // Vorschau-Modus (HTML oder Text)
  const [previewMode, setPreviewMode] = useState<"html" | "text">("html");
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [testMailStatus, setTestMailStatus] = useState<"sent" | "error" | null>(null);

  function startEdit(t: {
    key: string;
    subject: string;
    htmlBody: string;
    textBody: string;
    subjectDe?: string | null;
    htmlBodyDe?: string | null;
    textBodyDe?: string | null;
    subjectEn?: string | null;
    htmlBodyEn?: string | null;
    textBodyEn?: string | null;
  }) {
    setEditingKey(t.key);
    setEditForm({
      subject: t.subject,
      htmlBody: t.htmlBody,
      textBody: t.textBody,
      subjectDe: t.subjectDe ?? t.subject,
      htmlBodyDe: t.htmlBodyDe ?? t.htmlBody,
      textBodyDe: t.textBodyDe ?? t.textBody,
      subjectEn: t.subjectEn ?? "",
      htmlBodyEn: t.htmlBodyEn ?? "",
      textBodyEn: t.textBodyEn ?? "",
    });
    setActiveLang("de");
    setPreviewMode("html");
    setShowEmailPreview(false);
    setPreviewDevice("desktop");
    setSaveStatus(null);
    setTestMailStatus(null);
  }

  function cancelEdit() {
    setEditingKey(null);
    setEditForm(null);
    setSaveStatus(null);
  }

  function saveEdit() {
    if (!editingKey || !editForm) return;
    setSaveStatus("saving");
    updateMutation.mutate({
      key: editingKey,
      subject: editForm.subjectDe || editForm.subject,
      htmlBody: editForm.htmlBodyDe || editForm.htmlBody,
      textBody: editForm.textBodyDe || editForm.textBody,
      subjectDe: editForm.subjectDe,
      htmlBodyDe: editForm.htmlBodyDe,
      textBodyDe: editForm.textBodyDe,
      subjectEn: editForm.subjectEn,
      htmlBodyEn: editForm.htmlBodyEn,
      textBodyEn: editForm.textBodyEn,
    });
  }

  function updateField(lang: Lang, field: "subject" | "htmlBody" | "textBody", value: string) {
    if (!editForm) return;
    if (lang === "de") {
      const key = field === "subject" ? "subjectDe" : field === "htmlBody" ? "htmlBodyDe" : "textBodyDe";
      setEditForm((f) => f ? { ...f, [key]: value } : f);
    } else {
      const key = field === "subject" ? "subjectEn" : field === "htmlBody" ? "htmlBodyEn" : "textBodyEn";
      setEditForm((f) => f ? { ...f, [key]: value } : f);
    }
  }

  function getCurrentSubject() {
    if (!editForm) return "";
    return activeLang === "de" ? editForm.subjectDe : editForm.subjectEn;
  }
  function getCurrentHtmlBody() {
    if (!editForm) return "";
    return activeLang === "de" ? editForm.htmlBodyDe : editForm.htmlBodyEn;
  }
  function getCurrentTextBody() {
    if (!editForm) return "";
    return activeLang === "de" ? editForm.textBodyDe : editForm.textBodyEn;
  }

  const previewHtml = useMemo(
    () => fillEmailTemplatePreview(getCurrentHtmlBody(), activeLang),
    [editForm, activeLang],
  );
  const previewText = useMemo(
    () => fillEmailTemplatePreview(getCurrentTextBody(), activeLang),
    [editForm, activeLang],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-[#76B900] border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-500">Vorlagen werden geladen…</span>
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <span className="text-4xl">✉️</span>
        <p className="mt-3 text-sm">Keine E-Mail-Vorlagen gefunden.</p>
      </div>
    );
  }

  const editingTemplate = templates.find((t) => t.key === editingKey);
  const placeholders: string[] = editingTemplate?.placeholders
    ? JSON.parse(editingTemplate.placeholders)
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">E-Mail-Vorlagen</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Jede Vorlage kann in <strong>Deutsch</strong> und <strong>Englisch</strong> gepflegt werden.
            Die Sprachauswahl kann vor dem Versenden noch geändert werden.
          </p>
        </div>
      </div>

      {/* Vorlagen-Liste */}
      {!editingKey && (
        <div className="grid gap-3">
          {templates.map((t) => {
            const hasDe = !!(t as { subjectDe?: string | null }).subjectDe;
            const hasEn = !!(t as { subjectEn?: string | null }).subjectEn;
            return (
              <div
                key={t.key}
                className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">✉️</span>
                      <h3 className="font-semibold text-gray-900 text-sm truncate">{t.label}</h3>
                      {/* Sprachstatus-Badges */}
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${hasDe ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                        🇩🇪 DE
                      </span>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${hasEn ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-400"}`}>
                        🇬🇧 EN
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-1">
                      <span className="font-medium text-gray-700">Betreff (DE):</span>{" "}
                      {(t as { subjectDe?: string | null }).subjectDe || t.subject}
                    </p>
                    {(t as { subjectEn?: string | null }).subjectEn && (
                      <p className="text-xs text-gray-400 mb-1">
                        <span className="font-medium text-gray-500">Subject (EN):</span>{" "}
                        {(t as { subjectEn?: string | null }).subjectEn}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      Zuletzt geändert: {new Date(t.updatedAt).toLocaleString("de-DE")}
                    </p>
                    {t.placeholders && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(JSON.parse(t.placeholders) as string[]).map((p) => (
                          <span
                            key={p}
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono ${
                              PLACEHOLDER_COLORS[p] ?? "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => startEdit(t as Parameters<typeof startEdit>[0])}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-[#76B900] text-white text-xs font-medium hover:bg-[var(--primary)] transition-colors"
                  >
                    Bearbeiten
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bearbeitungsformular */}
      {editingKey && editForm && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">
                {templates.find((t) => t.key === editingKey)?.label}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5 font-mono">{editingKey}</p>
            </div>
            <div className="flex items-center gap-2">
              {saveStatus === "saved" && (
                <span className="text-xs text-primary font-medium">✓ Gespeichert</span>
              )}
              {saveStatus === "error" && (
                <span className="text-xs text-red-600 font-medium">✗ Fehler beim Speichern</span>
              )}
              <button
                onClick={cancelEdit}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={saveEdit}
                disabled={updateMutation.isPending}
                className="px-3 py-1.5 rounded-lg bg-[#76B900] text-white text-xs font-medium hover:bg-[var(--primary)] transition-colors disabled:opacity-50"
              >
                {updateMutation.isPending ? "Wird gespeichert…" : "Speichern"}
              </button>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Platzhalter-Hinweis */}
            {placeholders.length > 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
                <p className="text-xs font-medium text-amber-800 mb-2">
                  Verfügbare Platzhalter (werden beim Versand ersetzt):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {placeholders.map((p) => (
                    <button
                      key={p}
                      type="button"
                      title="Klicken zum Kopieren"
                      onClick={() => navigator.clipboard.writeText(p)}
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono cursor-pointer hover:opacity-80 transition-opacity ${
                        PLACEHOLDER_COLORS[p] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Sprach-Tabs ── */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Tab-Leiste */}
              <div className="flex border-b border-gray-200 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setActiveLang("de")}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
                    activeLang === "de"
                      ? "border-[#76B900] text-[#006937] bg-white"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span>🇩🇪</span>
                  <span>Deutsch</span>
                  {editForm.subjectDe && (
                    <span className="w-2 h-2 rounded-full bg-green-500" title="Inhalt vorhanden" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLang("en")}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
                    activeLang === "en"
                      ? "border-blue-500 text-blue-700 bg-white"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span>🇬🇧</span>
                  <span>English</span>
                  {editForm.subjectEn && (
                    <span className="w-2 h-2 rounded-full bg-blue-500" title="Content available" />
                  )}
                </button>
                <div className="flex-1" />
                <div className="flex items-center gap-1 px-3">
                  <span className="text-xs text-gray-400">
                    {activeLang === "de"
                      ? "Deutsche Version – wird an Empfänger:innen mit DE-Präferenz gesendet"
                      : "English version – sent to recipients with EN preference"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-white px-5 py-3">
                <div>
                  <p className="text-xs font-semibold text-gray-700">E-Mail-Vorschau</p>
                  <p className="text-xs text-gray-500">Vorschau mit Beispieldaten in der aktuell ausgewählten Sprache.</p>
                </div>
                <div className="flex items-center gap-2">
                  {testMailStatus === "sent" && <span className="text-xs font-medium text-green-700">Testmail versendet</span>}
                  {testMailStatus === "error" && <span className="text-xs font-medium text-red-700">Testmail fehlgeschlagen</span>}
                  <button
                    type="button"
                    disabled={!editingKey || !getCurrentSubject() || !previewHtml || sendPreviewMutation.isPending}
                    onClick={() => sendPreviewMutation.mutate({ templateKey: editingKey!, language: activeLang, subject: fillEmailTemplatePreview(getCurrentSubject(), activeLang), html: previewHtml, text: previewText }, { onSuccess: () => setTestMailStatus("sent"), onError: () => setTestMailStatus("error") })}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sendPreviewMutation.isPending ? "Wird versendet…" : "Testmail an mich senden"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEmailPreview((visible) => !visible)}
                    aria-expanded={showEmailPreview}
                    className="rounded-lg border border-[#76B900] px-3 py-1.5 text-xs font-semibold text-[#456d00] transition-colors hover:bg-[#76B900]/10"
                  >
                    {showEmailPreview ? "Vorschau ausblenden" : "Vorschau öffnen"}
                  </button>
                </div>
              </div>

              {showEmailPreview && (
                <div className="space-y-3 border-b border-gray-100 bg-slate-50 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">Darstellungsprüfung</p>
                      <p className="text-xs text-slate-500">Die Vorschau verwendet denselben Vorlageninhalt wie die Test-E-Mail.</p>
                    </div>
                    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1" aria-label="Ansicht für die E-Mail-Vorschau auswählen">
                      <button
                        type="button"
                        onClick={() => setPreviewDevice("desktop")}
                        aria-pressed={previewDevice === "desktop"}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${previewDevice === "desktop" ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                      >
                        Desktop
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewDevice("mobile")}
                        aria-pressed={previewDevice === "mobile"}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${previewDevice === "mobile" ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                      >
                        Mobil · 375 px
                      </button>
                    </div>
                  </div>
                  <div className={`rounded-xl border border-slate-200 bg-slate-200/60 p-3 ${previewDevice === "mobile" ? "flex justify-center" : ""}`}>
                    <div className={previewDevice === "mobile" ? "w-[375px] max-w-full overflow-hidden rounded-[1.5rem] border-[7px] border-slate-900 bg-white shadow-xl" : "w-full"}>
                      <div className="border-b border-slate-200 bg-white px-3 py-2 text-sm text-slate-800">
                        <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{activeLang === "de" ? "Betreff" : "Subject"}</span>
                        {fillEmailTemplatePreview(getCurrentSubject(), activeLang) || "—"}
                      </div>
                      <iframe
                        title={`${activeLang === "de" ? "E-Mail-Vorschau auf Deutsch" : "Email preview in English"} – ${previewDevice === "mobile" ? "Mobilansicht" : "Desktopansicht"}`}
                        sandbox=""
                        srcDoc={previewHtml || `<p style="font-family:Arial,sans-serif;color:#64748b">${activeLang === "de" ? "Kein HTML-Inhalt vorhanden." : "No HTML content available."}</p>`}
                        className={`w-full border-0 bg-white ${previewDevice === "mobile" ? "h-[540px]" : "h-80"}`}
                      />
                    </div>
                  </div>
                  <details className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <summary className="cursor-pointer text-xs font-semibold text-slate-700">{activeLang === "de" ? "Textversion anzeigen" : "Show text version"}</summary>
                    <pre className="mt-2 whitespace-pre-wrap font-sans text-xs text-slate-600">{previewText || "—"}</pre>
                  </details>
                </div>
              )}

              {/* Tab-Inhalt */}
              <div className="p-5 space-y-4">
                {/* Betreff */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {activeLang === "de" ? "Betreff (Deutsch)" : "Subject (English)"}
                  </label>
                  <input
                    type="text"
                    value={getCurrentSubject()}
                    onChange={(e) => updateField(activeLang, "subject", e.target.value)}
                    placeholder={activeLang === "de" ? "Betreff auf Deutsch…" : "Subject in English…"}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* HTML-Body / Text-Body Tabs */}
                <div>
                  <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit mb-2">
                    <button
                      type="button"
                      onClick={() => setPreviewMode("html")}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                        previewMode === "html"
                          ? "bg-white shadow text-gray-900"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      HTML-Version
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode("text")}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                        previewMode === "text"
                          ? "bg-white shadow text-gray-900"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Text-Version
                    </button>
                  </div>

                  {previewMode === "html" ? (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        {activeLang === "de" ? "HTML-Inhalt (Deutsch)" : "HTML Content (English)"}
                        <span className="ml-1 text-gray-400 font-normal text-xs">
                          (WYSIWYG-Editor)
                        </span>
                      </label>
                      <RichTextEditor
                        key={`${editingKey}-${activeLang}-html`}
                        value={getCurrentHtmlBody()}
                        onChange={(html) => updateField(activeLang, "htmlBody", html)}
                      />
                      <p className="text-xs text-gray-400 mt-1.5">
                        Platzhalter wie{" "}
                        <code className="bg-gray-100 px-1 rounded">{"{{userName}}"}</code>{" "}
                        können direkt in den Text eingefügt werden.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {activeLang === "de" ? "Text-Inhalt (Deutsch)" : "Text Content (English)"}
                        <span className="text-gray-400 font-normal ml-1">(Nur Text, kein HTML)</span>
                      </label>
                      <textarea
                        key={`${editingKey}-${activeLang}-text`}
                        value={getCurrentTextBody()}
                        onChange={(e) => updateField(activeLang, "textBody", e.target.value)}
                        placeholder={activeLang === "de" ? "Text auf Deutsch…" : "Text in English…"}
                        rows={10}
                        style={{ maxHeight: "16rem", overflowY: "auto" }}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Hinweis zur Sprachauswahl beim Versenden */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
              <p className="text-xs text-blue-800">
                <strong>Hinweis zur Sprachauswahl:</strong> Beim Versenden einer E-Mail kann die Sprache
                noch geändert werden. Ist keine englische Version hinterlegt, wird automatisch die
                deutsche Version verwendet.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
