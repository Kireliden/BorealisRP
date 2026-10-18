export type CharacterRecord = {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  initials: string;
  accent: "lavender" | "blue" | "pink" | "green";
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
