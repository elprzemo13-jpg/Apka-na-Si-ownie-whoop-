import type { ExerciseDraft } from "../../lib/data/workoutActions";
import type { LoadType, Progression } from "../../lib/data/types";
import type { PersonalRecord, Suggestion } from "../../lib/metrics/progression";
import { t } from "../../lib/i18n/pl";

type Props = {
  index: number;
  draft: ExerciseDraft;
  annotation: string | null;
  loadType: LoadType;
  progression: Progression;
  restSeconds: number;
  suggestion: Suggestion | null;
  record: PersonalRecord | null;
  onChange: (draft: ExerciseDraft) => void;
  onStartTimer: (seconds: number) => void;
};

const inputClass =
  "min-h-tap flex-1 rounded-[9px] border border-line bg-up px-1 py-3 text-center text-base outline-none focus:border-dim";

export function ExerciseCard({
  index,
  draft,
  annotation,
  loadType,
  progression,
  restSeconds,
  suggestion,
  record,
  onChange,
  onStartTimer,
}: Props) {
  const setSets = (sets: ExerciseDraft["sets"]) => onChange({ ...draft, sets });

  const updateSet = (i: number, field: "reps" | "weight" | "height", value: string) =>
    setSets(draft.sets.map((s, j) => (i === j ? { ...s, [field]: value } : s)));

  const copyFirstSet = () => {
    const first = draft.sets[0];
    if (!first) return;
    setSets(draft.sets.map(() => ({ ...first })));
  };

  const applySuggestion = () => {
    if (!suggestion) return;
    setSets(draft.sets.map((s) => ({ ...s, weight: String(suggestion.next) })));
  };

  const target = `${draft.targetSets}×${draft.repMin === draft.repMax ? draft.repMin : `${draft.repMin}-${draft.repMax}`}${
    draft.repUnit === "seconds" ? ` ${t.plan.seconds}` : ""
  }${draft.perSide ? ` / ${t.plan.perSide}` : ""}`;

  return (
    <div className={`mb-2.5 rounded-[12px] bg-panel p-3 ${draft.skipped ? "opacity-40" : ""}`}>
      <div className="mb-2.5 flex items-start justify-between">
        <div className="flex-1">
          <div className="text-[13px] font-semibold">
            {index + 1}. {draft.name}
            {annotation && <span className="ml-1.5 text-[11px] font-normal text-yellow">({annotation})</span>}
          </div>
          <div className="mt-0.5 text-[11px] text-dim">
            {t.workout.planTarget} {target}
            {record && record.maxWeightKg > 0 && (
              <span className="text-gold"> · 🏆 {record.maxWeightKg} kg</span>
            )}
          </div>
        </div>
        <div className="flex">
          {!draft.skipped && loadType !== "none" && draft.sets.length > 1 && (
            <button
              type="button"
              onClick={copyFirstSet}
              aria-label={t.workout.copyFirst}
              className="flex h-tap w-9 items-center justify-center text-[15px] text-green"
            >
              ↓
            </button>
          )}
          <button
            type="button"
            onClick={() => onChange({ ...draft, skipped: !draft.skipped })}
            aria-label={draft.skipped ? t.workout.unskip : t.workout.skip}
            className="flex h-tap w-9 items-center justify-center text-[15px] text-dim"
          >
            {draft.skipped ? "+" : "✕"}
          </button>
        </div>
      </div>

      {!draft.skipped && (
        <>
          {suggestion && (
            <button
              type="button"
              onClick={applySuggestion}
              className={`mb-2.5 min-h-tap w-full rounded-[8px] border border-dashed px-2 text-[12px] ${
                suggestion.up ? "border-green text-green" : "border-line text-dim"
              }`}
            >
              {suggestion.up
                ? `↑ ${t.workout.suggestionUp(suggestion.next, suggestion.last)}`
                : t.workout.suggestionSame(suggestion.last)}
            </button>
          )}

          {draft.sets.map((set, i) => (
            <div key={i} className="mb-1.5 flex items-center gap-1.5">
              <span className="w-3.5 flex-none text-[11px] text-dim">{i + 1}</span>
              <input
                className={inputClass}
                inputMode="numeric"
                placeholder={draft.repUnit === "seconds" ? t.plan.seconds : t.workout.reps}
                value={set.reps}
                onChange={(e) => updateSet(i, "reps", e.target.value)}
              />
              {progression === "height" ? (
                <input
                  className={inputClass}
                  inputMode="decimal"
                  placeholder={t.workout.cm}
                  value={set.height}
                  onChange={(e) => updateSet(i, "height", e.target.value)}
                />
              ) : loadType === "none" ? (
                <span className="flex-1 text-center text-dim">—</span>
              ) : (
                <input
                  className={inputClass}
                  inputMode="decimal"
                  placeholder={loadType === "bodyweight" ? t.workout.added : t.workout.kg}
                  value={set.weight}
                  onChange={(e) => updateSet(i, "weight", e.target.value)}
                />
              )}
              <button
                type="button"
                onClick={() => onStartTimer(restSeconds)}
                aria-label={t.workout.restTimer}
                className="flex h-tap w-9 flex-none items-center justify-center text-[15px] text-dim"
              >
                ⏱
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setSets([...draft.sets, { reps: "", weight: "", height: "" }])}
            className="min-h-tap w-full rounded-[8px] border border-dashed border-line text-[11px] text-dim"
          >
            {t.workout.addSet}
          </button>
        </>
      )}
    </div>
  );
}
