import { readWorkspaceFile, writeWorkspaceFile } from "../workspace/workspaceFiles";
import { loadCharacters } from "./characters.storage";
import type { CharacterRecord } from "./characters.types";

const CHARACTERS_PATH = "Characters/characters.json";
const RELATIONSHIP_KINDS_PATH = "Characters/relationship-kinds.json";

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
 * Loads a workspace's character cast. On first use, legacy global characters are
 * copied into the workspace; the original browser copy is deliberately preserved.
 */
export async function loadWorkspaceCharacters(workspacePath: string): Promise<CharacterRecord[]> {
  const stored = await readJson<unknown>(workspacePath, CHARACTERS_PATH);
  if (stored !== null) {
    if (!Array.isArray(stored) || !stored.every(isCharacterRecord)) {
      throw new Error("The workspace character library is invalid; its files have not been changed.");
    }
    return stored;
  }

  const legacy = loadCharacters();
  await saveWorkspaceCharacters(workspacePath, legacy);
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
