# Trening

Tracker treningowy dla osób trenujących kilka dyscyplin naraz — siłownia, pływanie, bieganie, rower — z jednym wskaźnikiem obciążenia ze wszystkich razem.

**Na żywo:** https://si-apownia.netlify.app

Dokumentacja produktu w [`docs/`](docs/): zacznij od [`BRIEF.md`](docs/BRIEF.md) (co budujemy) i [`PLAN.md`](docs/PLAN.md) (zaakceptowany plan i rozstrzygnięcia). Stara, jednoosobowa wersja aplikacji leży w [`docs/reference/trening.html`](docs/reference/trening.html) i jest źródłem wzorów oraz zachowań.

## Co apka potrafi

- **Plan własny**: dni treningowe, ćwiczenia z zakresem powtórzeń, tryby obciążenia i progresji, przerwy, checklisty rozgrzewki i rozciągania, cele tygodniowe.
- **Trening siłowy**: sugestia ciężaru z ostatniego treningu, propozycja podbicia po wykonaniu pełnego zakresu, rekordy osobiste, kopiowanie pierwszej serii, pomijanie ćwiczeń, timer przerw.
- **Pływanie, bieganie, rower**: proste logowanie z tempem albo prędkością liczoną na żywo.
- **Wskaźniki**: realizacja tygodnia, obciążenie względem średniej z trzech poprzednich tygodni, regularność 14 dni, odsetek rozgrzewki i rozciągania.
- **Offline**: apka instaluje się na telefonie i działa bez zasięgu; zapisy czekają w kolejce i same się wysyłają.
- **Znajomi**: zaproszenia, trzy poziomy prywatności, ranking tygodniowy i podgląd aktywności.
- **Twoje dane**: eksport CSV i import tego samego pliku z powrotem.

## Uruchomienie lokalne

Wymagany Node.js 22.22+ (Netlify buduje na 24).

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # wskaźniki, synchronizacja, migracje i RLS (PGlite, bez Dockera)
npm run build      # wersja produkcyjna do dist/
```

Zmienne środowiskowe: skopiuj `.env.example` do `.env.local` i uzupełnij z panelu Supabase. Pliku `.env.local` nie commituj.

## Struktura

```
src/lib/metrics    wzory wskaźników, sugestii i rekordów (z testami)
src/lib/data       lokalna baza, kolejka wysyłek, synchronizacja
src/lib/import     wczytywanie CSV
src/lib/export     eksport CSV
src/routes         ekrany
supabase/migrations  schemat, RLS, funkcje społecznościowe
supabase/tests     testy SQL uruchamiane na PGlite
docs/              dokumentacja produktu
```

Zasada: ekrany nie rozmawiają z Supabase bezpośrednio. Piszą do lokalnej bazy, a `sync.ts` wysyła zmiany w tle. Wyjątkiem są znajomi, bo cudzych danych nie trzymamy lokalnie.

## Baza danych

Migracje w [`supabase/migrations/`](supabase/migrations/), wgrywane ręcznie przez SQL Editor — stan zapisany w [`docs/supabase-setup.md`](docs/supabase-setup.md). `npm test` uruchamia je na PGlite (Postgres w procesie Node) razem z testami RLS, więc zabezpieczenia są sprawdzane bez połączenia z chmurą.

## PWA

Instalacja: Chrome → menu → „Zainstaluj aplikację”; iPhone → Safari → Udostępnij → „Do ekranu początkowego”.

Nowa wersja nie przeładowuje się sama. Pojawia się pasek „Jest nowa wersja aplikacji” z przyciskiem „Odśwież”, żeby aktualizacja nigdy nie wypadła w środku serii.

## Format CSV

Średnik jako separator, BOM na początku, jeden wiersz na serię. Kolumny: `data, typ, dzien, cwiczenie, seria, powtorzenia, kg, wysokosc_cm, dystans_m, czas_min, tempo_100m, tempo_km, predkosc_kmh, pod_woda_m, styl, charakter, rozgrzewka, rozciaganie, notatki`.

Plik eksportu można wczytać z powrotem (Konto → Import), więc służy też jako kopia zapasowa. Import pomija treningi, które już są, więc da się go powtórzyć.

## Granice darmowych planów

| Usługa | Limit | Co się stanie | Co kupić przy wzroście |
|---|---|---|---|
| Supabase Free | projekt usypiany po 7 dniach bez aktywności | pierwsze wejście po przerwie nie połączy się z bazą, trzeba wybudzić projekt w panelu; treningi zapisane offline czekają w kolejce | Supabase Pro |
| Supabase Free | 500 MB bazy, 50 000 aktywnych użytkowników / mies. | przy kilku osobach bez znaczenia | Supabase Pro |
| Brevo Free | 300 maili dziennie, nadawca bez własnej domeny | część maili trafia do spamu; klucz SMTP wygasa po 90 dniach bez użycia | domena (~50 zł / rok) i jej uwierzytelnienie |
| Netlify Free | adres `*.netlify.app`, limit transferu | brak własnej domeny | domena |

## Czego jeszcze nie ma

- edycji zapisanego treningu siłowego (można go obejrzeć i usunąć);
- trybu trenerskiego — schemat bazy jest na niego przygotowany, opis w [`docs/ROADMAP.md`](docs/ROADMAP.md);
- integracji z zegarkami, powiadomień push i wersji angielskiej (teksty są w jednym słowniku, więc tłumaczenie nie wymaga przepisywania ekranów).
