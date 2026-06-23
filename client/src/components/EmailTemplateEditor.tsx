import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, Mail, CheckCircle, XCircle, Clock, Info, AlertTriangle } from "lucide-react";

type TemplateType = "requirements" | "acceptance" | "rejection" | "fully_booked";

interface TemplateData {
  subject: string;
  body: string;
}

const TEMPLATE_CONFIG: Record<TemplateType, { label: string; description: string; icon: React.ReactNode; color: string }> = {
  requirements: {
    label: "Persönliche Hinweise/Anforderungen Erstgutachter:in",
    description: "Persönliche Hinweise und Anforderungen, die beim Erstkontakt mit Interessent:innen automatisch mitgesendet werden können.",
    icon: <Info className="h-4 w-4" />,
    color: "bg-blue-50 border-blue-200 text-blue-800",
  },
  acceptance: {
    label: "Zusage",
    description: "Bestätigt die Betreuung einer Abschlussarbeit.",
    icon: <CheckCircle className="h-4 w-4" />,
    color: "bg-green-50 border-green-200 text-green-800",
  },
  rejection: {
    label: "Absage",
    description: "Lehnt eine Betreuungsanfrage ab – mit oder ohne Begründung.",
    icon: <XCircle className="h-4 w-4" />,
    color: "bg-red-50 border-red-200 text-red-800",
  },
  fully_booked: {
    label: "Voll belegt / Abwesend",
    description: "Informiert über fehlende Kapazitäten oder Abwesenheit.",
    icon: <Clock className="h-4 w-4" />,
    color: "bg-amber-50 border-amber-200 text-amber-800",
  },
};

const VARIABLES = [
  { key: "{{name}}", label: "Name des Prüflings", example: "Max Mustermann" },
  { key: "{{thema}}", label: "Thema der Arbeit", example: "KI in der Bildung" },
  { key: "{{semester}}", label: "Zielsemester", example: "SoSe 2026" },
  { key: "{{studiengang}}", label: "Studiengang", example: "Informatik (B.Sc.)" },
];

