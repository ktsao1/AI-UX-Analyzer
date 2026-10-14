export interface Settings {
  geminiKey: string;
  figmaToken: string;
  model: string;
}

export const DEFAULT_MODEL = 'gemini-2.5-flash';
const STORAGE_KEY = 'ai-usability-analyzer:settings';

const env = import.meta.env;

/** Keys come from `.env.local` or from the Settings panel. The panel's
 *  values are kept in this browser's localStorage and are sent only to
 *  Figma's and Google's own APIs. */
export function loadSettings(): Settings {
  let saved: Partial<Settings> = {};
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    // A blocked or corrupt store just means starting empty.
  }
  return {
    geminiKey: saved.geminiKey || env.VITE_GEMINI_API_KEY || '',
    figmaToken: saved.figmaToken || env.VITE_FIGMA_TOKEN || '',
    model: saved.model || env.VITE_GEMINI_MODEL || DEFAULT_MODEL,
  };
}

export function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Private windows may refuse; the keys still work for this visit.
  }
}

export function clearSettings() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}
