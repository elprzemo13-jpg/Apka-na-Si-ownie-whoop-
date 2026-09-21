# DESIGN.md — wygląd i zachowanie interfejsu

Wartości poniżej pochodzą z działającej aplikacji (`trening.html`) i są sprawdzone w użyciu na telefonie. Trzymaj się ich.

---

## Zasada nadrzędna

Aplikacja jest używana **w trakcie treningu, na telefonie, spoconymi palcami, między seriami**. To determinuje wszystko:

- duże pola dotykowe, minimum 44 px wysokości
- ciemne tło (siłownie bywają jasne, ale telefon w dłoni z ciemnym tłem mniej męczy i mniej świeci w oczy)
- minimum kroków do zapisania serii
- nic, co wymaga celowania w mały element

Projektuj mobile-first. Wersja na komputer to ten sam układ wyśrodkowany, maksymalna szerokość 520 px.

---

## Kolory

```
--bg:     #000000    tło aplikacji
--panel:  #0C0C0E    karty i panele
--up:     #151518    pola formularzy, elementy podniesione
--line:   #232328    obramowania, separatory

--green:  #00F19F    kolor wiodący, siłownia, stan „w normie", przyciski główne
--blue:   #39C0FF    dyscypliny wytrzymałościowe, rozciąganie, timer
--yellow: #FFDE3D    ostrzeżenie, rozgrzewka
--red:    #FF4A4A    stan krytyczny, usuwanie
--gold:   #FFB84D    rekordy osobiste

--tx:     #FFFFFF    tekst główny
--dim:    #7A7A82    tekst drugorzędny, etykiety
```

Kolor niesie znaczenie, nie dekorację. Zielony = w porządku, żółty = uważaj, czerwony = zatrzymaj się. Nie używaj ich ozdobnie.

Dyscypliny: siłownia zielona, wytrzymałościowe niebieskie. Jeśli dodasz kolejne dyscypliny, trzymaj ten podział.

---

## Typografia

```
nagłówki i liczby:  "Barlow Condensed", 500-700
tekst:              systemowy (-apple-system, Segoe UI, Roboto)
```

Wąska, kondensowana czcionka na liczbach i nagłówkach — duże wartości mieszczą się bez zmniejszania i czytają się z odległości wyciągniętej ręki. Tekst czytany z bliska zostaje systemowy.

Rozmiary z działającej apki:
| Element | Rozmiar |
|---|---|
| Liczba w dużym pierścieniu | 34% średnicy pierścienia |
| Nazwa dnia treningowego | 32 px |
| Nagłówek sekcji (wersaliki) | 10 px, odstęp liter 1,2 px |
| Tekst podstawowy | 13–14 px |
| Etykiety pól | 10 px, wersaliki |
| **Pola wprowadzania** | **16 px — nie mniej** |

16 px w polach jest obowiązkowe: przy mniejszej wartości Safari na iPhonie automatycznie przybliża widok przy kliknięciu w pole i rozwala układ.

---

## Układ ekranu

```
┌──────────────────────────┐
│ TRENING        sobota, 19 │  nagłówek, przyklejony
├──────────────────────────┤
│                          │
│   ○  duży pierścień      │  główny wskaźnik
│                          │
│  ○  ○  ○  ○              │  cztery małe pierścienie
│                          │
│  [ ocena tekstowa ]      │  jedno zdanie interpretacji
│                          │
│  [ dziś w planie ]       │  + przycisk startu
│                          │
│  [ lista z tego tygodnia ]│
└──────────────────────────┘
│ DZIŚ  PLAN  (+)  LOG  ... │  nawigacja, przyklejona
└──────────────────────────┘
```

Zakładki: **Dziś, Plan, [+], Log, Trendy**. Przycisk dodawania w środku, jako zielone kółko — kciuk trafia tam najłatwiej.

Przy części społecznościowej dojdzie szósta pozycja. Rozważ przeniesienie „Trendy" do menu, zamiast ściskać sześć pozycji w pasku.

---

## Pierścienie

