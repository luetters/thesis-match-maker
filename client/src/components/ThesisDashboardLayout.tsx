import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";

// ─── Status Badge ─────────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    PENDING: { label: "Ausstehend", className: "bg-amber-100 text-amber-800 border border-amber-200" },
    ACCEPTED: { label: "Angenommen", className: "bg-green-100 text-green-800 border border-green-200" },
    REJECTED: { label: "Abgelehnt", className: "bg-red-100 text-red-800 border border-red-200" },
    MATCHED: { label: "Matched", className: "bg-blue-100 text-blue-800 border border-blue-200" },
  };
  const { label, className } = config[status] ?? { label: status, className: "bg-gray-100 text-gray-700" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}

// ─── Nav Item ─────────────────────────────────────────────────────────────────
function NavItem({
  href,
  label,
  icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
        active
          ? "text-white"
          : "text-white/60 hover:text-white hover:bg-white/10"
      }`}
      style={active ? { backgroundColor: "oklch(38.5% 0.12 152)" } : undefined}
      aria-current={active ? "page" : undefined}
    >
      <span className="w-5 h-5 flex-shrink-0">{icon}</span>
      {label}
    </button>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
type NavEntry = { href: string; label: string; icon: React.ReactNode };

function Sidebar({
  navItems,
  role,
  userName,
  onLogout,
  mobileOpen,
  onMobileClose,
}: {
  navItems: NavEntry[];
  role: string;
  userName: string;
  onLogout: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const [location, navigate] = useLocation();

  const roleLabel: Record<string, string> = {
    student: "Studierende:r",
    examiner: "Prüfer:in",
    admin: "Verwaltung",
    user: "Nutzer:in",
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 z-40 flex flex-col transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{ backgroundColor: "oklch(22% 0.06 250)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ backgroundColor: "oklch(38.5% 0.12 152)" }}
          >
            T
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-tight">Thesis Match</div>
            <div className="text-xs text-white/40 leading-tight">HTW Berlin · FB 3</div>
          </div>
        </div>

        {/* Role badge */}
        <div className="px-4 py-3 border-b border-white/10">
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: "oklch(38.5% 0.12 152)" }}
          >
            {roleLabel[role] ?? role}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={location === item.href}
              onClick={() => {
                navigate(item.href);
                onMobileClose();
              }}
            />
          ))}
        </nav>

        {/* User + Logout */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: "oklch(38.5% 0.12 152)" }}
            >
              {userName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-white truncate">{userName}</div>
              <div className="text-xs text-white/40">{roleLabel[role] ?? role}</div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Abmelden
          </button>
        </div>
      </aside>
    </>
  );
}

// ─── Main Layout ──────────────────────────────────────────────────────────────
export function ThesisDashboardLayout({
  children,
  navItems,
  title,
}: {
  children: React.ReactNode;
  navItems: NavEntry[];
  title: string;
}) {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => navigate("/"),
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "oklch(22% 0.06 250)" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <p className="text-white/60 text-sm">Lade...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        navItems={navItems}
        role={user?.role ?? "user"}
        userName={user?.name ?? user?.email ?? "Nutzer:in"}
        onLogout={() => logoutMutation.mutate()}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 h-16 flex items-center px-4 lg:px-6 gap-4">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Navigation öffnen"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => navigate("/")}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Startseite
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
