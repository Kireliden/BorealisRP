# Workspace persistence migration

## Direction

A workspace is the portable source of truth for project data. Browser storage and app-data storage may be used for caches or global application preferences, but must not be the only copy of project content.

## Workspace-relative file API

`src/workspace/workspaceFiles.ts` exposes byte and JSON helpers backed by Tauri commands. Files are addressed by a relative path under a validated workspace root. The native layer rejects absolute paths and path traversal, validates that the workspace itself is valid, creates parent directories, and enforces a 100 MiB per-file limit.

Suggested layout:
- `Settings/profile.json` — workspace profile settings and relative media references.
- `Settings/Media/` — profile avatar/banner originals and generated thumbnails.
- `Characters/characters.json` — character records and relationships.
- `Characters/Expressions/<character-id>/<slot>.<ext>` — expression image files.
- `Resources/manifest.json` — resource metadata and tags.
- `Resources/Files/<resource-id>.<ext>` — resource binaries.
- `Chats/workspace-content.json` — scenes, folders, categories, messages (existing schema).

## Migration safety requirements

1. Never replace a populated workspace file with an empty default just because it is missing or unreadable.
2. Preserve the existing `Chats/workspace-content.json` format and existing scene/message IDs.
3. Import from legacy localStorage/IndexedDB only when the user has selected a workspace and the corresponding workspace library is genuinely absent.
4. Keep original binaries, not only browser object URLs or IndexedDB keys.
5. Keep application-wide appearance preferences separate from workspace-owned profile/project content.
6. Use relative paths for assets inside the workspace so moving the folder does not break references.
7. Do not delete legacy data during migration; only consider cleanup after the new copy has been verified.

## Implementation status

- [x] Native safe workspace-relative byte read/write commands.
- [x] Typed TypeScript byte/JSON helpers.
- [ ] Workspace-scoped resource manifest and binary files.
- [ ] Workspace-scoped character records and portraits.
- [ ] Workspace-scoped character expressions.
- [ ] Workspace-scoped profile media and profile settings.
- [ ] One-time, non-destructive migration from existing browser/app storage.
- [ ] Integration tests / manual reopen-and-move validation.

The file API is a foundation, not a claim that all UI stores have already been migrated. Do not mark this work complete until all unchecked integrations and reopen validation are done.
