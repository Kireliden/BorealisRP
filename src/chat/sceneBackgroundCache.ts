import { loadSceneBackgroundUrl, type SceneBackground } from "./sceneBackground";

/**
 * App-session LRU image cache. URL blobs are reused across scene switches,
 * including revisiting a scene after opening Settings or another library view.
 * Bounded and revoked on eviction; no duplicate read while one is in flight.
 */
const MAX_BACKGROUNDS = 8;
const cached = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

export const sceneBackgroundCacheKey = (workspacePath: string, relativePath: string) =>
  workspacePath + "::" + relativePath;

export function peekSceneBackground(workspacePath: string, relativePath: string): string | null {
  const key = sceneBackgroundCacheKey(workspacePath, relativePath);
  const url = cached.get(key) ?? null;
  if (url) {
    cached.delete(key);
    cached.set(key, url);
  }
  return url;
}

export function getCachedSceneBackground(
  workspacePath: string,
  background: SceneBackground,
): Promise<string> {
  const key = sceneBackgroundCacheKey(workspacePath, background.relativePath);
  const hit = peekSceneBackground(workspacePath, background.relativePath);
  if (hit) return Promise.resolve(hit);
  const loading = pending.get(key);
  if (loading) return loading;
  const job = loadSceneBackgroundUrl(workspacePath, background).then((url) => {
    pending.delete(key);
    // If another caller has inserted this key while loading, keep one URL.
    const existing = cached.get(key);
    if (existing) {
      URL.revokeObjectURL(url);
      return existing;
    }
    cached.set(key, url);
    while (cached.size > MAX_BACKGROUNDS) {
      const first = cached.keys().next().value;
      if (!first) break;
      const expired = cached.get(first);
      cached.delete(first);
      if (expired) URL.revokeObjectURL(expired);
    }
    return url;
  }).catch((error: unknown) => {
    pending.delete(key);
    throw error;
  });
  pending.set(key, job);
  return job;
}

export function forgetSceneBackground(workspacePath: string, relativePath: string): void {
  const key = sceneBackgroundCacheKey(workspacePath, relativePath);
  const url = cached.get(key);
  cached.delete(key);
  // A pending decode is also prevented from persisting on completion.
  if (url) URL.revokeObjectURL(url);
}

/** Opportunistic preload, capped to avoid reading a workspace's entire image library. */
export function prefetchSceneBackgrounds(workspacePath: string, backgrounds: SceneBackground[]): void {
  void Promise.allSettled(backgrounds.slice(0, 3).map((item) =>
    getCachedSceneBackground(workspacePath, item)));
}
