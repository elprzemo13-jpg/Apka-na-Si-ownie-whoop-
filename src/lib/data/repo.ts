import { db, type LocalDb } from "./local";
import type { SyncFields, SyncTable } from "./types";

export const newId = () => crypto.randomUUID();
export const nowIso = () => new Date().toISOString();

/** Fields every new row starts with. `updated_at` drives conflict resolution. */
export function newRow<T extends object>(fields: T): T & SyncFields {
  const now = nowIso();
  return { id: newId(), created_at: now, updated_at: now, deleted_at: null, ...fields };
}

type AnyRow = SyncFields & Record<string, unknown>;

/**
 * Writes a row locally and queues it for the server in one transaction: the
 * screen updates immediately and nothing is lost if the app closes offline.
 */
export async function save(table: SyncTable, row: AnyRow, database: LocalDb = db) {
  const payload = { ...row, updated_at: nowIso() };
  delete payload.synced_at; // server-owned
  await database.transaction("rw", database.table(table), database.outbox, async () => {
    await database.table(table).put(payload);
    await enqueue(table, payload, database);
  });
  afterWrite?.();
  return payload;
}

/** Soft delete: the row stays until the server has seen the deletion. */
export async function remove(table: SyncTable, id: string, database: LocalDb = db) {
  const row = (await database.table(table).get(id)) as AnyRow | undefined;
  if (!row) return;
  await save(table, { ...row, deleted_at: nowIso() }, database);
}

async function enqueue(table: SyncTable, payload: AnyRow, database: LocalDb) {
  const existing = await database.outbox.where({ table, row_id: payload.id }).first();
  const entry = {
    table,
    row_id: payload.id,
    payload: payload as Record<string, unknown>,
    queued_at: nowIso(),
    tries: 0,
  };
  // Only the latest version of a row needs to travel.
  if (existing?.seq !== undefined) await database.outbox.update(existing.seq, entry);
  else await database.outbox.add(entry);
}

/** Rows a user can see: soft-deleted ones are hidden everywhere. */
export const isLive = <T extends { deleted_at: string | null }>(row: T) => row.deleted_at === null;

export function sortByPosition<T extends { position: number; created_at: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));
}

// The sync service registers here so a save can try to reach the server at
// once, instead of waiting for the next scheduled sync.
let afterWrite: (() => void) | null = null;
export function setAfterWrite(fn: (() => void) | null) {
  afterWrite = fn;
}
