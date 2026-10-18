
import { usePreferences } from "../preferences/PreferencesContext";
import type {
  InterfaceFont,
  UiDensity,
} from "../preferences/types";
import "./AppearanceSettings.css";

const fontOptions: { value: InterfaceFont; label: string }[] = [
  { value: "ubuntu", label: "Ubuntu" },
  { value: "inter", label: "Inter" },
  { value: "system", label: "System" },
];

const densityOptions: { value: UiDensity; label: string }[] = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable" },
  { value: "spacious", label: "Spacious" },
];

const scaleOptions = [90, 100, 110, 125, 150] as const;

export default function AppearanceSettings() {
  const { preferences, updatePreferences } = usePreferences();
  const { interfaceFont, uiScale, density, chatFontSize } =
    preferences.appearance;

  function updateAppearance(
    changes: Partial<typeof preferences.appearance>,
  ) {
    updatePreferences((current) => ({
      ...current,
      appearance: {
        ...current.appearance,
        ...changes,
      },
    }));
  }

  return (
    <section className="appearance-settings">
      <div className="appearance-section-heading">
        <h4>Typography</h4>
        <p>Personalize the fonts and text size.</p>
      </div>

      <label className="appearance-setting">
        <span className="appearance-setting-copy">
          <span className="appearance-setting-label">Interface Font</span>
          <span className="appearance-setting-description">
            Font used in controls and menus.
          </span>
        </span>
        <select
          value={interfaceFont}
          onChange={(event) =>
            updateAppearance({
              interfaceFont: event.target.value as InterfaceFont,
            })
          }
        >
          {fontOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>



      <div className="appearance-section-heading">
        <h4>Interface Scale</h4>
        <p>Adjust the overall size of interface elements.</p>
      </div>

      <div className="appearance-scale-options" aria-label="Interface Scale">
        {scaleOptions.map((scale) => (
          <button
            key={scale}
            type="button"
            className={`appearance-option-button ${
              uiScale === scale ? "selected" : ""
            }`}
            aria-pressed={uiScale === scale}
            onClick={() => updateAppearance({ uiScale: scale })}
          >
            {scale}%
          </button>
        ))}
      </div>

      <div className="appearance-section-heading">
        <h4>Density</h4>
        <p>Choose how much space there is between elements.</p>
      </div>

      <div className="appearance-density-options">
        {densityOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`appearance-density-card ${
              density === option.value ? "selected" : ""
            }`}
            aria-pressed={density === option.value}
            onClick={() => updateAppearance({ density: option.value })}
          >
            <span className={`appearance-density-icon ${option.value}`}>
              <span />
              <span />
              <span />
            </span>
            <span className="appearance-setting-label">{option.label}</span>
            <span className="appearance-theme-description">
              {option.value === "compact"
                ? "More content on screen"
                : option.value === "comfortable"
                  ? "Balance between space and content"
                  : "More space between elements"}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
