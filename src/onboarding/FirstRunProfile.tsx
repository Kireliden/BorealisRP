import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, ImagePlus, RotateCcw, SlidersHorizontal, Sparkles, UserRound, X } from "lucide-react";
import { usePreferences } from "../preferences/PreferencesContext";
import { chooseAndRestoreSettingsBackup } from "../preferences/settingsBackupRestore";
import { chooseProfileMedia, profileMediaSource, removeSidebarAvatarThumbnail, saveSidebarAvatarThumbnail } from "../profile/profileMedia";
import PortraitFramingDialog, { type PortraitFraming } from "./PortraitFramingDialog";
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
  const [avatarFraming, setAvatarFraming] = useState<PortraitFraming>({
    avatarPositionX: 50, avatarPositionY: 50, avatarZoom: 100,
  });
  const [framingDialog, setFramingDialog] = useState<{ path: string; isNew: boolean } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const visible = isLoaded && !preferencesError && !preferences.profileSetupComplete;
  useEffect(() => {
    if (!visible) return;
    // Keep the REAL Tauri titlebar interactive above the frosted overlay.
    // App.tsx already controls the main app-content's inert state so it cannot
    // be accidentally unlocked (or re-locked) when setup completes. Only
    // suspend other app-shell siblings while this first-run wizard is visible.
    const shell = document.querySelector<HTMLElement>("#root .app-shell");
    const blocked = Array.from(shell?.children ?? [])
      .filter((element): element is HTMLElement =>
        element instanceof HTMLElement &&
        !element.classList.contains("custom-titlebar") &&
        !element.classList.contains("app-content"))
      .map((element) => ({ element, wasInert: element.inert }));
    for (const entry of blocked) entry.element.inert = true;
    document.body.classList.add("first-run-onboarding-active");
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleTab = (event: KeyboardEvent) => {
      // The framing popup has its own focus trap.
      if (document.querySelector(".first-run-crop-backdrop")) return;
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
      for (const entry of blocked) entry.element.inert = entry.wasInert;
      document.body.classList.remove("first-run-onboarding-active");
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
      if (path) setFramingDialog({ path, isNew: true });
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
      // Like Profile settings, the optional sidebar thumbnail follows the chosen
      // portrait framing. A failed thumbnail must not block account setup.
      try {
        const isGif = avatarPath?.split(/[?#]/, 1)[0].toLowerCase().endsWith(".gif");
        if (avatarPath && !isGif) {
          const thumbnail = await saveSidebarAvatarThumbnail(
            avatarPath, avatarFraming.avatarPositionX, avatarFraming.avatarPositionY, avatarFraming.avatarZoom,
          );
          window.dispatchEvent(new CustomEvent("brd-sidebar-avatar-thumbnail-updated", { detail: thumbnail }));
        } else {
          await removeSidebarAvatarThumbnail();
          window.dispatchEvent(new CustomEvent("brd-sidebar-avatar-thumbnail-updated", { detail: "" }));
        }
      } catch (warning) {
        console.warn("Profile thumbnail could not be generated:", warning);
      }
      await completeProfileSetup({
        displayName: name.trim(),
        avatarAssetPath: avatarPath,
        ...avatarFraming,
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
        aria-labelledby="first-run-title" aria-describedby="first-run-subtitle" ref={dialogRef}
        aria-hidden={framingDialog ? true : undefined}
        inert={Boolean(framingDialog)}>
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
                  {avatar ? <img src={avatar} alt="Your selected profile portrait"
                    style={{
                      objectPosition: `${avatarFraming.avatarPositionX}% ${avatarFraming.avatarPositionY}%`,
                      transform: `scale(${avatarFraming.avatarZoom / 100})`,
                      transformOrigin: `${avatarFraming.avatarPositionX}% ${avatarFraming.avatarPositionY}%`,
                    }}/> :
                    name.trim() ? <span>{name.trim().charAt(0).toUpperCase()}</span> :
                      <UserRound size={36} strokeWidth={1.4} aria-hidden="true" />}
                </div>
                <button type="button" className="first-run-avatar-button" onClick={() => void addAvatar()} disabled={busy}>
                  <ImagePlus size={15} aria-hidden="true" />
                  {avatar ? "Change portrait" : "Add portrait"}
                </button>
                {avatar && <>
                  <button type="button" className="first-run-avatar-button"
                    disabled={busy} onClick={() => setFramingDialog({ path: avatarPath!, isNew: false })}>
                    <SlidersHorizontal size={14} aria-hidden="true"/> Adjust framing
                  </button>
                  <button type="button" className="first-run-avatar-remove"
                    disabled={busy} onClick={() => setAvatarPath(null)}>
                    <X size={12} aria-hidden="true" /> Remove
                  </button>
                </>}
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
      {framingDialog && <PortraitFramingDialog
        imagePath={framingDialog.path}
        initial={framingDialog.isNew ? {
          avatarPositionX: 50, avatarPositionY: 50, avatarZoom: 100,
        } : avatarFraming}
        onApply={(framing) => {
          setAvatarPath(framingDialog.path);
          setAvatarFraming(framing);
          setFramingDialog(null);
        }}
        onCancel={() => setFramingDialog(null)}
      />}
    </div>,
    document.body,
  );
}
