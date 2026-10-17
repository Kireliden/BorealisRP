# BRD — Workspace Storage & User-Owned Data
## Developer Document

**Status:** Approved architectural decision  
**Date:** 17 October 2026  
**Scope:** Workspace discovery, storage, portability, open formats and backup/restore  
**Implementation status:** Planned — this document defines requirements, not implemented functionality

---

## 1. Purpose

Borealis Roleplay Den (BRD) must treat a user's workspace folder as the authoritative home of that workspace's content. BRD is an editor and manager for the user's data; it must not own that data through an opaque application-only storage system.

This is inspired by the user experience of Obsidian vaults: users choose where a workspace lives, can open existing workspace folders on demand, and retain direct access to the underlying files independently of the application.

The folder is the workspace. BRD is the tool used to work with it.

## 2. Non-negotiable principles

1. **User chooses the location.** When creating a workspace, the user selects its destination. It may be anywhere they can write to: Documents, another drive, a removable drive, OneDrive, or another ordinary folder.
2. **Workspace content does not live in AppData by default.** Character/story/chat content and workspace resources must not be silently stored in an application-managed location. Do not require AppData, the install directory, or a hidden application database to recover a workspace.
3. **The workspace folder is the source of truth.** BRD reads and writes workspace content directly in that folder. It must not maintain an indispensable hidden duplicate elsewhere.
4. **Files remain user-accessible.** Users must be able to inspect, copy, back up and move workspace contents using their operating system's file manager or other compatible tools.
5. **Prefer open, documented formats.** Use human-readable, documented formats where appropriate (for example JSON for structured metadata and Markdown for suitable text), and keep original media files in normal image/audio formats. No proprietary container or undocumented format may be required to recover user content.
6. **Portable references.** Internal links between workspace data and assets must use workspace-relative paths or stable workspace-relative identifiers, not absolute machine-specific paths.
7. **Moving or reinstalling BRD must not destroy workspaces.** Application installation and workspace storage are separate concerns.
8. **Multiple workspaces are first-class.** Users can create, register, open and switch between independent workspace folders.
9. **Backups must be recoverable.** A complete backup must contain everything needed to reconstruct the workspace, including its metadata and referenced assets.
10. **No forced cloud integration.** Cloud-sync folders are ordinary user-selected folders. BRD does not need a provider-specific integration just to use a workspace stored in OneDrive or another synced directory.

## 3. Workspace lifecycle and My Workspace

The existing **My Workspace** interface should become the workspace manager.

### Required actions

- **Create Workspace** — choose a display name and destination folder; create the workspace structure and its required manifest.
- **Open Workspace** — select an existing BRD workspace folder and validate it before loading.
- **Add Existing Workspace** — make an existing workspace available in the recent-workspaces list without moving or copying its files.
- **Switch Workspace** — change the active workspace without merging content from another workspace.
- **Remove from List** — remove a workspace from BRD's recent list without deleting its folder or data.
- **Show in File Manager** — open the active workspace location in the system file manager where supported.
- **Workspace Settings** — manage settings that belong to that workspace.
- **Backup / Restore** — create a complete archive or restore a workspace from a supported backup.

The interface may keep a list of recently opened workspace paths as lightweight application-level metadata. This list is not workspace content and must never be the only record of the data itself. If the list is lost, the user must still be able to open the workspace by selecting its folder.

### Workspace independence

Each workspace owns its own characters, stories, scenes, chats, assets and workspace-level preferences. Switching workspaces must not leak one workspace's content or settings into another. Truly global application preferences may be stored separately, but must be limited to preferences that are not part of any individual workspace.

## 4. Workspace folder and manifest

The exact schema and directory names will be finalized during implementation. The following is a proposed starting point, not a claim about the current repository or a fixed compatibility contract:

