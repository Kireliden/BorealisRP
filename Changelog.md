# Borealis Roleplay Den — Changelog

This changelog records significant known project changes. It is not a complete Git history. Dates are approximate where an exact implementation date was not recorded.

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

## Planned — Not yet recorded as completed

The following items remain roadmap work unless verified in the source and running application:

- Complete character panel and character selection workflow.
- Character expression selection and message integration.
- Complete rich-text roleplay editor and image insertion.
- Message editing and recoverable version history.
- Verified durable storage for projects, scenes, characters, messages and assets.
- Project and scene organization.
- Android companion and synchronization.
- Mandatory `POTATO.EXE` easter egg, triggered by exactly 18 clicks on the application logo and displaying a cute pink potato with the exact text `You've been POTATO'ED`. A high-pitched sound is optional.
- Production packaging and recovery workflow.

---

## Changelog conventions

For future entries:
- Use the date the change was made.
- Describe user-visible changes and meaningful architecture decisions.
- Separate completed changes from planned work.
- Mention breaking changes and migrations explicitly.
- Record known regressions or follow-up verification tasks.
- Do not list a feature as completed until it has been tested.
