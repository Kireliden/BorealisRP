
import { load } from "@tauri-apps/plugin-store";
import {
  DEFAULT_COLLECTION_DATA,
  type CollectionData,
} from "./collectionTypes";

const STORE_PATH = "collections.json";
const COLLECTION_KEY = "collectionData";

let operationQueue: Promise<void> = Promise.resolve();

export async function loadCollection(): Promise<CollectionData> {
  const store = await load(STORE_PATH, { autoSave: false });
  const saved = await store.get<unknown>(COLLECTION_KEY);

  if (saved == null) {
    return {
      discovered: [...DEFAULT_COLLECTION_DATA.discovered],
    };
  }

  if (
    typeof saved !== "object" ||
    !("discovered" in saved) ||
    !Array.isArray(saved.discovered)
  ) {
    throw new Error("The saved collection data is invalid.");
  }

  const discovered = saved.discovered.filter(
    (entry): entry is { id: string; discoveredAt: string } =>
      typeof entry === "object" &&
      entry !== null &&
      "id" in entry &&
      typeof entry.id === "string" &&
      "discoveredAt" in entry &&
      typeof entry.discoveredAt === "string",
  );

  return {
    discovered: discovered.filter(
      (entry, index, entries) =>
        entries.findIndex((candidate) => candidate.id === entry.id) === index,
    ),
  };
}

export async function registerDiscovery(id: string): Promise<void> {
  const operation = operationQueue.then(async () => {
    const store = await load(STORE_PATH, { autoSave: false });
    const saved = await store.get<unknown>(COLLECTION_KEY);

    let discovered: CollectionData["discovered"] = [];

    if (
      typeof saved === "object" &&
      saved !== null &&
      "discovered" in saved &&
      Array.isArray(saved.discovered)
    ) {
      discovered = saved.discovered.filter(
        (entry): entry is CollectionData["discovered"][number] =>
          typeof entry === "object" &&
          entry !== null &&
          "id" in entry &&
          typeof entry.id === "string" &&
          "discoveredAt" in entry &&
          typeof entry.discoveredAt === "string",
      );
    }

    if (discovered.some((entry) => entry.id === id)) {
      return;
    }

    discovered.push({
      id,
      discoveredAt: new Date().toISOString(),
    });

    await store.set(COLLECTION_KEY, { discovered });
    await store.save();
  });

  operationQueue = operation.catch(() => {});
  await operation;
}
