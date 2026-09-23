/**
 * Reads the CSV exported by the previous single-user app
 * (docs/reference/trening.html) and by this app's own export.
 *
 * Both are semicolon separated with one row per set, but the column list grew,
 * so rows are read by column name from the header instead of by position.
 * Gym rows repeat the session data on every set and are grouped back together.
 */

export type ImportedSet = { reps: number; weightKg: number | null };

export type ImportedExercise = { name: string; sets: ImportedSet[] };

export type ImportedSession =
  | {
      discipline: "gym";
      performedOn: string;
      dayLabel: string;
      warmupDone: boolean;
      stretchDone: boolean;
      exercises: ImportedExercise[];
    }
  | {
      discipline: "swim" | "run" | "bike";
      performedOn: string;
      distanceM: number;
      durationS: number;
      underwaterM: number | null;
      style: string | null;
      sessionType: string | null;
      notes: string | null;
    };

export type ParseResult = {
  sessions: ImportedSession[];
  /** rows the parser could not use, with the reason */
  problems: string[];
};

/** "woda" is what the old app called swimming. */
const DISCIPLINES: Record<string, "gym" | "swim" | "run" | "bike"> = {
  silownia: "gym",
  woda: "swim",
  plywanie: "swim",
  bieganie: "run",
  rower: "bike",
};

const number = (value: string | undefined): number | null => {
  if (!value || value.trim() === "") return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export function parseOldAppCsv(text: string): ParseResult {
  const problems: string[] = [];
  // The export starts with a byte order mark so Excel reads it correctly.
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) return { sessions: [], problems: ["Plik jest pusty."] };

  const header = lines[0]!.toLowerCase().split(";").map((name) => name.trim());
  if (header[0] !== "data" || header[1] !== "typ") {
    return { sessions: [], problems: ["To nie wygląda na eksport z aplikacji Trening."] };
  }
  const columns = new Map(header.map((name, index) => [name, index]));
  const cellOf = (cells: string[], name: string) => {
    const index = columns.get(name);
    return index === undefined ? undefined : cells[index];
  };

  const gymByKey = new Map<string, Extract<ImportedSession, { discipline: "gym" }>>();
  const endurance: ImportedSession[] = [];

  for (const [index, line] of lines.slice(1).entries()) {
    const cells = line.split(";");
    const rowNumber = index + 2;
    const date = cellOf(cells, "data") ?? "";
    const kind = (cellOf(cells, "typ") ?? "").trim().toLowerCase();
    const discipline = DISCIPLINES[kind];

    if (!isIsoDate(date)) {
      problems.push(`Wiersz ${rowNumber}: zła data.`);
      continue;
    }
    if (!discipline) {
      problems.push(`Wiersz ${rowNumber}: nieznany typ „${kind}”.`);
      continue;
    }

    if (discipline === "gym") {
      const exerciseName = cellOf(cells, "cwiczenie");
      const repetitions = number(cellOf(cells, "powtorzenia"));
      const dayLabel = cellOf(cells, "dzien");
      const key = `${date}|${dayLabel ?? ""}`;
      const session =
        gymByKey.get(key) ??
        ({
          discipline: "gym",
          performedOn: date,
          dayLabel: dayLabel || "Siłownia",
          warmupDone: cellOf(cells, "rozgrzewka") === "1",
          stretchDone: cellOf(cells, "rozciaganie") === "1",
          exercises: [],
        } as Extract<ImportedSession, { discipline: "gym" }>);
      gymByKey.set(key, session);

      if (!exerciseName) {
        problems.push(`Wiersz ${rowNumber}: brak nazwy ćwiczenia.`);
        continue;
      }
      // A row without repetitions is a skipped exercise: keep the session, drop the row.
      if (repetitions === null) continue;

      const exercise =
        session.exercises.find((e) => e.name === exerciseName) ??
        ({ name: exerciseName, sets: [] } as ImportedExercise);
      if (!session.exercises.includes(exercise)) session.exercises.push(exercise);
      const weight = number(cellOf(cells, "kg"));
      exercise.sets.push({ reps: repetitions, weightKg: weight && weight > 0 ? weight : null });
      continue;
    }

    const distanceM = number(cellOf(cells, "dystans_m"));
    const durationMin = number(cellOf(cells, "czas_min"));
    if (!distanceM || !durationMin) {
      problems.push(`Wiersz ${rowNumber}: brak dystansu lub czasu.`);
      continue;
    }
    const notes = cellOf(cells, "notatki")?.trim();
    endurance.push({
      discipline,
      performedOn: date,
      distanceM: Math.round(distanceM),
      durationS: Math.round(durationMin * 60),
      underwaterM: number(cellOf(cells, "pod_woda_m")),
      style: cellOf(cells, "styl") || null,
      sessionType: cellOf(cells, "charakter") || null,
      notes: notes ? notes : null,
    });
  }

  // Gym sessions where every exercise was skipped carry no training data.
  const gymSessions = [...gymByKey.values()].filter((session) => session.exercises.length > 0);
  const sessions = [...gymSessions, ...endurance].sort((a, b) =>
    a.performedOn.localeCompare(b.performedOn),
  );
  return { sessions, problems };
}

/** Key used to skip sessions that are already in the app. */
export const importKey = (session: ImportedSession) =>
  session.discipline === "gym"
    ? `gym|${session.performedOn}|${session.dayLabel}`
    : `${session.discipline}|${session.performedOn}|${session.distanceM}`;
