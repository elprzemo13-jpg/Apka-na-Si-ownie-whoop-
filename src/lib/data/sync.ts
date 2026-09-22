import { db, type LocalDb } from "./local";
import type { Remote } from "./types";
import { SYNC_TABLES, type SyncTable } from "./types";

const PAGE = 500;
/** The pull cursor is rewound a little: a transaction can commit with a
 *  timestamp slightly behind one already seen, and would otherwise be missed. */
const CURSOR_OVERLAP_MS = 5000;
/** After this many failed attempts a row is parked instead of blocking the queue. */
const MAX_TRIES = 5;

export type SyncResult = {
  pushed: number;
  pulled: number;
  parked: number;
  stoppedOffline: boolean;
};

export async function pushOutbox(remote: Remote, database: LocalDb = db) {
  let pushed = 0;
  let parked = 0;
  const entries = await database.outbox.orderBy("seq").toArray();
  for (const entry of entries) {
    if (entry.seq === undefined) continue;
    if (entry.tries >= MAX_TRIES) {
      parked++;
      continue;
    }
    const { error } = await remote.upsert(entry.table, entry.payload);
    if (!error) {
      await database.outbox.delete(entry.seq);
      pushed++;
      continue;
    }
    if (error.retryable) return { pushed, parked, stoppedOffline: true };
    await database.outbox.update(entry.seq, { tries: entry.tries + 1, last_error: error.message });
    parked++;
  }
  return { pushed, parked, stoppedOffline: false };
}

export async function pullTable(table: SyncTable, remote: Remote, database: LocalDb = db) {
  let pulled = 0;
  for (;;) {
    const state = await database.sync_state.get(table);
    const { rows, error } = await remote.fetchSince(table, state?.cursor ?? null, PAGE);
    if (error) return { pulled, error };
    if (rows.length === 0) return { pulled, error: null };

    // A row waiting in the outbox holds a newer local edit; keep it.
    const pending = new Set(
      (await database.outbox.where("table").equals(table).toArray()).map((e) => e.row_id),
    );
    const incoming = rows.filter((row) => !pending.has(row["id"] as string));
    if (incoming.length) await database.table(table).bulkPut(incoming);
    pulled += incoming.length;

    const newest = rows.reduce<string>((max, row) => {
      const value = String(row["synced_at"] ?? "");
      return value > max ? value : max;
    }, "");
    const cursor = new Date(new Date(newest).getTime() - CURSOR_OVERLAP_MS).toISOString();
    await database.sync_state.put({ table, cursor });

    if (rows.length < PAGE) return { pulled, error: null };
  }
}

export async function syncNow(remote: Remote, database: LocalDb = db): Promise<SyncResult> {
  const push = await pushOutbox(remote, database);
  let pulled = 0;
  let stoppedOffline = push.stoppedOffline;
  if (!stoppedOffline) {
    for (const table of SYNC_TABLES) {
      const result = await pullTable(table, remote, database);
      pulled += result.pulled;
      if (result.error?.retryable) {
        stoppedOffline = true;
        break;
      }
    }
  }
  return { pushed: push.pushed, parked: push.parked, pulled, stoppedOffline };
}
