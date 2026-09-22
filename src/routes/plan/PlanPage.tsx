import { useState } from "react";
import { Link } from "react-router";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../lib/auth/AuthProvider";
import { addDefaultWarmup, addPlanDay, createPlan, movePlanDay } from "../../lib/data/planActions";
import { useActivePlan, usePlanDays } from "../../lib/data/queries";
import { t } from "../../lib/i18n/pl";
import { ChecklistEditor } from "./ChecklistEditor";
import { GoalsSection } from "./GoalsSection";

export function PlanPage() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const plan = useActivePlan(userId);
  const days = usePlanDays(plan?.id);
  const [busy, setBusy] = useState(false);

  if (plan === undefined) return null; // first read from the local database
  if (plan === null) {
    return (
      <EmptyState
        title={t.plan.emptyTitle}
        action={
          <Button
            busy={busy}
            onClick={async () => {
              if (!userId) return;
              setBusy(true);
              await createPlan(userId, t.plan.defaultName);
              setBusy(false);
            }}
          >
            {t.plan.create}
          </Button>
        }
      >
        {t.plan.emptyBody}
      </EmptyState>
    );
  }

  return (
    <div className="px-4 pt-5 pb-4">
      <div className="section-label mb-2.5">{t.plan.days}</div>
      {days?.length === 0 && <p className="mb-3 text-[13px] text-dim">{t.plan.noDays}</p>}
      {days?.map((day, index) => (
        <div key={day.id} className="mb-2.5 flex items-stretch gap-2">
          <Link to={`/plan/day/${day.id}`} className="flex-1 rounded-[14px] bg-panel p-3.5">
            <div className="font-head text-[21px] font-bold uppercase">{day.name}</div>
            <div className="mt-1 text-[11px] text-dim">
              {day.weekdays.length
                ? day.weekdays
                    .slice()
                    .sort((a, b) => a - b)
                    .map((w) => t.weekdaysShort[w])
                    .join(" · ")
                : t.plan.noWeekdays}
            </div>
          </Link>
          <div className="flex flex-col justify-center">
            <button
              type="button"
              aria-label={t.plan.moveUp}
              disabled={index === 0}
              onClick={() => days && void movePlanDay(days, day.id, -1)}
              className="flex h-[22px] w-tap items-center justify-center text-dim disabled:opacity-25"
            >
              ▲
            </button>
            <button
              type="button"
              aria-label={t.plan.moveDown}
              disabled={index === (days?.length ?? 0) - 1}
              onClick={() => days && void movePlanDay(days, day.id, 1)}
              className="flex h-[22px] w-tap items-center justify-center text-dim disabled:opacity-25"
            >
              ▼
            </button>
          </div>
        </div>
      ))}
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => void addPlanDay(plan.id, t.plan.newDayName)}
      >
        {t.plan.addDay}
      </Button>

      <ChecklistEditor
        planId={plan.id}
        dayId={null}
        kind="warmup"
        title={t.plan.warmup}
        hint={t.plan.warmupHint}
        presets={[{ label: t.plan.insertDefaults, onInsert: () => void addDefaultWarmup(plan.id) }]}
      />

      <GoalsSection userId={userId} />
    </div>
  );
}
