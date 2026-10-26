import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { BookOpen, Brain, Check, ChevronRight, HeartPulse, Link2, Pencil, Plus, Quote, ScanFace, SlidersHorizontal, Trash2, UserRound, UsersRound, X, MoreHorizontal } from "lucide-react";
import CharacterPortraitArt from "./CharacterPortraitArt";
import RelationshipTypeManagerModal from "./RelationshipTypeManagerModal";
import { characterAccentColor, type CharacterDraft, type CharacterRecord, type CharacterRelationship, type RelationshipKind } from "./characters.types";
import type { ResourceRecord } from "../resources/resources.types";

type Props = {
  draft: CharacterDraft;
  setDraft: (draft: CharacterDraft) => void;
  characters: CharacterRecord[];
  selected: CharacterRecord | null;
  isCreating: boolean;
  imageResources: ResourceRecord[];
  portraitUrls: Record<string, string>;
  onClose: () => void;
  onSave: (reciprocalRelationshipIds: string[]) => void;
  onRelationshipKindsChanged: (nextKinds: RelationshipKind[], renames: { from: string; to: string }[]) => void;
  relationshipKinds?: RelationshipKind[];
  workspaceScoped?: boolean;
  onDelete: () => void;
};

const defaultRelationshipKinds: RelationshipKind[] = ["Mother", "Father", "Sibling", "Partner", "Close friend", "Enemy", "Other"];
const RELATIONSHIP_KINDS_KEY = "brd.relationship-kinds.v2";
const LEGACY_RELATIONSHIP_KINDS_KEY = "brd.relationship-kinds.v1";

function loadRelationshipKinds(): RelationshipKind[] {
  try {
    const current = localStorage.getItem(RELATIONSHIP_KINDS_KEY);
    if (current !== null) { const saved = JSON.parse(current); return Array.isArray(saved) ? [...new Set(saved.filter((item): item is string => typeof item === "string"))] : [...defaultRelationshipKinds]; }
    const legacy = JSON.parse(localStorage.getItem(LEGACY_RELATIONSHIP_KINDS_KEY) ?? "[]");
    return [...new Set([...defaultRelationshipKinds, ...(Array.isArray(legacy) ? legacy.filter((item): item is string => typeof item === "string") : [])])];
  } catch { return defaultRelationshipKinds; }
}

function TextField({ label, value, onChange, placeholder, type = "text", hint }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; hint?: string }) {
  return <label className="studio-field"><span>{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />{hint && <small>{hint}</small>}</label>;
}

function TextAreaField({ label, value, onChange, placeholder, rows = 4 }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; rows?: number }) {
  return <label className="studio-field"><span>{label}</span><textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

function ListField({ label, values, onChange, placeholder = "Add an entry…" }: { label: string; values: string[]; onChange: (values: string[]) => void; placeholder?: string }) {
  const [value, setValue] = useState("");
  function add() {
    const next = value.trim();
    if (next && !values.some((item) => item.toLocaleLowerCase() === next.toLocaleLowerCase())) onChange([...values, next]);
    setValue("");
  }
  return <div className="studio-field studio-list-field">
    <span>{label}</span>
    <div className="studio-list-add"><input value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); add(); } }} placeholder={placeholder} /><button type="button" onClick={add} aria-label={"Add " + label.toLowerCase()}><Plus size={15} /></button></div>
    {values.length > 0 && <div className="studio-chips">{values.map((item, index) => <span className="studio-chip" key={item + "-" + index}>{item}<button type="button" onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))} aria-label={"Remove " + item}><X size={12} /></button></span>)}</div>}
  </div>;
}

