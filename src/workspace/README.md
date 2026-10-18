# Workspace storage

The workspace folder is the authoritative home of workspace-owned content. BRD must not require a hidden application database or an AppData copy to recover it.

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
