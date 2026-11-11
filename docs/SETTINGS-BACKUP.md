# Borealis Roleplay Studio — Settings backup and restore

**Updated:** 11 November 2026  
**UI:** **Settings → About → Backups**, below Check for updates.  
**Status:** Export and import implemented in source on `feature/workspace-persistence`; complete desktop restore acceptance is still pending.

## What is included

Backups are `Borealis-Settings-YYYY-MM-DD.zip` archives with format `borealis-settings-backup`, schema version 1, application identifier `com.borealis.rp`.

| Included | Examples |
| --- | --- |
| App preferences | Theme, appearance, scale, font, editor/chat, accessibility, profile metadata |
| Workspace UI preferences | Recent/last workspace references and workspace icon choices |
| Collections | Achievements and discoveries |
| Local profile artwork | Imported profile photos, banners, sidebar avatar thumbnail |
| Optional window state | Only if the store exists at the app-data location |

The ZIP contains `backup-manifest.json`, `RESTORE-INSTRUCTIONS.txt` and an `AppData/` directory with the included files. Missing optional stores are not invented.

**Not included:** Workspace folders (scenes, chats, messages, folders, characters, resources, expressions, drafts); WebView localStorage/IndexedDB caches and unrelated third-party files. Workspaces require a separate copy/restore of their entire folder. This archive is not a full-system image or a complete migration of every browser-local setting.

## Export

1. Click **Create settings backup**.
2. Choose a new ZIP filename in the native Save dialog.
3. Borealis flushes current React preferences to `preferences.json` and creates the archive off the UI thread.
4. The UI shows either the path and number of included files or a meaningful error. Cancel means no changes.

The output is staged and moved into place only after success. Existing ZIP files are never silently replaced. The file may include your personal information and local folder paths; store it privately.

## Restore

1. Click **Restore settings backup** and choose a ZIP from the native Open dialog.
2. Borealis validates the archive and presents its creation date, application version, file count and image count.
3. Confirm the overwrite. The dialogue explicitly says that the application **will restart automatically** and Workspace folders are not modified.
4. The Rust backend validates the archive again, stages the data, saves current app settings as a **safety ZIP**, then applies the contained settings and images.
5. The app requests a native restart so plugin-store caches and React state are discarded and the restored settings load on the next launch.

**Safety copy:** `%APPDATA%\com.borealis.rp\settings-backups\before-restore-<UUID>.zip` on Windows, or the corresponding app-data directory on another supported desktop platform. It is deliberately not included in future settings exports.

**Restore semantics:** Files listed in the chosen backup replace their corresponding app-local files; stores absent from that backup are left untouched. Files already on disk but no longer referenced by the restored profile are also left in place. The importer does not delete arbitrary files or user Workspace directories.

The restore implementation is intentionally strict:
- Requires a valid `backup-manifest.json` with supported format/schema, expected app identifier and consistent entry list.
- Only accepts the small allowlist of app preference files and simple non-nested media filenames; rejects unexpected paths, directories, symlinks, duplicates and oversized entries.
- Checks each settings JSON parses as an object and enforces total and per-file decompression limits.
- Writes to a temporary staging folder first; makes an emergency ZIP of current settings before modifying them.
- On a write failure, attempts to roll back files already touched using preserved copies; reports the safety ZIP location if manual recovery is needed.
- Rewrites the two known imported profile image absolute paths when the corresponding image is in the archive (useful for backups moved between Windows accounts/computers).
- Avoids UI-thread ZIP operations.

**If a restore cannot complete:** do not guess or manually delete files. Read the error. The pre-restore ZIP is intended for recovery; if rollback was incomplete, it also retains temporary recovery material. Report the error message before making more changes.

## Technical files

- `src/settings/AboutSettings.tsx`, `AboutSettings.css`: export and import actions, native file selection, validation preview and themed confirmation.
- `src/ui/AppDialogProvider.tsx`: existing application confirmation modal.
- `src-tauri/src/settings_backup.rs`: creation, validation, staging, local safety snapshot, restore/rollback and restart request.
- `src-tauri/src/lib.rs`: `create_settings_backup`, `inspect_settings_backup`, `restore_settings_backup` commands.
- `src-tauri/capabilities/default.json`: existing `dialog:allow-open` and `dialog:allow-save` permissions, scoped to the main window.
- `src-tauri/Cargo.toml`: ZIP compression dependency.

## Validation checklist

- [ ] Build exact branch head: frontend, Rust and Windows NSIS package.
- [ ] Export changes to appearance/profile; inspect archive manifest and media, and verify create/cancel behaviour.
- [ ] Restore a backup into a **disposable app-data profile** and compare its settings with source. Test native restart and preference persistence after reopening.
- [ ] Confirm cancelled/invalid/wrong-version/extra-file/oversized backups do not modify settings.
- [ ] Confirm a **before-restore** ZIP is created and can itself be inspected/restored.
- [ ] Test backup transferred between user profiles; avatar/banner paths should point to restored copies.
- [ ] Simulate a write failure using disposable settings; verify rollback and diagnostics.
- [ ] Test that active Workspace files never change, and that legacy WebView-local data are not mistakenly described as backed up.
- [ ] Test Linux desktop restoration before declaring cross-platform support.

**Before relying on this for important settings:** keep a separate manual copy of the app-data folder, and run the tests above. Implementation alone is not evidence of tested data safety.
