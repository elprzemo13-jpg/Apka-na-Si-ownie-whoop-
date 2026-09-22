import { db, type LocalDb } from "./local";
import { newRow, save } from "./repo";
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
