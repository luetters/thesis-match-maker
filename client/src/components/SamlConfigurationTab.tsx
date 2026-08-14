import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Copy, ExternalLink, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type SamlForm = {
  enabled: boolean;
  idpEntryPoint: string;
  idpIssuer: string;
  idpCertificate: string;
  spEntityId: string;
  acsUrl: string;
  emailAttribute: string;
  givenNameAttribute: string;
  surnameAttribute: string;
};

const emptyForm: SamlForm = {
  enabled: false,
  idpEntryPoint: "",
  idpIssuer: "",
  idpCertificate: "",
  spEntityId: "https://thesis.htw-berlin.com/saml/metadata",
  acsUrl: "https://thesis.htw-berlin.com/api/auth/saml/acs",
  emailAttribute: "mail",
  givenNameAttribute: "givenName",
  surnameAttribute: "sn",
};

export function SamlConfigurationTab() {
  const utils = trpc.useUtils();
  const configurationQuery = trpc.saml.configuration.useQuery();
  const [form, setForm] = useState<SamlForm>(emptyForm);

  useEffect(() => {
    if (!configurationQuery.data) return;
    const { ready: _ready, issues: _issues, ...configuration } = configurationQuery.data;
    setForm(configuration);
  }, [configurationQuery.data]);

  const saveMutation = trpc.saml.updateConfiguration.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.saml.configuration.invalidate(), utils.saml.status.invalidate()]);
      toast.success("SAML-Konfiguration gespeichert.");
    },
    onError: (error) => toast.error(error.message ?? "SAML-Konfiguration konnte nicht gespeichert werden."),
  });

  const update = <K extends keyof SamlForm>(key: K, value: SamlForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const issues = configurationQuery.data?.issues ?? [];
  const metadataUrl = form.acsUrl.replace(/\/api\/auth\/saml\/acs$/, "/api/auth/saml/metadata");

  if (configurationQuery.isLoading) return <div className="py-12 text-center text-sm text-gray-500">SAML-Konfiguration wird geladen …</div>;

  return (
    <div className="max-w-4xl space-y-6">
      <section className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-blue-700" />
          <div>
            <h2 className="font-semibold text-blue-950">Optionale HTW-Berlin-Web-Login-Anmeldung</h2>
            <p className="mt-1 text-sm leading-6 text-blue-900">Die lokale Anmeldung mit E-Mail und eigenem Portalpasswort bleibt bestehen. Erst nach vollständiger Konfiguration und ausdrücklicher Aktivierung erscheint die zusätzliche SAML-Anmeldung auf der Login-Seite.</p>
          </div>
        </div>
      </section>

      {form.enabled && issues.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex gap-2 font-semibold"><AlertCircle className="h-4 w-4" /> Aktivierung noch nicht möglich</div>
          <ul className="mt-2 list-disc space-y-1 pl-6">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
        </section>
      )}
      {!form.enabled && (
        <section className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">Die SAML-Anmeldung ist vorbereitet, aber deaktiviert. Es erfolgt keine Umleitung zum HTW-Berlin-Identity-Provider.</section>
      )}
      {form.enabled && issues.length === 0 && (
        <section className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800"><CheckCircle2 className="h-4 w-4" /> Die Konfiguration ist vollständig und kann für die Anmeldung verwendet werden.</section>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div>
            <h3 className="font-semibold text-gray-900">Service-Provider-Daten für die HTW Berlin</h3>
            <p className="mt-1 text-sm text-gray-500">Diese Werte werden an die Identity-Management-Stelle übermittelt.</p>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2">
            <Switch id="saml-enabled" checked={form.enabled} onCheckedChange={(value) => update("enabled", value)} />
            <Label htmlFor="saml-enabled" className="font-medium text-gray-800">SAML-Anmeldung aktivieren</Label>
          </div>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Field label="Service-Provider Entity ID" value={form.spEntityId} onChange={(value) => update("spEntityId", value)} hint="Stabile Kennung des Portals; bitte nicht ohne Abstimmung ändern." />
          <Field label="ACS-URL" value={form.acsUrl} onChange={(value) => update("acsUrl", value)} hint="Empfangsadresse für signierte SAML-Antworten." />
        </div>
        <div className="mt-5 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Metadaten des Service Providers</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <code className="break-all text-sm text-gray-700">{metadataUrl}</code>
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => { navigator.clipboard.writeText(metadataUrl); toast.success("Metadaten-URL kopiert."); }}><Copy className="h-3.5 w-3.5" /> Kopieren</Button>
            <a className="inline-flex items-center gap-1 text-sm font-medium text-[#76b900] hover:underline" href={metadataUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /> Öffnen</a>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900">Daten des HTW-Berlin-Identity-Providers</h3>
        <p className="mt-1 text-sm text-gray-500">Diese Angaben erhalten Sie von der zuständigen Identity-Management-Stelle der HTW Berlin.</p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Field label="SSO-URL (Entry Point)" value={form.idpEntryPoint} onChange={(value) => update("idpEntryPoint", value)} placeholder="https://weblogin.htw-berlin.de/..." />
          <Field label="IdP Entity ID" value={form.idpIssuer} onChange={(value) => update("idpIssuer", value)} placeholder="https://weblogin.htw-berlin.de/idp/shibboleth" />
        </div>
        <div className="mt-5">
          <Label htmlFor="idp-certificate">X.509-Signaturzertifikat des IdP</Label>
          <Textarea id="idp-certificate" className="mt-2 min-h-36 font-mono text-xs" placeholder="-----BEGIN CERTIFICATE-----" value={form.idpCertificate} onChange={(event) => update("idpCertificate", event.target.value)} />
          <p className="mt-1 text-xs text-gray-500">Öffentliches Zertifikat aus den IdP-Metadaten. Kein privater Schlüssel.</p>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900">Attributzuordnung</h3>
        <p className="mt-1 text-sm text-gray-500">Die E-Mail-Adresse wird benötigt, um eine bestehende lokale Person sicher zuzuordnen. Neue Konten werden über SAML nicht automatisch angelegt.</p>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <Field label="E-Mail-Attribut" value={form.emailAttribute} onChange={(value) => update("emailAttribute", value)} />
          <Field label="Vorname-Attribut" value={form.givenNameAttribute} onChange={(value) => update("givenNameAttribute", value)} />
          <Field label="Nachname-Attribut" value={form.surnameAttribute} onChange={(value) => update("surnameAttribute", value)} />
        </div>
      </section>

      <div className="flex justify-end">
        <Button className="gap-2 bg-[#76b900] text-white hover:bg-[#5a8c00]" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}><Save className="h-4 w-4" /> {saveMutation.isPending ? "Wird gespeichert …" : "SAML-Konfiguration speichern"}</Button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, hint, placeholder }: { label: string; value: string; onChange: (value: string) => void; hint?: string; placeholder?: string }) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return <div><Label htmlFor={id}>{label}</Label><Input id={id} className="mt-2" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />{hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}</div>;
}
