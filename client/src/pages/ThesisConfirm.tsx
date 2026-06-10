/**
 * ThesisConfirm.tsx
 * Öffentliche Seite für Studierende, die per E-Mail eingeladen wurden.
 * URL: /thesis/confirm?token=<token>
 *
 * Flow:
 * 1. Token aus URL lesen → Entwurf laden
 * 2. Wenn nicht eingeloggt → Login-Hinweis + Weiterleitung
 * 3. Formular mit vorausgefüllten Daten (editierbar)
 * 4. Bestätigung → Status wechselt zu PENDING_SECOND_EXAMINER
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle, AlertCircle, Loader2, GraduationCap, User, Calendar, Globe } from "lucide-react";

function getNextSemesters(): { label: string; value: string }[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  let startYear = currentYear;
  let startSemester = currentMonth >= 10 ? "WS" : currentMonth >= 4 ? "SoSe" : "WS";
  if (startSemester === "WS" && currentMonth < 10) startYear -= 1;
  const semesters = [];
  for (let i = 0; i < 6; i++) {
    if (startSemester === "WS") {
      semesters.push({ label: `WS ${startYear}/${startYear + 1}`, value: `WS${startYear}` });
      startYear += 1;
      startSemester = "SoSe";
    } else {
      semesters.push({ label: `SoSe ${startYear}`, value: `SoSe${startYear}` });
      startSemester = "WS";
    }
  }
  return semesters;
}

export default function ThesisConfirm() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();

  // Token aus URL
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") ?? "";

  // Entwurf laden
  const { data: draft, isLoading: draftLoading, error: draftError } = trpc.invite.getDraft.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  // Formular-State (vorausgefüllt aus Entwurf)
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [abstract, setAbstract] = useState("");
  const [targetSemester, setTargetSemester] = useState("");
  const [language, setLanguage] = useState<"de" | "en">("de");
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (draft) {
      setTitle(draft.title ?? "");
      setDescription(draft.description ?? "");
      setTargetSemester(draft.targetSemester ?? "");
      setLanguage((draft.language as "de" | "en") ?? "de");
    }
  }, [draft]);

  const confirmMutation = trpc.invite.confirmDraft.useMutation({
    onSuccess: () => {
      setConfirmed(true);
      toast.success("Antrag erfolgreich bestätigt! Die Suche nach einer Zweitgutachter:in beginnt nun.");
    },
    onError: (err) => {
      toast.error(err.message ?? "Fehler beim Bestätigen des Antrags.");
    },
  });

  // Noch nicht eingeloggt
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#F1F8E9" }}>
            <GraduationCap className="w-7 h-7" style={{ color: "#76B900" }} />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Anmeldung erforderlich</h1>
          <p className="text-gray-600 text-sm mb-6">
            Bitte melden Sie sich mit Ihrem HTW-Berlin-Konto an, um den Antrag zu bestätigen.
            Sie werden danach automatisch zurückgeleitet.
          </p>
          <Button
            className="w-full text-white font-semibold"
            style={{ backgroundColor: "#76B900" }}
            onClick={() => {
              window.location.href = getLoginUrl(`/thesis/confirm?token=${token}`);
            }}
          >
            Jetzt anmelden
          </Button>
        </div>
      </div>
    );
  }

  if (draftLoading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (draftError || !draft) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Einladung nicht gefunden</h1>
          <p className="text-gray-600 text-sm">
            Der Einladungslink ist ungültig oder abgelaufen. Bitte wenden Sie sich an Ihre Erstgutachter:in.
          </p>
        </div>
      </div>
    );
  }

  if (confirmed || draft.studentConfirmedAt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#F1F8E9" }}>
            <CheckCircle className="w-7 h-7" style={{ color: "#76B900" }} />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Antrag bestätigt</h1>
          <p className="text-gray-600 text-sm mb-6">
            Ihr Antrag wurde erfolgreich bestätigt. Die Suche nach einer Zweitgutachter:in wurde gestartet.
            Sie erhalten eine Benachrichtigung, sobald eine Zusage vorliegt.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate("/student")}
          >
            Zum Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const semesters = getNextSemesters();

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#76B900" }}>
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">HTW Berlin</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Antrag zur Abschlussarbeit bestätigen</h1>
          <p className="text-gray-600 text-sm">
            <strong>{draft.examinerName}</strong> hat einen Antrag für Ihre Abschlussarbeit angelegt.
            Bitte prüfen Sie die Angaben, ergänzen Sie fehlende Informationen und bestätigen Sie den Antrag.
          </p>
        </div>

        {/* Formular */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
          {/* Hinweis-Banner */}
          <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: "#F1F8E9", color: "#4a7c00" }}>
            <p className="font-semibold mb-1">Wichtiger Hinweis</p>
            <p>
              Erst nach Ihrer Bestätigung beginnt die Suche nach einer Zweitgutachter:in.
              Sie können Titel und Beschreibung noch anpassen.
            </p>
          </div>

          {/* Erstgutachter:in */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-200">
              <User className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Erstgutachter:in</p>
              <p className="font-semibold text-gray-900 text-sm">{draft.examinerName}</p>
              <p className="text-xs text-gray-500">{draft.examinerEmail}</p>
            </div>
          </div>

          {/* Titel */}
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-sm font-semibold text-gray-700">
              Thema der Abschlussarbeit <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titel der Abschlussarbeit"
              className="text-sm"
            />
          </div>

          {/* Beschreibung */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-sm font-semibold text-gray-700">
              Beschreibung / Aufgabenstellung <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kurze Beschreibung der Aufgabenstellung"
              rows={4}
              className="text-sm resize-none"
            />
          </div>

          {/* Abstract (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="abstract" className="text-sm font-semibold text-gray-700">
              Abstract <span className="text-gray-400 font-normal">(optional)</span>
            </Label>
            <Textarea
              id="abstract"
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              placeholder="Zusammenfassung der geplanten Arbeit (max. 2000 Zeichen)"
              rows={4}
              className="text-sm resize-none"
              maxLength={2000}
            />
            <p className="text-xs text-gray-400 text-right">{abstract.length}/2000</p>
          </div>

          {/* Semester + Sprache */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Zielsemester
              </Label>
              <Select value={targetSemester} onValueChange={setTargetSemester}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Semester wählen" />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                Sprache der Arbeit
              </Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as "de" | "en")}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="en">Englisch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fachbereich (read-only) */}
          <div className="p-3 rounded-xl bg-gray-50 text-sm">
            <span className="text-gray-500">Fachbereich: </span>
            <span className="font-semibold text-gray-900">{draft.department}</span>
            <span className="mx-2 text-gray-300">·</span>
            <span className="text-gray-500">Abschluss: </span>
            <span className="font-semibold text-gray-900">
              {draft.degreeType === "bachelor" ? "Bachelor" : "Master"}
            </span>
          </div>

          {/* Bestätigen-Button */}
          <Button
            className="w-full text-white font-semibold py-3 text-base"
            style={{ backgroundColor: "#76B900" }}
            disabled={!title.trim() || !description.trim() || confirmMutation.isPending}
            onClick={() => {
              confirmMutation.mutate({
                token,
                title: title.trim(),
                description: description.trim(),
                abstract: abstract.trim() || undefined,
                targetSemester: targetSemester || undefined,
                language,
              });
            }}
          >
            {confirmMutation.isPending ? (
              <span className="flex items-center gap-2 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                Wird bestätigt…
              </span>
            ) : (
              "Antrag bestätigen und Zweitgutachter:in-Suche starten"
            )}
          </Button>

          <p className="text-xs text-gray-400 text-center">
            Mit der Bestätigung stimmen Sie zu, dass die Angaben korrekt sind.
            Die Suche nach einer Zweitgutachter:in beginnt unmittelbar nach Ihrer Bestätigung.
          </p>
        </div>
      </div>
    </div>
  );
}
