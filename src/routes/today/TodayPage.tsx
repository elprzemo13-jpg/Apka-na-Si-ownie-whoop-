import { Link } from "react-router";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { MiniRing, Ring } from "../../components/ui/Ring";
import { useAuth } from "../../lib/auth/AuthProvider";
import { toIsoDate, weekdayIndex, weekStart } from "../../lib/dates";
import {
  useActivePlan,
  useGoals,
  useLastGymDayId,
  useLoadSessions,
  usePlanDays,
  usePlanExercises,
} from "../../lib/data/queries";
import { suggestDay } from "../../lib/metrics/schedule";
import {
  checklistRate,
  loadIndicator,
  loadTone,
  regularity,
  ringTone,
  verdict,
  weekCompletion,
} from "../../lib/metrics/weekly";
import { t } from "../../lib/i18n/pl";
import { WeekList } from "./WeekList";

export function TodayPage() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const plan = useActivePlan(userId);
  const days = usePlanDays(plan?.id);
  const goals = useGoals(userId);
  const sessions = useLoadSessions(userId);
  const lastGymDayId = useLastGymDayId(userId);

  const suggestion = suggestDay(days ?? [], weekdayIndex(), lastGymDayId ?? null);
  const suggestedDay = days?.find((day) => day.id === suggestion.dayId);
  const dayExercises = usePlanExercises(suggestedDay?.id);

  if (!sessions || plan === undefined) return null;

  // A fresh account sees an explanation instead of a wall of zeros.
  if (sessions.length === 0) {
    return (
      <EmptyState
        title={t.today.emptyTitle}
        action={
          <Link
            to={plan ? "/workout/gym" : "/plan"}
            className="block min-h-tap w-full rounded-[10px] bg-green py-3.5 text-[15px] font-bold text-black"
          >
            {plan ? t.today.start : t.today.buildPlan}
          </Link>
        }
      >
        {t.today.emptyBody}
      </EmptyState>
    );
  }

  const goalList = Object.values(goals ?? {}).filter((goal) => goal !== undefined);
  const completion = weekCompletion(sessions, goalList);
  const load = loadIndicator(sessions);
  const consistency = regularity(sessions.map((s) => s.performed_on));
  const gymSessions = sessions.filter((s) => s.discipline === "gym");
  const warmupRate = checklistRate(gymSessions, "warmup");
  const stretchRate = checklistRate(gymSessions, "stretch");

  const completionSub = completion.perDiscipline
    .map((row) => `${row.done}/${row.target} ${t.disciplines[row.discipline].toLowerCase()}`)
    .join(" · ");

  const doneToday = sessions.some((s) => s.discipline === "gym" && s.performed_on === toIsoDate());
  const thisWeek = sessions.filter((s) => s.performed_on >= weekStart());

  return (
    <div className="px-4 pt-5 pb-3">
      <div className="mb-3 rounded-[20px] bg-panel px-4 pt-6 pb-5">
        <Ring
          value={completion.percent}
          tone={ringTone(completion.percent)}
          label={t.today.completion}
          sub={goalList.length ? completionSub : t.today.noGoals}
        />
      </div>

      <div className="mb-3 flex gap-2">
        <MiniRing value={load.percent} tone={loadTone(load.percent)} label={t.today.load} />
        <MiniRing value={consistency} tone={ringTone(consistency)} label={t.today.regularity} />
        <MiniRing value={warmupRate} tone={ringTone(warmupRate)} label={t.today.warmup} />
        <MiniRing value={stretchRate} tone={ringTone(stretchRate)} label={t.today.stretch} />
      </div>

      <div className="mb-3 rounded-[14px] bg-panel p-3.5">
        <div className="section-label mb-1.5">{t.today.verdictLabel}</div>
        <div className="text-sm leading-relaxed">{t.today.verdicts[verdict(load)]}</div>
      </div>

      {suggestedDay && (
        <div className={`mb-3 rounded-[14px] bg-panel p-3.5 ${doneToday ? "border border-green" : ""}`}>
          <div className="section-label mb-0.5">
            {suggestion.scheduledToday ? t.today.planToday : t.today.restDay}
            {doneToday && ` · ${t.today.doneToday} ✓`}
          </div>
          {suggestion.scheduledToday ? (
            <>
              <div className="font-head text-[32px] font-bold uppercase">{suggestedDay.name}</div>
              <div className="mt-2.5">
                {dayExercises?.map((row, index) => (
                  <div key={row.id} className="mb-1 flex justify-between text-[13px]">
                    <span className="text-dim">
                      {index + 1}. {row.exercise?.name}
                    </span>
                    <span className="font-head text-sm whitespace-nowrap">
                      {row.target_sets}×{row.rep_min === row.rep_max ? row.rep_min : `${row.rep_min}-${row.rep_max}`}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-1 text-[12px] text-dim">{t.today.restDayBody}</div>
          )}
          <Link
            to={`/workout/gym?day=${suggestedDay.id}`}
            className={`mt-3 block min-h-tap rounded-[10px] py-3.5 text-center text-[15px] ${
              suggestion.scheduledToday
                ? "bg-green font-bold text-black"
                : "border border-line font-semibold text-dim"
            }`}
          >
            {suggestion.scheduledToday
              ? doneToday
                ? t.today.saveNext
                : t.today.start
              : t.today.startAnyway(suggestedDay.name)}
          </Link>
        </div>
      )}

      {!plan && (
        <Link to="/plan" className="mb-3 block">
          <Button variant="ghost">{t.today.buildPlan}</Button>
        </Link>
      )}

      <div className="mt-5 mb-2.5 flex items-center justify-between">
        <span className="section-label">{t.today.thisWeek}</span>
        <Link to="/trends" className="text-[11px] text-dim underline">
          {t.nav.trends} →
        </Link>
      </div>
      <WeekList sessions={thisWeek} />
    </div>
  );
}
