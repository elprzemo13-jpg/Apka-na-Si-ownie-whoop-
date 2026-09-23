import { beforeEach, describe, expect, it } from "vitest";
import { createDb, type Db } from "./harness";

let db: Db;
let alice: string;
let bob: string;
let carol: string;

const MONDAY = "2026-09-21";

async function setSharing(userId: string, level: "none" | "basic" | "full") {
  await db.query("update public.profiles set sharing_level = $2, username = $3 where id = $1", [
    userId,
    level,
    `user_${userId.slice(0, 8)}`,
  ]);
}

async function befriend(a: string, b: string) {
  const { rows } = await db.as(a, () =>
    db.query<{ id: string }>(
      "insert into public.relationships (requester_id, addressee_id) values ($1, $2) returning id",
      [a, b],
    ),
  );
  await db.as(b, () =>
    db.query("update public.relationships set status = 'accepted', updated_at = now() where id = $1", [
      rows[0]!.id,
    ]),
  );
}

async function addSession(userId: string, fields: Record<string, unknown>) {
  const cols = ["user_id", ...Object.keys(fields)];
  const values = [userId, ...Object.values(fields)];
  await db.query(
    `insert into public.sessions (${cols.join(",")}) values (${values.map((_, i) => `$${i + 1}`).join(",")})`,
    values,
  );
}

const swim = (performed_on: string, distance_m: number) => ({
  discipline: "swim",
  performed_on,
  distance_m,
  duration_s: 3000,
});

beforeEach(async () => {
  db = await createDb();
  alice = await db.createUser();
  bob = await db.createUser();
  carol = await db.createUser();
  await setSharing(alice, "none");
  await setSharing(bob, "full");
  await setSharing(carol, "basic");
});

describe("find_user", () => {
  it("finds an exact username and never lists people", async () => {
    const { rows } = await db.as(alice, () =>
      db.query<{ id: string }>("select id from public.find_user($1)", [`user_${bob.slice(0, 8)}`]),
    );
    expect(rows[0]?.id).toBe(bob);

    const miss = await db.as(alice, () => db.query("select * from public.find_user('user_')"));
    expect(miss.rows).toHaveLength(0);
  });

  it("finds by invite code and refuses to return the caller", async () => {
    const { rows: code } = await db.query<{ invite_code: string }>(
      "select invite_code from public.profiles where id = $1",
      [bob],
    );
    const found = await db.as(alice, () =>
      db.query<{ id: string }>("select id from public.find_user($1)", [code[0]!.invite_code.toUpperCase()]),
    );
    expect(found.rows[0]?.id).toBe(bob);

    const { rows: own } = await db.query<{ invite_code: string }>(
      "select invite_code from public.profiles where id = $1",
      [alice],
    );
    const self = await db.as(alice, () =>
      db.query("select * from public.find_user($1)", [own[0]!.invite_code]),
    );
    expect(self.rows).toHaveLength(0);
  });
});

describe("friend_feed", () => {
  beforeEach(async () => {
    await addSession(bob, swim(MONDAY, 2500));
    await addSession(carol, swim(MONDAY, 3000));
  });

  it("shows nothing before an invitation is accepted", async () => {
    const { rows } = await db.as(alice, () => db.query("select * from public.friend_feed(3650)"));
    expect(rows).toHaveLength(0);
  });

  it("gives numbers at the full level and only the fact at basic", async () => {
    await befriend(alice, bob);
    await befriend(alice, carol);
    const { rows } = await db.as(alice, () =>
      db.query<{ user_id: string; load_points: string | null; discipline: string }>(
        "select * from public.friend_feed(3650)",
      ),
    );

    const fromBob = rows.find((r) => r.user_id === bob)!;
    const fromCarol = rows.find((r) => r.user_id === carol)!;
    expect(Number(fromBob.load_points)).toBeCloseTo(3);
    expect(fromCarol.load_points).toBeNull();
    expect(fromCarol.discipline).toBe("swim"); // the discipline is still shared
  });

  it("stops sharing the moment the level goes back to none", async () => {
    await befriend(alice, bob);
    await setSharing(bob, "none");
    const { rows } = await db.as(alice, () => db.query("select * from public.friend_feed(3650)"));
    expect(rows).toHaveLength(0);
  });
});

describe("weekly_leaderboard", () => {
  beforeEach(async () => {
    await db.query(
      "insert into public.weekly_goals (user_id, discipline, target_sessions) values ($1,'swim',4), ($2,'swim',4)",
      [bob, carol],
    );
    await addSession(bob, swim(MONDAY, 2500));
    await addSession(bob, swim("2026-09-22", 2500));
    await addSession(carol, swim(MONDAY, 3000));
  });

  it("ranks friends by completion and hides load from basic sharers", async () => {
    await befriend(alice, bob);
    await befriend(alice, carol);
    const { rows } = await db.as(alice, () =>
      db.query<{ user_id: string; completion: number; swim: string | null }>(
        "select * from public.weekly_leaderboard($1)",
        [MONDAY],
      ),
    );

    const bobRow = rows.find((r) => r.user_id === bob)!;
    const carolRow = rows.find((r) => r.user_id === carol)!;
    expect(bobRow.completion).toBe(50); // 2 of 4
    expect(carolRow.completion).toBe(25); // 1 of 4
    expect(Number(bobRow.swim)).toBeCloseTo(6);
    expect(carolRow.swim).toBeNull();
    expect(rows[0]!.user_id).toBe(bob); // sorted by completion
  });

  it("includes the caller even though they share nothing", async () => {
    const { rows } = await db.as(alice, () =>
      db.query<{ user_id: string }>("select * from public.weekly_leaderboard($1)", [MONDAY]),
    );
    expect(rows.map((r) => r.user_id)).toEqual([alice]);
  });
});

describe("access", () => {
  it("refuses these functions to anonymous callers", async () => {
    await db.exec("set role anon");
    await expect(db.query("select * from public.find_user('x')")).rejects.toThrow(/permission denied/);
    await expect(db.query("select * from public.weekly_leaderboard(current_date)")).rejects.toThrow(
      /permission denied/,
    );
    await db.exec("reset role");
  });

  it("keeps the internal helper out of the public API", async () => {
    await db.as(alice, async () => {
      await expect(db.query("select * from public.visible_people()")).rejects.toThrow(/permission denied/);
    });
  });
});
