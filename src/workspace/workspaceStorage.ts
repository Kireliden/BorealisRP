import { invoke } from "@tauri-apps/api/core";
import { load } from "@tauri-apps/plugin-store";
import type { CreateWorkspaceInput, WorkspaceInfo } from "./workspaceTypes";

/**
 * Creates a new workspace folder inside the user-selected parent directory.
 * The native backend validates the name and creates the manifest and folder structure.
 */
export function createWorkspace(input: CreateWorkspaceInput): Promise<WorkspaceInfo> {
  return invoke<WorkspaceInfo>("create_workspace", {
    parentPath: input.parentPath,
    name: input.name,
  });
}

/**
 * Validates an existing workspace without changing its files.
 */
export function inspectWorkspace(path: string): Promise<WorkspaceInfo> {
  return invoke<WorkspaceInfo>("inspect_workspace", { path });
}

const WORKSPACE_PREFERENCES_FILE = "recent-workspaces.json";
const LAST_WORKSPACE_KEY = "lastActiveWorkspacePath";

/** Returns the path of the workspace most recently active in BRD. */
export async function getLastWorkspacePath(): Promise<string | null> {
  const store = await load(WORKSPACE_PREFERENCES_FILE, { autoSave: false });
  const path = await store.get<unknown>(LAST_WORKSPACE_KEY);
  return typeof path === "string" && path.trim() ? path : null;
}

/** Remembers the active workspace between application launches. */
export async function rememberLastWorkspacePath(path: string): Promise<void> {
  const store = await load(WORKSPACE_PREFERENCES_FILE, { autoSave: false });
  await store.set(LAST_WORKSPACE_KEY, path);
  await store.save();
}

/** Clears a saved path if that workspace can no longer be opened. */
export async function clearLastWorkspacePath(): Promise<void> {
  const store = await load(WORKSPACE_PREFERENCES_FILE, { autoSave: false });
  await store.delete(LAST_WORKSPACE_KEY);
  await store.save();
}
