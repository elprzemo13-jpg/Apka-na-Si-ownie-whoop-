import { db, type LocalDb } from "./local";
import { newRow, remove, save } from "./repo";
import type { PlanDay, RepUnit } from "./types";

export type SetDraft = {
  /** raw text while typing; parsed on save */
  reps: string;
  weight: string;
  height: string;
};

export type ExerciseDraft = {
  planExerciseId: string;
  exerciseId: string;
  name: string;
  skipped: boolean;
  targetSets: number;
  repMin: number;
  repMax: number;
  repUnit: RepUnit;
  perSide: boolean;
  sets: SetDraft[];
};

export type ChecklistDraft = { label: string; kind: "warmup" | "stretch"; done: boolean };

export type GymDraft = {
  performedOn: string;
  day: PlanDay;
  exercises: ExerciseDraft[];
  checklist: ChecklistDraft[];
};

const num = (value: string) => {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};

/** Sets with no repetitions are dropped, exactly as in the single-user app. */
const filledSets = (draft: ExerciseDraft) =>
  draft.sets.filter((s) => s.reps.trim() !== "" && (num(s.reps) ?? 0) > 0);

/** A workout needs at least one real set; skipped exercises do not count. */
export const canSaveGym = (draft: GymDraft) =>
  draft.exercises.some((e) => !e.skipped && filledSets(e).length > 0);

/** All items ticked — an empty list never counts as done. */
const allDone = (items: ChecklistDraft[], kind: "warmup" | "stretch") => {
  const ofKind = items.filter((i) => i.kind === kind);
  return ofKind.length > 0 && ofKind.every((i) => i.done);
};

export async function saveGymSession(userId: string, draft: GymDraft, database: LocalDb = db) {
  const session = newRow({
    user_id: userId,
    discipline: "gym" as const,
    performed_on: draft.performedOn,
    plan_day_id: draft.day.id,
    day_label_snapshot: draft.day.name,
    distance_m: null,
    duration_s: null,
    session_type: null,
    swim_style: null,
    underwater_m: null,
    notes: null,
    warmup_done: allDone(draft.checklist, "warmup"),
    stretch_done: allDone(draft.checklist, "stretch"),
  });
  await save("sessions", session, database);

  for (const [position, item] of draft.checklist.entries()) {
    await save(
      "session_checklist_items",
      newRow({
        session_id: session.id,
        kind: item.kind,
        label: item.label,
        done: item.done,
        position,
      }),
      database,
    );
  }

  for (const [position, exercise] of draft.exercises.entries()) {
    const sets = filledSets(exercise);
    // A skipped exercise is recorded as skipped instead of vanishing, so the
    // history shows what was planned; exercises simply left empty are dropped.
    if (!exercise.skipped && sets.length === 0) continue;

    const sessionExercise = newRow({
      session_id: session.id,
      exercise_id: exercise.exerciseId,
      position,
      name_snapshot: exercise.name,
      skipped: exercise.skipped,
      target_sets: exercise.targetSets,
      rep_min: exercise.repMin,
      rep_max: exercise.repMax,
      rep_unit: exercise.repUnit,
      per_side: exercise.perSide,
    });
    await save("session_exercises", sessionExercise, database);

    if (exercise.skipped) continue;
    for (const [index, set] of sets.entries()) {
      await save(
        "session_sets",
        newRow({
          session_exercise_id: sessionExercise.id,
          set_no: index + 1,
          reps: Math.round(num(set.reps) ?? 0),
          weight_kg: set.weight.trim() === "" ? null : num(set.weight),
          height_cm: set.height.trim() === "" ? null : num(set.height),
          is_extra: index >= exercise.targetSets,
        }),
        database,
      );
    }
  }

  return session;
}

/**
 * Builds the form rows from the plan, carrying over whatever is already typed.
 *
 * The plan comes from a live query that emits a fresh array on every local
 * database change — including every background sync. Rebuilding blindly wiped
 * sets mid-workout, so the previous draft always wins for rows that still exist.
 */
