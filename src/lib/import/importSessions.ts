import { db, type LocalDb } from "../data/local";
import { newRow, save } from "../data/repo";
import { importKey, type ImportedSession } from "./oldAppCsv";

export type ImportSummary = { imported: number; skipped: number };

/** Keys of sessions already in the app, so a repeated import adds nothing. */
async function existingKeys(userId: string, database: LocalDb) {
  const sessions = (await database.sessions.where("user_id").equals(userId).toArray()).filter(
    (s) => s.deleted_at === null,
  );
  return new Set(
    sessions.map((s) =>
      s.discipline === "gym"
        ? `gym|${s.performed_on}|${s.day_label_snapshot ?? ""}`
        : `${s.discipline}|${s.performed_on}|${s.distance_m ?? 0}`,
    ),
  );
}

/**
 * Writes imported sessions through the normal local-first path, so they queue
 * for the server like any other workout. Sessions that look like ones already
 * stored are skipped, which makes the import safe to run twice.
 */
export async function importSessions(
  userId: string,
  sessions: ImportedSession[],
  database: LocalDb = db,
): Promise<ImportSummary> {
  const seen = await existingKeys(userId, database);
  const exercises = (await database.exercises.where("user_id").equals(userId).toArray()).filter(
    (e) => e.deleted_at === null,
  );
  const exerciseByName = new Map(exercises.map((e) => [e.name.toLowerCase(), e]));
  let imported = 0;
  let skipped = 0;

  for (const session of sessions) {
    if (seen.has(importKey(session))) {
      skipped++;
      continue;
    }
    seen.add(importKey(session));

    if (session.discipline === "swim") {
      await save(
        "sessions",
        newRow({
          user_id: userId,
          discipline: "swim" as const,
          performed_on: session.performedOn,
          plan_day_id: null,
          day_label_snapshot: null,
          distance_m: session.distanceM,
          duration_s: session.durationS,
          session_type: session.sessionType,
          swim_style: session.style,
          underwater_m: session.underwaterM,
          notes: session.notes,
          warmup_done: false,
          stretch_done: false,
        }),
        database,
      );
      imported++;
      continue;
    }

    const saved = await save(
      "sessions",
      newRow({
        user_id: userId,
        discipline: "gym" as const,
        performed_on: session.performedOn,
        plan_day_id: null,
        day_label_snapshot: session.dayLabel,
        distance_m: null,
        duration_s: null,
        session_type: null,
        swim_style: null,
        underwater_m: null,
        notes: null,
        warmup_done: session.warmupDone,
        stretch_done: session.stretchDone,
      }),
      database,
    );

    for (const [position, exercise] of session.exercises.entries()) {
      // Reuse the exercise identity so records and suggestions see the history.
      let known = exerciseByName.get(exercise.name.toLowerCase());
      if (!known) {
        const created = newRow({
          user_id: userId,
          name: exercise.name,
          load_type: "weighted" as const,
          progression: "weight" as const,
          weight_step_kg: 2.5,
        });
        await save("exercises", created, database);
        known = created;
        exerciseByName.set(exercise.name.toLowerCase(), created);
      }

      const sessionExercise = newRow({
        session_id: saved.id as string,
        exercise_id: known.id,
        position,
        name_snapshot: exercise.name,
        skipped: false,
        target_sets: exercise.sets.length,
        rep_min: Math.min(...exercise.sets.map((s) => s.reps)),
        rep_max: Math.max(...exercise.sets.map((s) => s.reps)),
        rep_unit: "reps" as const,
        per_side: false,
      });
      await save("session_exercises", sessionExercise, database);

      for (const [index, set] of exercise.sets.entries()) {
        await save(
          "session_sets",
          newRow({
            session_exercise_id: sessionExercise.id,
            set_no: index + 1,
            reps: set.reps,
            weight_kg: set.weightKg,
            height_cm: null,
            is_extra: false,
          }),
          database,
        );
      }
    }
    imported++;
  }

  return { imported, skipped };
}