function SectionHeading({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return <div className="studio-section-heading"><div className="studio-section-icon">{icon}</div><div><h2>{title}</h2><p>{description}</p></div></div>;
}

export default function CharacterEditorModal({ draft, setDraft, characters, selected, isCreating, imageResources, portraitUrls, onClose, onSave, onRelationshipKindsChanged, relationshipKinds: suppliedRelationshipKinds, workspaceScoped = false, onDelete }: Props) {
  const [portraitAdjustOpen, setPortraitAdjustOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(isCreating);
  const [originalDraft, setOriginalDraft] = useState<CharacterDraft | null>(null);
  const [relationshipKinds, setRelationshipKinds] = useState<RelationshipKind[]>(suppliedRelationshipKinds ?? loadRelationshipKinds);
  const [relationshipTypeManagerOpen, setRelationshipTypeManagerOpen] = useState(false);
  const [reciprocalPromptOpen, setReciprocalPromptOpen] = useState(false);
  const [deleteConfirmationStep, setDeleteConfirmationStep] = useState<0 | 1 | 2>(0);
  const [reciprocalIds, setReciprocalIds] = useState<string[]>([]);
  const patch = (changes: Partial<CharacterDraft>) => setDraft({ ...draft, ...changes });
  const portraitUrl = draft.portraitResourceId ? portraitUrls[draft.portraitResourceId] ?? null : null;
  const pendingReciprocalRelationships = draft.relationships.filter((relationship) => relationship.characterId && !selected?.relationships.some((existing) => existing.id === relationship.id && existing.characterId === relationship.characterId) && characters.some((character) => character.id === relationship.characterId && character.id !== selected?.id));

  useEffect(() => {
    if (suppliedRelationshipKinds) setRelationshipKinds(suppliedRelationshipKinds);
  }, [suppliedRelationshipKinds]);

  useEffect(() => {
    if (!workspaceScoped) localStorage.setItem(RELATIONSHIP_KINDS_KEY, JSON.stringify(relationshipKinds));
  }, [relationshipKinds, workspaceScoped]);

  function saveRelationshipKinds(nextKinds: RelationshipKind[], renames: { from: string; to: string }[]) {
    setRelationshipKinds(nextKinds);
    if (renames.length) {
      const renameMap = new Map(renames.map(({ from, to }) => [from, to]));
      patch({ relationships: draft.relationships.map((relationship) => ({ ...relationship, kind: renameMap.get(relationship.kind) ?? relationship.kind })) });
      onRelationshipKindsChanged(nextKinds, renames);
    } else {
      onRelationshipKindsChanged(nextKinds, []);
    }
    setRelationshipTypeManagerOpen(false);
  }

  function requestSave() {
    const linked = pendingReciprocalRelationships;
    if (linked.length) {
      setReciprocalIds(linked.map((relationship) => relationship.id));
      setReciprocalPromptOpen(true);
      return;
    }
    onSave([]);
    setIsEditing(false);
    setOriginalDraft(null);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (reciprocalPromptOpen) setReciprocalPromptOpen(false);
        else if (portraitAdjustOpen) setPortraitAdjustOpen(false);
        else onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, portraitAdjustOpen, reciprocalPromptOpen]);

  useEffect(() => { const openManager = () => setRelationshipTypeManagerOpen(true); window.addEventListener("brd:open-relationship-type-manager", openManager); return () => window.removeEventListener("brd:open-relationship-type-manager", openManager); }, []);

  function addRelationship() {
    const relationship: CharacterRelationship = { id: crypto.randomUUID(), kind: relationshipKinds.includes("Other") ? "Other" : relationshipKinds[0] ?? "Other", characterId: null, characterName: "", notes: "" };
    patch({ relationships: [...draft.relationships, relationship] });
  }
  function updateRelationship(id: string, changes: Partial<CharacterRelationship>) {
    patch({ relationships: draft.relationships.map((relationship) => relationship.id === id ? { ...relationship, ...changes } : relationship) });
  }
  function removeRelationship(id: string) {
    patch({ relationships: draft.relationships.filter((relationship) => relationship.id !== id) });
  }

  return createPortal(<div className="character-modal-backdrop">
    <section className="character-studio-modal" role="dialog" aria-modal="true" aria-labelledby="character-studio-title">
      <header className="studio-header">
        <div className="studio-header-brand"><div className="studio-brand-mark">✦</div><div><span>BOREALIS ROLEPLAY DEN</span><h1 id="character-studio-title">{isCreating ? "Create character" : isEditing ? "Edit character" : "Character profile"}</h1></div></div>
        <button className="studio-icon-button" type="button" onClick={onClose} aria-label="Close character editor"><X size={19} /></button>
      </header>

      <div className={`studio-scroll ${!isEditing ? "is-readonly" : ""}`}>
        <section className="studio-cover">
          <div className="studio-portrait-column">
            <button type="button" className="studio-portrait" style={{ "--character-accent": characterAccentColor(draft.accent) } as CSSProperties} onClick={() => draft.portraitResourceId && setPortraitAdjustOpen(true)} title={draft.portraitResourceId ? "Adjust portrait framing" : "Choose a portrait image below"}>
              <CharacterPortraitArt initials={draft.initials.trim() || draft.name.slice(0, 2).toUpperCase() || "✦"} imageSrc={portraitUrl} alt={draft.name} fit="contain" positionX={draft.portraitPositionX} positionY={draft.portraitPositionY} zoom={draft.portraitZoom} />
              <span className="studio-portrait-overlay"><SlidersHorizontal size={14} /> {draft.portraitResourceId ? "Adjust framing" : "Portrait preview"}</span>
            </button>
            <label className="studio-field studio-portrait-select"><span>Portrait image</span><select value={draft.portraitResourceId ?? ""} onChange={(event) => patch({ portraitResourceId: event.target.value || null })}><option value="">Use initials</option>{imageResources.map((resource) => <option key={resource.id} value={resource.id}>{resource.name}</option>)}</select>{imageResources.length === 0 && <small>Import images in Resources to use them here.</small>}</label>
            <label className="studio-field studio-accent-field"><span>Character accent</span><div className="studio-colour-control"><input type="color" value={characterAccentColor(draft.accent)} onChange={(event) => patch({ accent: event.target.value })} aria-label="Choose character accent colour" /><code>{characterAccentColor(draft.accent).toUpperCase()}</code></div></label>
          </div>
          <div className="studio-identity">
            <span className="studio-kicker">CHARACTER IDENTITY</span>
            <label className="studio-field studio-name-field"><span>Character name <b>*</b></span><input autoFocus value={draft.name} onChange={(event) => patch({ name: event.target.value, initials: draft.initials || event.target.value.slice(0, 2).toUpperCase() })} placeholder="e.g. Keira Voss" /><small>“You” is reserved for your personal profile.</small></label>
            <div className="studio-field-grid">
              <TextField label="Nickname / title" value={draft.subtitle} onChange={(value) => patch({ subtitle: value })} placeholder="The Pale Star" />
              <TextField label="Age" value={draft.age} onChange={(value) => patch({ age: value })} placeholder="Age or age range" />
              <TextField label="Species / ethnicity" value={draft.species} onChange={(value) => patch({ species: value })} placeholder="Human, elf, etc." />
              <TextField label="Gender" value={draft.gender} onChange={(value) => patch({ gender: value })} placeholder="Gender" />
            </div>
            <ListField label="Tags" values={draft.tags} onChange={(tags) => patch({ tags })} placeholder="Add a tag…" />
          </div>
        </section>

        <section className="studio-section">
          <SectionHeading icon={<UserRound size={18} />} title="General Information" description="Titles, identity and defining abilities." />
          <div className="studio-field-grid"><TextField label="Deity of… / titles" value={draft.deityOf} onChange={(deityOf) => patch({ deityOf })} placeholder="Optional" /><TextField label="Sexuality" value={draft.sexuality} onChange={(sexuality) => patch({ sexuality })} placeholder="Sexuality" /></div>
          <ListField label="Abilities" values={draft.abilities} onChange={(abilities) => patch({ abilities })} placeholder="Add an ability…" />
        </section>

        <section className="studio-section">
          <SectionHeading icon={<Brain size={18} />} title="Psychology" description="Personality, preferences, fears and knowledge." />
          <TextAreaField label="General personality" value={draft.personality} onChange={(personality) => patch({ personality })} placeholder="Describe their personality, temperament and inner world…" rows={5} />
          <div className="studio-field-grid">
            <ListField label="Likes" values={draft.likes} onChange={(likes) => patch({ likes })} placeholder="Add something they like…" />
            <ListField label="Dislikes" values={draft.dislikes} onChange={(dislikes) => patch({ dislikes })} placeholder="Add something they dislike…" />
            <ListField label="Hobbies" values={draft.hobbies} onChange={(hobbies) => patch({ hobbies })} placeholder="Add a hobby…" />
            <ListField label="Fears" values={draft.fears} onChange={(fears) => patch({ fears })} placeholder="Add a fear…" />
          </div>
          <ListField label="Knowledge & wisdom" values={draft.knowledge} onChange={(knowledge) => patch({ knowledge })} placeholder="Add knowledge, expertise or wisdom…" />
          <label className="studio-field"><span>Associated colour</span><div className="studio-colour-control"><input type="color" value={draft.associatedColor || "#b4befe"} onChange={(event) => patch({ associatedColor: event.target.value })} aria-label="Choose associated colour" /><code>{(draft.associatedColor || "#b4befe").toUpperCase()}</code></div></label>
        </section>

        <section className="studio-section">
          <SectionHeading icon={<ScanFace size={18} />} title="Physical Description" description="Appearance, distinctive features, style and equipment." />
          <div className="studio-field-grid">
            <TextField label="Height" value={draft.height} onChange={(height) => patch({ height })} placeholder="e.g. 172 cm" />
            <TextField label="Body type" value={draft.bodyType} onChange={(bodyType) => patch({ bodyType })} placeholder="Build / body type" />
            <TextField label="Eye colour" value={draft.eyeColor} onChange={(eyeColor) => patch({ eyeColor })} placeholder="Eye colour" />
            <TextField label="Hair colour" value={draft.hairColor} onChange={(hairColor) => patch({ hairColor })} placeholder="Hair colour" />
            <TextField label="Facial hair" value={draft.facialHair} onChange={(facialHair) => patch({ facialHair })} placeholder="None, beard, etc." />
          </div>
          <div className="studio-subsection"><h3>Distinctive features</h3><div className="studio-field-grid">
            <ListField label="Birthmarks" values={draft.birthmarks} onChange={(birthmarks) => patch({ birthmarks })} placeholder="Add a birthmark…" />
            <ListField label="Scars" values={draft.scars} onChange={(scars) => patch({ scars })} placeholder="Add a scar…" />
            <ListField label="Body art" values={draft.bodyArt} onChange={(bodyArt) => patch({ bodyArt })} placeholder="Add body art…" />
          </div></div>
          <div className="studio-subsection"><h3>Style & equipment</h3><div className="studio-field-grid">
            <ListField label="Hairstyles" values={draft.hairstyles} onChange={(hairstyles) => patch({ hairstyles })} placeholder="Add a hairstyle…" />
            <ListField label="Piercings" values={draft.piercings} onChange={(piercings) => patch({ piercings })} placeholder="Add a piercing…" />
            <ListField label="Clothing styles" values={draft.clothingStyles} onChange={(clothingStyles) => patch({ clothingStyles })} placeholder="Add a style…" />
            <ListField label="Weapons" values={draft.weapons} onChange={(weapons) => patch({ weapons })} placeholder="Add a weapon…" />
          </div></div>
        </section>

        <section className="studio-section">
          <SectionHeading icon={<HeartPulse size={18} />} title="Medical Information" description="Health conditions and allergies, if applicable." />
          <div className="studio-field-grid">
            <ListField label="Diseases" values={draft.diseases} onChange={(diseases) => patch({ diseases })} placeholder="Add a disease…" />
            <ListField label="Mental disorders" values={draft.mentalDisorders} onChange={(mentalDisorders) => patch({ mentalDisorders })} placeholder="Add a condition…" />
            <ListField label="Physical disorders" values={draft.physicalDisorders} onChange={(physicalDisorders) => patch({ physicalDisorders })} placeholder="Add a condition…" />
            <ListField label="Allergies" values={draft.allergies} onChange={(allergies) => patch({ allergies })} placeholder="Add an allergy…" />
          </div>
        </section>

        <section className="studio-section">
          <SectionHeading icon={<UsersRound size={18} />} title="Relationships" description="Connect this character to others in your library using @mentions." />
          <div className="studio-field-grid">
            <TextField label="Relationship status" value={draft.relationshipStatus} onChange={(relationshipStatus) => patch({ relationshipStatus })} placeholder="Single, married, complicated…" />
            <TextField label="Occupation" value={draft.occupation} onChange={(occupation) => patch({ occupation })} placeholder="Occupation" />
            <TextField label="Residence" value={draft.residence} onChange={(residence) => patch({ residence })} placeholder="Where they live" />
          </div>
          <div className="studio-relationships">
            <p className="studio-relationship-types-hint">Use the <MoreHorizontal size={13} /> button beside a relationship type to manage your global list.</p>
            {draft.relationships.map((relationship) => <RelationshipEditor key={relationship.id} relationship={relationship} relationshipKinds={relationshipKinds} characters={characters} currentCharacterId={selected?.id ?? null} onChange={(changes) => updateRelationship(relationship.id, changes)} onRemove={() => removeRelationship(relationship.id)} />)}
            <div className="studio-relationship-actions"><button type="button" className="studio-add-relationship" onClick={addRelationship}><Plus size={15} /> Add relationship</button><button type="button" className="studio-manage-relationship-types studio-manage-relationship-types-secondary" onClick={() => setRelationshipTypeManagerOpen(true)}><MoreHorizontal size={16}/> Manage types</button></div>
          </div>
        </section>

        <section className="studio-section">
          <SectionHeading icon={<BookOpen size={18} />} title="Biography" description="The full story, family history and life events." />
          <TextAreaField label="Biography" value={draft.biography} onChange={(biography) => patch({ biography })} placeholder="Write this character's story…" rows={9} />
        </section>

        <section className="studio-section">
          <SectionHeading icon={<Quote size={18} />} title="Brief Description" description="A short, memorable summary for cards and quick reference." />
          <TextAreaField label="Character summary" value={draft.description} onChange={(description) => patch({ description })} placeholder="A concise description of the character…" rows={4} />
        </section>
      </div>

      <footer className="studio-footer">
        <div className="studio-save-hint">{!isEditing ? <><Check size={14} /> Character profile</> : draft.name.trim() ? <><Check size={14} /> {isCreating ? "Ready to create" : "Changes will be saved to this profile"}</> : "A character name is required"}</div>
        <div className="studio-footer-actions">
          {isEditing && !isCreating && (deleteConfirmationStep === 0 ? <button type="button" className="studio-delete-button" onClick={() => setDeleteConfirmationStep(1)}><Trash2 size={14} /> Delete</button> : deleteConfirmationStep === 1 ? <><span role="alert">Delete “{selected?.name}”? This cannot be undone.</span><button type="button" className="studio-delete-button" onClick={() => setDeleteConfirmationStep(2)}>Continue</button><button type="button" className="studio-cancel-button" onClick={() => setDeleteConfirmationStep(0)}>Cancel</button></> : <><span role="alert">Final confirmation: permanently delete “{selected?.name}” and its character profile?</span><button type="button" className="studio-delete-button" onClick={onDelete}>Yes, delete permanently</button><button type="button" className="studio-cancel-button" onClick={() => setDeleteConfirmationStep(0)}>Cancel</button></>)}
          {!isEditing ? <><button type="button" className="studio-cancel-button" onClick={onClose}>Close</button><button type="button" className="studio-save-button" onClick={() => { setOriginalDraft(draft); setIsEditing(true); }}><Pencil size={14} /> Edit character</button></> :
            <><button type="button" className="studio-cancel-button" onClick={() => { if (isCreating) onClose(); else { if (originalDraft) setDraft(originalDraft); setIsEditing(false); setOriginalDraft(null); } }}>Cancel</button><button type="button" className="studio-save-button" onClick={requestSave} disabled={!draft.name.trim() || draft.name.trim().toLocaleLowerCase() === "you"}>{isCreating ? "Create character" : "Save changes"}</button></>}
        </div>
      </footer>
    </section>

      {relationshipTypeManagerOpen && <RelationshipTypeManagerModal relationshipKinds={relationshipKinds} usageCounts={characters.reduce<Record<string, number>>((counts, character) => { for (const relationship of character.relationships ?? []) counts[relationship.kind] = (counts[relationship.kind] ?? 0) + 1; for (const relationship of draft.relationships ?? []) { if (!selected?.relationships.some((existing) => existing.id === relationship.id)) counts[relationship.kind] = (counts[relationship.kind] ?? 0) + 1; } return counts; }, {})} onClose={() => setRelationshipTypeManagerOpen(false)} onSave={saveRelationshipKinds} />}\n      {reciprocalPromptOpen && <div className="reciprocal-prompt-backdrop"><section className="reciprocal-prompt" role="dialog" aria-modal="true" aria-labelledby="reciprocal-prompt-title"><div className="reciprocal-prompt-kicker">RELATIONSHIP LINKS</div><h2 id="reciprocal-prompt-title">Add these links to the other profiles too?</h2><p>Choose which linked characters should also list this character. Their relationship type will match; you can edit it later.</p><div className="reciprocal-prompt-list">{pendingReciprocalRelationships.map((relationship) => { const target = characters.find((character) => character.id === relationship.characterId); if (!target) return null; return <label key={relationship.id} className="reciprocal-prompt-item"><input type="checkbox" checked={reciprocalIds.includes(relationship.id)} onChange={(event) => setReciprocalIds((current) => event.target.checked ? [...current, relationship.id] : current.filter((id) => id !== relationship.id))}/><span className="reciprocal-prompt-avatar">{target.initials || target.name.slice(0,2).toUpperCase()}</span><span><strong>{target.name}</strong><small>{relationship.kind} · reciprocal link</small></span></label>; })}</div><div className="reciprocal-prompt-actions"><button type="button" className="studio-cancel-button" onClick={() => { setReciprocalPromptOpen(false); onSave([]); setIsEditing(false); setOriginalDraft(null); }}>Save without reciprocal links</button><button type="button" className="studio-save-button" onClick={() => { setReciprocalPromptOpen(false); onSave(reciprocalIds); setIsEditing(false); setOriginalDraft(null); }}>Save selected links</button></div></section></div>}
    {portraitAdjustOpen && draft.portraitResourceId && <div className="portrait-adjust-backdrop studio-nested-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPortraitAdjustOpen(false); }}>
      <section className="portrait-adjust-modal" role="dialog" aria-modal="true" aria-labelledby="portrait-adjust-title">
        <div className="portrait-adjust-heading"><div><span>CHARACTER PORTRAIT</span><h2 id="portrait-adjust-title">Adjust image</h2><p>Use the sliders to position and zoom the image. Your original file stays untouched.</p></div><button type="button" onClick={() => setPortraitAdjustOpen(false)} aria-label="Close portrait adjustment"><X size={18} /></button></div>
        <div className="portrait-adjust-preview" style={{ "--character-accent": characterAccentColor(draft.accent) } as CSSProperties}><CharacterPortraitArt initials={draft.initials || "✦"} imageSrc={portraitUrl} alt={draft.name} fit="contain" positionX={draft.portraitPositionX} positionY={draft.portraitPositionY} zoom={draft.portraitZoom} /></div>
        <div className="portrait-framing-controls">
          <label className="profile-framing-control">Horizontal <span>{draft.portraitPositionX}%</span><input type="range" min="0" max="100" step="1" value={draft.portraitPositionX} onChange={(event) => patch({ portraitPositionX: Number(event.target.value) })} /></label>
          <label className="profile-framing-control">Vertical <span>{draft.portraitPositionY}%</span><input type="range" min="0" max="100" step="1" value={draft.portraitPositionY} onChange={(event) => patch({ portraitPositionY: Number(event.target.value) })} /></label>
          <label className="profile-framing-control">Zoom <span>{draft.portraitZoom}%</span><input type="range" min="25" max="500" step="1" value={draft.portraitZoom} onChange={(event) => patch({ portraitZoom: Number(event.target.value) })} /></label>
        </div>
        <div className="portrait-adjust-actions"><button type="button" className="library-primary" onClick={() => setPortraitAdjustOpen(false)}>Done</button></div>
      </section>
    </div>}
  </div>, document.body);
}

function RelationshipEditor({ relationship, relationshipKinds, characters, currentCharacterId, onChange, onRemove }: { relationship: CharacterRelationship; relationshipKinds: RelationshipKind[]; characters: CharacterRecord[]; currentCharacterId: string | null; onChange: (changes: Partial<CharacterRelationship>) => void; onRemove: () => void }) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [query, setQuery] = useState("");
  const candidates = characters.filter((character) => character.id !== currentCharacterId && character.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice(0, 6);
  function changeName(value: string) {
    const atIndex = value.lastIndexOf("@");
    if (atIndex >= 0) {
      setQuery(value.slice(atIndex + 1));
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setQuery("");
    }
    onChange({ characterName: value, characterId: null });
  }
  return <div className="studio-relationship-card">
    <div className="studio-relationship-top"><div className="studio-relationship-type-select"><select aria-label="Relationship type" value={relationship.kind} onChange={(event) => onChange({ kind: event.target.value as RelationshipKind })}>{relationshipKinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}{!relationshipKinds.includes(relationship.kind) && <option value={relationship.kind}>{relationship.kind} (custom/removed)</option>}</select><button type="button" className="studio-manage-relationship-types" onClick={() => window.dispatchEvent(new CustomEvent("brd:open-relationship-type-manager"))} aria-label="Manage relationship types" title="Manage relationship types"><MoreHorizontal size={16}/></button></div><button type="button" onClick={onRemove} aria-label="Remove relationship"><X size={14} /></button></div>
    <div className="studio-mention-wrap">
      <label className="studio-field"><span>Character or person</span><div className={"studio-mention-input " + (relationship.characterId ? "is-linked" : "")}><input value={relationship.characterId ? (characters.find((character) => character.id === relationship.characterId)?.name ?? relationship.characterName) : relationship.characterName} onChange={(event) => changeName(event.target.value)} onFocus={() => { if (relationship.characterName.includes("@")) { setQuery(relationship.characterName.slice(relationship.characterName.lastIndexOf("@") + 1)); setShowSuggestions(true); } }} placeholder="Type @ to link a character…" /><span>{relationship.characterId ? <Link2 size={14} /> : <UsersRound size={14} />}</span></div></label>
      {showSuggestions && <div className="studio-mention-suggestions">{candidates.length ? candidates.map((character) => <button type="button" key={character.id} onClick={() => { onChange({ characterName: character.name, characterId: character.id }); setShowSuggestions(false); setQuery(""); }}><span className="studio-mention-avatar">{character.initials || character.name.slice(0, 2).toUpperCase()}</span><span><strong>{character.name}</strong>{character.subtitle && <small>{character.subtitle}</small>}</span><ChevronRight size={14} /></button>) : <p>{query ? "No matching characters" : "Create another character to link it here."}</p>}</div>}
    </div>
    <TextField label="Notes (optional)" value={relationship.notes} onChange={(notes) => onChange({ notes })} placeholder="How are they connected?" />
    {relationship.characterId && <div className="studio-linked-note"><Link2 size={12} /> Linked to a character in your library</div>}
  </div>;
}
