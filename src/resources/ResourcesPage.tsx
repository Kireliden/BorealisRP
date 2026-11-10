import { useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent, type PointerEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open as openFileDialog } from "@tauri-apps/plugin-dialog";
import { ArrowLeft, ChevronRight, Copy, Eye, FileAudio, FileImage, FileVideo, File as FileIcon, Folder, FolderPlus, Info, Move, Search, Tag, Trash2, Upload, X } from "lucide-react";
import { createResourceFolder, deleteResource, exportResourcesForMigration, getResourceBlob, importResources, listResourceFolders, listResources, organiseResources, updateResourceTags } from "./resources.storage";
import { createWorkspaceResourceFolder, deleteWorkspaceResource, getWorkspaceResourceBlob, hasCompletedLegacyResourceMigration, importWorkspaceResources, listWorkspaceResourceFolders, listWorkspaceResources, migrateLegacyResources, organiseWorkspaceResources, updateWorkspaceResourceTags } from "./workspaceResources.storage";
import type { ResourceBatchAction, ResourceFolder, ResourceRecord } from "./resources.types";
import { getCachedResourceObjectUrl, invalidateCachedResourceObjectUrl } from "./resourceMediaCache";
import ResourceFileViewer from "./ResourceFileViewer";
import "./resources.css";

type Props = { onClose: () => void; workspacePath?: string | null };
type NativeDroppedFile = { fileName: string; bytes: number[] };
type ResourceContextMenu = { x: number; y: number; resourceId?: string; folderId?: string };

function mimeTypeFromName(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  const types: Record<string, string> = {
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", bmp: "image/bmp", svg: "image/svg+xml", avif: "image/avif",
    mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", flac: "audio/flac", m4a: "audio/mp4", aac: "audio/aac", opus: "audio/opus",
    mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", mkv: "video/x-matroska",
    pdf: "application/pdf", txt: "text/plain", json: "application/json", zip: "application/zip",
  };
  return types[extension] ?? "application/octet-stream";
}

