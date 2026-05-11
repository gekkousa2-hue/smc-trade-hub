import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Helper: install a fake localStorage with controllable behavior.
type StoreOpts = {
  blocked?: boolean; // throw SecurityError on every access
  quotaBytes?: number; // simulate quota by total bytes used
  setThrows?: () => Error | null; // override per-call error for setItem
};

function installFakeStorage(opts: StoreOpts = {}) {
  const data = new Map<string, string>();
  let bytes = 0;

  const recompute = () => {
    bytes = 0;
    for (const [k, v] of data) bytes += k.length + v.length;
  };

  const fake = {
    getItem(key: string) {
      if (opts.blocked) {
        const e: any = new Error("blocked");
        e.name = "SecurityError";
        throw e;
      }
      return data.has(key) ? data.get(key)! : null;
    },
    setItem(key: string, value: string) {
      if (opts.blocked) {
        const e: any = new Error("blocked");
        e.name = "SecurityError";
        throw e;
      }
      const override = opts.setThrows?.();
      if (override) throw override;
      const prev = data.get(key)?.length ?? 0;
      const next = bytes - prev + key.length + value.length;
      if (opts.quotaBytes != null && next > opts.quotaBytes) {
        const e: any = new Error("quota");
        e.name = "QuotaExceededError";
        e.code = 22;
        throw e;
      }
      data.set(key, value);
      bytes = next;
    },
    removeItem(key: string) {
      if (opts.blocked) return;
      const prev = data.get(key)?.length ?? 0;
      if (data.delete(key)) bytes -= prev + key.length;
    },
    clear() {
      data.clear();
      bytes = 0;
    },
    key(i: number) {
      return Array.from(data.keys())[i] ?? null;
    },
    get length() {
      return data.size;
    },
  };

  Object.defineProperty(globalThis, "localStorage", {
    value: fake,
    configurable: true,
    writable: true,
  });

  // Object.keys(localStorage) needs the keys to be enumerable own props,
  // so proxy via a real object when listKeys() is invoked.
  const proxy = new Proxy(fake as any, {
    ownKeys: () => Array.from(data.keys()),
    getOwnPropertyDescriptor: (_t, k) =>
      typeof k === "string" && data.has(k)
        ? { enumerable: true, configurable: true, value: data.get(k) }
        : undefined,
    get: (t, k) => (t as any)[k],
  });
  Object.defineProperty(globalThis, "localStorage", {
    value: proxy,
    configurable: true,
    writable: true,
  });

  return { data, recompute };
}

async function freshCache() {
  vi.resetModules();
  return (await import("./chatCache")).chatCache;
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  // @ts-ignore
  delete (globalThis as any).localStorage;
});

describe("chatCache — happy path", () => {
  it("round-trips conversations and messages via localStorage", async () => {
    installFakeStorage();
    const cache = await freshCache();

    cache.setConversations("u1", [{ id: "c1" } as any, { id: "c2" } as any]);
    expect(cache.getConversations("u1")).toEqual([{ id: "c1" }, { id: "c2" }]);

    const msgs = [
      { id: "m1", content: "hi" } as any,
      { id: "temp-x", content: "skip" } as any,
      { id: "m2", content: "yo", failed: true } as any,
      { id: "m3", content: "ok" } as any,
    ];
    cache.setMessages("c1", msgs);
    const cached = cache.getMessages("c1");
    expect(cached?.map((m) => m.id)).toEqual(["m1", "m3"]);
    expect(cache.isUsingMemoryFallback()).toBe(false);
  });
});

describe("chatCache — corrupted entries", () => {
  it("returns null and removes a corrupted JSON value", async () => {
    installFakeStorage();
    const cache = await freshCache();
    localStorage.setItem("chat:msgs:c1", "{not json");
    expect(cache.getMessages("c1")).toBeNull();
    // Subsequent read should also be null and the key cleaned up.
    expect(localStorage.getItem("chat:msgs:c1")).toBeNull();
  });
});

