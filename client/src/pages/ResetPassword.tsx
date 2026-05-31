import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function ResetPassword() {
  const [, navigate] = useLocation();
  // Token aus URL-Query-Parameter lesen
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [success, setSuccess] = useState(false);

  const resetMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => setSuccess(true),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return;
    await resetMutation.mutateAsync({ token, newPassword: password });
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#f5f7f5] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Ungültiger Link</h2>
          <p className="text-gray-500 text-sm">Dieser Passwort-Reset-Link ist ungültig oder abgelaufen.</p>
          <button onClick={() => navigate("/")} className="mt-5 w-full py-2.5 bg-[#76B900] text-white rounded-lg text-sm font-semibold hover:bg-[var(--primary)] transition-colors">
            Zur Startseite
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#f5f7f5] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Passwort geändert</h2>
          <p className="text-gray-500 text-sm mb-5">Ihr Passwort wurde erfolgreich zurückgesetzt. Sie können sich jetzt mit Ihrem neuen Passwort anmelden.</p>
          <button onClick={() => navigate("/")} className="w-full py-2.5 bg-[#76B900] text-white rounded-lg text-sm font-semibold hover:bg-[var(--primary)] transition-colors">
            Zur Anmeldung
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7f5] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-[#76B900]/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-[#76B900]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Neues Passwort vergeben</h1>
          <p className="text-gray-500 text-sm mt-1">HTW Berlin – Thesis Match Maker</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Neues Passwort</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#76B900]"
              placeholder="Mindestens 8 Zeichen"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Passwort bestätigen</label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#76B900]"
              placeholder="Passwort wiederholen"
            />
            {confirm && password !== confirm && (
              <p className="text-red-500 text-xs mt-1">Die Passwörter stimmen nicht überein.</p>
            )}
          </div>

          {resetMutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700">
              {resetMutation.error?.message}
            </div>
          )}

          <button
            type="submit"
            disabled={resetMutation.isPending || password !== confirm || password.length < 8}
            className="w-full py-2.5 bg-[#76B900] text-white rounded-lg text-sm font-semibold hover:bg-[var(--primary)] disabled:opacity-50 transition-colors"
          >
            {resetMutation.isPending ? "Wird gespeichert…" : "Passwort speichern"}
          </button>
        </form>
      </div>
    </div>
  );
}
