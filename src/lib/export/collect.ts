import { db } from "../data/local";
import type { ExportSession } from "./csv";

/** Reads everything the export needs straight from the local database. */
export async function collectExport(userId: string): Promise<ExportSession[]> {
  const live = <T extends { deleted_at: string | null }>(rows: T[]) => rows.filter((r) => r.deleted_at === null);

  const sessions = live(await db.sessions.where("user_id").equals(userId).toArray());
  const exercises = live(
    await db.session_exercises.where("session_id").anyOf(sessions.map((s) => s.id)).toArray(),
  );
  const sets = live(
    await db.session_sets.where("session_exercise_id").anyOf(exercises.map((e) => e.id)).toArray(),
  );

  return sessions.map((session) => ({
    performed_on: session.performed_on,
    discipline: session.discipline,
    day_label: session.day_label_snapshot,
    distance_m: session.distance_m,
    duration_s: session.duration_s,
    session_type: session.session_type,
    swim_style: session.swim_style,
    underwater_m: session.underwater_m,
    notes: session.notes,
    warmup_done: session.warmup_done,
    stretch_done: session.stretch_done,
    exercises: exercises
      .filter((exercise) => exercise.session_id === session.id)
      .sort((a, b) => a.position - b.position)
      .map((exercise) => ({
        name: exercise.name_snapshot,
        skipped: exercise.skipped,
        sets: sets
          .filter((set) => set.session_exercise_id === exercise.id)
          .sort((a, b) => a.set_no - b.set_no)
          .map((set) => ({ reps: set.reps, weight_kg: set.weight_kg, height_cm: set.height_cm })),
      })),
  }));
}