describe("chatCache — quota exceeded", () => {
  it("evicts old message caches and retries the write", async () => {
    // Tight quota: ~400 bytes. Pre-fill with old entries so eviction frees room.
    installFakeStorage({ quotaBytes: 400 });
    const cache = await freshCache();

    for (let i = 0; i < 8; i++) {
      localStorage.setItem(`chat:msgs:old-${i}`, "x".repeat(20));
    }

    const big = Array.from({ length: 20 }, (_, i) => ({
      id: `m${i}`,
      content: "y".repeat(5),
    })) as any[];

    cache.setMessages("c-new", big);
    expect(cache.getMessages("c-new")?.length).toBe(20);
    // Some old caches were evicted to free space.
    const remainingOld = Object.keys(localStorage).filter((k) =>
      k.startsWith("chat:msgs:old-"),
    );
    expect(remainingOld.length).toBeLessThan(8);
    // Either retry succeeded in localStorage, or memory fallback kicked in —
    // both are acceptable; what matters is the data round-trips.
  });

  it("evicts oldest conversation caches when message eviction is not enough", async () => {
    installFakeStorage({ quotaBytes: 600 });
    const cache = await freshCache();

    const seed = (key: string, value: string) => {
      try { localStorage.setItem(key, value); } catch { /* full */ }
    };
    // Small msg caches (evicted first, but won't free much).
    seed("chat:msgs:legacy-1", "m".repeat(20));
    seed("chat:msgs:legacy-2", "m".repeat(20));
    // Larger conv caches that will need to be pruned.
    for (let i = 0; i < 5; i++) seed(`chat:convs:old-user-${i}`, "z".repeat(60));

    // Big new payload that won't fit without conv-cache eviction.
    const payload = Array.from({ length: 8 }, (_, i) => ({
      id: `c${i}`,
      label: "x".repeat(15),
    })) as any[];
    cache.setConversations("u-new", payload);

    expect(cache.getConversations("u-new")).toEqual(payload);

    const remainingConvs = Object.keys(localStorage).filter((k) =>
      k.startsWith("chat:convs:old-user-"),
    );
    // Conversation caches were pruned to make room.
    expect(remainingConvs.length).toBeLessThan(5);
  });

  it("keeps reads working for the new write after eviction", async () => {
    installFakeStorage({ quotaBytes: 700 });
    const cache = await freshCache();

    const seed = (key: string, value: string) => {
      try { localStorage.setItem(key, value); } catch { /* full */ }
    };
    for (let i = 0; i < 10; i++) seed(`chat:msgs:filler-${i}`, "f".repeat(30));

    const msgs = Array.from({ length: 15 }, (_, i) => ({
      id: `m${i}`,
      content: "n".repeat(8),
    })) as any[];
    cache.setMessages("active", msgs);

    expect(cache.getMessages("active")?.length).toBe(15);

    // Some fillers should have been evicted to make room.
    const remainingFillers = Object.keys(localStorage).filter((k) =>
      k.startsWith("chat:msgs:filler-"),
    );
    expect(remainingFillers.length).toBeLessThan(10);
  });
});

describe("chatCache — blocked storage", () => {
  it("switches to in-memory fallback when localStorage throws SecurityError", async () => {
    installFakeStorage({ blocked: true });
    const cache = await freshCache();

    cache.setConversations("u1", [{ id: "c1" } as any]);
    expect(cache.isUsingMemoryFallback()).toBe(true);
    expect(cache.getConversations("u1")).toEqual([{ id: "c1" }]);

    cache.setMessages("c1", [{ id: "m1", content: "hi" } as any]);
    expect(cache.getMessages("c1")?.[0].id).toBe("m1");
  });

  it("never throws to callers even if storage is fully unavailable", async () => {
    installFakeStorage({ blocked: true });
    const cache = await freshCache();
    expect(() => {
      cache.setConversations("u1", [{ id: "c1" } as any]);
      cache.getConversations("u1");
      cache.setMessages("c1", [{ id: "m1", content: "x" } as any]);
      cache.getMessages("c1");
      cache.clearMessages("c1");
      cache.clearAll();
    }).not.toThrow();
  });
});

describe("chatCache — clearAll", () => {
  it("wipes both conversation and message caches", async () => {
    installFakeStorage();
    const cache = await freshCache();
    cache.setConversations("u1", [{ id: "c1" } as any]);
    cache.setMessages("c1", [{ id: "m1", content: "x" } as any]);
    cache.clearAll();
    expect(cache.getConversations("u1")).toBeNull();
    expect(cache.getMessages("c1")).toBeNull();
  });
});
