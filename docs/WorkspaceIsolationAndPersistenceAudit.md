# Workspace Isolation and Persistence Audit

**Date:** 27 October 2026  
**Branch:** `feature/workspace-persistence`  
**Status:** Code changes compiled successfully with `npm run tauri build`; runtime acceptance checks remain to be completed.

This document records the workspace-isolation and asynchronous-persistence fixes made during the October 2026 audit. A successful build confirms compilation, but does not by itself prove every runtime scenario works correctly.

## Goals

- Keep workspace-owned content isolated between workspaces.
- Import legacy global data only once, rather than duplicating it into every workspace.
- Ensure async work started in one workspace or scene cannot incorrectly update the UI for another.
- Prevent draft autosaves from racing with message sending or draft loading.

## Changes made

### 1. One-time migration of relationship types

**File:** `src/characters/CharactersPage.tsx`  
**Commit:** `8a8b357` — `Migrate legacy relationship kinds only once`

Previously, each workspace missing its own relationship-kind file could import the same custom relationship types from legacy global `localStorage`. That could make supposedly independent workspaces inherit one another's starting data.

The migration now uses the marker `brd.workspace-relationship-kinds-migration.v1`. Legacy custom types are imported only for the first workspace that needs migration. Workspaces without legacy custom types receive the standard relationship types. The marker is written after the workspace data has been saved successfully.

### 2. Load character portraits from the active workspace

**File:** `src/App.tsx`  
**Commit:** `21fc200` — `Load chat portraits from active workspace`

The chat portrait-loading effect previously used the global resource lookup even when a workspace was active. It now uses `getWorkspaceResourceBlob(activeWorkspace.path, id)` for workspace-owned images and falls back to `getResourceBlob(id)` only when no workspace is active.

The effect also depends on the active workspace path, so portraits are refreshed when switching workspaces.

### 3. One-time migration of character expressions

**File:** `src/characters/workspaceCharacterExpressions.storage.ts`  
**Commit:** `f126a21` — `Migrate legacy character expressions once`

The legacy expression migration could copy matching global IndexedDB expressions into each workspace. A marker, `brd.workspace-character-expressions-migration.v1`, now ensures legacy expressions are imported only for the first workspace requiring migration. Subsequent workspaces start with their own expression data.

The migration marker is only set after successful writes and when there are character IDs to migrate. Legacy IndexedDB records are not deleted by this change.

### 4. One-time migration of legacy resources

**File:** `src/resources/workspaceResources.storage.ts`  
**Commit:** `f430fde` — `Migrate legacy resources into one workspace only`

The resource migration previously had no global completion marker, so legacy IndexedDB resources could be copied into multiple workspaces.

The migration now uses `brd.workspace-resource-migration.v1`. Once a migration completes, later workspaces do not re-import the same legacy resource collection. Existing workspace resource IDs continue to take precedence. The legacy source records are left intact.

### 5. Scope global search to the active workspace

**Files:** `src/GlobalSearch.tsx`, `src/App.tsx`  
**Commits:** `7cf9a3a`, `54bf0e2`

Global search now accepts a `workspacePath` and searches characters and resources from that workspace only. While there is no active workspace, it does not query those lists. The app passes the active workspace path to the search component, and the search labels clarify the active-workspace scope.

### 6. Keep message-send completion tied to its original scene

**File:** `src/App.tsx`  
**Commit:** `b443a20` — `Guard message send completion by workspace and scene`

Sending a message now captures the workspace path, scene ID and editing state at the start of the operation. After persistence completes, draft clearing is applied to the captured workspace/scene. UI cleanup and animation only run if the user is still viewing that same workspace and scene.

This prevents a delayed send operation from clearing or changing the UI for a different scene the user switched to while the save was in progress.

### 7. Prevent stale workspace loading from overwriting current state

**File:** `src/App.tsx`  
**Commit:** `12036ca` — `Ignore stale workspace migration results`

A cancellation check was added after the awaited workspace-content save in the migration/loading effect. If the user has already switched workspaces, the stale operation returns instead of applying old category state to the newly active workspace.

### 8. Scope async persistence feedback to its workspace and scene

**File:** `src/App.tsx`  
**Commit:** `f607808` — `Scope async workspace feedback to active workspace`

