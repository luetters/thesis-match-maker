import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

type LinkDraft = { title: string; url: string; description: string };
const emptyLink = (): LinkDraft => ({ title: "", url: "", description: "" });
const isHttpUrl = (value: string) => { try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:"; } catch { return false; } };

export default function ProgrammeManagement() {
  const { user, loading } = useAuth();
  const { lang } = useLanguage();
  const isDE = lang === "de";
  const isSuperadmin = user?.role === "superadmin";
  const canAssign = isSuperadmin || user?.role === "admin";
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<number | null>(null);
  const [information, setInformation] = useState("");
  const [links, setLinks] = useState<LinkDraft[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<{ name: string; abbreviation: string; level: "bachelor" | "master"; fachbereich: string; information: string; isPublished: boolean }>({ name: "", abbreviation: "", level: "bachelor", fachbereich: "FB3", information: "", isPublished: true });
  const [speakerId, setSpeakerId] = useState("");
  const [adminId, setAdminId] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const { data: programmes, isLoading: programmesLoading, refetch: refetchProgrammes } = trpc.programmes.myContentProgrammes.useQuery(undefined, { enabled: !!user });
  useEffect(() => { if (!selectedProgrammeId && programmes?.[0]) setSelectedProgrammeId(programmes[0].id); }, [programmes, selectedProgrammeId]);
  const { data: detail, refetch: refetchDetail } = trpc.programmes.managementDetail.useQuery({ programmeId: selectedProgrammeId ?? 0 }, { enabled: !!selectedProgrammeId });
  const { data: speakers } = trpc.programmes.assignableUsers.useQuery({ programmeId: selectedProgrammeId ?? 0, managerType: "speaker" }, { enabled: !!selectedProgrammeId && canAssign });
  const { data: admins } = trpc.programmes.assignableUsers.useQuery({ programmeId: selectedProgrammeId ?? 0, managerType: "admin" }, { enabled: !!selectedProgrammeId && isSuperadmin });
  const createMutation = trpc.programmes.createManaged.useMutation({ onSuccess: ({ programmeId }) => { toast.success(isDE ? "Studiengang angelegt" : "Programme created"); setShowCreate(false); setSelectedProgrammeId(programmeId); refetchProgrammes(); } });
  const updateManagedMutation = trpc.programmes.updateManaged.useMutation({ onSuccess: () => { toast.success(isDE ? "Stammdaten gespeichert" : "Programme data saved"); refetchProgrammes(); refetchDetail(); } });
  const updateContentMutation = trpc.programmes.updatePublicContent.useMutation({ onSuccess: () => { toast.success(isDE ? "Öffentliche Inhalte gespeichert" : "Public content saved"); refetchDetail(); } });
  const assignMutation = trpc.programmes.assignContentManager.useMutation({ onSuccess: () => { toast.success(isDE ? "Zuordnung gespeichert" : "Assignment saved"); setSpeakerId(""); setAdminId(""); refetchDetail(); } });
  const removeMutation = trpc.programmes.removeContentManager.useMutation({ onSuccess: () => { toast.success(isDE ? "Zuordnung entfernt" : "Assignment removed"); refetchDetail(); } });

  useEffect(() => {
    if (!detail) return;
    setInformation(detail.programme.information ?? "");
    setLinks(detail.links.map((link) => ({ title: link.title, url: link.url, description: link.description ?? "" })));
  }, [detail?.programme.id]);

  const saveContent = () => {
    if (!selectedProgrammeId || links.some((link) => !link.title.trim() || !isHttpUrl(link.url))) {
      toast.error(isDE ? "Bitte geben Sie für jeden Link einen Titel und eine gültige HTTP(S)-Adresse an." : "Please provide a title and a valid HTTP(S) address for every link.");
      return;
    }
    updateContentMutation.mutate({ programmeId: selectedProgrammeId, information: information.trim() || null, links: links.map((link) => ({ title: link.title.trim(), url: link.url.trim(), description: link.description.trim() || undefined })) });
  };

  const uploadLogo = async (file: File) => {
    if (!selectedProgrammeId) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      toast.error(isDE ? "Bitte wählen Sie ein PNG-, JPEG- oder WebP-Bild mit maximal 5 MB." : "Please choose a PNG, JPEG or WebP image of up to 5 MB.");
      return;
    }
    setUploadingLogo(true);
    try {
      const body = new FormData(); body.append("logo", file);
      const response = await fetch(`/api/upload/programme-logo/${selectedProgrammeId}`, { method: "POST", body, credentials: "include" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error ?? `HTTP ${response.status}`);
      toast.success(isDE ? "Studiengangslogo gespeichert" : "Programme logo saved");
      refetchProgrammes(); refetchDetail();
    } catch (error) { toast.error(error instanceof Error ? error.message : (isDE ? "Logo-Upload fehlgeschlagen" : "Logo upload failed")); }
    finally { setUploadingLogo(false); }
  };

  if (loading || programmesLoading) return <main className="min-h-screen grid place-items-center text-slate-500">{isDE ? "Verwaltung wird geladen …" : "Loading management …"}</main>;
  if (!user) return <main className="min-h-screen grid place-items-center"><Link href="/login" className="text-[#4f7d00] underline">{isDE ? "Bitte anmelden" : "Please sign in"}</Link></main>;

  return (
    <main className="min-h-screen bg-[#f7f9f5] text-slate-900">
      <header className="border-b border-slate-200 bg-white"><div className="mx-auto max-w-7xl px-5 py-4 flex justify-between gap-4"><div><p className="text-sm font-semibold text-[#28517a]">HTW Berlin</p><h1 className="text-xl font-semibold">{isDE ? "Studiengangsverwaltung" : "Programme management"}</h1></div><div className="flex items-center gap-4"><Link href="/studiengaenge" className="text-sm text-slate-600 hover:underline">{isDE ? "Öffentliche Seiten" : "Public pages"}</Link><Link href={isSuperadmin ? "/superadmin" : "/admin"} className="text-sm text-slate-600 hover:underline">{isDE ? "Zum Dashboard" : "To dashboard"}</Link></div></div></header>
      <div className="mx-auto max-w-7xl px-5 py-8 grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
        <aside className="h-fit bg-white border border-slate-200 p-4">
          <div className="flex items-center justify-between gap-2 mb-4"><h2 className="font-semibold">{isDE ? "Studiengänge" : "Programmes"}</h2>{isSuperadmin && <button onClick={() => setShowCreate(true)} className="text-sm bg-[#76b900] text-white px-3 py-1.5">{isDE ? "Anlegen" : "Create"}</button>}</div>
          <div className="space-y-1">{(programmes ?? []).map((programme) => <button key={programme.id} onClick={() => setSelectedProgrammeId(programme.id)} className={`w-full text-left px-3 py-3 border transition-colors ${selectedProgrammeId === programme.id ? "border-[#76b900] bg-[#fbfff1]" : "border-transparent hover:bg-slate-50"}`}><span className="block text-xs font-semibold text-[#5e9200]">{programme.fachbereich} · {programme.level === "master" ? "Master" : "Bachelor"}</span><span className="block mt-1 text-sm font-medium">{programme.name}</span>{programme.isPublished !== 1 && <span className="mt-1 inline-block text-xs text-amber-700">{isDE ? "Nicht veröffentlicht" : "Not published"}</span>}</button>)}</div>
          {(programmes ?? []).length === 0 && <p className="text-sm text-slate-500 py-4">{isDE ? "Keine zugeordneten Studiengänge." : "No programmes assigned."}</p>}
        </aside>
        <section className="min-w-0 bg-white border border-slate-200 p-6">
          {!detail ? <div className="py-20 text-center text-slate-500">{isDE ? "Wählen Sie einen Studiengang aus." : "Select a programme."}</div> : <div className="space-y-8">
            <div className="flex flex-col sm:flex-row gap-5 sm:items-start"><div className="h-24 w-24 shrink-0 border border-slate-200 bg-slate-50 grid place-items-center overflow-hidden">{detail.programme.logoUrl || detail.programme.pictogramUrl ? <img src={detail.programme.logoUrl || detail.programme.pictogramUrl || ""} alt="" className="h-full w-full object-contain" /> : <span className="text-[#5e9200] font-bold">{detail.programme.abbreviation.slice(0, 4)}</span>}</div><div className="flex-1"><p className="text-sm font-semibold text-[#5e9200]">{detail.programme.fachbereich} · {detail.programme.level === "master" ? "Master" : "Bachelor"}</p><h2 className="mt-1 text-2xl font-semibold">{detail.programme.name}</h2><p className="mt-1 text-slate-500">{detail.programme.abbreviation}</p>{isSuperadmin && <><input ref={logoInputRef} className="hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void uploadLogo(file); }} /><button disabled={uploadingLogo} onClick={() => logoInputRef.current?.click()} className="mt-3 text-sm border border-[#76b900] text-[#4f7d00] px-3 py-1.5 disabled:opacity-50">{uploadingLogo ? (isDE ? "Upload …" : "Uploading …") : (isDE ? "Logo hochladen oder ersetzen" : "Upload or replace logo")}</button></>}</div></div>
            {isSuperadmin && <div className="grid gap-3 border-t border-slate-100 pt-6 sm:grid-cols-2"><label className="text-sm text-slate-700">{isDE ? "Veröffentlichung" : "Publication"}<select value={detail.programme.isPublished === 1 ? "published" : "draft"} onChange={(event) => updateManagedMutation.mutate({ programmeId: detail.programme.id, isPublished: event.target.value === "published" })} className="mt-1 block w-full border border-slate-300 px-3 py-2"><option value="published">{isDE ? "Veröffentlicht" : "Published"}</option><option value="draft">{isDE ? "Entwurf" : "Draft"}</option></select></label><label className="text-sm text-slate-700">{isDE ? "Reihenfolge" : "Order"}<input type="number" defaultValue={detail.programme.sortOrder} onBlur={(event) => updateManagedMutation.mutate({ programmeId: detail.programme.id, sortOrder: Number(event.target.value) || 0 })} className="mt-1 block w-full border border-slate-300 px-3 py-2" /></label></div>}
            <div className="border-t border-slate-100 pt-6"><h3 className="font-semibold">{isDE ? "Öffentliche Information" : "Public information"}</h3><textarea value={information} onChange={(event) => setInformation(event.target.value)} maxLength={5000} rows={7} disabled={!isSuperadmin && !detail.managers.some((manager) => manager.userId === user.id)} className="mt-3 w-full border border-slate-300 px-3 py-2 disabled:bg-slate-50" placeholder={isDE ? "Allgemeine Informationen zum Studiengang" : "General programme information"} /></div>
            <div className="border-t border-slate-100 pt-6"><div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold">{isDE ? "Links, Empfehlungen und Tipps" : "Links, recommendations and tips"}</h3><p className="mt-1 text-sm text-slate-500">{isDE ? "Nur öffentliche HTTP(S)-Links." : "Public HTTP(S) links only."}</p></div><button onClick={() => setLinks((items) => [...items, emptyLink()])} disabled={!isSuperadmin && !detail.managers.some((manager) => manager.userId === user.id)} className="text-sm border border-[#76b900] text-[#4f7d00] px-3 py-1.5">{isDE ? "Link hinzufügen" : "Add link"}</button></div><div className="mt-4 space-y-3">{links.map((link, index) => <div key={index} className="grid gap-2 rounded border border-slate-200 p-3 md:grid-cols-[1fr_1fr_auto]"><input value={link.title} onChange={(event) => setLinks((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item))} placeholder={isDE ? "Titel" : "Title"} className="border border-slate-300 px-3 py-2 text-sm" /><input value={link.url} onChange={(event) => setLinks((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item))} placeholder="https://…" className="border border-slate-300 px-3 py-2 text-sm" /><button onClick={() => setLinks((items) => items.filter((_, itemIndex) => itemIndex !== index))} className="text-sm text-red-700">{isDE ? "Löschen" : "Delete"}</button><textarea value={link.description} onChange={(event) => setLinks((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item))} placeholder={isDE ? "Beschreibung (optional)" : "Description (optional)"} className="md:col-span-2 border border-slate-300 px-3 py-2 text-sm" /></div>)}</div>{(isSuperadmin || detail.managers.some((manager) => manager.userId === user.id)) && <button disabled={updateContentMutation.isPending} onClick={saveContent} className="mt-4 bg-[#76b900] text-white px-4 py-2 disabled:opacity-50">{updateContentMutation.isPending ? (isDE ? "Speichern …" : "Saving …") : (isDE ? "Inhalte speichern" : "Save content")}</button>}</div>
            {canAssign && <div className="border-t border-slate-100 pt-6"><h3 className="font-semibold">{isDE ? "Berechtigte Personen" : "Authorised people"}</h3><p className="mt-1 text-sm text-slate-500">{isDE ? "Studiengangsleitungen und zugeordnete Verwaltung dürfen Inhalte dieses Studiengangs pflegen." : "Programme management and assigned administration can maintain this programme's content."}</p><div className="mt-4 grid gap-4 lg:grid-cols-2"><div className="border border-slate-200 p-4"><h4 className="font-medium">{isDE ? "Studiengangsleitung" : "Programme management"}</h4><div className="mt-3 flex gap-2"><select value={speakerId} onChange={(event) => setSpeakerId(event.target.value)} className="min-w-0 flex-1 border border-slate-300 px-2 py-2 text-sm"><option value="">{isDE ? "Person auswählen" : "Select person"}</option>{(speakers ?? []).map((entry) => <option value={entry.id} key={entry.id}>{entry.name || entry.email}</option>)}</select><button disabled={!speakerId} onClick={() => selectedProgrammeId && assignMutation.mutate({ programmeId: selectedProgrammeId, userId: Number(speakerId), managerType: "speaker" })} className="bg-[#76b900] text-white px-3 text-sm disabled:opacity-50">{isDE ? "Zuordnen" : "Assign"}</button></div></div>{isSuperadmin && <div className="border border-slate-200 p-4"><h4 className="font-medium">{isDE ? "Verwaltung" : "Administration"}</h4><div className="mt-3 flex gap-2"><select value={adminId} onChange={(event) => setAdminId(event.target.value)} className="min-w-0 flex-1 border border-slate-300 px-2 py-2 text-sm"><option value="">{isDE ? "Person auswählen" : "Select person"}</option>{(admins ?? []).map((entry) => <option value={entry.id} key={entry.id}>{entry.name || entry.email}</option>)}</select><button disabled={!adminId} onClick={() => selectedProgrammeId && assignMutation.mutate({ programmeId: selectedProgrammeId, userId: Number(adminId), managerType: "admin" })} className="bg-[#76b900] text-white px-3 text-sm disabled:opacity-50">{isDE ? "Zuordnen" : "Assign"}</button></div></div>}</div><div className="mt-4 divide-y divide-slate-100 border border-slate-200">{detail.managers.map((manager) => <div key={manager.id} className="flex items-center justify-between gap-3 px-4 py-3"><div><p className="text-sm font-medium">{manager.name || manager.email}</p><p className="text-xs text-slate-500">{manager.managerType === "speaker" ? (isDE ? "Studiengangsleitung" : "Programme management") : (isDE ? "Verwaltung" : "Administration")}</p></div><button onClick={() => selectedProgrammeId && removeMutation.mutate({ programmeId: selectedProgrammeId, managerId: manager.id })} className="text-sm text-red-700">{isDE ? "Entfernen" : "Remove"}</button></div>)}</div></div>}
          </div>}
        </section>
      </div>
      {showCreate && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4"><div className="w-full max-w-xl bg-white p-6 shadow-xl"><div className="flex items-start justify-between"><div><h2 className="text-xl font-semibold">{isDE ? "Studiengang anlegen" : "Create programme"}</h2><p className="mt-1 text-sm text-slate-500">{isDE ? "Nur Superadmins können neue Studiengänge anlegen." : "Only superadmins can create programmes."}</p></div><button onClick={() => setShowCreate(false)} className="text-slate-500">×</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-sm">{isDE ? "Name" : "Name"}<input value={createForm.name} onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })} className="mt-1 w-full border border-slate-300 px-3 py-2" /></label><label className="text-sm">{isDE ? "Kürzel" : "Abbreviation"}<input value={createForm.abbreviation} onChange={(event) => setCreateForm({ ...createForm, abbreviation: event.target.value })} className="mt-1 w-full border border-slate-300 px-3 py-2" /></label><label className="text-sm">{isDE ? "Fachbereich" : "Department"}<select value={createForm.fachbereich} onChange={(event) => setCreateForm({ ...createForm, fachbereich: event.target.value })} className="mt-1 w-full border border-slate-300 px-3 py-2">{["FB1", "FB2", "FB3", "FB4", "FB5"].map((department) => <option key={department}>{department}</option>)}</select></label><label className="text-sm">{isDE ? "Abschluss" : "Level"}<select value={createForm.level} onChange={(event) => setCreateForm({ ...createForm, level: event.target.value as "bachelor" | "master" })} className="mt-1 w-full border border-slate-300 px-3 py-2"><option value="bachelor">Bachelor</option><option value="master">Master</option></select></label><label className="text-sm sm:col-span-2">{isDE ? "Allgemeine Information" : "General information"}<textarea value={createForm.information} onChange={(event) => setCreateForm({ ...createForm, information: event.target.value })} rows={4} className="mt-1 w-full border border-slate-300 px-3 py-2" /></label><label className="sm:col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={createForm.isPublished} onChange={(event) => setCreateForm({ ...createForm, isPublished: event.target.checked })} />{isDE ? "Sofort veröffentlichen" : "Publish immediately"}</label></div><div className="mt-6 flex justify-end gap-3"><button onClick={() => setShowCreate(false)} className="border border-slate-300 px-4 py-2">{isDE ? "Abbrechen" : "Cancel"}</button><button disabled={!createForm.name.trim() || !createForm.abbreviation.trim() || createMutation.isPending} onClick={() => createMutation.mutate({ ...createForm, information: createForm.information.trim() || undefined })} className="bg-[#76b900] px-4 py-2 text-white disabled:opacity-50">{createMutation.isPending ? (isDE ? "Wird angelegt …" : "Creating …") : (isDE ? "Anlegen" : "Create")}</button></div></div></div>}
    </main>
  );
}
