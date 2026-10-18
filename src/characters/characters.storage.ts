import { CHARACTER_LIBRARY_KEY, type CharacterRecord } from "./characters.types";

const starterCharacters: CharacterRecord[] = [
  {
    id: "brd-keira",
    name: "Keira",
    subtitle: "Neon Requiem · Main character",
    description: "",
    initials: "KR",
    accent: "lavender",
    portraitResourceId: null,
    portraitFit: "cover",
    tags: ["Neon Requiem", "Main character"],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

export function loadCharacters(): CharacterRecord[] {
  try {
    const raw = localStorage.getItem(CHARACTER_LIBRARY_KEY);
    if (!raw) {
      localStorage.setItem(CHARACTER_LIBRARY_KEY, JSON.stringify(starterCharacters));
      return starterCharacters;
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isCharacterRecord) : starterCharacters;
  } catch {
    return starterCharacters;
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
