import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, ImagePlus, RotateCcw, Sparkles, UserRound, X } from "lucide-react";
import { usePreferences } from "../preferences/PreferencesContext";
import { chooseAndRestoreSettingsBackup } from "../preferences/settingsBackupRestore";
import { chooseProfileMedia, profileMediaSource } from "../profile/profileMedia";
import { useAppDialog } from "../ui/AppDialogProvider";
import "./FirstRunProfile.css";

/**
 * Only appears when preferences.json did not contain an existing profile.
 * This creates a LOCAL identity, not an account and not a character.
 */
export default function FirstRunProfile() {
  const { preferences, isLoaded, error: preferencesError, completeProfileSetup } = usePreferences();
  const { confirm } = useAppDialog();
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const visible = isLoaded && !preferencesError && !preferences.profileSetupComplete;
  useEffect(() => {
    if (!visible) return;
    // The app may render behind the wizard, but must not be keyboard-accessible
    // before the owner has created or restored their local profile.
    const root = document.getElementById("root");
    const wasInert = root?.inert ?? false;
    if (root) root.inert = true;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled])',
      ));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleTab);
    nameInputRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", handleTab);
      if (root) root.inert = wasInert;
      document.body.style.overflow = oldOverflow;
    };
  }, [visible]);

  if (!visible) return null;
  const busy = isSaving || isPickingImage || isRestoring;
  const validName = name.trim().length > 0 && name.trim().length <= 80;
  const avatar = profileMediaSource(avatarPath);

  async function addAvatar() {
    if (busy) return;
    setIsPickingImage(true);
    setError("");
    try {
      const path = await chooseProfileMedia();
      if (path) setAvatarPath(path);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsPickingImage(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validName || busy) return;
    setIsSaving(true);
    setError("");
    try {
      await completeProfileSetup({
        displayName: name.trim(),
        avatarAssetPath: avatarPath,
        title: title.trim(),
        description: description.trim(),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsSaving(false);
    }
  }

  async function restoreExisting() {
    if (busy) return;
    setIsRestoring(true);
    setError("");
    try {
      await chooseAndRestoreSettingsBackup(preferences, confirm);
      // The packaged app restarts in Rust. In Tauri dev the helper refreshes
      // plugin stores and reloads the current WebView without stopping Vite.
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsRestoring(false);
    }
  }

  return createPortal(
    <div className="first-run-backdrop">
      <section className="first-run-window" role="dialog" aria-modal="true"
        aria-labelledby="first-run-title" aria-describedby="first-run-subtitle" ref={dialogRef}>
        <div className="first-run-art" aria-hidden="true">
          <div className="first-run-sky">
            <div className="first-run-aurora first-run-aurora-one" />
            <div className="first-run-aurora first-run-aurora-two" />
            <div className="first-run-moon" />
            <div className="first-run-star star-one">✦</div>
            <div className="first-run-star star-two">✧</div>
            <div className="first-run-star star-three">✦</div>
          </div>
          <div className="first-run-hills far-hills" />
          <div className="first-run-hills near-hills" />
          <div className="first-run-art-footer">
            <Sparkles size={15} />
            <span>YOUR STORIES BEGIN HERE</span>
          </div>
        </div>

        <div className="first-run-main">
          <div className="first-run-eyebrow">BOREALIS ROLEPLAY STUDIO <span>· FIRST LAUNCH</span></div>
          <h1 id="first-run-title">Welcome to Borealis.</h1>
          <p id="first-run-subtitle" className="first-run-intro">
            Let's make a little space that's yours. Choose how you want to appear
            in Borealis — you can change everything later in Settings.
          </p>
          <form onSubmit={(event) => void submit(event)} className="first-run-form">
            <div className="first-run-identity">
              <div className="first-run-avatar-slot">
                <div className="first-run-avatar-preview">
                  {avatar ? <img src={avatar} alt="Your selected profile portrait" /> :
                    name.trim() ? <span>{name.trim().charAt(0).toUpperCase()}</span> :
                      <UserRound size={36} strokeWidth={1.4} aria-hidden="true" />}
                </div>
                <button type="button" className="first-run-avatar-button" onClick={() => void addAvatar()} disabled={busy}>
                  <ImagePlus size={15} aria-hidden="true" />
                  {avatar ? "Change portrait" : "Add portrait"}
                </button>
                {avatar && <button type="button" className="first-run-avatar-remove"
                  disabled={busy} onClick={() => setAvatarPath(null)}>
                  <X size={12} aria-hidden="true" /> Remove
                </button>}
                <small>Optional · PNG, JPG, WebP or GIF</small>
              </div>
              <div className="first-run-fields">
                <label htmlFor="first-run-display-name">Display name <span>Required</span></label>
                <input ref={nameInputRef} id="first-run-display-name" type="text"
                  placeholder="What should we call you?" maxLength={80} value={name}
                  onChange={(event) => setName(event.target.value)} autoComplete="nickname"
                  spellCheck={false} required disabled={busy}/>
                <label htmlFor="first-run-profile-title">Profile title <span>Optional</span></label>
                <input id="first-run-profile-title" type="text" placeholder="Something uniquely yours"
                  maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)}
                  disabled={busy}/>
              </div>
            </div>
            <label htmlFor="first-run-about">A little about you <span>Optional</span></label>
            <textarea id="first-run-about" rows={2} maxLength={1000}
              placeholder="A few words, or leave this for later…"
              value={description} onChange={(event) => setDescription(event.target.value)}
              disabled={busy}/>
            {error && <p className="first-run-error" role="alert">{error}</p>}
            <p className="first-run-privacy">No account, email or password required. Your profile stays on this computer.</p>
            <button type="submit" className="first-run-create" disabled={!validName || busy}>
              {isSaving ? "Saving your profile…" : "Enter Borealis"}
              <ArrowRight size={17} aria-hidden="true"/>
            </button>
          </form>
          <div className="first-run-existing">
            <span>Already have your settings saved?</span>
            <button type="button" disabled={busy} onClick={() => void restoreExisting()}>
              <RotateCcw size={14} aria-hidden="true"/>
              {isRestoring ? "Restoring…" : "Restore settings backup"}
            </button>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}
