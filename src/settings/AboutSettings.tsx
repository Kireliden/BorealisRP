import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { Archive, Download, Heart, Info, RotateCcw, Users } from "lucide-react";
import { useAppDialog } from "../ui/AppDialogProvider";
import { usePreferences } from "../preferences/PreferencesContext";
import { savePreferences } from "../preferences/storage";
import "./AboutSettings.css";

const APP_VERSION = "0.1.0";
type BackupResult = { path: string; fileCount: number };
type RestorePreview = {
  createdAt: string;
  applicationVersion: string;
  fileCount: number;
  mediaCount: number;
};
type RestoreResult = { restoredCount: number; safetyBackupPath: string };
type BackupFeedback = { kind: "success" | "error"; message: string };

export default function AboutSettings() {
  const { isLoaded, preferences } = usePreferences();
  const { confirm } = useAppDialog();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupFeedback, setBackupFeedback] = useState<BackupFeedback | null>(null);

  async function createBackup() {
    if (!isLoaded || isBackingUp || isRestoring) return;
    setIsBackingUp(true);
    setBackupFeedback(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const destination = await save({
        title: "Save Borealis settings backup",
        defaultPath: `Borealis-Settings-${today}.zip`,
        filters: [{ name: "ZIP archive", extensions: ["zip"] }],
      });
      if (!destination) return;
      // Flush the latest live UI preferences before Rust snapshots the files.
      await savePreferences(preferences);
      const result = await invoke<BackupResult>("create_settings_backup", {
        destinationPath: destination,
      });
      setBackupFeedback({
        kind: "success",
        message: `Backup saved (${result.fileCount} files): ${result.path}`,
      });
    } catch (error) {
      setBackupFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsBackingUp(false);
    }
  }

  async function restoreBackup() {
    if (!isLoaded || isBackingUp || isRestoring) return;
    setBackupFeedback(null);
    try {
      const source = await open({
        title: "Choose a Borealis settings backup",
        multiple: false,
        directory: false,
        filters: [{ name: "Borealis backup ZIP", extensions: ["zip"] }],
      });
      if (typeof source !== "string") return;
      setIsRestoring(true);
      const preview = await invoke<RestorePreview>("inspect_settings_backup", { path: source });
      const proceed = await confirm(
        `This Borealis backup was created on ${preview.createdAt} (version ${preview.applicationVersion}). ` +
        `It contains ${preview.fileCount} settings/profile files, including ${preview.mediaCount} profile images.\n\n` +
        "Your current application settings will be saved as a safety backup before restoring. " +
        "Workspaces and their contents will not be changed.\n\n" +
        "Borealis will restart automatically after the restore. Continue?",
        { title: "Restore settings backup", confirmLabel: "Restore & restart", destructive: true },
      );
      if (!proceed) return;
      // The native command validates the ZIP a second time, stages files,
      // preserves the current settings and restarts the app upon success.
      const result = await invoke<RestoreResult>("restore_settings_backup", { path: source });
      setBackupFeedback({
        kind: "success",
        message: `Restored ${result.restoredCount} files. Restarting Borealis… Safety copy: ${result.safetyBackupPath}`,
      });
    } catch (error) {
      setBackupFeedback({ kind: "error", message: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsRestoring(false);
    }
  }

  return (
    <div className="about-settings">
      <section className="about-hero">
        <div className="about-app-mark" aria-hidden="true">☾</div>
        <span className="settings-eyebrow">YOUR ROLEPLAY SPACE</span>
        <h4>Borealis Roleplay Studio</h4>
        <p>A little space for the stories, characters, and worlds you create.</p>
        <span className="about-version">Version {APP_VERSION}</span>
      </section>

      <section className="about-section" aria-labelledby="about-updates-title">
        <div className="about-section-heading">
          <Download size={18} aria-hidden="true" />
          <div>
            <h5 id="about-updates-title">Updates</h5>
            <p>Keep Borealis up to date with the latest improvements.</p>
          </div>
        </div>
        <button
          type="button"
          className="about-action"
          data-tooltip="Coming soon"
          aria-label="Check for updates — Coming soon"
          disabled
        >
          <span>Check for updates</span>
          <span className="about-action-status">Coming soon</span>
        </button>
      </section>

      <section className="about-section" aria-labelledby="about-backups-title">
        <div className="about-section-heading">
          <Archive size={18} aria-hidden="true" />
          <div>
            <h5 id="about-backups-title">Backups</h5>
            <p>Keep a personal copy of your Borealis settings and profile artwork.</p>
          </div>
        </div>
        <button
          type="button"
          className="about-action about-backup-action"
          onClick={() => void createBackup()}
          disabled={isBackingUp || isRestoring || !isLoaded}
          aria-busy={isBackingUp}
        >
          <span>Create settings backup</span>
          <span className="about-action-status">{isBackingUp ? "Creating backup…" : "Save ZIP…"}</span>
        </button>
        <button
          type="button"
          className="about-action about-backup-action"
          onClick={() => void restoreBackup()}
          disabled={isRestoring || isBackingUp || !isLoaded}
          aria-busy={isRestoring}
        >
          <span className="about-backup-label"><RotateCcw size={15} aria-hidden="true" /> Restore settings backup</span>
          <span className="about-action-status">{isRestoring ? "Checking backup…" : "Choose ZIP…"}</span>
        </button>
        <p className="about-backup-hint">
          Includes themes, interface preferences, saved workspace icons, recent workspace
          references, achievements and imported profile images. Your Workspaces
          (characters, scenes, chats and resources) are stored separately and are
          <strong> not included</strong>. The ZIP also includes manual recovery instructions. Restoring requires a restart and automatically saves your current settings first.
        </p>
        {backupFeedback && (
          <p className={`about-backup-feedback ${backupFeedback.kind}`}
            role={backupFeedback.kind === "error" ? "alert" : "status"}>
            {backupFeedback.message}
          </p>
        )}
      </section>

      <section className="about-section" aria-labelledby="about-credits-title">
        <div className="about-section-heading">
          <Users size={18} aria-hidden="true" />
          <div>
            <h5 id="about-credits-title">Credits</h5>
            <p>Made with care, curiosity, and a love for roleplay.</p>
          </div>
        </div>
        <div className="about-credit-row">
          <span>Development & design</span>
          <span>StrandedStars team</span>
        </div>
        <div className="about-credit-row">
          <span>Catppuccin Themes</span>
          <span>Catppuccin Community</span>
        </div>
        <div className="about-credit-row">
          <span>Emoji artwork</span>
          <span>OpenMoji</span>
        </div>
        <div className="about-credit-row">
          <span>Icons</span>
          <span>Lucide</span>
        </div>
      </section>

      <section className="about-note">
        <Heart size={16} aria-hidden="true" />
        <p>Borealis is a work in progress. More details and useful links will find their home here.</p>
      </section>
      <span className="about-build-note"><Info size={13} aria-hidden="true" /> Update support is planned for a future release.</span>
    </div>
  );
}
