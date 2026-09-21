# BRIEF.md — Tracker treningowy (wersja webowa, wielodostępna)

> **Dla Claude Code.** Przeczytaj cały ten plik oraz `DECISIONS.md` i `DESIGN.md` przed napisaniem jednej linii kodu.
> Tryb pracy: **najpierw plan, potem akceptacja właściciela, dopiero potem implementacja.** Szczegóły w sekcji „Jak masz pracować" na końcu.

---

## 1. Kontekst

Istnieje działająca aplikacja: jeden plik HTML, czysty JavaScript, dane w `localStorage`, hostowana na Netlify. Używa jej jedna osoba (właściciel — pływak i instruktor pływania). Plik referencyjny: **`trening.html`** w tym repozytorium.

**Zadanie:** przenieść to na prawdziwą aplikację webową z kontami użytkowników i bazą w chmurze, rozszerzoną o kolejne dyscypliny i część społecznościową.

Obecna apka nie jest do wyrzucenia — jest **specyfikacją tego, co ma działać**. Logika wskaźników, struktura treningu i zachowanie formularzy mają zostać przeniesione, nie wymyślone od nowa. Czytaj ją jak dokumentację.

---

## 2. Cel produktu

Tracker treningowy dla osób trenujących **więcej niż jedną dyscyplinę naraz** — typowo sport główny plus siłownia jako wsparcie. Rynek jest pełen apek do samej siłowni i osobnych do biegania; brakuje takiej, która pokazuje **łączne obciążenie ze wszystkich dyscyplin** i ostrzega, gdy rośnie za szybko.

To jest główna różnica względem konkurencji i ma być widoczna na pierwszym ekranie.

---

## 3. Zakres pierwszej wersji (MVP)

### Dyscypliny
1. **Siłownia** — pełna obsługa: plan, ćwiczenia, serie, powtórzenia, ciężar, rekordy, progresja, timer przerw
2. **Pływanie** — dystans, czas, tempo /100 m, styl, charakter treningu, metry pod wodą, notatka
3. **Bieganie** — dystans, czas, tempo /km, typ (spokojne / interwały / tempo / długie), notatka
4. **Rower** — dystans, czas, średnia prędkość, typ, notatka

Tylko siłownia jest rozbudowana. Reszta to **proste logowanie** — to celowa decyzja, nie brak czasu. Nie rozbudowuj dyscyplin wytrzymałościowych bez wyraźnej prośby.

### Konta i dane
- Rejestracja otwarta dla każdego, email + hasło
- Każdy użytkownik widzi wyłącznie swoje dane (poza tym, co świadomie udostępni znajomym)
- Dane w bazie w chmurze, dostępne z każdego urządzenia po zalogowaniu

### Plany treningowe
Każdy użytkownik **buduje własny plan od zera**. Nie ma gotowych szablonów ani planu narzuconego przez aplikację.

Plan to:
- dowolna liczba **dni treningowych** (np. „D1 Nogi", „Push A")
- w każdym dniu lista ćwiczeń z docelową liczbą serii i zakresem powtórzeń
- przypisanie dni do dni tygodnia (opcjonalne — plan może być rotacyjny zamiast tygodniowego)
- własna lista pozycji rozciągania dla każdego dnia

### Rozgrzewka i rozciąganie
Są **częścią treningu**, nie dodatkiem. W formularzu treningu siłowego: checklista rozgrzewki na górze, checklista rozciągania na dole, obie odhaczane. Aplikacja liczy odsetek treningów z odhaczonym rozciąganiem i pokazuje go jako wskaźnik.

To wyróżnik produktu — większość apek to ignoruje. Nie upraszczaj tego.

### Część społecznościowa
- Dodawanie znajomych (po nazwie użytkownika lub kodzie zaproszenia)
- Podgląd aktywności znajomych: jakie treningi zrobili, jaka objętość, jaka realizacja tygodnia
- Ranking tygodniowy wśród znajomych — po realizacji planu i po obciążeniu
- Użytkownik kontroluje, co udostępnia: wszystko / tylko fakt treningu / nic

Prywatność jest domyślna. Nowe konto nie udostępnia nic, dopóki użytkownik tego nie włączy.

---

## 4. Wskaźniki — przenieś dokładnie

Wzory pochodzą z działającej apki. Nie zmieniaj ich bez uzgodnienia.

### Punkty obciążenia
```
siłownia:        suma(powtórzenia × kg) / 1000
pływanie:        (dystans_m / 1000) × 1,2
bieganie:        (dystans_m / 1000) × 1,0
rower:           (dystans_m / 1000) × 0,4
```
Mnożniki dla biegania i roweru są **nowe i wymagają zatwierdzenia** — zaproponuj je w planie i uzasadnij.

### Realizacja tygodnia
```
(min(zrobione_typu_A, cel_A) + min(zrobione_typu_B, cel_B) + ...) / suma_celów × 100%
```
Cele tygodniowe ustawia użytkownik per dyscyplina. Tydzień liczony od poniedziałku.

### Obciążenie (najważniejszy wskaźnik)
```
obciążenie% = punkty_tego_tygodnia / średnia_z_3_poprzednich_tygodni × 100
```
Progi kolorów:
| Zakres | Kolor | Komunikat |
|---|---|---|
| 60–115% | zielony | w normie |
| 115–145% | żółty | powyżej normy, pilnuj snu |
| > 145% | czerwony | rozważ odjęcie sesji |
| < 60% | żółty | jest miejsce na więcej |

Tygodnie bez danych są wyłączone ze średniej. Gdy brak historii — pokaż 100% i komunikat o zbieraniu danych.

### Regularność 14 dni
Ile z ostatnich 14 dni miało jakikolwiek trening, w procentach.

