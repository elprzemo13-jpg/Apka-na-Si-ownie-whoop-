# PLAN.md — zaakceptowany plan wdrożenia

Zaakceptowany przez właściciela 2026-09-21, łącznie z rekomendacjami P1–P15.
Zmiana czegokolwiek poniżej wymaga ponownej zgody.

---

## 1. Stack

| Warstwa | Wybór |
|---|---|
| Framework | Vite + React + TypeScript + React Router (SPA, bez serwera) |
| Baza + auth | Supabase (Postgres, email+hasło, RLS) |
| Style | Tailwind CSS, tokeny z `DESIGN.md` |
| Dane lokalne | Dexie (IndexedDB) — lokalna kopia + kolejka wysyłek |
| PWA | vite-plugin-pwa (Workbox) |
| Hosting | Netlify (statyczny) |
| Testy | Vitest (wskaźniki), testy RLS w SQL |
| Maile auth | Brevo SMTP (bez domeny na start) |
| Teksty UI | słownik `src/lib/i18n/pl.ts` od pierwszego dnia |

Punkty obciążenia liczy trigger w bazie (źródło prawdy dla rankingu); lustrzany wzór w TS służy do natychmiastowego/offline wyświetlania. Wspólne fixtury testowe pilnują zgodności.

Zasada: ekrany nigdy nie wołają Supabase bezpośrednio — tylko `repo.ts` (lokalnie), a `sync.ts` synchronizuje w tle.

---

## 2. Schemat bazy

Wszystkie synchronizowane tabele: `id uuid` generowane na urządzeniu, `created_at` (czas urządzenia), `updated_at`, `deleted_at` (soft delete).

- `profiles` — `id`=auth.users.id, `username` unikalny, `display_name`, `invite_code` unikalny, `sharing_level` (`none|basic|full`, domyślnie `none`), `timezone`
- `weekly_goals` — (`user_id`, `discipline`) PK, `target_sessions`
- enum `discipline` — `gym|swim|run|bike`
- `exercises` — `user_id`, `name`, `load_type` (`weighted|bodyweight|none`), `progression` (`weight|fixed|height|time`), `weight_step_kg` (domyślnie 2,5)
- `plans` — `owner_id`, `author_id` (osobno — pod tryb trenerski), `name`, `schedule_mode` (`weekly|rotation`), `is_active`
- `plan_days` — `plan_id`, `name`, `position`, `weekdays smallint[]`, `default_rest_s`
- `plan_exercises` — `plan_day_id`, `exercise_id`, `position`, `annotation`, `target_sets`, `rep_min`, `rep_max`, `rep_unit` (`reps|seconds`), `per_side`, `rest_s` (null → przerwa dnia)
- `plan_checklist_items` — `plan_id`, `plan_day_id` (null = cały plan), `kind` (`warmup|stretch`), `label`, `detail`, `position`
- `sessions` — `user_id`, `discipline`, `performed_on date` (lokalna), `plan_day_id`, `day_label_snapshot`, `distance_m`, `duration_s`, `session_type`, `swim_style`, `underwater_m`, `height_cm`?, `notes`, `warmup_done`, `stretch_done`, `load_points` (trigger); CHECK per dyscyplina
- `session_checklist_items` — `session_id`, `kind`, `label`, `done`
- `session_exercises` — `session_id`, `exercise_id`, `position`, `name_snapshot`, `skipped`, snapshot celu
- `session_sets` — `session_exercise_id`, `set_no`, `reps` (lub sekundy), `weight_kg` (lub cm w trybie wysokości), `is_extra`
- widok `exercise_records` — max ciężar w serii, max objętość w treningu
- `relationships` — `requester_id`, `addressee_id`, `type` (`friend|coach`), `status` (`pending|accepted|declined|blocked`)

RLS:
- własne dane: `user_id = auth.uid()`; plany: odczyt dla `owner_id` lub `author_id`, zapis właściciel
- `access_level(viewer, target)` → `none|basic|full` — jedyne miejsce logiki dostępu (tryb trenerski dopisze warunek)
- poziom `full`: SELECT na treningach znajomego
- poziom `basic`: tylko RPC `friend_feed()` i `weekly_leaderboard(week)` (security definer, ograniczone kolumny)
- wyszukiwanie po nazwie / kodzie tylko przez RPC

---

## 3. Struktura

