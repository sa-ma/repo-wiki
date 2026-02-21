import type { Wiki } from "@/types";

const TTL = 60 * 60 * 1000; // 1 hour
const MAX_SIZE = 50;

const cache = new Map<string, { wiki: Wiki; timestamp: number }>();

function cacheKey(owner: string, repo: string): string {
  return `${owner.toLowerCase()}/${repo.toLowerCase()}`;
}

export function getCachedWiki(owner: string, repo: string): Wiki | null {
  const entry = cache.get(cacheKey(owner, repo));
  if (!entry) return null;
  if (Date.now() - entry.timestamp > TTL) {
    cache.delete(cacheKey(owner, repo));
    return null;
  }
  return entry.wiki;
}

export function setCachedWiki(owner: string, repo: string, wiki: Wiki): void {
  // Evict oldest entry if at capacity
  if (cache.size >= MAX_SIZE) {
    const oldestKey = cache.keys().next().value!;
    cache.delete(oldestKey);
  }
  cache.set(cacheKey(owner, repo), { wiki, timestamp: Date.now() });
}
