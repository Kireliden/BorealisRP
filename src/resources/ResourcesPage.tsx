import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, FileAudio, FileImage, FileVideo, File, Search, Tag, Trash2, Upload, X } from "lucide-react";
import { deleteResource, getResourceBlob, importResource, listResources, updateResourceTags } from "./resources.storage";
import { resourceKindFromFile, type ResourceRecord } from "./resources.types";
import "./resources.css";

type Props = { onClose: () => void };

export default function ResourcesPage({ onClose }: Props) {
  const [resources, setResources] = useState<ResourceRecord[]>([]);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [tagDraft, setTagDraft] = useState("");
  const [selected, setSelected] = useState<ResourceRecord | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function refresh() { setResources(await listResources()); }
  useEffect(() => { void refresh().catch((reason) => setError(String(reason))); }, []);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const allTags = useMemo(() => [...new Set(resources.flatMap((resource) => resource.tags))].sort(), [resources]);
  const filtered = resources.filter((resource) => (kind === "all" || resource.kind === kind) && [resource.name, resource.fileName, ...resource.tags].join(" ").toLowerCase().includes(query.toLowerCase()));

  async function addFiles(files: FileList | File[]) {
    setError("");
    try {
      for (const file of Array.from(files)) await importResource(file);
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
  }
  async function openPreview(resource: ResourceRecord) {
    setSelected(resource);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const blob = await getResourceBlob(resource.id);
    setPreviewUrl(blob ? URL.createObjectURL(blob) : null);
  }
  async function saveTags() {
    if (!selected) return;
    await updateResourceTags(selected.id, tagDraft.split(",").map((tag) => tag.trim()).filter(Boolean));
    await refresh();
    setSelected((current) => current ? { ...current, tags: tagDraft.split(",").map((tag) => tag.trim()).filter(Boolean) } : null);
  }
  async function remove(resource: ResourceRecord) {
    if (!window.confirm(`Delete “${resource.fileName}” from the global resource library?`)) return;
    await deleteResource(resource.id);
    if (selected?.id === resource.id) { setSelected(null); setPreviewUrl(null); }
    await refresh();
  }
  function iconFor(resource: ResourceRecord) {
    if (resource.kind === "image") return <FileImage size={20} />;
    if (resource.kind === "audio") return <FileAudio size={20} />;
    if (resource.kind === "video") return <FileVideo size={20} />;
    return <File size={20} />;
  }

  return <div className="library-overlay">
    <header className="library-topbar">
      <button className="library-back" onClick={onClose} type="button"><ArrowLeft size={16} /> Back to Workspace</button>
      <div className="library-brand"><span>BOREALIS</span><strong>Resources</strong></div>
      <button className="library-close" onClick={onClose} type="button" aria-label="Close Resources"><X size={18} /></button>
    </header>
    <main className="resources-layout">
      <section className="resources-main">
        <div className="library-eyebrow">GLOBAL LIBRARY · {resources.length.toString().padStart(2, "0")} FILES</div>
        <div className="library-heading-row"><div><h1>Resources</h1><p>One visual library for every story, scene and character.</p></div><button className="library-primary" type="button" onClick={() => inputRef.current?.click()}><Upload size={16} /> Import files</button></div>
        <input ref={inputRef} type="file" multiple hidden onChange={(event) => { if (event.target.files) void addFiles(event.target.files); event.currentTarget.value = ""; }} />
        <div className={`resource-dropzone ${dragging ? "is-dragging" : ""}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }} onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); if (event.dataTransfer.files.length) void addFiles(event.dataTransfer.files); }}><Upload size={19} /><div><strong>Drop anything you want to keep close</strong><span>Images, audio, video and other files · stored in this app's local library</span></div><button type="button" onClick={() => inputRef.current?.click()}>Browse files</button></div>
        {error && <p className="resource-error">{error}</p>}
        <div className="resource-controls"><label className="library-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search files and tags…" /></label><select aria-label="Filter resource type" value={kind} onChange={(event) => setKind(event.target.value)}><option value="all">All types</option><option value="image">Images</option><option value="audio">Audio</option><option value="video">Video</option><option value="other">Other files</option></select></div>
        {allTags.length > 0 && <div className="library-tag-suggestions"><Tag size={13} />{allTags.slice(0, 10).map((tag) => <button type="button" key={tag} onClick={() => setQuery(tag)}>{tag}</button>)}</div>}
        {filtered.length === 0 ? <div className="library-empty"><div className="library-empty-mark">▧</div><h2>{query ? "No matching resources" : "A home for your creative assets"}</h2><p>{query ? "Try a different search or filter." : "Drop files here to build your reusable library. Everything stays available across your Roleplay Spaces."}</p></div> :
          <div className="resource-grid">{filtered.map((resource) => <button key={resource.id} type="button" className={`resource-card resource-${resource.kind} ${selected?.id === resource.id ? "is-selected" : ""}`} onClick={() => void openPreview(resource)}>
            <div className="resource-card-preview">{resource.kind === "image" && previewUrl && selected?.id === resource.id ? <img src={previewUrl} alt="" /> : iconFor(resource)}<span>{resource.kind.toUpperCase()}</span></div>
            <strong title={resource.fileName}>{resource.name}</strong><small>{(resource.size / 1024 / 1024).toFixed(2)} MB</small><div className="resource-card-tags">{resource.tags.slice(0, 3).map((tag) => <i key={tag}>{tag}</i>)}</div>
          </button>)}</div>}
      </section>
      {selected && <aside className="resource-inspector"><div className="character-editor-top"><span>RESOURCE DETAILS</span><button type="button" onClick={() => { setSelected(null); setPreviewUrl(null); }} aria-label="Close resource details"><X size={16} /></button></div>
        <div className="resource-preview-large">{previewUrl && selected.kind === "image" ? <img src={previewUrl} alt={selected.fileName} /> : previewUrl && selected.kind === "audio" ? <audio controls src={previewUrl} /> : previewUrl && selected.kind === "video" ? <video controls src={previewUrl} /> : iconFor(selected)}</div>
        <h2>{selected.name}</h2><p className="resource-file-name">{selected.fileName}</p><div className="resource-metadata"><span>Type</span><strong>{selected.mimeType || "Unknown"}</strong><span>Size</span><strong>{(selected.size / 1024 / 1024).toFixed(2)} MB</strong></div>
        <label className="character-field"><span>Tags · comma separated</span><input value={tagDraft || selected.tags.join(", ")} onChange={(event) => setTagDraft(event.target.value)} placeholder="Reference, Keira, Background" /></label>
        <button className="library-primary resource-save-tags" type="button" onClick={() => void saveTags()}>Save tags</button>
        <button className="library-danger resource-delete" type="button" onClick={() => void remove(selected)}><Trash2 size={14} /> Delete resource</button>
      </aside>}
    </main>
  </div>;
}
