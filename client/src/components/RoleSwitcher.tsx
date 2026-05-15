import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";

type Role = "admin" | "examiner" | "student";

const ROLE_LABELS: Record<Role, string> = {
  admin: "Verwaltung",
  examiner: "Prüfer:in",
  student: "Studierende:r",
};

const ROLE_COLORS: Record<Role, string> = {
  admin: "bg-red-100 text-red-800",
  examiner: "bg-blue-100 text-blue-800",
  student: "bg-green-100 text-green-800",
};

export function RoleSwitcher() {
  const [isOpen, setIsOpen] = useState(false);

  // Prüfe Superadmin-Status
  const { data: superadminStatus, isLoading: statusLoading } =
    trpc.superadmin.getSuperadminStatus.useQuery();

  // Rolle wechseln Mutation
  const switchRoleMutation = trpc.superadmin.switchRole.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        console.log(`Rolle gewechselt zu ${ROLE_LABELS[data.newRole as Role]}`);
        setIsOpen(false);
        // Seite neu laden um neue Rolle zu aktivieren
        setTimeout(() => window.location.reload(), 500);
      }
    },
    onError: (error) => {
      console.error("Fehler beim Rolle-Wechsel:", error.message);
      alert(`Fehler: ${error.message || "Rolle konnte nicht gewechselt werden"}`);
    },
  });

  if (statusLoading || !superadminStatus?.isSuperadmin) {
    return null;
  }

  const currentRole = (superadminStatus.currentRole || "admin") as Role;
  const availableRoles: Role[] = ["admin", "examiner", "student"];

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={switchRoleMutation.isPending}
        >
          <span
            className={`px-2 py-1 rounded text-xs font-semibold ${
              ROLE_COLORS[currentRole]
            }`}
          >
            {ROLE_LABELS[currentRole]}
          </span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Rolle wechseln (Superadmin)</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {availableRoles.map((role) => (
          <DropdownMenuItem
            key={role}
            onClick={() => {
              if (confirm(`Rolle zu ${ROLE_LABELS[role]} wechseln?`)) {
                switchRoleMutation.mutate({ targetRole: role });
              }
            }}
            disabled={role === currentRole || switchRoleMutation.isPending}
            className="cursor-pointer"
          >
            <span className={`px-2 py-1 rounded text-xs font-semibold mr-2 ${ROLE_COLORS[role]}`}>
              {ROLE_LABELS[role]}
            </span>
            {role === currentRole && <span className="text-xs text-gray-500">(aktuell)</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