export function buildExerciseDrafts(
  rows: {
    id: string;
    exercise_id: string;
    target_sets: number;
    rep_min: number;
    rep_max: number;
    rep_unit: RepUnit;
    per_side: boolean;
    exercise?: { name: string } | undefined;
  }[],
  previous: ExerciseDraft[] = [],
): ExerciseDraft[] {
  const byId = new Map(previous.map((draft) => [draft.planExerciseId, draft]));
  return rows.map((row) => {
    const before = byId.get(row.id);
    const planned = Array.from({ length: row.target_sets }, () => ({ reps: "", weight: "", height: "" }));
    return {
      planExerciseId: row.id,
      exerciseId: row.exercise_id,
      name: row.exercise?.name ?? before?.name ?? "",
      skipped: before?.skipped ?? false,
      targetSets: row.target_sets,
      repMin: row.rep_min,
      repMax: row.rep_max,
      repUnit: row.rep_unit,
      perSide: row.per_side,
      // Keep every set the user typed, including extra ones they added.
      sets: before ? [...before.sets, ...planned.slice(before.sets.length)] : planned,
    };
  });
}

/** Same idea for the checklists: ticks survive a rebuild, matched by label. */
export function buildChecklistDrafts(
  warmup: { label: string }[],
  stretch: { label: string }[],
  previous: ChecklistDraft[] = [],
): ChecklistDraft[] {
  const doneBefore = new Set(previous.filter((i) => i.done).map((i) => `${i.kind}:${i.label}`));
  const build = (items: { label: string }[], kind: "warmup" | "stretch") =>
    items.map((item) => ({ label: item.label, kind, done: doneBefore.has(`${kind}:${item.label}`) }));
  return [...build(warmup, "warmup"), ...build(stretch, "stretch")];
}

export type EnduranceDraft = {
  id?: string;
  discipline: "swim" | "run" | "bike";
  performedOn: string;
  /** as typed: metres for swimming, kilometres for running and cycling */
  distance: string;
  /** minutes */
  durationMin: string;
  sessionType: string | null;
  swimStyle: string | null;
  underwaterM: string;
  notes: string;
};

export const distanceMetres = (draft: EnduranceDraft) => {
  const typed = num(draft.distance) ?? 0;
  return Math.round(draft.discipline === "swim" ? typed : typed * 1000);
};

export const canSaveEndurance = (draft: EnduranceDraft) =>
  distanceMetres(draft) > 0 && (num(draft.durationMin) ?? 0) > 0;

/** Creates or updates an endurance session; load points are set by the server. */
export async function saveEnduranceSession(userId: string, draft: EnduranceDraft, database: LocalDb = db) {
  const existing = draft.id ? await database.sessions.get(draft.id) : undefined;
  const fields = {
    user_id: userId,
    discipline: draft.discipline,
    performed_on: draft.performedOn,
    plan_day_id: null,
    day_label_snapshot: null,
    distance_m: distanceMetres(draft),
    duration_s: Math.round((num(draft.durationMin) ?? 0) * 60),
    session_type: draft.sessionType,
    swim_style: draft.discipline === "swim" ? draft.swimStyle : null,
    underwater_m: draft.discipline === "swim" && draft.underwaterM.trim() !== "" ? Math.round(num(draft.underwaterM) ?? 0) : null,
    notes: draft.notes.trim() || null,
    warmup_done: false,
    stretch_done: false,
  };
  const row = existing ? { ...existing, ...fields } : newRow(fields);
  await save("sessions", row, database);
  return row;
}

/** Soft-deletes a session together with its children. */
export async function deleteSession(sessionId: string, database: LocalDb = db) {
  const exercises = await database.session_exercises.where("session_id").equals(sessionId).toArray();
  for (const exercise of exercises) {
    const sets = await database.session_sets.where("session_exercise_id").equals(exercise.id).toArray();
    for (const set of sets) await remove("session_sets", set.id, database);
    await remove("session_exercises", exercise.id, database);
  }
  const items = await database.session_checklist_items.where("session_id").equals(sessionId).toArray();
  for (const item of items) await remove("session_checklist_items", item.id, database);
  await remove("sessions", sessionId, database);
}
