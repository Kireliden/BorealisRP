# Profile card and app-wide media — implementation note

## Profile identity
The user profile is app-level and independent of workspaces and roleplay characters. It uses the existing PreferencesContext and is saved to the existing local preferences store. The profile card opens in read-only presentation mode first; the user explicitly enters edit mode and can save or cancel a draft.

Profile fields: display name (required), title, motto, description, avatar image path, banner image path, and portrait frame style. The portrait uses a fixed 3:4 aspect ratio inside a rounded rectangle. The banner is wide and crops with `object-fit: cover`. The initial card uses an atmospheric BRD gradient if no banner is selected.

## Image and GIF handling
The shared `src/profile/profileMedia.ts` helper opens a native file picker and calls the Rust `import_profile_media` command. The backend copies supported images (PNG, JPG/JPEG, WebP, GIF; max 25 MiB) into BRD's application-data media folder, so the app does not depend on the original file remaining in place. The stored path is app-level, not workspace-level. Tauri's asset protocol is scoped to the app-data directory. GIFs remain original GIF files and animate naturally in the UI.

This helper is deliberately reusable for character portrait pickers and future scene/resource media. Character records are not yet implemented; the existing composer can use the same import helper and keep per-character portrait paths in app preferences as an interim bridge.

## Boundaries
This is local profile identity only: no accounts, cloud sync, public profiles, or social functionality. Avatar frames are currently visual presets; badge collections and profile typography customization remain follow-up work.
