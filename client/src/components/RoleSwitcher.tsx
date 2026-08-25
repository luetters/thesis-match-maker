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
import { getRoleBadge } from "@shared/const";
import { useLocation } from "wouter";

type Role = "admin" | "examiner" | "student";

const ROLE_LABELS: Record<Role, string> = {
  admin: "Verwaltung",
  examiner: "Prüfer:in",
  student: "Studierende:r",
};

const ROLE_PATHS: Record<Role, string> = {
  admin: "/admin",
  examiner: "/examiner",
  student: "/student",
};

function getViewRole(location: string): Role {
  if (location.startsWith("/examiner")) return "examiner";
  if (location.startsWith("/student")) return "student";
  return "admin";
}

export function RoleSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [location, setLocation] = useLocation();

  // Prüfe Superadmin-Status
  const { data: superadminStatus, isLoading: statusLoading } =
    trpc.superadmin.getSuperadminStatus.useQuery();

  // Rolle wechseln Mutation
  const switchRoleMutation = trpc.superadmin.switchRole.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        console.log(`Rolle gewechselt zu ${ROLE_LABELS[data.newRole as Role]}`);
        setIsOpen(false);
        setLocation(ROLE_PATHS[data.newRole as Role]);
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

  const currentRole = getViewRole(location);
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
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRoleBadge(currentRole).className}`}>
            {ROLE_LABELS[currentRole]}
          </span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Ansicht wechseln (Superadmin)</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {availableRoles.map((role) => (
          <DropdownMenuItem
            key={role}
            onClick={() => {
              if (confirm(`Ansicht zu ${ROLE_LABELS[role]} wechseln?`)) {
                switchRoleMutation.mutate({ targetRole: role, previousView: currentRole });
              }
            }}
            disabled={role === currentRole || switchRoleMutation.isPending}
            className="cursor-pointer"
          >
            <span className={`px-2 py-1 rounded-full text-xs font-semibold mr-2 ${getRoleBadge(role).className}`}>
              {ROLE_LABELS[role]}
            </span>
            {role === currentRole && <span className="text-xs text-gray-500">(aktuell)</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
