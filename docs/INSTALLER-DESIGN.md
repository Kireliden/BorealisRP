# Borealis Roleplay Studio — Installer Art Direction & Implementation Brief

**Created:** 11 November 2026  
**Status (11 November 2026):** **First actual Windows NSIS configuration implemented**, with checked-in Frappé installer bitmap assets and an automated Windows packaging workflow. The richly illustrated full-window mockups remain **conceptual**; no successful installer build or installation acceptance test has yet been confirmed.  
**Target:** First privately distributable Windows alpha; Linux packages later.  
**Branding decision for installer:** **Borealis Roleplay Studio** (not “Den”). Preserve the existing real application icon, an OpenMoji crescent moon **without additional sparkle in the actual logo**. Decorative celestial effects around the illustration are separate.

## 0. Implemented installer baseline (11 November 2026)

- **Current implementation:** `src-tauri/tauri.conf.json` now configures `bundle.windows.nsis` using `installMode: "currentUser"`, `installerIcon: "icons/icon.ico"`, `sidebarImage: "windows/installer/sidebar.bmp"`, `headerImage: "windows/installer/header.bmp"`, `startMenuFolder: "Borealis"` and `compression: "lzma"`. Non-Windows bundling targets were **not** removed.
- **Checked-in graphics:** `src-tauri/windows/installer/sidebar.bmp` (164×314, native 24-bit BMP) and `header.bmp` (150×57, native 24-bit BMP). These are original procedural Frappé celestial illustrations, not baked screenshots of interface controls.
- **Automated Windows packaging:** `.github/workflows/windows-installer.yml` builds the NSIS `-setup.exe` on a Windows runner and uploads it as a workflow artifact. It is triggered by relevant pushes to `feature/workspace-persistence` or by manual workflow dispatch when available. The workflow was added but **its first run has not been confirmed successful**.
- **Optional original-concept artwork:** the conversation also provides a separate downloadable BMP artwork pack cropped from the approved illustration mockups; replacing the two same-named BMP files locally before packaging applies those visuals. The GitHub branch contains its own self-sufficient art by default.
- **Scope:** This is a **real, branded standard NSIS installer**. The four custom large illustrated screens are still art direction, not a custom native window implementation. Programmatic progress is handled by NSIS.
- **Installer testing still required:** compile `npm run tauri -- build --bundles nsis`, examine the real wizard, test fresh install, shortcuts, launch, upgrade and uninstall, and verify existing workspace directories are not affected.

## 1. Creative direction

**Core feeling:** A tiny magical observatory / midnight writing retreat. Calm, soft, cosy, atmospheric, detailed and unmistakably Borealis. **Catppuccin Frappé**, not an aggressively saturated neon/vaporwave palette.

Visual motifs: lavender and pale-green aurora over dark pine forests; lilac mountains; a still lake reflecting moonlight; night clouds; delicate stars; crescent moon; framed window; books, a journal, warm mug, potted plants and a sleeping cat. Illustrations should frame actions but never compete with their readability.

**Keep typography, controls, progress navigation and layout consistent across all four screens.** Mockups are concept art, not production-size UI artwork. The illustrations should be authored or extracted as separate **background-only assets**, and labels/buttons rebuilt as actual accessible controls. Do not use screenshots of the mockups as interactive installer screens.

### Core Frappé design tokens

| Token | Hex | Use |
| --- | --- | --- |
| Base | `#303446` | Main backdrop |
| Mantle | `#292c3c` | Interior panels |
| Crust | `#232634` | Deep shadows/background edges |
| Surface 0 | `#414559` | Controls and elevated panels |
| Surface 1 | `#51576d` | Hover/surface delineation |
| Text | `#c6d0f5` | Primary copy |
| Subtext 1 | `#b5bfe2` | Secondary copy |
| Lavender | `#babbf1` | Cool accents |
| Mauve | `#ca9ee6` | Main brand accent/button |
| Pink | `#f4b8e4` | Warm highlights and flowers |
| Teal | `#81c8be` | Aurora accents |

