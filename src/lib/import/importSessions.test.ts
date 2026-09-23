import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { LocalDb } from "../data/local";
import { importSessions } from "./importSessions";
import { parseOldAppCsv } from "./oldAppCsv";

const HEADER =
  "data;typ;dzien;cwiczenie;seria;powtorzenia;kg;dystans_m;czas_min;tempo_100m;pod_woda_m;styl;charakter;rozgrzewka;rozciaganie;notatki";

const CSV = [
  HEADER,
  "2026-09-14;silownia;D1;Przysiad ze sztangą;1;6;60;;;;;;;1;1;",
  "2026-09-14;silownia;D1;Przysiad ze sztangą;2;5;60;;;;;;;1;1;",
  "2026-09-15;woda;;;;;;2500;50;2:00;300;Kraul;Technika;;;rano",
].join("\n");

let db: LocalDb;

beforeEach(async () => {
  db = new LocalDb(`import-${crypto.randomUUID()}`);
  await db.open();
});

describe("importSessions", () => {
  it("writes the sessions, exercises and sets, and queues them", async () => {
    const { sessions } = parseOldAppCsv(CSV);
    const summary = await importSessions("u1", sessions, db);

    expect(summary).toEqual({ imported: 2, skipped: 0 });
    expect(await db.sessions.count()).toBe(2);
    expect(await db.session_sets.count()).toBe(2);
    expect(await db.exercises.count()).toBe(1);
    expect((await db.outbox.count()) > 0).toBe(true);

    const gym = (await db.sessions.toArray()).find((s) => s.discipline === "gym")!;
    expect(gym).toMatchObject({ performed_on: "2026-09-14", day_label_snapshot: "D1", warmup_done: true });
    const exercise = (await db.session_exercises.toArray())[0]!;
    // The plan target is reconstructed from what was actually done.
    expect(exercise).toMatchObject({ rep_min: 5, rep_max: 6, target_sets: 2 });
  });

  it("can be run twice without duplicating anything", async () => {
    const { sessions } = parseOldAppCsv(CSV);
    await importSessions("u1", sessions, db);
    const second = await importSessions("u1", sessions, db);

    expect(second).toEqual({ imported: 0, skipped: 2 });
    expect(await db.sessions.count()).toBe(2);
  });

  it("reuses an exercise that already exists, so records stay together", async () => {
    const { sessions } = parseOldAppCsv(CSV);
    await importSessions("u1", sessions, db);
    const before = await db.exercises.count();

    const later = parseOldAppCsv(
      [HEADER, "2026-09-21;silownia;D1;przysiad ze sztangą;1;6;65;;;;;;;1;1;"].join("\n"),
    );
    await importSessions("u1", later.sessions, db);

    expect(await db.exercises.count()).toBe(before); // matched case-insensitively
  });
});
