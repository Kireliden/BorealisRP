import { useMemo, useState } from "react";
import { GitFork, Search, ZoomIn, ZoomOut, Maximize2, Users, Heart, Sparkles, ArrowUpRight } from "lucide-react";
import type { CharacterRecord } from "./characters.types";
import "./relationship-map.css";

type Props = {
  characters: CharacterRecord[];
  portraitUrls: Record<string, string>;
  onOpenCharacter: (character: CharacterRecord) => void;
};

type DemoNode = { id: string; name: string; role: string; x: number; y: number; color: string; initials: string };
const demoNodes: DemoNode[] = [
  { id: "mira", name: "Mira Vale", role: "Protagonist", x: 50, y: 47, color: "lavender", initials: "MV" },
  { id: "rowan", name: "Rowan Ashford", role: "Love interest", x: 27, y: 24, color: "pink", initials: "RA" },
  { id: "lyra", name: "Lyra Vale", role: "Older sister", x: 76, y: 23, color: "blue", initials: "LV" },
  { id: "silas", name: "Silas Wren", role: "Old friend", x: 22, y: 72, color: "green", initials: "SW" },
  { id: "vesper", name: "Vesper", role: "Rival", x: 78, y: 72, color: "peach", initials: "VS" },
];
const demoLinks = [
  { from: "mira", to: "rowan", label: "Complicated" },
  { from: "mira", to: "lyra", label: "Siblings" },
  { from: "mira", to: "silas", label: "Old friends" },
  { from: "mira", to: "vesper", label: "Rivals" },
  { from: "rowan", to: "vesper", label: "Tension" },
];

