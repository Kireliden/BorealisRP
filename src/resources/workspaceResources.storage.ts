import type { ResourceRecord, ResourceFolder, ResourceBatchAction } from "./resources.types";
import { deleteWorkspaceFile, readWorkspaceFile, writeWorkspaceFile } from "../workspace/workspaceFiles";

const MANIFEST_PATH = "Resources/manifest.json";
const FILES_DIRECTORY = "Resources/Files";

export type WorkspaceResourceRecord = ResourceRecord & { relativePath: string };
export type WorkspaceResourceManifest = { schemaVersion: 1; resources: WorkspaceResourceRecord[]; folders?: ResourceFolder[] };

function extensionFor(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return /^[a-z0-9]{1,10}$/.test(extension) ? extension : "bin";
}

function resourcePath(record: ResourceRecord): string {
  return FILES_DIRECTORY + "/" + record.id + "." + extensionFor(record.fileName);
}

async function loadManifest(workspacePath: string): Promise<WorkspaceResourceManifest> {
  try {
    const bytes = await readWorkspaceFile(workspacePath, MANIFEST_PATH);
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || typeof parsed !== "object") throw new Error("The workspace resource manifest is invalid.");
    const candidate = parsed as Partial<WorkspaceResourceManifest>;
    if (candidate.schemaVersion !== 1 || !Array.isArray(candidate.resources)) {
      throw new Error("The workspace resource manifest is invalid; it has not been changed.");
    }
    if (candidate.folders !== undefined && !Array.isArray(candidate.folders)) throw new Error("The workspace folder index is invalid; no changes were made.");
    return candidate as WorkspaceResourceManifest;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/not found|no such file|os error 2|system cannot find the file/i.test(message)) {
      return { schemaVersion: 1, resources: [], folders: [] };
    }
    throw error;
  }
}

async function saveManifest(workspacePath: string, manifest: WorkspaceResourceManifest): Promise<void> {
  const bytes = new TextEncoder().encode(JSON.stringify(manifest, null, 2) + "\n");
  await writeWorkspaceFile(workspacePath, MANIFEST_PATH, bytes);
}

export async function listWorkspaceResources(workspacePath: string): Promise<ResourceRecord[]> {
  const manifest = await loadManifest(workspacePath);
  return manifest.resources.slice().sort((a, b) => b.importedAt.localeCompare(a.importedAt));
}

function createWorkspaceResourceRecord(file: File, tags: string[]): ResourceRecord {
  return {
    id: crypto.randomUUID(),
    name: file.name.replace(/\.[^.]+$/, ""),
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    kind: file.type.startsWith("image/") ? "image" : file.type.startsWith("audio/") ? "audio" : file.type.startsWith("video/") ? "video" : "other",
    size: file.size,
    tags: [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))],
    importedAt: new Date().toISOString(),
  };
}

/** Import a batch of files while loading and saving the manifest only once. */
export async function importWorkspaceResources(
  workspacePath: string,
  files: File[],
  tags: string[] = [],
  folderId: string | null = null,
): Promise<ResourceRecord[]> {
  if (!files.length) return [];

  const manifest = await loadManifest(workspacePath);
  const imported: ResourceRecord[] = [];

  try {
    for (const file of files) {
      const record = { ...createWorkspaceResourceRecord(file, tags), folderId };
      const relativePath = resourcePath(record);
      await writeWorkspaceFile(workspacePath, relativePath, new Uint8Array(await file.arrayBuffer()));
      manifest.resources.push({ ...record, relativePath });
      imported.push(record);
    }
  } catch (error) {
    // Keep any files already written in this batch reachable if a later file fails.
    if (imported.length) await saveManifest(workspacePath, manifest);
    throw error;
  }

  await saveManifest(workspacePath, manifest);
  return imported;
}

export async function importWorkspaceResource(workspacePath: string, file: File, tags: string[] = []): Promise<ResourceRecord> {
  const [record] = await importWorkspaceResources(workspacePath, [file], tags);
  return record;
}

export async function getWorkspaceResourceBlob(workspacePath: string, id: string): Promise<Blob | null> {
  const manifest = await loadManifest(workspacePath);
  const record = manifest.resources.find((item) => item.id === id);
  if (!record) return null;
  const bytes = await readWorkspaceFile(workspacePath, record.relativePath);
  // Copy into a standalone ArrayBuffer so TypeScript can safely treat it as a BlobPart.
  const blobBytes = new Uint8Array(bytes);
  return new Blob([blobBytes.buffer as ArrayBuffer], { type: record.mimeType });
}

