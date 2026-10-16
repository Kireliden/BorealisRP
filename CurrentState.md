# Borealis Roleplay Den — Current State

**Last updated:** 16 October 2026  
**Status:** Working development baseline; verify against the current source before relying on every item.

## 1. What works today

The following items are confirmed by the development notes available for this document. “Implemented” does not automatically mean every edge case has been tested.

- React + TypeScript frontend using Vite 8.
- Tauri 2 desktop application shell.
- Custom window title bar and main application layout.
- Settings modal with separate **Appearance** and **Themes** categories.
- Nine selectable themes:
  - Catppuccin Latte
  - Catppuccin Frappé (**default**)
  - Catppuccin Macchiato
  - Catppuccin Mocha
  - Crimson Void
  - Coral Bloom
  - Sakura Dreams
  - Moon Light
  - Moon Shadow
- Theme selection updates the document theme and is persisted through the existing preferences system.
- Appearance controls for interface font, chat font size, global UI scale and density.
- Preferences context, typed preference definitions, defaults and storage module.
- Debounced automatic saving of preferences.
- Global scale is applied to `.app-content`; the custom title bar is intended to retain its standard size.
- Existing project root: `C:\Dev\BorealisRP`.
- Known development commands:
  ```powershell
  npm run build
  npm run tauri dev
  ```

## 2. What is broken or not yet verified

There is no confirmed list of currently reproducible bugs in the available notes. The items below are therefore **verification tasks**, not claims that the features are definitely broken.

- Test the title bar and content at 90%, 100%, 110%, 125% and 150% UI scale.
- Check for clipping, overflow or awkward spacing at larger scales.
- Verify that every density mode affects the intended components consistently.
- Check that chat text size remains independent of global UI scale.
- Earlier CSS contained duplicate `.message-body p` rules, with a later fixed `12px` declaration overriding the preference. The stylesheet was discussed as needing correction; inspect the current file to confirm whether this was fixed.
- Verify preference restoration after fully closing and reopening the app.
- Verify which project, scene, character and message data are actually persisted. Do not assume these workflows are durable just because preference persistence exists.
- Character selection, expression selection, full editor behavior, message editing/version history, and the complete project/scene workflow need source inspection and practical testing before being marked complete.
- Production packaging, backup/recovery behavior and Android synchronization are not confirmed as implemented.

## 3. Next objective

**Recommended next milestone: inspect and complete the character-to-composer workflow.**

1. Inspect the current character panel, character model and composer before changing code.
2. Confirm which pieces already work.
3. Make character selection affect the message being composed and published.
4. Verify the behavior in the running app.
5. Run `npm run build` and fix any regressions before moving on.

Keep this as one small implementation task at a time. Do not rewrite unrelated files or mark a feature complete based on compilation alone.

## 4. Development workflow

From `C:\Dev\BorealisRP`:

```powershell
npm run build
npm run tauri dev
```

Recommended cycle: inspect → make one focused change → build → test in the running app → update documentation.

## 5. Status labels used here

- **Implemented:** a feature exists according to the available development notes.
- **Needs verification:** source inspection or runtime testing is still required.
- **Planned:** a future feature or architectural decision.
- **Broken:** use only when a reproducible failure has been observed and documented.

Update this file whenever a meaningful feature or bug status changes.
