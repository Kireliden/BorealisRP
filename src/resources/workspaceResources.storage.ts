import type { ResourceRecord } from "./resources.types";
import { readWorkspaceFile, writeWorkspaceFile } from "../workspace/workspaceFiles";

const MANIFEST_PATH = "Resources/manifest.json";
const FILES_DIRECTORY = "Resources/Files";

export type WorkspaceResourceRecord = ResourceRecord & { relativePath: string };
export type WorkspaceResourceManifest = { schemaVersion: 1; resources: WorkspaceResourceRecord[] };

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
    return candidate as WorkspaceResourceManifest;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/not found|no such file|os error 2|system cannot find the file/i.test(message)) {
      return { schemaVersion: 1, resources: [] };
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

export async function importWorkspaceResource(workspacePath: string, file: File, tags: string[] = []): Promise<ResourceRecord> {
  const record: ResourceRecord = {
    id: crypto.randomUUID(),
    name: file.name.replace(/\.[^.]+$/, ""),
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    kind: file.type.startsWith("image/") ? "image" : file.type.startsWith("audio/") ? "audio" : file.type.startsWith("video/") ? "video" : "other",
    size: file.size,
    tags: [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))],
    importedAt: new Date().toISOString(),
  };
  const manifest = await loadManifest(workspacePath);
  const relativePath = resourcePath(record);
  await writeWorkspaceFile(workspacePath, relativePath, new Uint8Array(await file.arrayBuffer()));
  manifest.resources.push({ ...record, relativePath });
  await saveManifest(workspacePath, manifest);
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
  manifest.resources = manifest.resources.filter((item) => item.id !== id);
  await saveManifest(workspacePath, manifest);
}
