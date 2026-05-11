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
    // Should ideally still be using localStorage, not memory fallback.
    expect(cache.isUsingMemoryFallback()).toBe(false);
  });

  it("falls back to in-memory cache when quota is unrecoverable", async () => {
    installFakeStorage({ quotaBytes: 5 }); // basically nothing fits
    const cache = await freshCache();

    cache.setConversations("u1", [{ id: "c1", content: "z".repeat(50) } as any]);
    expect(cache.isUsingMemoryFallback()).toBe(true);
    expect(cache.getConversations("u1")).toEqual([
      { id: "c1", content: "z".repeat(50) },
    ]);
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
