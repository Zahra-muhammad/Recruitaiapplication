// Per-browser site settings: theme, text size, motion. Stored in
// localStorage and applied as attributes on <html> (styled in globals.css).
// SETTINGS_BOOT_SCRIPT applies them before first paint so there's no flash
// of the wrong theme; applySettings() keeps them in sync afterwards.

export type ThemeSetting = "light" | "dark" | "system";
export type TextSizeSetting = "small" | "medium" | "large";
export type MotionSetting = "full" | "reduced";

export interface SiteSettings {
  theme: ThemeSetting;
  textSize: TextSizeSetting;
  motion: MotionSetting;
}

export const DEFAULT_SETTINGS: SiteSettings = { theme: "system", textSize: "medium", motion: "full" };

export const SETTINGS_STORAGE_KEY = "recruitai-settings";

export function readSettings(): SiteSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<SiteSettings>) : {};
    return {
      theme: ["light", "dark", "system"].includes(parsed.theme ?? "") ? parsed.theme! : DEFAULT_SETTINGS.theme,
      textSize: ["small", "medium", "large"].includes(parsed.textSize ?? "") ? parsed.textSize! : DEFAULT_SETTINGS.textSize,
      motion: ["full", "reduced"].includes(parsed.motion ?? "") ? parsed.motion! : DEFAULT_SETTINGS.motion,
    };
  } catch {
    // Storage blocked (private mode etc.) — fall back to defaults.
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: SiteSettings) {
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Still applied for this page view, just not remembered.
  }
}

export function resolvesToDark(theme: ThemeSetting): boolean {
  return theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
}

export function applySettings(settings: SiteSettings) {
  const root = document.documentElement;
  root.classList.toggle("dark", resolvesToDark(settings.theme));
  root.dataset.textSize = settings.textSize;
  root.dataset.motion = settings.motion === "reduced" ? "reduce" : "full";
}

// Inline <head> script — same logic as readSettings/applySettings, kept
// tiny and dependency-free because it runs before React loads.
export const SETTINGS_BOOT_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(
  SETTINGS_STORAGE_KEY
)})||"{}");var t=s.theme||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;if(d)r.classList.add("dark");r.dataset.textSize=s.textSize||"medium";r.dataset.motion=s.motion==="reduced"?"reduce":"full";}catch(e){}})();`;
