"use client";

import { useEffect, useRef, useState } from "react";
import {
  applySettings,
  readSettings,
  saveSettings,
  DEFAULT_SETTINGS,
  type SiteSettings,
} from "@/lib/siteSettings";

const GROUPS: {
  key: keyof SiteSettings;
  label: string;
  options: { value: string; label: string }[];
}[] = [
  {
    key: "theme",
    label: "Theme",
    options: [
      { value: "light", label: "Light" },
      { value: "dark", label: "Dark" },
      { value: "system", label: "System" },
    ],
  },
  {
    key: "textSize",
    label: "Text size",
    options: [
      { value: "small", label: "Small" },
      { value: "medium", label: "Medium" },
      { value: "large", label: "Large" },
    ],
  },
  {
    key: "motion",
    label: "Motion",
    options: [
      { value: "full", label: "Full" },
      { value: "reduced", label: "Reduced" },
    ],
  },
];

// ⚙ Settings for the whole site — theme, text size, motion. Remembered per
// browser; applied to every page.
export default function SettingsMenu() {
  const [open, setOpen] = useState(false);
  // Saved settings (already applied by the <head> boot script). Safe to read
  // on first render: the panel starts closed, so server and client markup
  // are identical either way.
  const [settings, setSettings] = useState<SiteSettings>(() =>
    typeof window === "undefined" ? DEFAULT_SETTINGS : readSettings()
  );
  const ref = useRef<HTMLDivElement>(null);

  // While on "System", follow the OS switching between light and dark.
  useEffect(() => {
    if (settings.theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applySettings(settings);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [settings]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function update(key: keyof SiteSettings, value: string) {
    const next = { ...settings, [key]: value } as SiteSettings;
    setSettings(next);
    saveSettings(next);
    applySettings(next);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Settings"
        title="Settings"
        className="w-8 h-8 inline-flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Settings"
          className="absolute right-0 mt-2 w-64 bg-white border border-zinc-200 rounded-xl shadow-lg p-4 z-50 space-y-4"
        >
          {GROUPS.map((group) => (
            <fieldset key={group.key}>
              <legend className="text-xs font-medium text-zinc-500 mb-1.5">{group.label}</legend>
              <div className="flex rounded-md border border-zinc-200 p-0.5 bg-zinc-50">
                {group.options.map((opt) => {
                  const active = settings[group.key] === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={`flex-1 text-center text-xs font-medium rounded px-2 py-1.5 cursor-pointer transition-colors ${
                        active ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`setting-${group.key}`}
                        value={opt.value}
                        checked={active}
                        onChange={() => update(group.key, opt.value)}
                        className="sr-only"
                      />
                      {opt.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
          <p className="text-[11px] text-zinc-400">Saved in this browser and applied to every page.</p>
        </div>
      )}
    </div>
  );
}
