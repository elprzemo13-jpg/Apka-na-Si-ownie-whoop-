import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { LocalDb } from "./local";
import type { Remote, RemoteError } from "./types";
import { newRow, remove, save } from "./repo";
import { pullTable, pushOutbox, syncNow } from "./sync";
import type { SyncTable } from "./types";

/** In-memory stand-in for the server, with synced_at stamped on write. */
function fakeRemote() {
  const rows = new Map<string, Record<string, unknown>[]>();
  let clock = 0;
  let failWith: RemoteError | null = null;

  const remote: Remote = {
    async upsert(table, payload) {
      if (failWith) return { error: failWith };
      clock += 1;
      const stored = rows.get(table) ?? [];
      const next = { ...payload, synced_at: new Date(clock * 1000).toISOString() };
      rows.set(table, [...stored.filter((r) => r["id"] !== payload["id"]), next]);
      return { error: null };
    },
    async fetchSince(table, cursor, limit) {
      if (failWith) return { rows: [], error: failWith };
      const stored = rows.get(table) ?? [];
      const after = stored
        .filter((r) => String(r["synced_at"]) > (cursor ?? ""))
        .sort((a, b) => String(a["synced_at"]).localeCompare(String(b["synced_at"])))
        .slice(0, limit);
      return { rows: after, error: null };
    },
  };

  return {
    remote,
    rowsOf: (table: SyncTable) => rows.get(table) ?? [],
    seed(table: SyncTable, row: Record<string, unknown>) {
      clock += 1;
      const stored = rows.get(table) ?? [];
      rows.set(table, [...stored, { ...row, synced_at: new Date(clock * 1000).toISOString() }]);
    },
    setFailure(error: RemoteError | null) {
      failWith = error;
    },
  };
}

const offline: RemoteError = { message: "Failed to fetch", retryable: true };
const rejected: RemoteError = { message: "row-level security", code: "42501", retryable: false };

const exercise = (name: string) =>
  newRow({ user_id: "u1", name, load_type: "weighted", progression: "weight", weight_step_kg: 2.5 });

let db: LocalDb;
let server: ReturnType<typeof fakeRemote>;

beforeEach(async () => {
  db = new LocalDb(`test-${crypto.randomUUID()}`);
  await db.open();
  server = fakeRemote();
});

describe("saving", () => {
  it("writes locally and queues one entry per row", async () => {
    const row = exercise("Przysiad");
    await save("exercises", row, db);
    await save("exercises", { ...row, name: "Przysiad ze sztangą" }, db);

    expect((await db.exercises.get(row.id))?.name).toBe("Przysiad ze sztangą");
    expect(await db.outbox.count()).toBe(1); // only the latest version travels
  });

  it("marks deletions instead of dropping rows", async () => {
    const row = exercise("Plank");
    await save("exercises", row, db);
    await remove("exercises", row.id, db);
    expect((await db.exercises.get(row.id))?.deleted_at).not.toBeNull();
  });
});

describe("pushing", () => {
  it("sends queued rows and empties the queue", async () => {
    await save("exercises", exercise("Przysiad"), db);
    const result = await pushOutbox(server.remote, db);
    expect(result).toMatchObject({ pushed: 1, stoppedOffline: false });
    expect(await db.outbox.count()).toBe(0);
    expect(server.rowsOf("exercises")).toHaveLength(1);
  });

  it("keeps everything queued while offline", async () => {
    await save("exercises", exercise("Przysiad"), db);
    server.setFailure(offline);
    const result = await pushOutbox(server.remote, db);
    expect(result.stoppedOffline).toBe(true);
    expect(await db.outbox.count()).toBe(1);

    server.setFailure(null);
    expect((await pushOutbox(server.remote, db)).pushed).toBe(1);
    expect(await db.outbox.count()).toBe(0);
  });

  it("parks a rejected row after repeated attempts instead of blocking the queue", async () => {
    const bad = exercise("Odrzucone");
    await save("exercises", bad, db);
    server.setFailure(rejected);
    for (let i = 0; i < 6; i++) await pushOutbox(server.remote, db);

    const entry = await db.outbox.where({ table: "exercises", row_id: bad.id }).first();
    expect(entry?.tries).toBe(5);
    expect(entry?.last_error).toMatch(/row-level security/);

    server.setFailure(null);
    await save("exercises", exercise("Dobre"), db);
    const result = await pushOutbox(server.remote, db);
    expect(result.pushed).toBe(1); // the parked row no longer holds up the rest
    expect(result.parked).toBe(1);
  });
});

describe("pulling", () => {
  it("stores server rows and never duplicates them", async () => {
    const row = exercise("Martwy ciąg");
    server.seed("exercises", row);
    expect((await pullTable("exercises", server.remote, db)).pulled).toBe(1);
    expect(await db.exercises.count()).toBe(1);

    // The cursor is rewound by a few seconds on purpose, so a just-written row
    // may arrive twice. It must land on the same row, not a second one.
    await pullTable("exercises", server.remote, db);
    expect(await db.exercises.count()).toBe(1);
    expect((await db.exercises.get(row.id))?.name).toBe("Martwy ciąg");
  });

  it("stops re-reading rows once they are older than the cursor overlap", async () => {
    server.seed("exercises", exercise("Stary wpis"));
    await pullTable("exercises", server.remote, db);
    // Move the cursor past the overlap, as real time does between syncs.
    await db.sync_state.put({ table: "exercises", cursor: new Date(Date.now() + 60_000).toISOString() });
    expect((await pullTable("exercises", server.remote, db)).pulled).toBe(0);
  });

  it("does not overwrite a local edit that has not been sent yet", async () => {
    const row = exercise("Wiosłowanie");
    server.seed("exercises", { ...row, name: "Wersja z serwera" });
    await save("exercises", { ...row, name: "Wersja z telefonu" }, db);

    await pullTable("exercises", server.remote, db);
    expect((await db.exercises.get(row.id))?.name).toBe("Wersja z telefonu");

    await syncNow(server.remote, db);
    expect((await db.exercises.get(row.id))?.name).toBe("Wersja z telefonu");
    expect(server.rowsOf("exercises")[0]?.["name"]).toBe("Wersja z telefonu");
  });

  it("round-trips a row through sync without duplicating it", async () => {
    await save("exercises", exercise("Face pull"), db);
    const first = await syncNow(server.remote, db);
    expect(first).toMatchObject({ pushed: 1, stoppedOffline: false });

    const second = await syncNow(server.remote, db);
    expect(second.pushed).toBe(0);
    expect(await db.exercises.count()).toBe(1);
  });

  it("reports being offline and changes nothing", async () => {
    server.setFailure(offline);
    const result = await syncNow(server.remote, db);
    expect(result.stoppedOffline).toBe(true);
    expect(result.pulled).toBe(0);
  });
});
