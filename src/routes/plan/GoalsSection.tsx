import { setWeeklyGoal } from "../../lib/data/planActions";
import { useGoals } from "../../lib/data/queries";
import { t } from "../../lib/i18n/pl";
import type { Discipline } from "../../lib/data/types";

const disciplines: Discipline[] = ["gym", "swim", "run", "bike"];

export function GoalsSection({ userId }: { userId: string | undefined }) {
  const goals = useGoals(userId);

  return (
    <section className="mb-4">
      <div className="section-label mb-1">{t.plan.goals}</div>
      <p className="mb-2.5 text-[11px] text-dim">{t.plan.goalsHint}</p>
      <div className="rounded-[14px] bg-panel p-2">
        {disciplines.map((discipline) => (
          <div
            key={discipline}
            className="flex items-center justify-between border-b border-line px-2 last:border-b-0"
          >
            <span className={`text-[14px] ${discipline === "gym" ? "text-green" : "text-blue"}`}>
              {t.disciplines[discipline]}
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={21}
              defaultValue={goals?.[discipline]?.target_sessions ?? 0}
              key={`${discipline}-${goals?.[discipline]?.id ?? "new"}`}
              onBlur={(e) => {
                const value = Math.max(0, Math.min(21, Math.round(Number(e.target.value) || 0)));
                e.target.value = String(value);
                if (userId) void setWeeklyGoal(userId, discipline, value);
              }}
              className="my-1 w-16 rounded-[9px] border border-line bg-up py-2 text-center text-base outline-none"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
