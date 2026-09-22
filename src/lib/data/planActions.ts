import { db } from "./local";
import { newRow, remove, save, sortByPosition } from "./repo";
import type {
  ChecklistKind,
  Discipline,
  Exercise,
  LoadType,
  PlanChecklistItem,
  PlanDay,
  PlanExercise,
  Progression,
  RepUnit,
} from "./types";

const nextPosition = (rows: { position: number }[]) =>
  rows.reduce((max, r) => Math.max(max, r.position), -1) + 1;

// A starting warm-up, editable and removable — the plan itself stays empty,
// but "remember to warm up" without concrete items does not work in practice.
const DEFAULT_WARMUP: [string, string][] = [
  ["Lekkie cardio — rowerek / wiosło / skakanka", "3-5 min, ma być ciepło, nie zmęczenie"],
  ["Krążenia ramion, barków, bioder", "po 10 w każdą stronę"],
  ["Serie rozgrzewkowe pierwszego ćwiczenia", "1-2 serie z lekkim ciężarem"],
];

export async function createPlan(userId: string, name: string) {
  const plan = newRow({
    owner_id: userId,
    author_id: userId,
    name,
    schedule_mode: "weekly" as const,
    is_active: true,
  });
  await save("plans", plan);
  for (const [label, detail] of DEFAULT_WARMUP) {
    await addChecklistItem(plan.id, null, "warmup", label, detail);
  }
  return plan;
}

export async function renamePlan(planId: string, name: string) {
  const plan = await db.plans.get(planId);
  if (plan) await save("plans", { ...plan, name });
}

export async function addPlanDay(planId: string, name: string) {
  const days = await db.plan_days.where("plan_id").equals(planId).toArray();
  const day = newRow({
    plan_id: planId,
    name,
    position: nextPosition(days),
    weekdays: [] as number[],
    default_rest_s: 90,
  });
  await save("plan_days", day);
  return day;
}

export async function updatePlanDay(day: PlanDay, changes: Partial<PlanDay>) {
  await save("plan_days", { ...day, ...changes });
}

export async function deletePlanDay(dayId: string) {
  // Children first, so nothing is left pointing at a deleted day.
  const exercises = await db.plan_exercises.where("plan_day_id").equals(dayId).toArray();
  for (const row of exercises) await remove("plan_exercises", row.id);
  const items = await db.plan_checklist_items.where("plan_day_id").equals(dayId).toArray();
  for (const row of items) await remove("plan_checklist_items", row.id);
  await remove("plan_days", dayId);
}

/** Moves a row one step up or down within its siblings. */
export async function movePlanDay(days: PlanDay[], dayId: string, direction: -1 | 1) {
  const ordered = sortByPosition(days);
  const index = ordered.findIndex((d) => d.id === dayId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= ordered.length) return;
  const a = ordered[index]!;
  const b = ordered[target]!;
  await save("plan_days", { ...a, position: target });
  await save("plan_days", { ...b, position: index });
}

export type ExerciseForm = {
  name: string;
  load_type: LoadType;
  progression: Progression;
  weight_step_kg: number;
  target_sets: number;
  rep_min: number;
  rep_max: number;
  rep_unit: RepUnit;
  per_side: boolean;
  annotation: string | null;
  rest_s: number | null;
};

/** One exercise identity per user and name: records and suggestions follow it. */
async function findOrCreateExercise(userId: string, form: ExerciseForm): Promise<Exercise> {
  const all = await db.exercises.where("user_id").equals(userId).toArray();
  const match = all.find(
    (e) => e.deleted_at === null && e.name.localeCompare(form.name, "pl", { sensitivity: "base" }) === 0,
  );
  const row = match
    ? { ...match, load_type: form.load_type, progression: form.progression, weight_step_kg: form.weight_step_kg }
    : newRow({
        user_id: userId,
        name: form.name,
        load_type: form.load_type,
        progression: form.progression,
        weight_step_kg: form.weight_step_kg,
      });
  await save("exercises", row);
  return row as Exercise;
}

export async function addPlanExercise(userId: string, dayId: string, form: ExerciseForm) {
  const exercise = await findOrCreateExercise(userId, form);
  const siblings = await db.plan_exercises.where("plan_day_id").equals(dayId).toArray();
  const row = newRow({
    plan_day_id: dayId,
    exercise_id: exercise.id,
    position: nextPosition(siblings),
    annotation: form.annotation,
    target_sets: form.target_sets,
    rep_min: form.rep_min,
    rep_max: form.rep_max,
    rep_unit: form.rep_unit,
    per_side: form.per_side,
    rest_s: form.rest_s,
  });
  await save("plan_exercises", row);
  return row;
}

export async function updatePlanExercise(userId: string, planExercise: PlanExercise, form: ExerciseForm) {
  const exercise = await findOrCreateExercise(userId, form);
  await save("plan_exercises", {
    ...planExercise,
    exercise_id: exercise.id,
    annotation: form.annotation,
    target_sets: form.target_sets,
    rep_min: form.rep_min,
    rep_max: form.rep_max,
    rep_unit: form.rep_unit,
    per_side: form.per_side,
    rest_s: form.rest_s,
  });
}

export async function movePlanExercise(rows: PlanExercise[], id: string, direction: -1 | 1) {
  const ordered = sortByPosition(rows);
  const index = ordered.findIndex((r) => r.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= ordered.length) return;
  const a = ordered[index]!;
  const b = ordered[target]!;
  await save("plan_exercises", { ...a, position: target });
  await save("plan_exercises", { ...b, position: index });
}

export async function addChecklistItem(
  planId: string,
  dayId: string | null,
  kind: ChecklistKind,
  label: string,
  detail: string | null = null,
) {
  const all = await db.plan_checklist_items.where("plan_id").equals(planId).toArray();
  const siblings = all.filter((r) => r.kind === kind && (r.plan_day_id ?? null) === dayId);
  const row = newRow({
    plan_id: planId,
    plan_day_id: dayId,
    kind,
    label,
    detail,
    position: nextPosition(siblings),
  });
  await save("plan_checklist_items", row);
  return row;
}

export async function updateChecklistItem(item: PlanChecklistItem, changes: Partial<PlanChecklistItem>) {
  await save("plan_checklist_items", { ...item, ...changes });
}

export async function setWeeklyGoal(userId: string, discipline: Discipline, target: number) {
  const existing = (await db.weekly_goals.where("user_id").equals(userId).toArray()).find(
    (g) => g.discipline === discipline,
  );
  const row = existing
    ? { ...existing, target_sessions: target, deleted_at: null }
    : newRow({ user_id: userId, discipline, target_sessions: target });
  await save("weekly_goals", row);
}

/** For plans created before the default warm-up existed. */
export async function addDefaultWarmup(planId: string) {
  for (const [label, detail] of DEFAULT_WARMUP) {
    await addChecklistItem(planId, null, "warmup", label, detail);
  }
}
