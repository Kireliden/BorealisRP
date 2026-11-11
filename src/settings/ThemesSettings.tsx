
import { useEffect, useState, type CSSProperties } from "react";
import { LockKeyhole, Sparkles } from "lucide-react";
import { usePreferences } from "../preferences/PreferencesContext";
import type { CatppuccinFlavor } from "../preferences/types";
import { isLightTheme } from "../preferences/themeMode";
import { loadCollection, COLLECTION_UPDATED_EVENT } from "../collection/collectionStorage";
import { themes, THEME_COLLECTIONS, isThemeLocked } from "./themeCatalog";
import "./ThemesSettings.css";

export default function ThemesSettings() {
  const { preferences, resolvedTheme, systemIsDark, updatePreferences } = usePreferences();
  const appearance = preferences.appearance;
  const selectedTheme = resolvedTheme;
  const [discoveredIds, setDiscoveredIds] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    let mounted = true;
    const refreshDiscoveries = () => {
      void loadCollection().then((collection) => {
        if (mounted) setDiscoveredIds(new Set(collection.discovered.map((entry) => entry.id)));
      }).catch((error: unknown) => {
        console.error("Could not load unlocked theme collections:", error);
      });
    };
    refreshDiscoveries();
    window.addEventListener(COLLECTION_UPDATED_EVENT, refreshDiscoveries);
    return () => {
      mounted = false;
      window.removeEventListener(COLLECTION_UPDATED_EVENT, refreshDiscoveries);
    };
  }, []);

  const availableThemes = themes.filter((theme) => !isThemeLocked(theme.id, discoveredIds));
  const lockedCount = themes.length - availableThemes.length;

  function selectTheme(theme: CatppuccinFlavor) {
    if (isThemeLocked(theme, discoveredIds)) return;
    updatePreferences((current) => ({
      ...current,
      appearance: current.appearance.themeMode === "system"
        ? { ...current.appearance, [isLightTheme(theme) ? "systemLightTheme" : "systemDarkTheme"]: theme }
        : { ...current.appearance, theme },
    }));
  }

  function setMode(mode: "manual" | "system") {
    updatePreferences((current) => ({
      ...current,
      appearance: { ...current.appearance, themeMode: mode },
    }));
  }

  const activeTheme =
    themes.find((theme) => theme.id === selectedTheme) ?? themes[1];

  return (
    <section className="themes-settings">
      <div className="themes-section-heading">
        <div>
          <h4>Find your atmosphere</h4>
          <p>
            Explore the collections and find the atmosphere that feels
            like yours. Some palettes have secrets to uncover.
          </p>
        </div>
        <span className="themes-count">{String(themes.length).padStart(2, "0")} THEMES</span>
      </div>

      <section className="themes-schedule" aria-label="Theme mode">
        <div className="themes-schedule-heading">
          <div><strong>Theme switching</strong>
            <p>Choose a fixed palette, or follow the light and dark setting of your operating system.</p>
          </div>
          <div className="themes-mode-switch" role="group" aria-label="Theme switching mode">
            <button type="button" aria-pressed={appearance.themeMode === "manual"}
              className={appearance.themeMode === "manual" ? "active" : ""} onClick={() => setMode("manual")}>Manual</button>
            <button type="button" aria-pressed={appearance.themeMode === "system"}
              className={appearance.themeMode === "system" ? "active" : ""} onClick={() => setMode("system")}>Follow system</button>
          </div>
        </div>
        {appearance.themeMode === "system" && <>
          <div className="themes-schedule-slots">
            <label className="themes-schedule-slot">
              <span>☀ Light theme</span>
              <select value={appearance.systemLightTheme}
                onChange={(event) => selectTheme(event.target.value as CatppuccinFlavor)}>
                {availableThemes.filter((theme) => isLightTheme(theme.id)).map((theme) =>
                  <option key={theme.id} value={theme.id}>{theme.name}</option>)}
              </select>
            </label>
            <label className="themes-schedule-slot">
              <span>☾ Dark theme</span>
              <select value={appearance.systemDarkTheme}
                onChange={(event) => selectTheme(event.target.value as CatppuccinFlavor)}>
                {availableThemes.filter((theme) => !isLightTheme(theme.id)).map((theme) =>
                  <option key={theme.id} value={theme.id}>{theme.name}</option>)}
              </select>
            </label>
          </div>
          <p className="themes-schedule-current">
            System currently reports <strong>{systemIsDark ? "Dark" : "Light"}</strong>.
            BRS is showing <strong>{themes.find((theme) => theme.id === resolvedTheme)?.name ?? resolvedTheme}</strong>.
            The choice updates when the system changes.
          </p>
        </>}
      </section>
      <div className="themes-collections">
        {THEME_COLLECTIONS.map((collection) => {
          const collectionThemes = themes.filter((theme) => collection.themeIds.includes(theme.id));
          const collectionLocked = Boolean(collection.unlockId && !discoveredIds.has(collection.unlockId));

          return (
            <section className="themes-collection" key={collection.id}
              aria-labelledby={`theme-collection-${collection.id}`}>
              <div className="themes-collection-heading">
                <span className="themes-collection-icon" aria-hidden="true">{collection.icon}</span>
                <div className="themes-collection-copy">
                  <h5 id={`theme-collection-${collection.id}`}>{collection.name}</h5>
                  <p>{collection.subtitle}</p>
                </div>
                <span className="themes-collection-count">{collectionThemes.length} themes</span>
                {collection.unlockId && (
                  <span className={`themes-collection-unlock ${collectionLocked ? "locked" : "unlocked"}`}>
                    {collectionLocked ? <><LockKeyhole size={12} /> Locked</> : <><Sparkles size={12} /> Unlocked</>}
                  </span>
                )}
              </div>
              <div className="themes-grid">
                {collectionThemes.map((theme) => {
                  const isLocked = isThemeLocked(theme.id, discoveredIds);
                  const isDayChoice = appearance.themeMode === "system" && appearance.systemLightTheme === theme.id;
                  const isNightChoice = appearance.themeMode === "system" && appearance.systemDarkTheme === theme.id;
                  const isSelected = appearance.themeMode === "system"
                    ? (isDayChoice || isNightChoice)
                    : selectedTheme === theme.id;

                  return (
                    <button
                      key={theme.id}
                      type="button"
                      disabled={isLocked}
                      className={`themes-card ${isSelected ? "selected" : ""} ${isLocked ? "locked" : ""}`}
                      aria-pressed={isSelected}
                      title={isLocked ? "Unlock this theme by discovering a hidden secret." :
                        appearance.themeMode === "system"
                          ? `Use ${theme.name} when the system is ${isLightTheme(theme.id) ? "light" : "dark"}`
                          : `Apply ${theme.name}`}
                      onClick={() => selectTheme(theme.id)}
                      style={{
                        "--theme-base": theme.colors.base,
                        "--theme-mantle": theme.colors.mantle,
                        "--theme-surface": theme.colors.surface,
                        "--theme-accent": theme.colors.accent,
                        "--theme-secondary": theme.colors.secondary,
                        "--theme-text": theme.colors.text,
                        "--theme-muted": theme.colors.muted,
                      } as CSSProperties}
                    >
                      <div className="themes-card-preview">
                        <div className="themes-mini-sidebar">
                          <span />
                          <span />
                          <span />
                        </div>
                        <div className="themes-mini-content">
                          <span className="themes-mini-heading" />
                          <span className="themes-mini-line" />
                          <span className="themes-mini-line short" />
                          <span className="themes-mini-button" />
                        </div>
                        {isLocked && <span className="themes-card-preview-lock">
                          <LockKeyhole size={19} aria-hidden="true" />
                          <span>Secret theme</span>
                        </span>}
                      </div>

                      <div className="themes-card-details">
                        <span className="themes-card-icon">{theme.icon}</span>
                        <span className="themes-card-copy">
                          <span className="themes-card-name">{theme.name}</span>
                          <span className="themes-card-description">{theme.description}</span>
                        </span>
                        <span className="themes-card-check">
                          {isLocked ? <LockKeyhole size={11} /> :
                            appearance.themeMode === "system"
                              ? isDayChoice ? "☀" : isNightChoice ? "☾" : ""
                              : isSelected ? "✓" : ""}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
        {lockedCount > 0 && (
          <p className="themes-lock-hint">
            <LockKeyhole size={13} aria-hidden="true" />
            {lockedCount} secret palettes are waiting to be discovered.
          </p>
        )}
      </div>

      <section
        className="themes-detail"
        style={{
          "--theme-base": activeTheme.colors.base,
          "--theme-mantle": activeTheme.colors.mantle,
          "--theme-surface": activeTheme.colors.surface,
          "--theme-accent": activeTheme.colors.accent,
          "--theme-secondary": activeTheme.colors.secondary,
          "--theme-text": activeTheme.colors.text,
          "--theme-muted": activeTheme.colors.muted,
        } as CSSProperties}
      >
        <div className="themes-detail-header">
          <div>
            <span className="themes-detail-eyebrow">CURRENTLY APPLIED</span>
            <h4>
              <span>{activeTheme.icon}</span> {activeTheme.name}
            </h4>
            <p>{activeTheme.description}</p>
          </div>
          <span className="themes-applied-badge">✓ Applied</span>
        </div>

        <div className="themes-swatches">
          {(
            [
              ["Base", activeTheme.colors.base],
              ["Mantle", activeTheme.colors.mantle],
              ["Surface", activeTheme.colors.surface],
              ["Accent", activeTheme.colors.accent],
              ["Secondary", activeTheme.colors.secondary],
              ["Text", activeTheme.colors.text],
            ] as const
          ).map(([label, color]) => (
            <div className="themes-swatch" key={label}>
              <span
                className="themes-swatch-color"
                style={{ backgroundColor: color }}
              />
              <span className="themes-swatch-label">{label}</span>
              <code>{color.toUpperCase()}</code>
            </div>
          ))}
        </div>

        <div className="themes-live-preview">
          <aside className="themes-preview-sidebar">
            <span className="themes-preview-brand">BOREALIS</span>
            <span className="themes-preview-nav active">✦ The Archive</span>
            <span className="themes-preview-nav">◈ Characters</span>
            <span className="themes-preview-nav">◇ Settings</span>
          </aside>

          <div className="themes-preview-main">
            <span className="themes-preview-label">A SCENE FROM YOUR NEXT STORY</span>
            <h5>The space between the stars</h5>
            <p className="themes-preview-narration">
              The room fell quiet. Somewhere beyond the window, the city
              carried on as if nothing had changed.
            </p>
            <div className="themes-preview-dialogue">
              <span className="themes-preview-speaker">Keira</span>
              “You came back. I wasn't sure you would.”
            </div>
            <div className="themes-preview-actions">
              <span className="themes-preview-button">Continue story ↗</span>
              <span className="themes-preview-muted">Saved just now</span>
            </div>
          </div>
        </div>

        <blockquote className="themes-signature-quote">
          “{activeTheme.quote}”
        </blockquote>
      </section>
    </section>
  );
}
