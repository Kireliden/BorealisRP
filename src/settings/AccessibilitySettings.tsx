import { usePreferences } from "../preferences/PreferencesContext";
import "./AppearanceSettings.css";
import "./ChatSettings.css";

export default function AccessibilitySettings() {
  const { preferences, updatePreferences } = usePreferences();
  const animationsEnabled = preferences.accessibility.animationsEnabled;

  function setAnimationsEnabled(enabled: boolean) {
    updatePreferences((current) => ({
      ...current,
      accessibility: {
        ...current.accessibility,
        animationsEnabled: enabled,
      },
    }));
  }

  return (
    <section className="chat-settings accessibility-settings">
      <div className="appearance-section-heading">
        <h4>Motion</h4>
        <p>Choose how much movement BRD uses when menus, popups and other interface elements appear.</p>
      </div>
      <div className="chat-setting-toggles">
        <label>
          <input
            type="checkbox"
            checked={animationsEnabled}
            onChange={(event) => setAnimationsEnabled(event.target.checked)}
          />
          <span>
            <strong>Enable interface animations</strong>
            <small>Turn off animated menus, dialogs, transitions and decorative motion across the app.</small>
          </span>
        </label>
      </div>
      <p className="appearance-setting-description">This setting is saved automatically and applies immediately. Your operating system's reduced-motion preference is also respected.</p>
    </section>
  );
}
