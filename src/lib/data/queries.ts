import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./local";
import { sortByPosition } from "./repo";
import type { PastPerformance } from "../metrics/progression";
import type { Discipline, Exercise, PlanChecklistItem, PlanDay, PlanExercise, WeeklyGoal } from "./types";

const live = <T extends { deleted_at: string | null }>(rows: T[]) => rows.filter((r) => r.deleted_at === null);

export function useActivePlan(userId: string | undefined) {
  return useLiveQuery(async () => {
    if (!userId) return undefined;
    const plans = live(await db.plans.where("owner_id").equals(userId).toArray());
    return plans.find((p) => p.is_active) ?? null;
  }, [userId]);
}

export function usePlanDays(planId: string | undefined): PlanDay[] | undefined {
  return useLiveQuery(async () => {
    if (!planId) return [];
    return sortByPosition(live(await db.plan_days.where("plan_id").equals(planId).toArray()));
  }, [planId]);
}

export function usePlanDay(dayId: string | undefined) {
  return useLiveQuery(async () => (dayId ? ((await db.plan_days.get(dayId)) ?? null) : null), [dayId]);
}

export type PlanExerciseWithDetails = PlanExercise & { exercise: Exercise | undefined };

export function usePlanExercises(dayId: string | undefined): PlanExerciseWithDetails[] | undefined {
  return useLiveQuery(async () => {
    if (!dayId) return [];
    const rows = sortByPosition(live(await db.plan_exercises.where("plan_day_id").equals(dayId).toArray()));
    const exercises = await db.exercises.bulkGet(rows.map((r) => r.exercise_id));
    return rows.map((row, i) => ({ ...row, exercise: exercises[i] }));
  }, [dayId]);
}

/** Checklist items for a plan: `dayId` null means the plan-wide list. */
export function useChecklist(
  planId: string | undefined,
  kind: "warmup" | "stretch",
  dayId: string | null,
): PlanChecklistItem[] | undefined {
  return useLiveQuery(async () => {
    if (!planId) return [];
    const rows = live(await db.plan_checklist_items.where("plan_id").equals(planId).toArray());
    return sortByPosition(rows.filter((r) => r.kind === kind && (r.plan_day_id ?? null) === dayId));
  }, [planId, kind, dayId]);
}

export function useGoals(userId: string | undefined): Record<Discipline, WeeklyGoal | undefined> | undefined {
  return useLiveQuery(async () => {
    if (!userId) return undefined;
    const rows = live(await db.weekly_goals.where("user_id").equals(userId).toArray());
    const byDiscipline = {} as Record<Discipline, WeeklyGoal | undefined>;
    for (const row of rows) byDiscipline[row.discipline] = row;
    return byDiscipline;
  }, [userId]);
}

export function useExercises(userId: string | undefined): Exercise[] | undefined {
  return useLiveQuery(async () => {
    if (!userId) return [];
    const rows = live(await db.exercises.where("user_id").equals(userId).toArray());
    return rows.sort((a, b) => a.name.localeCompare(b.name, "pl"));
  }, [userId]);
}

export type ExerciseHistory = Map<string, PastPerformance[]>;

/**
 * Past performances per exercise, newest first — the input for weight
 * suggestions and personal records. Skipped and deleted rows are left out.
 */
export function useExerciseHistories(exerciseIds: string[]): ExerciseHistory | undefined {
  const key = exerciseIds.join(",");
  return useLiveQuery(async () => {
    const result: ExerciseHistory = new Map();
    if (exerciseIds.length === 0) return result;

    const performed = live(await db.session_exercises.where("exercise_id").anyOf(exerciseIds).toArray())
      .filter((row) => !row.skipped);
    const sessions = await db.sessions.bulkGet([...new Set(performed.map((p) => p.session_id))]);
    const sessionById = new Map(sessions.filter(Boolean).map((s) => [s!.id, s!]));
    const allSets = live(
      await db.session_sets.where("session_exercise_id").anyOf(performed.map((p) => p.id)).toArray(),
    );

    for (const row of performed) {
      const session = sessionById.get(row.session_id);
      if (!session || session.deleted_at !== null) continue;
      const sets = allSets
        .filter((s) => s.session_exercise_id === row.id)
        .sort((a, b) => a.set_no - b.set_no)
        .map((s) => ({ reps: s.reps, weight_kg: s.weight_kg }));
      if (sets.length === 0) continue;
      const list = result.get(row.exercise_id) ?? [];
      list.push({ performed_on: session.performed_on, created_at: session.created_at, sets });
      result.set(row.exercise_id, list);
    }
    return result;
  }, [key]);
}

/** Plan day of the most recent gym session — the anchor for a rotation plan. */
export function useLastGymDayId(userId: string | undefined): string | null | undefined {
  return useLiveQuery(async () => {
    if (!userId) return null;
    const sessions = live(await db.sessions.where("user_id").equals(userId).toArray())
      .filter((s) => s.discipline === "gym" && s.plan_day_id)
      .sort((a, b) => b.performed_on.localeCompare(a.performed_on) || b.created_at.localeCompare(a.created_at));
    return sessions[0]?.plan_day_id ?? null;
  }, [userId]);
}

/** All sessions of a user, newest first. */
export function useSessions(userId: string | undefined) {
  return useLiveQuery(async () => {
    if (!userId) return [];
    return live(await db.sessions.where("user_id").equals(userId).toArray()).sort(
      (a, b) => b.performed_on.localeCompare(a.performed_on) || b.created_at.localeCompare(a.created_at),
    );
  }, [userId]);
}

export function useSession(sessionId: string | undefined) {
  return useLiveQuery(async () => (sessionId ? ((await db.sessions.get(sessionId)) ?? null) : null), [sessionId]);
}

export type SessionDetail = {
  name: string;
  skipped: boolean;
  sets: { reps: number; weight_kg: number | null; height_cm: number | null }[];
};

/** Exercises and sets of one gym session, for the expanded log entry. */
export function useSessionDetails(sessionId: string | undefined): SessionDetail[] | undefined {
  return useLiveQuery(async () => {
    if (!sessionId) return [];
    const exercises = sortByPosition(live(await db.session_exercises.where("session_id").equals(sessionId).toArray()));
    const sets = live(
      await db.session_sets.where("session_exercise_id").anyOf(exercises.map((e) => e.id)).toArray(),
    );
    return exercises.map((exercise) => ({
      name: exercise.name_snapshot,
      skipped: exercise.skipped,
      sets: sets
        .filter((s) => s.session_exercise_id === exercise.id)
        .sort((a, b) => a.set_no - b.set_no)
        .map((s) => ({ reps: s.reps, weight_kg: s.weight_kg, height_cm: s.height_cm })),
    }));
  }, [sessionId]);
}
