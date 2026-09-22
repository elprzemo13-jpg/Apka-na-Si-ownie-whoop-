// All user-facing strings live here so a second language can be added
// later by providing another object of the same shape.
export const pl = {
  app: {
    name: "Trening",
  },
  nav: {
    today: "Dziś",
    plan: "Plan",
    add: "Dodaj trening",
    log: "Log",
    trends: "Trendy",
  },
  addSheet: {
    title: "Nowy wpis",
    gym: { name: "Siłownia", hint: "Rozgrzewka, ciężary, rozciąganie" },
    swim: { name: "Pływanie", hint: "Dystans, tempo, metry pod wodą" },
    run: { name: "Bieganie", hint: "Dystans, czas, tempo" },
    bike: { name: "Rower", hint: "Dystans, czas, prędkość" },
    soon: "wkrótce",
  },
  common: {
    close: "Zamknij",
    loading: "Ładowanie…",
    retry: "Spróbuj ponownie",
  },
  config: {
    missingTitle: "Brak konfiguracji",
    missingBody: "Aplikacja nie zna adresu bazy danych. Uzupełnij VITE_SUPABASE_URL i VITE_SUPABASE_PUBLISHABLE_KEY.",
  },
  auth: {
    email: "Email",
    password: "Hasło",
    newPassword: "Nowe hasło",
    passwordHint: "Minimum 8 znaków.",
    showPassword: "pokaż",
    hidePassword: "ukryj",
    tagline: "Obciążenie ze wszystkich dyscyplin w jednym miejscu.",
    login: {
      title: "Zaloguj się",
      submit: "Zaloguj się",
      forgot: "Nie pamiętasz hasła?",
      noAccount: "Nie masz konta?",
      toRegister: "Załóż konto",
      resend: "Wyślij link ponownie",
      resent: "Wysłaliśmy nowy link. Sprawdź skrzynkę.",
    },
    register: {
      title: "Załóż konto",
      submit: "Załóż konto",
      haveAccount: "Masz już konto?",
      toLogin: "Zaloguj się",
    },
    checkEmail: {
      title: "Sprawdź skrzynkę",
      body: (email: string) =>
        `Wysłaliśmy link potwierdzający na ${email}. Kliknij go, żeby aktywować konto. Jeśli nie widzisz wiadomości, zajrzyj do spamu.`,
      back: "Wróć do logowania",
    },
    reset: {
      title: "Reset hasła",
      body: "Podaj adres email konta. Wyślemy link do ustawienia nowego hasła.",
      submit: "Wyślij link",
      sent: "Jeśli konto z tym adresem istnieje, link jest już w drodze. Sprawdź skrzynkę i spam.",
      back: "Wróć do logowania",
    },
    update: {
      title: "Nowe hasło",
      submit: "Zapisz hasło",
      done: "Hasło zmienione.",
      noSession: "Link do zmiany hasła jest nieważny albo wygasł. Wyślij nowy.",
      requestNew: "Wyślij nowy link",
    },
    callback: {
      working: "Potwierdzamy adres…",
      confirmed: "Adres potwierdzony. Możesz się zalogować.",
      toLogin: "Przejdź do logowania",
    },
    passwordTooShort: "Hasło musi mieć minimum 8 znaków.",
  },
  onboarding: {
    title: "Jak mają Cię widzieć?",
    body: "Nazwa użytkownika pozwala znajomym Cię znaleźć. Dopóki sam tego nie włączysz, nikt nie widzi Twoich treningów.",
    username: "Nazwa użytkownika",
    usernameHint: "3–24 znaki: małe litery, cyfry i podkreślnik.",
    displayName: "Imię (opcjonalnie)",
    submit: "Dalej",
  },
  settings: {
    title: "Konto",
    email: "Email",
    username: "Nazwa użytkownika",
    inviteCode: "Kod zaproszenia",
    signOut: "Wyloguj się",
    open: "Konto",
  },
  errors: {
    generic: "Coś poszło nie tak. Spróbuj ponownie.",
    profileLoad: "Nie udało się wczytać Twojego konta. Sprawdź połączenie z internetem.",
    offline: "Brak połączenia z internetem.",
    invalidCredentials: "Nieprawidłowy email lub hasło.",
    emailNotConfirmed: "Najpierw potwierdź adres email — link jest w wiadomości od nas.",
    weakPassword: "Hasło jest za słabe. Użyj minimum 8 znaków.",
    samePassword: "Nowe hasło musi się różnić od poprzedniego.",
    rateLimit: "Za dużo prób w krótkim czasie. Spróbuj za kilka minut.",
    linkExpired: "Link wygasł albo został już użyty. Wyślij nowy.",
    usernameTaken: "Ta nazwa jest już zajęta.",
    usernameFormat: "Nazwa może mieć 3–24 znaki: małe litery, cyfry i podkreślnik.",
  },
  today: {
    emptyTitle: "Tu pojawią się Twoje wskaźniki",
    emptyBody:
      "Po pierwszych treningach zobaczysz realizację tygodnia, obciążenie ze wszystkich dyscyplin, regularność, rozgrzewkę i rozciąganie.",
    buildPlan: "Zbuduj swój plan",
  },
  plan: {
    emptyTitle: "Nie masz jeszcze planu",
    emptyBody: "Edytor planu powstaje w kolejnym etapie.",
  },
  log: {
    empty: "Brak wpisów.",
  },
  trends: {
    empty: "Trendy pojawią się po kilku wpisach.",
  },
} as const;

export const t = pl;
