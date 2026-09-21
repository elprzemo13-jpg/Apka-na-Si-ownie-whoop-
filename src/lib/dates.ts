// Calendar helpers. All dates are the user's local calendar dates stored as
// "YYYY-MM-DD" strings; weeks start on Monday (same as trening.html).

export type IsoDate = string;

export function toIsoDate(d: Date = new Date()): IsoDate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parses at local noon so DST shifts never move the date. */
export function fromIsoDate(s: IsoDate): Date {
  return new Date(`${s}T12:00:00`);
}

/** Monday of the week containing `d`, shifted back by `weeksAgo` weeks. */
export function weekStart(d: Date = new Date(), weeksAgo = 0): IsoDate {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7) - weeksAgo * 7);
  return toIsoDate(x);
}

export function isInWeek(date: IsoDate, weekStartDate: IsoDate): boolean {
  const end = fromIsoDate(weekStartDate);
  end.setDate(end.getDate() + 7);
  return date >= weekStartDate && date < toIsoDate(end);
}

/** Monday = 0 … Sunday = 6 */
export function weekdayIndex(d: Date = new Date()): number {
  return (d.getDay() + 6) % 7;
}

export function formatHeaderDate(d: Date = new Date()): string {
  return d.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" });
}