```text
BRD - Neon Requiem/
├── workspace.json
├── Settings/
│   ├── workspace.json
│   ├── appearance.json
│   └── theme.json
├── Characters/
│   └── Character01/
│       ├── character.json
│       ├── avatar.png
│       └── Expressions/
│           ├── happy.png
│           └── sad.png
├── Stories/
│   └── Story Name/
│       ├── story.json
│       ├── Scenes/
│       └── Assets/
├── Chats/
│   └── Chat name/
│       └── messages.json
├── Themes/
│   └── My Custom Theme/
│       └── theme.json
└── Resources/
    ├── Backgrounds/
    ├── Audio/
    └── Other/
```

The schema should be designed around stable IDs rather than assuming a display name is a permanent identifier. The manifest should identify the workspace, state the format/schema version and provide enough metadata for BRD to recognize and validate the folder.

### Data expected to live in the workspace

As the relevant features are implemented, workspace-owned files should include, where applicable:

- Character profiles and metadata.
- Character avatars, expression images and other character-specific assets.
- Stories, scenes, drafts and their attachments.
- Roleplay chats, messages and supported message history.
- Workspace-level preferences and customizations.
- Custom themes that belong to that workspace.
- Background images, audio and other user-supplied visual/audio resources.
- Metadata needed to relate these items to each other.

Do not place every setting in one global file if it belongs to an individual workspace. Define ownership explicitly for each new data type.

## 5. File formats and compatibility

- Prefer documented, broadly readable formats for structured data and text.
- Preserve user-provided media in standard formats instead of needlessly converting it into a private format.
- Keep workspace metadata separate from the actual media files it references.
- Do not use base64 blobs inside JSON as the normal way to store image/audio assets.
- Do not make the workspace dependent on a local database hidden outside its folder.
- A database may only be considered as a disposable performance cache or index if the workspace files remain sufficient to reconstruct the data. The cache must be safely rebuildable and must not become a second source of truth.
- Document the schema and versioning rules so third-party tools can inspect or process workspace content without reverse-engineering BRD.

JSON is a suitable default for structured metadata, but it is not a mandate to force every kind of content into JSON. Markdown should be considered for suitable prose; media should remain media files.

## 6. Paths and moving a workspace

All references to content within a workspace must remain valid when its root folder is moved.

- Store relative paths using a documented separator/normalization policy.
- Resolve asset paths from the workspace root, not from the application's installation path or the current working directory.
- Validate resolved paths when reading manifests and references; reject paths that escape the workspace root where the operation is intended to access workspace-owned files.
- Avoid storing absolute paths to assets inside the workspace.
- When importing content from outside a workspace, copy it into the workspace if it is meant to become part of that workspace. Do not silently create a permanent dependency on an arbitrary external path.
- If external linked assets are supported in the future, make that relationship explicit in the UI and explain that the asset is not included in a self-contained workspace backup unless copied in.

The same workspace should be movable between supported systems without rewriting its internal references. Cross-platform compatibility also requires normalizing path case and separator assumptions appropriately.

## 7. Cloud-synced and user-managed folders

A workspace may be created directly inside a user-selected OneDrive, Dropbox, or other synchronized folder. From BRD's perspective, this is a normal folder selected by the user; provider-specific APIs are not required for the basic feature.

BRD must not silently redirect such a workspace into AppData or another internal location. It must operate on the selected workspace path and preserve the ordinary files that the sync client manages.

Cloud synchronization itself is outside BRD's storage layer. The core requirement is that workspace content is stored in the selected folder in a portable, inspectable form.

## 8. Backup and restore

A workspace folder should be directly copyable as a manual backup. In addition, BRD should provide a ZIP-based full backup and restore workflow.

### Full backup

The ZIP should contain the complete workspace structure, including its manifest, metadata, user assets, settings and all files required to reconstruct the workspace. It must preserve relative paths.

A backup should include a format/version marker and enough manifest information for BRD to validate it before restoration. The archive format and manifest should be documented.

### Restore requirements

- Validate archive structure, manifest, format version and paths before applying changes.
- Prevent path traversal and reject entries that attempt to write outside the chosen restore destination.
- Explain whether restore will create a new workspace or replace an existing one.
- Never silently overwrite an existing workspace. Require clear confirmation for destructive replacement and offer a safe path that restores to a new folder.
- Protect existing data if validation or restoration fails; use a staged restore and only finalize once validation succeeds where practical.
- Report incompatible or newer formats clearly instead of partially loading them as if restoration succeeded.
- Do not depend on the original application installation or its local settings to restore the archive.

