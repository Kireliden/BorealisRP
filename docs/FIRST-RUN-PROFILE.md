# Borealis Roleplay Studio — First-launch local profile setup

**Updated:** 24 November 2026  
**Branch:** `feature/workspace-persistence`  
**Status:** Implemented in source; first-run clean-install and backup-restore regression still require a desktop test.

## Product behaviour

A new installation without a saved `appPreferences` profile presents a **Welcome to Borealis** wizard at startup. It is a **local identity setup**, not an online account:

- Display name: required (up to 80 characters).
- Portrait: optional, imported into the existing app-owned profile media directory (PNG/JPG/WebP/GIF). Retains the app's established 25 MiB validation.
- Profile title and description: optional and editable later through **Settings → Profile**.
- The wizard uses a standalone Catppuccin-Frappé-compatible moon/aurora screen; underlying app interactions are disabled until the user completes setup.
- A **Restore settings backup** option is available before profile creation, so someone reinstalling Borealis can recover their profile directly instead of creating a throwaway identity.
- No email, account password, remote service, personal analytics or new database is added.

## Storage and migration compatibility

This adds an additive `profileSetupComplete: boolean` to `AppPreferences` while keeping `schemaVersion: 3` and existing profile fields.

- **No saved app preferences:** defaults set `profileSetupComplete: false`; show wizard.
- **Existing preferences from an earlier build or restored older ZIP:** `normalizePreferences` treats an omitted flag as **true**. Do **not** trigger an unwanted first-run wizard for existing users, even when they retained the original default display name.
- **Saved preferences with explicit flag true:** proceed directly to app.
- **Saved preferences with explicit flag false:** show the wizard again; a quit before completion can be resumed.
- **On successful creation:** `completeProfileSetup` saves name, optional profile data and `profileSetupComplete: true` in one awaited `savePreferences` call before releasing the wizard.
- **Reset preferences:** maintains the completed flag rather than treating an existing user as a new install.
- The existing **Settings → About → Backups** ZIP contains the entire `preferences.json`, so the flag and full profile data are included in new backups. Older archives lacking the flag remain supported by the normaliser.
- Backup restoration is shared between onboarding and About via `src/preferences/settingsBackupRestore.ts`. Packaged apps restart after restore; dev mode reloads store caches and the WebView without stopping Vite.

**Workspaces are independent.** The first-run wizard must never delete, rename, create or move workspace folders, nor become a prerequisite for restoring a settings ZIP.

## Source files

- `src/onboarding/FirstRunProfile.tsx` and `FirstRunProfile.css`: welcome UI, local profile form, native image picker, optional restore shortcut and focus management.
- `src/main.tsx`: mounts the onboarding screen beside `App` inside the existing providers.
- `src/preferences/types.ts`, `defaults.ts`, `storage.ts`, `PreferencesContext.tsx`: flag, legacy migration and durable profile completion.
- `src/preferences/settingsBackupRestore.ts`: shared ZIP restore and safe dev reload used in onboarding and About.
- `src/settings/AboutSettings.tsx`: delegates to shared ZIP restore implementation.
- `src/profile/profileMedia.ts`: existing image import and media URL handling; unchanged.

## Acceptance tests

Use a disposable test environment. Never delete the only copy of existing app settings or workspaces.

- [ ] **Fresh user** (no `preferences.json`): wizard appears once, before normal app use.
- [ ] **Required name:** empty/whitespace name cannot submit; optional fields can be skipped.
- [ ] **Portrait:** optional image persists after app restart, including GIF; invalid image shows an error without completing setup.
- [ ] **Save:** profile, name and title appear in the existing sidebar/profile editor; subsequent launches skip the wizard.
- [ ] **Quit mid-setup:** wizard returns on the next start and does not pretend setup succeeded.
- [ ] **Legacy settings:** opening any existing `preferences.json` without `profileSetupComplete` skips the wizard and preserves its profile.
- [ ] **Restore before creating:** choose existing backup from the welcome screen; confirmation, restore and restart/reload succeed and the original profile appears.
- [ ] **Reset preferences:** it does not accidentally re-trigger the wizard.
- [ ] **Theme/accessibility:** Frappé/Latte readable, keyboard tab order and focus, reduced-motion, small windows and 100–150% UI scale.
- [ ] **Windows installer:** pack and launch a clean Windows install; verify no settings changes or workspace writes on first run.
- [ ] **Linux desktop** first-run smoke test before claiming Linux alpha support.

No registration/login or remote data collection is required for the alpha.
