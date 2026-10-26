import { invoke } from "@tauri-apps/api/core";

/**
 * Reads and writes binary assets relative to a validated workspace root.
 * Keep paths portable (for example, "Resources/Images/abc.png"), never absolute.
 */
export async function readWorkspaceFile(workspacePath: string, relativePath: string): Promise<Uint8Array> {
  const bytes = await invoke<number[]>("read_workspace_file", {
    path: workspacePath,
    relativePath,
  });
  return Uint8Array.from(bytes);
}

export function writeWorkspaceFile(
  workspacePath: string,
  relativePath: string,
  bytes: Uint8Array,
): Promise<void> {
  return invoke("write_workspace_file", {
    path: workspacePath,
    relativePath,
    bytes: Array.from(bytes),
  });
}

export async function readWorkspaceJson<T>(workspacePath: string, relativePath: string): Promise<T> {
  const bytes = await readWorkspaceFile(workspacePath, relativePath);
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

export function writeWorkspaceJson(
  workspacePath: string,
  relativePath: string,
  value: unknown,
): Promise<void> {
  const bytes = new TextEncoder().encode(JSON.stringify(value, null, 2) + "\n");
  return writeWorkspaceFile(workspacePath, relativePath, bytes);
}
