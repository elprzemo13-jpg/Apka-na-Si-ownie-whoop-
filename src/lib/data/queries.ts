import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./local";
import { sortByPosition } from "./repo";
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
