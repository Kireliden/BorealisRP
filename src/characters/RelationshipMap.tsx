import { useMemo, useState } from "react";
import { GitFork, Search, ZoomIn, ZoomOut, Maximize2, Users, Heart, Sparkles, ArrowUpRight } from "lucide-react";
import type { CharacterRecord, RelationshipKind } from "./characters.types";
import "./relationship-map.css";

type Props = {
  characters: CharacterRecord[];
  portraitUrls: Record<string, string>;
  onOpenCharacter: (character: CharacterRecord) => void;
};

type RelationshipEdge = {
  id: string;
  from: CharacterRecord;
  to: CharacterRecord;
  labels: string[];
  kinds: RelationshipKind[];
  notes: string[];
};

const familyKinds: RelationshipKind[] = ["Mother", "Father", "Sibling"];
const romanceKinds: RelationshipKind[] = ["Partner"];
const friendshipKinds: RelationshipKind[] = ["Close friend"];

function matchesFilter(edge: RelationshipEdge, filter: string): boolean {
  if (filter === "All connections") return true;
  if (filter === "Family") return edge.kinds.some((kind) => familyKinds.includes(kind));
  if (filter === "Romance") return edge.kinds.some((kind) => romanceKinds.includes(kind));
  if (filter === "Friendship") return edge.kinds.some((kind) => friendshipKinds.includes(kind));
  return true;
}

