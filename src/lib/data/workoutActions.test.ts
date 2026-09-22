import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { LocalDb } from "./local";
import { newRow } from "./repo";
import {
  buildChecklistDrafts,
  buildExerciseDrafts,
  canSaveEndurance,
  canSaveGym,
  deleteSession,
  saveEnduranceSession,
  saveGymSession,
  type EnduranceDraft,
  type ChecklistDraft,
  type ExerciseDraft,
  type GymDraft,
} from "./workoutActions";
import type { PlanDay } from "./types";

let db: LocalDb;

const day = newRow({
  plan_id: "plan-1",
  name: "D1 Nogi",
  position: 0,
  weekdays: [0],
  default_rest_s: 120,
}) as PlanDay;

const exercise = (over: Partial<ExerciseDraft> = {}): ExerciseDraft => ({
  planExerciseId: crypto.randomUUID(),
  exerciseId: crypto.randomUUID(),
  name: "Przysiad ze sztangą",
  skipped: false,
  targetSets: 3,
  repMin: 5,
  repMax: 6,
  repUnit: "reps",
  perSide: false,
  sets: [
    { reps: "6", weight: "60", height: "" },
    { reps: "6", weight: "60", height: "" },
    { reps: "", weight: "", height: "" },
  ],
  ...over,
});

const draft = (over: Partial<GymDraft> = {}): GymDraft => ({
  performedOn: "2026-09-22",
  day,
  exercises: [exercise()],
  checklist: [],
  ...over,
});

const checklist = (done: boolean[]): ChecklistDraft[] =>
  done.map((value, i) => ({ label: `Pozycja ${i + 1}`, kind: "stretch" as const, done: value }));

beforeEach(async () => {
  db = new LocalDb(`workout-${crypto.randomUUID()}`);
  await db.open();
});

describe("canSaveGym", () => {
  it("needs at least one set with repetitions", () => {
    expect(canSaveGym(draft())).toBe(true);
    expect(canSaveGym(draft({ exercises: [exercise({ sets: [{ reps: "", weight: "60", height: "" }] })] }))).toBe(false);
  });

  it("does not count a skipped exercise", () => {
    expect(canSaveGym(draft({ exercises: [exercise({ skipped: true })] }))).toBe(false);
  });
});

describe("saveGymSession", () => {
  it("drops empty sets and keeps the filled ones", async () => {
    await saveGymSession("u1", draft(), db);
    // toArray() has no defined order, so sort before comparing.
    const sets = (await db.session_sets.toArray()).sort((a, b) => a.set_no - b.set_no);
    expect(sets).toHaveLength(2);
    expect(sets.map((s) => s.set_no)).toEqual([1, 2]);
    expect(sets[0]?.weight_kg).toBe(60);
  });

  it("records a skipped exercise without sets, so history keeps the plan", async () => {
    await saveGymSession("u1", draft({ exercises: [exercise(), exercise({ skipped: true, name: "Plank" })] }), db);
    const rows = await db.session_exercises.toArray();
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.name_snapshot === "Plank")?.skipped).toBe(true);
    expect(await db.session_sets.where("session_exercise_id").equals(rows.find((r) => r.skipped)!.id).count()).toBe(0);
  });

  it("leaves out an exercise that was simply not filled in", async () => {
    const untouched = exercise({ name: "Wspięcia", sets: [{ reps: "", weight: "", height: "" }] });
    await saveGymSession("u1", draft({ exercises: [exercise(), untouched] }), db);
    const names = (await db.session_exercises.toArray()).map((r) => r.name_snapshot);
    expect(names).toEqual(["Przysiad ze sztangą"]);
  });

  it("counts a checklist as done only when every item is ticked", async () => {
    await saveGymSession("u1", draft({ checklist: checklist([true, false]) }), db);
    expect((await db.sessions.toArray())[0]?.stretch_done).toBe(false);

    await saveGymSession("u1", draft({ checklist: checklist([true, true]) }), db);
    const sessions = (await db.sessions.toArray()).sort((a, b) => a.created_at.localeCompare(b.created_at));
    expect(sessions[1]?.stretch_done).toBe(true);
  });

  it("does not count an empty checklist as done", async () => {
    await saveGymSession("u1", draft({ checklist: [] }), db);
    expect((await db.sessions.toArray())[0]?.warmup_done).toBe(false);
  });

  it("stores sets without weight as null and marks extra sets", async () => {
    const plank = exercise({
      name: "Plank",
      repUnit: "seconds",
      targetSets: 2,
      sets: [
        { reps: "40", weight: "", height: "" },
        { reps: "40", weight: "", height: "" },
        { reps: "30", weight: "", height: "" },
      ],
    });
    await saveGymSession("u1", draft({ exercises: [plank] }), db);
    const sets = (await db.session_sets.toArray()).sort((a, b) => a.set_no - b.set_no);
    expect(sets.map((s) => s.weight_kg)).toEqual([null, null, null]);
    expect(sets.map((s) => s.is_extra)).toEqual([false, false, true]);
  });

  it("queues everything for the server", async () => {
    await saveGymSession("u1", draft({ checklist: checklist([true]) }), db);
    const queued = await db.outbox.orderBy("seq").toArray();
    expect(queued.map((q) => q.table)).toEqual([
      "sessions",
      "session_checklist_items",
      "session_exercises",
      "session_sets",
      "session_sets",
    ]);
  });
});

