# Konfiguracja Supabase i Netlify

Ustawienia robione w panelach (nie w kodzie). Stan: projekt `hjbvhclnvbhogadkqavm`, region Frankfurt.

## Migracje

SQL Editor → New query → wklej pliki z `supabase/migrations/` w kolejności nazw → Run.
Każdy plik uruchamiaj **raz**. Błąd „already exists" oznacza, że plik był już wgrany.

| Plik | Wgrany |
|---|---|
| `20260921000001_schema.sql` | 2026-09-22 |
| `20260921000002_rls.sql` | 2026-09-22 |
| `20260922000003_access_level_viewer.sql` | 2026-09-22 |
| `20260923000004_social.sql` | — |

## Authentication → URL Configuration

- **Site URL:** `https://si-apownia.netlify.app`
- **Redirect URLs:**
  - `https://si-apownia.netlify.app/**`
  - `http://localhost:5173/**`

Bez tego linki z maili prowadzą na `localhost:3000`.

## Authentication → Sign In / Providers → Email

- Email provider: włączony
- **Confirm email:** włączone
- **Minimum password length:** 8

## Authentication → Emails → SMTP (Brevo)

Wbudowany serwer Supabase wysyła maile tylko do członków zespołu projektu. Dla innych użytkowników potrzebny jest Brevo:

- Brevo → SMTP & API → SMTP: host `smtp-relay.brevo.com`, port `587`, login i klucz SMTP
- Brevo → Senders: zweryfikowany adres nadawcy
- Supabase → Authentication → Emails → SMTP Settings → Enable custom SMTP, wpisz powyższe, sender name `Trening`

## Authentication → Emails → Templates

**Confirm signup** — temat: `Potwierdź konto w aplikacji Trening`

```html
<h2>Witaj w aplikacji Trening</h2>
<p>Kliknij, żeby potwierdzić adres email i aktywować konto:</p>
<p><a href="{{ .ConfirmationURL }}">Potwierdź adres</a></p>
<p>Jeśli to nie Ty zakładałeś konto, zignoruj tę wiadomość.</p>
```

**Reset password** — temat: `Ustaw nowe hasło w aplikacji Trening`

```html
<h2>Reset hasła</h2>
<p>Kliknij, żeby ustawić nowe hasło:</p>
<p><a href="{{ .ConfirmationURL }}">Ustaw nowe hasło</a></p>
<p>Jeśli to nie Ty prosiłeś o zmianę hasła, zignoruj tę wiadomość — hasło zostanie bez zmian.</p>
```

## Netlify → Project configuration → Environment variables

| Klucz | Wartość |
|---|---|
| `VITE_SUPABASE_URL` | `https://hjbvhclnvbhogadkqavm.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | klucz `sb_publishable_…` (ten sam co w `.env.local`) |

Po dodaniu: Deploys → Trigger deploy → Deploy site.

## Brevo — na co uważać

- Klucz SMTP **wygasa po 90 dniach bez użycia**, niezależnie od daty ważności. Jeśli maile nagle przestaną dochodzić, wygeneruj nowy w Brevo (SMTP & API → SMTP) i podmień hasło w Supabase.
- Nadawca na adresie Gmail nie ma podpisu DKIM dla własnej domeny, więc część wiadomości trafia do spamu. Rozwiązanie docelowe: własna domena (~50 zł/rok) i jej uwierzytelnienie w Brevo.
- Część transakcyjna konta Brevo wymaga weryfikacji telefonu, a czasem ręcznej aktywacji przez wsparcie.
