import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../lib/auth/AuthProvider";
import { fromIsoDate, isInWeek, weekStart } from "../../lib/dates";
import { useAllRecords, useLoadSessions, type LoadRow } from "../../lib/data/queries";
import { pacePer100m } from "../../lib/metrics/format";
import { checklistRate, loadPoints } from "../../lib/metrics/weekly";
import { t } from "../../lib/i18n/pl";
import type { Discipline } from "../../lib/data/types";

const BAR_COLOURS: Record<Discipline, string> = {
  gym: "bg-green",
  swim: "bg-blue",
  run: "bg-blue/65",
  bike: "bg-blue/35",
};

const CHART_HEIGHT = 120;

function Tile({ value, label, tone = "text-blue" }: { value: string | number; label: string; tone?: string }) {
  return (
    <div className="flex-1 rounded-[14px] bg-panel p-4">
      <div className={`font-head text-[30px] font-bold ${tone}`}>{value}</div>
      <div className="mt-0.5 text-[9.5px] tracking-[0.4px] text-dim">{label.toUpperCase()}</div>
    </div>
  );
}

export function TrendsPage() {
  const { session } = useAuth();
  const sessions = useLoadSessions(session?.user.id);
  const records = useAllRecords(session?.user.id);

  if (!sessions) return null;
  if (sessions.length === 0) return <EmptyState>{t.trends.empty}</EmptyState>;

  // Six weeks, oldest first.
  const weeks = [5, 4, 3, 2, 1, 0].map((weeksAgo) => {
    const start = weekStart(new Date(), weeksAgo);
    const inWeek = sessions.filter((s) => isInWeek(s.performed_on, start));
    const byDiscipline = (["gym", "swim", "run", "bike"] as Discipline[]).map((discipline) => ({
      discipline,
      points: inWeek.filter((s) => s.discipline === discipline).reduce((sum, s) => sum + loadPoints(s), 0),
    }));
    const date = fromIsoDate(start);
    return {
      label: `${date.getDate()}.${date.getMonth() + 1}`,
      total: byDiscipline.reduce((sum, row) => sum + row.points, 0),
      byDiscipline,
    };
  });
  const max = Math.max(1, ...weeks.map((week) => week.total));

  const swims = sessions.filter((s) => s.discipline === "swim");
  const totalKm = swims.reduce((sum, s) => sum + (s.distance_m ?? 0), 0) / 1000;
  const paces = swims
    .filter((s) => (s.distance_m ?? 0) > 0 && (s.duration_s ?? 0) > 0)
    .map((s) => (s.duration_s ?? 0) / ((s.distance_m ?? 1) / 100));
  const bestPace = paces.length ? Math.min(...paces) : null;
  const underwater = swims.reduce((sum, s) => sum + (s.underwater_m ?? 0), 0);
  const gymSessions = sessions.filter((s: LoadRow) => s.discipline === "gym");

  return (
    <div className="px-4 pt-5 pb-4">
      <div className="section-label mb-2.5">{t.trends.loadPerWeek}</div>
      <div className="rounded-[16px] bg-panel px-3.5 py-4">
        <div className="flex h-[160px] items-end gap-2.5">
          {weeks.map((week) => (
            <div key={week.label} className="flex-1 text-center">
              <div className="mb-1.5 text-[10px] text-dim">{week.total ? week.total.toFixed(1) : ""}</div>
              <div className="flex h-[120px] flex-col justify-end">
                {week.byDiscipline
                  .filter((row) => row.points > 0)
                  .map((row, index) => (
                    <div
                      key={row.discipline}
                      className={`${BAR_COLOURS[row.discipline]} ${index === 0 ? "rounded-t-[4px]" : ""}`}
                      style={{ height: (row.points / max) * CHART_HEIGHT }}
                    />
                  ))}
              </div>
              <div className="mt-1.5 text-[10px] text-dim">{week.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-3.5 flex flex-wrap gap-3 text-[11px] text-dim">
          <span className="text-green">■ {t.disciplines.gym}</span>
          <span className="text-blue">■ {t.disciplines.swim}</span>
          <span className="text-blue/65">■ {t.disciplines.run}</span>
          <span className="text-blue/35">■ {t.disciplines.bike}</span>
        </div>
      </div>

      {swims.length > 0 && (
        <>
          <div className="section-label mt-6 mb-2.5">{t.trends.water}</div>
          <div className="mb-2 flex gap-2">
            <Tile value={totalKm.toFixed(1)} label={t.trends.totalKm} />
            <Tile
              value={bestPace ? (pacePer100m(100, bestPace) ?? "—") : "—"}
              label={t.trends.bestPace}
            />
          </div>
          <div className="mb-2 flex gap-2">
            <Tile value={underwater} label={t.trends.underwater} />
            <Tile
              value={`${checklistRate(gymSessions, "warmup")}/${checklistRate(gymSessions, "stretch")}`}
              label={t.trends.warmupStretch}
              tone={checklistRate(gymSessions, "stretch") >= 70 ? "text-green" : "text-yellow"}
            />
          </div>
        </>
      )}

      <div className="section-label mt-6 mb-2.5">{t.trends.records}</div>
      <div className="rounded-[14px] bg-panel px-1 py-1">
        {records?.length === 0 && <p className="p-4 text-[13px] text-dim">{t.trends.noRecords}</p>}
        {records?.map((record) => (
          <div key={record.name} className="flex items-center justify-between border-b border-line p-3 last:border-b-0">
            <div>
              <div className="text-[13px]">{record.name}</div>
              <div className="mt-0.5 text-[10px] text-dim">
                {t.trends.sessionsCount(record.sessions)} · {t.trends.bestVolume(Math.round(record.bestVolume))}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[12px]">🏆</span>
              <span className="font-head text-[22px] font-bold text-gold">
                {record.maxWeight}
                <span className="text-[12px]">kg</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
