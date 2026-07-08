import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface DocCommentsProps {
  documentId: number;
  documentName: string;
  currentUserId: number;
  canComment: boolean; // Prüfer:in oder Admin darf kommentieren; Studierende nur lesen
  showInput?: boolean; // Eingabefeld anzeigen (Prüfer:in)
}

export function DocComments({ documentId, documentName, currentUserId, canComment, showInput = true }: DocCommentsProps) {
  const [newComment, setNewComment] = useState("");
  const utils = trpc.useUtils();

  const { data: comments = [], isLoading } = (trpc.examinerEmailTemplates as any).getDocumentComments?.useQuery?.(
    { documentId },
    { enabled: true }
  ) ?? { data: [], isLoading: false };

  const addMutation = (trpc.examinerEmailTemplates as any).addDocumentComment?.useMutation?.({
    onSuccess: () => {
      setNewComment("");
      utils.examinerEmailTemplates.getDocumentComments.invalidate({ documentId });
      toast.success("Kommentar hinzugefügt.");
    },
    onError: (e: any) => toast.error(e.message ?? "Fehler beim Speichern."),
  });

  const deleteMutation = (trpc.examinerEmailTemplates as any).deleteDocumentComment?.useMutation?.({
    onSuccess: () => {
      utils.examinerEmailTemplates.getDocumentComments.invalidate({ documentId });
      toast.success("Kommentar gelöscht.");
    },
    onError: (e: any) => toast.error(e.message ?? "Fehler beim Löschen."),
  });

  function handleSubmit() {
    if (!newComment.trim()) return;
    addMutation?.mutate({ documentId, content: newComment.trim() });
  }

  return (
    <div className="mt-2">
      {/* Kommentarliste */}
      {isLoading ? (
        <p className="text-xs text-gray-400 italic">Lade Kommentare…</p>
      ) : comments.length > 0 ? (
        <div className="space-y-2 mb-2">
          {comments.map((c: any) => (
            <div key={c.id} className="flex gap-2 items-start">
              {/* Avatar */}
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-semibold text-gray-600">
                  {(c.authorName ?? "?").charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-gray-800">{c.authorName ?? "Unbekannt"}</span>
                  {c.authorRole === "examiner" && (
                    <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">Prüfer:in</span>
                  )}
                  {c.authorRole === "student" && (
                    <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">Studierende:r</span>
                  )}
                  <span className="text-xs text-gray-400">
                    {new Date(c.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}
                    {" "}
                    {new Date(c.createdAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-xs text-gray-700 mt-0.5 whitespace-pre-wrap leading-relaxed">{c.content}</p>
              </div>
              {/* Löschen-Button (nur eigene Kommentare) */}
              {c.authorId === currentUserId && (
                <button
                  onClick={() => deleteMutation?.mutate({ commentId: c.id })}
                  className="p-1 text-gray-300 hover:text-red-500 flex-shrink-0 mt-0.5 transition-colors"
                  title="Kommentar löschen"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic mb-2">Noch keine Kommentare.</p>
      )}

      {/* Eingabefeld */}
      {canComment && showInput && (
        <div className="flex gap-2 items-end mt-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit(); }}
            placeholder="Feedback zum Dokument eingeben… (Strg+Enter zum Senden)"
            rows={2}
            className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-green-400 resize-none"
          />
          <button
            onClick={handleSubmit}
            disabled={!newComment.trim() || addMutation?.isPending}
            className="px-3 py-2 bg-[#76B900] hover:bg-[#5d9100] disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors flex-shrink-0"
          >
            {addMutation?.isPending ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