A ZIP backup is a transport/backup representation of the same workspace files, not a proprietary alternative source of truth.

### Individual exports

Full-workspace backup is the first priority. Individual character/story export or sharing may be added later, with a clear definition of which referenced assets are included.

## 9. Schema evolution and migrations

Workspace formats will evolve. Every workspace manifest and versioned data schema must have a documented versioning policy.

- Validate a workspace before opening it.
- Support explicit migrations when a newer BRD version changes a schema.
- Never silently discard fields or assets that the current version does not understand.
- Preserve a backup or recovery path before applying a migration that modifies user files.
- Keep migrations repeatable and testable; report failures without leaving the workspace in an ambiguous half-migrated state.
- Where possible, migrations should update files in place while retaining the original assets and keeping relative references valid.
- An older BRD version may not understand a workspace created by a newer version; communicate that limitation rather than rewriting it destructively.

## 10. Failure handling and data safety

The storage layer must handle unavailable folders, permissions errors, full disks, missing assets, malformed manifests and interrupted writes.

- Never report a save as successful until the write has succeeded.
- Use safe write patterns (for example, write a temporary file and replace the target where supported) for critical metadata.
- Keep IDs and references stable when renaming display names or folders through BRD.
- Missing media should not make the entire workspace unreadable; show a recoverable missing-asset state.
- Do not delete files that BRD does not recognize during normal open/save operations.
- Workspace removal from the recent list must not delete workspace files.
- Any destructive action must be explicit and understandable.

## 11. Implementation boundaries

This document defines architectural requirements; it does not require implementing every feature at once.

### Foundation to implement early

1. Define the workspace manifest and schema-version policy.
2. Define a workspace storage service with an explicit root path.
3. Establish stable IDs and relative asset references for character data.
4. Make all workspace reads and writes go through that storage boundary.
5. Add create/open/add-existing/switch behavior to My Workspace.
6. Ensure a character's profile and images are loaded from the same workspace source of truth and are not hardcoded to a particular UI component.

### Follow-up work

- Full ZIP backup and restore.
- Workspace settings and custom theme persistence.
- Story/scene/chat persistence.
- Schema migration framework.
- Individual character/story export and import.
- Additional cross-platform validation and recovery tooling.

Do not build a large character editor, account system, cloud-sync integration or online collaboration as a prerequisite for the workspace foundation. Those are separate concerns.

## 12. Acceptance criteria

The architecture and implementation should satisfy these checks:

- [ ] A user can create a workspace in a folder they choose.
- [ ] All workspace-owned content is stored inside that folder in ordinary files.
- [ ] The workspace can be inspected and copied using the operating system's file manager.
- [ ] The user can open an existing workspace folder without importing it into an application-owned database.
- [ ] Multiple workspaces can be opened and switched between without cross-contamination.
- [ ] Removing a workspace from the recent list does not delete its folder.
- [ ] Moving a workspace root does not break its internal asset references.
- [ ] Reinstalling or moving BRD does not remove or invalidate workspace files.
- [ ] A full ZIP backup includes all workspace data and referenced assets.
- [ ] A ZIP can be validated and restored without relying on hidden local state.
- [ ] Restore does not overwrite existing data without explicit confirmation.
- [ ] Schema changes have a version and migration/recovery strategy.
- [ ] No indispensable proprietary or hidden data store is required to recover user content.

---

## 13. Decision summary

**Approved direction:** BRD uses user-owned, folder-based workspaces inspired by Obsidian vaults. The workspace folder is the authoritative, portable and inspectable source of truth. Users choose its location, can open multiple workspaces from **My Workspace**, and can back up or restore the complete workspace through ordinary folder copying or a documented ZIP archive.

Implementation must follow this architecture from the first persistence features onward, even though backup/restore and all workspace content types will be delivered incrementally.
