import { readWorkspaceFile, writeWorkspaceJson } from "./workspaceFiles";

export type WorkspaceDraft = { html: string };

function draftPath(sceneId: string): string {
  return `Chats/Drafts/${encodeURIComponent(sceneId)}.json`;
}

// Serialize operations per workspace + scene so an older autosave cannot finish
// after a newer save (for example, clearing a draft after sending a message).
const pendingDraftWrites = new Map<string, Promise<void>>();

function draftKey(workspacePath: string, sceneId: string): string {
  return `${workspacePath}\u0000${sceneId}`;
}

async function waitForPendingWrite(workspacePath: string, sceneId: string): Promise<void> {
  const pending = pendingDraftWrites.get(draftKey(workspacePath, sceneId));
  if (pending) await pending.catch(() => undefined);
}

export async function loadWorkspaceDraft(workspacePath: string, sceneId: string): Promise<string> {
  await waitForPendingWrite(workspacePath, sceneId);
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
  const key = draftKey(workspacePath, sceneId);
  const previous = pendingDraftWrites.get(key) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(() => writeWorkspaceJson(workspacePath, draftPath(sceneId), { html }));

  pendingDraftWrites.set(key, next);
  const clearPending = () => {
    if (pendingDraftWrites.get(key) === next) pendingDraftWrites.delete(key);
  };
  void next.then(clearPending, clearPending);
  return next;
}
