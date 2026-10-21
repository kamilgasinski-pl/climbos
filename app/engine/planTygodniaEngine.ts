import { supabase } from "../supabaseclient";

export function lokalnaData(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dz = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dz}`;
}

export function dataZISO(iso: string): Date {
  const [r, m, d] = iso.split("-").map(Number);
  return new Date(r, m - 1, d);
}

export function dodajDniISO(iso: string, dni: number): string {
  const d = dataZISO(iso);
  d.setDate(d.getDate() + dni);
  return lokalnaData(d);
}

export function poniedzialekISO(data: Date): string {
  const kopia = new Date(data);
  const dzien = kopia.getDay();
  kopia.setDate(kopia.getDate() + (dzien === 0 ? -6 : 1 - dzien));
  return lokalnaData(kopia);
}

/**
 * Numer tygodnia wg ISO 8601 (tydzień z czwartkiem wyznacza rok).
 */
export function numerTygodniaISO(data: Date): number {
  const d = new Date(Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()));
  const dzienTygodnia = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dzienTygodnia);
  const poczatekRoku = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - poczatekRoku.getTime()) / 86400000 + 1) / 7);
}

function krotko(d: Date): string {
  const dzien = String(d.getDate()).padStart(2, "0");
  const miesiac = String(d.getMonth() + 1).padStart(2, "0");
  return `${dzien}.${miesiac}`;
}

export function zakresTygodnia(poniedzialek: string): string {
  return `${krotko(dataZISO(poniedzialek))}-${krotko(dataZISO(dodajDniISO(poniedzialek, 6)))}`;
}

export function etykietaTygodnia(poniedzialek: string): string {
  return `T${numerTygodniaISO(dataZISO(poniedzialek))} · ${zakresTygodnia(poniedzialek)}`;
}

/** Pola bloku wspólne dla planu tygodnia i szablonu. */
export type RekordBloku = {
  dzien_tygodnia: number;
  godzina_start: string;
  godzina_koniec: string;
  tytul: string;
  kategoria_id: number | null;
  kompetencje: string[] | null;
  notatka: string | null;
  pomijaj_w_realizacji: boolean;
  zestaw_id: number | null;
  linia_id: string;
};

const POLA_BLOKU =
  "dzien_tygodnia, godzina_start, godzina_koniec, tytul, kategoria_id, kompetencje, notatka, pomijaj_w_realizacji, zestaw_id, linia_id";

async function blokiTygodnia(tydzien: string): Promise<RekordBloku[]> {
  const { data, error } = await supabase
    .from("bloki_tygodniowe")
    .select(POLA_BLOKU)
    .eq("tydzien_start", tydzien);
  if (error) throw error;
  return (data ?? []) as unknown as RekordBloku[];
}

/** Zwraca zapisany szablon tygodnia (pustą listę, jeśli go nie ma). */
export async function pobierzSzablon(): Promise<RekordBloku[]> {
  const { data, error } = await supabase.from("bloki_szablonu").select(POLA_BLOKU);
  if (error) throw error;
  return (data ?? []) as unknown as RekordBloku[];
}

/**
 * Zapisuje, że dany tydzień ma własny plan (nawet pusty). Powtórne
 * wywołanie dla tego samego tygodnia jest bezpieczne.
 */
export async function oznaczTydzien(tydzien: string): Promise<void> {
  const { error } = await supabase.from("tygodnie_planu").insert({ tydzien_start: tydzien });
  if (error && error.code !== "23505") throw error;
}

async function zalozTydzien(cel: string, zrodlo: () => Promise<RekordBloku[]>): Promise<void> {
  // Znacznik działa jak blokada: jeśli już istnieje, ktoś inny tworzy ten tydzień.
  const { error: bladZnacznika } = await supabase
    .from("tygodnie_planu")
    .insert({ tydzien_start: cel });

  if (bladZnacznika) {
    if (bladZnacznika.code === "23505") return;
    throw bladZnacznika;
  }

  try {
    const bloki = await zrodlo();
    if (bloki.length > 0) {
      const { error } = await supabase
        .from("bloki_tygodniowe")
        .insert(bloki.map((b) => ({ ...b, tydzien_start: cel })));
      if (error) throw error;
    }
  } catch (e) {
    await supabase.from("tygodnie_planu").delete().eq("tydzien_start", cel);
    throw e;
  }
}

async function utworzTydzien(tydzien: string): Promise<void> {
  const { data: znaczniki, error } = await supabase.from("tygodnie_planu").select("tydzien_start");
  if (error) throw error;

  const zapisane = new Set((znaczniki ?? []).map((z) => z.tydzien_start as string));
  if (zapisane.has(tydzien)) return;

  // Bieżący i przyszłe tygodnie powstają z szablonu, jeśli został zapisany.
  if (tydzien >= poniedzialekISO(new Date())) {
    const szablon = await pobierzSzablon();
    if (szablon.length > 0) {
      await zalozTydzien(tydzien, async () => szablon);
      return;
    }
  }

  const wczesniejsze = Array.from(zapisane)
    .filter((t) => t < tydzien)
    .sort();
  const bazowy = wczesniejsze[wczesniejsze.length - 1];

  if (!bazowy) {
    // Brak wcześniejszego planu do skopiowania: pusty tydzień tworzymy tylko
    // dla bieżącego i przyszłych tygodni.
    if (tydzien >= poniedzialekISO(new Date())) await oznaczTydzien(tydzien);
    return;
  }

  // Bez szablonu kopiujemy po kolei, żeby każdy tydzień dziedziczył zmiany z poprzedniego.
  let poprzedni = bazowy;
  for (let t = dodajDniISO(bazowy, 7); t <= tydzien; t = dodajDniISO(t, 7)) {
    const zrodlo = poprzedni;
    await zalozTydzien(t, () => blokiTygodnia(zrodlo));
    poprzedni = t;
  }
}

const trwajace = new Map<string, Promise<void>>();

/**
 * Zapewnia, że tydzień ma własny plan. Jeśli go nie ma, powstaje z szablonu
 * (gdy jest zapisany) albo jako kopia poprzedniego tygodnia.
 */
export function zapewnijTydzien(tydzien: string): Promise<void> {
  const istniejace = trwajace.get(tydzien);
  if (istniejace) return istniejace;

  const obietnica = utworzTydzien(tydzien).finally(() => {
    trwajace.delete(tydzien);
  });
  trwajace.set(tydzien, obietnica);
  return obietnica;
}

/**
 * Nadpisuje w szablonie wskazane dni (0 = poniedziałek) blokami z podanego
 * tygodnia. Pozostałe dni szablonu zostają bez zmian. Zwraca komunikat błędu
 * albo null, gdy się udało.
 */
export async function zapiszSzablon(tydzien: string, dni: number[]): Promise<string | null> {
  if (dni.length === 0) return "Zaznacz przynajmniej jeden dzień.";

  try {
    const bloki = (await blokiTygodnia(tydzien)).filter((b) => dni.includes(b.dzien_tygodnia));

    const { data: kopia, error: bladKopii } = await supabase
      .from("bloki_szablonu")
      .select(POLA_BLOKU)
      .in("dzien_tygodnia", dni);
    if (bladKopii) throw bladKopii;

    const { error: bladUsuniecia } = await supabase
      .from("bloki_szablonu")
      .delete()
      .in("dzien_tygodnia", dni);
    if (bladUsuniecia) throw bladUsuniecia;

    if (bloki.length > 0) {
      const { error: bladWstawiania } = await supabase.from("bloki_szablonu").insert(bloki);
      if (bladWstawiania) {
        // Przywracamy poprzednią wersję tych dni, żeby nie zostały puste.
        if (kopia && kopia.length > 0) await supabase.from("bloki_szablonu").insert(kopia);
        throw bladWstawiania;
      }
    }
    return null;
  } catch (e) {
    console.error("Błąd zapisu szablonu:", e);
    return "Nie udało się zapisać szablonu. Spróbuj ponownie.";
  }
}

/**
 * Zastępuje plan wskazanego tygodnia szablonem. Odmawia, jeśli w tygodniu są
 * już odhaczone aktywności (żeby nie zgubić historii realizacji).
 */
export async function zastosujSzablon(tydzien: string): Promise<string | null> {
  try {
    const szablon = await pobierzSzablon();
    if (szablon.length === 0) return "Nie zapisano jeszcze szablonu.";

    const { data: obecne, error: bladOdczytu } = await supabase
      .from("bloki_tygodniowe")
      .select("id")
      .eq("tydzien_start", tydzien);
    if (bladOdczytu) throw bladOdczytu;

    const idObecnych = (obecne ?? []).map((b) => b.id as number);

    if (idObecnych.length > 0) {
      const { data: odhaczone, error: bladOdhaczen } = await supabase
        .from("wykonania_blokow")
        .select("id")
        .in("blok_id", idObecnych)
        .limit(1);
      if (bladOdhaczen) throw bladOdhaczen;
      if ((odhaczone ?? []).length > 0) {
        return "Ten tydzień ma już odhaczone aktywności, więc nie można zastąpić go szablonem.";
      }
    }

    const kopia = await blokiTygodnia(tydzien);

    if (idObecnych.length > 0) {
      const { error: bladUsuniecia } = await supabase
        .from("bloki_tygodniowe")
        .delete()
        .in("id", idObecnych);
      if (bladUsuniecia) throw bladUsuniecia;
    }

    const { error: bladWstawiania } = await supabase
      .from("bloki_tygodniowe")
      .insert(szablon.map((b) => ({ ...b, tydzien_start: tydzien })));

    if (bladWstawiania) {
      if (kopia.length > 0) {
        await supabase
          .from("bloki_tygodniowe")
          .insert(kopia.map((b) => ({ ...b, tydzien_start: tydzien })));
      }
      throw bladWstawiania;
    }
    return null;
  } catch (e) {
    console.error("Błąd stosowania szablonu:", e);
    return "Nie udało się zastosować szablonu. Spróbuj ponownie.";
  }
}