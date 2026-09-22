import type { LoadRow } from "../../lib/data/queries";
import { formatDistance, formatDuration } from "../../lib/metrics/format";
import { loadPoints } from "../../lib/metrics/weekly";
import { t } from "../../lib/i18n/pl";

/** Compact list of this week's sessions, newest first. */
export function WeekList({ sessions }: { sessions: LoadRow[] }) {
  if (sessions.length === 0) {
    return <p className="text-[13px] text-dim">{t.today.noSessionsThisWeek}</p>;
  }

  const ordered = [...sessions].sort((a, b) => b.performed_on.localeCompare(a.performed_on));

  return (
    <>
      {ordered.map((session) => {
        const gym = session.discipline === "gym";
        return (
          <div key={session.id} className="mb-2 flex items-center gap-3 rounded-[14px] bg-panel p-3.5">
            <div className={`h-9 w-[3px] flex-none rounded-[2px] ${gym ? "bg-green" : "bg-blue"}`} />
            <div className="flex-1">
              <div className="text-[14px] font-semibold">{t.disciplines[session.discipline]}</div>
              <div className="mt-0.5 text-[12px] text-dim">
                {gym
                  ? `${Math.round(session.volume_kg)} kg`
                  : [
                      formatDistance(session.distance_m ?? 0, session.discipline as "swim" | "run" | "bike"),
                      session.duration_s ? formatDuration(session.duration_s) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
              </div>
            </div>
            <div className="font-head text-lg font-bold text-dim">{loadPoints(session).toFixed(1)}</div>
          </div>
        );
      })}
    </>
  );
}
