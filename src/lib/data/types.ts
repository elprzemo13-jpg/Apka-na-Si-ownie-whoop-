// Row shapes mirroring the database (supabase/migrations). Local copies carry
// exactly these columns, so a row can be pushed to the server unchanged.

export type Discipline = "gym" | "swim" | "run" | "bike";
export type LoadType = "weighted" | "bodyweight" | "none";
export type Progression = "weight" | "fixed" | "height" | "time";
export type RepUnit = "reps" | "seconds";
export type ChecklistKind = "warmup" | "stretch";
export type ScheduleMode = "weekly" | "rotation";

export type SyncFields = {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  synced_at?: string;
};

export type Exercise = SyncFields & {
  user_id: string;
  name: string;
  load_type: LoadType;
  progression: Progression;
  weight_step_kg: number;
};

export type Plan = SyncFields & {
  owner_id: string;
  author_id: string;
  name: string;
  schedule_mode: ScheduleMode;
  is_active: boolean;
};

export type PlanDay = SyncFields & {
  plan_id: string;
  name: string;
  position: number;
  /** 0 = Monday … 6 = Sunday; empty for rotation plans */
  weekdays: number[];
  default_rest_s: number;
};

export type PlanExercise = SyncFields & {
  plan_day_id: string;
  exercise_id: string;
  position: number;
  annotation: string | null;
  target_sets: number;
  rep_min: number;
  rep_max: number;
  rep_unit: RepUnit;
  per_side: boolean;
  rest_s: number | null;
};

export type PlanChecklistItem = SyncFields & {
  plan_id: string;
  /** null = applies to every day of the plan */
  plan_day_id: string | null;
  kind: ChecklistKind;
  label: string;
  detail: string | null;
  position: number;
};

export type WeeklyGoal = SyncFields & {
  user_id: string;
  discipline: Discipline;
  target_sessions: number;
};

export type Session = SyncFields & {
  user_id: string;
  discipline: Discipline;
  performed_on: string;
  plan_day_id: string | null;
  day_label_snapshot: string | null;
  distance_m: number | null;
  duration_s: number | null;
  session_type: string | null;
  swim_style: string | null;
  underwater_m: number | null;
  notes: string | null;
  warmup_done: boolean;
  stretch_done: boolean;
  load_points?: number;
};

export type SessionChecklistItem = SyncFields & {
  session_id: string;
  kind: ChecklistKind;
  label: string;
  done: boolean;
  position: number;
};

export type SessionExercise = SyncFields & {
  session_id: string;
  exercise_id: string;
  position: number;
  name_snapshot: string;
  skipped: boolean;
  target_sets: number | null;
  rep_min: number | null;
  rep_max: number | null;
  rep_unit: RepUnit;
  per_side: boolean;
};

export type SessionSet = SyncFields & {
  session_exercise_id: string;
  set_no: number;
  reps: number;
  weight_kg: number | null;
  height_cm: number | null;
  is_extra: boolean;
};

/** Tables that sync, in dependency order: parents before children. */
export const SYNC_TABLES = [
  "exercises",
  "plans",
  "plan_days",
  "plan_exercises",
  "plan_checklist_items",
  "weekly_goals",
  "sessions",
  "session_checklist_items",
  "session_exercises",
  "session_sets",
] as const;

export type SyncTable = (typeof SYNC_TABLES)[number];

export type OutboxEntry = {
  seq?: number;
  table: SyncTable;
  row_id: string;
  /** full row, ready to be sent as an upsert */
  payload: Record<string, unknown>;
  queued_at: string;
  tries: number;
  last_error?: string;
};

/** The slice of the server the sync engine needs; faked in tests. */
export type Remote = {
  upsert(table: SyncTable, payload: Record<string, unknown>): Promise<{ error: RemoteError | null }>;
  fetchSince(
    table: SyncTable,
    cursor: string | null,
    limit: number,
  ): Promise<{ rows: Record<string, unknown>[]; error: RemoteError | null }>;
};

export type RemoteError = { message: string; code?: string; retryable: boolean };
