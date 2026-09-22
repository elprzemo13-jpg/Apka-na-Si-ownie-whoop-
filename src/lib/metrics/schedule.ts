// Which training day the app offers today, ported from trening.html.

export type ScheduleDay = { id: string; weekdays: number[] };

export type DaySuggestion = {
  dayId: string | null;
  /** false when today is a rest day in a weekly plan */
  scheduledToday: boolean;
};

/**
 * A weekly plan answers by weekday. Without a match — a rest day, or a
 * rotation plan with no weekdays — the next day after the last one trained.
 */
export function suggestDay(
  days: ScheduleDay[],
  weekday: number,
  lastTrainedDayId: string | null,
): DaySuggestion {
  if (days.length === 0) return { dayId: null, scheduledToday: false };

  const scheduled = days.find((day) => day.weekdays.includes(weekday));
  if (scheduled) return { dayId: scheduled.id, scheduledToday: true };

  const lastIndex = lastTrainedDayId ? days.findIndex((day) => day.id === lastTrainedDayId) : -1;
  const next = lastIndex >= 0 ? days[(lastIndex + 1) % days.length] : days[0];
  return { dayId: next?.id ?? null, scheduledToday: false };
}