### Sugestia ciężaru i progresja
Przy każdym ćwiczeniu pokaż ciężar z ostatniego treningu. Jeśli użytkownik wykonał **wszystkie serie w górnym zakresie powtórzeń**, zaproponuj ciężar wyższy o skok progresji.

Skok progresji ma być **konfigurowalny per ćwiczenie** (domyślnie 2,5 kg). Powód: przy hantlach najmniejszy realny skok to często 4–5 kg, bo dokłada się po parze.

Niektóre ćwiczenia **nie progresują ciężarem**:
- ćwiczenia prewencyjne (rotacje, face pull) — zostają lekkie na stałe
- ćwiczenia plyometryczne (wyskoki) — progresują wysokością, nie ciężarem
- izometryczne (plank, hollow hold) — progresują czasem

Użytkownik musi móc oznaczyć ćwiczenie jednym z tych trybów.

### Rekordy osobiste
Per ćwiczenie: najwyższy ciężar i najlepsza objętość w jednym treningu.

---

## 5. Stack — propozycja do zatwierdzenia

Warunek brzegowy: **zero kosztów utrzymania**. Wszystko na darmowych planach.

| Warstwa | Propozycja | Dlaczego |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | jeden projekt na front i API, dobre wsparcie PWA |
| Baza + auth | **Supabase** | darmowy plan, Postgres, auth email+hasło gotowy, Row Level Security rozwiązuje izolację danych między kontami |
| Style | **Tailwind CSS** | szybkie odwzorowanie obecnego wyglądu |
| Hosting | **Vercel** lub **Netlify** | darmowy plan, deploy z repo |
| PWA | manifest + service worker | ikona na ekranie telefonu, działanie offline |

**Uwaga o darmowym planie Supabase:** projekt jest usypiany po okresie bezczynności. Przy kilku użytkownikach to bez znaczenia, ale zaznacz to w README, żeby nie było zaskoczenia.

Jeśli widzisz lepszy zestaw spełniający warunek zerowego kosztu — zaproponuj w planie z uzasadnieniem. Nie zmieniaj stacku po akceptacji bez pytania.

---

## 6. Offline i PWA

Aplikacja musi działać na siłowni, gdzie często nie ma zasięgu.

- Trening da się zapisać **bez połączenia** — ląduje w kolejce lokalnej
- Po odzyskaniu połączenia dane same się synchronizują
- Użytkownik widzi wyraźny status: zsynchronizowane / czeka na wysłanie
- Konflikt rozstrzygaj po czasie utworzenia wpisu, nie po czasie wysłania

To nie jest funkcja opcjonalna. Apka bez tego jest bezużyteczna w realnym treningu.

---

## 7. Czego NIE robić w MVP

- Integracji z zegarkami, Stravą, Apple Health
- Aplikacji natywnej (iOS/Android) — PWA wystarczy
- Płatności i planów premium
- Panelu trenerskiego — to osobny etap, opisany w `ROADMAP.md`
- Czatu między użytkownikami
- Liczenia kalorii i makroskładników
- Rozbudowy dyscyplin wytrzymałościowych ponad proste logowanie

Jeśli uważasz, że coś z tej listy jest konieczne — napisz to w planie i poczekaj na decyzję.

---

## 8. Jak masz pracować

### Etap 1 — plan (przed kodem)
Przeczytaj `trening.html`, `DECISIONS.md`, `DESIGN.md` i `ROADMAP.md`. Następnie przygotuj i przedstaw:

1. **Stack** — ostateczna propozycja z uzasadnieniem odstępstw od sekcji 5
2. **Schemat bazy** — tabele, kolumny, relacje, zasady Row Level Security
3. **Struktura projektu** — drzewo katalogów i za co odpowiada każdy
4. **Podział na etapy wdrożenia** — co powstaje w jakiej kolejności i co działa po każdym etapie
5. **Ryzyka** — co może się zepsuć, co jest niepewne, gdzie widzisz problem
6. **Pytania** — wszystko, czego brakuje, żeby zacząć

**Zatrzymaj się i czekaj na akceptację.** Nie zakładaj zgody. Nie zaczynaj implementacji „żeby pokazać, jak to będzie wyglądać".

### Etap 2 — implementacja
Dopiero po wyraźnej akceptacji (lub po naniesieniu zmian i ponownej akceptacji).

Zasady:
- Buduj etapami z sekcji 4 planu. Po każdym etapie: działająca, uruchamialna wersja
- Po każdym etapie krótkie podsumowanie: co powstało, co działa, co dalej
- Przy decyzjach nieopisanych w tych plikach — zapytaj, nie zgaduj
- Nie dodawaj funkcji spoza zakresu, nawet jeśli wydają się oczywiste
- Kod i komentarze po angielsku, **interfejs użytkownika po polsku**

### Zasady stałe
- Nie zmieniaj wzorów wskaźników bez uzgodnienia
- Nie upraszczaj rozgrzewki ani rozciągania — to wyróżnik produktu
- Nie rozbudowuj pływania, biegania i roweru ponad proste logowanie
- Wygląd trzyma się `DESIGN.md`

---

## 9. Pliki w repozytorium

| Plik | Zawartość |
|---|---|
| `BRIEF.md` | ten plik — co budujemy i jak pracujesz |
| `DECISIONS.md` | decyzje właściciela z ich uzasadnieniem — zaglądaj przy wątpliwościach |
| `DESIGN.md` | wygląd: kolory, typografia, układ, zachowanie komponentów |
| `ROADMAP.md` | co po MVP — nie implementuj, ale nie zamykaj sobie drogi |
| `trening.html` | działająca apka jednoosobowa — referencja logiki i wyglądu |
| `plan-treningowy.md` | przykładowy plan użytkownika — materiał testowy |