```
src/routes/{auth,onboarding,today,plan,workout,log,friends,trends,settings}
src/components/{ui,workout,plan}
src/lib/metrics (+ __fixtures__ z zachowaniem trening.html)
src/lib/data/{local,repo,sync}.ts
src/lib/{supabase,csv}.ts, src/lib/i18n/pl.ts
supabase/{migrations,seed.sql,tests}
docs/ — BRIEF, DECISIONS, DESIGN, ROADMAP, PLAN, reference/
```

---

## 4. Etapy

| # | Etap | Działa po etapie |
|---|---|---|
| E0 | Szkielet, Tailwind + tokeny, nawigacja, migracje, deploy Netlify | pusta apka pod adresem |
| E1 | Auth: rejestracja, potwierdzenie, logowanie, reset, username, SMTP | konta |
| E2 | Warstwa danych (Dexie/repo/sync) + edytor planu + cele | budowa planu, także offline |
| E3 | Formularz siłowni + sugestie + rekordy + timer | pełny trening siłowy |
| E4 | Pływanie/bieg/rower + Log (data, edycja, usuwanie) | wszystkie dyscypliny |
| — | (import starych danych z CSV, jednorazowy skrypt) | historia dla obciążenia |
| E5 | Wskaźniki, ekran Dziś, pusty stan, Trendy | pierwszy ekran |
| E6 | (PWA i offline przeniesione przed E3 na prośbę właściciela 2026-09-22) — zostaje utwardzenie i testy na telefonie | tryb samolotowy |
| E7 | Znajomi, prywatność, feed, ranking | społeczność |
| E8 | CSV, README z limitami, poprawki | wersja do ludzi |

---

## 5. Rozstrzygnięcia (P1–P15)

1. Mnożniki: pływanie 1,2 · **bieg 0,5 · rower 0,12**
2. Ranking: realizacja łącznie; obciążenie (punkty) osobno per dyscyplina; bez rankingu obciążenia%
3. Poziom podstawowy: fakt + dyscyplina, bez liczb; w rankingu realizacji jako procent
4. Małe pierścienie: **Obciążenie, Regularność, Rozgrzewka, Rozciąganie**; metry pod wodą → Trendy
5. Obciążenie bez historii: 100% + komunikat o zbieraniu danych
6. Rozciąganie/rozgrzewka %: od początku historii (jak w trening.html)
7. Vite SPA + Netlify
8. Brevo SMTP bez domeny na start
9. Projekt w `C:\Users\PC\APKA na siłownie`, git; nazwa robocza „Trening”
10. Data treningu wybieralna (domyślnie dziś) + edycja w Logu
11. Tryb „wysokość”: pole „cm” zamiast kg, bez sugestii
12. Import starych danych: jednorazowy skrypt z CSV do konta właściciela
13. Rower: spokojnie / interwały / tempo / długa; pływanie: listy z trening.html
14. Konflikty: nowe wpisy bez konfliktu (UUID); edycje — wygrywa późniejszy czas edycji na urządzeniu
15. Offline: zapis/edycja treningów + podgląd; edycja planu wymaga sieci

## 6. Zachowania przeniesione z trening.html (referencja: `docs/reference/trening.html`)

- Realizacja: `Σ min(sesje_d, cel_d) / Σ cel_d × 100`, zaokrąglone
- Obciążenie: średnia z 3 poprzednich tygodni kalendarzowych, puste pominięte; kolory >145 czerwony, >115 lub <60 żółty, reszta zielony; pozostałe pierścienie ≥70 zielony, ≥40 żółty
- Regularność: unikalne dni z treningiem w ostatnich 14 (z dziś) / 14
- Rozciąganie/rozgrzewka zaliczone tylko przy wszystkich pozycjach odhaczonych
- Sugestia: ostatni trening z ćwiczeniem, max kg > 0; ↑ gdy serii ≥ plan i każda ≥ górny zakres; skok per ćwiczenie; tylko `progression = weight`
- Dziś w planie: dzień tygodnia; w dzień wolny / rotacja — dzień po ostatnio zrobionym
- Zapis siłowni: min. jedna seria z powtórzeniami; puste serie odrzucane; pusty kg = 0; pominięte ćwiczenie zapisane jako `skipped`
- Timer: presety 45/60/90/120/150, kolory niebieski/żółty (≤10 s)/zielony, beep 880 Hz; liczony ze znaczników czasu
- CSV: średnik, BOM, wiersz na serię
