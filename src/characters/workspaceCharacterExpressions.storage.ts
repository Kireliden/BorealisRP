import { readWorkspaceFile, writeWorkspaceFile, writeWorkspaceJson } from "../workspace/workspaceFiles";
import {
  CHARACTER_EXPRESSION_SLOTS,
  getCharacterExpressionBlob,
  listCharacterExpressions,
  type CharacterExpressionKey,
  type ReviewedCharacterExpression,
  type SavedCharacterExpression,
} from "./characterExpressions.storage";

const MANIFEST_PATH = "Characters/Expressions/manifest.json";
const ROOT = "Characters/Expressions";

type WorkspaceExpressionEntry = SavedCharacterExpression & { path: string };
type WorkspaceExpressionManifest = {
  version: 1;
  migratedCharacterIds: string[];
  expressions: WorkspaceExpressionEntry[];
};

function emptyManifest(): WorkspaceExpressionManifest {
  return { version: 1, migratedCharacterIds: [], expressions: [] };
}

function isMissingFile(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /not found|no such file|os error 2|system cannot find the file/i.test(message);
}

async function readManifest(workspacePath: string): Promise<WorkspaceExpressionManifest> {
  try {
    const bytes = await readWorkspaceFile(workspacePath, MANIFEST_PATH);
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || typeof parsed !== "object") throw new Error("The workspace expression manifest is invalid.");
    const value = parsed as Partial<WorkspaceExpressionManifest>;
    if (value.version !== 1 || !Array.isArray(value.migratedCharacterIds) || !Array.isArray(value.expressions)) {
      throw new Error("The workspace expression manifest is invalid; its files have not been changed.");
    }
    return {
      version: 1,
      migratedCharacterIds: value.migratedCharacterIds.filter((id): id is string => typeof id === "string"),
      expressions: value.expressions.filter((entry): entry is WorkspaceExpressionEntry =>
        Boolean(entry && typeof entry === "object" &&
          typeof (entry as WorkspaceExpressionEntry).characterId === "string" &&
          typeof (entry as WorkspaceExpressionEntry).key === "string" &&
          typeof (entry as WorkspaceExpressionEntry).path === "string")),
    };
  } catch (error) {
    if (isMissingFile(error)) return emptyManifest();
    throw error;
  }
}

async function writeBlob(workspacePath: string, path: string, blob: Blob): Promise<void> {
  await writeWorkspaceFile(workspacePath, path, new Uint8Array(await blob.arrayBuffer()));
}

function safeCharacterFolder(characterId: string): string {
  return characterId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function extensionForMime(mimeType: string): string {
  const extensions: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
  };
  return extensions[mimeType] ?? "img";
}

function expressionPath(characterId: string, key: CharacterExpressionKey, mimeType: string): string {
  return `${ROOT}/${safeCharacterFolder(characterId)}/${key}.${extensionForMime(mimeType)}`;
}

/** Copy legacy IndexedDB expressions into this workspace once per character. Legacy data is never deleted. */
export async function ensureWorkspaceCharacterExpressions(
  workspacePath: string,
  characterIds: string[],
): Promise<void> {
  let manifest = await readManifest(workspacePath);
  for (const characterId of [...new Set(characterIds.filter(Boolean))]) {
    if (manifest.migratedCharacterIds.includes(characterId)) continue;
    const legacy = await listCharacterExpressions(characterId);
    for (const metadata of legacy) {
      const image = await getCharacterExpressionBlob(characterId, metadata.key);
      if (!image) continue;
      const path = expressionPath(characterId, metadata.key, image.type || metadata.mimeType);
      await writeBlob(workspacePath, path, image);
      manifest.expressions = [
        ...manifest.expressions.filter((entry) => !(entry.characterId === characterId && entry.key === metadata.key)),
        { ...metadata, path, mimeType: image.type || metadata.mimeType },
      ];
    }
    manifest.migratedCharacterIds = [...manifest.migratedCharacterIds, characterId];
    await writeWorkspaceJson(workspacePath, MANIFEST_PATH, manifest);
  }
}

export async function getWorkspaceCharacterExpressionBlob(
  workspacePath: string,
  characterId: string,
  key: CharacterExpressionKey,
): Promise<Blob | null> {
  const manifest = await readManifest(workspacePath);
  const entry = manifest.expressions.find((item) => item.characterId === characterId && item.key === key);
  if (!entry) return null;
  try {
    const bytes = await readWorkspaceFile(workspacePath, entry.path);
    return new Blob([bytes.buffer as ArrayBuffer], { type: entry.mimeType });
  } catch (error) {
    if (isMissingFile(error)) return null;
    throw error;
  }
}

/** Save the reviewed set to the active workspace, replacing only this character's six expressions. */
export async function saveWorkspaceReviewedCharacterExpressions(
  workspacePath: string,
  characterId: string,
  expressions: ReviewedCharacterExpression[],
): Promise<SavedCharacterExpression[]> {
  if (!characterId.trim()) throw new Error("Choose a character before saving expressions.");
  const byKey = new Map(expressions.map((expression) => [expression.key, expression]));
  const missing = CHARACTER_EXPRESSION_SLOTS.filter((slot) => {
    const expression = byKey.get(slot.key);
    return !expression || !(expression.image instanceof Blob) || expression.image.size === 0;
  });
  if (missing.length) {
    throw new Error(`Add an image for every expression before saving. Missing: ${missing.map((slot) => slot.label).join(", ")}.`);
  }

  const manifest = await readManifest(workspacePath);
  const now = new Date().toISOString();
  const saved: SavedCharacterExpression[] = [];
  for (const slot of CHARACTER_EXPRESSION_SLOTS) {
    const reviewed = byKey.get(slot.key)!;
    const previous = manifest.expressions.find((entry) => entry.characterId === characterId && entry.key === slot.key);
    const mimeType = reviewed.image.type || "application/octet-stream";
    const path = expressionPath(characterId, slot.key, mimeType);
    await writeBlob(workspacePath, path, reviewed.image);
    saved.push({
      id: previous?.id ?? crypto.randomUUID(),
      characterId,
      key: slot.key,
      label: slot.label,
      mimeType,
      fileName: reviewed.fileName?.trim() || `${slot.key}.${extensionForMime(mimeType)}`,
      updatedAt: now,
    });
  }

  manifest.expressions = [
    ...manifest.expressions.filter((entry) => entry.characterId !== characterId),
    ...saved.map((item) => ({ ...item, path: expressionPath(characterId, item.key, item.mimeType) })),
  ];
  if (!manifest.migratedCharacterIds.includes(characterId)) {
    manifest.migratedCharacterIds.push(characterId);
  }
  await writeWorkspaceJson(workspacePath, MANIFEST_PATH, manifest);
  return saved;
}
