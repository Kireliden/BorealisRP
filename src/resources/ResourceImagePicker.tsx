import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, Folder, Image as ImageIcon, Search, X } from "lucide-react";
import { listResources, listResourceFolders, getResourceBlob } from "./resources.storage";
import { listWorkspaceResources, listWorkspaceResourceFolders, getWorkspaceResourceBlob } from "./workspaceResources.storage";
import { getCachedResourceObjectUrl } from "./resourceMediaCache";
import type { ResourceFolder, ResourceRecord } from "./resources.types";
import "./resourceImagePicker.css";

type Props = {
  workspacePath?: string | null;
  multiple?: boolean;
  title?: string;
  onCancel: () => void;
  onChoose: (resources: ResourceRecord[]) => void | Promise<void>;
};

/**
 * Shared image selector for the current Resources vault.
 * Consumers get resource metadata and may create their own independent snapshots.
 * No files are moved, renamed or deleted by this picker.
 */
export default function ResourceImagePicker({
  workspacePath, multiple = false, title = "Choose from Resources", onCancel, onChoose,
}: Props) {
  const [resources, setResources] = useState<ResourceRecord[]>([]);
  const [folders, setFolders] = useState<ResourceFolder[]>([]);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scope = workspacePath ?? "__global__";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const loadLibrary = workspacePath
      ? Promise.all([listWorkspaceResources(workspacePath), listWorkspaceResourceFolders(workspacePath)])
      : Promise.all([listResources(), listResourceFolders()]);
    void loadLibrary.then(([files, directories]) => {
        if (cancelled) return;
        setResources(files.filter((item) => item.kind === "image"));
        setFolders(directories);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [workspacePath]);

  const visible = useMemo(() => {
    const searched = query.trim().toLocaleLowerCase();
    return resources.filter((item) => searched
      ? [item.name, item.fileName, ...item.tags].join(" ").toLocaleLowerCase().includes(searched)
      : (item.folderId ?? null) === folderId)
      .sort((a, b) => a.fileName.localeCompare(b.fileName));
  }, [resources, query, folderId]);

  const visibleFolders = useMemo(() => folders.filter((item) => !query.trim() && item.parentId === folderId)
    .sort((a, b) => a.name.localeCompare(b.name)), [folders, query, folderId]);
  const breadcrumbs: ResourceFolder[] = [];
  let nextId = folderId;
  for (let i = 0; i < folders.length && nextId; i++) {
    const match = folders.find((item) => item.id === nextId);
    if (!match) break;
    breadcrumbs.unshift(match);
    nextId = match.parentId;
  }

  useEffect(() => {
    let cancelled = false;
    void Promise.all(visible.map(async (resource) => {
      const url = await getCachedResourceObjectUrl(scope, resource.id, () => workspacePath
        ? getWorkspaceResourceBlob(workspacePath, resource.id)
        : getResourceBlob(resource.id));
      return [resource.id, url] as const;
    })).then((entries) => {
      if (!cancelled) setThumbnails((current) => ({
        ...current, ...Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => Boolean(entry[1]))),
      }));
    }).catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason)); });
    return () => { cancelled = true; };
  }, [scope, workspacePath, visible]);

  useEffect(() => {
    function keyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        event.stopPropagation();
        onCancel();
      }
    }
    window.addEventListener("keydown", keyDown);
    return () => window.removeEventListener("keydown", keyDown);
  }, [onCancel, busy]);

  function toggle(id: string) {
    setSelectedIds((current) => multiple
      ? current.includes(id) ? current.filter((item) => item !== id) : current.length >= 6 ? current : [...current, id]
      : [id]);
  }

  async function useSelection() {
    if (!selectedIds.length || busy) return;
    setBusy(true);
    setError("");
    try {
      await onChoose(selectedIds.map((id) => resources.find((item) => item.id === id)).filter((item): item is ResourceRecord => Boolean(item)));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally { setBusy(false); }
  }

  return <div className="resource-image-picker-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
    <section className="resource-image-picker" role="dialog" aria-modal="true" aria-label={title}>
      <header className="resource-image-picker-header">
        <div><small>{workspacePath ? "WORKSPACE VAULT" : "GLOBAL RESOURCES"}</small><h2>{title}</h2></div>
        <button type="button" onClick={onCancel} disabled={busy} aria-label="Close resource picker"><X size={18} /></button>
      </header>
      <div className="resource-image-picker-toolbar">
        <label><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search images and tags…" autoFocus /></label>
        <span>{selectedIds.length} selected{multiple ? " · up to six expressions" : ""}</span>
      </div>
      <nav className="resource-image-picker-path" aria-label="Resource folder">
        <button type="button" onClick={() => setFolderId(null)}>Resources</button>
        {breadcrumbs.map((folder) => <span key={folder.id}><ChevronRight size={13} /><button type="button" onClick={() => setFolderId(folder.id)}>{folder.name}</button></span>)}
      </nav>
      <div className="resource-image-picker-scroll">
        {error && <p className="resource-image-picker-error" role="alert">{error}</p>}
        {loading ? <p className="resource-image-picker-empty">Loading workspace images…</p> : <>
          {visibleFolders.length > 0 && <div className="resource-image-picker-folders">{visibleFolders.map((folder) => <button type="button" key={folder.id} onClick={() => setFolderId(folder.id)}><Folder size={19} /><span>{folder.name}</span><ChevronRight size={14} /></button>)}</div>}
          {visible.length > 0 ? <div className="resource-image-picker-grid">
            {visible.map((resource) => {
              const selected = selectedIds.includes(resource.id);
              return <button type="button" className={`resource-image-picker-tile ${selected ? "is-selected" : ""}`} key={resource.id}
                aria-pressed={selected} onClick={() => toggle(resource.id)} title={resource.fileName}>
                <span className="resource-image-picker-image">{thumbnails[resource.id] ? <img src={thumbnails[resource.id]} alt="" loading="lazy" /> : <ImageIcon size={26} />}
                  {selected && <i><Check size={14} /></i>}
                </span>
                <strong>{resource.name}</strong><small>{(resource.size / 1024 / 1024).toFixed(2)} MB</small>
              </button>;
            })}
          </div> : visibleFolders.length === 0 && <div className="resource-image-picker-empty"><ImageIcon size={24} /><p>{query ? "No matching images." : "No images here yet."}</p><small>Import images in Resources to make them available to your characters.</small></div>}
        </>}
      </div>
      <footer className="resource-image-picker-footer">
        <span>The selected image is copied into its destination. Removing it from Resources later will not break a saved portrait or message.</span>
        <button type="button" className="resource-image-picker-cancel" disabled={busy} onClick={onCancel}>Cancel</button>
        <button type="button" className="resource-image-picker-use" disabled={busy || !selectedIds.length} onClick={() => void useSelection()}>{busy ? "Loading…" : multiple ? `Use selected images (${selectedIds.length})` : "Use image"}</button>
      </footer>
    </section>
  </div>;
}
