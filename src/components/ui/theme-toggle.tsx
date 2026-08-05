"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

export type ThemeChoice = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "stockora-theme";

/**
 * Runs before first paint to apply the stored theme.
 *
 * Inlined in <head> deliberately: if the class were applied after hydration,
 * a dark-mode user would see a white flash on every navigation. Kept tiny and
 * dependency-free because it blocks rendering.
 */
export const THEME_INIT_SCRIPT = `
(function(){
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = stored === 'dark' || ((!stored || stored === 'system') && prefersDark);
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {}
})();
`;

function apply(choice: ThemeChoice) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = choice === "dark" || (choice === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", dark);
}

const OPTIONS: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/**
 * The stored theme is external state, so it is read through
 * useSyncExternalStore rather than copied into React state inside an effect —
 * that avoids the extra render pass and keeps other tabs in sync for free.
 */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // `storage` only fires in *other* tabs, so local changes notify directly.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): ThemeChoice {
  return (localStorage.getItem(THEME_STORAGE_KEY) as ThemeChoice | null) ?? "system";
}

/** The server can't know the preference; the inline script fixes it up. */
function getServerSnapshot(): ThemeChoice {
  return "system";
}

export function ThemeToggle() {
  const choice = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Following the OS while set to "system" means a machine that dims at
  // sunset dims the app too, without the user touching anything.
  useEffect(() => {
    if (choice !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [choice]);

  function select(next: ThemeChoice) {
    localStorage.setItem(THEME_STORAGE_KEY, next);
    apply(next);
    for (const listener of listeners) listener();
  }

  return (
    <div
      role="group"
      aria-label="Colour theme"
      className="inline-flex items-center gap-0.5 rounded-full border border-brand-border bg-brand-surface p-0.5"
    >
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = choice === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => select(option.value)}
            aria-label={`${option.label} theme`}
            aria-pressed={active}
            title={`${option.label} theme`}
            className={
              active
                ? "flex size-7 cursor-pointer items-center justify-center rounded-full bg-brand-purple text-white transition-colors"
                : "flex size-7 cursor-pointer items-center justify-center rounded-full text-brand-muted transition-colors hover:bg-brand-purple-lightest hover:text-brand-accent"
            }
          >
            <Icon className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}
