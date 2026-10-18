import type { ResourceRecord } from "./resources.types";

const DB_NAME = "borealis-resource-library";
const DB_VERSION = 1;
const STORE_NAME = "resources";

function openResourceDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("importedAt", "importedAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the resource library."));
  });
}

export async function listResources(): Promise<ResourceRecord[]> {
  const db = await openResourceDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve((request.result as ResourceRecord[]).sort((a, b) => b.importedAt.localeCompare(a.importedAt)));
    request.onerror = () => reject(request.error ?? new Error("Could not read the resource library."));
    request.addEventListener("loadend", () => db.close(), { once: true });
  });
}

export async function importResource(file: File, tags: string[] = []): Promise<ResourceRecord> {
  const db = await openResourceDb();
  const record: ResourceRecord & { blob: Blob } = {
    id: crypto.randomUUID(),
    name: file.name.replace(/\.[^.]+$/, ""),
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    kind: file.type.startsWith("image/") ? "image" : file.type.startsWith("audio/") ? "audio" : file.type.startsWith("video/") ? "video" : "other",
    size: file.size,
    tags: [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))],
    importedAt: new Date().toISOString(),
    blob: file,
  };
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(record);
    transaction.oncomplete = () => { db.close(); const { blob: _blob, ...metadata } = record; resolve(metadata); };
    transaction.onerror = () => { db.close(); reject(transaction.error ?? new Error("Could not import resource.")); };
    transaction.onabort = () => { db.close(); reject(transaction.error ?? new Error("Resource import was cancelled.")); };
  });
}

export async function getResourceBlob(id: string): Promise<Blob | null> {
  const db = await openResourceDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(id);
    request.onsuccess = () => {
      const result = request.result as ({ blob?: Blob } & ResourceRecord) | undefined;
      resolve(result?.blob ?? null);
    };
    request.onerror = () => reject(request.error ?? new Error("Could not read resource."));
    request.addEventListener("loadend", () => db.close(), { once: true });
  });
}

export async function deleteResource(id: string): Promise<void> {
  const db = await openResourceDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error ?? new Error("Could not delete resource.")); };
  });
}

export async function updateResourceTags(id: string, tags: string[]): Promise<void> {
  const db = await openResourceDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => {
      if (!request.result) return;
      store.put({ ...request.result, tags: [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))] });
    };
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error ?? new Error("Could not update resource tags.")); };
  });
}