Podstawowy sposób pokazywania wartości. SVG, obrócony o −90° (start od góry), zaokrąglone końce, płynne przejście przy zmianie wartości.

- **Duży** (190 px, grubość 12) — realizacja tygodnia
- **Małe** (72 px, grubość 6,5) — pozostałe wskaźniki

Wartości powyżej 100% zostają wypełnione do pełna, ale liczba w środku pokazuje prawdziwą wartość. Przy obciążeniu 160% pierścień jest pełny i czerwony, a w środku widnieje 160.

---

## Formularz treningu siłowego

Najważniejszy ekran aplikacji. Kolejność stała:

1. **Wybór dnia** — chipy z dniami planu
2. **Rozgrzewka** — składany blok z checklistą, obramowanie zmienia kolor na żółty po odhaczeniu wszystkiego
3. **Ćwiczenia** — każde jako osobna karta
4. **Rozciąganie** — składany blok z checklistą, obramowanie niebieskie po odhaczeniu
5. **Zapisz**

Karta ćwiczenia zawiera:
```
1. Nazwa ćwiczenia (adnotacja)          ↓  ✕
   plan: 3×10 · 🏆 30 kg

   [ sugestia ciężaru — jeden dotyk ]

   1  [powt.]  [kg]  ⏱
   2  [powt.]  [kg]  ⏱
   3  [powt.]  [kg]  ⏱

   + dodatkowa seria
```

- **↓** kopiuje pierwszą serię do pozostałych
- **✕** pomija ćwiczenie (karta przygasa, nie znika)
- **⏱** uruchamia timer z domyślnym czasem tego ćwiczenia
- **🏆** pokazuje rekord osobisty, jeśli istnieje
- Sugestia ciężaru: szara gdy bez zmiany, **zielona ze strzałką gdy czas podbić**

Pola ćwiczeń bez obciążenia (plank, rotacje) nie mają pola na kilogramy — w tym miejscu jest myślnik.

---

## Timer przerw

Pasek przyklejony do dołu ekranu, widoczny podczas przewijania. Zawiera: czas, start/pauza, reset, presety (45/60/90/120/150 s), zamknięcie.

Kolory: niebieski w trakcie, żółty przy ostatnich 10 sekundach, zielony po zakończeniu. Sygnał dźwiękowy na koniec.

Pasek przykrywa nawigację, gdy jest aktywny. To celowe — w trakcie treningu timer jest ważniejszy.

---

## Zachowanie na telefonie

- `viewport-fit=cover` i `env(safe-area-inset-*)` — żeby treść nie wchodziła pod pasek systemowy ani pod wcięcie ekranu
- Zablokowane przybliżanie podwójnym dotknięciem
- `overscroll-behavior: none` — żeby przeciągnięcie nie odświeżało strony w trakcie wpisywania
- Klawiatura numeryczna w polach liczbowych (`inputmode`)
- Formularze jako arkusze wysuwane od dołu, zamykane dotknięciem tła

---

## Pułapki, które już kosztowały czas

**Przerysowanie widoku podczas fokusu w polu** wywala błąd w przeglądarce i gubi wpisywane dane. Rozwiązanie w obecnej apce: przerysowanie odroczone do następnego cyklu, tylko przy zmianach strukturalnych (dodanie serii, odhaczenie), nigdy przy każdym znaku.

W Next.js z kontrolowanymi komponentami ten problem wygląda inaczej, ale zasada zostaje: **wpisywanie nie może gubić fokusu ani znaków**. Przetestuj to na prawdziwym telefonie, nie tylko w symulatorze.

**Pozycja przewinięcia** musi przetrwać przerysowanie arkusza. Nic gorszego niż odhaczenie pozycji rozciągania i wyrzucenie na górę formularza.

---

## Pusty stan

Nowy użytkownik widzi zera we wszystkich wskaźnikach. To zniechęca. Zamiast pustych pierścieni pokaż:
- krótkie wyjaśnienie, co się pojawi po pierwszych treningach
- wyraźny przycisk „Zbuduj swój plan"

Pierwsze uruchomienie decyduje, czy ktoś zostanie. Nie potraktuj go jako przypadek brzegowy.
