import { beforeEach, describe, expect, it } from "vitest";
import { createDb, type Db } from "./harness";

let db: Db;
let alice: string;
let bob: string;

beforeEach(async () => {
  db = await createDb();
  alice = await db.createUser();
  bob = await db.createUser();
});

async function count(sql: string, params: unknown[] = []) {
  const { rows } = await db.query<{ n: number }>(`select count(*)::int as n from (${sql}) q`, params);
  return rows[0]!.n;
}

async function addSession(userId: string, fields: Record<string, unknown>) {
  const cols = ["user_id", ...Object.keys(fields)];
  const vals = [userId, ...Object.values(fields)];
  const { rows } = await db.query<{ id: string; load_points: string }>(
    `insert into public.sessions (${cols.join(",")}) values (${vals.map((_, i) => `$${i + 1}`).join(",")})
     returning id, load_points`,
    vals,
  );
  return rows[0]!;
}

async function loadOf(sessionId: string) {
  const { rows } = await db.query<{ load_points: string }>(
    "select load_points from public.sessions where id = $1",
    [sessionId],
  );
  return Number(rows[0]!.load_points);
}

async function makeFriends(a: string, b: string) {
  const { rows } = await db.as(a, () =>
    db.query<{ id: string }>(
      "insert into public.relationships (requester_id, addressee_id) values ($1, $2) returning id",
      [a, b],
    ),
  );
  const id = rows[0]!.id;
  await db.as(b, () =>
    db.query("update public.relationships set status = 'accepted', updated_at = now() where id = $1", [id]),
  );
  return id;
}

describe("new user", () => {
  it("gets a private profile with an invite code", async () => {
    const { rows } = await db.query<{ sharing_level: string; invite_code: string }>(
      "select sharing_level, invite_code from public.profiles where id = $1",
      [alice],
    );
    expect(rows[0]!.sharing_level).toBe("none");
    expect(rows[0]!.invite_code).toHaveLength(8);
  });
});

describe("load points", () => {
  it("uses the per-km multipliers for endurance", async () => {
    const d = { performed_on: "2026-09-21", duration_s: 3600 };
    const swim = await addSession(alice, { ...d, discipline: "swim", distance_m: 2500 });
    const run = await addSession(alice, { ...d, discipline: "run", distance_m: 10000 });
    const bike = await addSession(alice, { ...d, discipline: "bike", distance_m: 30000 });
    expect(Number(swim.load_points)).toBeCloseTo(3.0);
    expect(Number(run.load_points)).toBeCloseTo(5.0);
    expect(Number(bike.load_points)).toBeCloseTo(3.6);
  });

  it("sums reps × kg / 1000 for gym, ignoring skipped exercises and deleted sets", async () => {
    const s = await addSession(alice, { discipline: "gym", performed_on: "2026-09-21" });
    const { rows: ex } = await db.query<{ id: string }>(
      "insert into public.exercises (user_id, name) values ($1, 'Przysiad') returning id",
      [alice],
    );
    const exId = ex[0]!.id;
    const { rows: se } = await db.query<{ id: string; skipped: boolean }>(
      `insert into public.session_exercises (session_id, exercise_id, name_snapshot, skipped)
       values ($1, $2, 'Przysiad', false), ($1, $2, 'Przysiad', true) returning id, skipped`,
      [s.id, exId],
    );
    const done = se.find((r) => !r.skipped)!.id;
    const skipped = se.find((r) => r.skipped)!.id;
    await db.query(
      `insert into public.session_sets (session_exercise_id, set_no, reps, weight_kg) values
       ($1, 1, 5, 100), ($1, 2, 5, 100), ($1, 3, 10, null), ($2, 1, 10, 50)`,
      [done, skipped],
    );
    expect(await loadOf(s.id)).toBeCloseTo(1.0);

    await db.query("update public.session_sets set deleted_at = now(), updated_at = now() where set_no = 2");
    expect(await loadOf(s.id)).toBeCloseTo(0.5);
  });

  it("ignores load_points sent by a client", async () => {
    const s = await db.as(alice, () =>
      addSession(alice, { discipline: "run", performed_on: "2026-09-21", distance_m: 5000, duration_s: 1500, load_points: 999 }),
    );
    expect(Number(s.load_points)).toBeCloseTo(2.5);
  });
});

