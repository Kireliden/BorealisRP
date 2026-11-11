import type { AppPreferences, CatppuccinFlavor } from "./types";

/** Palette tone is a property of a BRS palette, not the currently selected OS mode. */
export const LIGHT_THEMES = ["latte", "sakura-dreams", "moon-light", "emerald-glade"] as const satisfies readonly CatppuccinFlavor[];
export const DARK_THEMES = ["frappe", "macchiato", "mocha", "crimson-void", "coral-bloom", "moon-shadow", "emerald-nocturne"] as const satisfies readonly CatppuccinFlavor[];

export function isLightTheme(theme: CatppuccinFlavor): boolean {
  return (LIGHT_THEMES as readonly string[]).includes(theme);
}

export function resolveTheme(appearance: AppPreferences["appearance"], systemIsDark: boolean): CatppuccinFlavor {
  if (appearance.themeMode !== "system") return appearance.theme;
  return systemIsDark ? appearance.systemDarkTheme : appearance.systemLightTheme;
}
