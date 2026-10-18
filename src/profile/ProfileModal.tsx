import { useEffect, useState } from "react";
import type { AppPreferences } from "../preferences/types";
import { chooseProfileMedia, profileMediaSource } from "./profileMedia";
import "./ProfileModal.css";

type Profile = AppPreferences["profile"];
type FrameStyle = Profile["frameStyle"];

interface ProfileModalProps {
  profile: Profile;
  onEdit: () => void;
  onClose: () => void;
}

export default function ProfileModal({ profile, onEdit, onClose }: ProfileModalProps) {
  const [draft, setDraft] = useState<Profile>(profile);
  const [editing, setEditing] = useState(false);
  const [mediaError, setMediaError] = useState("");

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function update(changes: Partial<Profile>) {
    setDraft((current) => ({ ...current, ...changes }));
  }

  async function pickMedia(target: "avatarAssetPath" | "bannerAssetPath") {
    try {
      setMediaError("");
      const path = await chooseProfileMedia();
      if (path) update({ [target]: path });
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : String(error));
    }
  }

  function cancelEditing() {
    setDraft(profile);
    setMediaError("");
    setEditing(false);
  }

  function save() {
    if (!draft.displayName.trim()) return;
    onSave({ ...draft, displayName: draft.displayName.trim() });
    setEditing(false);
  }

  const avatarSrc = profileMediaSource(draft.avatarAssetPath);
  const bannerSrc = profileMediaSource(draft.bannerAssetPath);

  return (
    <div className="profile-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
        <header className="profile-modal-header">
          <div>
            <span className="profile-eyebrow">YOUR PERSONAL SPACE</span>
            <h2 id="profile-modal-title">Your profile</h2>
          </div>
          <button className="profile-close" type="button" onClick={onClose} aria-label="Close profile">×</button>
        </header>

        <div className="profile-modal-body">
          <article className={`profile-card frame-${draft.frameStyle}`}>
            <div className="profile-banner">
              {bannerSrc ? <img src={bannerSrc} alt="" className="profile-banner-image" /> : <div className="profile-banner-art" />}
              <div className="profile-banner-overlay" />
              {editing && <button className="profile-media-button profile-banner-edit" type="button" onClick={() => void pickMedia("bannerAssetPath")}>{bannerSrc ? "Change banner" : "Add banner"}</button>}
            </div>

            <div className="profile-identity">
              <div className="profile-avatar-column">
                <div className={`profile-portrait frame-border-${draft.frameStyle}`}>
                  {avatarSrc ? <img src={avatarSrc} alt="" className="profile-portrait-image" /> : <span className="profile-portrait-placeholder">{draft.displayName.trim().charAt(0).toUpperCase() || "K"}</span>}
                </div>
                {editing && <button className="profile-media-button" type="button" onClick={() => void pickMedia("avatarAssetPath")}>{avatarSrc ? "Change portrait" : "Add portrait"}</button>}
              </div>

              <div className="profile-identity-copy">
                {editing ? (
                  <>
                    <label className="profile-field-label">Display name
                      <input maxLength={80} value={draft.displayName} onChange={(event) => update({ displayName: event.target.value })} placeholder="Your name" autoFocus />
                    </label>
                    <label className="profile-field-label">Title <span>Optional</span>
                      <input maxLength={80} value={draft.title} onChange={(event) => update({ title: event.target.value })} placeholder="A little title" />
                    </label>
                  </>
                ) : (
                  <>
                    <h3>{draft.displayName || "Your name"}</h3>
                    {draft.title && <p className="profile-title">{draft.title}</p>}
                  </>
                )}
              </div>
            </div>

            <div className="profile-details">
              {editing ? (
                <>
                  <label className="profile-field-label">Motto <span>Optional</span>
                    <input maxLength={160} value={draft.motto} onChange={(event) => update({ motto: event.target.value })} placeholder="A few words that feel like you" />
                  </label>
                  <label className="profile-field-label">About you <span>Optional</span>
                    <textarea maxLength={1000} rows={4} value={draft.description} onChange={(event) => update({ description: event.target.value })} placeholder="Tell a little story about yourself…" />
                  </label>
                  <label className="profile-field-label">Portrait frame
                    <select value={draft.frameStyle} onChange={(event) => update({ frameStyle: event.target.value as FrameStyle })}>
                      <option value="none">Minimal</option>
                      <option value="lavender">Lavender outline</option>
                      <option value="ornate">Ornate glow</option>
                    </select>
                  </label>
                </>
              ) : (
                <>
                  {draft.motto && <p className="profile-motto">“{draft.motto}”</p>}
                  <p className={`profile-description ${draft.description ? "" : "is-empty"}`}>{draft.description || "Your little corner of Borealis. Add a few words about yourself when you feel like it."}</p>
                  <div className="profile-card-footer"><span className="profile-sparkle">✦</span><span>BOREALIS ROLEPLAY DEN</span></div>
                </>
              )}
              {mediaError && <p className="profile-media-error" role="alert">{mediaError}</p>}
            </div>
          </article>
        </div>

        <footer className="profile-modal-footer">
          {editing ? (
            <>
              <span className="profile-footer-hint">GIF, PNG, JPG and WebP · Stored locally</span>
              <div className="profile-footer-actions">
                <button type="button" className="profile-secondary-button" onClick={cancelEditing}>Cancel</button>
                <button type="button" className="profile-primary-button" disabled={!draft.displayName.trim()} onClick={save}>Save profile</button>
              </div>
            </>
          ) : (
            <>
              <span className="profile-footer-hint">Only stored on this device</span>
              <button type="button" className="profile-primary-button" onClick={onEdit}>Edit profile</button>
            </>
          )}
        </footer>
      </section>
    </div>
  );
}
