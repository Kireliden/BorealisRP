import type { ResourceRecord, ResourceFolder, ResourceBatchAction } from "./resources.types";

const DB_NAME = "borealis-resource-library";
const DB_VERSION = 2;
const STORE_NAME = "resources";
const FOLDERS_STORE_NAME = "folders";

function openResourceDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("importedAt", "importedAt");
      }
      if (!db.objectStoreNames.contains(FOLDERS_STORE_NAME)) db.createObjectStore(FOLDERS_STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the resource library."));
  });
}

export async function listResources(): Promise<ResourceRecord[]> {
  const db = await openResourceDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
    request.onsuccess = () => { db.close(); resolve((request.result as ResourceRecord[]).sort((a, b) => b.importedAt.localeCompare(a.importedAt))); };
    request.onerror = () => { db.close(); reject(request.error ?? new Error("Could not read the resource library.")); };
  });
}

function createResourceRecord(file: File, tags: string[]): ResourceRecord & { blob: Blob } {
  return {
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
}

/** Import multiple resources in one IndexedDB transaction. */
export async function importResources(files: File[], tags: string[] = [], folderId: string | null = null): Promise<ResourceRecord[]> {
  if (!files.length) return [];
  const db = await openResourceDb();
  const records = files.map((file) => ({ ...createResourceRecord(file, tags), folderId }));

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    records.forEach((record) => store.put(record));
    transaction.oncomplete = () => {
      db.close();
      resolve(records.map((record) => ({
        id: record.id,
        name: record.name,
        fileName: record.fileName,
        mimeType: record.mimeType,
        kind: record.kind,
        size: record.size,
        tags: record.tags,
        importedAt: record.importedAt,
        folderId: record.folderId,
      })));
    };
    transaction.onerror = () => { db.close(); reject(transaction.error ?? new Error("Could not import resources.")); };
    transaction.onabort = () => { db.close(); reject(transaction.error ?? new Error("Resource import was cancelled.")); };
  });
}

export async function importResource(file: File, tags: string[] = []): Promise<ResourceRecord> {
  const [record] = await importResources([file], tags);
  return record;
}

export async function getResourceBlob(id: string): Promise<Blob | null> {
  const db = await openResourceDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(id);
    request.onsuccess = () => {
      const result = request.result as ({ blob?: Blob } & ResourceRecord) | undefined;
      db.close();
      resolve(result?.blob ?? null);
    };
    request.onerror = () => { db.close(); reject(request.error ?? new Error("Could not read resource.")); };
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

/** Returns legacy resource records with their binary payloads for a non-destructive migration. */
export async function exportResourcesForMigration(): Promise<Array<{ record: ResourceRecord; blob: Blob }>> {
  const db = await openResourceDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
    request.onsuccess = () => {
      db.close();
      const migrated = (request.result as Array<ResourceRecord & { blob?: Blob }>)
        .filter((item): item is ResourceRecord & { blob: Blob } => item.blob instanceof Blob && item.blob.size > 0)
        .map(({ blob, ...record }) => ({ record, blob }));
      resolve(migrated);
    };
    request.onerror = () => { db.close(); reject(request.error ?? new Error("Could not export legacy resources for migration.")); };
  });
}


/** Folder metadata is independent of original files on the user's computer. */
export async function listResourceFolders(): Promise<ResourceFolder[]> {
  const db = await openResourceDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(FOLDERS_STORE_NAME, "readonly").objectStore(FOLDERS_STORE_NAME).getAll();
    request.onsuccess = () => { db.close(); resolve(request.result as ResourceFolder[]); };
    request.onerror = () => { db.close(); reject(request.error ?? new Error("Could not read resource folders.")); };
  });
}

export async function createResourceFolder(name: string, parentId: string | null): Promise<ResourceFolder> {
  const folder: ResourceFolder = { id: crypto.randomUUID(), name: name.trim(), parentId, createdAt: new Date().toISOString() };
  if (!folder.name || /[/\\]/.test(folder.name)) throw new Error("Choose a folder name without slashes.");
  const db = await openResourceDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FOLDERS_STORE_NAME, "readwrite");
    const store = transaction.objectStore(FOLDERS_STORE_NAME);
    let reason = "";
    const request = store.getAll();
    request.onsuccess = () => {
      const folders = request.result as ResourceFolder[];
      if (parentId && !folders.some((item) => item.id === parentId)) reason = "Parent folder no longer exists.";
      else if (folders.some((item) => item.parentId === parentId && item.name.toLocaleLowerCase() === folder.name.toLocaleLowerCase())) reason = "A folder with this name already exists here.";
      if (reason) transaction.abort();
      else store.add(folder);
    };
    transaction.oncomplete = () => { db.close(); resolve(folder); };
    transaction.onerror = () => { db.close(); reject(transaction.error ?? new Error("Could not create folder.")); };
    transaction.onabort = () => { db.close(); reject(new Error(reason || "Could not create folder.")); };
  });
}

