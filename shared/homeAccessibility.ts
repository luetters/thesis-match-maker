export const HIGH_CONTRAST_STORAGE_KEY = "thesis-match-home-high-contrast";

export function getHighContrastPreference(value: string | null | undefined): boolean {
  return value === "true";
}

export function toggleHighContrastPreference(current: boolean): boolean {
  return !current;
}
