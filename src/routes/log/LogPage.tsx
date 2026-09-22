import { useState } from "react";
import { Link } from "react-router";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../lib/auth/AuthProvider";
import { fromIsoDate } from "../../lib/dates";
import { useSessionDetails, useSessions } from "../../lib/data/queries";
import { deleteSession } from "../../lib/data/workoutActions";
import { formatDistance, formatDuration, pacePer100m, pacePerKm, speedKmh } from "../../lib/metrics/format";
import { t } from "../../lib/i18n/pl";
import type { Session } from "../../lib/data/types";

const formatDay = (iso: string) =>
  fromIsoDate(iso).toLocaleDateString("pl-PL", { weekday: "short", day: "2-digit", month: "short" });

function summaryOf(session: Session): string {
  if (session.discipline === "gym") {
    return [session.warmup_done ? "🔥" : null, session.stretch_done ? "🧘" : null]
      .filter(Boolean)
      .join(" ");
  }
  const distance = session.distance_m ?? 0;
  const duration = session.duration_s ?? 0;
  const pace =
    session.discipline === "swim"
      ? `${pacePer100m(distance, duration) ?? "—"}/100 m`
      : session.discipline === "run"
        ? `${pacePerKm(distance, duration) ?? "—"}/km`
        : `${speedKmh(distance, duration) ?? "—"} km/h`;
  const parts = [formatDistance(distance, session.discipline), formatDuration(duration), pace];
  if (session.underwater_m) parts.push(`${session.underwater_m} m pod wodą`);
  return parts.join(" · ");
}

function GymDetails({ sessionId }: { sessionId: string }) {
  const details = useSessionDetails(sessionId);
  if (!details) return null;
  return (
    <div className="mt-3 border-t border-line pt-3">
      {details.map((exercise, i) => (
        <div key={i} className="mb-2.5">
          <div className="mb-1 text-[13px] font-semibold">
            {exercise.name}
            {exercise.skipped && <span className="ml-1.5 text-[11px] font-normal text-dim">({t.log.skipped})</span>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {exercise.sets.map((set, j) => (
              <span key={j} className="rounded-full bg-up px-2.5 py-1 text-[12px]">
                {set.reps}
                {set.weight_kg !== null ? ` × ${set.weight_kg} kg` : set.height_cm !== null ? ` × ${set.height_cm} cm` : ""}
              </span>
            ))}
          </div>
        </div>
      ))}
      <div className="mt-2 text-[11px] text-dim">{t.log.editGymHint}</div>
    </div>
  );
}

export function LogPage() {
  const { session: auth } = useAuth();
  const sessions = useSessions(auth?.user.id);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!sessions) return null;
  if (sessions.length === 0) return <EmptyState>{t.log.empty}</EmptyState>;

  const byDay = new Map<string, Session[]>();
  for (const session of sessions) {
    byDay.set(session.performed_on, [...(byDay.get(session.performed_on) ?? []), session]);
  }

  return (
    <div className="px-4 pt-5 pb-4">
      {[...byDay.entries()].map(([day, entries]) => (
        <div key={day} className="mb-5">
          <div className="section-label mb-2.5">{formatDay(day)}</div>
          {entries.map((session) => {
            const gym = session.discipline === "gym";
            const isOpen = expanded === session.id;
            return (
              <div key={session.id} className="mb-2 rounded-[14px] bg-panel p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-1 items-center gap-3">
                    <div className={`h-9 w-[3px] flex-none rounded-[2px] ${gym ? "bg-green" : "bg-blue"}`} />
                    <div className="flex-1">
                      <div className="text-[14px] font-semibold">
                        {gym
                          ? (session.day_label_snapshot ?? t.disciplines.gym)
                          : [t.disciplines[session.discipline], session.swim_style, session.session_type]
                              .filter(Boolean)
                              .join(" · ")}
                      </div>
                      <div className="mt-0.5 text-[12px] text-dim">{summaryOf(session)}</div>
                    </div>
                  </div>
                  <div className="flex">
                    {gym ? (
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : session.id)}
                        aria-label={t.log.expand}
                        className="flex h-tap w-8 items-center justify-center text-dim"
                      >
                        {isOpen ? "▲" : "▼"}
                      </button>
                    ) : (
                      <Link
                        to={`/workout/endurance?type=${session.discipline}&id=${session.id}`}
                        aria-label={t.log.edit}
                        className="flex h-tap w-8 items-center justify-center text-dim"
                      >
                        ✎
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(t.log.deleteConfirm)) void deleteSession(session.id);
                      }}
                      aria-label={t.log.delete}
                      className="flex h-tap w-8 items-center justify-center text-red"
                    >
                      🗑
                    </button>
                  </div>
                </div>
                {gym && isOpen && <GymDetails sessionId={session.id} />}
                {!gym && session.notes && <div className="mt-2 text-[12px] text-dim">{session.notes}</div>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
