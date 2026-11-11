import { invoke } from "@tauri-apps/api/core";
import type { MessageImage } from "../chat/messageImages";

export type WorkspaceMessage = {
  id: number;
  sentAt?: number;
  author: string;
  initials: string;
  role: "Narration" | "Dialogue";
  time: string;
  content: string;
  avatar: string;
  avatarAssetPath?: string | null;
  characterId?: string;
  expression?: string;
  history?: string[];
  source?: string;
  images?: MessageImage[];
  /** Saved inside this workspace, not in a separate global favourites database. */
  favourite?: boolean;
  favouritedAt?: number;
};

export type WorkspaceCategory = { id: string; name: string; };

export type WorkspaceFolder = {
  id: string;
  name: string;
  categoryId?: string | null;
};

export type WorkspaceScene = {
  id: string;
  name: string;
  icon: string;
  messages: WorkspaceMessage[];
  folderId?: string | null;
  favourite?: boolean;
  favouritedAt?: number;
};

export type WorkspaceContent = {
  schemaVersion: 1;
  scenes: WorkspaceScene[];
  folders?: WorkspaceFolder[];
  categories?: WorkspaceCategory[];
};

export function loadWorkspaceContent(path: string): Promise<WorkspaceContent> {
  return invoke<WorkspaceContent>("load_workspace_content", { path });
}

export function saveWorkspaceContent(path: string, content: WorkspaceContent): Promise<void> {
  return invoke("save_workspace_content", { path, content });
}
