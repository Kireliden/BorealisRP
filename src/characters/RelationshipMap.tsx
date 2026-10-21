import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { GitFork, Search, ZoomIn, ZoomOut, Maximize2, Users, Heart, Sparkles, ArrowUpRight, ChevronLeft, ChevronRight, Palette } from "lucide-react";
import type { CharacterRecord, RelationshipKind } from "./characters.types";
import type { ResourceRecord } from "../resources/resources.types";
import CharacterPortraitArt from "./CharacterPortraitArt";
import { characterAccentColor } from "./characters.types";
import "./relationship-map.css";

type Props = {
  characters: CharacterRecord[];
  portraitUrls: Record<string, string>;
  imageResources: ResourceRecord[];
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

const defaultRelationshipKinds: RelationshipKind[] = ["Mother", "Father", "Sibling", "Partner", "Close friend", "Enemy", "Other"];
function loadRelationshipKinds(): RelationshipKind[] {
  try {
    const current = localStorage.getItem("brd.relationship-kinds.v2");
    if (current !== null) { const parsed = JSON.parse(current); return Array.isArray(parsed) ? parsed.filter((kind): kind is string => typeof kind === "string") : defaultRelationshipKinds; }
    const legacy = JSON.parse(localStorage.getItem("brd.relationship-kinds.v1") ?? "[]");
    return [...new Set([...defaultRelationshipKinds, ...(Array.isArray(legacy) ? legacy.filter((kind): kind is string => typeof kind === "string") : [])])];
  } catch { return defaultRelationshipKinds; }
}
const relationshipPalette = ["#b4befe", "#89b4fa", "#94e2d5", "#fab387", "#f5c2e7", "#a6e3a1", "#f9e2af", "#cba6f7", "#74c7ec", "#f2cdcd"];

function relationshipColor(kind: RelationshipKind): string {
  let hash = 0;
  for (let index = 0; index < kind.length; index += 1) hash = (hash * 31 + kind.charCodeAt(index)) | 0;
  return relationshipPalette[Math.abs(hash) % relationshipPalette.length];
}

function matchesFilter(edge: RelationshipEdge, filter: string): boolean {
  return filter === "All connections" || edge.kinds.includes(filter);
}

export default function RelationshipMap({ characters, portraitUrls, imageResources, onOpenCharacter }: Props) {
  const [query, setQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "name-asc" | "name-desc" | "updated">("newest");
  const [filter, setFilter] = useState("All connections");
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const canvasDragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const [mapBackground, setMapBackground] = useState(() => { try { return localStorage.getItem("brd.relationship-map.background") ?? "default"; } catch { return "default"; } });
  const [mapBackgroundImage, setMapBackgroundImage] = useState(() => { try { return localStorage.getItem("brd.relationship-map.background-image") ?? ""; } catch { return ""; } });
  const [mapBackgroundResourceId, setMapBackgroundResourceId] = useState(() => { try { return localStorage.getItem("brd.relationship-map.background-resource-id") ?? ""; } catch { return ""; } });
  const effectiveMapBackgroundImage = mapBackgroundResourceId ? portraitUrls[mapBackgroundResourceId] ?? "" : mapBackgroundImage;
  const backgroundImageInputRef = useRef<HTMLInputElement | null>(null);
  const [showBackgroundOptions, setShowBackgroundOptions] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [configuredRelationshipKinds] = useState<RelationshipKind[]>(loadRelationshipKinds);
  const filterStripRef = useRef<HTMLDivElement | null>(null);
  const [filterStripState, setFilterStripState] = useState({ canScrollLeft: false, canScrollRight: false });

  function updateFilterStripState() {
    const element = filterStripRef.current;
    if (!element) return;
    setFilterStripState({ canScrollLeft: element.scrollLeft > 2, canScrollRight: element.scrollLeft + element.clientWidth < element.scrollWidth - 2 });
  }
  function handleFilterStripMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const element = filterStripRef.current;
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    const localX = event.clientX - bounds.left;
    if (localX < 34 && element.scrollLeft > 0) element.scrollLeft -= Math.max(4, (34 - localX) * 0.55);
    else if (localX > bounds.width - 34 && element.scrollLeft + element.clientWidth < element.scrollWidth - 1) element.scrollLeft += Math.max(4, (localX - (bounds.width - 34)) * 0.55);
    updateFilterStripState();
  }
  useEffect(() => {
    updateFilterStripState();
    const element = filterStripRef.current;
    if (!element) return;
    const observer = new ResizeObserver(updateFilterStripState);
    observer.observe(element);
    return () => observer.disconnect();
  }, [configuredRelationshipKinds]);

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

  const visibleCharacters = useMemo(() => characters.filter((character) => character.name.toLowerCase().includes(query.trim().toLowerCase())).slice().sort((a, b) => {
    if (sortOrder === "name-asc") return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    if (sortOrder === "name-desc") return b.name.localeCompare(a.name, undefined, { sensitivity: "base" });
    if (sortOrder === "oldest") return Date.parse(a.createdAt || "") - Date.parse(b.createdAt || "");
    if (sortOrder === "updated") return Date.parse(b.updatedAt || b.createdAt || "") - Date.parse(a.updatedAt || a.createdAt || "");
    return Date.parse(b.createdAt || "") - Date.parse(a.createdAt || "");
  }), [characters, query, sortOrder]);
  const visibleIds = useMemo(() => new Set(visibleCharacters.map((character) => character.id)), [visibleCharacters]);
  const relationshipFilters = useMemo(() => ["All connections", ...configuredRelationshipKinds.slice().sort((a, b) => a.localeCompare(b))], [configuredRelationshipKinds]);
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
  const connectedCharacterIds = useMemo(() => new Set(visibleEdges.flatMap((edge) => [edge.from.id, edge.to.id])), [visibleEdges]);

  function handleMapBackgroundImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { window.alert("Please choose an image file."); event.target.value = ""; return; }
    if (file.size > 3 * 1024 * 1024) { window.alert("Please choose an image smaller than 3 MB so it can be stored locally."); event.target.value = ""; return; }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) return;
      try { localStorage.removeItem("brd.relationship-map.background-resource-id"); localStorage.setItem("brd.relationship-map.background-image", result); setMapBackgroundResourceId(""); setMapBackgroundImage(result); setMapBackground("custom"); localStorage.setItem("brd.relationship-map.background", "custom"); setShowBackgroundOptions(false); }
      catch { window.alert("This image could not be saved in local storage. Try a smaller image."); }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }
  function removeMapBackgroundImage() {
    setMapBackgroundImage("");
    setMapBackgroundResourceId("");
    try { localStorage.removeItem("brd.relationship-map.background-image"); localStorage.removeItem("brd.relationship-map.background-resource-id"); } catch { /* Ignore unavailable storage. */ }
    changeMapBackground("default");
  }
  function changeMapBackground(value: string) {
    setMapBackground(value);
    setShowBackgroundOptions(false);
    try { localStorage.setItem("brd.relationship-map.background", value); } catch { /* Keep the selection for this session if storage is unavailable. */ }
  }
  function handleCanvasPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (event.target as HTMLElement).closest("button, input, .relationship-node, .relationship-edge-tooltip")) return;
    canvasDragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: pan.x, originY: pan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDraggingCanvas(true);
  }
  function handleCanvasPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = canvasDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setPan({ x: drag.originX + event.clientX - drag.startX, y: drag.originY + event.clientY - drag.startY });
  }
  function handleCanvasPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (canvasDragRef.current?.pointerId !== event.pointerId) return;
    canvasDragRef.current = null;
    setIsDraggingCanvas(false);
  }
  function handleCanvasWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    setZoom((current) => Math.max(60, Math.min(160, current + (event.deltaY < 0 ? 5 : -5))));
  }
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
      <label className="relationship-search"><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a character…" /></label><label className="relationship-map-sort"><span>Sort</span><select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)}><option value="newest">Recently created</option><option value="oldest">Oldest first</option><option value="name-asc">Name A–Z</option><option value="name-desc">Name Z–A</option><option value="updated">Recently updated</option></select></label>
      <div className={`relationship-filter-strip ${filterStripState.canScrollLeft ? "can-scroll-left" : ""} ${filterStripState.canScrollRight ? "can-scroll-right" : ""}`} onMouseMove={handleFilterStripMouseMove}>
        <button className="relationship-filter-scroll relationship-filter-scroll-left" type="button" aria-label="Scroll relationship types left" disabled={!filterStripState.canScrollLeft} onClick={() => { if (filterStripRef.current) filterStripRef.current.scrollBy({ left: -180, behavior: "smooth" }); }}><ChevronLeft size={15}/></button>
        <div className="relationship-filters" ref={filterStripRef} onScroll={updateFilterStripState}>{relationshipFilters.map((item) => <button key={item} type="button" className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div>
        <button className="relationship-filter-scroll relationship-filter-scroll-right" type="button" aria-label="Scroll relationship types right" disabled={!filterStripState.canScrollRight} onClick={() => { if (filterStripRef.current) filterStripRef.current.scrollBy({ left: 180, behavior: "smooth" }); }}><ChevronRight size={15}/></button>
      </div>
      <div className="relationship-zoom"><button type="button" onClick={() => setZoom(Math.max(70, zoom - 10))} aria-label="Zoom out"><ZoomOut size={15}/></button><span>{zoom}%</span><button type="button" onClick={() => setZoom(Math.min(130, zoom + 10))} aria-label="Zoom in"><ZoomIn size={15}/></button><button type="button" onClick={() => { setZoom(100); setPan({ x: 0, y: 0 }); setQuery(""); setFilter("All connections"); setSelectedId(null); setHoveredEdgeId(null); }} aria-label="Reset map"><Maximize2 size={14}/></button></div>
    </div>
    <div className="relationship-workspace">
      <div className="relationship-map-column">
      <div className={`relationship-canvas relationship-background-${mapBackground} ${isDraggingCanvas ? "is-panning" : ""}`} style={mapBackground === "custom" && effectiveMapBackgroundImage ? { backgroundImage: `linear-gradient(color-mix(in srgb, var(--ctp-crust) 46%, transparent), color-mix(in srgb, var(--ctp-crust) 62%, transparent)), url("${effectiveMapBackgroundImage}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} onPointerDown={handleCanvasPointerDown} onPointerMove={handleCanvasPointerMove} onPointerUp={handleCanvasPointerUp} onPointerCancel={handleCanvasPointerUp} onWheel={handleCanvasWheel}>
        <div className="relationship-canvas-glow relationship-canvas-glow-a"/><div className="relationship-canvas-glow relationship-canvas-glow-b"/>
        <div className="relationship-canvas-grid"/>
        {visibleCharacters.length > 0 ? <div className="relationship-graph relationship-real-graph" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})` }}>
          <svg className="relationship-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {visibleEdges.map((edge) => {
              const a = actualNodes.find((node) => node.character.id === edge.from.id);
              const b = actualNodes.find((node) => node.character.id === edge.to.id);
              if (!a || !b) return null;
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const distance = Math.hypot(dx, dy) || 1;
              const inset = 6.2;
              const startX = a.x + (dx / distance) * inset;
              const startY = a.y + (dy / distance) * inset;
              const endX = b.x - (dx / distance) * inset;
              const endY = b.y - (dy / distance) * inset;
              const midX = (startX + endX) / 2;
              const midY = (startY + endY) / 2;
              const path = `M ${startX} ${startY} L ${endX} ${endY}`;
              const isHovered = hoveredEdgeId === edge.id;
              return <g key={edge.id} onMouseEnter={() => setHoveredEdgeId(edge.id)} onMouseLeave={() => setHoveredEdgeId(null)}>
                <path d={path} className={`relationship-line ${isHovered ? "is-hovered" : ""}`} style={{ stroke: relationshipColor(edge.kinds[0] ?? "Other") }} />
                <path d={path} className="relationship-line-hit-area" />
              </g>;
            })}
          </svg>
          {visibleEdges.filter((edge) => edge.id === hoveredEdgeId).map((edge) => {
            const a = actualNodes.find((node) => node.character.id === edge.from.id);
            const b = actualNodes.find((node) => node.character.id === edge.to.id);
            if (!a || !b) return null;
            return <div key={edge.id} className="relationship-edge-tooltip" style={{ left: `${(a.x + b.x) / 2}%`, top: `${(a.y + b.y) / 2 - 4}%`, borderColor: relationshipColor(edge.kinds[0] ?? "Other") }}>{edge.labels.join(" · ")}</div>;
          })}
          {actualNodes.map(({character, x, y}) => <button type="button" key={character.id} className={`relationship-node node-lavender ${selectedCharacter?.id === character.id ? "is-focused" : ""} ${filter !== "All connections" && !connectedCharacterIds.has(character.id) ? "is-filter-dimmed" : ""}`} style={{left:`${x}%`,top:`${y}%`,opacity:filter !== "All connections" && !connectedCharacterIds.has(character.id) ? 0.16 : 1}} onClick={() => setSelectedId(character.id)} onMouseEnter={() => setSelectedId(character.id)}>
            <span className="relationship-node-orbit"/><span className="relationship-node-avatar" style={{overflow:"hidden",isolation:"isolate"}}><CharacterPortraitArt initials={character.initials || character.name.slice(0,2).toUpperCase()} imageSrc={character.portraitResourceId ? portraitUrls[character.portraitResourceId] : null} alt={character.name} fit={character.portraitFit ?? "contain"} positionX={character.portraitPositionX ?? 50} positionY={character.portraitPositionY ?? 50} zoom={character.portraitZoom ?? 100} /><span className="relationship-node-hover-card"><strong>{character.name}</strong>{character.subtitle && <small>{character.subtitle}</small>}{character.description && <p>{character.description}</p>}</span></span><strong>{character.name}</strong>{character.subtitle && <small>{character.subtitle}</small>}
          </button>)}
        </div> : <div className="relationship-preview-note"><Users size={16}/><span>{characters.length === 0 ? <><strong>Your cast is empty.</strong> Create a character first, then link profiles to start building your map.</> : <>No characters match “{query}”. Try a different search.</>}</span></div>}
        <div className="relationship-canvas-caption"><Sparkles size={13}/>{hasRelationships ? "Live map · linked character profiles" : "Your map · based on saved character profiles"}</div>
      </div>
      <div className="relationship-map-background-controls">
          <button type="button" className={showBackgroundOptions ? "active" : ""} onClick={() => setShowBackgroundOptions((open) => !open)} aria-expanded={showBackgroundOptions}><Palette size={14}/> Map background <span>{showBackgroundOptions ? "−" : "+"}</span></button>
          {showBackgroundOptions && <div className="relationship-map-background-options" role="group" aria-label="Map background"><button type="button" className={mapBackground === "default" ? "active" : ""} onClick={() => changeMapBackground("default")}><i className="background-swatch background-swatch-default"/>Default</button><button type="button" className={mapBackground === "midnight" ? "active" : ""} onClick={() => changeMapBackground("midnight")}><i className="background-swatch background-swatch-midnight"/>Midnight</button><button type="button" className={mapBackground === "dusk" ? "active" : ""} onClick={() => changeMapBackground("dusk")}><i className="background-swatch background-swatch-dusk"/>Dusk</button><button type="button" className={mapBackground === "forest" ? "active" : ""} onClick={() => changeMapBackground("forest")}><i className="background-swatch background-swatch-forest"/>Forest</button><button type="button" className={mapBackground === "custom" ? "active" : ""} onClick={() => backgroundImageInputRef.current?.click()}><i className="background-swatch background-swatch-custom"/>Upload image</button>{imageResources.length > 0 && <div className="relationship-resource-background-picker"><span>FROM RESOURCES</span>{imageResources.map((resource) => <button type="button" key={resource.id} className={mapBackgroundResourceId === resource.id ? "active" : ""} disabled={!portraitUrls[resource.id]} onClick={() => { const url = portraitUrls[resource.id]; if (!url) return; setMapBackgroundImage(""); setMapBackgroundResourceId(resource.id); setMapBackground("custom"); try { localStorage.removeItem("brd.relationship-map.background-image"); localStorage.setItem("brd.relationship-map.background-resource-id", resource.id); localStorage.setItem("brd.relationship-map.background", "custom"); } catch { /* Keep the current selection for this session. */ } setShowBackgroundOptions(false); }}><span className="relationship-resource-background-thumb">{portraitUrls[resource.id] && <img src={portraitUrls[resource.id]} alt="" />}</span><span>{resource.name}</span></button>)}</div>}{mapBackgroundImage && <button type="button" onClick={removeMapBackgroundImage}>Remove image</button>}<input ref={backgroundImageInputRef} className="relationship-background-file-input" type="file" accept="image/*" onChange={handleMapBackgroundImageChange} aria-label="Choose map background image"/></div>}
      </div>
      </div>
      <aside className="relationship-inspector">
        <div className="relationship-inspector-top"><span>CONNECTION DETAILS</span><Heart size={16}/></div>
        {selectedCharacter ? <>
          <div className="relationship-inspector-character-card character-card" style={{ "--character-accent": characterAccentColor(selectedCharacter.accent), "--character-accent-color": characterAccentColor(selectedCharacter.accent) } as CSSProperties}>
            <div className="relationship-inspector-character-art character-card-art"><CharacterPortraitArt initials={selectedCharacter.initials || selectedCharacter.name.slice(0,2).toUpperCase()} imageSrc={selectedCharacter.portraitResourceId ? portraitUrls[selectedCharacter.portraitResourceId] : null} alt={selectedCharacter.name} fit={selectedCharacter.portraitFit ?? "contain"} positionX={selectedCharacter.portraitPositionX ?? 50} positionY={selectedCharacter.portraitPositionY ?? 50} zoom={selectedCharacter.portraitZoom ?? 100} fadeEdges /></div>
            <div className="relationship-inspector-character-copy character-card-copy"><strong>{selectedCharacter.name}</strong><span>{selectedCharacter.subtitle || "\u00a0"}</span><div className="relationship-inspector-character-tags character-card-tags">{selectedCharacter.tags.slice(0, 4).map((tag) => <i key={tag}>{tag}</i>)}</div></div>
          </div>
          <div className="relationship-inspector-rule"/>
          <div className="relationship-inspector-label">CONNECTED TO · {selectedEdges.length.toString().padStart(2, "0")}</div>
          {selectedEdges.length > 0 ? selectedEdges.map((edge) => {
            const other = edge.from.id === selectedCharacter.id ? edge.to : edge.from;
            return <button type="button" className="relationship-inspector-link" key={edge.id} onClick={() => onOpenCharacter(other)}>
              <span className="relationship-mini-avatar node-lavender" style={{overflow:"hidden",position:"relative"}}>{other.portraitResourceId && portraitUrls[other.portraitResourceId] ? <CharacterPortraitArt initials={other.initials || other.name.slice(0,2).toUpperCase()} imageSrc={portraitUrls[other.portraitResourceId]} alt={other.name} fit={other.portraitFit ?? "contain"} positionX={other.portraitPositionX ?? 50} positionY={other.portraitPositionY ?? 50} zoom={other.portraitZoom ?? 100}/> : other.initials || other.name.slice(0,2).toUpperCase()}</span>
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
