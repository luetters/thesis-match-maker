import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { RichTextEditor } from "@/components/RichTextEditor";

const PLACEHOLDER_COLORS: Record<string, string> = {
  "{{studentName}}": "bg-blue-100 text-blue-700",
  "{{examinerName}}": "bg-green-100 text-green-700",
  "{{thesisTitle}}": "bg-purple-100 text-purple-700",
  "{{actionUrl}}": "bg-orange-100 text-orange-700",
  "{{rejectionReason}}": "bg-red-100 text-red-700",
  "{{colloquiumDate}}": "bg-teal-100 text-teal-700",
  "{{colloquiumTime}}": "bg-teal-100 text-teal-700",
  "{{colloquiumLocation}}": "bg-teal-100 text-teal-700",
  "{{newStatus}}": "bg-amber-100 text-amber-700",
  "{{recipientName}}": "bg-blue-100 text-blue-700",
};

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

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    subject: string;
    htmlBody: string;
    textBody: string;
  } | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saving" | "saved" | "error" | null>(null);
  const [previewMode, setPreviewMode] = useState<"html" | "text">("html");

  function startEdit(t: {
    key: string;
    subject: string;
    htmlBody: string;
    textBody: string;
  }) {
    setEditingKey(t.key);
    setEditForm({ subject: t.subject, htmlBody: t.htmlBody, textBody: t.textBody });
    setSaveStatus(null);
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
      subject: editForm.subject,
      htmlBody: editForm.htmlBody,
      textBody: editForm.textBody,
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-[#006937] border-t-transparent rounded-full animate-spin" />
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
            Betreff und Inhalt der automatischen E-Mails anpassen. Platzhalter werden beim Versand durch echte Werte ersetzt.
          </p>
        </div>
      </div>

      {/* Vorlagen-Liste */}
      {!editingKey && (
        <div className="grid gap-3">
          {templates.map((t) => (
            <div
              key={t.key}
              className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">✉️</span>
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{t.label}</h3>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">
                    <span className="font-medium text-gray-700">Betreff:</span> {t.subject}
                  </p>
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
                  onClick={() => startEdit(t)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-[#006937] text-white text-xs font-medium hover:bg-[#005a2f] transition-colors"
                >
                  Bearbeiten
                </button>
              </div>
            </div>
          ))}
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
                <span className="text-xs text-green-600 font-medium">✓ Gespeichert</span>
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
                className="px-3 py-1.5 rounded-lg bg-[#006937] text-white text-xs font-medium hover:bg-[#005a2f] transition-colors disabled:opacity-50"
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

            {/* Betreff */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Betreff</label>
              <input
                type="text"
                value={editForm.subject}
                onChange={(e) => setEditForm((f) => f ? { ...f, subject: e.target.value } : f)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
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
                    HTML-Inhalt
                    <span className="ml-1 text-gray-400 font-normal text-xs">(WYSIWYG-Editor – kein HTML-Wissen erforderlich)</span>
                  </label>
                  <RichTextEditor
                    value={editForm.htmlBody}
                    onChange={(html) =>
                      setEditForm((f) => f ? { ...f, htmlBody: html } : f)
                    }
                  />
                  <p className="text-xs text-gray-400 mt-1.5">
                    Platzhalter wie <code className="bg-gray-100 px-1 rounded">{'{{userName}}'}</code> können direkt in den Text eingefügt werden und werden beim Versand automatisch ersetzt.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Text-Inhalt{" "}
                    <span className="text-gray-400 font-normal">(Nur Text, kein HTML)</span>
                  </label>
                  <textarea
                    value={editForm.textBody}
                    onChange={(e) =>
                      setEditForm((f) => f ? { ...f, textBody: e.target.value } : f)
                    }
                    rows={10}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500 resize-y"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
