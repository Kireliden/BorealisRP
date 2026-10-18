import { useEffect, useRef, useState } from "react";
import { load } from "@tauri-apps/plugin-store";
import { Check, ChevronDown, FolderOpen, Plus } from "lucide-react";
import { inspectWorkspace } from "./workspace/workspaceStorage";
import type { WorkspaceInfo } from "./workspace/workspaceTypes";
import "./WorkspaceSwitcher.css";

type RecentWorkspace = {
  path: string;
  name: string;
  id: string;
  lastOpenedAt: string;
};

type Props = {
  activeWorkspace: WorkspaceInfo | null;
  onSelect: (workspace: WorkspaceInfo) => void;
  onAddNew: () => void;
};

const RECENTS_FILE = "recent-workspaces.json";
const RECENTS_KEY = "recentWorkspaces";

async function loadRecentWorkspaces(): Promise<RecentWorkspace[]> {
  const store = await load(RECENTS_FILE, { autoSave: false });
  const saved = await store.get<unknown>(RECENTS_KEY);
  if (!Array.isArray(saved)) return [];
  return saved.filter((item): item is RecentWorkspace =>
    typeof item === "object" && item !== null &&
    typeof (item as RecentWorkspace).path === "string" &&
    typeof (item as RecentWorkspace).name === "string" &&
    typeof (item as RecentWorkspace).id === "string"
  );
}

async function rememberWorkspace(workspace: WorkspaceInfo): Promise<RecentWorkspace[]> {
  const store = await load(RECENTS_FILE, { autoSave: false });
  const saved = await store.get<unknown>(RECENTS_KEY);
  const existing = Array.isArray(saved) ? saved as RecentWorkspace[] : [];
  const next: RecentWorkspace[] = [
    {
      path: workspace.path,
      name: workspace.manifest.name,
      id: workspace.manifest.id,
      lastOpenedAt: new Date().toISOString(),
    },
    ...existing.filter((item) => item && item.path !== workspace.path),
  ].slice(0, 12);
  await store.set(RECENTS_KEY, next);
  await store.save();
  return next;
}

export default function WorkspaceSwitcher({ activeWorkspace, onSelect, onAddNew }: Props) {
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<RecentWorkspace[]>([]);
  const [busyPath, setBusyPath] = useState<string | null>(null);
  const [error, setError] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  async function refreshRecent() {
    try {
      setRecent(await loadRecentWorkspaces());
    } catch {
      setRecent([]);
    }
  }

  useEffect(() => {
    void refreshRecent();
  }, []);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function handleSelect(path: string) {
    setBusyPath(path);
    setError("");
    try {
      const workspace = await inspectWorkspace(path);
      setRecent(await rememberWorkspace(workspace));
      onSelect(workspace);
      setOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      await refreshRecent();
    } finally {
      setBusyPath(null);
    }
  }

  function handleAddNew() {
    setOpen(false);
    setError("");
    onAddNew();
  }

  return (
    <div className="workspace-switcher" ref={rootRef}>
      <button
        className="workspace-button"
        type="button"
        onClick={() => { setOpen((value) => !value); setError(""); }}
        aria-label="Choose workspace"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="workspace-dot" />
        <span className="workspace-button-name">{activeWorkspace?.manifest.name ?? "Choose workspace"}</span>
        <ChevronDown className={open ? "workspace-switcher-chevron open" : "workspace-switcher-chevron"} size={16} />
      </button>

      {open && (
        <div className="workspace-switcher-menu" role="menu" aria-label="Choose workspace">
          <div className="workspace-switcher-heading">YOUR WORKSPACES</div>
          {recent.length ? recent.map((item) => (
            <button
              key={item.path}
              type="button"
              role="menuitem"
              className={activeWorkspace?.path === item.path ? "workspace-switcher-item active" : "workspace-switcher-item"}
              onClick={() => void handleSelect(item.path)}
              disabled={busyPath !== null}
              title={item.path}
            >
              <FolderOpen size={16} />
              <span className="workspace-switcher-item-copy">
                <strong>{item.name}</strong>
                <small>{item.path}</small>
              </span>
              {busyPath === item.path ? <span className="workspace-switcher-spinner" /> : activeWorkspace?.path === item.path ? <Check size={15} className="workspace-switcher-check" /> : null}
            </button>
          )) : (
            <p className="workspace-switcher-empty">No workspaces yet</p>
          )}
          {error && <p className="workspace-switcher-error" role="alert">{error}</p>}
          <div className="workspace-switcher-divider" />
          <button className="workspace-switcher-add" type="button" role="menuitem" onClick={handleAddNew} disabled={busyPath !== null}>
            <Plus size={16} />
            <span>Add new...</span>
          </button>
        </div>
      )}
    </div>
  );
}
