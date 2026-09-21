# ROADMAP.md — co po MVP

**Nie implementuj niczego z tego pliku.** Jest tu po to, żebyś przy projektowaniu bazy i struktury nie zamknął sobie drogi.

---

## Etap 2 — tryb trenerski

Właściciel prowadzi indywidualne lekcje pływania. Chce móc:
- zaprosić klienta do aplikacji
- widzieć jego treningi i postępy
- przypisać mu plan
- zostawić notatkę po lekcji

**Co to znaczy dla schematu bazy już teraz:**
- relacja użytkownik–użytkownik musi być typowana (znajomy / trener–podopieczny), a nie zaszyta jako sama „znajomość"
- plan treningowy musi mieć autora oddzielonego od właściciela — inaczej nie da się przypisać planu komuś innemu
- uprawnienia do odczytu muszą dać się rozszerzyć bez przepisywania reguł od zera

Zrób miejsce na to w schemacie. Nie buduj funkcji.

---

## Etap 3 — rozszerzenia treningowe

- Szablony ćwiczeń z biblioteki zamiast wpisywania nazw ręcznie
- Historia ćwiczenia na wykresie
- Deload — zaplanowany lżejszy tydzień
- Notatka o samopoczuciu przed treningiem, zestawiana z obciążeniem
- Zdjęcia i filmy techniki przy ćwiczeniu

---

## Etap 4 — integracje

- Import z Garmina / Apple Health / Stravy
- Kalendarz — treningi jako wydarzenia
- Powiadomienia push

---

## Etap 5 — rzeczy do przemyślenia

Nie są zdecydowane, ale wpłyną na kształt produktu:

- **Wersja płatna** — co miałoby być za darmo, a co nie
- **Angielski** — czy wychodzimy poza Polskę
- **Aplikacja natywna** — tylko jeśli PWA okaże się za słaba
- **Grupy** — sekcja pływacka, ekipa z siłowni, wspólne wyzwania

---

## Czego prawdopodobnie nie będzie nigdy

Dla jasności kierunku:

- liczenie kalorii i makroskładników
- plan żywieniowy
- generowanie planu przez AI (plan buduje człowiek — to założenie produktu)
- sprzedaż planów treningowych
- czat
