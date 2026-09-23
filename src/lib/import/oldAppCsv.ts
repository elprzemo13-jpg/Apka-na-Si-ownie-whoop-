/**
 * Reads the CSV exported by the single-user app (docs/reference/trening.html).
 *
 * Its format: semicolon separated, one row per set, with this header:
 * data;typ;dzien;cwiczenie;seria;powtorzenia;kg;dystans_m;czas_min;tempo_100m;
 * pod_woda_m;styl;charakter;rozgrzewka;rozciaganie;notatki
 *
 * Gym rows repeat the session data on every set, so rows are grouped back into
 * sessions by date and training day.
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
      discipline: "swim";
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

const HEADER_START = "data;typ";

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
  if (!lines[0]!.toLowerCase().startsWith(HEADER_START)) {
    return { sessions: [], problems: ["To nie wygląda na eksport ze starej aplikacji."] };
  }

  const gymByKey = new Map<string, Extract<ImportedSession, { discipline: "gym" }>>();
  const swims: ImportedSession[] = [];

  for (const [index, line] of lines.slice(1).entries()) {
    const cells = line.split(";");
    const [date, kind, dayLabel, exerciseName, , reps, kg, distance, minutes, , underwater, style, character, warmup, stretch, notes] =
      cells;
    const rowNumber = index + 2;

    if (!date || !isIsoDate(date)) {
      problems.push(`Wiersz ${rowNumber}: zła data.`);
      continue;
    }

    if (kind === "silownia") {
      const repetitions = number(reps);
      if (!exerciseName || repetitions === null) {
        problems.push(`Wiersz ${rowNumber}: brak ćwiczenia lub powtórzeń.`);
        continue;
      }
      const key = `${date}|${dayLabel ?? ""}`;
      const session =
        gymByKey.get(key) ??
        ({
          discipline: "gym",
          performedOn: date,
          dayLabel: dayLabel || "Siłownia",
          warmupDone: warmup === "1",
          stretchDone: stretch === "1",
          exercises: [],
        } as Extract<ImportedSession, { discipline: "gym" }>);
      gymByKey.set(key, session);

      const exercise =
        session.exercises.find((e) => e.name === exerciseName) ??
        ({ name: exerciseName, sets: [] } as ImportedExercise);
      if (!session.exercises.includes(exercise)) session.exercises.push(exercise);
      const weight = number(kg);
      exercise.sets.push({ reps: repetitions, weightKg: weight && weight > 0 ? weight : null });
    } else if (kind === "woda") {
      const distanceM = number(distance);
      const durationMin = number(minutes);
      if (!distanceM || !durationMin) {
        problems.push(`Wiersz ${rowNumber}: brak dystansu lub czasu.`);
        continue;
      }
      swims.push({
        discipline: "swim",
        performedOn: date,
        distanceM: Math.round(distanceM),
        durationS: Math.round(durationMin * 60),
        underwaterM: number(underwater),
        style: style || null,
        sessionType: character || null,
        notes: notes?.trim() ? notes.trim() : null,
      });
    } else {
      problems.push(`Wiersz ${rowNumber}: nieznany typ „${kind ?? ""}”.`);
    }
  }

  const sessions = [...gymByKey.values(), ...swims].sort((a, b) =>
    a.performedOn.localeCompare(b.performedOn),
  );
  return { sessions, problems };
}

/** Key used to skip sessions that are already in the app. */
export const importKey = (session: ImportedSession) =>
  session.discipline === "gym"
    ? `gym|${session.performedOn}|${session.dayLabel}`
    : `swim|${session.performedOn}|${session.distanceM}`;
