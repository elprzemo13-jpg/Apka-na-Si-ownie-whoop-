import { pacePer100m, pacePerKm, speedKmh } from "../metrics/format";
import type { Discipline } from "../data/types";

/**
 * CSV export in the format of the previous app (semicolon separated, one row
 * per set, byte order mark so Excel opens it correctly), extended with the
 * disciplines that app did not have. The file can be read back by the import
 * on the account screen, which makes it a backup as well as an export.
 */

export const CSV_COLUMNS = [
  "data",
  "typ",
  "dzien",
  "cwiczenie",
  "seria",
  "powtorzenia",
  "kg",
  "wysokosc_cm",
  "dystans_m",
  "czas_min",
  "tempo_100m",
  "tempo_km",
  "predkosc_kmh",
  "pod_woda_m",
  "styl",
  "charakter",
  "rozgrzewka",
  "rozciaganie",
  "notatki",
] as const;

export const DISCIPLINE_LABEL: Record<Discipline, string> = {
  gym: "silownia",
  swim: "plywanie",
  run: "bieganie",
  bike: "rower",
};

export type ExportSet = { reps: number; weight_kg: number | null; height_cm: number | null };

export type ExportExercise = { name: string; skipped: boolean; sets: ExportSet[] };

export type ExportSession = {
  performed_on: string;
  discipline: Discipline;
  day_label: string | null;
  distance_m: number | null;
  duration_s: number | null;
  session_type: string | null;
  swim_style: string | null;
  underwater_m: number | null;
  notes: string | null;
  warmup_done: boolean;
  stretch_done: boolean;
  exercises: ExportExercise[];
};

/** Semicolons and line breaks inside text would break the row. */
const clean = (value: string | null | undefined) =>
  (value ?? "")
    .replace(/[;\r\n]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const minutes = (durationS: number | null) => (durationS ? String(Math.round(durationS / 60)) : "");

export function buildCsv(sessions: ExportSession[]): string {
  const rows: string[] = [CSV_COLUMNS.join(";")];

  // Oldest first, like a training diary read from the top.
  const ordered = [...sessions].sort((a, b) => a.performed_on.localeCompare(b.performed_on));

  for (const session of ordered) {
    const flags = [session.warmup_done ? "1" : "0", session.stretch_done ? "1" : "0"];

    if (session.discipline === "gym") {
      for (const exercise of session.exercises) {
        // A skipped exercise has no sets; it is still worth one row of history.
        const sets: (ExportSet | null)[] = exercise.sets.length ? exercise.sets : [null];
        for (const [index, set] of sets.entries()) {
          rows.push(
            [
              session.performed_on,
              DISCIPLINE_LABEL.gym,
              clean(session.day_label),
              clean(exercise.name),
              set ? index + 1 : "",
              set ? set.reps : "",
              set?.weight_kg ?? "",
              set?.height_cm ?? "",
              "",
              "",
              "",
              "",
              "",
              "",
              "",
              exercise.skipped ? "pominiete" : "",
              ...flags,
              "",
            ].join(";"),
          );
        }
      }
      continue;
    }

    const distance = session.distance_m ?? 0;
    const duration = session.duration_s ?? 0;
    rows.push(
      [
        session.performed_on,
        DISCIPLINE_LABEL[session.discipline],
        "",
        "",
        "",
        "",
        "",
        "",
        distance || "",
        minutes(session.duration_s),
        session.discipline === "swim" ? (pacePer100m(distance, duration) ?? "") : "",
        session.discipline === "run" ? (pacePerKm(distance, duration) ?? "") : "",
        session.discipline === "bike" ? (speedKmh(distance, duration) ?? "") : "",
        session.underwater_m ?? "",
        clean(session.swim_style),
        clean(session.session_type),
        "",
        "",
        clean(session.notes),
      ].join(";"),
    );
  }

  return `﻿${rows.join("\n")}`;
}

export const csvFileName = (today: string) => `treningi-${today}.csv`;
