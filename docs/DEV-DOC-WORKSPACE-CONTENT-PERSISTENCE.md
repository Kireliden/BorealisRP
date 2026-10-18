# Workspace content persistence — implementation note

## Scope

This milestone replaces the hard-coded scene/message preview with workspace-owned scene data and persistent messages. It intentionally does not yet implement character-file management, resource management, scene deletion/renaming, or rich workspace settings.

## Storage

Each workspace stores `workspace-content.json` at its root. The document has `schemaVersion: 1` and a `scenes` array. Each scene owns its ID, name, icon, and messages. The file is portable with the workspace folder.

The Tauri backend validates the workspace manifest before reading or writing content, uses a fixed filename rather than an arbitrary relative path, validates the content schema, caps saved content at 20 MB, and updates the manifest's `updatedAt` timestamp after saves.

## Behaviour

- Opening a workspace loads its own scenes and messages.
- A new workspace starts empty; the user creates the first scene with **New scene**.
- Creating a scene persists it immediately.
- Sending and editing messages saves the updated scene data.
- Switching workspaces clears the previous workspace's view while the next workspace loads.
- No workspace or no scene means the composer cannot send a message.
- Recent workspace metadata remains separate in the app-level Tauri store.

## Follow-up

Once this path is tested end-to-end on Windows, extend the same persistence model to character records and scene management actions, then split the document into smaller files only when the data volume or features justify it.
