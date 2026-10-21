import { useEffect, useState } from "react";
import { usePreferences } from "../preferences/PreferencesContext";
import type { AppPreferences } from "../preferences/types";
import { chooseProfileMedia, profileMediaSource } from "../profile/profileMedia";
import "../profile/ProfileModal.css";
import "./ProfileSettings.css";

type Profile = AppPreferences["profile"];

function SpecialTitle({ displayName }: { displayName: string }) {
  const isZero = displayName.trim().toLocaleLowerCase() === "zero";
  return <span className={`special-title-badge ${isZero ? "special-title-star" : "special-title-moon"}`}>
    <span className="special-title-symbol" aria-hidden="true">{isZero ? "✦" : "☾"}</span>
    <span>{isZero ? "Star Developer" : "Moon Developer"}</span>
    <span className="special-title-particles" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
  </span>;
}

export default function ProfileSettings() {
  const { preferences, updatePreferences } = usePreferences();
  const [draft, setDraft] = useState<Profile>(preferences.profile);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(preferences.profile);
  }, [preferences.profile]);

  function update(changes: Partial<Profile>) {
    setDraft((current) => ({ ...current, ...changes }));
    setSaved(false);
  }

  async function pickMedia(target: "avatarAssetPath" | "bannerAssetPath") {
    try {
      setError("");
      const path = await chooseProfileMedia();
      if (path) update({ [target]: path });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  }

  function save() {
    if (!draft.displayName.trim()) return;
    updatePreferences((current) => ({
      ...current,
      profile: { ...draft, displayName: draft.displayName.trim() },
    }));
    setSaved(true);
    setError("");
  }

  function cancel() {
    setDraft(preferences.profile);
    setError("");
    setSaved(false);
  }

  const avatarSrc = profileMediaSource(draft.avatarAssetPath);
  const bannerSrc = profileMediaSource(draft.bannerAssetPath);
  const hasChanges = JSON.stringify(draft) !== JSON.stringify(preferences.profile);

  return (
    <div className="profile-settings">
      <div className="profile-settings-intro">
        <p>Shape the little corner of BRD that represents you. Your profile is saved locally and stays separate from your roleplay characters.</p>
      </div>

      <div className="profile-preview-layout">
      <article className={`profile-card frame-${draft.frameStyle}`}>
        <div className="profile-banner">
          {bannerSrc ? <img src={bannerSrc} alt="" className="profile-banner-image" style={{ objectPosition: `${draft.bannerPositionX}% ${draft.bannerPositionY}%`, transform: `scale(${draft.bannerZoom / 100})`, transformOrigin: `${draft.bannerPositionX}% ${draft.bannerPositionY}%` }} /> : <div className="profile-banner-art" />}
          <div className="profile-banner-overlay" />
          <button className="profile-media-button profile-banner-edit" type="button" onClick={() => void pickMedia("bannerAssetPath")}>{bannerSrc ? "Change banner" : "Add banner / GIF"}</button>
          {bannerSrc && <button className="profile-media-button profile-banner-remove" type="button" onClick={() => update({ bannerAssetPath: null })}>Remove</button>}
        </div>

        <div className="profile-identity">
          <div className="profile-avatar-column">
            <div className={`profile-portrait frame-border-${draft.frameStyle}`}>
              {avatarSrc ? <img src={avatarSrc} alt="" className="profile-portrait-image" style={{ objectPosition: `${draft.avatarPositionX}% ${draft.avatarPositionY}%`, transform: `scale(${draft.avatarZoom / 100})`, transformOrigin: `${draft.avatarPositionX}% ${draft.avatarPositionY}%` }} /> : <span className="profile-portrait-placeholder">{draft.displayName.trim().charAt(0).toUpperCase() || "K"}</span>}
            </div>
            <button className="profile-media-button" type="button" onClick={() => void pickMedia("avatarAssetPath")}>{avatarSrc ? "Change portrait / GIF" : "Add portrait / GIF"}</button>
            {avatarSrc && <button className="profile-media-button profile-remove-media" type="button" onClick={() => update({ avatarAssetPath: null })}>Remove portrait</button>}
          </div>

          <div className="profile-identity-copy profile-settings-fields">
            <label className="profile-field-label">Display name <span>Required</span>
              <input maxLength={80} value={draft.displayName} onChange={(event) => update({ displayName: event.target.value })} placeholder="Your name" />
            </label>
            <label className="profile-field-label">Title <span>Optional · hidden while special title is enabled</span>
              <input maxLength={80} value={draft.title} onChange={(event) => update({ title: event.target.value })} placeholder="A little title" />
            </label>
            <label className="profile-special-title-toggle">
              <input type="checkbox" checked={draft.showSpecialTitle} onChange={(event) => update({ showSpecialTitle: event.target.checked })} />
              <span><strong>Show special title</strong><small>Display your Borealis developer identity instead of your regular title.</small></span>
            </label>
            <div className="profile-special-title-preview"><SpecialTitle displayName={draft.displayName} /></div>
          </div>
        </div>

        <div className="profile-details profile-settings-details">
          <label className="profile-field-label">Motto <span>Optional</span>
            <input maxLength={160} value={draft.motto} onChange={(event) => update({ motto: event.target.value })} placeholder="A few words that feel like you" />
          </label>
          <label className="profile-field-label">About you <span>Optional</span>
            <textarea maxLength={1000} rows={4} value={draft.description} onChange={(event) => update({ description: event.target.value })} placeholder="Tell a little story about yourself…" />
          </label>
          <label className="profile-field-label">Portrait frame
            <select value={draft.frameStyle} onChange={(event) => update({ frameStyle: event.target.value as Profile["frameStyle"] })}>
              <option value="none">Minimal</option>
              <option value="lavender">Theme Outline</option>
              <option value="ornate">Ornate glow</option>
            </select>
          </label>
          <div className="profile-settings-note">Portraits use a 4:5 frame with adjustable position and zoom. Animated GIFs stay animated. Supported formats: GIF, PNG, JPG and WebP (up to 25 MiB).</div>
        </div>
      </article>

      <section className="profile-image-framing" aria-label="Image framing">
        <div className="appearance-section-heading">
          <h4>Image framing</h4>
          <p>Adjust which part of each image is visible. Animated GIFs keep playing while you reposition them.</p>
        </div>
        <div className="profile-framing-group">
          <strong>Portrait</strong>
          <label className="profile-framing-control">Horizontal <span>{draft.avatarPositionX}%</span>
            <input type="range" min="0" max="100" step="1" value={draft.avatarPositionX} onChange={(event) => update({ avatarPositionX: Number(event.target.value) })} />
          </label>
          <label className="profile-framing-control">Vertical <span>{draft.avatarPositionY}%</span>
            <input type="range" min="0" max="100" step="1" value={draft.avatarPositionY} onChange={(event) => update({ avatarPositionY: Number(event.target.value) })} />
          </label>
          <label className="profile-framing-control">Zoom <span>{draft.avatarZoom}%</span>
            <input type="range" min="100" max="200" step="1" value={draft.avatarZoom} onChange={(event) => update({ avatarZoom: Number(event.target.value) })} />
          </label>
        </div>
        <div className="profile-framing-group">
          <strong>Banner</strong>
          <label className="profile-framing-control">Horizontal <span>{draft.bannerPositionX}%</span>
            <input type="range" min="0" max="100" step="1" value={draft.bannerPositionX} onChange={(event) => update({ bannerPositionX: Number(event.target.value) })} />
          </label>
          <label className="profile-framing-control">Vertical <span>{draft.bannerPositionY}%</span>
            <input type="range" min="0" max="100" step="1" value={draft.bannerPositionY} onChange={(event) => update({ bannerPositionY: Number(event.target.value) })} />
          </label>
          <label className="profile-framing-control">Zoom <span>{draft.bannerZoom}%</span>
            <input type="range" min="100" max="200" step="1" value={draft.bannerZoom} onChange={(event) => update({ bannerZoom: Number(event.target.value) })} />
          </label>
        </div>
      </section>
      </div>

      {error && <p className="profile-media-error profile-settings-error" role="alert">{error}</p>}
      <div className="profile-settings-actions">
        <span className={`profile-settings-status ${saved ? "is-saved" : ""}`}>{saved ? "Profile saved" : hasChanges ? "Unsaved changes" : "All changes saved"}</span>
        <div className="profile-footer-actions">
          <button type="button" className="profile-secondary-button" onClick={cancel} disabled={!hasChanges}>Cancel</button>
          <button type="button" className="profile-primary-button" onClick={save} disabled={!draft.displayName.trim() || !hasChanges}>Save profile</button>
        </div>
      </div>
    </div>
  );
}
