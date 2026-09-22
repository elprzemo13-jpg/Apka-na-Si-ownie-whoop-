import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Button } from "../../components/ui/Button";
import { Chip } from "../../components/ui/Chip";
import { TextField } from "../../components/ui/TextField";
import { useAuth } from "../../lib/auth/AuthProvider";
import {
  addPlanExercise,
  deletePlanDay,
  movePlanExercise,
  updatePlanDay,
  updatePlanExercise,
  type ExerciseForm,
} from "../../lib/data/planActions";
import { usePlanDay, usePlanExercises, type PlanExerciseWithDetails } from "../../lib/data/queries";
import { remove } from "../../lib/data/repo";
import { t } from "../../lib/i18n/pl";
import { ChecklistEditor } from "./ChecklistEditor";
import { ExerciseSheet } from "./ExerciseSheet";

function toForm(row: PlanExerciseWithDetails): ExerciseForm {
  return {
    name: row.exercise?.name ?? row.exercise_id,
    load_type: row.exercise?.load_type ?? "weighted",
    progression: row.exercise?.progression ?? "weight",
    weight_step_kg: row.exercise?.weight_step_kg ?? 2.5,
    target_sets: row.target_sets,
    rep_min: row.rep_min,
    rep_max: row.rep_max,
    rep_unit: row.rep_unit,
    per_side: row.per_side,
    annotation: row.annotation,
    rest_s: row.rest_s,
  };
}

/** "3×8-10 s / stronę" as shown in the plan and later in the workout form. */
export function describeTarget(row: {
  target_sets: number;
  rep_min: number;
  rep_max: number;
  rep_unit: string;
  per_side: boolean;
}) {
  const range = row.rep_min === row.rep_max ? `${row.rep_min}` : `${row.rep_min}-${row.rep_max}`;
  const unit = row.rep_unit === "seconds" ? ` ${t.plan.seconds}` : "";
  const side = row.per_side ? ` / ${t.plan.perSide}` : "";
  return `${row.target_sets}×${range}${unit}${side}`;
}

export function PlanDayPage() {
  const { dayId } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const userId = session?.user.id;
  const day = usePlanDay(dayId);
  const exercises = usePlanExercises(dayId);
  const [editing, setEditing] = useState<PlanExerciseWithDetails | null>(null);
  const [adding, setAdding] = useState(false);

  if (!day) return null;

  const toggleWeekday = (index: number) => {
    const weekdays = day.weekdays.includes(index)
      ? day.weekdays.filter((w) => w !== index)
      : [...day.weekdays, index].sort((a, b) => a - b);
    void updatePlanDay(day, { weekdays });
  };

  return (
    <div className="px-4 pt-5 pb-4">
      <Link to="/plan" className="mb-4 inline-flex min-h-tap items-center text-[13px] text-dim">
        ← {t.plan.back}
      </Link>

      <TextField
        label={t.plan.dayName}
        defaultValue={day.name}
        maxLength={40}
        onBlur={(e) => {
          const name = e.target.value.trim();
          if (name && name !== day.name) void updatePlanDay(day, { name });
          else e.target.value = day.name;
        }}
      />

      <div className="mb-1 text-[10px] font-semibold tracking-[1.1px] text-dim uppercase">{t.plan.weekdays}</div>
      <div className="mb-1 flex flex-wrap gap-2">
        {t.weekdaysShort.map((label, index) => (
          <Chip
            key={label}
            label={label}
            active={day.weekdays.includes(index)}
            onClick={() => toggleWeekday(index)}
          />
        ))}
      </div>
      <p className="mb-4 text-[10.5px] text-dim">{t.plan.weekdaysHint}</p>

      <TextField
        label={t.plan.defaultRest}
        type="number"
        inputMode="numeric"
        min={0}
        max={900}
        defaultValue={day.default_rest_s}
        onBlur={(e) => {
          const value = Math.max(0, Math.min(900, Math.round(Number(e.target.value) || 0)));
          e.target.value = String(value);
          if (value !== day.default_rest_s) void updatePlanDay(day, { default_rest_s: value });
        }}
      />

      <div className="section-label mt-6 mb-2.5">{t.plan.exercises}</div>
      {exercises?.length === 0 && <p className="mb-3 text-[13px] text-dim">{t.plan.noExercises}</p>}
      {exercises?.map((row, index) => (
        <div key={row.id} className="mb-2 flex items-stretch gap-2">
          <button
            type="button"
            onClick={() => setEditing(row)}
            className="flex-1 rounded-[12px] bg-panel p-3 text-left"
          >
            <div className="text-[14px] font-semibold">
              {index + 1}. {row.exercise?.name}
              {row.annotation && <span className="ml-1.5 text-[11px] font-normal text-yellow">({row.annotation})</span>}
            </div>
            <div className="mt-1 text-[11px] text-dim">
              {describeTarget(row)}
              {row.exercise?.progression === "weight" && ` · +${row.exercise.weight_step_kg} kg`}
              {row.exercise?.load_type === "none" && " · bez ciężaru"}
              {row.exercise?.load_type === "bodyweight" && " · masa ciała"}
            </div>
          </button>
          <div className="flex flex-col justify-center">
            <button
              type="button"
              aria-label={t.plan.moveUp}
              disabled={index === 0}
              onClick={() => exercises && void movePlanExercise(exercises, row.id, -1)}
              className="flex h-[20px] w-9 items-center justify-center text-dim disabled:opacity-25"
            >
              ▲
            </button>
            <button
              type="button"
              aria-label={t.plan.moveDown}
              disabled={index === (exercises?.length ?? 0) - 1}
              onClick={() => exercises && void movePlanExercise(exercises, row.id, 1)}
              className="flex h-[20px] w-9 items-center justify-center text-dim disabled:opacity-25"
            >
              ▼
            </button>
          </div>
          <button
            type="button"
            aria-label={t.plan.remove}
            onClick={() => {
              if (confirm(t.plan.deleteExerciseConfirm)) void remove("plan_exercises", row.id);
            }}
            className="flex w-9 items-center justify-center text-[15px] text-dim"
          >
            ✕
          </button>
        </div>
      ))}
      <Button variant="ghost" className="mb-6" onClick={() => setAdding(true)}>
        {t.plan.addExercise}
      </Button>

      <ChecklistEditor
        planId={day.plan_id}
        dayId={day.id}
        kind="stretch"
        title={t.plan.stretch}
        hint={t.plan.stretchHint}
      />

      <Button
        variant="danger"
        onClick={async () => {
          if (!confirm(t.plan.deleteDayConfirm)) return;
          await deletePlanDay(day.id);
          navigate("/plan", { replace: true });
        }}
      >
        {t.plan.deleteDay}
      </Button>

      {adding && (
        <ExerciseSheet
          open
          onClose={() => setAdding(false)}
          onSave={async (form) => {
            if (userId) await addPlanExercise(userId, day.id, form);
          }}
        />
      )}
      {editing && (
        <ExerciseSheet
          open
          initial={toForm(editing)}
          onClose={() => setEditing(null)}
          onSave={async (form) => {
            if (userId) await updatePlanExercise(userId, editing, form);
          }}
        />
      )}
    </div>
  );
}
