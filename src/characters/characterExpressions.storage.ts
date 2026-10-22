export const CHARACTER_EXPRESSION_SLOTS = [
  { key: "neutral", label: "Neutral" },
  { key: "smile", label: "Smile" },
  { key: "smirk", label: "Smirk" },
  { key: "angry", label: "Angry" },
  { key: "crying", label: "Crying" },
  { key: "flushed", label: "Flushed" },
] as const;

export type CharacterExpressionKey = (typeof CHARACTER_EXPRESSION_SLOTS)[number]["key"];

export type ReviewedCharacterExpression = {
  key: CharacterExpressionKey;
  /** The final, reviewed image crop. Stored as a Blob, not as a temporary object URL. */
  image: Blob;
  fileName?: string;
};

export type SavedCharacterExpression = {
  id: string;
  characterId: string;
  key: CharacterExpressionKey;
  label: string;
  mimeType: string;
  fileName: string;
  updatedAt: string;
};

type StoredExpression = SavedCharacterExpression & { image: Blob };

const DB_NAME = "borealis-character-expressions";
const DB_VERSION = 1;
const STORE_NAME = "expressions";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("characterId", "characterId", { unique: false });
        store.createIndex("characterSlot", ["characterId", "key"], { unique: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open character expression storage."));
  });
}

/**
 * Atomically saves the six reviewed expressions for one character.
 * Existing expressions for that character are replaced; other characters are untouched.
 * The caller should pass the final crops, not temporary object URLs.
 */
export async function saveReviewedCharacterExpressions(
  characterId: string,
  expressions: ReviewedCharacterExpression[],
): Promise<SavedCharacterExpression[]> {
  if (!characterId.trim()) throw new Error("Choose a character before saving expressions.");
  const byKey = new Map(expressions.map((expression) => [expression.key, expression]));
  const missing = CHARACTER_EXPRESSION_SLOTS.filter((slot) => {
    const expression = byKey.get(slot.key);
    return !expression || !(expression.image instanceof Blob) || expression.image.size === 0;
  });
  if (missing.length) {
    throw new Error(`Add an image for every expression before saving. Missing: ${missing.map((slot) => slot.label).join(", ")}.`);
  }

  const now = new Date().toISOString();
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("characterId");
    const existingRequest = index.getAll(characterId);
    let saved: SavedCharacterExpression[] = [];

    existingRequest.onsuccess = () => {
      const existing = existingRequest.result as StoredExpression[];
      for (const item of existing) store.delete(item.id);

      saved = CHARACTER_EXPRESSION_SLOTS.map((slot) => {
        const reviewed = byKey.get(slot.key)!;
        const previous = existing.find((item) => item.key === slot.key);
        const record: StoredExpression = {
          id: previous?.id ?? crypto.randomUUID(),
          characterId,
          key: slot.key,
          label: slot.label,
          mimeType: reviewed.image.type || "application/octet-stream",
          fileName: reviewed.fileName?.trim() || `${slot.key}.${extensionForMime(reviewed.image.type)}`,
          image: reviewed.image,
          updatedAt: now,
        };
        store.put(record);
        const { image: _image, ...metadata } = record;
        return metadata;
      });
    };

    transaction.oncomplete = () => { db.close(); resolve(saved); };
    transaction.onerror = () => { db.close(); reject(transaction.error ?? new Error("Could not save character expressions.")); };
    transaction.onabort = () => { db.close(); reject(transaction.error ?? new Error("Saving character expressions was cancelled.")); };
    existingRequest.onerror = () => transaction.abort();
  });
}

export async function listCharacterExpressions(characterId: string): Promise<SavedCharacterExpression[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).index("characterId").getAll(characterId);
    request.onsuccess = () => {
      db.close();
      const records = (request.result as StoredExpression[]).map(({ image: _image, ...metadata }) => metadata);
      resolve(records.sort((a, b) => CHARACTER_EXPRESSION_SLOTS.findIndex((slot) => slot.key === a.key) - CHARACTER_EXPRESSION_SLOTS.findIndex((slot) => slot.key === b.key)));
    };
    request.onerror = () => { db.close(); reject(request.error ?? new Error("Could not load character expressions.")); };
  });
}

export async function getCharacterExpressionBlob(characterId: string, key: CharacterExpressionKey): Promise<Blob | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).index("characterSlot").get([characterId, key]);
    request.onsuccess = () => { db.close(); resolve((request.result as StoredExpression | undefined)?.image ?? null); };
    request.onerror = () => { db.close(); reject(request.error ?? new Error("Could not load expression image.")); };
  });
}

export async function deleteCharacterExpressions(characterId: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const request = transaction.objectStore(STORE_NAME).index("characterId").openKeyCursor(characterId);
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) { transaction.objectStore(STORE_NAME).delete(cursor.primaryKey); cursor.continue(); }
    };
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error ?? new Error("Could not delete character expressions.")); };
  });
}

function extensionForMime(mimeType: string): string {
  const extensions: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
  };
  return extensions[mimeType] ?? "img";
}
