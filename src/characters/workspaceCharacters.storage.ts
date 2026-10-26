import { readWorkspaceFile, writeWorkspaceFile } from "../workspace/workspaceFiles";
import { loadCharacters } from "./characters.storage";
import type { CharacterRecord } from "./characters.types";

const CHARACTERS_PATH = "Characters/characters.json";
const RELATIONSHIP_KINDS_PATH = "Characters/relationship-kinds.json";
const LEGACY_CHARACTER_MIGRATION_KEY = "brd.workspace-character-migration.v1";

function isCharacterRecord(value: unknown): value is CharacterRecord {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CharacterRecord>;
  return typeof item.id === "string" && typeof item.name === "string" && Array.isArray(item.tags);
}

async function readJson<T>(workspacePath: string, relativePath: string): Promise<T | null> {
  try {
    const bytes = await readWorkspaceFile(workspacePath, relativePath);
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/not found|no such file|os error 2|system cannot find the file/i.test(message)) return null;
    throw error;
  }
}

async function writeJson(workspacePath: string, relativePath: string, value: unknown): Promise<void> {
  const bytes = new TextEncoder().encode(JSON.stringify(value, null, 2) + "\n");
  await writeWorkspaceFile(workspacePath, relativePath, bytes);
}

/**
 * Loads a workspace's character cast. Legacy global characters are migrated into
 * the first workspace that needs them, then the original browser copy is preserved.
 * Later workspaces start independently instead of inheriting another workspace's cast.
 */
export async function loadWorkspaceCharacters(workspacePath: string): Promise<CharacterRecord[]> {
  const stored = await readJson<unknown>(workspacePath, CHARACTERS_PATH);
  if (stored !== null) {
    if (!Array.isArray(stored) || !stored.every(isCharacterRecord)) {
      throw new Error("The workspace character library is invalid; its files have not been changed.");
    }
    return stored;
  }

  const hasMigratedLegacyCharacters = localStorage.getItem(LEGACY_CHARACTER_MIGRATION_KEY) === "completed";
  const legacy = hasMigratedLegacyCharacters ? [] : loadCharacters();
  await saveWorkspaceCharacters(workspacePath, legacy);

  // Mark migration only after the workspace write succeeds, so a failed write can be retried.
  if (!hasMigratedLegacyCharacters) {
    localStorage.setItem(LEGACY_CHARACTER_MIGRATION_KEY, "completed");
  }
  return legacy;
}

export async function saveWorkspaceCharacters(workspacePath: string, characters: CharacterRecord[]): Promise<void> {
  await writeJson(workspacePath, CHARACTERS_PATH, characters);
}

export async function loadWorkspaceRelationshipKinds(workspacePath: string): Promise<string[] | null> {
  const stored = await readJson<unknown>(workspacePath, RELATIONSHIP_KINDS_PATH);
  if (stored === null) return null;
  if (!Array.isArray(stored) || !stored.every((item) => typeof item === "string")) {
    throw new Error("The workspace relationship types file is invalid; it has not been changed.");
  }
  return stored;
}

export async function saveWorkspaceRelationshipKinds(workspacePath: string, kinds: string[]): Promise<void> {
  await writeJson(workspacePath, RELATIONSHIP_KINDS_PATH, kinds);
}
