# Workspace storage

The workspace folder is the authoritative home of workspace-owned content. BRS must not require a hidden application database or an AppData copy to recover it.

## Current foundation

- `workspace.json` is the root manifest.
- The manifest identifies the format, schema version, stable workspace ID, display name and creation/update timestamps.
- Workspace creation and inspection run through native Tauri commands, so filesystem operations are not exposed as unrestricted frontend path access.
- Inspecting an existing workspace is read-only.
- Workspace content remains in ordinary user-accessible folders and files.

## Initial folder layout

```text
Workspace/
├── workspace.json
├── Settings/
├── Characters/
├── Stories/
├── Chats/
├── Themes/
└── Resources/
    ├── Backgrounds/
    ├── Audio/
    └── Other/
```

This is a starting structure, not a promise that all content types are implemented yet. Feature-specific file schemas should be introduced alongside their owning features.

## Manifest version 1

```json
{
  "format": "borealis-roleplay-den-workspace",
  "schemaVersion": 1,
  "id": "stable workspace identifier",
  "name": "Workspace display name",
  "createdAt": "ISO 8601 timestamp",
  "updatedAt": "ISO 8601 timestamp"
}
```

A manifest with an unsupported format/version or invalid required fields must be rejected without modifying the workspace. Future schema migrations must be explicit and must not silently rewrite unknown workspace data.

## Current content beyond the initial scaffold (11 November 2026)

The directory tree above is the initial workspace scaffold. Active features now write content inside the workspace:

| Path | Owner |
| --- | --- |
| `Chats/workspace-content.json` | Scene/category/folder tree; messages, edit history, favourites |
| `Chats/Drafts/<scene-id>.json` | Per-scene rich-text drafts |
| `Chats/Images/` and `Chats/Backgrounds/` | Message attachments and scene backgrounds |
| `Characters/characters.json` | Workspace characters |
| `Characters/relationship-kinds.json` | Workspace-defined relationship labels |
| `Characters/Expressions/manifest.json` and expression files | Workspace character expressions |
| `Resources/manifest.json` and `Resources/Files/` | Workspace-owned resources |

Typed scene/message models and native calls are in `workspaceContent.ts`; native and file operations are wrapped in `workspaceFiles.ts`. `workspaceDrafts.storage.ts` serialises in-flight writes **per workspace and scene** to avoid outdated autosaves overwriting newer state.

**App-local (not workspace-owned):** last/recent workspace paths, workspace hero icon preference (`workspace-icons.json`, keyed by workspace UUID), global appearance/profile preferences and achievements. Legacy browser global character/resource/expression libraries are retained for one-time migrations, not used as the active workspace source of truth.

**Icon compatibility:** workspace icon values may be `om:HEX`, native Unicode emoji or `lucide:<icon-name>`. Folder/scene inline icon-change controls have been removed for the time being; existing icon data is preserved.

**Current release limitation:** an integrated ZIP backup/restore workflow and future schema migrations have **not** been signed off. For an alpha candidate, a full **folder copy while the app is closed** is the interim manual backup; a test restore from that copy is required before calling the alpha distributable. See `docs/ALPHA-READINESS.md` from the repository root.

