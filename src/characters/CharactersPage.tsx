import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Search, Tag, X, GitFork, LayoutGrid } from "lucide-react";
import { loadCharacters, saveCharacters } from "./characters.storage";
import { characterAccentColor, createEmptyCharacterDraft, makeCharacterRecord, type CharacterDraft, type CharacterRecord } from "./characters.types";
import CharacterEditorModal from "./CharacterEditorModal";
import "./characters.css";
import CharacterPortraitArt from "./CharacterPortraitArt";
import RelationshipMap from "./RelationshipMap";
import { getResourceBlob, listResources } from "../resources/resources.storage";
import type { ResourceRecord } from "../resources/resources.types";

type Props = { onClose: () => void };

export default function CharactersPage({ onClose }: Props) {
  const [characters, setCharacters] = useState<CharacterRecord[]>(loadCharacters);
  const [imageResources, setImageResources] = useState<ResourceRecord[]>([]);
  const [portraitUrls, setPortraitUrls] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<CharacterDraft>(createEmptyCharacterDraft());
  const [isCreating, setIsCreating] = useState(false);
  const [viewMode, setViewMode] = useState<"characters" | "map">("characters");
  useEffect(() => { void listResources().then((items) => setImageResources(items.filter((item) => item.kind === "image"))).catch(() => setImageResources([])); }, []);
  useEffect(() => {
    let cancelled = false;
    const urls: Record<string, string> = {};
    void Promise.all(imageResources.map(async (resource) => {
      const blob = await getResourceBlob(resource.id).catch(() => null);
      if (blob) urls[resource.id] = URL.createObjectURL(blob);
    })).then(() => { if (cancelled) Object.values(urls).forEach((url) => URL.revokeObjectURL(url)); else setPortraitUrls(urls); });
    return () => { cancelled = true; Object.values(urls).forEach((url) => URL.revokeObjectURL(url)); };
  }, [imageResources]);
  const selected = characters.find((character) => character.id === selectedId) ?? null;
  const allTags = useMemo(() => [...new Set(characters.flatMap((character) => character.tags))].sort(), [characters]);
  const filtered = characters.filter((character) => [character.name, character.subtitle, character.description, ...character.tags].join(" ").toLowerCase().includes(query.toLowerCase()));

  function persist(next: CharacterRecord[]) { setCharacters(next); saveCharacters(next); }
  function openCharacter(character: CharacterRecord) {
    setSelectedId(character.id);
    setDraft({
      ...createEmptyCharacterDraft(),
      ...character,
      name: character.name ?? "",
      subtitle: character.subtitle ?? "",
      description: character.description ?? "",
      initials: character.initials ?? "",
      accent: character.accent ?? "#b4befe",
      portraitResourceId: character.portraitResourceId ?? null,
      portraitFit: "contain",
      portraitPositionX: character.portraitPositionX ?? 50,
      portraitPositionY: character.portraitPositionY ?? 50,
      portraitZoom: character.portraitZoom ?? 100,
      tags: Array.isArray(character.tags) ? character.tags : [],
      deityOf: character.deityOf ?? "",
      age: character.age ?? "",
      species: character.species ?? "",
      gender: character.gender ?? "",
      sexuality: character.sexuality ?? "",
      abilities: character.abilities ?? [],
      personality: character.personality ?? "",
      likes: character.likes ?? [],
      dislikes: character.dislikes ?? [],
      hobbies: character.hobbies ?? [],
      fears: character.fears ?? [],
      knowledge: character.knowledge ?? [],
      associatedColor: character.associatedColor ?? "#b4befe",
      height: character.height ?? "",
      bodyType: character.bodyType ?? "",
      birthmarks: character.birthmarks ?? [],
      scars: character.scars ?? [],
      bodyArt: character.bodyArt ?? [],
      eyeColor: character.eyeColor ?? "",
      hairColor: character.hairColor ?? "",
      hairstyles: character.hairstyles ?? [],
      facialHair: character.facialHair ?? "",
      piercings: character.piercings ?? [],
      clothingStyles: character.clothingStyles ?? [],
      weapons: character.weapons ?? [],
      diseases: character.diseases ?? [],
      mentalDisorders: character.mentalDisorders ?? [],
      physicalDisorders: character.physicalDisorders ?? [],
      allergies: character.allergies ?? [],
      relationships: Array.isArray(character.relationships) ? character.relationships.map((relationship) => ({ id: relationship.id || crypto.randomUUID(), kind: relationship.kind ?? "Other", characterId: relationship.characterId ?? null, characterName: relationship.characterName ?? "", notes: relationship.notes ?? "" })) : [],
      relationshipStatus: character.relationshipStatus ?? "",
      occupation: character.occupation ?? "",
      residence: character.residence ?? "",
      biography: character.biography ?? "",
    });
    setIsCreating(false);
  }
  function startCreate() { setSelectedId(null); setDraft(createEmptyCharacterDraft()); setIsCreating(true); }
  function save() {
    if (!draft.name.trim()) return;
    if (isCreating) {
      const next = [...characters, makeCharacterRecord(draft)];
      persist(next);
      setSelectedId(next[next.length - 1].id);
      setIsCreating(false);
    } else if (selected) {
      persist(characters.map((character) => character.id === selected.id ? makeCharacterRecord(draft, character) : character));
    }
  }
  function removeSelected() {
    if (!selected) return;
    const next = characters.filter((character) => character.id !== selected.id);
    persist(next); setSelectedId(null); setDraft(createEmptyCharacterDraft());
  }

  return <div className="library-overlay">
    <header className="library-topbar">
      <button className="library-back" onClick={onClose} type="button"><ArrowLeft size={16} /> Back to Workspace</button>
      <div className="library-brand"><strong>Characters</strong></div>
      <button className="library-close" onClick={onClose} type="button" aria-label="Close Characters"><X size={18} /></button>
    </header>
    <main className="characters-layout">
      <div className="characters-view-switch" role="tablist" aria-label="Character views"><button type="button" role="tab" aria-selected={viewMode === "characters"} className={viewMode === "characters" ? "active" : ""} onClick={() => setViewMode("characters")}><LayoutGrid size={15}/> Characters</button><button type="button" role="tab" aria-selected={viewMode === "map"} className={viewMode === "map" ? "active" : ""} onClick={() => setViewMode("map")}><GitFork size={15}/> Relationship Map</button></div>
      {viewMode === "map" ? <RelationshipMap characters={characters} portraitUrls={portraitUrls} onOpenCharacter={(character) => { setViewMode("characters"); openCharacter(character); }} /> : <section className="characters-library">
        <div className="library-eyebrow">GLOBAL ATELIER · {characters.length.toString().padStart(2, "0")} CHARACTERS</div>
        <div className="library-heading-row"><div><h1>Characters</h1><p>A cast of characters, ready for any story.</p></div><button className="library-primary" type="button" onClick={startCreate}><Plus size={16} /> New character</button></div>
        <label className="library-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search names, descriptions and tags…" /></label>
        {allTags.length > 0 && <div className="library-tag-suggestions"><Tag size={13} />{allTags.slice(0, 8).map((tag) => <button type="button" key={tag} onClick={() => setQuery(tag)}>{tag}</button>)}</div>}
        {filtered.length === 0 ? <div className="library-empty"><div className="library-empty-mark">✦</div><h2>{query ? "No matching characters" : "Your cast begins here"}</h2><p>{query ? "Try another name or tag." : "Create your first character and build a cast you can reuse across every Roleplay Space."}</p>{!query && <button type="button" className="library-primary" onClick={startCreate}><Plus size={16} /> Create a character</button>}</div> :
          <div className="character-grid">{filtered.map((character) => <button type="button" key={character.id} className={`character-card ${selectedId === character.id ? "is-selected" : ""}`} style={{ "--character-accent": characterAccentColor(character.accent) } as React.CSSProperties} onClick={() => openCharacter(character)}>
            <div className="character-card-art"><CharacterPortraitArt initials={character.initials || character.name.slice(0, 2).toUpperCase()} imageSrc={character.portraitResourceId ? portraitUrls[character.portraitResourceId] : null} alt={character.name} fit="contain" positionX={character.portraitPositionX ?? 50} positionY={character.portraitPositionY ?? 50} zoom={character.portraitZoom ?? 100} fadeEdges /><small>CHARACTER FILE</small></div>
            <div className="character-card-copy"><strong>{character.name}</strong><span>{character.subtitle || "Character profile"}</span><div className="character-card-tags">{character.tags.slice(0, 3).map((tag) => <i key={tag}>{tag}</i>)}</div></div>
          </button>)}</div>}
      </section>}
      {viewMode === "characters" && (selected || isCreating) && <CharacterEditorModal
        draft={draft}
        setDraft={setDraft}
        characters={characters}
        selected={selected}
        isCreating={isCreating}
        imageResources={imageResources}
        portraitUrls={portraitUrls}
        onClose={() => { setSelectedId(null); setIsCreating(false); }}
        onSave={save}
        onDelete={removeSelected}
      />}
    </main>
  </div>;
}
