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
