export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Eigenes Login-System – kein Manus-OAuth mehr.
// Alle Weiterleitungen gehen auf die interne /login-Seite.
export const getLoginUrl = (returnPath?: string) => {
  const base = "/login";
  if (returnPath) {
    return `${base}?returnTo=${encodeURIComponent(returnPath)}`;
  }
  return base;
};