export async function updateWorkspaceResourceTags(workspacePath: string, id: string, tags: string[]): Promise<void> {
  const manifest = await loadManifest(workspacePath);
  const record = manifest.resources.find((item) => item.id === id);
  if (!record) throw new Error("That resource no longer exists in this workspace.");
  record.tags = [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
  await saveManifest(workspacePath, manifest);
}

export async function deleteWorkspaceResource(workspacePath: string, id: string): Promise<void> {
  const manifest = await loadManifest(workspacePath);
  const resource = manifest.resources.find((item) => item.id === id);
  if (!resource) return;

  // Commit the metadata change first so a failed cleanup never leaves a dangling resource entry.
  manifest.resources = manifest.resources.filter((item) => item.id !== id);
  await saveManifest(workspacePath, manifest);
  await deleteWorkspaceFile(workspacePath, resource.relativePath);
}

const LEGACY_RESOURCE_MIGRATION_KEY = "brd.workspace-resource-migration.v1";

export function hasCompletedLegacyResourceMigration(): boolean {
  return localStorage.getItem(LEGACY_RESOURCE_MIGRATION_KEY) === "completed";
}

/**
 * Imports the legacy IndexedDB library into the first workspace that needs migration.
 * Later workspaces start with their own resource library. The original records remain
 * untouched, and the migration marker is written only after workspace changes succeed.
 */
export async function migrateLegacyResources(
  workspacePath: string,
  legacy: Array<{ record: ResourceRecord; blob: Blob }>,
): Promise<number> {
  if (hasCompletedLegacyResourceMigration()) return 0;

  const manifest = await loadManifest(workspacePath);
  const knownIds = new Set(manifest.resources.map((item) => item.id));
  let copied = 0;

  for (const item of legacy) {
    if (knownIds.has(item.record.id)) continue;
    const relativePath = resourcePath(item.record);
    const bytes = new Uint8Array(await item.blob.arrayBuffer());
    await writeWorkspaceFile(workspacePath, relativePath, bytes);
    manifest.resources.push({ ...item.record, relativePath });
    knownIds.add(item.record.id);
    copied += 1;
  }

  if (copied) await saveManifest(workspacePath, manifest);
  localStorage.setItem(LEGACY_RESOURCE_MIGRATION_KEY, "completed");
  return copied;
}


/** Folders are logical groupings; binary assets continue to live under Resources/Files. */
export async function listWorkspaceResourceFolders(workspacePath: string): Promise<ResourceFolder[]> {
  return (await loadManifest(workspacePath)).folders ?? [];
}

export async function createWorkspaceResourceFolder(workspacePath: string, name: string, parentId: string | null): Promise<ResourceFolder> {
  const trimmed = name.trim();
  if (!trimmed || /[/\\]/.test(trimmed)) throw new Error("Choose a folder name without slashes.");
  const manifest = await loadManifest(workspacePath);
  const folders = manifest.folders ?? [];
  if (parentId && !folders.some((folder) => folder.id === parentId)) throw new Error("Parent folder no longer exists.");
  if (folders.some((folder) => folder.parentId === parentId && folder.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase())) {
    throw new Error("A folder with this name already exists here.");
  }
  const folder: ResourceFolder = { id: crypto.randomUUID(), name: trimmed, parentId, createdAt: new Date().toISOString() };
  manifest.folders = [...folders, folder];
  await saveManifest(workspacePath, manifest);
  return folder;
}

export async function organiseWorkspaceResources(
  workspacePath: string,
  ids: string[],
  action: ResourceBatchAction,
  destinationFolderId: string | null = null,
): Promise<void> {
  if (!ids.length) return;
  const manifest = await loadManifest(workspacePath);
  if (action !== "delete" && destinationFolderId !== null && !(manifest.folders ?? []).some((f) => f.id === destinationFolderId)) {
    throw new Error("Destination folder no longer exists.");
  }
  const selected = new Set(ids);
  const matching = manifest.resources.filter((item) => selected.has(item.id));
  if (action === "move") {
    for (const item of matching) item.folderId = destinationFolderId;
    await saveManifest(workspacePath, manifest);
  } else if (action === "copy") {
    const copies: WorkspaceResourceRecord[] = [];
    try {
      for (const item of matching) {
        const copy = { ...item, id: crypto.randomUUID(), folderId: destinationFolderId, importedAt: new Date().toISOString() };
        copy.relativePath = resourcePath(copy);
        await writeWorkspaceFile(workspacePath, copy.relativePath, await readWorkspaceFile(workspacePath, item.relativePath));
        copies.push(copy);
      }
    } catch (error) {
      // Retain references to successfully copied files if a subsequent write fails.
      if (copies.length) {
        manifest.resources.push(...copies);
        await saveManifest(workspacePath, manifest);
      }
      throw error;
    }
    manifest.resources.push(...copies);
    await saveManifest(workspacePath, manifest);
  } else {
    manifest.resources = manifest.resources.filter((item) => !selected.has(item.id));
    await saveManifest(workspacePath, manifest);
    // Delete only BRD-managed copies, never their original import paths.
    for (const item of matching) await deleteWorkspaceFile(workspacePath, item.relativePath);
  }
}
