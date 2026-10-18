import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Search, Tag, Trash2, X } from "lucide-react";
import { loadCharacters, saveCharacters } from "./characters.storage";
import { makeCharacterRecord, type CharacterDraft, type CharacterRecord } from "./characters.types";
import "./characters.css";
import CharacterPortraitArt from "./CharacterPortraitArt";
import { getResourceBlob, listResources } from "../resources/resources.storage";
import type { ResourceRecord } from "../resources/resources.types";

type Props = { onClose: () => void };

const emptyDraft: CharacterDraft = {
  name: "",
  subtitle: "",
  description: "",
  initials: "",
  accent: "lavender",
  portraitResourceId: null,
  portraitFit: "contain",
  portraitPositionX: 50,
  portraitPositionY: 50,
  portraitZoom: 100,
  tags: [],
};

export default function CharactersPage({ onClose }: Props) {
  const [characters, setCharacters] = useState<CharacterRecord[]>(loadCharacters);
  const [imageResources, setImageResources] = useState<ResourceRecord[]>([]);
  const [portraitUrls, setPortraitUrls] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [draft, setDraft] = useState<CharacterDraft>(emptyDraft);
  const [isCreating, setIsCreating] = useState(false);
  const [portraitAdjustOpen, setPortraitAdjustOpen] = useState(false);
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
    setDraft({ name: character.name, subtitle: character.subtitle, description: character.description, initials: character.initials, accent: character.accent, portraitResourceId: character.portraitResourceId, portraitFit: character.portraitFit ?? "contain", portraitPositionX: character.portraitPositionX ?? 50, portraitPositionY: character.portraitPositionY ?? 50, portraitZoom: character.portraitZoom ?? 100, tags: character.tags });
    setIsCreating(false);
  }
  function startCreate() { setSelectedId(null); setDraft(emptyDraft); setTagDraft(""); setIsCreating(true); }
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
  function addTag() {
    const tag = tagDraft.trim();
    if (tag && !draft.tags.some((item) => item.toLowerCase() === tag.toLowerCase())) setDraft({ ...draft, tags: [...draft.tags, tag] });
    setTagDraft("");
  }
  function removeSelected() {
    if (!selected) return;
    const next = characters.filter((character) => character.id !== selected.id);
    persist(next); setSelectedId(null); setDraft(emptyDraft);
  }

  return <div className="library-overlay">
    <header className="library-topbar">
      <button className="library-back" onClick={onClose} type="button"><ArrowLeft size={16} /> Back to Workspace</button>
      <div className="library-brand"><span>BOREALIS</span><strong>Characters</strong></div>
      <button className="library-close" onClick={onClose} type="button" aria-label="Close Characters"><X size={18} /></button>
    </header>
    <main className="characters-layout">
      <section className="characters-library">
        <div className="library-eyebrow">GLOBAL LIBRARY · {characters.length.toString().padStart(2, "0")} FILES</div>
        <div className="library-heading-row"><div><h1>Characters</h1><p>A cast of characters, ready for any story.</p></div><button className="library-primary" type="button" onClick={startCreate}><Plus size={16} /> New character</button></div>
        <label className="library-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search names, descriptions and tags…" /></label>
        {allTags.length > 0 && <div className="library-tag-suggestions"><Tag size={13} />{allTags.slice(0, 8).map((tag) => <button type="button" key={tag} onClick={() => setQuery(tag)}>{tag}</button>)}</div>}
        {filtered.length === 0 ? <div className="library-empty"><div className="library-empty-mark">✦</div><h2>{query ? "No matching characters" : "Your cast begins here"}</h2><p>{query ? "Try another name or tag." : "Create your first character and build a cast you can reuse across every Roleplay Space."}</p>{!query && <button type="button" className="library-primary" onClick={startCreate}><Plus size={16} /> Create a character</button>}</div> :
          <div className="character-grid">{filtered.map((character) => <button type="button" key={character.id} className={`character-card accent-${character.accent} ${selectedId === character.id ? "is-selected" : ""}`} onClick={() => openCharacter(character)}>
            <div className="character-card-art"><CharacterPortraitArt initials={character.initials || character.name.slice(0, 2).toUpperCase()} imageSrc={character.portraitResourceId ? portraitUrls[character.portraitResourceId] : null} alt={character.name} fit={character.portraitFit ?? "contain"} positionX={character.portraitPositionX ?? 50} positionY={character.portraitPositionY ?? 50} zoom={character.portraitZoom ?? 100} /><small>BRD · CHARACTER FILE</small></div>
            <div className="character-card-copy"><strong>{character.name}</strong><span>{character.subtitle || "Character profile"}</span><div className="character-card-tags">{character.tags.slice(0, 3).map((tag) => <i key={tag}>{tag}</i>)}</div></div>
          </button>)}</div>}
      </section>
      {(selected || isCreating) && <aside className="character-editor">
        <div className="character-editor-top"><span>{isCreating ? "NEW CHARACTER" : "CHARACTER PROFILE"}</span><button type="button" onClick={() => { setSelectedId(null); setIsCreating(false); }} aria-label="Close editor"><X size={16} /></button></div>
        <button type="button" className={`character-editor-portrait accent-${draft.accent}`} onClick={() => draft.portraitResourceId && setPortraitAdjustOpen(true)} aria-label="Adjust portrait image" title={draft.portraitResourceId ? "Click to adjust portrait image" : "Choose a portrait image first"}><CharacterPortraitArt initials={draft.initials.trim() || draft.name.slice(0, 2).toUpperCase() || "✦"} imageSrc={draft.portraitResourceId ? portraitUrls[draft.portraitResourceId] : null} alt={draft.name} fit={draft.portraitFit} positionX={draft.portraitPositionX} positionY={draft.portraitPositionY} zoom={draft.portraitZoom} /><small>{draft.portraitResourceId ? "CLICK TO ADJUST" : "PORTRAIT PREVIEW"}</small></button>
        <label className="character-field"><span>Character name *</span><input autoFocus value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value, initials: draft.initials || event.target.value.slice(0, 2).toUpperCase() })} placeholder="e.g. Keira" /><small className="character-field-hint">“You” is reserved for your personal profile.</small></label>
        <label className="character-field"><span>Subtitle</span><input value={draft.subtitle} onChange={(event) => setDraft({ ...draft, subtitle: event.target.value })} placeholder="Story · Role" /></label>
        <label className="character-field"><span>Initials</span><input maxLength={3} value={draft.initials} onChange={(event) => setDraft({ ...draft, initials: event.target.value.toUpperCase() })} placeholder="KR" /></label>
        <label className="character-field"><span>Portrait image</span><select value={draft.portraitResourceId ?? ""} onChange={(event) => setDraft({ ...draft, portraitResourceId: event.target.value || null })}><option value="">Use initials</option>{imageResources.map((resource) => <option key={resource.id} value={resource.id}>{resource.name}</option>)}</select>{imageResources.length === 0 && <small className="character-field-hint">Import images in Resources to use them as portraits.</small>}</label>
        <label className="character-field"><span>Accent</span><select value={draft.accent} onChange={(event) => setDraft({ ...draft, accent: event.target.value as CharacterDraft["accent"] })}><option value="lavender">Lavender</option><option value="blue">Blue</option><option value="pink">Pink</option><option value="green">Green</option></select></label>
        <label className="character-field"><span>Description</span><textarea rows={4} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Who are they? What should you remember?" /></label>
        <div className="character-field"><span>Tags</span><div className="character-tag-input"><input value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTag(); } }} placeholder="Add a tag…" /><button type="button" onClick={addTag}><Plus size={14} /></button></div><div className="character-edit-tags">{draft.tags.map((tag) => <button type="button" key={tag} onClick={() => setDraft({ ...draft, tags: draft.tags.filter((item) => item !== tag) })}>{tag}<X size={11} /></button>)}</div></div>
        <div className="character-editor-actions">{selected && <button type="button" className="library-danger" onClick={removeSelected}><Trash2 size={14} /> Delete</button>}<button type="button" className="library-primary" onClick={save} disabled={!draft.name.trim() || draft.name.trim().toLocaleLowerCase() === "you"}>{isCreating ? "Create character" : "Save changes"}</button></div>
      </aside>}
      {portraitAdjustOpen && draft.portraitResourceId && <div className="portrait-adjust-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPortraitAdjustOpen(false); }}>
        <section className="portrait-adjust-modal" role="dialog" aria-modal="true" aria-labelledby="portrait-adjust-title">
          <div className="portrait-adjust-heading"><div><span>CHARACTER PORTRAIT</span><h2 id="portrait-adjust-title">Adjust image</h2><p>Use the sliders to position and zoom the image. Your original file stays untouched.</p></div><button type="button" onClick={() => setPortraitAdjustOpen(false)} aria-label="Close portrait adjustment"><X size={18} /></button></div>
          <div className={`portrait-adjust-preview accent-${draft.accent}`}><CharacterPortraitArt initials={draft.initials || "✦"} imageSrc={portraitUrls[draft.portraitResourceId] ?? null} alt={draft.name} fit={draft.portraitFit} positionX={draft.portraitPositionX} positionY={draft.portraitPositionY} zoom={draft.portraitZoom} /></div>
          <div className="portrait-framing-controls">
            <label className="profile-framing-control">Horizontal <span>{draft.portraitPositionX}%</span><input type="range" min="0" max="100" step="1" value={draft.portraitPositionX} onChange={(event) => setDraft({ ...draft, portraitPositionX: Number(event.target.value) })} /></label>
            <label className="profile-framing-control">Vertical <span>{draft.portraitPositionY}%</span><input type="range" min="0" max="100" step="1" value={draft.portraitPositionY} onChange={(event) => setDraft({ ...draft, portraitPositionY: Number(event.target.value) })} /></label>
            <label className="profile-framing-control">Zoom <span>{draft.portraitZoom}%</span><input type="range" min="50" max="200" step="1" value={draft.portraitZoom} onChange={(event) => setDraft({ ...draft, portraitZoom: Number(event.target.value) })} /></label>
          </div>
          <div className="portrait-adjust-actions"><button type="button" className="library-primary" onClick={() => setPortraitAdjustOpen(false)}>Done</button></div>
        </section>
      </div>}
    </main>
  </div>;
}