describe("sync guard", () => {
  it("drops an update carrying an older device edit time", async () => {
    const s = await addSession(alice, {
      discipline: "run", performed_on: "2026-09-21", distance_m: 5000, duration_s: 1500,
      updated_at: "2026-09-21T10:00:00Z",
    });
    await db.query("update public.sessions set notes = 'stale', updated_at = '2026-09-21T09:00:00Z' where id = $1", [s.id]);
    await db.query("update public.sessions set notes = 'fresh', updated_at = '2026-09-21T11:00:00Z' where id = $1", [s.id]);
    await db.query("update public.sessions set notes = 'late', updated_at = '2026-09-21T10:30:00Z' where id = $1", [s.id]);
    const { rows } = await db.query<{ notes: string }>("select notes from public.sessions where id = $1", [s.id]);
    expect(rows[0]!.notes).toBe("fresh");
  });
});

describe("row level security", () => {
  const run = { discipline: "run", performed_on: "2026-09-21", distance_m: 5000, duration_s: 1500 };

  it("hides other users' data", async () => {
    await addSession(bob, run);
    expect(await db.as(alice, () => count("select * from public.sessions"))).toBe(0);
    expect(await db.as(alice, () => count("select * from public.profiles"))).toBe(1);
  });

  it("refuses writing rows for another user", async () => {
    await expect(db.as(alice, () => addSession(bob, run))).rejects.toThrow(/row-level security/);
  });

  it("shows sessions to an accepted friend only at the 'full' level", async () => {
    await addSession(bob, run);
    await makeFriends(alice, bob);
    const visible = () => db.as(alice, () => count("select * from public.sessions"));

    expect(await visible()).toBe(0); // bob still shares nothing

    await db.query("update public.profiles set sharing_level = 'basic', updated_at = now() where id = $1", [bob]);
    expect(await visible()).toBe(0); // basic is served by RPCs, never rows

    await db.query("update public.profiles set sharing_level = 'full', updated_at = now() where id = $1", [bob]);
    expect(await visible()).toBe(1);
  });

  it("does not share through a pending invitation", async () => {
    await addSession(bob, run);
    await db.query("update public.profiles set sharing_level = 'full' where id = $1", [bob]);
    await db.as(alice, () =>
      db.query("insert into public.relationships (requester_id, addressee_id) values ($1, $2)", [alice, bob]),
    );
    expect(await db.as(alice, () => count("select * from public.sessions"))).toBe(0);
  });

  it("lets only the addressee accept an invitation", async () => {
    const { rows } = await db.as(alice, () =>
      db.query<{ id: string }>(
        "insert into public.relationships (requester_id, addressee_id) values ($1, $2) returning id",
        [alice, bob],
      ),
    );
    await expect(
      db.as(alice, () =>
        db.query("update public.relationships set status = 'accepted', updated_at = now() where id = $1", [rows[0]!.id]),
      ),
    ).rejects.toThrow(/only the addressee/);
  });

  it("refuses putting someone else's exercise into your plan", async () => {
    const { rows: ex } = await db.query<{ id: string }>(
      "insert into public.exercises (user_id, name) values ($1, 'Cudze') returning id",
      [bob],
    );
    await expect(
      db.as(alice, async () => {
        const { rows: p } = await db.query<{ id: string }>(
          "insert into public.plans (owner_id, author_id, name) values ($1, $1, 'Mój') returning id",
          [alice],
        );
        const { rows: d } = await db.query<{ id: string }>(
          "insert into public.plan_days (plan_id, name) values ($1, 'D1') returning id",
          [p[0]!.id],
        );
        await db.query(
          `insert into public.plan_exercises (plan_day_id, exercise_id, target_sets, rep_min, rep_max)
           values ($1, $2, 3, 8, 10)`,
          [d[0]!.id, ex[0]!.id],
        );
      }),
    ).rejects.toThrow(/row-level security/);
  });
});
