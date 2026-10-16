
export type CollectionEntry = {
  id: string;
  discoveredAt: string;
};

export type CollectionData = {
  discovered: CollectionEntry[];
};

export const DEFAULT_COLLECTION_DATA: CollectionData = {
  discovered: [],
};
