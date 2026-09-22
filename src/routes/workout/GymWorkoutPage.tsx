import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Button } from "../../components/ui/Button";
import { Chip } from "../../components/ui/Chip";
import { EmptyState } from "../../components/ui/EmptyState";
import { Notice } from "../../components/ui/Notice";
import { ChecklistBlock } from "../../components/workout/ChecklistBlock";
import { ExerciseCard } from "../../components/workout/ExerciseCard";
import { TimerBar } from "../../components/workout/TimerBar";
import { useAuth } from "../../lib/auth/AuthProvider";
import { toIsoDate, weekdayIndex } from "../../lib/dates";
import {
  useActivePlan,
  useChecklist,
  useExerciseHistories,
  useLastGymDayId,
  usePlanDays,
  usePlanExercises,
} from "../../lib/data/queries";
import {
  buildChecklistDrafts,
  buildExerciseDrafts,
  canSaveGym,
  saveGymSession,
  type ChecklistDraft,
  type ExerciseDraft,
} from "../../lib/data/workoutActions";
import { personalRecord, suggestWeight } from "../../lib/metrics/progression";
import { t } from "../../lib/i18n/pl";
import { suggestDay } from "../../lib/metrics/schedule";

export function GymWorkoutPage() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const plan = useActivePlan(userId);
  const days = usePlanDays(plan?.id);
  const lastGymDayId = useLastGymDayId(userId);
  // Without an explicit choice the app offers the day the plan schedules for
  // today, or — on a rest day — the one after the last session.
  const suggested = suggestDay(days ?? [], weekdayIndex(), lastGymDayId ?? null);
  const dayId = params.get("day") ?? suggested.dayId ?? undefined;
  const day = days?.find((d) => d.id === dayId) ?? days?.[0];
  const planExercises = usePlanExercises(day?.id);
  const warmupItems = useChecklist(plan?.id, "warmup", null);
  const stretchItems = useChecklist(plan?.id, "stretch", day?.id ?? null);

  const exerciseIds = useMemo(
    () => (planExercises ?? []).map((row) => row.exercise_id),
    [planExercises],
  );
  const histories = useExerciseHistories(exerciseIds);

  const [performedOn, setPerformedOn] = useState(toIsoDate());
  const [exercises, setExercises] = useState<ExerciseDraft[] | null>(null);
  const [checklist, setChecklist] = useState<ChecklistDraft[]>([]);
  // `at` makes each tap a new request, so tapping the same rest time twice
  // restarts the timer (the bar remounts on a new key).
  const [timer, setTimer] = useState<{ seconds: number; at: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // The live query emits a fresh array on every local database change, so a
  // background sync would otherwise wipe the form mid-workout: merge, never
  // rebuild.
  useEffect(() => {
    if (!planExercises) return;
    setExercises((previous) => buildExerciseDrafts(planExercises, previous ?? []));
  }, [planExercises]);

  useEffect(() => {
    setChecklist((previous) => buildChecklistDrafts(warmupItems ?? [], stretchItems ?? [], previous));
  }, [warmupItems, stretchItems]);

  if (plan === undefined || days === undefined) return null;
  if (plan === null || days.length === 0) {
    return (
      <EmptyState action={<Link to="/plan" className="text-green underline">{t.workout.goToPlan}</Link>}>
        {t.workout.noPlan}
      </EmptyState>
    );
  }
  if (!day || !exercises) return null;

  const draft = { performedOn, day, exercises, checklist };
  const canSave = canSaveGym(draft);
  const stretchPending = checklist.some((i) => i.kind === "stretch" && !i.done);

  const switchDay = (id: string) => {
    const touched = exercises.some((e) => e.sets.some((s) => s.reps || s.weight || s.height));
    if (touched && !confirm(t.workout.switchDayConfirm)) return;
    setParams({ day: id }, { replace: true });
  };

  return (
    <div className="px-4 pt-4 pb-[120px]">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="font-head text-[26px] font-bold uppercase">{day.name}</h1>
        <button
          type="button"
          onClick={() => {
            const touched = exercises.some((e) => e.sets.some((s) => s.reps || s.weight || s.height));
            if (!touched || confirm(t.workout.discardConfirm)) navigate("/");
          }}
          aria-label={t.workout.close}
          className="flex h-tap w-tap items-center justify-center text-[22px] text-dim"
        >
          ✕
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {days.map((d) => (
          <Chip key={d.id} label={d.name} active={d.id === day.id} onClick={() => switchDay(d.id)} />
        ))}
      </div>

      <label className="mb-4 flex items-center justify-between rounded-[9px] border border-line bg-up px-3">
        <span className="text-[10px] font-semibold tracking-[1.1px] text-dim uppercase">{t.workout.date}</span>
        <input
          type="date"
          value={performedOn}
          max={toIsoDate()}
          onChange={(e) => setPerformedOn(e.target.value || toIsoDate())}
          className="min-h-tap bg-transparent text-right text-base outline-none"
        />
      </label>

      <ChecklistBlock
        title={t.workout.warmup}
        kind="warmup"
        items={checklist}
        emptyText={t.workout.warmupEmpty}
        onToggle={(index) =>
          setChecklist((list) => list.map((item, i) => (i === index ? { ...item, done: !item.done } : item)))
        }
      />

      {planExercises?.length === 0 && <p className="my-4 text-[13px] text-dim">{t.workout.noExercises}</p>}

      {exercises.map((exercise, index) => {
        const planRow = planExercises?.find((row) => row.id === exercise.planExerciseId);
        const history = histories?.get(exercise.exerciseId) ?? [];
        const progression = planRow?.exercise?.progression ?? "weight";
        return (
          <ExerciseCard
            key={exercise.planExerciseId}
            index={index}
            draft={exercise}
            annotation={planRow?.annotation ?? null}
            loadType={planRow?.exercise?.load_type ?? "weighted"}
            progression={progression}
            restSeconds={planRow?.rest_s ?? day.default_rest_s}
            suggestion={suggestWeight(history, {
              targetSets: exercise.targetSets,
              repMax: exercise.repMax,
              step: planRow?.exercise?.weight_step_kg ?? 2.5,
              progression,
            })}
            record={personalRecord(history)}
            onChange={(next) => setExercises((list) => (list ?? []).map((e, i) => (i === index ? next : e)))}
            onStartTimer={(seconds) => setTimer({ seconds, at: Date.now() })}
          />
        );
      })}

      <ChecklistBlock
        title={t.workout.stretch}
        kind="stretch"
        items={checklist}
        emptyText={t.workout.stretchEmpty}
        onToggle={(index) =>
          setChecklist((list) => list.map((item, i) => (i === index ? { ...item, done: !item.done } : item)))
        }
      />

      {canSave && stretchPending && (
        <p className="my-3 rounded-[10px] bg-yellow/8 p-3 text-[12px] leading-relaxed text-dim">
          {t.workout.stretchNudge}
        </p>
      )}

      {saveError && <Notice tone="error">{saveError}</Notice>}
      {!canSave && <p className="mb-2 text-[12px] text-dim">{t.workout.needsOneSet}</p>}

      <Button
        busy={busy}
        disabled={!canSave}
        onClick={async () => {
          if (!userId) return;
          setBusy(true);
          setSaveError(null);
          try {
            await saveGymSession(userId, draft);
            navigate("/", { replace: true });
          } catch (error) {
            // The workout stays on screen so nothing typed is lost.
            setSaveError(error instanceof Error ? error.message : t.errors.generic);
          } finally {
            setBusy(false);
          }
        }}
      >
        ✓ {t.workout.save}
      </Button>

      <TimerBar key={timer?.at ?? "idle"} seconds={timer?.seconds ?? null} onClose={() => setTimer(null)} />
    </div>
  );
}