export default function RelationshipMap({ characters, portraitUrls, onOpenCharacter }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All connections");
  const [zoom, setZoom] = useState(100);
  const [selectedDemo, setSelectedDemo] = useState("mira");
  const linkedCount = characters.reduce((count, character) => count + (character.relationships ?? []).filter((r) => r.characterId && characters.some((other) => other.id === r.characterId)).length, 0);
  const hasRealLinks = linkedCount > 0;
  const visibleCharacters = useMemo(() => characters.filter((character) => character.name.toLowerCase().includes(query.toLowerCase())), [characters, query]);
  const actualNodes = visibleCharacters.map((character, index) => ({ character, x: 50 + Math.cos(index / Math.max(visibleCharacters.length, 1) * Math.PI * 2 - Math.PI / 2) * 31, y: 49 + Math.sin(index / Math.max(visibleCharacters.length, 1) * Math.PI * 2 - Math.PI / 2) * 31 }));
  const selectedSample = demoNodes.find((node) => node.id === selectedDemo) ?? demoNodes[0];
  const useDemo = !hasRealLinks;
  const shownLinks = demoLinks.filter((link) => {
    if (filter === "All connections") return true;
    return link.label.toLowerCase().includes(filter.toLowerCase()) || (filter === "Family" && link.label === "Siblings") || (filter === "Romance" && link.label === "Complicated") || (filter === "Friendship" && link.label === "Old friends");
  });

  return <section className="relationship-page">
    <div className="relationship-heading">
      <div><div className="relationship-eyebrow"><GitFork size={13} /> CHARACTER ATLAS</div><h1>Relationship Map</h1><p>Every connection tells part of the story.</p></div>
      <div className="relationship-stats"><span><Users size={15}/><strong>{useDemo ? "05" : characters.length.toString().padStart(2, "0")}</strong> characters</span><span><GitFork size={15}/><strong>{useDemo ? "05" : linkedCount.toString().padStart(2, "0")}</strong> connections</span></div>
    </div>
    <div className="relationship-toolbar">
      <label className="relationship-search"><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a character…" /></label>
      <div className="relationship-filters">{["All connections", "Family", "Romance", "Friendship"].map((item) => <button key={item} type="button" className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div>
      <div className="relationship-zoom"><button type="button" onClick={() => setZoom(Math.max(70, zoom - 10))} aria-label="Zoom out"><ZoomOut size={15}/></button><span>{zoom}%</span><button type="button" onClick={() => setZoom(Math.min(130, zoom + 10))} aria-label="Zoom in"><ZoomIn size={15}/></button><button type="button" onClick={() => { setZoom(100); setQuery(""); setFilter("All connections"); }} aria-label="Reset map"><Maximize2 size={14}/></button></div>
    </div>
    <div className="relationship-workspace">
      <div className="relationship-canvas">
        <div className="relationship-canvas-glow relationship-canvas-glow-a"/><div className="relationship-canvas-glow relationship-canvas-glow-b"/>
        <div className="relationship-canvas-grid"/>
        {useDemo ? <div className="relationship-graph" style={{ transform: `scale(${zoom / 100})` }}>
          <svg className="relationship-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {shownLinks.map((link) => { const a = demoNodes.find((node) => node.id === link.from)!; const b = demoNodes.find((node) => node.id === link.to)!; const midX = (a.x + b.x) / 2; const midY = (a.y + b.y) / 2 - 3; return <g key={link.from + link.to}><path d={`M ${a.x} ${a.y} Q ${midX} ${midY} ${b.x} ${b.y}`} className={`relationship-line line-${link.from}-${link.to}`}/><circle cx={midX} cy={midY} r=".48" className="relationship-line-dot"/></g>; })}
          </svg>
          {demoNodes.map((node) => <button type="button" key={node.id} className={`relationship-node node-${node.color} ${selectedDemo === node.id ? "is-focused" : ""} ${node.id === "mira" ? "node-central" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%` }} onClick={() => setSelectedDemo(node.id)}>
            <span className="relationship-node-orbit"/><span className="relationship-node-avatar">{node.initials}</span><strong>{node.name}</strong><small>{node.role}</small>
          </button>)}
          {shownLinks.map((link) => { const a = demoNodes.find((node) => node.id === link.from)!; const b = demoNodes.find((node) => node.id === link.to)!; return <span key={link.label + link.from} className="relationship-link-label" style={{ left: `${(a.x+b.x)/2}%`, top: `${(a.y+b.y)/2}%` }}>{link.label}</span>; })}
        </div> : <div className="relationship-graph relationship-real-graph" style={{ transform: `scale(${zoom / 100})` }}>
          <svg className="relationship-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{actualNodes.flatMap(({character, x, y}) => (character.relationships ?? []).map((rel) => { const target = actualNodes.find((node) => node.character.id === rel.characterId); if (!target || character.id > target.character.id) return null; return <g key={character.id + rel.id}><path d={`M ${x} ${y} Q ${(x+target.x)/2+4} ${(y+target.y)/2-5} ${target.x} ${target.y}`} className="relationship-line"/><text x={(x+target.x)/2} y={(y+target.y)/2} className="relationship-svg-label">{rel.kind}</text></g>; }))}</svg>
          {actualNodes.map(({character, x, y}) => <button type="button" key={character.id} className="relationship-node node-lavender" style={{left:`${x}%`,top:`${y}%`}} onClick={() => onOpenCharacter(character)}><span className="relationship-node-orbit"/><span className="relationship-node-avatar">{character.portraitResourceId && portraitUrls[character.portraitResourceId] ? <img src={portraitUrls[character.portraitResourceId]} alt=""/> : character.initials || character.name.slice(0,2).toUpperCase()}</span><strong>{character.name}</strong><small>{character.subtitle || "Character"}</small></button>)}
        </div>}
        <div className="relationship-canvas-caption"><Sparkles size={13}/>{useDemo ? "Design preview · illustrative characters and connections" : "Live map · linked character profiles"}</div>
      </div>
      <aside className="relationship-inspector">
        <div className="relationship-inspector-top"><span>CONNECTION DETAILS</span><Heart size={16}/></div>
        {useDemo ? <><div className={`relationship-inspector-avatar node-${selectedSample.color}`}>{selectedSample.initials}</div><h2>{selectedSample.name}</h2><p className="relationship-inspector-role">{selectedSample.role}</p><div className="relationship-inspector-rule"/><div className="relationship-inspector-label">CONNECTED TO</div>{demoLinks.filter((link) => link.from === selectedSample.id || link.to === selectedSample.id).map((link) => { const other = demoNodes.find((node) => node.id === (link.from === selectedSample.id ? link.to : link.from))!; return <button type="button" className="relationship-inspector-link" key={other.id} onClick={() => setSelectedDemo(other.id)}><span className={`relationship-mini-avatar node-${other.color}`}>{other.initials}</span><span><strong>{other.name}</strong><small>{link.label}</small></span><ArrowUpRight size={14}/></button>; })}<div className="relationship-inspector-note">Select any node to explore the connections around them.</div></> : <><div className="relationship-inspector-avatar node-lavender"><Users size={24}/></div><h2>Your cast</h2><p className="relationship-inspector-role">Select a node to open its character profile.</p><div className="relationship-inspector-rule"/><div className="relationship-inspector-label">MAP GUIDE</div><p className="relationship-guide-copy">Each line connects two character profiles. Relationship labels come from the links saved in their character sheets.</p></>}
      </aside>
    </div>
    {useDemo && <div className="relationship-preview-note"><Sparkles size={15}/><span><strong>Preview mode</strong> — these sample characters are only here to show the layout. They are not saved to your library. Once your profiles have linked relationships, this space will show your real cast.</span></div>}
  </section>;
}
