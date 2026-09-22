import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "../../components/ui/Button";
import { Chip } from "../../components/ui/Chip";
import { Notice } from "../../components/ui/Notice";
import { TextField } from "../../components/ui/TextField";
import { useAuth } from "../../lib/auth/AuthProvider";
import { toIsoDate } from "../../lib/dates";
import { useSession } from "../../lib/data/queries";
import {
  canSaveEndurance,
  distanceMetres,
  saveEnduranceSession,
  type EnduranceDraft,
} from "../../lib/data/workoutActions";
import { pacePer100m, pacePerKm, speedKmh } from "../../lib/metrics/format";
import { t } from "../../lib/i18n/pl";

type Endurance = "swim" | "run" | "bike";

const isEndurance = (value: string | null): value is Endurance =>
  value === "swim" || value === "run" || value === "bike";

const emptyDraft = (discipline: Endurance): EnduranceDraft => ({
  discipline,
  performedOn: toIsoDate(),
  distance: "",
  durationMin: "",
  sessionType: null,
  swimStyle: discipline === "swim" ? (t.endurance.styles[0] ?? null) : null,
  underwaterM: "",
  notes: "",
});

export function EnduranceWorkoutPage() {
  const { session: auth } = useAuth();
  const userId = auth?.user.id;
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const discipline: Endurance = isEndurance(params.get("type")) ? (params.get("type") as Endurance) : "swim";
  const editId = params.get("id") ?? undefined;
  const existing = useSession(editId);

  const [draft, setDraft] = useState<EnduranceDraft>(() => emptyDraft(discipline));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editing an entry from the log: fill the form once the row is loaded.
  useEffect(() => {
    if (!editId || !existing) return;
    setDraft({
      id: existing.id,
      discipline: existing.discipline as Endurance,
      performedOn: existing.performed_on,
      distance:
        existing.distance_m === null
          ? ""
          : existing.discipline === "swim"
            ? String(existing.distance_m)
            : String(existing.distance_m / 1000),
      durationMin: existing.duration_s ? String(Math.round(existing.duration_s / 60)) : "",
      sessionType: existing.session_type,
      swimStyle: existing.swim_style,
      underwaterM: existing.underwater_m === null ? "" : String(existing.underwater_m),
      notes: existing.notes ?? "",
    });
  }, [editId, existing]);

  const set = (changes: Partial<EnduranceDraft>) => setDraft((d) => ({ ...d, ...changes }));

  const metres = distanceMetres(draft);
  const seconds = (Number(draft.durationMin.replace(",", ".")) || 0) * 60;
  const summary =
    draft.discipline === "swim"
      ? pacePer100m(metres, seconds) && `${pacePer100m(metres, seconds)} /100 m`
      : draft.discipline === "run"
        ? pacePerKm(metres, seconds) && `${pacePerKm(metres, seconds)} /km`
        : speedKmh(metres, seconds) && `${speedKmh(metres, seconds)} km/h`;

  const types = t.endurance.types[draft.discipline];
  const canSave = canSaveEndurance(draft);

  return (
    <div className="px-4 pt-4 pb-[120px]">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-head text-[26px] font-bold uppercase">{t.disciplines[draft.discipline]}</h1>
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label={t.workout.close}
          className="flex h-tap w-tap items-center justify-center text-[22px] text-dim"
        >
          ✕
        </button>
      </div>

      <label className="mb-4 flex items-center justify-between rounded-[9px] border border-line bg-up px-3">
        <span className="text-[10px] font-semibold tracking-[1.1px] text-dim uppercase">{t.workout.date}</span>
        <input
          type="date"
          value={draft.performedOn}
          max={toIsoDate()}
          onChange={(e) => set({ performedOn: e.target.value || toIsoDate() })}
          className="min-h-tap bg-transparent text-right text-base outline-none"
        />
      </label>

      <TextField
        label={draft.discipline === "swim" ? t.endurance.distanceM : t.endurance.distanceKm}
        inputMode="decimal"
        placeholder={draft.discipline === "swim" ? "2500" : "10"}
        value={draft.distance}
        onChange={(e) => set({ distance: e.target.value })}
      />

      <TextField
        label={t.endurance.durationMin}
        inputMode="numeric"
        placeholder="60"
        value={draft.durationMin}
        onChange={(e) => set({ durationMin: e.target.value })}
      />

      {summary && (
        <div className="mb-4 flex items-center justify-between rounded-[10px] bg-blue/9 px-3 py-2.5">
          <span className="text-[12px] text-dim">{t.endurance.summary[draft.discipline]}</span>
          <span className="font-head text-[22px] font-bold text-blue">{summary}</span>
        </div>
      )}

      {draft.discipline === "swim" && (
        <>
          <TextField
            label={t.endurance.underwater}
            hint={t.endurance.underwaterHint}
            inputMode="numeric"
            placeholder="300"
            value={draft.underwaterM}
            onChange={(e) => set({ underwaterM: e.target.value })}
          />
          <div className="mb-1 text-[10px] font-semibold tracking-[1.1px] text-dim uppercase">
            {t.endurance.style}
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            {t.endurance.styles.map((style) => (
              <Chip
                key={style}
                label={style}
                color="blue"
                active={draft.swimStyle === style}
                onClick={() => set({ swimStyle: style })}
              />
            ))}
          </div>
        </>
      )}

      <div className="mb-1 text-[10px] font-semibold tracking-[1.1px] text-dim uppercase">
        {t.endurance.character}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {types.map((type) => (
          <Chip
            key={type}
            label={type}
            color="blue"
            active={draft.sessionType === type}
            onClick={() => set({ sessionType: draft.sessionType === type ? null : type })}
          />
        ))}
      </div>

      <div className="mb-3">
        <label className="mb-[7px] block text-[10px] font-semibold tracking-[1.1px] text-dim uppercase">
          {t.endurance.notes}
        </label>
        <textarea
          rows={3}
          placeholder={t.endurance.notesPlaceholder}
          value={draft.notes}
          onChange={(e) => set({ notes: e.target.value })}
          className="w-full rounded-[9px] border border-line bg-up p-3 text-base outline-none focus:border-dim"
        />
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {!canSave && <p className="mb-2 text-[12px] text-dim">{t.endurance.needsDistanceAndTime}</p>}

      <Button
        busy={busy}
        disabled={!canSave}
        className="bg-blue"
        onClick={async () => {
          if (!userId) return;
          setBusy(true);
          setError(null);
          try {
            await saveEnduranceSession(userId, draft);
            navigate(editId ? "/log" : "/", { replace: true });
          } catch (e) {
            setError(e instanceof Error ? e.message : t.errors.generic);
          } finally {
            setBusy(false);
          }
        }}
      >
        ✓ {t.workout.save}
      </Button>
    </div>
  );
}
