# Borealis Roleplay Den — Architecture

**Updated:** 11 November 2026  
**Scope:** Architecture observed on `feature/workspace-persistence`, not a promise of future features.  
**Product name:** Borealis Roleplay Den (BRD). `BRS` and *Borealis Roleplay Studio* survive in some older identifiers and documents.

## 1. Stack and execution

- **Desktop:** Tauri 2, with native Rust commands in `src-tauri/src/lib.rs`.
- **Frontend:** React 19 + TypeScript, Vite 8, CSS.
- **Core UI dependencies:** `lucide-react` and `openmoji`; app-owned dialogs, selects and colour pickers.
- **Local-first:** no account, AI generation, cloud server or realtime collaboration in the current desktop workflow.
- **Platforms:** Windows development environment is used; Linux remains a target that requires packaging/runtime acceptance tests.

```text
src/
  App.tsx, App.css               Application composition; legacy monolithic surfaces
  main.tsx                       React bootstrap
  ui/                            Shared picker, dialog, select, colours, reusable styling
  themes/                        Shared CSS palettes / themed styles
  preferences/, settings/        App preferences, persistence, settings pages
  workspace/                     Workspace paths, manifest operations, scene models and drafts
  composer/                      Editor styles, emoji picker, expression commands, inline Lucide
  chat/                          Message media, scene backgrounds, export and presentation CSS
  characters/                    Character library, relationships, expression storage
  resources/                     Workspace resource gallery, imports, media caching
  profile/                       Personal identity and portrait controls
  favourites/                    Workspace message/scene favourites UI
  collection/                    App-local discoveries / achievements
  easter-eggs/                   Potato, Nudge, Lambda, Plumbob
  effects/                        Shared UI effects
src-tauri/
  src/lib.rs                     Native file and workspace commands
  tauri.conf.json                Window/bundling metadata
docs/                             Feature docs, audits and release readiness
```

## 2. Data ownership and storage

**A workspace directory is the source of truth for workspace-owned data.** The Rust layer validates `workspace.json` (format `borealis-roleplay-den-workspace`, `schemaVersion: 1`) and handles native reads/writes. The app uses typed frontend wrappers to call the native layer.

Representative current workspace files:

```text
<My Workspace>/
  workspace.json
  Chats/
    workspace-content.json       Scenes, categories, folders, message content
    Drafts/<scene-id>.json       Draft HTML per scene
    Images/                      Saved chat image attachments
    Backgrounds/                 Scene background assets
  Characters/
    characters.json              Workspace character records
    relationship-kinds.json      Custom relationship types
    Expressions/
      manifest.json              Workspace expressions registry
      ...                        Expression artwork
  Resources/
    manifest.json                Workspace resource index
    Files/                       Imported resource binaries
  Settings/, Stories/, Themes/   Reserved or feature-dependent directories
```

Actual layouts can grow as features are added; the layout above is representative, not a guarantee that every directory/file always exists.

- `src/workspace/workspaceStorage.ts`: create, inspect, rename, most recently active workspace.
- `src/workspace/workspaceContent.ts`: `WorkspaceContent` / `WorkspaceMessage` data types and load/save calls, `schemaVersion: 1`.
- `src/workspace/workspaceFiles.ts`: generic workspace-relative file read/write/delete wrappers.
- `src/workspace/workspaceDrafts.storage.ts`: per-scene draft JSON; pending writes serialised per workspace + scene to avoid older autosaves overtaking later ones.
- `src/characters/workspaceCharacters.storage.ts`: character records and relationship types. Legacy global data migration is guarded to avoid copying it into every workspace.
- `src/characters/workspaceCharacterExpressions.storage.ts`: workspace-owned expression asset files and manifest; legacy expression migration.
- `src/resources/workspaceResources.storage.ts`: resource manifest, binary files, folder metadata and guarded legacy import.
- `src/preferences/storage.ts`: app-wide `preferences.json` Tauri store. Workspace recents, custom workspace icons and achievement/collection metadata have separate **app-local** stores.

**Do not replace the workspace-owned files with an implicit global IndexedDB/AppData source.** Legacy localStorage/IndexedDB code remains for migration and no-workspace fallback.

