// Skala Kurtyki (polska) jako punkt odniesienia — pełna skala z wariantami +/-
export const SKALA_KURTYKI = [
  "I", "II", "II+", "III", "IV", "IV+", "V-", "V", "V+",
  "VI-", "VI", "VI+", "VI.1", "VI.1+", "VI.2", "VI.2+",
  "VI.3", "VI.3+", "VI.4", "VI.4+", "VI.5", "VI.5+",
  "VI.6", "VI.6+", "VI.7", "VI.7+", "VI.8", "VI.8+",
];

// Odpowiadająca jej skala francuska (ten sam indeks = ten sam poziom, przybliżenie)
const SKALA_FRANCUSKA = [
  "1", "2", "3", "4a", "4b", "4c", "5a", "5b", "5c",
  "6a-", "6a", "6a+", "6b", "6b+", "6c", "6c+",
  "7a", "7a+", "7b", "7b+", "7c", "7c+",
  "8a", "8a+", "8b", "8b+", "8c", "8c+",
];

export type SkalaTrudnosci = "kurtyki" | "francuska";

/**
 * Zwraca numeryczny poziom trudności (0 = najłatwiejsza) dla danej oceny.
 * Pozwala porównywać "czy VI.2 jest trudniejsze niż VI+" itd.
 */
export function poziomTrudnosci(ocena: string, skala: SkalaTrudnosci): number {
  const tablica = skala === "kurtyki" ? SKALA_KURTYKI : SKALA_FRANCUSKA;
  const indeks = tablica.indexOf(ocena);

  if (indeks === -1) {
    throw new Error(`Nieznana ocena "${ocena}" w skali ${skala}`);
  }

  return indeks;
}

/**
 * Konwertuje ocenę z jednej skali na drugą.
 */
export function konwertujOcene(
  ocena: string,
  zSkali: SkalaTrudnosci,
  naSkale: SkalaTrudnosci
): string {
  const indeks = poziomTrudnosci(ocena, zSkali);
  const docelowaTablica = naSkale === "kurtyki" ? SKALA_KURTYKI : SKALA_FRANCUSKA;
  return docelowaTablica[indeks];
}

/**
 * Porównuje dwie oceny (mogą być z różnych skal).
 * Zwraca: dodatnią liczbę jeśli a > b, ujemną jeśli a < b, 0 jeśli równe.
 */
export function porownajOceny(
  ocenaA: string,
  skalaA: SkalaTrudnosci,
  ocenaB: string,
  skalaB: SkalaTrudnosci
): number {
  const poziomA = poziomTrudnosci(ocenaA, skalaA);
  const poziomB = poziomTrudnosci(ocenaB, skalaB);
  return poziomA - poziomB;
}
/**
 * Zwraca najtrudniejszą ocenę z listy (w skali Kurtyki).
 * Przydatne do liczenia statystyk typu "najtrudniejsza droga RP".
 */
export function najtrudniejszaOcena(oceny: string[]): string | null {
  if (oceny.length === 0) return null;

  return oceny.reduce((najtrudniejsza, obecna) => {
    return poziomTrudnosci(obecna, "kurtyki") > poziomTrudnosci(najtrudniejsza, "kurtyki")
      ? obecna
      : najtrudniejsza;
  });
}
/**
 * Zwraca "koszt" (wagę) danego poziomu trudności — rośnie wykładniczo,
 * bo każdy kolejny stopień wymaga relatywnie więcej wysiłku niż poprzedni.
 * Używane do liczenia postępu, który odzwierciedla realny wysiłek,
 * nie tylko pozycję na skali.
 */
export function wagaPoziomu(poziom: number): number {
  const WSPOLCZYNNIK_WZROSTU = 1.15;
  return Math.pow(WSPOLCZYNNIK_WZROSTU, poziom);
}

/**
 * Sumuje wagi wszystkich kroków między dwoma poziomami (włącznie z końcem,
 * bez początku) — to "łączny wysiłek" potrzebny do pokonania tego odcinka.
 */
export function sumaWagMiedzyPoziomami(poziomOd: number, poziomDo: number): number {
  let suma = 0;
  for (let p = poziomOd + 1; p <= poziomDo; p++) {
    suma += wagaPoziomu(p);
  }
  return suma;
}

export type StopienUkonczenia = "1/4" | "1/2" | "3/4" | "cala";

export const STOPNIE_UKONCZENIA: { wartosc: StopienUkonczenia; etykieta: string }[] = [
  { wartosc: "1/4", etykieta: "1/4" },
  { wartosc: "1/2", etykieta: "1/2" },
  { wartosc: "3/4", etykieta: "3/4" },
  { wartosc: "cala", etykieta: "Cała droga" },
];

/**
 * Tylko drogi ukończone w całości liczą się jako realnie osiągnięta trudność —
 * próby na 1/4, 1/2 czy 3/4 drogi nie powinny wpływać na statystyki progresji
 * (najtrudniejsza ocena, status opanowania itd.), żeby nie zawyżać wyniku.
 */
export function czyUkonczonaWCalosci(stopien: string): boolean {
  return stopien === "cala" || stopien === "cała";
}
export function liczySieDoProgresji(przejscie: { stopien_ukonczenia: string; blok: boolean }): boolean {
  return czyUkonczonaWCalosci(przejscie.stopien_ukonczenia) && !przejscie.blok;
}