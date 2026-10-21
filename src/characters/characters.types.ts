export type RelationshipKind = "Mother" | "Father" | "Sibling" | "Partner" | "Close friend" | "Enemy" | "Other";

export type CharacterRelationship = {
  id: string;
  kind: RelationshipKind;
  characterId: string | null;
  characterName: string;
  notes: string;
};

export type CharacterDraft = {
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
  deityOf: string;
  age: string;
  species: string;
  gender: string;
  sexuality: string;
  abilities: string[];
  personality: string;
  likes: string[];
  dislikes: string[];
  hobbies: string[];
  fears: string[];
  knowledge: string[];
  associatedColor: string;
  height: string;
  bodyType: string;
  birthmarks: string[];
  scars: string[];
  bodyArt: string[];
  eyeColor: string;
  hairColor: string;
  hairstyles: string[];
  facialHair: string;
  piercings: string[];
  clothingStyles: string[];
  weapons: string[];
  diseases: string[];
  mentalDisorders: string[];
  physicalDisorders: string[];
  allergies: string[];
  relationships: CharacterRelationship[];
  relationshipStatus: string;
  occupation: string;
  residence: string;
  biography: string;
};

export type CharacterRecord = CharacterDraft & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export const CHARACTER_LIBRARY_KEY = "brd.character-library.v1";

export function createEmptyCharacterDraft(): CharacterDraft {
  return {
    name: "",
    subtitle: "",
    description: "",
    initials: "",
    accent: "#b4befe",
    portraitResourceId: null,
    portraitFit: "contain",
    portraitPositionX: 50,
    portraitPositionY: 50,
    portraitZoom: 100,
    tags: [],
    deityOf: "",
    age: "",
    species: "",
    gender: "",
    sexuality: "",
    abilities: [],
    personality: "",
    likes: [],
    dislikes: [],
    hobbies: [],
    fears: [],
    knowledge: [],
    associatedColor: "#b4befe",
    height: "",
    bodyType: "",
    birthmarks: [],
    scars: [],
    bodyArt: [],
    eyeColor: "",
    hairColor: "",
    hairstyles: [],
    facialHair: "",
    piercings: [],
    clothingStyles: [],
    weapons: [],
    diseases: [],
    mentalDisorders: [],
    physicalDisorders: [],
    allergies: [],
    relationships: [],
    relationshipStatus: "",
    occupation: "",
    residence: "",
    biography: "",
  };
}

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

export function makeCharacterRecord(draft: CharacterDraft, existing?: Partial<CharacterRecord> & Pick<CharacterRecord, "id">): CharacterRecord {
  const now = new Date().toISOString();
  return {
    ...draft,
    id: existing?.id ?? crypto.randomUUID(),
    name: draft.name.trim(),
    subtitle: draft.subtitle.trim(),
    description: draft.description.trim(),
    initials: (draft.initials.trim() || draft.name.trim().slice(0, 2)).toUpperCase().slice(0, 3),
    tags: [...new Set(draft.tags.map((tag) => tag.trim()).filter(Boolean))],
    abilities: cleanList(draft.abilities),
    likes: cleanList(draft.likes),
    dislikes: cleanList(draft.dislikes),
    hobbies: cleanList(draft.hobbies),
    fears: cleanList(draft.fears),
    knowledge: cleanList(draft.knowledge),
    birthmarks: cleanList(draft.birthmarks),
    scars: cleanList(draft.scars),
    bodyArt: cleanList(draft.bodyArt),
    hairstyles: cleanList(draft.hairstyles),
    piercings: cleanList(draft.piercings),
    clothingStyles: cleanList(draft.clothingStyles),
    weapons: cleanList(draft.weapons),
    diseases: cleanList(draft.diseases),
    mentalDisorders: cleanList(draft.mentalDisorders),
    physicalDisorders: cleanList(draft.physicalDisorders),
    allergies: cleanList(draft.allergies),
    relationships: draft.relationships.map((relationship) => ({ ...relationship, characterName: relationship.characterName.trim(), notes: relationship.notes.trim() })).filter((relationship) => relationship.characterName),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

function cleanList(items: string[]): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}
