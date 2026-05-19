import { useState } from "react";
import { useLocation } from "wouter";
import { GraduationCap, BookOpen, Settings, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type RoleOption = {
  id: "student" | "examiner" | "admin";
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
};

const ROLE_OPTIONS: RoleOption[] = [
  {
    id: "student",
    label: "Studierende:r",
    description: "Ich möchte eine Abschlussarbeit anmelden und Prüfer:innen finden.",
    icon: <GraduationCap className="w-8 h-8" />,
    color: "text-[#006937]",
  },
  {
    id: "examiner",
    label: "Prüfer:in",
    description: "Ich betreue Abschlussarbeiten als Erst- oder Zweitprüfer:in.",
    icon: <BookOpen className="w-8 h-8" />,
    color: "text-blue-600",
  },
  {
    id: "admin",
    label: "Verwaltung",
    description: "Ich bin in der Studiengangs- oder Prüfungsverwaltung tätig.",
    icon: <Settings className="w-8 h-8" />,
    color: "text-purple-600",
  },
];

export default function SelectRole() {
  const [, navigate] = useLocation();
  const [selected, setSelected] = useState<"student" | "examiner" | "admin" | null>(null);
  const utils = trpc.useUtils();

  const selectRole = trpc.roleApproval.selectRole.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success("Ihre Rollenanfrage wurde eingereicht. Sie erhalten eine Benachrichtigung, sobald diese bestätigt wurde.");
      navigate("/role-pending");
    },
    onError: (err) => {
      toast.error(err.message ?? "Fehler beim Einreichen der Rollenanfrage.");
    },
  });

  const handleSubmit = () => {
    if (!selected) return;
    selectRole.mutate({ requestedRole: selected });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#006937] flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-gray-500 leading-none">HTW Berlin</p>
            <p className="text-sm font-semibold text-gray-900 leading-tight">Thesis Match Maker</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-10">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Willkommen bei HTW Berlin Thesis Match Maker</h1>
            <p className="text-gray-600">
              Bitte wählen Sie Ihre Rolle aus. Ihre Angabe wird von der Verwaltung oder dem Superadmin bestätigt,
              bevor Sie Zugriff auf alle Funktionen erhalten.
            </p>
          </div>

          <div className="grid gap-4 mb-8">
            {ROLE_OPTIONS.map((role) => (
              <Card
                key={role.id}
                className={`cursor-pointer transition-all border-2 ${
                  selected === role.id
                    ? "border-[#006937] bg-green-50 shadow-md"
                    : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                }`}
                onClick={() => setSelected(role.id)}
              >
                <CardContent className="flex items-center gap-4 p-5">
                  <div className={`flex-shrink-0 ${role.color}`}>{role.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{role.label}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{role.description}</p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all ${
                      selected === role.id
                        ? "border-[#006937] bg-[#006937]"
                        : "border-gray-300"
                    }`}
                  >
                    {selected === role.id && (
                      <div className="w-full h-full rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-sm text-amber-800">
            <strong>Hinweis:</strong> Ihre Rollenanfrage muss von der Verwaltung (für Studierende) oder dem Superadmin
            (für alle Rollen) bestätigt werden. Bis zur Bestätigung haben Sie eingeschränkten Zugriff.
          </div>

          <Button
            className="w-full bg-[#006937] hover:bg-[#005a2f] text-white py-3 text-base font-semibold"
            disabled={!selected || selectRole.isPending}
            onClick={handleSubmit}
          >
            {selectRole.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <ChevronRight className="w-5 h-5 mr-2" />
            )}
            Rolle beantragen
          </Button>
        </div>
      </main>
    </div>
  );
}