UI gradient suggestion: dark Base/Mantle surfaces with restrained Mauve → Lavender accents. Warm light can be used in illustrations, but Frappé semantic colours drive interactive controls and text contrast. Follow the application's existing token conventions rather than introducing an incompatible parallel palette.

### Layout and accessibility

- English-language UI copy, in the project's existing British-English voice.
- Custom concept window around **1000–1100 × 680–760px** at 100% scale; this size is a *visual target*, not a specification for stock NSIS.
- Rounded card corners (12–18px), comfortable whitespace, crisp text on opaque dark surfaces, and full keyboard focus support.
- Consistent four-step progress label: **Welcome → Options → Installing → Finish**.
- Avoid animated stars and large parallax as requirements; respect reduced-motion preferences if a custom UI is eventually used.
- Reuse the **real** OpenMoji moon artwork already bundled with the app, rather than treating the illustrative moon as a replacement for the official app icon.
- OpenMoji artwork uses CC BY-SA 4.0. Review attribution and redistribution requirements before including the artwork in a public distributable installer (see https://openmoji.org/).

## 2. Four screens — specification and final UI copy

These are **design targets**, not claims about features already wired into the current installer.

### A. Welcome

- Hero: aurora / observatory art and crescent moon. Brand prominently: **Borealis Roleplay Studio**.
- Title: **Welcome to Borealis**
- Body: **A cosy space to create, organise and bring your roleplay stories to life.**
- Primary action: **Continue**. Optional secondary: **Cancel**.
- Show the four-stage progress navigation with Welcome active.

### B. Options

- Consistent navigation and moonlit decoration.
- Title: **Installation options**
- Actual, native-confirmed installation location, with **Browse…** where supported.
- Optional shortcuts: **Create desktop shortcut**, **Create Start Menu shortcut**.
- **Launch after installation** belongs on the final/finish screen if the chosen NSIS template supports it; do not imply the application can launch before files are installed.
- Primary action: **Install**; secondary: **Back**.
- **Important:** Tauri NSIS uses `currentUser` by default and installs under `%LOCALAPPDATA%`, not `C:\Program Files`. The concepts' Program Files path is a visual placeholder unless `perMachine` or a user-selected custom installation directory is intentionally supported.
- No “automatic updates” checkbox until updater support is genuinely implemented, configured and tested. Never advertise it merely because the concept included it.

### C. Installing

- Heading: **Installing Borealis Roleplay Studio**
- Progress bar **must represent actual installer progress**, not an invented percentage or countdown.
- Status text can describe actual file extraction / shortcut creation steps when the NSIS/custom installer exposes them.
- Keep cancellation behaviour truthful and safe (avoid interrupting critical irreversible steps).
- Decoration: understated stars/mountains/aurora, with controls legible over them.
- Do **not** create or overwrite a Roleplay Workspace during application installation. Workspace selection/creation remains in the app itself.

### D. Finish

- Heading: **Borealis Roleplay Studio is ready**
- Body: **Installation completed successfully. Your stories are waiting.**
- Optional checked action: **Launch Borealis Roleplay Studio**, only if execution is wired up.
- Primary action: **Finish**.
- Hero: cosy reading nook by the nocturnal window, books/journal, warm mug, sleeping cat and sky.

## 3. Current technical baseline

Repository: `Kireliden/BorealisRP`, working branch `feature/workspace-persistence`.  
App: **Tauri 2 + React/TypeScript/Vite**.  
Existing `src-tauri/tauri.conf.json`: currently `productName: "Borealis Roleplay Studio"`, version `0.1.0`, Windows bundling via Tauri defaults (`bundle.targets: "all"`).

### Recommended first production route: Tauri + NSIS

Use Tauri's standard Windows NSIS `-setup.exe` target and brand the real installer. Tauri 2 supports:

- `bundle.windows.nsis.installerIcon` — setup icon (`.ico`).
- `bundle.windows.nsis.sidebarImage` — welcome/finish BMP, **164 × 314px** recommended.
- `bundle.windows.nsis.headerImage` — header BMP, **150 × 57px** recommended.
- `bundle.windows.nsis.languages`, `installMode`, `installerHooks` and `template`.
- A custom NSIS `.nsi` template via `bundle.windows.nsis.template` if the default structure is insufficient.

**Non-destructive example to adapt later** (merge into existing `src-tauri/tauri.conf.json`; do not replace the file wholesale):

```json
{
  "bundle": {
    "targets": ["nsis"],
    "windows": {
      "nsis": {
        "languages": ["English"],
        "installMode": "currentUser",
        "installerIcon": "icons/icon.ico",
        "headerImage": "./windows/installer/header.bmp",
        "sidebarImage": "./windows/installer/sidebar.bmp"
      }
    }
  }
}
```

Paths in this sample are illustrative. Create and verify the asset files and check their path resolution before using the configuration. `installMode: "currentUser"` is intended to avoid unnecessary administrator elevation for the first alpha.

**This produces a branded standard installer, not a pixel-perfect recreation of the illustrated mockups.** The Windows installer still owns native page layout and widgets.

### How to reach the full illustrated layout

1. Start by packaging the **actual** app with stock NSIS and test install/uninstall/upgrade without affecting user Workspace folders.
2. Export **clean illustrated assets** (not flattened concept screenshot UI), e.g. `welcome-art.png`, `sidebar-aurora.png`, `finish-nook.png`, separate official application icon.
3. Generate NSIS-compatible bitmap crops for default header/sidebar. Preserve master illustrations at high resolution for any future custom UI.
4. If a fully custom layout is required, prototype a **custom NSIS template/pages** first. Scripted NSIS UI can extend pages/actions but complex transparent rounded gradients, detailed layout and animation may be difficult to reproduce faithfully.
5. Only if that cannot meet the visual brief, scope a **separate custom bootstrapper installer UI** with the necessary reliable install/elevation/uninstall logic. That is a substantially larger engineering/security task, not just a styled React page.
6. Build and test with `npm run tauri build` on Windows, then inspect `src-tauri/target/release/bundle/nsis/`.

Official references:
- https://v2.tauri.app/distribute/windows-installer/
- https://v2.tauri.app/reference/config/

## 4. Asset breakdown / handoff to artwork

Concept art must be distilled into exportable assets rather than kept as a screenshot with baked-in text:

```text
src-tauri/windows/installer/          (proposed; not created yet)
  README.md                          Art credits, export specs and usage
  artwork/                           High-resolution scene-only masters
    welcome-observatory.png
    options-aurora.png
    installing-mountains.png
    finish-reading-nook.png
  header.bmp                         Default NSIS header crop, 150×57
  sidebar.bmp                        Default NSIS welcome/finish, 164×314
```

The same artwork can be used later for an expanded custom installer. Keep **text and interactive controls outside the images**; allow translation, accessibility and responsive layout.

## 5. Installation product principles

- **Zero forced account sign-up.** The app works locally.
- **Never silently delete, reset or move user workspaces** during setup, upgrade or uninstall.
- Keep existing Tauri installer upgrade/uninstall behaviour intact unless custom changes have test coverage.
- Do not introduce elevated privileges where they are not required.
- No dummy update checkboxes, fabricated progress values or unimplemented functionality.
- Link to relevant notices/third-party acknowledgements before public redistribution, including OpenMoji attribution if applicable.
- Handle Tauri/WebView2 runtime dependencies as configured by Tauri rather than writing ad-hoc dependency installers without need.

## 6. Acceptance / next milestone

- [ ] Approve exact product logo and final artwork with **Studio** branding.
- [ ] Extract scene-only illustration files and create native-compatible BMP crops.
- [ ] Configure branded NSIS on a dedicated feature branch once alpha readiness is confirmed.
- [ ] Build the setup executable successfully.
- [ ] Test fresh install, repair/upgrade, uninstall and re-install on Windows.
- [ ] Ensure existing Workspace data survives every installer operation.
- [ ] Check actual path, accessibility, scaling, keyboard controls and desktop shortcut creation.
- [ ] Replace all placeholders (especially install location, update status and progress) with truthful live state.
- [ ] Consider the advanced fully illustrated custom bootstrapper as an optional follow-up, not an alpha blocker.

**Important separation:** This document and the accompanying generated mockups are **design deliverables**, not installer binaries. Do not claim the UI is shipping until an implementation passes the above tests.
