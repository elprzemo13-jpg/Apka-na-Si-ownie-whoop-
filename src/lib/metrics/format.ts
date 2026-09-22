// Shared number formatting for endurance sessions.

const mmss = (seconds: number) => {
  const rounded = Math.max(0, Math.round(seconds));
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
};

/** Swimming pace, as in trening.html: minutes and seconds per 100 m. */
export function pacePer100m(distanceM: number, durationS: number): string | null {
  if (distanceM <= 0 || durationS <= 0) return null;
  return mmss(durationS / (distanceM / 100));
}

/** Running pace: minutes and seconds per kilometre. */
export function pacePerKm(distanceM: number, durationS: number): string | null {
  if (distanceM <= 0 || durationS <= 0) return null;
  return mmss(durationS / (distanceM / 1000));
}

/** Average speed in km/h, one decimal. */
export function speedKmh(distanceM: number, durationS: number): number | null {
  if (distanceM <= 0 || durationS <= 0) return null;
  return Math.round((distanceM / 1000 / (durationS / 3600)) * 10) / 10;
}

export function formatDuration(durationS: number): string {
  const minutes = Math.round(durationS / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`;
}

export function formatDistance(distanceM: number, discipline: "swim" | "run" | "bike"): string {
  // Swimmers count metres, runners and cyclists count kilometres.
  if (discipline === "swim") return `${distanceM} m`;
  return `${(distanceM / 1000).toFixed(distanceM % 1000 === 0 ? 0 : 2)} km`;
}
