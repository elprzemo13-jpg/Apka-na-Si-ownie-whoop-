import Dexie, { type EntityTable } from "dexie";
import type {
  Exercise,
  OutboxEntry,
  Plan,
  PlanChecklistItem,
  PlanDay,
  PlanExercise,
  Session,
  SessionChecklistItem,
  SessionExercise,
  SessionSet,
  SyncTable,
  WeeklyGoal,
} from "./types";

/** Sync bookkeeping: one row per table with the last seen server timestamp. */
export type SyncState = {
  table: SyncTable;
  cursor: string | null;
};

export class LocalDb extends Dexie {
  exercises!: EntityTable<Exercise, "id">;
  plans!: EntityTable<Plan, "id">;
  plan_days!: EntityTable<PlanDay, "id">;
  plan_exercises!: EntityTable<PlanExercise, "id">;
  plan_checklist_items!: EntityTable<PlanChecklistItem, "id">;
  weekly_goals!: EntityTable<WeeklyGoal, "id">;
  sessions!: EntityTable<Session, "id">;
  session_checklist_items!: EntityTable<SessionChecklistItem, "id">;
  session_exercises!: EntityTable<SessionExercise, "id">;
  session_sets!: EntityTable<SessionSet, "id">;
  outbox!: EntityTable<OutboxEntry, "seq">;
  sync_state!: EntityTable<SyncState, "table">;

  constructor(name = "trening") {
    super(name);
    this.version(1).stores({
      exercises: "id, user_id, name",
      plans: "id, owner_id",
      plan_days: "id, plan_id, position",
      plan_exercises: "id, plan_day_id, exercise_id, position",
      plan_checklist_items: "id, plan_id, plan_day_id, kind",
      weekly_goals: "id, user_id, discipline",
      sessions: "id, user_id, performed_on, discipline",
      session_checklist_items: "id, session_id",
      session_exercises: "id, session_id, exercise_id",
      session_sets: "id, session_exercise_id",
      outbox: "++seq, [table+row_id]",
      sync_state: "table",
    });
  }
}

export const db = new LocalDb();

/** Wipes local data — used when a different user signs in on the same device. */
export async function clearLocalData(database: LocalDb = db) {
  await database.transaction("rw", database.tables, async () => {
    await Promise.all(database.tables.map((table) => table.clear()));
  });
}
