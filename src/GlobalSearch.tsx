import { useEffect, useMemo, useState } from "react";
import { Search, X, Users, LibraryBig, FileImage, FileAudio, FileVideo, File } from "lucide-react";
import { loadCharacters } from "./characters/characters.storage";
import type { CharacterRecord } from "./characters/characters.types";
import { listResources } from "./resources/resources.storage";
import type { ResourceRecord } from "./resources/resources.types";
import "./global-search.css";

type Props = { onClose: () => void; onOpenCharacters: () => void; onOpenResources: () => void };

export default function GlobalSearch({ onClose, onOpenCharacters, onOpenResources }: Props) {
  const [query, setQuery] = useState("");
  const [characters] = useState<CharacterRecord[]>(loadCharacters);
  const [resources, setResources] = useState<ResourceRecord[]>([]);
  useEffect(() => { void listResources().then(setResources).catch(() => setResources([])); }, []);
  const results = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return { characters: characters.slice(0, 4), resources: resources.slice(0, 6) };
    return {
      characters: characters.filter((item) => [item.name, item.subtitle, item.description, ...item.tags].join(" ").toLocaleLowerCase().includes(term)).slice(0, 6),
      resources: resources.filter((item) => [item.name, item.fileName, ...item.tags].join(" ").toLocaleLowerCase().includes(term)).slice(0, 8),
    };
  }, [query, characters, resources]);
  function resourceIcon(item: ResourceRecord) {
    if (item.kind === "image") return <FileImage size={16} />;
    if (item.kind === "audio") return <FileAudio size={16} />;
    if (item.kind === "video") return <FileVideo size={16} />;
    return <File size={16} />;
  }
  return <div className="global-search-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="global-search-dialog" role="dialog" aria-modal="true" aria-label="Global search">
      <div className="global-search-input"><Search size={19} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search characters, resources and tags…" onKeyDown={(event) => { if (event.key === "Escape") onClose(); }} /><kbd>ESC</kbd><button type="button" aria-label="Close search" onClick={onClose}><X size={17} /></button></div>
      <div className="global-search-results">
        <div className="global-search-section"><div className="global-search-label"><Users size={13} /> CHARACTERS <button type="button" onClick={onOpenCharacters}>Open library ↗</button></div>
          {results.characters.map((item) => <button className="global-search-result" key={item.id} type="button" onClick={onOpenCharacters}><span className={`global-search-avatar accent-${item.accent}`}>{item.initials}</span><span><strong>{item.name}</strong><small>{item.subtitle || "Character profile"}</small></span><span className="global-search-result-kind">Character</span></button>)}
          {results.characters.length === 0 && <p className="global-search-empty">No matching characters.</p>}
        </div>
        <div className="global-search-section"><div className="global-search-label"><LibraryBig size={13} /> RESOURCES <button type="button" onClick={onOpenResources}>Open library ↗</button></div>
          {results.resources.map((item) => <button className="global-search-result" key={item.id} type="button" onClick={onOpenResources}><span className="global-search-resource-icon">{resourceIcon(item)}</span><span><strong>{item.name}</strong><small>{item.fileName}{item.tags.length ? " · " + item.tags.join(", ") : ""}</small></span><span className="global-search-result-kind">{item.kind}</span></button>)}
          {results.resources.length === 0 && <p className="global-search-empty">No matching resources.</p>}
        </div>
      </div>
      <div className="global-search-footer"><span>Searches your global libraries and their tags</span><span><kbd>↵</kbd> open library <kbd>ESC</kbd> close</span></div>
    </section>
  </div>;
}
