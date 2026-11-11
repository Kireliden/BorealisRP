# Borealis Roleplay Den — Current State

**Updated:** 11 November 2026  
**Branch reviewed:** `feature/workspace-persistence`  
**Status:** Feature-rich local desktop **internal alpha candidate**; not a tested, tagged or distributed alpha release.  
**Naming:** Product-facing name is **Borealis Roleplay Den (BRD)**. Some repository documents, internal strings and the Tauri package still say *Borealis Roleplay Studio / BRS*; those are legacy identifiers, not a second product.

This is a current-code snapshot plus specific interactive outcomes confirmed by the developer. **Implemented**, **user-verified**, and **release-verified** are distinct statuses.

## 1. Implemented foundation

- Tauri 2 desktop shell, React 19, TypeScript, Vite 8, custom title bar, window size/state handling, sidebar navigation and UI scale.
- App-owned dialogs, dropdowns and colour picker; separate Appearance, Themes, Accessibility and other settings.
- Twelve registered theme palettes across Catppuccin, Moonlight, Crimson, Sakura and unlockable Emerald collections; Catppuccin Frappé remains the default.
- Local, user-selected **workspace folders**, with native manifest validation, create/open/rename/switch, recent-workspace tracking and last-active workspace restoration.
- Roleplay Space with categories, folders, scenes, drag/reordering, scene navigation and context actions. Folder icons are currently fixed; older saved folder-icon fields are retained for compatibility. Scene icons remain visible but **their inline icon-change buttons are temporarily removed**.
- Workspace hero header shows the active workspace name and a customisable icon. Supported icon sources: OpenMoji, system emoji and Lucide; the icon can open Change / Switch / Create workspace actions.
- Workspace-owned scenes, messages, dialogue/narration presentation, rich-text formatting and text colours, drafts, edits/history, 24-hour deletion window, favourites, message media and scene backgrounds.
- Composer supports four picker styles: **Color OpenMoji**, **Linework OpenMoji**, **System emoji** and **Lucide**. Lucide inline icons are saved by validated name and rendered with the library's `DynamicIcon`.
- Workspace-oriented character gallery/editor, relationship map and editable relationship types; portrait and expression management.
- Workspace resource gallery with media import/preview, folders, tags, selection and bulk operations; workspace-scoped search of characters and resources.
- Obsidian-oriented Markdown export for scenes and message attachments.
- Collections/achievements and four integrated easter-egg modules: Potato, Nudge, Lambda and Plumbob.

## 2. Recently verified in the running app

The developer confirmed the following flows after the 11 November changes:

- Sidebar workspace header layout and actual workspace name.
- Rich-text colour picker, carrying colour into the sent chat message.
- Pasting chat text back into the composer without unwanted background highlighting; revised header gradient.
- Removing unwanted folder/scene icon-edit buttons and their overlap.
- Workspace OpenMoji/system/Lucide icon selection and corrected relative size.
- Composer Lucide picker renders its candidates; after fixes, **inline Lucide icons display and can be sent**, including icon-only passages.

These confirmations cover the tested interactive paths, **not** every theme, OS, restart, export format or failure case.

## 3. Storage summary

| Data | Present location / owner |
| --- | --- |
| Workspace identity | `workspace.json` at workspace root |
| Scenes, folders, categories, messages and edits | `Chats/workspace-content.json` (`schemaVersion: 1`) |
| Per-scene composer drafts | `Chats/Drafts/<scene-id>.json` |
| Character records and custom relationship kinds | `Characters/characters.json`, `Characters/relationship-kinds.json` |
| Expression assets | `Characters/Expressions/` and its manifest |
| Workspace resources | `Resources/manifest.json` and `Resources/Files/` |
| App-wide preferences, workspace recents/icons and collections | Tauri app-local stores; not portable workspace-owned data |

Legacy browser localStorage/IndexedDB libraries have migration paths into a first workspace. Do not mistake these compatibility stores for the authoritative active-workspace data.

## Settings backups (11 November update)

- A new **Settings → About → Backups → Create settings backup** action writes a ZIP containing core application stores and imported profile artwork. It does **not** include the user's workspace folders or all WebView localStorage data.
- The ZIP contains manual recovery instructions, and an in-app **Restore settings backup** action is now implemented. Neither export nor import is accepted as release-ready until round-trip tests succeed on disposable settings. See `docs/SETTINGS-BACKUP.md`.

### Restoring app settings (11 November update)

- **Settings → About → Backups** now offers both **Create settings backup** and **Restore settings backup**. Import previews the ZIP, requires a confirmation, writes a safety copy of current app settings, and requests a restart after restoration. Workspace content stays separate.
- The restore flow is implemented in source but **not yet runtime-verified**; test against disposable settings before depending on it as an alpha recovery feature. See `docs/SETTINGS-BACKUP.md`.

## 4. Open limitations / not release-verified

- No complete green **fresh checkout → `npm ci` → frontend build → Tauri package** run has been documented for the latest head.
- No complete regression pass for restart recovery, two-workspace isolation, storage failures, imported media, corrupted data, or large/long-running sessions.
- No verified **Workspace** ZIP backup/restore UI or documented migration strategy for future workspace schema versions. The settings-only ZIP feature is separate. A manual copy of the complete closed workspace folder remains the interim Workspace backup approach; restore must be tested.
- Windows packaging/clean-install acceptance and Linux packaging/runtime acceptance remain open.
- App metadata still uses `0.1.0` and some *Borealis Roleplay Studio* identifiers. No Git alpha release/tag is implied.
- The Markdown exporter should be explicitly checked for **Lucide-only message bodies**: rich-text Lucide markers are not necessarily represented in plain Markdown output.
- Keyboard/accessibility coverage and theme contrast have not received a systematic final pass.
- Scene and folder icon customisation controls are intentionally absent for now; do not treat that as a regression.

## 5. Immediate next objective

**Freeze feature additions for one alpha-candidate test pass**, not a new subsystem. Follow `docs/ALPHA-READINESS.md`:

1. Build and package the exact candidate commit.
2. Validate the roleplay writing loop, drafts, restart and multiple-workspace isolation.
3. Run destructive/recovery checks against **copies**, never irreplaceable data.
4. Verify a recoverable backup and the built app on Windows; test Linux before claiming Linux support.
5. Fix blockers, retest, then deliberately version/tag `v0.1.0-alpha.1` (proposed; not created).

## 6. Local workflow

```powershell
cd C:\Dev\BorealisRP
npm ci
npm run build
npm run tauri dev
# Release candidate packaging when ready:
npm run tauri build
```

Update this document after major features, confirmed bugs or milestones. Do not promote an internal alpha candidate to a shipped alpha without a reproducible acceptance pass.
