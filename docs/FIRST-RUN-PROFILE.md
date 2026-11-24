# Borealis Roleplay Studio — First-launch local profile setup

**Updated:** 24 November 2026 — usability refinements  
**Branch:** `feature/workspace-persistence`  
**Status:** Implemented in source; first-run clean-install and backup-restore regression still require a desktop test.

## Product behaviour

A new installation without a saved `appPreferences` profile presents a **Welcome to Borealis** wizard at startup. It is a **local identity setup**, not an online account:

- Display name: required (up to 80 characters).
- Portrait: optional, imported into the existing app-owned profile media directory (PNG/JPG/WebP/GIF). Retains the app's established 25 MiB validation. **Selecting an image automatically opens a 4:5 framing popup** with horizontal/vertical position and 100–200% zoom sliders. The preview shows the real crop (including GIF animation); Apply keeps both portrait and framing, Cancel leaves the previous portrait unchanged. The portrait can be readjusted later without selecting another image.
- Profile title and description: optional and editable later through **Settings → Profile**.
- The wizard uses a standalone Catppuccin-Frappé-compatible moon/aurora screen; underlying app interactions are disabled until the user completes setup. Field focus is indicated by a soft outward lavender glow instead of a hard focus rectangle, while buttons retain keyboard-visible outlines.
- The **existing Borealis custom titlebar stays visible and interactive above the blurred onboarding backdrop**. Its native drag region moves the Windows/Linux application window, and its minimize, maximize/restore and close buttons remain clickable above the blur. During onboarding it uses a translucent, gently fading Catppuccin background. The first-run overlay starts below the titlebar; only other application content is inert. No special **Move window** button or illustration dragging is needed. Responsive layout and internal form scrolling keep controls accessible on short/narrow windows.
- A **Restore settings backup** option is available before profile creation, so someone reinstalling Borealis can recover their profile directly instead of creating a throwaway identity.
- **After completing a profile**, Borealis opens the existing **Your workspaces** manager (Create workspace / Open workspace / Recents), rather than leaving a new user on an empty scene. The chooser is opened only after the saved last-workspace recovery has finished and **only if no workspace is already active**. This also handles previously configured users with no restorable workspace, but appears at most once per app launch. Closing the chooser is allowed; it can be reopened from the sidebar.
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

- `src/onboarding/FirstRunProfile.tsx` and `FirstRunProfile.css`: welcome UI, local profile form, native image picker, movable viewport-safe window, soft field-focus treatment, optional restore shortcut and focus management.
- `src/onboarding/PortraitFramingDialog.tsx` and `PortraitFramingDialog.css`: dedicated, cancellable portrait-framing popup using the same 4:5 placement/zoom semantics as Settings → Profile.
- `src/main.tsx`: mounts the onboarding screen beside `App` inside the existing providers.
- `src/preferences/types.ts`, `defaults.ts`, `storage.ts`, `PreferencesContext.tsx`: flag, legacy migration and durable profile completion.
- `src/preferences/settingsBackupRestore.ts`: shared ZIP restore and safe dev reload used in onboarding and About.
- `src/settings/AboutSettings.tsx`: delegates to shared ZIP restore implementation.
- `src/profile/profileMedia.ts`: existing image import and media URL handling; unchanged.

## Acceptance tests

Use a disposable test environment. Never delete the only copy of existing app settings or workspaces.

- [ ] **Fresh user** (no `preferences.json`): wizard appears once, before normal app use.
- [ ] **Required name:** empty/whitespace name cannot submit; optional fields can be skipped.
- [ ] **Portrait:** choosing an image opens the framing popup automatically. Horizontal, vertical and zoom sliders update its 4:5 live preview; Apply preserves framing in profile, Cancel leaves previous picture unchanged, Adjust framing reopens the same controls.
- [ ] **Portrait persistence:** thumbnail/frame and original still/GIF image survive profile completion and app restart; invalid image shows an error without completing setup.
- [ ] **Save:** profile, name and title appear in the existing sidebar/profile editor; subsequent launches skip the wizard.
- [ ] **Workspace handoff:** after name-only profile creation, the existing Your workspaces manager appears automatically with Create/Open/Recent choices. Creating or opening a folder selects it and closes the chooser. If the user closes it, it must not reopen repeatedly during the same session.
- [ ] **No race or duplicate:** with a valid last workspace already saved, the app restores it instead of flashing the chooser; after loading a settings backup with recent workspaces, the existing recents remain available.
- [ ] **Quit mid-setup:** wizard returns on the next start and does not pretend setup succeeded.
- [ ] **Legacy settings:** opening any existing `preferences.json` without `profileSetupComplete` skips the wizard and preserves its profile.
- [ ] **Restore before creating:** choose existing backup from the welcome screen; confirmation, restore and restart/reload succeed and the original profile appears.
- [ ] **Reset preferences:** it does not accidentally re-trigger the wizard.
- [ ] **Theme/accessibility:** Frappé/Latte readable, softer focus glow visible, keyboard tab order and popup focus trapping, reduced-motion, and 100–150% UI scale.
- [ ] **Window usability:** with onboarding visible, drag the actual OS window from Borealis's original titlebar; test minimize, maximize/restore and close buttons, all above the blur; ensure the content behind onboarding cannot be interacted with. Verify the welcome panel stays centred and its buttons remain reachable in a small window.
- [ ] **Windows installer:** pack and launch a clean Windows install; verify no settings changes or workspace writes on first run.
- [ ] **Linux desktop** first-run smoke test before claiming Linux alpha support.

No registration/login or remote data collection is required for the alpha.
