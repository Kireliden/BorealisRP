# Borealis Roleplay Studio — Settings backup

**Implemented:** 11 November 2026  
**Scope:** First-generation **export-only** settings backup in **Settings → About → Backups**.  
**Status:** Code committed to `feature/workspace-persistence`; end-to-end desktop backup/restore tests remain required.

## User workflow

1. Open **Settings → About**.
2. Below **Check for updates**, find **Backups** and click **Create settings backup**.
3. Select a destination for `Borealis-Settings-YYYY-MM-DD.zip` using the native Save dialog.
4. Borealis flushes the current in-memory preferences, then creates the ZIP using a native Rust command. A success message includes the file count and destination. Cancelling the dialog makes no changes.

The ZIP is a real compressed archive, not merely a renamed JSON file. It contains:

- `backup-manifest.json` — format `borealis-settings-backup`, schema version 1, app identifier/version, timestamp and included file names.
- `RESTORE-INSTRUCTIONS.txt` — manual restoration and exclusions.
- `AppData/preferences.json` — saved preferences: theme, scale, fonts, accessibility, profile fields, composer/chat configuration, etc., if present.
- `AppData/workspace-icons.json` — workspace icon preference, keyed by workspace ID, if present.
- `AppData/recent-workspaces.json` — last active workspace/recent locations, if present.
- `AppData/collections.json` — discovered collection/easter-egg data, if present.
- `AppData/window-state.json` — if that store exists at the same location.
- `AppData/media/*` — regular profile media files/thumbnail under the app-owned `media` directory, if present.

Optional files are omitted if they do not yet exist. Existing archives are not replaced. The archive is first written to a temporary file in the chosen directory and only moved to its final name once completed. Compression runs off the main UI thread.

## Not included

**This does NOT back up Workspaces.** Characters, messages, scenes, folders, resources, expression assets and drafts live in user-selected workspace directories. Make a separate full copy of each workspace folder with Borealis closed, or use a future workspace-backup tool.

The snapshot also does not export WebView caches, arbitrary browser localStorage/IndexedDB data, external application files or third-party installations. In particular, some nonessential UI recents/states kept in WebView storage may not be included. Treat the backup as **core app settings + profile media**, not a full OS/app image.

The archive may contain personal details and local paths. Keep it somewhere private.

## Manual restore in the current version

Automatic **Restore backup** UI is not implemented yet.

1. Close Borealis completely (including any developer build).
2. Preserve a copy of your current Borealis app-data folder before replacing anything.
3. Unzip the `AppData/` folder contents into the application's data directory; on standard Windows installations this is typically `%APPDATA%\\com.borealis.rp`.
4. Reopen Borealis and verify the appearance, profile and recent Workspaces.
5. If restored on another Windows user/account or computer, an absolute avatar/banner path within `preferences.json` may need to be adjusted, and old recent workspace paths may no longer exist. The ZIP includes the profile media bytes but does not rewrite absolute paths automatically.

**Never restore ZIP files by extracting into Program Files.** Application binaries and app/user data live in separate places. Do not overwrite Workspace folders with settings backups.

## Developer implementation

- UI: `src/settings/AboutSettings.tsx` and `AboutSettings.css`; separate section immediately below Updates.
- Snapshot trigger: `src/preferences/storage.ts`'s `savePreferences` flushes the latest React preference state before export.
- Rust: `src-tauri/src/settings_backup.rs`, registered as `create_settings_backup` by `src-tauri/src/lib.rs`. Uses `zip` crate and `app.path().app_data_dir()`.
- Fixed allowlist of settings stores, nonrecursive regular media files, symlinks avoided, size/file-count limits, failure cleanup and no overwriting old ZIPs.
- The destination path comes from the native Save dialog. The backend also validates its absolute path and `.zip` extension.

## Verification (pending)

- [ ] `npm run build` and `npm run tauri build -- --bundles nsis` on the newest commit.
- [ ] Create backup with changed theme and freshly imported profile image; check ZIP contains exact expected entries.
- [ ] Cancel the Save dialog; verify no archive is written.
- [ ] Try an existing target filename; error should leave the old backup intact.
- [ ] On a disposable Windows account or with an app-data copy, manually restore backup and verify preferences and media.
- [ ] Confirm workspace files are unaffected and not accidentally bundled in ZIP.
- [ ] Linux smoke test and check WebView-independent settings persistence.

Do not label this **backup + restore** until an explicit in-app restore workflow with validation, rollback and restart behaviour has been implemented and tested.
