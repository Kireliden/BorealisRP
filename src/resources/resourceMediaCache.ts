const resourceObjectUrls = new Map<string, Promise<string | null>>();

/**
 * Reuses one object URL per resource for the lifetime of the app.
 * This keeps image blobs decoded/referenced across Resources and Characters navigation.
 */
export function getCachedResourceObjectUrl(
  scope: string,
  resourceId: string,
  loadBlob: () => Promise<Blob | null>,
): Promise<string | null> {
  const key = `${scope}::${resourceId}`;
  const existing = resourceObjectUrls.get(key);
  if (existing) return existing;

  const pending = loadBlob()
    .then((blob) => blob ? URL.createObjectURL(blob) : null)
    .catch((error) => {
      resourceObjectUrls.delete(key);
      throw error;
    });
  resourceObjectUrls.set(key, pending);
  return pending;
}

/** Call when a resource is deleted so its cached object URL can be released. */
export async function invalidateCachedResourceObjectUrl(scope: string, resourceId: string): Promise<void> {
  const key = `${scope}::${resourceId}`;
  const pending = resourceObjectUrls.get(key);
  resourceObjectUrls.delete(key);
  const url = await pending?.catch(() => null);
  if (url) URL.revokeObjectURL(url);
}
