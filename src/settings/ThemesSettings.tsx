
import { usePreferences } from "../preferences/PreferencesContext";
import type { CatppuccinFlavor } from "../preferences/types";
import "./ThemesSettings.css";
import type { CSSProperties } from "react";

type ThemeDefinition = {
  id: CatppuccinFlavor;
  name: string;
  description: string;
  quote: string;
  icon: string;
  colors: {
    base: string;
    mantle: string;
    surface: string;
    accent: string;
    secondary: string;
    text: string;
    muted: string;
  };
};

const themes: ThemeDefinition[] = [
  {
    id: "latte",
    name: "Latte",
    description: "A soft, sunlit pastel palette.",
    quote: "A little light goes a long way.",
    icon: "☀",
    colors: {
      base: "#eff1f5",
      mantle: "#e6e9ef",
      surface: "#ccd0da",
      accent: "#8839ef",
      secondary: "#ea76cb",
      text: "#4c4f69",
      muted: "#7c7f93",
    },
  },
  {
    id: "frappe",
    name: "Frappé",
    description: "A calm balance of warmth and depth.",
    quote: "Rain drops and lofi beats.",
    icon: "☕",
    colors: {
      base: "#303446",
      mantle: "#292c3c",
      surface: "#414559",
      accent: "#ca9ee6",
      secondary: "#f4b8e4",
      text: "#c6d0f5",
      muted: "#a5adce",
    },
  },
  {
    id: "macchiato",
    name: "Macchiato",
    description: "Muted tones with a touch of elegance.",
    quote: "Some stories bloom in silence.",
    icon: "◐",
    colors: {
      base: "#24273a",
      mantle: "#1e2030",
      surface: "#363a4f",
      accent: "#c6a0f6",
      secondary: "#f5bde6",
      text: "#cad3f5",
      muted: "#a5adcb",
    },
  },
  {
    id: "mocha",
    name: "Mocha",
    description: "Deep, rich tones for quiet nights.",
    quote: "Make yourself at home.",
    icon: "☾",
    colors: {
      base: "#1e1e2e",
      mantle: "#181825",
      surface: "#313244",
      accent: "#cba6f7",
      secondary: "#f5c2e7",
      text: "#cdd6f4",
      muted: "#a6adc8",
    },
  },
  {
    id: "crimson-void",
    name: "Crimson Void",
    description: "Obsidian shadows and blood-red neon.",
    quote: "You should've stayed dead.",
    icon: "☠",
    colors: {
      base: "#100D12",
      mantle: "#1C1119",
      surface: "#32131F",
      accent: "#FF244F",
      secondary: "#A20F35",
      text: "#E7B5C5",
      muted: "#9C6B8A",
    },
  },
  {
    id: "coral-bloom",
    name: "Coral Bloom",
    description: "Dark plum wrapped in soft coral.",
    quote: "A little warmth in the dark.",
    icon: "✿",
    colors: {
      base: "#241A20",
      mantle: "#2D1E26",
      surface: "#35222B",
      accent: "#FF91A4",
      secondary: "#D86A82",
      text: "#FFE0E4",
      muted: "#F47F91",
    },
  },
  {
    id: "sakura-dreams",
    name: "Sakura Dreams",
    description: "Blushing pastels and gentle warmth.",
    quote: "Stay a little longer, okay?",
    icon: "❀",
    colors: {
      base: "#FFF7F5",
      mantle: "#FBEAE7",
      surface: "#F4DCD9",
      accent: "#D94F70",
      secondary: "#FF9EAA",
      text: "#703744",
      muted: "#A66C77",
    },
  },
  {
    id: "moon-light",
    name: "Moon Light",
    description: "Airy lavender beneath a quiet sky.",
    quote: "Find peace in the quiet.",
    icon: "☾",
    colors: {
      base: "#F7F6FF",
      mantle: "#ECEBFA",
      surface: "#DEDEF2",
      accent: "#777BD1",
      secondary: "#A7A4E8",
      text: "#353650",
      muted: "#73758F",
    },
  },
  {
    id: "moon-shadow",
    name: "Moon Shadow",
    description: "Midnight blue and ethereal violet.",
    quote: "The night remembers everything.",
    icon: "☾",
    colors: {
      base: "#10121F",
      mantle: "#191B2D",
      surface: "#252840",
      accent: "#8588ED",
      secondary: "#A9A7F5",
      text: "#E1E3FF",
      muted: "#A1A4C5",
    },
  },
];

export default function ThemesSettings() {
  const { preferences, updatePreferences } = usePreferences();
  const selectedTheme = preferences.appearance.theme;

  function selectTheme(theme: CatppuccinFlavor) {
    updatePreferences((current) => ({
      ...current,
      appearance: {
        ...current.appearance,
        theme,
      },
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
            Nine palettes, nine different moods. Choose the one that feels
            like yours.
          </p>
        </div>
        <span className="themes-count">09 THEMES</span>
      </div>

      <div className="themes-grid">
        {themes.map((theme) => {
          const isSelected = selectedTheme === theme.id;

          return (
            <button
              key={theme.id}
              type="button"
              className={`themes-card ${isSelected ? "selected" : ""}`}
              aria-pressed={isSelected}
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
              </div>

              <div className="themes-card-details">
                <span className="themes-card-icon">{theme.icon}</span>
                <span className="themes-card-copy">
                  <span className="themes-card-name">{theme.name}</span>
                  <span className="themes-card-description">
                    {theme.description}
                  </span>
                </span>
                <span className="themes-card-check">
                  {isSelected ? "✓" : ""}
                </span>
              </div>
            </button>
          );
        })}
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
