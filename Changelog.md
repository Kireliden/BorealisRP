# Borealis Roleplay Den — Changelog

This changelog records meaningful project changes, not every Git commit. Dates are approximate where an exact implementation date was not recorded. Completed code and user-confirmed behavior are distinguished from work that still needs broader testing.

**Current development status (10 November 2026):** internal Alpha, work in progress. The repository's package and Tauri configuration currently declare `0.1.0`. The retrospective `v0.0.x` milestones and proposed `v0.1.0-alpha.1` label below are **historical/organizational labels only**; they were not necessarily published, built, or tagged in Git. No official releases are implied.


## Retrospective milestone calendar (unofficial)

| Approximate period | Suggested milestone | Main progress |
| --- | --- | --- |
| 15 Oct 2026 | `v0.0.1` — The Beginning | React/TypeScript/Vite and Tauri 2 desktop foundation, early roleplay scenes and composer. |
| 16–17 Oct 2026 | `v0.0.2` — Foundations | Git workflow, preferences, themes, UI scaling and early easter eggs. |
| 18–20 Oct 2026 | `v0.0.3` — The Cast | Character editing, cards, portrait customization and composer integration. |
| 21–22 Oct 2026 | `v0.0.4` — Connections | Mental Map, customizable relationships, expression tools and reusable visual effects. |
| 25–27 Oct 2026 | `v0.0.5` — A Place to Call Home | Workspace-scoped portable data, migrations, and persistence/isolation work. |
| Early Nov 2026 | `v0.0.6` — The Vault | Resource browsing, folders, batch operations, previews and drag/drop. |
| 10 Nov 2026 | `v0.1.0-alpha.1` — First Light | Expression-to-vault integration, portrait consistency, and workspace/UI fixes. |

These milestones are a *retrospective narrative*, not the exact Git history or a promise of SemVer-compatible releases. Only create a release/tag when there is a tested build to preserve.

## 2026-11-10 — Signed special titles and optional You message emphasis

### Implemented (runtime verification pending)
- Replaced name-only special-title switching with a central title registry (`src/profile/specialTitles.ts`) and Ed25519 signed redemption codes.
- Reserved **Moon Developer** for the `Kire` display name and **Star Developer** for `Zero`. A matching name alone no longer grants the title: a valid signature-bound unlock code is also required.
- Added an offline code-issuing utility for future titles. Only the public verification key lives in source control; signing keys and issued codes must remain private.
- Added profile settings to redeem and select previously unlocked titles. Invalid or mismatched codes are not rendered in the preview, profile card or sidebar.
- Added a **Settings → Chat → Highlight my messages** preference (off by default), which gently accents locally displayed messages authored in **You** mode with a themed edge and a small reusable particle effect.
- Honoured reduced-motion / animations-off settings and preserved unmodified chat data. Existing users with the older, unrestricted developer-title toggle need to redeem their corresponding title code.
- **Security note:** local/offline signed codes prevent casual unlocking but cannot establish a globally unique user identity or stop someone modifying their own copy of the application.

## 2026-11-10 — Expressions, portrait consistency and interface polish

### Added
- Added a reusable **Resources image picker** for Character Expressions, with folder browsing, search, image thumbnails and up to six selected images.
- Added vault-image choices for individual expressions, a 3 × 2 expression sheet, and replacement of a specific expression in Review.
- Load previously saved expression slots when returning to a character, so one expression can be replaced without reimporting the other five.
- Expressions save independent image data; reorganizing or deleting a source Resources entry does not invalidate already-saved expressions.

### Fixed / improved
- Aligned chat avatars, the composer, character cards and character preview with saved portrait image, fit, position and zoom; removed an obsolete hardcoded preview image fallback.
- Restored chat display names and initials from the current linked character record, including aliases for older messages when they can be matched.
- Treated Windows `os error 3` (missing parent directory) as an absent expression manifest on first save, allowing its directory and manifest to be created by normal workspace writes.
- Reworked the Expression Manager scrolling area and save footer so error messages remain visible above the bottom bar.
- Removed the duplicate inner border/rounded frame beneath the Character Expressions tabs.
- Fixed the custom window close button after window-size persistence introduced an intercepting close listener.
- Added restoration of window size alongside persisted position. Further display-scaling and multi-monitor testing is still recommended.

## Early November 2026 — Resources becomes a workspace vault

### Added
- Expanded Resources with folders/subfolders, breadcrumb navigation, importing into the current folder and adjustable thumbnail sizes.
- Added multi-selection actions for **Move**, **Copy** and **Delete**, plus confirmation and workspace/global-library scoping.
- Added folder rename/delete through the right-click context menu. Removing a logical folder keeps its contained assets and relocates them to the parent.
- Added a dedicated right-click menu for files and folders, plus blurred file previews for images, text, PDFs (where supported), audio and video.
- Added moving resources by dragging thumbnails onto folders and breadcrumb targets; retained marquee selection from empty space.
- Added an explicitly confirmed native flow to delete a selected *original file on disk*: require a file-picker selection and verify its name, size and SHA-256 against the BRD copy before deleting. Normal library deletion does not delete originals.

