import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { LocalDb } from "./local";
import { newRow } from "./repo";
import { canSaveGym, saveGymSession, type ChecklistDraft, type ExerciseDraft, type GymDraft } from "./workoutActions";
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
