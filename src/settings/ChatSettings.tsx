import { usePreferences } from "../preferences/PreferencesContext";
import type { AvatarSize, UiDensity } from "../preferences/types";
import "./AppearanceSettings.css";
import "./ChatSettings.css";

const avatarSizes: { value: AvatarSize; label: string; detail: string }[] = [
  { value: "small", label: "Small", detail: "44 × 55" },
  { value: "medium", label: "Medium", detail: "56 × 70" },
  { value: "large", label: "Large", detail: "68 × 85" },
];

const spacingOptions: { value: UiDensity; label: string; detail: string }[] = [
  { value: "compact", label: "Compact", detail: "Tighter messages; more text on screen." },
  { value: "comfortable", label: "Comfortable", detail: "A balanced, readable layout." },
  { value: "spacious", label: "Spacious", detail: "More breathing room between passages." },
];

export default function ChatSettings() {
  const { preferences, updatePreferences } = usePreferences();
  const display = preferences.characterDisplayDefaults;

  function updateChatFontSize(value: number) {
    if (!Number.isFinite(value)) return;
    updatePreferences((current) => ({
      ...current,
      appearance: {
        ...current.appearance,
        chatFontSize: Math.min(24, Math.max(11, value)),
      },
    }));
  }

  function updateDisplay(changes: Partial<typeof display>) {
    updatePreferences((current) => ({
      ...current,
      characterDisplayDefaults: {
        ...current.characterDisplayDefaults,
        ...changes,
      },
    }));
  }

  return (
    <section className="chat-settings">
      <div className="appearance-section-heading">
        <h4>Message typography</h4>
        <p>Make roleplay passages comfortable to read. These settings apply to the chat view.</p>
      </div>

      <label className="appearance-setting">
        <span className="appearance-setting-copy">
          <span className="appearance-setting-label">Message text size</span>
          <span className="appearance-setting-description">Default is 16 px; choose anything from 11 to 24 px.</span>
        </span>
        <span className="appearance-number-control">
          <input type="number" min={11} max={24} value={preferences.appearance.chatFontSize}
            onChange={(event) => updateChatFontSize(Number(event.target.value))} />
          <span>px</span>
        </span>
      </label>

      <div className="appearance-section-heading">
        <h4>Chat layout</h4>
        <p>Choose how much space each message gets.</p>
      </div>
      <div className="appearance-density-options">
        {spacingOptions.map((option) => (
          <button key={option.value} type="button"
            className={`appearance-density-card ${display.messageSpacing === option.value ? "selected" : ""}`}
            aria-pressed={display.messageSpacing === option.value}
            onClick={() => updateDisplay({ messageSpacing: option.value })}>
            <span className={`appearance-density-icon ${option.value}`}><span /><span /><span /></span>
            <span className="appearance-setting-label">{option.label}</span>
            <span className="appearance-theme-description">{option.detail}</span>
          </button>
        ))}
      </div>

      <div className="appearance-section-heading">
        <h4>Character avatars</h4>
        <p>Avatars use the same portrait shape as the composer (4:5).</p>
      </div>
      <div className="chat-avatar-size-options">
        {avatarSizes.map((option) => (
          <button key={option.value} type="button"
            className={`chat-avatar-size-option ${display.avatarSize === option.value ? "selected" : ""}`}
            aria-pressed={display.avatarSize === option.value}
            onClick={() => updateDisplay({ avatarSize: option.value })}>
            <span className={`chat-avatar-size-sample ${option.value}`} aria-hidden="true" />
            <span className="appearance-setting-label">{option.label}</span>
            <span className="appearance-theme-description">{option.detail} px</span>
          </button>
        ))}
      </div>

      <div className="appearance-section-heading">
        <h4>Message details</h4>
        <p>Hide secondary details for a cleaner reading view.</p>
      </div>
      <div className="chat-setting-toggles">
        <label><input type="checkbox" checked={display.showAvatar} onChange={(event) => updateDisplay({ showAvatar: event.target.checked })} /><span><strong>Show avatars</strong><small>Display each character portrait beside their message.</small></span></label>
        <label><input type="checkbox" checked={display.showRoleLabel} onChange={(event) => updateDisplay({ showRoleLabel: event.target.checked })} /><span><strong>Show role labels</strong><small>Show Narration or Dialogue next to the author.</small></span></label>
        <label><input type="checkbox" checked={display.showExpression} onChange={(event) => updateDisplay({ showExpression: event.target.checked })} /><span><strong>Show character expressions</strong><small>Show the selected expression beside character names.</small></span></label>
      </div>
    </section>
  );
}
