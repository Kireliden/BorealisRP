import { CHARACTER_LIBRARY_KEY, type CharacterRecord } from "./characters.types";

export function loadCharacters(): CharacterRecord[] {
  try {
    const raw = localStorage.getItem(CHARACTER_LIBRARY_KEY);
    if (!raw) {
      localStorage.setItem(CHARACTER_LIBRARY_KEY, "[]");
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isCharacterRecord) : [];
  } catch {
    return [];
  }
}

export function saveCharacters(characters: CharacterRecord[]): void {
  localStorage.setItem(CHARACTER_LIBRARY_KEY, JSON.stringify(characters));
}

function isCharacterRecord(value: unknown): value is CharacterRecord {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CharacterRecord>;
  return typeof item.id === "string" && typeof item.name === "string" && Array.isArray(item.tags);
}
