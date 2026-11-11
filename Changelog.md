# Borealis Roleplay Studio — Changelog

This changelog records meaningful project changes, not every Git commit. Dates are approximate where an exact implementation date was not recorded. Completed code and user-confirmed behavior are distinguished from work that still needs broader testing.

**Current development status (11 November 2026):** internal Alpha, work in progress. The repository's package and Tauri configuration currently declare `0.1.0`. The retrospective `v0.0.x` milestones and proposed `v0.1.0-alpha.1` label below are **historical/organizational labels only**; they were not necessarily published, built, or tagged in Git. No official releases are implied.



## 2026-11-11 — Responsive chat reading width and composer context

- Let the message column, narration cards, date separator and composer grow proportionally with the main window, preserving side margins and a comfortable width cap on ultrawide monitors.
- Keep the body of each message flexible so it uses the wider reading column instead of staying compressed against the avatar.
- Replaced the typing-like dot in **Writing in** with a directional arrow; the active scene name now sits in a compact accent-tinted pill with truncation for long titles.
- Kept these styles in `src/chat/chatLayout.css`, without expanding `App.css`. Existing scene backgrounds and no-background chats share the same layout.
- **Pending validation:** local TypeScript/Vite build and visual check at standard, maximised and narrow window sizes.

## 2026-11-11 — Per-scene chat backgrounds

### Implemented (runtime/build verification pending)
- Added **Background** beside Favourite in the scene toolbar. Each scene can use a different background image or keep the original plain chat.
- Reused the system/Resources image chooser; system selections still ask whether to import an optional additional copy to Resources.
- Saved image snapshots in portable `Chats/Backgrounds/` paths and attached the image reference and appearance options to each scene's optional `background` metadata; deleting an image from Resources does not break an active scene background.
- Added a preview and sliders for dark overlay intensity, blur, zoom and horizontal/vertical framing, plus reset and remove controls. Changes apply when explicitly saved.
- Rendered the image underneath the scene heading, messages and composer, not the sidebar or topbar. The composer and notices get a translucent glass surface for legibility; chats without backgrounds keep their existing styling.
- Obsolete background snapshots are removed after successfully saving a replacement/removal, without touching Resources.
- **Pending validation:** TypeScript/Vite build, Tauri Rust compilation, background persistence across restarts and scene changes, GIF behaviour, light-theme legibility and slider layout on smaller windows.

## 2026-11-11 — Chat lightbox and workspace favourites

### Implemented (build/runtime verification pending)
- Chat image attachments now open in a full-size lightbox. Images from the same message can be browsed with arrow buttons or keyboard arrows; Esc and clicking the backdrop close the preview.
- Enabled the scene-level **Favourite** button and added **Add to favourites / Remove favourite** to each message's `⋯` menu.
- Added a dedicated **Favourites** button directly beneath Resources in the sidebar. The new library separates saved scenes and messages, offers search/filter views, and links back to the originating scene or highlighted passage.
- Favourite flags and timestamps are optional fields in the existing workspace content; no duplicate message copies or new global storage format are needed.
- Repositioned **Writing in…** to align with the composer's left edge, accounting for the character portrait and responsive layout gap.
- **Pending validation:** TypeScript/Vite build, Tauri runtime checks, favourite persistence after restarting, image lightbox keyboard controls, narrow-window alignment and navigation to saved messages.

## 2026-11-11 — Profile and composer image integration

### Implemented (runtime/build verification pending)
- Added **From system** and **From Resources** choices for the user portrait and banner. The Resource picker follows the active workspace; selected files are copied to durable profile storage rather than referenced by their original vault ID.
- Enabled the composer's image button for current scenes. Images from the computer or the active workspace's Resources are previewed before sending and saved as independent files in `Chats/Images/`, with relative-path metadata in messages. Text-only, image-only and combined messages are supported; existing message images remain editable/removable.
- When an image comes from the system picker, a separate, skippable **Save to Resources?** dialog asks whether to import an additional copy. Declining never prevents its use in the profile or a sent passage.
- Resources imports remain explicit. Existing workspace content and legacy storage identifiers are unchanged; the new attachment metadata is optional for older messages.
- Image picker overlays work over Settings; the user retains their composer attachments if message saving fails.
- **Pending validation:** Tauri Rust command compilation, TypeScript/Vite build and manual checks of media persistence across restarts, switching scenes and deleting Resources items.

## 2026-11-11 — BRS branding and final interface polish

- Standardised visible **BRS** initials for Borealis Roleplay Studio across the profile, holographic avatar card, Resources dialogs, workspace manager, settings, user-facing errors and development documentation.
- Preserved legacy `brd.*` application storage keys, event names, CSS selectors, character identifiers and migration markers to avoid breaking existing data and integrations. These are internal compatibility identifiers, not display branding.
- Refined the Moon/Star special-title capsules into a stationary, tightly blurred glow with a synchronised brighter border/halo colour transition (6.8 seconds), while keeping the sidebar aura visible without clipping.
- Added a close button to the workspace status notice. The dismissal lasts for the current app session, while a newly raised workspace error makes the notice visible again.
- Kept the existing accessibility/reduced-motion behavior for visual effects. Visual checks on narrow sidebars and multiple themes remain recommended.

## 2026-11-10 — Studio naming, scene rename and visual polish

- Standardised the **Borealis Roleplay Studio** name across dialogs, character tools, profile cards, workspace UI and documentation.
- Kept the legacy workspace-format identifier unchanged for backwards compatibility with existing files.
- Replaced the browser's **Rename scene** prompt with a native-styled Borealis modal and inline duplicate-name validation.
- Added a low-intensity, slow-breathing border glow to unlocked Moon/Star developer title capsules, respecting reduced-motion settings.
- Replaced the hard-bordered You-message highlight with an unobtrusive diffused lavender-accent gradient while retaining soft particles.

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

## 2026-11-10 — Profile layout and You composer avatar framing

- Kept the profile avatar anchored at the top of the identity area when redeemable special-title controls expand, instead of aligning the portrait to the bottom of those controls.
- Applied the profile's saved portrait X/Y position and zoom to the **You** portrait in the composer through the same portrait renderer used for OCs.
- Matched the composer's user portrait to a 4:5 **cover** crop, consistent with the profile preview and generated sidebar thumbnail.
- Preserved the original local profile media path, animated GIF playback and the existing static sidebar-thumbnail generation/refresh logic without modifying its storage routines.
- Runtime validation still required for normal images, GIFs, different zoom/positions, and profile-title toggle/resizing.

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
- Added an explicitly confirmed native flow to delete a selected *original file on disk*: require a file-picker selection and verify its name, size and SHA-256 against the BRS copy before deleting. Normal library deletion does not delete originals.

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
