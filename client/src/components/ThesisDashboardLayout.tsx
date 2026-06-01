import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { LanguageSwitcher, useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

// ─── Passwort-ändern-Dialog ─────────────────────────────────────────────────
function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  const L = t.student;
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const changePassword = trpc.auth.changePassword.useMutation({
    onSuccess: () => setSuccess(true),
    onError: (e) => setError(e.message),
  });
  const handleSubmit = () => {
    setError("");
    if (newPassword !== confirm) { setError(L.passwordMismatch2); return; }
    if (newPassword.length < 8) { setError(L.passwordTooShort2); return; }
    changePassword.mutate({ currentPassword, newPassword });
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-gray-900 mb-5">{L.changePasswordTitle}</h2>
        {success ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: "#F1F8E9" }}>
              <svg className="w-6 h-6" style={{ color: "#76B900" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-gray-700 font-medium mb-4">{L.passwordChangedSuccess}</p>
            <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">{L.close}</button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{L.currentPasswordLabel}</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{L.newPasswordLabel}</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{L.confirmNewPasswordLabel}</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2" />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button onClick={handleSubmit} disabled={changePassword.isPending}
              className="w-full py-3 rounded-xl text-white font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "#76B900" }}>
              {changePassword.isPending ? L.passwordSaving : L.changePasswordTitle}
            </button>
            <button onClick={onClose} className="w-full text-sm text-gray-500 hover:text-gray-700">{L.cancel}</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    PENDING: { label: "Ausstehend", className: "bg-amber-100 text-amber-800 border border-amber-200" },
    ACCEPTED: { label: "Angenommen", className: "bg-primary/15 text-primary border border-primary/20" },
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

// ─── Notification Bell ────────────────────────────────────────────────────────
function NotificationBell() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data: unread = 0 } = trpc.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const { data: notifications = [] } = trpc.notifications.list.useQuery(undefined, {
    enabled: open,
  });
  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const typeIcon: Record<string, string> = {
    status_change: "🔄",
    examiner_assigned: "👤",
    expose_uploaded: "📄",
    system: "🔔",
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        aria-label={t.nav.notifications}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
            style={{ backgroundColor: "#76B900" }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">{t.nav.notifications}</h3>
            {unread > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-xs font-medium transition-colors hover:opacity-70"
                style={{ color: "#76B900" }}
              >
                {t.nav.markAllRead}
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">
                <svg className="w-8 h-8 mx-auto mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {t.nav.noNotifications}
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.read) markRead.mutate({ id: n.id });
                  }}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${
                    !n.read ? "bg-primary/5/40" : ""
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-base flex-shrink-0 mt-0.5">
                      {typeIcon[n.type] ?? "🔔"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 leading-snug">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(n.createdAt).toLocaleString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {!n.read && (
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                        style={{ backgroundColor: "#76B900" }}
                      />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
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
          : "text-gray-600 hover:text-gray-900 hover:bg-primary/5"
      }`}
      style={active ? { backgroundColor: "#76B900" } : undefined}
      aria-current={active ? "page" : undefined}
    >
      <span className="w-5 h-5 flex-shrink-0">{icon}</span>
      {label}
    </button>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
type NavEntry = { href: string; label: string; icon: React.ReactNode; onClick?: () => void };

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

  const { t } = useLanguage();
  const roleLabel: Record<string, string> = {
    student: t.nav.student,
    examiner: t.nav.examiner,
    admin: t.nav.admin,
    user: t.nav.student,
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
        style={{ backgroundColor: "#ffffff", borderRight: "1px solid #e5e7eb" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-200">
          <img
            src="/manus-storage/IconMaleMale_cce44535.webp"
            alt="Thesis Match Maker Logo"
            className="w-8 h-8 object-contain flex-shrink-0"
          />
          <div>
            <div className="text-sm font-bold text-gray-900 leading-tight">Thesis Match</div>
            <div className="text-xs text-gray-400 leading-tight">HTW Berlin · FB 3</div>
          </div>
        </div>

        {/* Role badge */}
        <div className="px-4 py-3 border-b border-gray-100">
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: "#76B900" }}
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
                if (item.onClick) item.onClick();
                onMobileClose();
              }}
            />
          ))}
        </nav>

        {/* User + Logout */}
        <div className="px-4 py-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: "#76B900" }}
            >
              {userName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{userName}</div>
              <div className="text-xs text-gray-400">{roleLabel[role] ?? role}</div>
            </div>
          </div>
          <a
            href="/profile"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-600 hover:text-[#76B900] hover:bg-primary/5 transition-all mb-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {t.nav.myProfile}
          </a>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {t.nav.logout}
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
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => navigate("/"),
  });

  // Profil-Dropdown schließen wenn außerhalb geklickt
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-primary rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">{t.nav.loading}</p>
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
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 h-16 flex items-center px-4 px-6 gap-4">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label={t.nav.openNav}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          <div className="ml-auto flex items-center gap-2">
            {/* Benachrichtigungs-Glocke */}
            <NotificationBell />
            <div className="w-px h-5 bg-gray-200" />
            <LanguageSwitcher />
            <div className="w-px h-5 bg-gray-200" />
            <button
              onClick={() => navigate("/")}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100"
            >
              {t.nav.home}
            </button>
            <div className="w-px h-5 bg-gray-200" />
            {/* Profil-Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setShowProfileMenu((v) => !v)}
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: "#76B900" }}>
                  {(user?.name ?? user?.email ?? "?").slice(0, 2).toUpperCase()}
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900 truncate">{user?.name ?? "Nutzer:in"}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email ?? ""}</p>
                  </div>
                  <a
                    href="/profile"
                    onClick={() => setShowProfileMenu(false)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {t.nav.myProfile}
                  </a>
                  {user?.loginMethod === "password" && (
                    <button
                      onClick={() => { setShowProfileMenu(false); setShowChangePassword(true); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      {t.nav.changePassword}
                    </button>
                  )}
                  <button
                    onClick={() => { setShowProfileMenu(false); logoutMutation.mutate(); }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    {t.nav.logout}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
      {showChangePassword && <ChangePasswordDialog onClose={() => setShowChangePassword(false)} />}
    </div>
  );
}
