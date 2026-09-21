# Trening

Tracker treningowy dla osób trenujących kilka dyscyplin naraz — siłownia, pływanie, bieganie, rower — z łącznym wskaźnikiem obciążenia.

Dokumentacja produktu: [`docs/`](docs/) — zacznij od [`docs/PLAN.md`](docs/PLAN.md) (zaakceptowany plan, etapy E0–E8).

## Uruchomienie lokalne

Wymagany Node.js 22.22+ (Netlify buduje na 24).

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # testy wskaźników + migracji i RLS (PGlite, bez Dockera)
npm run build      # wersja produkcyjna do dist/
```

Zmienne środowiskowe: skopiuj `.env.example` do `.env.local` i uzupełnij z panelu Supabase (Project Settings → API). Pliku `.env.local` nie commituj.

## Baza danych

Migracje w [`supabase/migrations/`](supabase/migrations/). Testy w [`supabase/tests/`](supabase/tests/) uruchamiają je na PGlite (Postgres w procesie Node) z atrapą schematu `auth` z Supabase, więc `npm test` sprawdza schemat, triggery obciążenia i RLS bez połączenia z chmurą.

Wgranie migracji do projektu Supabase: SQL Editor w panelu → wklej pliki w kolejności nazw, albo Supabase CLI (`supabase db push`).

## Hosting

Netlify, konfiguracja w [`netlify.toml`](netlify.toml) (build `npm run build`, katalog `dist`, przekierowanie SPA).

## Granice darmowych planów

| Usługa | Limit | Co się stanie | Co kupić przy wzroście |
|---|---|---|---|
| Supabase Free | projekt usypiany po 7 dniach bez aktywności | pierwsze wejście po przerwie nie połączy się z bazą, trzeba wybudzić projekt w panelu; treningi zapisane offline czekają w kolejce | Supabase Pro |
| Supabase Free | 500 MB bazy, 50 000 aktywnych użytkowników / mies. | przy kilku użytkownikach bez znaczenia | Supabase Pro |
| Supabase Auth | wbudowany serwer maili wysyła tylko do członków zespołu projektu | bez własnego SMTP rejestracja i reset hasła nie działają | — (używamy Brevo) |
| Brevo Free | 300 maili / dzień, nadawca bez domeny | maile mogą trafiać do spamu | własna domena + Resend / Brevo z uwierzytelnioną domeną |
| Netlify Free | adres `*.netlify.app`, limit transferu | brak własnej domeny | domena (~50 zł / rok) |
