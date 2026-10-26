import { readWorkspaceFile, writeWorkspaceJson } from "./workspaceFiles";

export type WorkspaceDraft = { html: string };

function draftPath(sceneId: string): string {
  return `Chats/Drafts/${encodeURIComponent(sceneId)}.json`;
}

export async function loadWorkspaceDraft(workspacePath: string, sceneId: string): Promise<string> {
  try {
    const bytes = await readWorkspaceFile(workspacePath, draftPath(sceneId));
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!value || typeof value !== "object" || typeof (value as WorkspaceDraft).html !== "string") {
      throw new Error("This scene's saved draft is invalid.");
    }
    return (value as WorkspaceDraft).html;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/not found|no such file|os error 2|system cannot find the file/i.test(message)) return "";
    throw error;
  }
}

export function saveWorkspaceDraft(workspacePath: string, sceneId: string, html: string): Promise<void> {
  return writeWorkspaceJson(workspacePath, draftPath(sceneId), { html });
}
