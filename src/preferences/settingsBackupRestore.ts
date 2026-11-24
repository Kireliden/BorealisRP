import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { load } from "@tauri-apps/plugin-store";
import type { AppPreferences } from "./types";
import { savePreferences } from "./storage";

export type RestorePreview = {
  createdAt: string;
  applicationVersion: string;
  fileCount: number;
  mediaCount: number;
};

export type RestoreResult = {
  restoredCount: number;
  safetyBackupPath: string;
  restoredStoreNames: string[];
  reloadWebview: boolean;
};

type ConfirmRestore = (message: string, options: {
  title: string;
  confirmLabel: string;
  destructive: boolean;
}) => Promise<boolean>;

/** Shared by About and first-run setup. Returns null when the user cancels. */
export async function chooseAndRestoreSettingsBackup(
  currentPreferences: AppPreferences,
  confirm: ConfirmRestore,
): Promise<RestoreResult | null> {
  const path = await open({
    title: "Choose a Borealis settings backup",
    multiple: false,
    directory: false,
    filters: [{ name: "Borealis backup ZIP", extensions: ["zip"] }],
  });
  if (typeof path !== "string") return null;

  const preview = await invoke<RestorePreview>("inspect_settings_backup", { path });
  const proceed = await confirm(
    `This Borealis backup was created on ${preview.createdAt} (version ${preview.applicationVersion}). ` +
    `It contains ${preview.fileCount} settings/profile files, including ${preview.mediaCount} profile images.\n\n` +
    "Your current application settings will be saved as a safety backup before restoring. " +
    "Workspaces and their contents will not be changed.\n\n" +
    "Borealis will restart or reload after the restore. Continue?",
    { title: "Restore settings backup", confirmLabel: "Restore & restart", destructive: true },
  );
  if (!proceed) return null;

  // Save active preferences before the native pre-restore safety snapshot.
  await savePreferences(currentPreferences);
  const result = await invoke<RestoreResult>("restore_settings_backup", { path });

  if (result.reloadWebview) {
    try {
      // The native plugin-store caches old data independently from the WebView.
      for (const name of result.restoredStoreNames) {
        const store = await load(name, { autoSave: false });
        await store.reload({ ignoreDefaults: true });
      }
    } catch (error) {
      throw new Error(
        "The backup was restored on disk, but the live settings cache could not be refreshed. " +
        "Close the development window and restart npm run tauri dev. " +
        (error instanceof Error ? error.message : String(error)),
      );
    }
    window.location.reload();
  }

  return result;
}
