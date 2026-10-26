import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Search, Tag, X, GitFork, LayoutGrid, Sparkles } from "lucide-react";
import { loadCharacters, saveCharacters } from "./characters.storage";
import { characterAccentColor, createEmptyCharacterDraft, makeCharacterRecord, type CharacterDraft, type CharacterRecord } from "./characters.types";
import CharacterEditorModal from "./CharacterEditorModal";
import "./characters.css";
import CharacterPortraitArt from "./CharacterPortraitArt";
import RelationshipMap from "./RelationshipMap";
import ExpressionManager from "./ExpressionManager";
import { getResourceBlob, listResources } from "../resources/resources.storage";
import { getWorkspaceResourceBlob, listWorkspaceResources } from "../resources/workspaceResources.storage";
import { loadWorkspaceCharacters, loadWorkspaceRelationshipKinds, saveWorkspaceCharacters, saveWorkspaceRelationshipKinds } from "./workspaceCharacters.storage";
import type { ResourceRecord } from "../resources/resources.types";

type Props = { onClose: () => void; workspacePath?: string | null };

export default function CharactersPage({ onClose, workspacePath }: Props) {
  const [characters, setCharacters] = useState<CharacterRecord[]>(loadCharacters);
  const [storageError, setStorageError] = useState("");
  const [storageLoading, setStorageLoading] = useState(Boolean(workspacePath));
  const [relationshipKinds, setRelationshipKinds] = useState<string[]>(["Mother", "Father", "Sibling", "Partner", "Close friend", "Enemy", "Other"]);
  const [imageResources, setImageResources] = useState<ResourceRecord[]>([]);
  const [portraitUrls, setPortraitUrls] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "name-asc" | "name-desc" | "updated">("newest");
  const [draft, setDraft] = useState<CharacterDraft>(createEmptyCharacterDraft());
  const [isCreating, setIsCreating] = useState(false);
  const [viewMode, setViewMode] = useState<"characters" | "expressions" | "map">("characters");
  useEffect(() => {
    let cancelled = false;
    setStorageLoading(Boolean(workspacePath));
    setStorageError("");
    if (!workspacePath) {
      setCharacters(loadCharacters());
      setStorageLoading(false);
      void listResources().then((items) => { if (!cancelled) setImageResources(items.filter((item) => item.kind === "image")); }).catch(() => { if (!cancelled) setImageResources([]); });
      return () => { cancelled = true; };
    }
    void Promise.all([
      loadWorkspaceCharacters(workspacePath),
      listWorkspaceResources(workspacePath),
      loadWorkspaceRelationshipKinds(workspacePath),
    ]).then(async ([loadedCharacters, resources, kinds]) => {
      if (cancelled) return;
      setCharacters(loadedCharacters);
      setImageResources(resources.filter((item) => item.kind === "image"));
      if (kinds !== null) setRelationshipKinds(kinds);
      if (kinds === null) {
        let legacyKinds: string[] = [];
        try {
          const parsed: unknown = JSON.parse(localStorage.getItem("brd.relationship-kinds.v2") ?? "[]");
          if (Array.isArray(parsed)) legacyKinds = parsed.filter((item): item is string => typeof item === "string");
        } catch { /* Ignore malformed legacy preferences; the workspace starts with no custom types. */ }
        const initialKinds = legacyKinds.length ? legacyKinds : ["Mother", "Father", "Sibling", "Partner", "Close friend", "Enemy", "Other"];
        setRelationshipKinds(initialKinds);
        if (legacyKinds.length) await saveWorkspaceRelationshipKinds(workspacePath, legacyKinds);
      }
    }).catch((reason) => { if (!cancelled) setStorageError(reason instanceof Error ? reason.message : String(reason)); })
      .finally(() => { if (!cancelled) setStorageLoading(false); });
    return () => { cancelled = true; };
  }, [workspacePath]);
  useEffect(() => {
    let cancelled = false;
    const urls: Record<string, string> = {};
    void Promise.all(imageResources.map(async (resource) => {
      const blob = await (workspacePath ? getWorkspaceResourceBlob(workspacePath, resource.id) : getResourceBlob(resource.id)).catch(() => null);
      if (blob) urls[resource.id] = URL.createObjectURL(blob);
    })).then(() => { if (cancelled) Object.values(urls).forEach((url) => URL.revokeObjectURL(url)); else setPortraitUrls(urls); });
    return () => { cancelled = true; Object.values(urls).forEach((url) => URL.revokeObjectURL(url)); };
  }, [imageResources, workspacePath]);
  const selected = characters.find((character) => character.id === selectedId) ?? null;
  const allTags = useMemo(() => [...new Set(characters.flatMap((character) => character.tags))].sort(), [characters]);
  const filtered = characters.filter((character) => [character.name, character.subtitle, character.description, ...character.tags].join(" ").toLowerCase().includes(query.toLowerCase())).slice().sort((a, b) => {
    if (sortOrder === "name-asc") return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    if (sortOrder === "name-desc") return b.name.localeCompare(a.name, undefined, { sensitivity: "base" });
    if (sortOrder === "oldest") return Date.parse(a.createdAt || "") - Date.parse(b.createdAt || "");
    if (sortOrder === "updated") return Date.parse(b.updatedAt || b.createdAt || "") - Date.parse(a.updatedAt || a.createdAt || "");
    return Date.parse(b.createdAt || "") - Date.parse(a.createdAt || "");
  });

  function persist(next: CharacterRecord[]) {
    setCharacters(next);
    if (workspacePath) {
      void saveWorkspaceCharacters(workspacePath, next).then(() => setStorageError("")).catch((reason) => setStorageError(reason instanceof Error ? reason.message : String(reason)));
    } else {
      saveCharacters(next);
    }
  }
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
  function save(reciprocalRelationshipIds: string[] = []) {
    if (!draft.name.trim()) return;
    const sourceRecord = isCreating
      ? makeCharacterRecord(draft)
      : selected ? makeCharacterRecord(draft, selected) : null;
    if (!sourceRecord) return;
    let next = isCreating
      ? [...characters, sourceRecord]
      : characters.map((character) => character.id === sourceRecord.id ? sourceRecord : character);

    for (const relationship of draft.relationships) {
      if (!reciprocalRelationshipIds.includes(relationship.id) || !relationship.characterId) continue;
      const target = next.find((character) => character.id === relationship.characterId);
      if (!target || target.id === sourceRecord.id) continue;
      const alreadyLinked = target.relationships.some((item) => item.characterId === sourceRecord.id && item.kind === relationship.kind);
      if (alreadyLinked) continue;
      const updatedTarget = makeCharacterRecord({
        ...target,
        relationships: [...target.relationships, {
          id: crypto.randomUUID(),
          kind: relationship.kind,
          characterId: sourceRecord.id,
          characterName: sourceRecord.name,
          notes: "",
        }],
      }, target);
      next = next.map((character) => character.id === target.id ? updatedTarget : character);
    }

    persist(next);
    if (isCreating) setSelectedId(sourceRecord.id);
    setIsCreating(false);
  }
  function updateRelationshipKinds(nextKinds: string[], renames: { from: string; to: string }[]) {
    if (workspacePath) {
      void saveWorkspaceRelationshipKinds(workspacePath, nextKinds).then(() => setStorageError("")).catch((reason) => setStorageError(reason instanceof Error ? reason.message : String(reason)));
    } else {
      localStorage.setItem("brd.relationship-kinds.v2", JSON.stringify(nextKinds));
    }
    if (!renames.length) return;
    const renameMap = new Map(renames.map(({ from, to }) => [from, to]));
    const next = characters.map((character) => {
      const relationships = character.relationships.map((relationship) => ({
        ...relationship,
        kind: renameMap.get(relationship.kind) ?? relationship.kind,
      }));
      return relationships.some((relationship, index) => relationship.kind !== character.relationships[index]?.kind)
        ? makeCharacterRecord({ ...character, relationships }, character)
        : character;
    });
    persist(next);
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
      <div className="characters-view-switch" role="tablist" aria-label="Character views"><button type="button" role="tab" aria-selected={viewMode === "characters"} className={viewMode === "characters" ? "active" : ""} onClick={() => setViewMode("characters")}><LayoutGrid size={15}/> Characters</button><button type="button" role="tab" aria-selected={viewMode === "expressions"} className={viewMode === "expressions" ? "active" : ""} onClick={() => setViewMode("expressions")}><Sparkles size={15}/> Character Expressions</button><button type="button" role="tab" aria-selected={viewMode === "map"} className={viewMode === "map" ? "active" : ""} onClick={() => setViewMode("map")}><GitFork size={15}/> Mental Map</button></div>
      {storageLoading ? <section className="characters-library"><div className="library-empty"><h2>Loading characters…</h2><p>Reading this workspace’s character library.</p></div></section> : viewMode === "map" ? <RelationshipMap characters={characters} portraitUrls={portraitUrls} imageResources={imageResources} onOpenCharacter={(character) => { setViewMode("characters"); openCharacter(character); }} /> : viewMode === "expressions" ? <div className="characters-expressions-view"><ExpressionManager characters={characters} onClose={() => setViewMode("characters")} /></div> : <section className="characters-library">
        <div className="library-eyebrow">{workspacePath ? "WORKSPACE CAST" : "GLOBAL ATELIER"} · {characters.length.toString().padStart(2, "0")} CHARACTERS</div>
        {storageLoading && <p role="status">Loading workspace characters…</p>}
        {storageError && <p className="resource-error" role="alert">{storageError}</p>}
        <div className="library-heading-row"><div><h1>Characters</h1><p>A cast of characters, ready for any story.</p></div><button className="library-primary" type="button" onClick={startCreate}><Plus size={16} /> New character</button></div>
        <div className="character-library-tools"><label className="library-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search names, descriptions and tags…" /></label><label className="character-sort-control"><span>Sort by</span><select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)}><option value="newest">Recently created</option><option value="oldest">Oldest first</option><option value="name-asc">Name A–Z</option><option value="name-desc">Name Z–A</option><option value="updated">Recently updated</option></select></label></div>
        {allTags.length > 0 && <div className="library-tag-suggestions"><Tag size={13} />{allTags.slice(0, 8).map((tag) => <button type="button" key={tag} onClick={() => setQuery(tag)}>{tag}</button>)}</div>}
        {filtered.length === 0 ? <div className="library-empty"><div className="library-empty-mark">✦</div><h2>{query ? "No matching characters" : "Your cast begins here"}</h2><p>{query ? "Try another name or tag." : "Create your first character and build a cast you can reuse across every Roleplay Space."}</p>{!query && <button type="button" className="library-primary" onClick={startCreate}><Plus size={16} /> Create a character</button>}</div> :
          <div className="character-grid">{filtered.map((character) => <button type="button" key={character.id} className={`character-card ${selectedId === character.id ? "is-selected" : ""}`} style={{ "--character-accent": characterAccentColor(character.accent) } as React.CSSProperties} onClick={() => openCharacter(character)}>
            <div className="character-card-art"><CharacterPortraitArt initials={character.initials || character.name.slice(0, 2).toUpperCase()} imageSrc={character.portraitResourceId ? portraitUrls[character.portraitResourceId] : null} alt={character.name} fit="contain" positionX={character.portraitPositionX ?? 50} positionY={character.portraitPositionY ?? 50} zoom={character.portraitZoom ?? 100} fadeEdges /><small>CHARACTER FILE</small></div>
            <div className="character-card-copy"><strong>{character.name}</strong><span className={character.subtitle ? "" : "is-empty"}>{character.subtitle || "\u00a0"}</span><div className="character-card-tags">{character.tags.slice(0, 3).map((tag) => <i key={tag}>{tag}</i>)}</div></div>
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
        onRelationshipKindsChanged={updateRelationshipKinds}
        relationshipKinds={relationshipKinds}
        workspaceScoped={Boolean(workspacePath)}
        onDelete={removeSelected}
      />}
    </main>
  </div>;
}
