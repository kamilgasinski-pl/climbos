import { supabase } from "../supabaseclient";

export type ZakladkaPlannera =
  | "sesje"
  | "harmonogram"
  | "realizacja"
  | "cele"
  | "projekty"
  | "zestawy";

export type WidokSesji = "dzien" | "tydzien" | "miesiac";

export type Ustawienia = {
  domyslna_zakladka_plannera: ZakladkaPlannera;
  domyslny_widok_sesji: WidokSesji;
  dni_na_wykonanie_bloku: number;
  zarzadzanie_kompetencjami: boolean;
  test_poziomu_wlaczony: boolean;
};

export const ZAKLADKI_PLANNERA: { klucz: ZakladkaPlannera; etykieta: string }[] = [
  { klucz: "sesje", etykieta: "Sesje" },
  { klucz: "harmonogram", etykieta: "Harmonogram tygodniowy" },
  { klucz: "realizacja", etykieta: "Realizacja" },
  { klucz: "cele", etykieta: "Cele" },
  { klucz: "projekty", etykieta: "Projekty" },
  { klucz: "zestawy", etykieta: "Zestawy" },
];

export const WIDOKI_SESJI: { klucz: WidokSesji; etykieta: string }[] = [
  { klucz: "dzien", etykieta: "Dzień" },
  { klucz: "tydzien", etykieta: "Tydzień" },
  { klucz: "miesiac", etykieta: "Miesiąc" },
];

export const MIN_DNI = 1;
export const MAX_DNI = 60;

export const DOMYSLNE_USTAWIENIA: Ustawienia = {
  domyslna_zakladka_plannera: "sesje",
  domyslny_widok_sesji: "tydzien",
  dni_na_wykonanie_bloku: 7,
  zarzadzanie_kompetencjami: false,
  test_poziomu_wlaczony: false,
};

function poprawneUstawienia(surowe: Record<string, unknown> | null): Ustawienia {
  const zakladka =
    ZAKLADKI_PLANNERA.find((z) => z.klucz === surowe?.domyslna_zakladka_plannera)?.klucz ??
    DOMYSLNE_USTAWIENIA.domyslna_zakladka_plannera;

  const widok =
    WIDOKI_SESJI.find((w) => w.klucz === surowe?.domyslny_widok_sesji)?.klucz ??
    DOMYSLNE_USTAWIENIA.domyslny_widok_sesji;

  const dni = Number(surowe?.dni_na_wykonanie_bloku);
  const poprawneDni =
    Number.isInteger(dni) && dni >= MIN_DNI && dni <= MAX_DNI
      ? dni
      : DOMYSLNE_USTAWIENIA.dni_na_wykonanie_bloku;

  return {
    domyslna_zakladka_plannera: zakladka,
    domyslny_widok_sesji: widok,
    dni_na_wykonanie_bloku: poprawneDni,
    zarzadzanie_kompetencjami:
      typeof surowe?.zarzadzanie_kompetencjami === "boolean"
        ? surowe.zarzadzanie_kompetencjami
        : DOMYSLNE_USTAWIENIA.zarzadzanie_kompetencjami,
    test_poziomu_wlaczony:
      typeof surowe?.test_poziomu_wlaczony === "boolean"
        ? surowe.test_poziomu_wlaczony
        : DOMYSLNE_USTAWIENIA.test_poziomu_wlaczony,
  };
}

/** Zwraca zapisane ustawienia albo wartości domyślne (gdy brak zapisu lub błąd). */
export async function pobierzUstawienia(): Promise<Ustawienia> {
  const { data, error } = await supabase
    .from("ustawienia_uzytkownika")
    .select(
      "domyslna_zakladka_plannera, domyslny_widok_sesji, dni_na_wykonanie_bloku, zarzadzanie_kompetencjami, test_poziomu_wlaczony"
    )
    .maybeSingle();

  if (error) {
    console.error("Błąd pobierania ustawień:", error);
    return DOMYSLNE_USTAWIENIA;
  }
  return poprawneUstawienia(data as Record<string, unknown> | null);
}

/** Zapisuje ustawienia. Zwraca komunikat błędu albo null, gdy się udało. */
export async function zapiszUstawienia(ustawienia: Ustawienia): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "Nie udało się zidentyfikować użytkownika. Zaloguj się ponownie.";

  const { error } = await supabase.from("ustawienia_uzytkownika").upsert(
    { user_id: user.id, ...ustawienia, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("Błąd zapisu ustawień:", error);
    return "Nie udało się zapisać ustawień. Spróbuj ponownie.";
  }
  return null;
}