export function EmailTemplateEditor() {
  const { data: templates, isLoading } = trpc.examinerEmailTemplates.getAll.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const saveMutation = trpc.examinerEmailTemplates.save.useMutation({
    onSuccess: () => {
      toast.success("Template gespeichert", { description: "Ihre Änderungen wurden erfolgreich gespeichert." });
      // Nach erfolgreichem Speichern: gespeicherten Tab als "sauber" markieren
      setSavedTemplates((prev) => ({
        ...prev,
        [activeTab]: { ...localTemplates[activeTab] },
      }));
    },
    onError: (err) => {
      toast.error("Fehler beim Speichern", { description: err.message });
    },
  });

  const [localTemplates, setLocalTemplates] = useState<Record<TemplateType, TemplateData>>({
    requirements: { subject: "", body: "" },
    acceptance: { subject: "", body: "" },
    rejection: { subject: "", body: "" },
    fully_booked: { subject: "", body: "" },
  });

  // Zuletzt gespeicherter Zustand (für Dirty-Erkennung)
  const [savedTemplates, setSavedTemplates] = useState<Record<TemplateType, TemplateData>>({
    requirements: { subject: "", body: "" },
    acceptance: { subject: "", body: "" },
    rejection: { subject: "", body: "" },
    fully_booked: { subject: "", body: "" },
  });

  const [activeTab, setActiveTab] = useState<TemplateType>("requirements");
  const [pendingTab, setPendingTab] = useState<TemplateType | null>(null);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  useEffect(() => {
    if (templates) {
      const tpls = templates as Record<TemplateType, TemplateData>;
      setLocalTemplates(tpls);
      setSavedTemplates(tpls);
    }
  }, [templates]);

  const isDirty = (type: TemplateType) => {
    return (
      localTemplates[type].subject !== savedTemplates[type].subject ||
      localTemplates[type].body !== savedTemplates[type].body
    );
  };

  const handleTabChange = (newTab: TemplateType) => {
    if (isDirty(activeTab)) {
      setPendingTab(newTab);
      setShowUnsavedWarning(true);
    } else {
      setActiveTab(newTab);
    }
  };

  const confirmTabChange = () => {
    if (pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
    setShowUnsavedWarning(false);
  };

  const cancelTabChange = () => {
    setPendingTab(null);
    setShowUnsavedWarning(false);
  };

  const handleChange = (type: TemplateType, field: "subject" | "body", value: string) => {
    setLocalTemplates((prev) => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }));
  };

  const handleSave = (type: TemplateType) => {
    saveMutation.mutate({
      templateType: type,
      subject: localTemplates[type].subject,
      body: localTemplates[type].body,
    });
  };

  const insertVariable = (variable: string, type: TemplateType) => {
    const textarea = document.getElementById(`body-${type}`) as HTMLTextAreaElement | null;
    if (!textarea) {
      handleChange(type, "body", localTemplates[type].body + variable);
      return;
    }
    const start = textarea.selectionStart ?? localTemplates[type].body.length;
    const end = textarea.selectionEnd ?? localTemplates[type].body.length;
    const newBody =
      localTemplates[type].body.slice(0, start) + variable + localTemplates[type].body.slice(end);
    handleChange(type, "body", newBody);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-muted animate-pulse rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Variablen-Übersicht */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            Verfügbare Variablen
          </CardTitle>
          <CardDescription className="text-xs">
            Fügen Sie diese Platzhalter in Betreff oder Text ein – sie werden beim Versand automatisch ersetzt.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {VARIABLES.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => insertVariable(v.key, activeTab)}
                className="group relative"
                title={`${v.label} – Beispiel: ${v.example}`}
              >
                <Badge
                  variant="secondary"
                  className="font-mono text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  {v.key}
                </Badge>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Klicken Sie auf eine Variable, um sie an der aktuellen Cursor-Position einzufügen.
          </p>
        </CardContent>
      </Card>

      {/* Warnung bei ungespeicherten Änderungen */}
      {showUnsavedWarning && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">Ungespeicherte Änderungen</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Das aktuelle Template wurde noch nicht gespeichert. Möchten Sie trotzdem wechseln?
            </p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={cancelTabChange}
                className="text-xs px-3 py-1.5 rounded-lg border border-amber-300 text-amber-800 hover:bg-amber-100 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={() => { handleSave(activeTab); confirmTabChange(); }}
                className="text-xs px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors"
              >
                Speichern &amp; wechseln
              </button>
              <button
                onClick={confirmTabChange}
                className="text-xs px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors"
              >
                Ohne Speichern wechseln
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template-Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as TemplateType)}>
        <TabsList className="grid grid-cols-4 w-full">
          {(Object.keys(TEMPLATE_CONFIG) as TemplateType[]).map((type) => {
            const cfg = TEMPLATE_CONFIG[type];
            const hasContent = localTemplates[type].subject || localTemplates[type].body;
            const dirty = isDirty(type);
            return (
              <TabsTrigger key={type} value={type} className="relative text-xs gap-1.5">
                {cfg.icon}
                <span className="hidden sm:inline">{cfg.label}</span>
                {hasContent && !dirty && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-500" />
                )}
                {dirty && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-500" />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {(Object.keys(TEMPLATE_CONFIG) as TemplateType[]).map((type) => {
          const cfg = TEMPLATE_CONFIG[type];
          const dirty = isDirty(type);
          return (
            <TabsContent key={type} value={type} className="space-y-4 mt-4">
              <div className={`rounded-md border px-4 py-3 text-sm flex items-start gap-2 ${cfg.color}`}>
                {cfg.icon}
                <div>
                  <span className="font-medium">{cfg.label}</span>
                  <span className="ml-2 text-xs opacity-80">{cfg.description}</span>
                </div>
              </div>

              {/* Speichertaste oben */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {dirty
                    ? <span className="text-amber-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Ungespeicherte Änderungen</span>
                    : <span className="text-green-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Gespeichert</span>}
                </p>
                <Button
                  onClick={() => handleSave(type)}
                  disabled={saveMutation.isPending || !dirty}
                  size="sm"
                  variant={dirty ? "default" : "outline"}
                >
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  {saveMutation.isPending ? "Wird gespeichert…" : "Template speichern"}
                </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Betreff</label>
                  <Input
                    placeholder={`z. B. „Ihre Anfrage zur Betreuung Ihrer Abschlussarbeit"`}
                    value={localTemplates[type].subject}
                    onChange={(e) => handleChange(type, "subject", e.target.value)}
                    maxLength={255}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">E-Mail-Text</label>
                  <Textarea
                    id={`body-${type}`}
                    placeholder={`Sehr geehrte/r {{name}},\n\n...`}
                    value={localTemplates[type].body}
                    onChange={(e) => handleChange(type, "body", e.target.value)}
                    rows={10}
                    className="font-mono text-sm resize-none overflow-y-auto"
                    style={{ maxHeight: "16rem" }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {localTemplates[type].body.length} Zeichen
                  </p>
                </div>

                {/* Vorschau */}
                {localTemplates[type].body && (
                  <Card className="bg-muted/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                        Vorschau (mit Beispielwerten)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-xs space-y-1">
                        <div className="font-medium">
                          Betreff:{" "}
                          {localTemplates[type].subject
                            .replace(/\{\{name\}\}/g, "Max Mustermann")
                            .replace(/\{\{thema\}\}/g, "KI in der Bildung")
                            .replace(/\{\{semester\}\}/g, "SoSe 2026")
                            .replace(/\{\{studiengang\}\}/g, "Informatik (B.Sc.)")}
                        </div>
                        <div className="border-t pt-1 whitespace-pre-wrap text-muted-foreground">
                          {localTemplates[type].body
                            .replace(/\{\{name\}\}/g, "Max Mustermann")
                            .replace(/\{\{thema\}\}/g, "KI in der Bildung")
                            .replace(/\{\{semester\}\}/g, "SoSe 2026")
                            .replace(/\{\{studiengang\}\}/g, "Informatik (B.Sc.)")}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Speichertaste unten */}
                <Button
                  onClick={() => handleSave(type)}
                  disabled={saveMutation.isPending || !dirty}
                  className="w-full sm:w-auto"
                  variant={dirty ? "default" : "outline"}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveMutation.isPending ? "Wird gespeichert…" : "Template speichern"}
                </Button>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