export default function RelationshipMap({ characters, portraitUrls, onOpenCharacter }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All connections");
  const [zoom, setZoom] = useState(100);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const allEdges = useMemo(() => {
    const byPair = new Map<string, RelationshipEdge>();
    const byId = new Map(characters.map((character) => [character.id, character]));

    for (const character of characters) {
      for (const relationship of character.relationships ?? []) {
        if (!relationship.characterId || relationship.characterId === character.id) continue;
        const target = byId.get(relationship.characterId);
        if (!target) continue;

        const pair = [character.id, target.id].sort();
        const id = pair.join("::");
        let edge = byPair.get(id);
        if (!edge) {
          edge = { id, from: character, to: target, labels: [], kinds: [], notes: [] };
          byPair.set(id, edge);
        }

        if (!edge.labels.includes(relationship.kind)) edge.labels.push(relationship.kind);
        if (!edge.kinds.includes(relationship.kind)) edge.kinds.push(relationship.kind);
        if (relationship.notes.trim() && !edge.notes.includes(relationship.notes.trim())) edge.notes.push(relationship.notes.trim());
      }
    }

    return [...byPair.values()];
  }, [characters]);

  const visibleCharacters = useMemo(
    () => characters.filter((character) => character.name.toLowerCase().includes(query.trim().toLowerCase())),
    [characters, query],
  );
  const visibleIds = useMemo(() => new Set(visibleCharacters.map((character) => character.id)), [visibleCharacters]);
  const visibleEdges = useMemo(
    () => allEdges.filter((edge) => visibleIds.has(edge.from.id) && visibleIds.has(edge.to.id) && matchesFilter(edge, filter)),
    [allEdges, visibleIds, filter],
  );
  const actualNodes = useMemo(
    () => visibleCharacters.map((character, index) => ({
      character,
      x: 50 + Math.cos(index / Math.max(visibleCharacters.length, 1) * Math.PI * 2 - Math.PI / 2) * (visibleCharacters.length <= 2 ? 20 : 31),
      y: 49 + Math.sin(index / Math.max(visibleCharacters.length, 1) * Math.PI * 2 - Math.PI / 2) * (visibleCharacters.length <= 2 ? 20 : 31),
    })),
    [visibleCharacters],
  );
  const selectedCharacter = visibleCharacters.find((character) => character.id === selectedId) ?? visibleCharacters[0] ?? null;
  const selectedEdges = selectedCharacter
    ? visibleEdges.filter((edge) => edge.from.id === selectedCharacter.id || edge.to.id === selectedCharacter.id)
    : [];
  const connectionCount = allEdges.length;
  const hasRelationships = connectionCount > 0;

  return <section className="relationship-page">
    <div className="relationship-heading">
      <div><div className="relationship-eyebrow"><GitFork size={13} /> CHARACTER ATLAS</div><h1>Relationship Map</h1><p>Every connection tells part of the story.</p></div>
      <div className="relationship-stats"><span><Users size={15}/><strong>{characters.length.toString().padStart(2, "0")}</strong> characters</span><span><GitFork size={15}/><strong>{connectionCount.toString().padStart(2, "0")}</strong> connections</span></div>
    </div>
    <div className="relationship-toolbar">
      <label className="relationship-search"><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a character…" /></label>
      <div className="relationship-filters">{["All connections", "Family", "Romance", "Friendship"].map((item) => <button key={item} type="button" className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div>
      <div className="relationship-zoom"><button type="button" onClick={() => setZoom(Math.max(70, zoom - 10))} aria-label="Zoom out"><ZoomOut size={15}/></button><span>{zoom}%</span><button type="button" onClick={() => setZoom(Math.min(130, zoom + 10))} aria-label="Zoom in"><ZoomIn size={15}/></button><button type="button" onClick={() => { setZoom(100); setQuery(""); setFilter("All connections"); setSelectedId(null); }} aria-label="Reset map"><Maximize2 size={14}/></button></div>
    </div>
    <div className="relationship-workspace">
      <div className="relationship-canvas">
        <div className="relationship-canvas-glow relationship-canvas-glow-a"/><div className="relationship-canvas-glow relationship-canvas-glow-b"/>
        <div className="relationship-canvas-grid"/>
        {visibleCharacters.length > 0 ? <div className="relationship-graph relationship-real-graph" style={{ transform: `scale(${zoom / 100})` }}>
          <svg className="relationship-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {visibleEdges.map((edge) => {
              const a = actualNodes.find((node) => node.character.id === edge.from.id);
              const b = actualNodes.find((node) => node.character.id === edge.to.id);
              if (!a || !b) return null;
              const midX = (a.x + b.x) / 2;
              const midY = (a.y + b.y) / 2 - 4;
              return <g key={edge.id}>
                <path d={`M ${a.x} ${a.y} Q ${midX} ${midY} ${b.x} ${b.y}`} className="relationship-line"/>
                <text x={midX} y={midY} className="relationship-svg-label">{edge.labels.join(" · ")}</text>
              </g>;
            })}
          </svg>
          {actualNodes.map(({character, x, y}) => <button type="button" key={character.id} className={`relationship-node node-lavender ${selectedCharacter?.id === character.id ? "is-focused" : ""}`} style={{left:`${x}%`,top:`${y}%`}} onClick={() => setSelectedId(character.id)}>
            <span className="relationship-node-orbit"/><span className="relationship-node-avatar">{character.portraitResourceId && portraitUrls[character.portraitResourceId] ? <img src={portraitUrls[character.portraitResourceId]} alt=""/> : character.initials || character.name.slice(0,2).toUpperCase()}</span><strong>{character.name}</strong><small>{character.subtitle || "Character"}</small>
          </button>)}
        </div> : <div className="relationship-preview-note"><Users size={16}/><span>{characters.length === 0 ? <><strong>Your cast is empty.</strong> Create a character first, then link profiles to start building your map.</> : <>No characters match “{query}”. Try a different search.</>}</span></div>}
        <div className="relationship-canvas-caption"><Sparkles size={13}/>{hasRelationships ? "Live map · linked character profiles" : "Your map · based on saved character profiles"}</div>
      </div>
      <aside className="relationship-inspector">
        <div className="relationship-inspector-top"><span>CONNECTION DETAILS</span><Heart size={16}/></div>
        {selectedCharacter ? <>
          <div className="relationship-inspector-avatar node-lavender">{selectedCharacter.portraitResourceId && portraitUrls[selectedCharacter.portraitResourceId] ? <img src={portraitUrls[selectedCharacter.portraitResourceId]} alt="" style={{width:"100%",height:"100%",objectFit:"contain",borderRadius:"inherit"}}/> : selectedCharacter.initials || selectedCharacter.name.slice(0,2).toUpperCase()}</div>
          <h2>{selectedCharacter.name}</h2>
          <p className="relationship-inspector-role">{selectedCharacter.subtitle || "Character profile"}</p>
          <div className="relationship-inspector-rule"/>
          <div className="relationship-inspector-label">CONNECTED TO · {selectedEdges.length.toString().padStart(2, "0")}</div>
          {selectedEdges.length > 0 ? selectedEdges.map((edge) => {
            const other = edge.from.id === selectedCharacter.id ? edge.to : edge.from;
            return <button type="button" className="relationship-inspector-link" key={edge.id} onClick={() => onOpenCharacter(other)}>
              <span className="relationship-mini-avatar node-lavender">{other.initials || other.name.slice(0,2).toUpperCase()}</span>
              <span><strong>{other.name}</strong><small>{edge.labels.join(" · ") || "Connected"}</small></span><ArrowUpRight size={14}/>
            </button>;
          }) : <div className="relationship-inspector-note">{hasRelationships ? "No connections match the current filter or search." : "This character has no linked relationships yet. Edit their profile and link them to another character to add a connection."}</div>}
          {selectedEdges.some((edge) => edge.notes.length > 0) && <><div className="relationship-inspector-label" style={{marginTop:16}}>RELATIONSHIP NOTES</div>{selectedEdges.flatMap((edge) => edge.notes.map((note) => <p className="relationship-guide-copy" key={edge.id + note}>{note}</p>))}</>}
          <button type="button" className="relationship-inspector-link" style={{marginTop:12}} onClick={() => onOpenCharacter(selectedCharacter)}><span><strong>Open character profile</strong><small>Edit details and relationships</small></span><ArrowUpRight size={14}/></button>
        </> : <><div className="relationship-inspector-avatar node-lavender"><Users size={24}/></div><h2>No characters found</h2><p className="relationship-inspector-role">Try another search to explore your cast.</p><div className="relationship-inspector-rule"/><div className="relationship-guide-copy">Your map uses the character profiles saved in Borealis. Nothing is added to your library by the map itself.</div></>}
      </aside>
    </div>
  </section>;
}