## 3. Primary data flow

```text
Choose / restore workspace folder
  → Native manifest inspection and validation
  → App loads workspace-content.json (categories / folders / scenes)
  → Characters, resources, expressions and background media load by active workspace path
  → User navigates to a scene and composes HTML-rich content
  → Draft autosaves to Chats/Drafts/<scene-id>.json
  → Send/edit: convert formatting → sanitise → save scene messages
  → Re-open: reload workspace content and restore per-scene drafts
```

When asynchronous operations complete, the application checks active workspace and scene identifiers before updating stale UI. Workspace isolation and draft-operation races received a dedicated audit; see `docs/WorkspaceIsolationAndPersistenceAudit.md`.

**Message schema:** message IDs, author and role (Narration/Dialogue), rich content, optional source for editing, optional history, avatar/character/expression references, images and favourite metadata. Scene schema includes name, optional folder reference, displayed icon and optional background.

## 4. Rich text and icon representation

- Composer: `src/composer/EmojiPicker.tsx` exposes **Color**, **Linework**, **System** and **Lucide** tabs.
- Workspace icon picker: `src/ui/StudioIconPicker.tsx` supports **OpenMoji**, **System emoji** and **Lucide**. Workspace icon values are stored in the app-local `workspace-icons.json` by workspace ID.
- `src/ui/lucideCatalogue.ts` supplies the searchable Lucide names, validation and `lucide:` prefix. Icons load through `lucide-react/dynamic`.
- `src/composer/lucideInline.ts` renders actual Lucide SVGs in rich composer/chat content. **Persisted content stores validated `data-lucide-icon` names on `message-lucide-icon` spans, not arbitrary SVG markup.**
- `src/App.tsx` includes rich text/Markdown conversion, sanitisation and editor/scene send logic. The sanitiser reconstructs permitted Lucide markers. The composer synchronises its draft state after picker insertion, including icon-only messages.
- OpenMoji artwork comes from copied app assets; system emoji uses the OS font. Inline Lucide follows surrounding text colour.
- Workspace hero imagery is visually normalised to the OpenMoji size. Folder icon controls and scene inline icon-change controls are **temporarily removed**; stored icon fields are preserved for backward compatibility.

**Known integration edge:** Markdown/Obsidian export requires a deliberate fallback for inline Lucide-only content, since SVG visuals do not automatically translate into Markdown text. Track in alpha tests.

## 5. UI and theming

- `src/themes/themes.css` is the central palette CSS; `src/settings/themeCatalog.ts` registers twelve themes across five collections.
- `src/ui/studioPolish.css` holds newer sidebar/scene UI refinements to avoid extending `App.css` indiscriminately.
- `src/ui/AppSelect.tsx`, `AppColorPicker.tsx`, `AppDialogProvider.tsx` are reusable, themed components.
- Theme choices belong to **Themes**, not Appearance. Settings contain global scale, font, chat, accessibility and preferences.
- Profile and collection metadata are distinct from workspace-scoped characters/resources.

## 6. Boundaries and intentional omissions

- **Existing**: workspace-based local editing, scene/message persistence, resource and character libraries, expression support, scene export.
- **Not established as release-ready**: verified ZIP backup/restore, schema evolution/migrations for future versions, automated integration/regression suite, signed or tested installers on both target operating systems.
- **Not part of this alpha**: online sessions/invite system, cloud sync, mobile companion, AI generation, multi-device conflict resolution.
- The repository's version and Tauri identity currently retain `0.1.0` and *Borealis Roleplay Studio* strings. Release branding/versioning requires a separate, tested decision.

## 7. Maintenance rules

1. Keep types and native validation aligned before changing any workspace file schema.
2. Keep data loss and cross-workspace contamination as release blockers.
3. Preserve the modular `ui/`, `composer/`, `chat/`, `workspace/` boundaries; avoid new direct filesystem hacks in UI components.
4. Preserve legacy data during migration and test backup/recovery before destructive changes.
5. Run `npm run build` **and** real Tauri runtime tests; compilation alone is not acceptance.
6. Use `CurrentState.md` for the current verified feature status, `Changelog.md` for dated changes and `docs/ALPHA-READINESS.md` for release gates.