### Fixed / improved
- Kept resource captions hidden until hover/focus, as an overlay **inside** the thumbnail rather than an expanding footer below it.
- Corrected pointer capture that prevented normal clicks from opening file previews.
- Made card sizing and resource inspector layout more consistent across window sizes.

## 2026-10-21 to 2026-10-31 — Characters, relationships and workspace storage

- Developed the character relationship **Mental Map**, including custom relationship types, selection behavior, panning/zoom and background customization.
- Built out Character Expressions, the six-slot expression review workflow and independent storage of reviewed images.
- Added character portrait framing and reusable accent/particle presentation effects, including the optional Moon Developer / Star Developer titles.
- Evolved workspace persistence for scene resources and character expression assets; implemented targeted legacy-data migration and documented isolation requirements.
- Added modular application easter eggs, including the 18-click `POTATO.EXE` trigger and its reveal screen.
- Improved performance of multi-file resource imports and image thumbnail caching (details in the 27 October entry below).

## 2026-10-27 — Resource library performance and inspector layout

- Batched multi-file imports in the workspace resource library so the manifest is loaded and saved once per batch rather than once per image.
- Batched global resource imports into a single IndexedDB transaction.
- Reused existing image thumbnail object URLs when the resource list changes, loading only newly added images and releasing URLs for removed assets.
- Avoided repeatedly reading the legacy global resource library after its one-time migration has completed.
- Moved the selected-resource inspector out of the scrolling library content container so it can occupy the right-hand side panel beside the resource grid.
- Preserved manifest entries for files already written if a later file in a workspace import batch fails.
- Runtime performance and layout still require verification in the running app; a successful build alone does not confirm perceived responsiveness.


## 2026-10-16 — Documentation baseline

- Created the initial developer documentation set:
  - `DEV_DOCUMENT.md`
  - `CurrentState.md`
  - `Architecture.md`
  - `Changelog.md`
- Recorded known implementation status separately from planned work and unverified behavior.
- Identified the character-to-composer workflow as the recommended next development milestone.

## October 2026 — Global UI scaling and appearance settings

- Added/connected global UI scale preferences with supported values of 90%, 100%, 110%, 125% and 150%.
- Applied the scale to the main content through `.app-content`.
- Adjusted the scaling approach so the custom title bar retains its standard size.
- Kept chat text size separate from global UI scale.
- Identified CSS declarations with fixed pixel font sizes as a potential limitation for consistent scaling.
- Identified a duplicate `.message-body p` rule that could override the configurable chat font size; verify whether the current stylesheet has been corrected.

## October 2026 — Theme system

- Added a dedicated **Themes** category to the settings modal.
- Expanded the `CatppuccinFlavor` type to include nine themes.
- Kept Catppuccin Frappé as the default theme.
- Added five additional palettes:
  - Crimson Void
  - Coral Bloom
  - Sakura Dreams
  - Moon Light
  - Moon Shadow
- Preserved the original Catppuccin Latte, Frappé, Macchiato and Mocha palettes.
- Implemented theme cards and previews in `ThemesSettings.tsx` and `ThemesSettings.css`.
- Connected theme selection to preferences and the document root's `data-theme` attribute.
- Kept theme selection separate from Appearance settings.

## October 2026 — Appearance preferences

- Added/connected settings for interface font, chat text size, global scale and interface density.
- Supported interface font choices: Ubuntu, Inter and system default.
- Supported density modes: compact, comfortable and spacious.
- Removed theme selection from the Appearance category to avoid duplicating the dedicated Themes section.
- Connected appearance preferences to document-level CSS variables and data attributes.

## Earlier development — Preferences foundation

- Added typed preference definitions in `src/preferences/types.ts`.
- Added default preferences in `src/preferences/defaults.ts`.
- Added the preferences storage module.
- Added `PreferencesContext.tsx` and wrapped the application with `PreferencesProvider`.
- Added debounced automatic preference saving.
- Defined preference groups for appearance, profile, editor, roleplay and character display defaults.
- Added a typed character data structure with display overrides.

## Earlier development — Desktop application foundation

- Established the React + TypeScript + Vite frontend.
- Integrated the Tauri 2 desktop shell.
- Created the main application layout and custom title bar.
- Established the settings modal and initial scene/composer interface.

## Outstanding / requiring verification

These are **not** recorded as completed in this changelog:

- Run a repeatable regression suite for window restore, portrait synchronization, character expressions, resource moves/deletions and workspace reloads.
- Validate first-run setup, handling of corrupted or missing manifests, backup/restore and migration between versions.
- Stress-test many images and large workspaces; verify peak memory use and long-session responsiveness.
- Test Windows and Linux packaging, distribution and cross-platform portability in clean installations.
- Continue work on accessibility, recovery behavior and any future collaboration or remote access features when those are explicitly scoped.
- Reconcile `CurrentState.md` and `Architecture.md` with the actual codebase; both may lag behind these features.


---

## Changelog conventions

For future entries:
- Use the date the change was made.
- Describe user-visible changes and meaningful architecture decisions.
- Separate completed changes from planned work.
- Mention breaking changes and migrations explicitly.
- Record known regressions or follow-up verification tasks.
- Distinguish implemented source code, user-validated workflows, and workflows that still require tests.
- Use release labels only for tested/tagged builds; provisional milestone versions are not release artifacts.
