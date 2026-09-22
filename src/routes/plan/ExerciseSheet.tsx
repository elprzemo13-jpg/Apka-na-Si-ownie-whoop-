import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { Chip } from "../../components/ui/Chip";
import { Notice } from "../../components/ui/Notice";
import { Sheet } from "../../components/ui/Sheet";
import { TextField } from "../../components/ui/TextField";
import type { ExerciseForm } from "../../lib/data/planActions";
import type { LoadType, Progression, RepUnit } from "../../lib/data/types";
import { t } from "../../lib/i18n/pl";

type Props = {
  open: boolean;
  initial?: ExerciseForm;
  onClose: () => void;
  onSave: (form: ExerciseForm) => Promise<void>;
};

export const emptyExerciseForm: ExerciseForm = {
  name: "",
  load_type: "weighted",
  progression: "weight",
  weight_step_kg: 2.5,
  target_sets: 3,
  rep_min: 8,
  rep_max: 10,
  rep_unit: "reps",
  per_side: false,
  annotation: null,
  rest_s: null,
};

const loadTypes: LoadType[] = ["weighted", "bodyweight", "none"];
const progressions: Progression[] = ["weight", "fixed", "height", "time"];
const loadLabel = {
  weighted: t.exerciseForm.loadWeighted,
  bodyweight: t.exerciseForm.loadBodyweight,
  none: t.exerciseForm.loadNone,
};
const progLabel = {
  weight: t.exerciseForm.progWeight,
  fixed: t.exerciseForm.progFixed,
  height: t.exerciseForm.progHeight,
  time: t.exerciseForm.progTime,
};

/**
 * Numbers are kept as raw text while typing, so a field can be emptied and
 * retyped. Clamping on every keystroke would snap a half-typed value back.
 */
type NumericFields = { sets: string; repMin: string; repMax: string; step: string; rest: string };

function parse(value: string, fallback: number, min: number, max: number) {
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed) || value.trim() === "") return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function ExerciseSheet({ open, initial, onClose, onSave }: Props) {
  const start = initial ?? emptyExerciseForm;
  const [form, setForm] = useState<ExerciseForm>(start);
  const [nums, setNums] = useState<NumericFields>({
    sets: String(start.target_sets),
    repMin: String(start.rep_min),
    repMax: String(start.rep_max),
    step: String(start.weight_step_kg),
    rest: start.rest_s === null ? "" : String(start.rest_s),
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (changes: Partial<ExerciseForm>) => setForm((f) => ({ ...f, ...changes }));
  const setNum = (changes: Partial<NumericFields>) => setNums((n) => ({ ...n, ...changes }));

  async function submit() {
    if (!form.name.trim()) {
      setError(t.exerciseForm.nameRequired);
      return;
    }
    const repMin = Math.round(parse(nums.repMin, 1, 1, 999));
    const repMax = Math.round(parse(nums.repMax, repMin, 1, 999));
    if (repMax < repMin) {
      setError(t.exerciseForm.rangeInvalid);
      return;
    }
    setBusy(true);
    await onSave({
      ...form,
      name: form.name.trim(),
      annotation: form.annotation?.trim() || null,
      target_sets: Math.round(parse(nums.sets, 1, 1, 20)),
      rep_min: repMin,
      rep_max: repMax,
      weight_step_kg: parse(nums.step, 2.5, 0.5, 50),
      rest_s: nums.rest.trim() === "" ? null : Math.round(parse(nums.rest, 90, 0, 900)),
    });
    setBusy(false);
    onClose();
  }

  const unitSuffix = form.rep_unit === "seconds" ? ` (${t.plan.seconds})` : "";

  return (
    <Sheet open={open} onClose={onClose} title={initial ? t.exerciseForm.titleEdit : t.exerciseForm.titleNew}>
      <TextField
        label={t.exerciseForm.name}
        placeholder={t.exerciseForm.namePlaceholder}
        value={form.name}
        onChange={(e) => set({ name: e.target.value })}
        autoFocus={!initial}
      />
      <TextField
        label={t.exerciseForm.annotation}
        placeholder={t.exerciseForm.annotationPlaceholder}
        value={form.annotation ?? ""}
        onChange={(e) => set({ annotation: e.target.value })}
      />

      <div className="mb-3 flex gap-2">
        <TextField
          className="w-20"
          label={t.exerciseForm.sets}
          type="number"
          inputMode="numeric"
          value={nums.sets}
          onChange={(e) => setNum({ sets: e.target.value })}
        />
        <TextField
          className="flex-1"
          label={`${t.exerciseForm.repRange}${unitSuffix} — ${t.exerciseForm.repMin}`}
          type="number"
          inputMode="numeric"
          value={nums.repMin}
          onChange={(e) => setNum({ repMin: e.target.value })}
        />
        <TextField
          className="flex-1"
          label={t.exerciseForm.repMax}
          type="number"
          inputMode="numeric"
          value={nums.repMax}
          onChange={(e) => setNum({ repMax: e.target.value })}
        />
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {(["reps", "seconds"] as RepUnit[]).map((unit) => (
          <Chip
            key={unit}
            label={unit === "reps" ? t.exerciseForm.unitReps : t.exerciseForm.unitSeconds}
            active={form.rep_unit === unit}
            onClick={() => set({ rep_unit: unit, progression: unit === "seconds" ? "time" : form.progression })}
          />
        ))}
        <Chip label={t.exerciseForm.perSide} active={form.per_side} onClick={() => set({ per_side: !form.per_side })} />
      </div>

      <div className="mb-1 text-[10px] font-semibold tracking-[1.1px] text-dim uppercase">
        {t.exerciseForm.loadType}
      </div>
      <div className="mb-1 flex flex-wrap gap-2">
        {loadTypes.map((type) => (
          <Chip
            key={type}
            label={loadLabel[type]}
            active={form.load_type === type}
            onClick={() =>
              set({
                load_type: type,
                progression: type === "none" && form.progression === "weight" ? "fixed" : form.progression,
              })
            }
          />
        ))}
      </div>
      <p className="mb-4 text-[10.5px] text-dim">{t.exerciseForm.loadHint[form.load_type]}</p>

      <div className="mb-1 text-[10px] font-semibold tracking-[1.1px] text-dim uppercase">
        {t.exerciseForm.progression}
      </div>
      <div className="mb-1 flex flex-wrap gap-2">
        {progressions.map((mode) => (
          <Chip
            key={mode}
            label={progLabel[mode]}
            active={form.progression === mode}
            onClick={() => set({ progression: mode, rep_unit: mode === "time" ? "seconds" : form.rep_unit })}
          />
        ))}
      </div>
      <p className="mb-4 text-[10.5px] text-dim">{t.exerciseForm.progHint[form.progression]}</p>

      {form.progression === "weight" && (
        <TextField
          label={t.exerciseForm.step}
          hint={t.exerciseForm.stepHint}
          type="number"
          inputMode="decimal"
          step="0.5"
          value={nums.step}
          onChange={(e) => setNum({ step: e.target.value })}
        />
      )}

      <TextField
        label={t.exerciseForm.rest}
        hint={t.exerciseForm.restHint}
        type="number"
        inputMode="numeric"
        value={nums.rest}
        onChange={(e) => setNum({ rest: e.target.value })}
      />

      {error && <Notice tone="error">{error}</Notice>}
      <Button busy={busy} onClick={() => void submit()}>
        {t.exerciseForm.save}
      </Button>
    </Sheet>
  );
}
