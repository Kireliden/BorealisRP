import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { load } from "@tauri-apps/plugin-store";
import { Check, ChevronDown, Plus } from "lucide-react";
import { inspectWorkspace } from "./workspace/workspaceStorage";
import { getWorkspaceIcon } from "./workspace/workspaceIcons";
import { StudioIcon } from "./ui/StudioIconPicker";
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
  icon?: string;
  compact?: boolean;
  /** Increment to open the existing workspace list from an external menu. */
  openRequest?: number;
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

export default function WorkspaceSwitcher({ activeWorkspace, onSelect, onAddNew, icon, compact, openRequest = 0 }: Props) {
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<RecentWorkspace[]>([]);
  const [recentIcons, setRecentIcons] = useState<Record<string, string>>({});
  const [busyPath, setBusyPath] = useState<string | null>(null);
  const [error, setError] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const lastOpenRequest = useRef(openRequest);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 296 });
  const positionMenu = () => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(330, window.innerWidth - 16);
    setMenuPosition({
      top: Math.min(rect.bottom + 6, window.innerHeight - 70),
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      width,
    });
  };

  async function refreshRecent() {
    try {
      setRecent(await loadRecentWorkspaces());
    } catch {
      setRecent([]);
    }
  }

  useEffect(() => {
    void refreshRecent();
  }, [activeWorkspace?.path]);

  useEffect(() => {
    let stopped = false;
    void Promise.all(recent.map(async (item) =>
      [item.id, await getWorkspaceIcon(item.id)] as const))
      .then((entries) => { if (!stopped) setRecentIcons(Object.fromEntries(entries)); })
      .catch(() => { /* Icons are cosmetic; keep defaults if storage is unavailable. */ });
    return () => { stopped = true; };
  }, [recent]);

  useEffect(() => {
    if (activeWorkspace && icon) {
      setRecentIcons((current) => ({ ...current, [activeWorkspace.manifest.id]: icon }));
    }
  }, [activeWorkspace?.manifest.id, icon]);

  useEffect(() => {
    if (openRequest === lastOpenRequest.current) return;
    lastOpenRequest.current = openRequest;
    positionMenu();
    setError("");
    setOpen(true);
    void refreshRecent();
  // This is driven by a user action in the header icon menu, not polling.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRequest]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", positionMenu);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", positionMenu);
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
    <div className={`workspace-switcher ${compact ? "is-compact" : ""}`} ref={rootRef}>
      <button
        className="workspace-button"
        type="button"
        onClick={() => { const nextOpen = !open; if (nextOpen) positionMenu(); setOpen(nextOpen); setError(""); if (nextOpen) void refreshRecent(); }}
        aria-label="Choose workspace"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <StudioIcon value={icon} />
        <span className="workspace-button-name">{activeWorkspace?.manifest.name ?? "Choose workspace"}</span>
        <ChevronDown className={open ? "workspace-switcher-chevron open" : "workspace-switcher-chevron"} size={16} />
      </button>

      {open && createPortal(
        <div ref={menuRef} className="workspace-switcher-menu" role="menu" aria-label="Choose workspace"
          style={{ position: "fixed", top: menuPosition.top, left: menuPosition.left,
            width: menuPosition.width, maxHeight: "min(70vh, 500px)", overflowY: "auto", zIndex: 32000 }}>
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
              <StudioIcon value={recentIcons[item.id] ?? "📁"} />
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
        </div>, document.body,
      )}
    </div>
  );
}
