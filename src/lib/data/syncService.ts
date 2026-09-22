import { clearLocalData, db } from "./local";
import { supabaseRemote } from "./remote";
import { setAfterWrite } from "./repo";
import { syncNow } from "./sync";

export type SyncStatus = "idle" | "syncing" | "offline" | "error";

let status: SyncStatus = "idle";
let lastSyncAt: string | null = null;
let running = false;
let queuedAgain = false;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

// One snapshot object per change: useSyncExternalStore compares by identity.
let snapshot: { status: SyncStatus; lastSyncAt: string | null } = { status, lastSyncAt };

function publish(next: SyncStatus) {
  status = next;
  snapshot = { status, lastSyncAt };
  listeners.forEach((l) => l());
}

export const syncStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => snapshot,
};

export async function runSync() {
  if (running) {
    queuedAgain = true;
    return;
  }
  if (!navigator.onLine) {
    publish("offline");
    return;
  }
  running = true;
  publish("syncing");
  try {
    const result = await syncNow(supabaseRemote);
    lastSyncAt = new Date().toISOString();
    publish(result.stoppedOffline ? "offline" : result.parked > 0 ? "error" : "idle");
  } catch {
    publish("error");
  } finally {
    running = false;
    if (queuedAgain) {
      queuedAgain = false;
      void runSync();
    }
  }
}

const onOnline = () => void runSync();
const onVisible = () => {
  if (document.visibilityState === "visible") void runSync();
};

const USER_KEY = "trening.localUser";

/**
 * Starts background sync for a user. Local data belongs to one account, so
 * signing in as somebody else on the same device wipes it first.
 */
export async function startSync(userId: string) {
  let previous: string | null = null;
  try {
    previous = localStorage.getItem(USER_KEY);
  } catch {
    // private mode: treat as a fresh device
  }
  if (previous && previous !== userId) await clearLocalData();
  try {
    localStorage.setItem(USER_KEY, userId);
  } catch {
    // ignore
  }

  setAfterWrite(() => void runSync());
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", () => publish("offline"));
  document.addEventListener("visibilitychange", onVisible);
  timer ??= setInterval(() => void runSync(), 60_000);
  await runSync();
}

export function stopSync() {
  setAfterWrite(null);
  window.removeEventListener("online", onOnline);
  document.removeEventListener("visibilitychange", onVisible);
  if (timer) clearInterval(timer);
  timer = null;
}

/** Number of rows still waiting to reach the server. */
export const pendingCount = () => db.outbox.count();
