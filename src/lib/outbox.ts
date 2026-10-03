// Offline-first outbox, PRD §3.5 / §6.1.
// Field capture (activation, status updates, photo notes) must work with zero
// connectivity: mutations are queued in IndexedDB and background-synced when
// online, with a visible "pending sync" count. Client-only module.
export interface OutboxEntry {
  id: string;
  kind: "activate-sapling" | "sapling-status" | "create-sapling";
  payload: Record<string, unknown>;
  createdAt: number;
  attempts: number;
}

const DB_NAME = "GreenHQ";
const STORE = "outbox";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    const store = db.transaction(STORE, mode).objectStore(STORE);
    return await new Promise<T>((resolve, reject) => {
      const req = fn(store);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function queueMutation(entry: Omit<OutboxEntry, "id" | "createdAt" | "attempts">): Promise<OutboxEntry> {
  const full: OutboxEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: Date.now(),
    attempts: 0,
  };
  await tx("readwrite", (s) => s.add(full));
  window.dispatchEvent(new CustomEvent("gs:outbox-changed"));
  return full;
}

export async function listPending(): Promise<OutboxEntry[]> {
  return tx("readonly", (s) => s.getAll());
}

export async function removePending(id: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(id));
  window.dispatchEvent(new CustomEvent("gs:outbox-changed"));
}

const KIND_TO_PATH: Record<OutboxEntry["kind"], (p: Record<string, unknown>) => string> = {
  "activate-sapling": (p) => `/api/saplings/${p.nanoid as string}/activate`,
  "sapling-status": (p) => `/api/saplings/${p.nanoid as string}/status`,
  "create-sapling": () => "/api/saplings",
};

/** Push every queued entry to the server, in FIFO order. Returns remaining count. */
export async function syncOutbox(): Promise<number> {
  const pending = (await listPending()).sort((a, b) => a.createdAt - b.createdAt);
  for (const entry of pending) {
    try {
      const res = await fetch(KIND_TO_PATH[entry.kind](entry.payload), {
        method: entry.kind === "create-sapling" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry.payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await removePending(entry.id);
    } catch {
      // Leave it queued; surface via the pending-sync indicator.
      break;
    }
  }
  const rest = await listPending();
  window.dispatchEvent(new CustomEvent("gs:outbox-changed"));
  return rest.length;
}
