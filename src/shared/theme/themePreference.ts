export const DARK_MODE_STORAGE_KEY = 'darkMode';

export function getStoredDarkModePreference(): boolean | null {
  if (typeof window === 'undefined') return null;

  const storedPreference = localStorage.getItem(DARK_MODE_STORAGE_KEY);
  if (storedPreference === 'true') return true;
  if (storedPreference === 'false') return false;
  return null;
}

export function resolveInitialDarkMode(): boolean {
  const storedPreference = getStoredDarkModePreference();
  if (storedPreference !== null) return storedPreference;
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}
