// Theme: the viewer's choice (light | dark | system), plus an optional
// "dim the screen during the show" that switches to dark while a show is live.
// Settings writes the prefs and fires THEME_EVENT; App re-applies on that
// event, on OS theme changes, and when the live state changes.

export const THEME_EVENT = 'recital-theme-change';

const read = (key, fallback) => {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
};
const write = (key, value) => {
  try { localStorage.setItem(key, value); } catch { /* private mode */ }
};

export const getThemePref = () => read('theme', 'system');
export const getDimDuringShow = () => read('dimDuringShow', '0') === '1';

export function setThemePref(theme) {
  write('theme', theme);
  window.dispatchEvent(new Event(THEME_EVENT));
}
export function setDimDuringShow(on) {
  write('dimDuringShow', on ? '1' : '0');
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function applyTheme({ live = false } = {}) {
  const pref = getThemePref();
  const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const dark = (live && getDimDuringShow()) || pref === 'dark' || (pref === 'system' && systemDark);
  document.documentElement.classList.toggle('dark', !!dark);
}