describe("rebuilding the form while it is being filled in", () => {
  const planRow = (over: Record<string, unknown> = {}) => ({
    id: "pe-1",
    exercise_id: "ex-1",
    target_sets: 3,
    rep_min: 5,
    rep_max: 6,
    rep_unit: "reps" as const,
    per_side: false,
    exercise: { name: "Przysiad ze sztangą" },
    ...over,
  });

  it("keeps typed sets when the plan is re-read during a background sync", () => {
    const first = buildExerciseDrafts([planRow()]);
    const typed = [
      { ...first[0]!, sets: [{ reps: "6", weight: "60", height: "" }, ...first[0]!.sets.slice(1)] },
    ];
    // A sync emits an equal-but-new array; this used to wipe the workout.
    const merged = buildExerciseDrafts([planRow()], typed);
    expect(merged[0]?.sets[0]).toEqual({ reps: "6", weight: "60", height: "" });
    expect(canSaveGym(draft({ exercises: merged }))).toBe(true);
  });

  it("keeps a skipped exercise skipped and extra sets added by hand", () => {
    const typed = buildExerciseDrafts([planRow()]).map((d) => ({
      ...d,
      skipped: true,
      sets: [...d.sets, { reps: "8", weight: "40", height: "" }],
    }));
    const merged = buildExerciseDrafts([planRow()], typed);
    expect(merged[0]?.skipped).toBe(true);
    expect(merged[0]?.sets).toHaveLength(4);
  });

  it("adds rows for exercises added to the plan and drops removed ones", () => {
    const typed = buildExerciseDrafts([planRow()]);
    const merged = buildExerciseDrafts([planRow({ id: "pe-2", exercise: { name: "Wykroki" } })], typed);
    expect(merged.map((d) => d.planExerciseId)).toEqual(["pe-2"]);
  });

  it("keeps ticked checklist items across a rebuild", () => {
    const items = [{ label: "Lekkie cardio" }, { label: "Krążenia ramion" }];
    const ticked = buildChecklistDrafts(items, [{ label: "Czworogłowy" }]).map((item, i) =>
      i === 0 ? { ...item, done: true } : item,
    );
    const merged = buildChecklistDrafts(items, [{ label: "Czworogłowy" }], ticked);
    expect(merged[0]?.done).toBe(true);
    expect(merged[1]?.done).toBe(false);
  });
});

describe("endurance sessions", () => {
  const swim = (over: Partial<EnduranceDraft> = {}): EnduranceDraft => ({
    discipline: "swim",
    performedOn: "2026-09-22",
    distance: "2500",
    durationMin: "50",
    sessionType: "Technika",
    swimStyle: "Kraul",
    underwaterM: "300",
    notes: " 20×50 kraul ",
    ...over,
  });

  it("stores swimming distance in metres and time in seconds", async () => {
    await saveEnduranceSession("u1", swim(), db);
    const row = (await db.sessions.toArray())[0]!;
    expect(row).toMatchObject({
      discipline: "swim",
      distance_m: 2500,
      duration_s: 3000,
      swim_style: "Kraul",
      underwater_m: 300,
      notes: "20×50 kraul",
    });
  });

  it("converts kilometres to metres for running and cycling", async () => {
    await saveEnduranceSession("u1", swim({ discipline: "run", distance: "10,5", swimStyle: null, underwaterM: "" }), db);
    const row = (await db.sessions.toArray())[0]!;
    expect(row.distance_m).toBe(10500);
    expect(row.swim_style).toBeNull();
    expect(row.underwater_m).toBeNull();
  });

  it("needs both distance and time", () => {
    expect(canSaveEndurance(swim())).toBe(true);
    expect(canSaveEndurance(swim({ distance: "" }))).toBe(false);
    expect(canSaveEndurance(swim({ durationMin: "0" }))).toBe(false);
  });

  it("updates an existing entry instead of adding a second one", async () => {
    const first = await saveEnduranceSession("u1", swim(), db);
    await saveEnduranceSession("u1", swim({ id: first.id, distance: "3000" }), db);
    const rows = await db.sessions.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.distance_m).toBe(3000);
  });

  it("soft-deletes a gym session with its exercises and sets", async () => {
    const saved = await saveGymSession("u1", draft(), db);
    await deleteSession(saved.id, db);
    expect((await db.sessions.get(saved.id))?.deleted_at).not.toBeNull();
    expect((await db.session_exercises.toArray()).every((r) => r.deleted_at !== null)).toBe(true);
    expect((await db.session_sets.toArray()).every((r) => r.deleted_at !== null)).toBe(true);
  });
});
