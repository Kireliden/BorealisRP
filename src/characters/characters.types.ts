export type CharacterRecord = {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  initials: string;
  accent: string;
  portraitResourceId: string | null;
  portraitFit: "cover" | "contain";
  portraitPositionX: number;
  portraitPositionY: number;
  portraitZoom: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type CharacterDraft = Pick<CharacterRecord, "name" | "subtitle" | "description" | "initials" | "accent" | "portraitResourceId" | "portraitFit" | "portraitPositionX" | "portraitPositionY" | "portraitZoom" | "tags">;

export const CHARACTER_LIBRARY_KEY = "brd.character-library.v1";

export function characterAccentColor(accent: string | undefined): string {
  if (accent && /^#[0-9a-f]{3,8}$/i.test(accent)) return accent;
  const legacy: Record<string, string> = {
    lavender: "#b4befe",
    blue: "#89b4fa",
    pink: "#f5c2e7",
    green: "#a6e3a1",
  };
  return legacy[accent ?? ""] ?? "#b4befe";
}

export function makeCharacterRecord(draft: CharacterDraft, existing?: CharacterRecord): CharacterRecord {
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? crypto.randomUUID(),
    ...draft,
    name: draft.name.trim(),
    subtitle: draft.subtitle.trim(),
    description: draft.description.trim(),
    initials: (draft.initials.trim() || draft.name.trim().slice(0, 2)).toUpperCase().slice(0, 3),
    tags: [...new Set(draft.tags.map((tag) => tag.trim()).filter(Boolean))],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}
