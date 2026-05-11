/**
 * LocalStorage-backed cache for chat data with robust fallbacks.
 *
 * Fallback strategy when localStorage is unavailable / quota exceeded / blocked:
 *   1. Detect QuotaExceededError → evict oldest message caches and retry once.
 *   2. Detect SecurityError / disabled storage → switch to in-memory Map cache
 *      so the chat keeps working (just without cross-session persistence).
 *   3. Never throw to callers; chat must keep functioning.
 */

import type { Conversation, Message } from "@/hooks/useChatState";

const CONV_KEY = (userId: string) => `chat:convs:${userId}`;
const MSGS_KEY = (convId: string) => `chat:msgs:${convId}`;
const MAX_CACHED_MESSAGES = 60;
const MAX_CACHED_CONVS = 50;

// In-memory fallback used when localStorage is unavailable.
const memoryStore = new Map<string, string>();
let useMemoryFallback = false;
let warned = false;

function isQuotaError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const err = e as { name?: string; code?: number };
  return (
    err.name === "QuotaExceededError" ||
    err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    err.code === 22 ||
    err.code === 1014
  );
}

function isStorageBlocked(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const err = e as { name?: string };
  return err.name === "SecurityError" || err.name === "TypeError";
}

function warnOnce(msg: string, e?: unknown) {
  if (warned) return;
  warned = true;
  console.warn(`[chatCache] ${msg}`, e ?? "");
}

function rawGet(key: string): string | null {
  if (useMemoryFallback) return memoryStore.get(key) ?? null;
  try {
    return localStorage.getItem(key);
  } catch (e) {
    if (isStorageBlocked(e)) {
      useMemoryFallback = true;
      warnOnce("localStorage blocked — switching to in-memory cache.", e);
      return memoryStore.get(key) ?? null;
    }
    return null;
  }
}

function rawSet(key: string, value: string): boolean {
  if (useMemoryFallback) {
    memoryStore.set(key, value);
    return true;
  }
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (isQuotaError(e)) {
      // Free space by dropping oldest message caches, then retry once.
      evictOldestMessageCaches(10);
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (e2) {
        if (isQuotaError(e2)) {
          warnOnce("localStorage quota exceeded after eviction — using memory cache.", e2);
          useMemoryFallback = true;
          memoryStore.set(key, value);
          return true;
        }
      }
    }
    if (isStorageBlocked(e)) {
      useMemoryFallback = true;
      warnOnce("localStorage blocked — switching to in-memory cache.", e);
      memoryStore.set(key, value);
      return true;
    }
    warnOnce("localStorage write failed — caching skipped.", e);
    return false;
  }
}

function rawRemove(key: string) {
  if (useMemoryFallback) {
    memoryStore.delete(key);
    return;
  }
  try {
    localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

function listKeys(prefix: string): string[] {
  if (useMemoryFallback) {
    return Array.from(memoryStore.keys()).filter((k) => k.startsWith(prefix));
  }
  try {
    return Object.keys(localStorage).filter((k) => k.startsWith(prefix));
  } catch {
    return [];
  }
}

/** Drop the N oldest message-cache entries to free quota. */
function evictOldestMessageCaches(count: number) {
  try {
    const keys = listKeys("chat:msgs:");
    // No timestamp metadata — drop arbitrary first N. Good enough for emergency relief.
    keys.slice(0, count).forEach(rawRemove);
  } catch {
    /* noop */
  }
}

function safeGet<T>(key: string): T | null {
  const raw = rawGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Corrupted entry — remove so we don't keep failing on it.
    rawRemove(key);
    return null;
  }
}

function safeSet(key: string, value: unknown) {
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch (e) {
    warnOnce("Failed to serialize cache value.", e);
    return;
  }
  rawSet(key, serialized);
}

export const chatCache = {
  getConversations(userId: string): Conversation[] | null {
    return safeGet<Conversation[]>(CONV_KEY(userId));
  },
  setConversations(userId: string, convs: Conversation[]) {
    safeSet(CONV_KEY(userId), convs.slice(0, MAX_CACHED_CONVS));
  },

  getMessages(convId: string): Message[] | null {
    return safeGet<Message[]>(MSGS_KEY(convId));
  },
  setMessages(convId: string, messages: Message[]) {
    const clean = messages
      .filter((m) => !m.id.startsWith("temp-") && !m.failed)
      .slice(-MAX_CACHED_MESSAGES);
    safeSet(MSGS_KEY(convId), clean);
  },
  clearMessages(convId: string) {
    rawRemove(MSGS_KEY(convId));
  },

  /** Wipe all chat cache (use on sign-out) */
  clearAll() {
    try {
      [...listKeys("chat:convs:"), ...listKeys("chat:msgs:")].forEach(rawRemove);
    } catch {
      /* noop */
    }
    memoryStore.clear();
  },

  /** Diagnostics — useful for debugging. */
  isUsingMemoryFallback() {
    return useMemoryFallback;
  },
};
