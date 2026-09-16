import { useState } from "react";
import { Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { getPasswordStrength } from "@shared/passwordPolicy";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  show,
  onToggle,
  showLabel,
  hideLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  show: boolean;
  onToggle: () => void;
  showLabel: string;
  hideLabel: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          required
          maxLength={128}
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 pr-11 text-sm text-gray-900 focus:border-[#76b900] focus:outline-none focus:ring-2 focus:ring-[#76b900]/25"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#76b900]/35"
          aria-label={show ? hideLabel : showLabel}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export function PasswordSecurityPanel() {
  const { lang } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const strength = getPasswordStrength(newPassword);
  const passwordMatches = Boolean(confirmPassword) && newPassword === confirmPassword;
  const changePassword = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success(lang === "de" ? "Ihr Passwort wurde geändert." : "Your password has been changed.");
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!passwordMatches) {
      toast.error(lang === "de" ? "Die neuen Passwörter stimmen nicht überein." : "The new passwords do not match.");
      return;
    }
    if (!strength.meetsRequirements) {
      toast.error(lang === "de" ? "Bitte erfüllen Sie zunächst die angezeigten Passwortanforderungen." : "Please meet the displayed password requirements first.");
      return;
    }
    changePassword.mutate({ currentPassword, newPassword });
  };

  const copy = lang === "de"
    ? {
        title: "Passwort und Kontosicherheit",
        description: "Sie verwalten hier ausschließlich Ihr eigenes Portalpasswort. Verwenden Sie niemals Ihr HTW Berlin-Passwort.",
        current: "Aktuelles Passwort",
        next: "Neues Passwort",
        confirm: "Neues Passwort wiederholen",
        change: "Passwort sicher ändern",
        mismatch: "Die neuen Passwörter stimmen nicht überein.",
        safety: "Passwörter werden ausschließlich als kryptografische Hashwerte verarbeitet. Für Änderungen ist immer das aktuelle Passwort erforderlich.",
        show: "Passwort anzeigen",
        hide: "Passwort verbergen",
      }
    : {
        title: "Password and account security",
        description: "Manage only your own portal password here. Never use your HTW Berlin password.",
        current: "Current password",
        next: "New password",
        confirm: "Repeat new password",
        change: "Change password securely",
        mismatch: "The new passwords do not match.",
        safety: "Passwords are processed only as cryptographic hashes. Your current password is always required for changes.",
        show: "Show password",
        hide: "Hide password",
      };

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm" aria-labelledby="password-security-title">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f2f9e5] text-[#5d9200]">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <h2 id="password-security-title" className="text-base font-semibold text-gray-900">{copy.title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">{copy.description}</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <PasswordField label={copy.current} value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" show={showCurrent} onToggle={() => setShowCurrent((value) => !value)} showLabel={copy.show} hideLabel={copy.hide} />
        <PasswordField label={copy.next} value={newPassword} onChange={setNewPassword} autoComplete="new-password" show={showNew} onToggle={() => setShowNew((value) => !value)} showLabel={copy.show} hideLabel={copy.hide} />
        <PasswordStrengthIndicator password={newPassword} lang={lang} />
        <PasswordField label={copy.confirm} value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" show={showConfirm} onToggle={() => setShowConfirm((value) => !value)} showLabel={copy.show} hideLabel={copy.hide} />
        {confirmPassword && !passwordMatches && <p className="text-xs font-medium text-red-600" role="alert">{copy.mismatch}</p>}
        <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex max-w-xl items-start gap-1.5 text-xs leading-relaxed text-gray-500">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#5d9200]" />
            {copy.safety}
          </p>
          <button
            type="submit"
            disabled={changePassword.isPending || !currentPassword || !passwordMatches || !strength.meetsRequirements}
            className="shrink-0 rounded-xl bg-[#76b900] px-4 py-2.5 text-sm font-semibold text-gray-950 transition-colors hover:bg-[#8dce21] focus:outline-none focus:ring-2 focus:ring-[#76b900]/45 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {changePassword.isPending ? (lang === "de" ? "Wird geändert …" : "Changing …") : copy.change}
          </button>
        </div>
      </form>
    </section>
  );
}
