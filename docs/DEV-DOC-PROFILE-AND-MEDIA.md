# Profile card and app-wide media — implementation note

## Profile identity
The user profile is app-level and independent of workspaces and roleplay characters. It uses the existing PreferencesContext and is saved to the existing local preferences store. The profile card opens as a standalone floating card with mouse-reactive 3D tilt and a soft holographic highlight. It is read-only; **Edit profile** opens the canonical Settings → Profile editor.

Profile fields: display name (required), title, motto, description, avatar image path, banner image path, and portrait frame style. The portrait uses a fixed 4:5 aspect ratio inside a rounded rectangle. The banner is wide and crops with `object-fit: cover`. The initial card uses an atmospheric BRD gradient if no banner is selected.

## Image and GIF handling
The shared `src/profile/profileMedia.ts` helper opens a native file picker and calls the Rust `import_profile_media` command. The backend copies supported images (PNG, JPG/JPEG, WebP, GIF; max 25 MiB) into BRD's application-data media folder, so the app does not depend on the original file remaining in place. The stored path is app-level, not workspace-level. Tauri's asset protocol is scoped to the app-data directory. GIFs remain original GIF files and animate naturally in the UI.

The media helper may be reused by future character and scene/resource workflows. Character records are not yet implemented, so the composer currently only supports selecting the built-in demo character or "You". When "You" is selected, the composer portrait is bound directly to the saved user profile avatar (including GIF animation). Character portrait selection is intentionally not exposed in the composer; character portraits will get their own workflow through character options later.

## Boundaries
This is local profile identity only: no accounts, cloud sync, public profiles, or social functionality. Avatar frames are currently visual presets: Minimal, Theme Outline (uses the active theme accent), and Ornate glow (animated, stronger accent-coloured glow). Badge collections and profile typography customization remain follow-up work.


## Profile settings workflow (updated)
The sidebar profile avatar opens the read-only profile card. Its **Edit profile** action navigates to Settings → Profile, which is the canonical editor. Settings edits a local draft and applies it only when **Save profile** is pressed; **Cancel** restores the last saved profile. The shared PreferencesContext persists the saved profile through the existing local preferences storage. The profile card and sidebar reflect saved changes from the same profile object.

All profile and character imagery uses a fill/crop presentation (`object-fit: cover`), not letterboxing or distortion. The profile portrait is 4:5, including the sidebar thumbnail; the banner fills its wide container. Source files retain their original dimensions and GIF animation when copied into app storage.


## Composer identity binding (updated)

The composer resolves its current portrait from the selected identity. For **You**, it reads `preferences.profile.avatarAssetPath`, the same saved image used by the profile card and sidebar. This keeps the user portrait consistent everywhere and automatically reflects profile avatar changes without maintaining a duplicate copy. The temporary `characterAvatarPaths` preference is not used by the composer; character portrait editing is reserved for the future character-management workflow. User portrait frame styles apply only to the profile card, not to character portraits.
