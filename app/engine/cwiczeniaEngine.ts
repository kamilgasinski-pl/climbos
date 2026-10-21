export type PoleSledzenia =
  | "serie"
  | "powtorzenia"
  | "czas_s"
  | "ciezar_kg"
  | "krawedz_mm"
  | "notatka";

export type OpisPola = {
  klucz: PoleSledzenia;
  etykieta: string;
  jednostka: string;
  liczbowe: boolean;
};

export const POLA_SLEDZENIA: OpisPola[] = [
  { klucz: "serie", etykieta: "Serie", jednostka: "", liczbowe: true },
  { klucz: "powtorzenia", etykieta: "Powtórzenia", jednostka: "", liczbowe: true },
  { klucz: "czas_s", etykieta: "Czas", jednostka: "s", liczbowe: true },
  { klucz: "ciezar_kg", etykieta: "Dodatkowy ciężar", jednostka: "kg", liczbowe: true },
  { klucz: "krawedz_mm", etykieta: "Krawędź", jednostka: "mm", liczbowe: true },
  { klucz: "notatka", etykieta: "Notatka", jednostka: "", liczbowe: false },
];

export type LinkZestawu = { etykieta: string; url: string };

export type Cwiczenie = {
  id: number;
  zestaw_id: number;
  nazwa: string;
  kolejnosc: number;
  sledzone: PoleSledzenia[];
  linki: LinkZestawu[];
};

export type Zestaw = {
  id: number;
  nazwa: string;
  opis: string | null;
  linki: LinkZestawu[];
  cwiczenia_zestawu: Cwiczenie[];
};

export type WykonanieCwiczenia = {
  id: number;
  cwiczenie_id: number;
  data: string;
  serie: number | null;
  powtorzenia: number | null;
  czas_s: number | null;
  ciezar_kg: number | null;
  krawedz_mm: number | null;
  notatka: string | null;
};

export function dzisiajLokalnie(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dz = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dz}`;
}

/**
 * Zwraca poprawny adres http(s) albo null. Odrzuca wszystko inne
 * (np. javascript:), więc zapisane linki są bezpieczne do kliknięcia.
 */
export function normalizujUrl(wejscie: string): string | null {
  const tekst = wejscie.trim();
  if (tekst === "") return null;
  const kandydat = /^https?:\/\//i.test(tekst) ? tekst : `https://${tekst}`;
  try {
    const url = new URL(kandydat);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Czyści listę linków z formularza: pomija puste wiersze i sprawdza
 * poprawność adresów. Zwraca gotową listę albo komunikat błędu.
 */
export function przygotujLinki(linki: LinkZestawu[]): {
  linki: LinkZestawu[];
  blad: string | null;
} {
  const poprawne: LinkZestawu[] = [];
  for (const l of linki) {
    if (l.url.trim() === "") continue;
    const url = normalizujUrl(l.url);
    if (!url) return { linki: [], blad: `Niepoprawny link: ${l.url}` };
    poprawne.push({ etykieta: l.etykieta.trim(), url });
  }
  return { linki: poprawne, blad: null };
}

export function nazwaLinku(link: LinkZestawu): string {
  if (link.etykieta.trim() !== "") return link.etykieta;
  try {
    return new URL(link.url).hostname.replace(/^www\./, "");
  } catch {
    return link.url;
  }
}

export function formatujWykonanie(
  w: WykonanieCwiczenia,
  sledzone: PoleSledzenia[]
): string {
  const czesci: string[] = [];
  for (const pole of POLA_SLEDZENIA) {
    if (!sledzone.includes(pole.klucz)) continue;
    const wartosc = w[pole.klucz];
    if (wartosc == null || wartosc === "") continue;
    if (pole.klucz === "notatka") {
      czesci.push(`"${wartosc}"`);
    } else {
      czesci.push(
        `${pole.etykieta.toLowerCase()} ${wartosc}${pole.jednostka ? " " + pole.jednostka : ""}`
      );
    }
  }
  return czesci.join(" · ");
}