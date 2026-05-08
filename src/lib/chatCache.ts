/**
 * LocalStorage-backed cache for chat data.
 * - Conversations list (per user)
 * - Last N messages per conversation
 * Designed for instant rendering on chat re-open while fresh data syncs in background.
 */

import type { Conversation, Message } from "@/hooks/useChatState";

const CONV_KEY = (userId: string) => `chat:convs:${userId}`;
const MSGS_KEY = (convId: string) => `chat:msgs:${convId}`;
const MAX_CACHED_MESSAGES = 60;
const MAX_CACHED_CONVS = 50;

function safeGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or private mode — ignore silently
  }
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
    // Keep only persisted (non-temp) messages, trim to last N
    const clean = messages
      .filter((m) => !m.id.startsWith("temp-") && !m.failed)
      .slice(-MAX_CACHED_MESSAGES);
    safeSet(MSGS_KEY(convId), clean);
  },
  clearMessages(convId: string) {
    try { localStorage.removeItem(MSGS_KEY(convId)); } catch { /* noop */ }
  },

  /** Wipe all chat cache (use on sign-out) */
  clearAll() {
    try {
      const keys = Object.keys(localStorage).filter(
        (k) => k.startsWith("chat:convs:") || k.startsWith("chat:msgs:")
      );
      keys.forEach((k) => localStorage.removeItem(k));
    } catch { /* noop */ }
  },
};
