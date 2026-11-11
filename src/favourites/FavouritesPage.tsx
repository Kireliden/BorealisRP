import { useMemo, useState } from "react";
import { ArrowLeft, Bookmark, Heart, MessageSquare, Search, X } from "lucide-react";
import type { WorkspaceMessage, WorkspaceScene } from "../workspace/workspaceContent";
import "./favourites.css";

type Props = {
  workspaceName: string | null;
  scenes: WorkspaceScene[];
  busy: boolean;
  onClose: () => void;
  onOpen: (sceneId: string, messageId?: number) => void;
  onToggleScene: (sceneId: string) => void;
  onToggleMessage: (sceneId: string, messageId: number) => void;
};

function passagePreview(message: WorkspaceMessage): string {
  const text = new DOMParser().parseFromString(message.content, "text/html").body.textContent?.replace(/\s+/g, " ").trim() ?? "";
  return text || (message.images?.length ? "[Image attachment]" : "[Empty passage]");
}

export default function FavouritesPage({
  workspaceName, scenes, busy, onClose, onOpen, onToggleScene, onToggleMessage,
}: Props) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"all" | "scenes" | "messages">("all");
  const searched = query.trim().toLocaleLowerCase();

  const favouriteScenes = useMemo(() => scenes.filter((scene) => scene.favourite)
    .sort((a, b) => (b.favouritedAt ?? 0) - (a.favouritedAt ?? 0)), [scenes]);
  const favouriteMessages = useMemo(() => scenes.flatMap((scene) =>
    scene.messages.filter((message) => message.favourite)
      .map((message) => ({ scene, message })))
    .sort((a, b) => (b.message.favouritedAt ?? b.message.sentAt ?? 0)
      - (a.message.favouritedAt ?? a.message.sentAt ?? 0)), [scenes]);
  const shownScenes = favouriteScenes.filter((scene) =>
    scene.name.toLocaleLowerCase().includes(searched));
  const shownMessages = favouriteMessages.filter(({ scene, message }) =>
    [scene.name, message.author, passagePreview(message)].join(" ").toLocaleLowerCase().includes(searched));
  const hasResults = (view !== "messages" && shownScenes.length > 0) || (view !== "scenes" && shownMessages.length > 0);

  return <div className="library-overlay favourites-overlay">
    <header className="library-topbar">
      <button className="library-back" onClick={onClose} type="button"><ArrowLeft size={16} /> Back to Workspace</button>
      <div className="library-brand"><strong>Favourites</strong></div>
      <button className="library-close" onClick={onClose} type="button" aria-label="Close Favourites"><X size={18} /></button>
    </header>
    <main className="favourites-layout">
      <div className="library-eyebrow">{workspaceName ? "WORKSPACE COLLECTION" : "SELECT A WORKSPACE"} · {favouriteScenes.length + favouriteMessages.length} SAVED</div>
      <div className="library-heading-row"><div><h1>Favourites</h1><p>Keep your favourite scenes and passages close, without copying or moving them.</p></div></div>
      <div className="favourites-controls">
        <div className="favourites-view-switch" role="tablist" aria-label="Favourite types">
          {(["all", "scenes", "messages"] as const).map((type) =>
            <button key={type} type="button" role="tab" aria-selected={view === type}
              className={view === type ? "active" : ""} onClick={() => setView(type)}>
              {type === "all" ? "All" : type === "scenes" ? "Scenes" : "Messages"}
            </button>)}
        </div>
        <label className="library-search favourites-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search saved scenes or passages…" /></label>
      </div>
      {!workspaceName ? <div className="library-empty"><Bookmark size={30}/><h2>No workspace selected</h2><p>Choose a workspace to see its favourites.</p></div> : !hasResults ? <div className="library-empty"><Bookmark size={30}/><h2>{query ? "Nothing matches your search" : "Nothing saved yet"}</h2><p>{query ? "Try another word." : "Use Favourite on a scene or the ⋯ menu of a message to save it here."}</p></div> : <>
        {view !== "messages" && shownScenes.length > 0 && <section className="favourites-section"><h2><Heart size={17} /> Scenes <span>{shownScenes.length}</span></h2>
          <div className="favourites-grid">{shownScenes.map((scene) =>
            <article key={scene.id} className="favourites-card">
              <button className="favourites-card-main" type="button" onClick={() => onOpen(scene.id)}><span className="favourites-card-meta">SCENE</span><strong>{scene.name}</strong><small>{scene.messages.length} passages · Open scene</small></button>
              <button type="button" className="favourites-remove" aria-label={`Remove favourite scene ${scene.name}`} title="Remove favourite" disabled={busy} onClick={() => onToggleScene(scene.id)}><Heart size={16} fill="currentColor" /></button>
            </article>)}</div>
        </section>}
        {view !== "scenes" && shownMessages.length > 0 && <section className="favourites-section"><h2><MessageSquare size={17} /> Messages <span>{shownMessages.length}</span></h2>
          <div className="favourites-grid">{shownMessages.map(({ scene, message }) =>
            <article key={scene.id + ":" + message.id} className="favourites-card">
              <button className="favourites-card-main" type="button" onClick={() => onOpen(scene.id, message.id)}>
                <span className="favourites-card-meta">{scene.name} · {message.time}</span>
                <strong>{message.author}</strong>
                <p>{passagePreview(message)}</p>
                {!!message.images?.length && <small>{message.images.length} image attachment{message.images.length === 1 ? "" : "s"}</small>}
              </button>
              <button type="button" className="favourites-remove" aria-label={`Remove favourite message by ${message.author}`} title="Remove favourite" disabled={busy} onClick={() => onToggleMessage(scene.id, message.id)}><Heart size={16} fill="currentColor" /></button>
            </article>)}</div>
        </section>}
      </>}
    </main>
  </div>;
}
