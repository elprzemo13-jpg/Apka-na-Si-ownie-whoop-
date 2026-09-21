# DECISIONS.md — decyzje i ich uzasadnienie

Ten plik odpowiada na pytanie „dlaczego tak, a nie inaczej". Zaglądaj tu, zanim zaproponujesz zmianę — część rzeczy, które wyglądają na braki, jest celowa.

---

## Rozstrzygnięte

### Kto korzysta
**Otwarta rejestracja dla każdego.** Później dojdzie osobna wersja dla klientów właściciela na lekcjach pływania (patrz `ROADMAP.md`).

Konsekwencja dla architektury: od początku projektuj bazę tak, żeby dało się dodać relację trener–podopieczny bez przepisywania schematu. Nie implementuj jej teraz, ale nie zabetonuj się.

### Logowanie
**Email + hasło.** Bez Google, bez logowania społecznościowego.

Powód: najprostsze do uruchomienia i nie wymaga konfiguracji u zewnętrznego dostawcy. Google można dodać później, Supabase to obsługuje.

Potrzebne: potwierdzenie adresu email i reset hasła. Nie pomijaj tego — bez resetu hasła pierwszy zgubiony login to koniec konta.

### Dyscypliny
**Siłownia, pływanie, bieganie, rower.**

Siłownia pełna, reszta prosta. To nie jest kompromis czasowy — to decyzja produktowa. Osoba, która potrzebuje szczegółowej analizy biegania, ma do tego lepsze narzędzia. Tu chodzi o **zsumowanie obciążenia z różnych źródeł**, nie o zastąpienie zegarka sportowego.

### Plany treningowe
**Każdy buduje własny od zera.** Bez gotowych szablonów.

Powód: szablony sugerują, że aplikacja wie lepiej, a to nieprawda — plan zależy od dyscypliny, stażu i celów. Lepiej dać dobre narzędzie do zbudowania własnego planu niż średni plan dla wszystkich.

Konsekwencja: **edytor planu musi być naprawdę wygodny**, bo to pierwsza rzecz, którą robi nowy użytkownik. Jeśli będzie męczący, nikt nie dojdzie do pierwszego treningu. Potraktuj go jako krytyczny ekran, nie formalność.

### Część społecznościowa
**Tak, w MVP.** Znajomi, podgląd aktywności, ranking tygodniowy.

Prywatność domyślna: nowe konto **nie udostępnia nic**. Użytkownik sam włącza, co pokazuje. Trzy poziomy:
- pełny (treningi ze szczegółami)
- podstawowy (sam fakt treningu i dyscyplina, bez liczb)
- wyłączony

### Budżet
**Zero złotych.** Wszystko na darmowych planach.

Konsekwencje, z którymi trzeba żyć:
- adres w stylu `nazwa.vercel.app` zamiast własnej domeny
- usypianie projektu Supabase po bezczynności
- limity darmowego planu przy większej liczbie użytkowników

Zaznacz w README, gdzie są granice i co trzeba będzie kupić, gdy apka urośnie.

---

## Przeniesione z obecnej aplikacji

Te decyzje zapadły przy budowie wersji jednoosobowej i sprawdziły się w użyciu. Zachowaj je.

### Rozciąganie jest odhaczane, nie sugerowane
Właściciel nie lubi się rozciągać, ale chce to mieć w rutynie. Rozwiązanie: rozciąganie jest **checklistą w formularzu treningu**, z konkretnymi pozycjami przypisanymi do danego dnia, i aplikacja liczy odsetek treningów z odhaczonym rozciąganiem.

Ogólne „pamiętaj o rozciąganiu" nie działa. Konkretna lista czterech pozycji na dziś — działa.

### Timer przerw jako pasek na dole
Nie osobny ekran, nie okienko. Pasek przyklejony do dołu, widoczny podczas przewijania do kolejnego ćwiczenia. Każde ćwiczenie ma własny domyślny czas przerwy.

### Sugestia ciężaru zamiast pustego pola
Wpisywanie ciężaru od zera przy każdej serii to najczęstsze tarcie w apkach treningowych. Aplikacja zna poprzedni ciężar — ma go pokazać i pozwolić wpisać jednym dotknięciem we wszystkie serie.

### Kopiowanie pierwszej serii
Przycisk kopiujący wartości z pierwszej serii do pozostałych. Większość ludzi robi wszystkie serie tym samym ciężarem.

### Pomijanie ćwiczenia bez usuwania
Sprzęt bywa zajęty. Ćwiczenie da się oznaczyć jako pominięte jednym dotknięciem i nie psuje to zapisu treningu.

### Eksport danych
Eksport do CSV, dostępny dla użytkownika. To jego dane. Nie ukrywaj tej funkcji.

---

## Jeszcze nierozstrzygnięte

Zapytaj w planie, nie decyduj sam:

1. **Mnożniki obciążenia dla biegania i roweru** — propozycja w `BRIEF.md` (1,0 i 0,4) jest wstępna. Uzasadnij swoją i poczekaj na decyzję.
2. **Nazwa aplikacji i adres** — do ustalenia.
3. **Czy ranking obejmuje wszystkie dyscypliny łącznie, czy osobno dla każdej** — argumenty są po obu stronach.
4. **Co widzi znajomy przy poziomie „podstawowym"** — sam fakt treningu czy też jego długość.
5. **Język aplikacji** — MVP po polsku. Czy przewidujemy angielski na później i czy od razu układać teksty tak, żeby dało się je przetłumaczyć bez przepisywania.