An `activeWorkspacePathRef` now tracks the current workspace path. Scene-message persistence captures its target workspace and scene before saving, and only updates workspace error feedback if that workspace is still active.

Delayed draft-save success and error handlers are similarly guarded so an operation from a workspace that is no longer active cannot incorrectly clear or display its error in the current workspace.

### 9. Guard scene, folder and category operations after awaited saves

**File:** `src/App.tsx`  
**Commit:** `c8003f0` — `Guard workspace operations after async saves`

After asynchronous workspace saves, scene/folder/category operations now check that the original workspace is still active before applying subsequent UI state changes. The guard was applied to the audited create, rename, delete, move and reorder operations.

This prevents an operation started in one workspace from applying its follow-up state updates after the user has switched to another.

### 10. Reset transient UI state on workspace switch

**File:** `src/App.tsx`  
**Commit:** `fe46cc3` — `Reset transient scene UI on workspace switch`

The workspace-content loading effect now resets transient scene UI state, including open message actions, scene options, pending deletion/creation dialogs, name drafts, move state and drag state. The pointer-drag reference is also cleared.

Scene/folder/category operation error handlers now report errors only when their original workspace remains active, preventing stale errors from appearing in a different workspace.

### 11. Invalidate stale draft loads and cancel pending autosave timers on workspace switch

**File:** `src/App.tsx`  
**Commit:** `a471b66` — `Invalidate stale draft loads on workspace switch`

When workspace content begins loading, the draft-load request counter is incremented to invalidate an in-flight draft load from the workspace being left. Any pending draft autosave timer is also cancelled. Saves already started remain bound to their original workspace path.

### 12. Tie draft-save feedback to both workspace and scene; order message-send saves

**File:** `src/App.tsx`  
**Commit:** `e480021` — `Guard draft feedback by active scene`

Draft-save success and error handlers now require both the original workspace path and scene ID to still match the active context. This avoids showing an old scene's draft-save error while another scene is open.

Before sending a message, the pending draft autosave timer is cancelled and its ref cleared before message persistence begins. This reduces the chance of a pending autosave racing with the draft clear performed after sending.

### 13. Serialize draft reads and writes per workspace and scene

**File:** `src/workspace/workspaceDrafts.storage.ts`  
**Commit:** `39d8070` — `Serialize draft reads and writes per workspace scene`

Draft operations are now tracked by a key composed of workspace path and scene ID. Writes for the same workspace/scene are serialized, so an older autosave cannot finish after and overwrite a newer save or draft clear. A failed previous write does not prevent later writes from proceeding.

Loading a draft waits for any pending write for that same workspace/scene to settle before reading. Draft operations for different scenes or workspaces remain independent.

## Migration markers introduced

| Marker | Purpose |
| --- | --- |
| `brd.workspace-relationship-kinds-migration.v1` | Prevent importing legacy global relationship types into every workspace. |
| `brd.workspace-character-expressions-migration.v1` | Prevent importing legacy global character expressions into every workspace. |
| `brd.workspace-resource-migration.v1` | Prevent importing legacy global resources into every workspace. |

These markers record that the corresponding legacy migration has completed. The legacy source data is not deleted by the fixes documented here.

## Runtime verification checklist

The following checks should be performed in the running application. They are not considered verified solely because the build succeeds.

- [ ] Create two workspaces with different characters, resources, scenes and custom relationship types; confirm their data stays separate.
- [ ] Confirm legacy expressions and resources do not unexpectedly appear in every newly opened workspace.
- [ ] Create a draft in one scene, switch scenes, then return; confirm the draft remains with its original scene.
- [ ] Type and send a message while autosave may be pending; confirm the message is saved once and the sent text does not reappear as a draft.
- [ ] Switch workspaces during a pending operation; confirm the previous workspace's result or error does not alter the active workspace's UI.
- [ ] Switch workspaces with dialogs or drag operations open; confirm transient UI state is reset.
- [ ] Close and reopen BRD; confirm expected workspace content and drafts persist.

## Scope and limitations

This audit focused on cross-workspace data leakage, stale asynchronous UI updates and draft read/write ordering. It is not a guarantee that every workspace feature or migration edge case has been exhaustively tested. Keep this checklist updated as runtime tests are completed, and document any further fixes in the changelog.
