import { load } from "@tauri-apps/plugin-store";

const ICONS_FILE = "workspace-icons.json";
const ICONS_KEY = "iconsByWorkspaceId";
const DEFAULT_ICON = "om:1F319";

/** Workspace labels are part of workspace manifests; their custom UI icon is
 * a local per-installation preference, keyed by stable workspace UUID. */
export async function getWorkspaceIcon(id: string): Promise<string> {
  if (!id) return DEFAULT_ICON;
  const store = await load(ICONS_FILE, { autoSave: false });
  const icons = await store.get<Record<string, unknown>>(ICONS_KEY);
  const icon = icons && typeof icons[id] === "string" ? icons[id] as string : "";
  return icon || DEFAULT_ICON;
}

export async function saveWorkspaceIcon(id: string, icon: string): Promise<void> {
  if (!id || !icon.trim()) return;
  const store = await load(ICONS_FILE, { autoSave: false });
  const current = await store.get<Record<string, string>>(ICONS_KEY) ?? {};
  await store.set(ICONS_KEY, { ...current, [id]: icon });
  await store.save();
}
