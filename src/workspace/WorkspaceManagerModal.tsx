import { useEffect, useState, type FormEvent } from "react";
import { open as openFolderDialog } from "@tauri-apps/plugin-dialog";
import { load } from "@tauri-apps/plugin-store";
import { FolderOpen, FolderPlus, Trash2, X } from "lucide-react";
import { createWorkspace, inspectWorkspace } from "./workspaceStorage";
import type { WorkspaceInfo } from "./workspaceTypes";
import "./WorkspaceManagerModal.css";

type RecentWorkspace = {
  path: string;
  name: string;
  id: string;
  lastOpenedAt: string;
};

type Props = {
  onClose: () => void;
  onSelect: (workspace: WorkspaceInfo) => void;
  activeWorkspace: WorkspaceInfo | null;
};

const RECENTS_FILE = "recent-workspaces.json";
const RECENTS_KEY = "recentWorkspaces";

async function saveRecentWorkspace(workspace: WorkspaceInfo): Promise<RecentWorkspace[]> {
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

export default function WorkspaceManagerModal({ onClose, onSelect, activeWorkspace }: Props) {
  const [workspaceName, setWorkspaceName] = useState("");
  const [recent, setRecent] = useState<RecentWorkspace[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<"home" | "create">("home");

  useEffect(() => {
    let cancelled = false;
    loadRecentWorkspaces()
      .then((items) => { if (!cancelled) setRecent(items); })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => { cancelled = true; };
  }, []);

  async function rememberAndSelect(workspace: WorkspaceInfo) {
    const next = await saveRecentWorkspace(workspace);
    setRecent(next);
    onSelect(workspace);
    onClose();
  }

  async function handleOpenWorkspace() {
    setError("");
    try {
      const selected = await openFolderDialog({
        directory: true,
        multiple: false,
        title: "Open a Borealis Roleplay Den workspace",
      });
      if (typeof selected !== "string") return;
      setBusy(true);
      const workspace = await inspectWorkspace(selected);
      await rememberAndSelect(workspace);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const name = workspaceName.trim();
    if (!name) {
      setError("Enter a name for your workspace.");
      return;
    }

    try {
      const selected = await openFolderDialog({
        directory: true,
        multiple: false,
        title: "Choose where to create your workspace",
      });
      if (typeof selected !== "string") return;
      setBusy(true);
      const workspace = await createWorkspace({ parentPath: selected, name });
      await rememberAndSelect(workspace);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  }

  async function handleOpenRecent(path: string) {
    setError("");
    setBusy(true);
    try {
      const workspace = await inspectWorkspace(path);
      await rememberAndSelect(workspace);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  }

  async function removeRecent(path: string) {
    const next = recent.filter((item) => item.path !== path);
    setRecent(next);
    const store = await load(RECENTS_FILE, { autoSave: false });
    await store.set(RECENTS_KEY, next);
    await store.save();
  }

  return (
    <div className="workspace-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose();
    }}>
      <section className="workspace-modal" role="dialog" aria-modal="true" aria-labelledby="workspace-modal-title">
        <header className="workspace-modal-header">
          <div>
            <span className="workspace-modal-eyebrow">BOREALIS ROLEPLAY DEN</span>
            <h2 id="workspace-modal-title">{view === "create" ? "Create a workspace" : "Your workspaces"}</h2>
            <p>Your projects stay in folders you control.</p>
          </div>
          <button className="workspace-modal-close" type="button" onClick={onClose} aria-label="Close workspace manager" disabled={busy}><X size={18} /></button>
        </header>

        {view === "home" ? (
          <>
            <div className="workspace-modal-actions">
              <button type="button" className="workspace-action-primary" onClick={() => { setError(""); setView("create"); }} disabled={busy}>
                <FolderPlus size={18} /><span><strong>Create workspace</strong><small>Choose a name and folder location</small></span>
              </button>
              <button type="button" className="workspace-action-secondary" onClick={() => void handleOpenWorkspace()} disabled={busy}>
                <FolderOpen size={18} /><span><strong>Open workspace</strong><small>Select an existing BRD folder</small></span>
              </button>
            </div>
            <div className="workspace-recent-heading"><span>RECENT WORKSPACES</span><span>{recent.length}</span></div>
            {recent.length ? (
              <div className="workspace-recent-list">
                {recent.map((item) => (
                  <div className={activeWorkspace?.path === item.path ? "workspace-recent-item active" : "workspace-recent-item"} key={item.id}>
                    <button type="button" className="workspace-recent-open" onClick={() => void handleOpenRecent(item.path)} disabled={busy}>
                      <span className="workspace-recent-icon"><FolderOpen size={17} /></span>
                      <span className="workspace-recent-copy"><strong>{item.name}</strong><small>{item.path}</small></span>
                      {activeWorkspace?.path === item.path && <span className="workspace-active-label">ACTIVE</span>}
                    </button>
                    <button type="button" className="workspace-remove-recent" title="Remove from recent list (does not delete files)" aria-label={`Remove ${item.name} from recent workspaces`} onClick={() => void removeRecent(item.path)} disabled={busy}><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="workspace-empty"><FolderOpen size={24} /><strong>No recent workspaces yet</strong><span>Create one or open an existing BRD workspace folder.</span></div>
            )}
          </>
        ) : (
          <form className="workspace-create-form" onSubmit={(event) => void handleCreateWorkspace(event)}>
            <label htmlFor="workspace-name">Workspace name</label>
            <input id="workspace-name" autoFocus value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} placeholder="e.g. Neon Requiem" maxLength={80} disabled={busy} />
            <p>Next, you’ll choose the parent folder. BRD will create a new folder named after this workspace inside it.</p>
            <div className="workspace-form-actions">
              <button type="button" className="workspace-cancel-button" onClick={() => { setView("home"); setError(""); }} disabled={busy}>Back</button>
              <button type="submit" className="workspace-action-primary compact" disabled={busy || !workspaceName.trim()}>{busy ? "Creating…" : "Choose location"} <span aria-hidden="true">→</span></button>
            </div>
          </form>
        )}

        {busy && <p className="workspace-progress" role="status">Working with your workspace…</p>}
        {error && <p className="workspace-error" role="alert">{error}</p>}
        <footer className="workspace-modal-footer">Removing a workspace from this list never deletes its folder or files.</footer>
      </section>
    </div>
  );
}
