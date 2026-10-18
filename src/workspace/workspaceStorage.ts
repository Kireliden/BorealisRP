import { invoke } from "@tauri-apps/api/core";
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