/** A move only changes the folder ID. A copy keeps the original and duplicates its Blob. */
export async function organiseResources(ids: string[], action: ResourceBatchAction, destinationFolderId: string | null = null): Promise<void> {
  if (!ids.length) return;
  const db = await openResourceDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME, FOLDERS_STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    let reason = "";
    function apply() {
      for (const id of new Set(ids)) {
        const request = store.get(id);
        request.onsuccess = () => {
          const record = request.result as (ResourceRecord & { blob: Blob }) | undefined;
          if (!record) return;
          if (action === "delete") store.delete(id);
          else if (action === "move") store.put({ ...record, folderId: destinationFolderId });
          else store.put({ ...record, id: crypto.randomUUID(), folderId: destinationFolderId, importedAt: new Date().toISOString() });
        };
      }
    }
    if (action !== "delete" && destinationFolderId !== null) {
      const request = transaction.objectStore(FOLDERS_STORE_NAME).get(destinationFolderId);
      request.onsuccess = () => {
        if (request.result) apply();
        else { reason = "Destination folder no longer exists."; transaction.abort(); }
      };
    } else apply();
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error ?? new Error("Could not organise resources.")); };
    transaction.onabort = () => { db.close(); reject(new Error(reason || "Resource operation was cancelled.")); };
  });
}


/** Rename a logical folder without changing any imported file. */
export async function renameResourceFolder(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed || /[/\\]/.test(trimmed)) throw new Error("Choose a folder name without slashes.");
  const db = await openResourceDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FOLDERS_STORE_NAME, "readwrite");
    const store = tx.objectStore(FOLDERS_STORE_NAME);
    let issue = "";
    const request = store.getAll();
    request.onsuccess = () => {
      const folders = request.result as ResourceFolder[];
      const folder = folders.find((item) => item.id === id);
      if (!folder) issue = "Folder not found.";
      else if (folders.some((item) => item.id !== id && item.parentId === folder.parentId && item.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase())) issue = "A folder with this name already exists here.";
      if (issue) tx.abort();
      else if (folder) store.put({ ...folder, name: trimmed });
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error("Could not rename folder.")); };
    tx.onabort = () => { db.close(); reject(new Error(issue || "Folder rename was cancelled.")); };
  });
}

/** Remove a folder tree without deleting its files: lift all contained resources to the parent. */
export async function removeResourceFolder(id: string): Promise<void> {
  const db = await openResourceDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([FOLDERS_STORE_NAME, STORE_NAME], "readwrite");
    const folderStore = tx.objectStore(FOLDERS_STORE_NAME);
    const resourceStore = tx.objectStore(STORE_NAME);
    let issue = "";
    const foldersRequest = folderStore.getAll();
    foldersRequest.onsuccess = () => {
      const folders = foldersRequest.result as ResourceFolder[];
      const target = folders.find((item) => item.id === id);
      if (!target) { issue = "Folder not found."; tx.abort(); return; }
      const removed = new Set([id]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const folder of folders) {
          if (folder.parentId && removed.has(folder.parentId) && !removed.has(folder.id)) {
            removed.add(folder.id);
            changed = true;
          }
        }
      }
      const resourcesRequest = resourceStore.getAll();
      resourcesRequest.onsuccess = () => {
        for (const record of resourcesRequest.result as Array<ResourceRecord & { blob: Blob }>) {
          if (record.folderId && removed.has(record.folderId)) resourceStore.put({ ...record, folderId: target.parentId });
        }
        for (const folderId of removed) folderStore.delete(folderId);
      };
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error("Could not remove folder.")); };
    tx.onabort = () => { db.close(); reject(new Error(issue || "Folder removal was cancelled.")); };
  });
}
