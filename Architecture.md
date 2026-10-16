# Borealis Roleplay Den — Architecture

**Last updated:** 16 October 2026  
**Status:** Current known frontend architecture plus planned boundaries. Verify the repository before treating this as a complete inventory.

## 1. Technology stack

- **React** — UI components.
- **TypeScript** — typed application code and data models.
- **Vite 8** — frontend development and build tooling.
- **Tauri 2** — desktop shell and native integration.
- **CSS** — layout, theme palettes and interface styling.

The final persistence strategy for roleplay content has not yet been confirmed in the available notes. Do not assume a particular database or file format until the current code and dependencies have been inspected.

## 2. Known folder structure

Known frontend files:

```text
C:\Dev\BorealisRP
├── src/
│   ├── App.tsx
│   ├── App.css
│   ├── main.tsx
│   ├── preferences/
│   │   ├── types.ts
│   │   ├── defaults.ts
│   │   ├── storage.ts
│   │   └── PreferencesContext.tsx
│   └── settings/
│       ├── SettingsModal.tsx
│       ├── SettingsModal.css
│       ├── AppearanceSettings.tsx
│       ├── AppearanceSettings.css
│       ├── ThemesSettings.tsx
│       └── ThemesSettings.css
└── ...
```

The ellipsis is intentional: this is not a full repository listing. Inspect the project tree before adding or renaming files.

## 3. Existing module responsibilities

### `src/App.tsx`
Main application UI and composition of the primary workspace. Inspect before assuming which scene, character or composer features are currently wired up.

### `src/App.css`
Application layout and styling, theme palettes, density rules and global UI styling.

Known styling rules include:
- Theme styles driven by `data-theme` on the document root.
- Density styles driven by `data-density`.
- Font selection driven by `data-font`.
- Chat text size driven by `--chat-font-size`.
- Global UI scale driven by `--ui-scale`.
- Main content scaling applied to `.app-content`; title-bar scaling is intentionally excluded.

Avoid adding a second competing implementation of the same preference.

### `src/main.tsx`
Frontend entry point. The application is wrapped in `PreferencesProvider`.

### `src/preferences/types.ts`
TypeScript definitions for preferences, character display preferences and character data.

### `src/preferences/defaults.ts`
Default preference values. The default theme is Catppuccin Frappé.

### `src/preferences/storage.ts`
Existing preference storage module. Inspect its implementation to determine the actual storage mechanism and failure behavior; the exact backend should not be inferred from the filename.

### `src/preferences/PreferencesContext.tsx`
Provides preferences to React components, updates preference state and applies relevant values to the document root. Automatic preference saving uses a short debounce.

### `src/settings/SettingsModal.tsx`
Settings navigation and category routing. Themes and Appearance are separate categories.

### `src/settings/AppearanceSettings.tsx`
Controls interface font, chat text size, global UI scale and density. It must not contain theme selection.

### `src/settings/ThemesSettings.tsx`
Displays the nine theme choices and their previews.

## 4. Preferences data model

The known preferences model uses `schemaVersion: 1` and contains these groups:

```text
AppPreferences
├── schemaVersion
├── appearance
│   ├── theme
│   ├── accentColor
│   ├── uiScale
│   ├── density
│   ├── interfaceFont
│   └── chatFontSize
├── profile
│   ├── displayName
│   ├── avatarAssetId
│   └── description
├── editor
│   ├── fontSize
│   ├── toolbarVisible
│   ├── defaultTextColor
│   ├── pasteFormatting
│   ├── height
│   └── preserveDrafts
├── roleplay
│   ├── defaultRole
│   ├── sendShortcut
│   ├── showSessionSeparators
│   ├── showDates
│   └── paragraphSpacing
└── characterDisplayDefaults
    ├── showAvatar
    ├── avatarSize
    ├── nameMode
    ├── showRoleLabel
    ├── showExpression
    ├── messageSpacing
    ├── colorMode
    └── customColor
```

The known `Character` model contains:

- `id`
- `name`
- `alias`
- `avatarAssetId`
- `summary`
- `displayOverrides`

The character model is defined in `src/preferences/types.ts` in the known implementation. Verify whether the runtime character-management workflow is already wired up before extending it.

## 5. Current preference data flow

The known flow is:

```text
User changes a setting
        ↓
Settings component
        ↓
Preferences context update
        ↓
React preferences state changes
        ├──→ UI reads updated preferences
        ├──→ document root receives theme/font/density/scale variables
        └──→ debounced persistence through storage module
```

The document root currently receives:
- `data-theme`
- `data-density`
- `data-font`
- `--ui-scale`
- `--chat-font-size`

The exact storage backend and its guarantees should be confirmed by reading `storage.ts` and testing a full application restart.

## 6. Roleplay data architecture: unresolved

The future application will need durable storage for:

- Projects
- Scenes
- Characters
- Messages
- Message versions/history
- Drafts
- Avatar and expression assets
- Inserted media

The final source of truth, data format, migration strategy, backup format and media storage approach are **not yet confirmed** in the available notes.

Before implementing substantial roleplay persistence:
1. Inspect current data structures and any existing storage code.
2. Identify what is currently in memory versus persisted.
3. Decide on a durable storage strategy that fits the Tauri desktop app.
4. Define stable IDs and relationships between projects, scenes, characters and messages.
5. Plan schema migrations and backup/recovery behavior.
6. Test save, restart, restore and failure scenarios.

Do not introduce a database or a new persistence library without first inspecting the existing project and dependencies.

## 7. Planned high-level boundaries

These are intended architectural responsibilities, not claims that all modules already exist.

- **Application shell:** window behavior and top-level layout.
- **Settings/preferences:** user-level preferences and their persistence.
- **Projects/scenes:** organization and navigation of roleplay work.
- **Characters:** character profiles, avatars, expressions and display overrides.
- **Composer/editor:** message drafting, formatting and submission.
- **Messages/history:** published content and recoverable edits.
- **Asset management:** avatars, expressions and inserted media.
- **Storage/recovery:** durable data, backups, migrations and save-error handling.
- **Android companion/sync:** future integration, protocol and conflict handling.

## 8. Development commands

```powershell
npm run build
npm run tauri dev
```

Use the build to catch compilation errors, then run the app to validate actual behavior. A successful build is not sufficient proof that persistence or UI interactions work.

## 9. Architecture maintenance rules

- Inspect before changing.
- Keep themes separate from Appearance settings.
- Avoid duplicating preference state or CSS mechanisms.
- Keep TypeScript models aligned with the real persisted schema.
- Do not claim data durability until it has been tested across restarts.
- Record architectural decisions when they are actually made.
- Update this document whenever folder structure, data flow or persistence changes.
