# Global Libraries: Characters and Resources

## Product decisions

- Characters belong to one global library and can be reused in any Roleplay Space.
- Resources belong to a separate global library, not to an individual workspace.
- A resource can be referenced by a character profile or another feature without copying its file.
- The workspace remains responsible for scenes, messages, folders and roleplay-specific content.
- The global search entry sits beside the Workspace switcher and searches character metadata, resource filenames and tags.
- The personal profile entry named `You` remains separate from the character library and continues to use the profile avatar settings.

## Frontend modules

- `src/characters/characters.types.ts`: character record and draft models.
- `src/characters/characters.storage.ts`: character-library persistence and initial Keira record.
- `src/characters/CharacterPortraitArt.tsx`: shared portrait artwork used by the composer and character gallery/editor.
- `src/characters/CharactersPage.tsx`: editorial gallery, search, tags, create/edit/delete, accent and portrait selection.
- `src/resources/resources.types.ts`: resource metadata and media classification.
- `src/resources/resources.storage.ts`: resource-library database operations.
- `src/resources/ResourcesPage.tsx`: drag-and-drop/import gallery, image thumbnails, enlarged audio/video/image preview, filtering, per-resource tagging, multi-select and bulk tag addition.
- Native OS drag-and-drop uses Tauri's window drop events and a guarded native file reader (128 MB per-file limit) to import dropped paths into the webview resource library.
- `src/GlobalSearch.tsx`: search overlay for both global libraries.

## Persistence in this milestone

- Character metadata is stored in browser local storage under `brd.character-library.v1`.
- Resource metadata and file blobs are stored in IndexedDB under `borealis-resource-library`.
- Character portrait fields store a resource ID, not a copied image.
- Resource URLs are created temporarily for display and revoked when no longer needed.
- These stores are global to the BRD app profile, not scoped to a Roleplay Space.

## Known follow-up work

1. Move global library persistence behind a dedicated storage adapter so it can be migrated to a native app-data directory without rewriting the UI.
2. Add export/import and backup/restore for both libraries.
3. Add shared tag normalization/autocomplete across both global libraries.
4. Add a resource picker for other app surfaces (scene backgrounds, message attachments and audio cues).
5. Expand global search to scenes and messages when appropriate.
6. Consider migration of legacy workspace `Characters` and `Resources/*` folders; they are not the source of truth for the global libraries.

## Safety and UX notes

- Deleting a resource can leave a character with a missing portrait reference; the character falls back to initials instead of breaking the editor.
- The `You` name is reserved in the character creation UI.
- Resource deletion requires confirmation.
- Colours use theme tokens so Catppuccin themes can style the library consistently.
