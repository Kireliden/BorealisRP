import AppSelect from "../ui/AppSelect";
import { useEffect, useState } from "react";
import { usePreferences } from "../preferences/PreferencesContext";
import type { AppPreferences } from "../preferences/types";
import { importProfileMediaFile, profileMediaSource, removeSidebarAvatarThumbnail, saveSidebarAvatarThumbnail } from "../profile/profileMedia";
import ImageSourceDialog from "../resources/ImageSourceDialog";
import SaveImageToResourcesDialog from "../resources/SaveImageToResourcesDialog";
import { importResource } from "../resources/resources.storage";
import { importWorkspaceResource } from "../resources/workspaceResources.storage";
import SpecialTitleBadge from "../profile/SpecialTitleBadge";
import { verifiedSpecialTitles, verifySpecialTitleCode, type SpecialTitle } from "../profile/specialTitles";
import "../profile/ProfileModal.css";
import "./ProfileSettings.css";

type Profile = AppPreferences["profile"];

export default function ProfileSettings({ workspacePath }: { workspacePath?: string | null }) {
  const { preferences, updatePreferences } = usePreferences();
  const [draft, setDraft] = useState<Profile>(preferences.profile);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<"avatarAssetPath" | "bannerAssetPath" | null>(null);
  const [systemImageToSave, setSystemImageToSave] = useState<File | null>(null);
  const [titleCodeInput, setTitleCodeInput] = useState("");
  const [verifiedTitles, setVerifiedTitles] = useState<{ key: string; titles: SpecialTitle[] } | null>(null);
  const titleValidationKey = `${draft.displayName}\u0000${JSON.stringify(draft.specialTitleCodes)}`;

  useEffect(() => {
    let cancelled = false;
    void verifiedSpecialTitles(draft.displayName, draft.specialTitleCodes).then((titles) => {
      if (!cancelled) setVerifiedTitles({ key: titleValidationKey, titles });
    });
    return () => { cancelled = true; };
  }, [draft.displayName, draft.specialTitleCodes, titleValidationKey]);

  const unlockedTitles = verifiedTitles?.key === titleValidationKey ? verifiedTitles.titles : [];
  const activeTitle = unlockedTitles.find((title) => title.id === draft.activeSpecialTitleId);

  async function redeemTitle() {
    setError("");
    const title = await verifySpecialTitleCode(titleCodeInput, draft.displayName);
    if (!title) {
      setError("Invalid unlock code, or this display name is not authorised for the title.");
      return;
    }
    update({
      specialTitleCodes: { ...draft.specialTitleCodes, [title.id]: titleCodeInput.trim() },
      activeSpecialTitleId: title.id,
      showSpecialTitle: true,
    });
    setTitleCodeInput("");
  }


  useEffect(() => {
    setDraft(preferences.profile);
  }, [preferences.profile]);

  function update(changes: Partial<Profile>) {
    setDraft((current) => ({ ...current, ...changes }));
    setSaved(false);
  }

  async function useChosenImage(file: File, fromSystem: boolean) {
    if (!mediaTarget) return;
    setError("");
    const storedPath = await importProfileMediaFile(file);
    update({ [mediaTarget]: storedPath });
    if (fromSystem) setSystemImageToSave(file);
  }

  async function save() {
    if (!draft.displayName.trim()) return;
    setError("");

    // Saving the profile must not depend on the optional sidebar thumbnail.
    // In particular, a GIF or a file served by Tauri's asset protocol can fail
    // canvas export even though the original image is perfectly usable.
    let thumbnailWarning = "";
    try {
      const isAnimatedGif = draft.avatarAssetPath?.split(/[?#]/, 1)[0].toLocaleLowerCase().endsWith(".gif") ?? false;
      if (draft.avatarAssetPath && !isAnimatedGif) {
        const thumbnailPath = await saveSidebarAvatarThumbnail(draft.avatarAssetPath, draft.avatarPositionX, draft.avatarPositionY, draft.avatarZoom);
        window.dispatchEvent(new CustomEvent("brd-sidebar-avatar-thumbnail-updated", { detail: thumbnailPath }));
      } else {
        await removeSidebarAvatarThumbnail();
        window.dispatchEvent(new CustomEvent("brd-sidebar-avatar-thumbnail-updated", { detail: "" }));
      }
    } catch (reason) {
      thumbnailWarning = reason instanceof Error ? reason.message : String(reason);
      // Keep the previous thumbnail if generation failed; never block saving
      // profile fields or the original portrait/banner because of this cache.
    }

    try {
      await updatePreferences((current) => ({ ...current, profile: { ...draft, displayName: draft.displayName.trim() } }));
      setSaved(true);
      if (thumbnailWarning) {
        setError(`Profile saved, but the sidebar thumbnail could not be updated: ${thumbnailWarning}`);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
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
        <p>Shape the little corner of BRS that represents you. Your profile is saved locally and stays separate from your roleplay characters.</p>
      </div>

      <div className="profile-preview-layout">
      <article className={`profile-card frame-${draft.frameStyle}`}>
        <div className="profile-banner">
          {bannerSrc ? <img src={bannerSrc} alt="" className="profile-banner-image" style={{ objectPosition: `${draft.bannerPositionX}% ${draft.bannerPositionY}%`, transform: `scale(${draft.bannerZoom / 100})`, transformOrigin: `${draft.bannerPositionX}% ${draft.bannerPositionY}%` }} /> : <div className="profile-banner-art" />}
          <div className="profile-banner-overlay" />
          <button className="profile-media-button profile-banner-edit" type="button" onClick={() => setMediaTarget("bannerAssetPath")}>{bannerSrc ? "Change banner" : "Add banner / GIF"}</button>
          {bannerSrc && <button className="profile-media-button profile-banner-remove" type="button" onClick={() => update({ bannerAssetPath: null })}>Remove</button>}
        </div>

        <div className="profile-identity">
          <div className="profile-avatar-column">
            <div className={`profile-portrait frame-border-${draft.frameStyle}`}>
              {avatarSrc ? <img src={avatarSrc} alt="" className="profile-portrait-image" style={{ objectPosition: `${draft.avatarPositionX}% ${draft.avatarPositionY}%`, transform: `scale(${draft.avatarZoom / 100})`, transformOrigin: `${draft.avatarPositionX}% ${draft.avatarPositionY}%` }} /> : <span className="profile-portrait-placeholder">{draft.displayName.trim().charAt(0).toUpperCase() || "K"}</span>}
            </div>
            <button className="profile-media-button" type="button" onClick={() => setMediaTarget("avatarAssetPath")}>{avatarSrc ? "Change portrait / GIF" : "Add portrait / GIF"}</button>
            {avatarSrc && <button className="profile-media-button profile-remove-media" type="button" onClick={() => update({ avatarAssetPath: null })}>Remove portrait</button>}
          </div>

          <div className="profile-identity-copy profile-settings-fields">
            <label className="profile-field-label">Display name <span>Required</span>
              <input maxLength={80} value={draft.displayName} onChange={(event) => update({ displayName: event.target.value })} placeholder="Your name" />
            </label>
            <label className="profile-field-label">Title <span>Optional · hidden while special title is enabled</span>
              <input maxLength={80} value={draft.title} onChange={(event) => update({ title: event.target.value })} placeholder="A little title" />
            </label>
            <div className="profile-special-titles">
              <strong>Special titles</strong>
              <p>Exclusive titles require a signed unlock code. Developer titles also require the matching reserved display name.</p>
              <div className="profile-title-redeem">
                <input type="password" autoComplete="off" spellCheck={false} aria-label="Special title unlock code" value={titleCodeInput} onChange={(event) => setTitleCodeInput(event.target.value)} placeholder="Enter an unlock code…" />
                <button className="profile-secondary-button" type="button" disabled={!titleCodeInput.trim()} onClick={() => void redeemTitle()}>Unlock</button>
              </div>
              {unlockedTitles.length > 0 ? <>
                <label className="profile-special-title-toggle">
                  <input type="checkbox" checked={draft.showSpecialTitle} onChange={(event) => update({ showSpecialTitle: event.target.checked })} />
                  <span><strong>Show special title</strong><small>Use an unlocked title instead of your regular profile title.</small></span>
                </label>
                <label className="profile-title-choice">Unlocked title
                  <AppSelect value={activeTitle?.id ?? ""} onChange={(event) => update({ activeSpecialTitleId: event.target.value || null })}>
                    <option value="">Select a title…</option>
                    {unlockedTitles.map((title) => <option value={title.id} key={title.id}>{title.label}</option>)}
                  </AppSelect>
                </label>
                {draft.showSpecialTitle && activeTitle && <div className="profile-special-title-preview"><SpecialTitleBadge title={activeTitle} /></div>}
              </> : <small>No special titles are unlocked for this display name.</small>}
            </div>
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
            <AppSelect value={draft.frameStyle} onChange={(event) => update({ frameStyle: event.target.value as Profile["frameStyle"] })}>
              <option value="none">Minimal</option>
              <option value="lavender">Theme Outline</option>
              <option value="ornate">Ornate glow</option>
            </AppSelect>
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

      {mediaTarget && <ImageSourceDialog
        workspacePath={workspacePath}
        title={mediaTarget === "avatarAssetPath" ? "Choose profile portrait" : "Choose profile banner"}
        onCancel={() => setMediaTarget(null)}
        onSystem={(file) => useChosenImage(file, true)}
        onResource={(file) => useChosenImage(file, false)}
      />}
      {systemImageToSave && <SaveImageToResourcesDialog
        fileName={systemImageToSave.name}
        onSkip={() => setSystemImageToSave(null)}
        onSave={async () => {
          if (workspacePath) await importWorkspaceResource(workspacePath, systemImageToSave);
          else await importResource(systemImageToSave);
          setSystemImageToSave(null);
        }}
      />}
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
