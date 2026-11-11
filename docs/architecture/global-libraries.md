# Character and Resource Libraries — Workspace Scope

**Updated:** 11 November 2026  
**Status:** Reconciled with `feature/workspace-persistence`. This file originally described a **historical global-library design**; that design is no longer the primary active-workspace data model.

## Current decision

**Characters and Resources belong to the active workspace.** Workspaces are independent, user-owned folders. Workspace-owned characters, resource files and relationship kinds are not to be silently shared between workspaces.

The personal profile (`You`) and general UI preferences remain app-wide and distinct from the character library.

## Active storage

- `src/characters/workspaceCharacters.storage.ts`: `Characters/characters.json` and `Characters/relationship-kinds.json` in the selected workspace.
- `src/characters/workspaceCharacterExpressions.storage.ts`: `Characters/Expressions/manifest.json` and corresponding artwork.
- `src/resources/workspaceResources.storage.ts`: `Resources/manifest.json` and `Resources/Files/` under the same workspace.
- `src/GlobalSearch.tsx`: searches active-workspace character metadata and resource names/tags only; no active workspace means no library results.
- `src/characters/CharactersPage.tsx`: reads/writes the workspace character library when supplied a workspace path; legacy global fallback exists if no workspace is selected.
- `src/resources/ResourcesPage.tsx`: workspace-owned file import and management, plus legacy migration helpers.
- Shared portraits, expressions and resource previews use workspace-aware lookups where a workspace is active.

## Legacy data compatibility

Original libraries were global: characters in browser localStorage and resources in IndexedDB. Those modules still exist for backward compatibility and migration, **not** as the authoritative source of a selected workspace. Migration markers prevent re-importing the same global data into every later workspace. Original legacy records are intentionally not deleted by migration.

See `docs/WorkspaceIsolationAndPersistenceAudit.md` for the one-time migration markers, async isolation checks and pending runtime tests.

## Rules for new features

1. When a workspace is active, pass its path or a workspace-aware storage service explicitly.
2. Never copy characters/resources across workspaces unless the user specifically requests an import/export.
3. Keep character portrait resource IDs valid within the workspace owning the record.
4. Missing assets should fall back gracefully instead of invalidating the entire workspace.
5. Keep favourites and scene/message content with their workspace; keep global user preferences outside.
6. Test migration and isolation using separate disposable workspaces before changing storage code.
7. Do not regress to the original global-library architecture just because legacy adapters remain present.

## Deferred product possibilities

Explicit share/import of character packs or resource sets, searchable cross-workspace indexes and cloud collaboration are **future product decisions**. None should be assumed to exist in the alpha merely because the historical document once proposed a global library.