export default function ResourcesPage({ onClose, workspacePath }: Props) {
  const [resources, setResources] = useState<ResourceRecord[]>([]);
  const [folders, setFolders] = useState<ResourceFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const currentFolderRef = useRef<string | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [bulkDialog, setBulkDialog] = useState<"move" | "copy" | null>(null);
  const [bulkTargetId, setBulkTargetId] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [tagDraft, setTagDraft] = useState("");
  const [selected, setSelected] = useState<ResourceRecord | null>(null);
  const [viewerResource, setViewerResource] = useState<ResourceRecord | null>(null);
  const [contextMenu, setContextMenu] = useState<ResourceContextMenu | null>(null);
  const [localDeletionBusy, setLocalDeletionBusy] = useState(false);
  const [localDeletionNotice, setLocalDeletionNotice] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const [selectionRect, setSelectionRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const dragSelection = useRef<{ startX: number; startY: number; currentX: number; currentY: number; moved: boolean; startedOnCard: boolean } | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const suppressCardClick = useRef(false);
  const [bulkTagDraft, setBulkTagDraft] = useState("");
  const [cardSize, setCardSize] = useState(240);
  const [pendingDelete, setPendingDelete] = useState<ResourceRecord | null>(null);
  const [deleteHasGlobalCopy, setDeleteHasGlobalCopy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    if (workspacePath) {
      // Only read the legacy library once, when a migration is still needed.
      if (!hasCompletedLegacyResourceMigration()) {
        const legacy = await exportResourcesForMigration();
        await migrateLegacyResources(workspacePath, legacy);
      }
      const [records, folderRecords] = await Promise.all([listWorkspaceResources(workspacePath), listWorkspaceResourceFolders(workspacePath)]);
      setResources(records);
      setFolders(folderRecords);
      return;
    }
    const [records, folderRecords] = await Promise.all([listResources(), listResourceFolders()]);
    setResources(records);
    setFolders(folderRecords);
  }
  async function getBlob(id: string) {
    return workspacePath ? getWorkspaceResourceBlob(workspacePath, id) : getResourceBlob(id);
  }
  async function updateTags(id: string, tags: string[]) {
    return workspacePath ? updateWorkspaceResourceTags(workspacePath, id, tags) : updateResourceTags(id, tags);
  }
  async function deleteFile(id: string) {
    return workspacePath ? deleteWorkspaceResource(workspacePath, id) : deleteResource(id);
  }
  useEffect(() => {
    currentFolderRef.current = null;
    setCurrentFolderId(null);
    setSelectedResourceIds([]);
    setSelected(null);
    setViewerResource(null);
    setContextMenu(null);
    setPreviewUrl(null);
    void refresh().catch((reason) => setError(reason instanceof Error ? reason.message : String(reason)));
  }, [workspacePath]);
  useEffect(() => {
    let cancelled = false;
    const scope = workspacePath ?? "__global__";
    const imageResources = resources.filter((item) => item.kind === "image");
    void Promise.all(imageResources.map(async (item) => {
      const url = await getCachedResourceObjectUrl(scope, item.id, () => getBlob(item.id));
      return url ? [`${scope}::${item.id}`, url] as const : null;
    })).then((created) => {
      if (cancelled) return;
      const urls = created.flatMap((item) => item === null ? [] : [item]);
      setThumbnailUrls((current) => ({ ...current, ...Object.fromEntries(urls) }));
    }).catch((reason) => setError(reason instanceof Error ? reason.message : String(reason)));
    return () => { cancelled = true; };
  }, [resources, workspacePath]);

  const allTags = useMemo(() => [...new Set(resources.flatMap((resource) => resource.tags))].sort(), [resources]);
  const filtered = resources.filter((resource) => (resource.folderId ?? null) === currentFolderId && (kind === "all" || resource.kind === kind) && [resource.name, resource.fileName, ...resource.tags].join(" ").toLowerCase().includes(query.toLowerCase()));
  const visibleFolders = folders.filter((folder) => folder.parentId === currentFolderId).sort((a, b) => a.name.localeCompare(b.name));
  const sortedFolders = [...folders].sort((a, b) => folderLabel(a.id).localeCompare(folderLabel(b.id)));
  const breadcrumbs: ResourceFolder[] = [];
  let breadcrumbId = currentFolderId;
  for (let index = 0; index < folders.length && breadcrumbId; index++) {
    const folder = folders.find((item) => item.id === breadcrumbId);
    if (!folder) break;
    breadcrumbs.unshift(folder);
    breadcrumbId = folder.parentId;
  }
  const filteredIds = filtered.map((resource) => resource.id);
  const selectedVisibleCount = filteredIds.filter((id) => selectedResourceIds.includes(id)).length;
  const allVisibleSelected = filteredIds.length > 0 && selectedVisibleCount === filteredIds.length;
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = selectedVisibleCount > 0 && !allVisibleSelected;
  }, [selectedVisibleCount, allVisibleSelected]);

  function folderLabel(id: string): string {
    const parts: string[] = [];
    let current: string | null = id;
    for (let index = 0; index < folders.length && current; index++) {
      const folder = folders.find((item) => item.id === current);
      if (!folder) break;
      parts.unshift(folder.name);
      current = folder.parentId;
    }
    return parts.join(" / ");
  }
  function openFolder(id: string | null) {
    currentFolderRef.current = id;
    setCurrentFolderId(id);
    setSelectedResourceIds([]);
    setSelected(null);
    setViewerResource(null);
    setContextMenu(null);
    setPreviewUrl(null);
    setQuery("");
    setCreatingFolder(false);
  }
  async function createFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!folderName.trim()) return;
    setError("");
    try {
      if (workspacePath) await createWorkspaceResourceFolder(workspacePath, folderName, currentFolderId);
      else await createResourceFolder(folderName, currentFolderId);
      setFolderName("");
      setCreatingFolder(false);
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
  }
  function showBulkDialog(action: "move" | "copy") {
    setBulkTargetId(currentFolderId);
    setBulkDialog(action);
  }
  async function applyBulk(action: ResourceBatchAction, target: string | null = null) {
    if (!selectedResourceIds.length || bulkBusy) return;
    setBulkBusy(true);
    setError("");
    const ids = [...selectedResourceIds];
    try {
      if (workspacePath) await organiseWorkspaceResources(workspacePath, ids, action, target);
      else await organiseResources(ids, action, target);
      if (action === "delete") {
        await Promise.all(ids.map((id) => invalidateCachedResourceObjectUrl(workspacePath ?? "__global__", id)));
        if (selected && ids.includes(selected.id)) { setSelected(null); setPreviewUrl(null); }
        if (viewerResource && ids.includes(viewerResource.id)) setViewerResource(null);
      }
      setSelectedResourceIds([]);
      setBulkDialog(null);
      setConfirmBulkDelete(false);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      setSelectedResourceIds([]);
      setBulkDialog(null);
      setConfirmBulkDelete(false);
      await refresh().catch(() => undefined);
    } finally {
      setBulkBusy(false);
    }
  }

  function updateSelectionRect(clientX: number, clientY: number) {
    const area = document.querySelector<HTMLElement>(".resources-main");
    if (!area || !dragSelection.current) return;
    const bounds = area.getBoundingClientRect();
    const drag = dragSelection.current;
    const left = Math.min(drag.startX, clientX) - bounds.left + area.scrollLeft;
    const top = Math.min(drag.startY, clientY) - bounds.top + area.scrollTop;
    setSelectionRect({ left, top, width: Math.abs(clientX - drag.startX), height: Math.abs(clientY - drag.startY) });
  }
  function handleGridPointerDown(event: PointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    suppressCardClick.current = false;
    const target = event.target;
    if (target instanceof Element && target.closest(".resource-inspector, .resource-select, .resource-folder-navigation, .resource-create-folder, .resource-folders, .resource-bulk-tools, .resource-delete-backdrop, input, select, textarea, a, [contenteditable=true], button:not(.resource-card)")) return;
    dragSelection.current = { startX: event.clientX, startY: event.clientY, currentX: event.clientX, currentY: event.clientY, moved: false, startedOnCard: target instanceof Element && Boolean(target.closest(".resource-card")) };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function handleGridPointerMove(event: PointerEvent<HTMLElement>) {
    const drag = dragSelection.current;
    if (!drag) return;
    drag.currentX = event.clientX;
    drag.currentY = event.clientY;
    if (Math.abs(drag.currentX - drag.startX) + Math.abs(drag.currentY - drag.startY) < 5) return;
    drag.moved = true;
    event.preventDefault();
    updateSelectionRect(event.clientX, event.clientY);
  }
  function handleGridPointerUp(event: PointerEvent<HTMLElement>) {
    const drag = dragSelection.current;
    if (!drag) return;
    if (drag.moved) {
      const selection = {
        left: Math.min(drag.startX, drag.currentX), right: Math.max(drag.startX, drag.currentX),
        top: Math.min(drag.startY, drag.currentY), bottom: Math.max(drag.startY, drag.currentY),
      };
      const area = event.currentTarget;
      const intersectingIds = Array.from(area.querySelectorAll<HTMLElement>(".resource-card-shell")).filter((card) => {
        const rect = card.getBoundingClientRect();
        return rect.left < selection.right && rect.right > selection.left && rect.top < selection.bottom && rect.bottom > selection.top;
      }).map((card) => card.dataset.resourceId).filter((id): id is string => Boolean(id));
      if (intersectingIds.length) setSelectedResourceIds((current) => [...new Set([...current, ...intersectingIds])]);
      if (drag.startedOnCard) suppressCardClick.current = true;
    } else {
      const target = event.target;
      if (!drag.startedOnCard && (!(target instanceof Element) || !target.closest(".resource-card-shell, .resource-folders, .resource-folder-navigation, .resource-create-folder, .resource-inspector, .resource-bulk-tools, .resource-select-all, .resource-controls, .resource-dropzone, .library-heading-row, .library-eyebrow, .library-tag-suggestions, .resource-grid button, button, input, select, textarea, label"))) {
        setSelectedResourceIds([]);
      }
    }
    dragSelection.current = null;
    setSelectionRect(null);
  }

  async function addNativePaths(paths: string[]) {
    setError("");
    try {
      const droppedFiles = await invoke<NativeDroppedFile[]>("read_dropped_resource_files", { paths });
      const files = droppedFiles.map((dropped) => {
        const buffer = new ArrayBuffer(dropped.bytes.length);
        new Uint8Array(buffer).set(dropped.bytes);
        return new File([buffer], dropped.fileName, { type: mimeTypeFromName(dropped.fileName) });
      });
      if (workspacePath) await importWorkspaceResources(workspacePath, files, [], currentFolderRef.current);
      else await importResources(files, [], currentFolderRef.current);
      if (files.length) await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  }

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void getCurrentWindow().onDragDropEvent((event) => {
      if (event.payload.type === "enter" || event.payload.type === "over") {
        setDragging(true);
      } else if (event.payload.type === "leave") {
        setDragging(false);
      } else if (event.payload.type === "drop") {
        setDragging(false);
        if (event.payload.paths.length) void addNativePaths(event.payload.paths);
      }
    }).then((stopListening) => {
      if (disposed) stopListening();
      else unlisten = stopListening;
    }).catch((reason) => setError(reason instanceof Error ? reason.message : String(reason)));
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  async function addFiles(files: FileList | File[]) {
    setError("");
    try {
      const batch = Array.from(files);
      if (workspacePath) await importWorkspaceResources(workspacePath, batch, [], currentFolderRef.current);
      else await importResources(batch, [], currentFolderRef.current);
      if (batch.length) await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
  }
  async function openPreview(resource: ResourceRecord) {
    setContextMenu(null);
    setSelected(resource);
    setTagDraft(resource.tags.join(", "));
    const url = await getCachedResourceObjectUrl(
      workspacePath ?? "__global__",
      resource.id,
      () => getBlob(resource.id),
    );
    setPreviewUrl(url);
  }
  async function saveTags() {
    if (!selected) return;
    await updateTags(selected.id, tagDraft.split(",").map((tag) => tag.trim()).filter(Boolean));
    await refresh();
    setSelected((current) => current ? { ...current, tags: tagDraft.split(",").map((tag) => tag.trim()).filter(Boolean) } : null);
  }
  async function requestDelete(resource: ResourceRecord) {
    setContextMenu(null);
    setLocalDeletionNotice("");
    setDeleteHasGlobalCopy(false);
    if (workspacePath) {
      try {
        const globalResources = await listResources();
        setDeleteHasGlobalCopy(globalResources.some((item) => item.id === resource.id));
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : String(reason));
      }
    }
    setPendingDelete(resource);
  }
  async function remove(resource: ResourceRecord, includeGlobalCopy = false) {
    setDeleting(true);
    setError("");
    try {
      await deleteFile(resource.id);
      if (workspacePath && includeGlobalCopy) await deleteResource(resource.id);
      await invalidateCachedResourceObjectUrl(workspacePath ?? "__global__", resource.id);
      if (selected?.id === resource.id) { setSelected(null); setPreviewUrl(null); }
      if (viewerResource?.id === resource.id) setViewerResource(null);
      setSelectedResourceIds((current) => current.filter((id) => id !== resource.id));
      setPendingDelete(null);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      await refresh().catch(() => undefined);
    } finally {
      setDeleting(false);
    }
  }
  function openFileViewer(resource: ResourceRecord) {
    setContextMenu(null);
    setViewerResource(resource);
  }

  function showResourceContextMenu(event: MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest(".resource-viewer-backdrop, .resource-delete-backdrop, .resource-context-menu")) return;
    const resourceId = target.closest<HTMLElement>(".resource-card-shell")?.dataset.resourceId;
    const folderId = target.closest<HTMLElement>(".resource-folder-card")?.dataset.folderId;
    if (resourceId && !selectedResourceIds.includes(resourceId)) setSelectedResourceIds([resourceId]);
    const width = 224;
    const height = resourceId ? 292 : folderId ? 108 : 108;
    setContextMenu({
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - width - 8)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - height - 8)),
      resourceId,
      folderId,
    });
  }

  useEffect(() => {
    if (!contextMenu) return;
    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setContextMenu(null);
    }
    window.addEventListener("keydown", dismissOnEscape);
    return () => window.removeEventListener("keydown", dismissOnEscape);
  }, [contextMenu]);

  async function deleteMatchingLocalOriginal(resource: ResourceRecord) {
    setLocalDeletionNotice("");
    setError("");
    setLocalDeletionBusy(true);
    try {
      const choice = await openFileDialog({
        title: `Choose the original of "${resource.fileName}" to delete`,
        multiple: false,
        directory: false,
      });
      if (typeof choice !== "string") return;
      const blob = await getBlob(resource.id);
      if (!blob) throw new Error("BRD's copy of this resource could not be read.");
      const bytes = await blob.arrayBuffer();
      const fingerprint = await crypto.subtle.digest("SHA-256", bytes);
      const expectedSha256 = Array.from(new Uint8Array(fingerprint), (value) => value.toString(16).padStart(2, "0")).join("");
      if (!window.confirm(`Permanently delete this file from your device?\n\n${choice}\n\nBRD will verify that it matches the imported copy. The copy inside BRD will be kept.`)) return;
      await invoke("delete_confirmed_original_resource_file", {
        path: choice,
        expectedFileName: resource.fileName,
        expectedSize: resource.size,
        expectedSha256,
      });
      setLocalDeletionNotice("Matching original deleted from your device. The copy in BRD is still available.");
    } catch (reason) {
      setLocalDeletionNotice(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setLocalDeletionBusy(false);
    }
  }

  function toggleResourceSelection(id: string) {
    setSelectedResourceIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }
  async function addTagsToSelected() {
    const additions = bulkTagDraft.split(",").map((tag) => tag.trim()).filter(Boolean);
    if (!selectedResourceIds.length || !additions.length) return;
    setError("");
    try {
      for (const id of selectedResourceIds) {
        const resource = resources.find((item) => item.id === id);
        if (!resource) continue;
        const merged = [...resource.tags, ...additions].filter((tag, index, tags) => tags.findIndex((other) => other.toLocaleLowerCase() === tag.toLocaleLowerCase()) === index);
        await updateTags(id, merged);
      }
      setBulkTagDraft("");
      setSelectedResourceIds([]);
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
  }
  function iconFor(resource: ResourceRecord) {
    if (resource.kind === "image") return <FileImage size={20} />;
    if (resource.kind === "audio") return <FileAudio size={20} />;
    if (resource.kind === "video") return <FileVideo size={20} />;
    return <FileIcon size={20} />;
  }

  return <div className="library-overlay" onContextMenu={showResourceContextMenu}>
    <header className="library-topbar">
      <button className="library-back" onClick={onClose} type="button"><ArrowLeft size={16} /> Back to Workspace</button>
      <div className="library-brand"><strong>Resources</strong></div>
      <button className="library-close" onClick={onClose} type="button" aria-label="Close Resources"><X size={18} /></button>
    </header>
    <main className="resources-layout">
      <section className="resources-main" onPointerDown={handleGridPointerDown} onPointerMove={handleGridPointerMove} onPointerUp={handleGridPointerUp} onPointerCancel={handleGridPointerUp}>
        <div className="resources-library-content">
        <div className="library-eyebrow">{workspacePath ? "WORKSPACE LIBRARY" : "GLOBAL ATELIER"} · {resources.length.toString().padStart(2, "0")} ASSETS</div>
        <div className="library-heading-row"><div><h1>Resources</h1><p>One visual library for every story, scene and character.</p></div><div className="resource-heading-actions"><button className="resource-new-folder-button" type="button" onClick={() => setCreatingFolder((value) => !value)}><FolderPlus size={16} /> New folder</button><button className="library-primary" type="button" onClick={() => inputRef.current?.click()}><Upload size={16} /> Import files</button></div></div>
        <input ref={inputRef} type="file" multiple hidden onChange={(event) => { if (event.target.files) void addFiles(event.target.files); event.currentTarget.value = ""; }} />
        <div className={`resource-dropzone ${dragging ? "is-dragging" : ""}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }} onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); if (event.dataTransfer.files.length) void addFiles(event.dataTransfer.files); }}><Upload size={19} /><div><strong>Drop anything you want to keep close</strong><span>Images, audio, video and other files · stored in this app's local library</span></div><button type="button" onClick={() => inputRef.current?.click()}>Browse files</button></div>
        {error && <p className="resource-error">{error}</p>}
        <div className="resource-controls"><label className="library-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search files and tags…" /></label><select aria-label="Filter resource type" value={kind} onChange={(event) => setKind(event.target.value)}><option value="all">All types</option><option value="image">Images</option><option value="audio">Audio</option><option value="video">Video</option><option value="other">Other files</option></select><label className="resource-size-control" title={`Thumbnail size: ${cardSize}px`}><span>Size</span><input type="range" min="140" max="420" step="20" value={cardSize} onChange={(event) => setCardSize(Number(event.target.value))} aria-label="Thumbnail size" /><output>{cardSize}px</output></label></div>
        <div className="resource-folder-navigation">
          <nav aria-label="Resource folders" className="resource-breadcrumbs">
            <button type="button" onClick={() => openFolder(null)}>Library</button>
            {breadcrumbs.map((folder) => <span key={folder.id}><ChevronRight size={13} /><button type="button" onClick={() => openFolder(folder.id)}>{folder.name}</button></span>)}
          </nav>
          <span>{visibleFolders.length} folders · {resources.filter((resource) => (resource.folderId ?? null) === currentFolderId).length} files</span>
        </div>
        {creatingFolder && <form className="resource-create-folder" onSubmit={(event) => void createFolder(event)}>
          <FolderPlus size={16} />
          <input autoFocus value={folderName} onChange={(event) => setFolderName(event.target.value)} placeholder="Folder name" maxLength={80} aria-label="New folder name" />
          <button type="submit" className="library-primary" disabled={!folderName.trim()}>Create</button>
          <button type="button" onClick={() => { setCreatingFolder(false); setFolderName(""); }}>Cancel</button>
        </form>}
        {allTags.length > 0 && <div className="library-tag-suggestions"><Tag size={13} />{allTags.slice(0, 10).map((tag) => <button type="button" key={tag} onClick={() => setQuery(tag)}>{tag}</button>)}</div>}
        {filtered.length > 0 && <label className="resource-select-all"><input ref={selectAllRef} type="checkbox" checked={allVisibleSelected} onChange={(event) => setSelectedResourceIds((current) => event.target.checked ? [...new Set([...current, ...filteredIds])] : current.filter((id) => !filteredIds.includes(id)))} /> Select all visible ({filtered.length})</label>}
        {selectedResourceIds.length > 0 && <div className="resource-bulk-tools"><div><strong>{selectedResourceIds.length} selected</strong><button type="button" onClick={() => setSelectedResourceIds([])}>Clear selection</button></div><label><Tag size={14} /><input value={bulkTagDraft} onChange={(event) => setBulkTagDraft(event.target.value)} placeholder="Add tags, comma separated" aria-label="Tags to add to selected resources" /></label><button type="button" className="library-primary" onClick={() => void addTagsToSelected()} disabled={!bulkTagDraft.split(",").some((tag) => tag.trim())}>Add tags</button><div className="resource-bulk-actions"><button type="button" onClick={() => showBulkDialog("move")}><Move size={14} /> Move</button><button type="button" onClick={() => showBulkDialog("copy")}><Copy size={14} /> Copy</button><button type="button" className="resource-bulk-delete" onClick={() => setConfirmBulkDelete(true)}><Trash2 size={14} /> Delete</button></div></div>}
        {visibleFolders.length > 0 && <div className="resource-folders">{visibleFolders.map((folder) => <button type="button" className="resource-folder-card" data-folder-id={folder.id} key={folder.id} onClick={() => openFolder(folder.id)}><Folder size={27} /><span title={folder.name}>{folder.name}</span><ChevronRight size={15} /></button>)}</div>}
        {filtered.length === 0 && visibleFolders.length === 0 ? <div className="library-empty"><div className="library-empty-mark">▧</div><h2>{query ? "No matching resources" : "A home for your creative assets"}</h2><p>{query ? "Try a different search or filter." : "Drop files here to build your reusable library. Everything stays available across your Roleplay Spaces."}</p></div> :
          filtered.length > 0 ? <div className="resource-grid" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(${cardSize}px, 100%), 1fr))` }}>{filtered.map((resource) => <div key={resource.id} data-resource-id={resource.id} className="resource-card-shell">
            <label className="resource-select" title={`Select ${resource.fileName}`}><input type="checkbox" checked={selectedResourceIds.includes(resource.id)} onChange={() => toggleResourceSelection(resource.id)} aria-label={`Select ${resource.fileName}`} /></label>
            <button type="button" className="resource-card-delete" title={`Delete ${resource.fileName}`} aria-label={`Delete ${resource.fileName}`} onClick={(event) => { event.stopPropagation(); void requestDelete(resource); }}><Trash2 size={14} /></button>
            <button type="button" className={`resource-card resource-${resource.kind} ${selected?.id === resource.id ? "is-selected" : ""}`} onClick={() => { if (suppressCardClick.current) { suppressCardClick.current = false; return; } openFileViewer(resource); }}>
              <div className="resource-card-preview">{resource.kind === "image" && thumbnailUrls[`${workspacePath ?? "__global__"}::${resource.id}`] ? <img src={thumbnailUrls[`${workspacePath ?? "__global__"}::${resource.id}`]} alt="" /> : iconFor(resource)}<span>{resource.kind.toUpperCase()}</span></div><div className="resource-card-info"><strong title={resource.fileName}>{resource.name}</strong><small>{(resource.size / 1024 / 1024).toFixed(2)} MB</small><div className="resource-card-tags">{resource.tags.slice(0, 3).map((tag) => <i key={tag}>{tag}</i>)}</div></div>
            </button>
          </div> )}</div> : null}
        </div>
        {selectionRect && <div className="resource-selection-rectangle" style={selectionRect} />}
      {selected && <aside className="resource-inspector"><div className="character-editor-top"><span>RESOURCE DETAILS</span><button type="button" onClick={() => { setSelected(null); setPreviewUrl(null); }} aria-label="Close resource details"><X size={16} /></button></div>
        <div className="resource-preview-large">{previewUrl && selected.kind === "image" ? <img src={previewUrl} alt={selected.fileName} /> : previewUrl && selected.kind === "audio" ? <audio controls src={previewUrl} /> : previewUrl && selected.kind === "video" ? <video controls src={previewUrl} /> : iconFor(selected)}</div>
        <h2>{selected.name}</h2><p className="resource-file-name">{selected.fileName}</p><div className="resource-metadata"><span>Type</span><strong>{selected.mimeType || "Unknown"}</strong><span>Size</span><strong>{(selected.size / 1024 / 1024).toFixed(2)} MB</strong></div>
        <label className="character-field"><span>Tags · comma separated</span><input value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} placeholder="Reference, Keira, Background" /></label>
        <button className="library-primary resource-save-tags" type="button" onClick={() => void saveTags()}>Save tags</button>
        <button className="library-danger resource-delete" type="button" onClick={() => void requestDelete(selected)}><Trash2 size={14} /> Delete resource</button>
      </aside>}

      {pendingDelete && <div className="resource-delete-backdrop" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget && !deleting) setPendingDelete(null); }}>
        <section className="resource-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="resource-delete-title">
          <div className="resource-delete-dialog-icon"><Trash2 size={18} /></div>
          <h2 id="resource-delete-title">Delete resource?</h2>
          <p><strong>{pendingDelete.fileName}</strong> will be permanently removed from the selected library location.</p>
          {workspacePath ? <>
            <button type="button" className="library-primary" disabled={deleting} onClick={() => void remove(pendingDelete, false)}>Only this workspace</button>
            {deleteHasGlobalCopy && <button type="button" className="library-danger" disabled={deleting} onClick={() => void remove(pendingDelete, true)}>This workspace and the app-wide library</button>}
          </> : <button type="button" className="library-danger" disabled={deleting} onClick={() => void remove(pendingDelete, false)}>Delete from app-wide library</button>}
          <button type="button" className="resource-delete-cancel" disabled={deleting} onClick={() => setPendingDelete(null)}>Cancel</button>
        </section>
      </div>}

      {bulkDialog && <div className="resource-delete-backdrop" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget && !bulkBusy) setBulkDialog(null); }}>
        <section className="resource-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="resource-organise-title">
          <div className="resource-delete-dialog-icon">{bulkDialog === "move" ? <Move size={18} /> : <Copy size={18} />}</div>
          <h2 id="resource-organise-title">{bulkDialog === "move" ? "Move" : "Copy"} {selectedResourceIds.length} selected files</h2>
          <p>Choose a destination folder in {workspacePath ? "this workspace" : "the app-wide library"}. {bulkDialog === "copy" ? "Original files will be kept." : "Files will be reorganised without changing their original imports."}</p>
          <label className="resource-dialog-folder-label">Destination folder
            <select value={bulkTargetId ?? ""} onChange={(event) => setBulkTargetId(event.target.value || null)}>
              <option value="">Library root</option>
              {sortedFolders.map((folder) => <option value={folder.id} key={folder.id}>{folderLabel(folder.id)}</option>)}
            </select>
          </label>
          <button type="button" className="library-primary" disabled={bulkBusy} onClick={() => void applyBulk(bulkDialog, bulkTargetId)}>{bulkDialog === "move" ? "Move files" : "Copy files"}</button>
          <button type="button" className="resource-delete-cancel" disabled={bulkBusy} onClick={() => setBulkDialog(null)}>Cancel</button>
        </section>
      </div>}
      {confirmBulkDelete && <div className="resource-delete-backdrop" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget && !bulkBusy) setConfirmBulkDelete(false); }}>
        <section className="resource-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="resource-bulk-delete-title">
          <div className="resource-delete-dialog-icon"><Trash2 size={18} /></div>
          <h2 id="resource-bulk-delete-title">Delete {selectedResourceIds.length} selected files?</h2>
          <p>These files will be removed from {workspacePath ? "this workspace library" : "the app-wide library"}. Other workspaces and your original files on the PC will not be affected.</p>
          <button type="button" className="library-danger" disabled={bulkBusy} onClick={() => void applyBulk("delete")}><Trash2 size={14} /> Delete selected files</button>
          <button type="button" className="resource-delete-cancel" disabled={bulkBusy} onClick={() => setConfirmBulkDelete(false)}>Cancel</button>
        </section>
      </div>}
      </section>
    </main>
  </div>;
}
