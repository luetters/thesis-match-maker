import { useState } from "react";
import { ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

/** Redaktionelle Freigabe: Es werden keine personenbezogenen Studierendendaten angezeigt. */
export function AbstractModerationTab() {
  const utils = trpc.useUtils();
  const { data: entries, isLoading } = trpc.abstractCollection.reviewQueue.useQuery();
  const [notes, setNotes] = useState<Record<number, string>>({});
  const review = trpc.abstractCollection.review.useMutation({
    onSuccess: (_, variables) => {
      toast.success(variables.approve ? "Abstract freigegeben und veröffentlicht." : "Abstract nicht freigegeben.");
      utils.abstractCollection.reviewQueue.invalidate();
      utils.abstractCollection.publicList.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  return <div className="space-y-5">
    <div>
      <h2 className="text-xl font-bold text-gray-900">Abstract-Freigaben</h2>
      <p className="mt-1 text-sm text-gray-600">Prüfen Sie Titel, Fachbereich und Abstract auf Personen-, Unternehmens- und Vertraulichkeitsbezüge. Erst nach Ihrer Freigabe wird der Beitrag in der öffentlichen Sammlung sichtbar.</p>
    </div>
    {isLoading ? <p className="py-10 text-center text-sm text-gray-500">Abstracts werden geladen …</p> : !entries?.length ? <Card><CardContent className="py-12 text-center text-sm text-gray-500">Keine Abstracts warten auf eine Freigabe.</CardContent></Card> : <div className="space-y-4">
      {entries.map((entry) => <Card key={entry.id} className="border-slate-200"><CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#5a8c00]">{entry.department} · {entry.submissionSemester}</p><h3 className="mt-1 text-lg font-semibold text-gray-900">{entry.title}</h3></div><span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">Prüfung ausstehend</span></div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2"><div><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Deutsch</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-700">{entry.abstractDe ?? "Für Bestandsdaten nicht zweisprachig hinterlegt."}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">English</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-700">{entry.abstractEn ?? "Not available for legacy entries."}</p></div></div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">{entry.programme && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{entry.programme}</span>}{(entry.keywords ?? []).map((keyword) => <span key={keyword} className="rounded-full bg-[#e8f4d4] px-2.5 py-1 text-[#456d00]">{keyword}</span>)}</div>
        <div className="mt-4 space-y-2"><label className="text-sm font-medium text-gray-800" htmlFor={`abstract-review-note-${entry.id}`}>Hinweis für die studierende Person (bei Ablehnung optional)</label><Textarea id={`abstract-review-note-${entry.id}`} value={notes[entry.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [entry.id]: event.target.value }))} maxLength={1000} placeholder="z. B. Bitte entfernen Sie den Unternehmensnamen vor einer öffentlichen Veröffentlichung." /></div>
        <div className="mt-4 flex flex-wrap gap-2"><Button className="bg-[#76B900] hover:bg-[#5a8c00]" disabled={review.isPending} onClick={() => review.mutate({ id: entry.id, approve: true, note: notes[entry.id] || undefined })}><ShieldCheck className="mr-1.5 h-4 w-4" />Freigeben</Button><Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" disabled={review.isPending} onClick={() => review.mutate({ id: entry.id, approve: false, note: notes[entry.id] || undefined })}><XCircle className="mr-1.5 h-4 w-4" />Nicht freigeben</Button></div>
      </CardContent></Card>)}
    </div>}
  </div>;
}
