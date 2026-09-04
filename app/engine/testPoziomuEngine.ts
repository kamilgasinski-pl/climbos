import { SKALA_KURTYKI } from "./gradeEngine";

export type ObszarTestu = "performance" | "silaPalcow" | "ciagniecie" | "wytrzymalosc" | "technika";

/**
 * Benchmarki dla każdego z 20 poziomów skali Kurtyki (ten sam indeks co SKALA_KURTYKI).
 *
 * silaPalcow / ciagniecie: % masy ciała utrzymanej przez 7s (zwis na krawędzi 20mm /
 * podciąganie z dociążeniem). silaPalcow oparte na realnych danych Lattice Training
 * (zwis dwuoburęczny, V4=128% -> V11=170%, ekstrapolowane liniowo na resztę skali
 * przez przelicznik French->V-scale). ciagniecie i wytrzymalosc i technika to punkty
 * startowe do kalibracji na realnych danych uzytkowników, analogicznie do WSPOLCZYNNIK_WZROSTU
 * w gradeEngine.
 *
 * wytrzymalosc: liczba ruchów do odpadnięcia na umiarkowanie trudnym obwodzie (nie %).
 * technika: suma punktów z checklisty (0-100).
 */
export const BENCHMARKI: Record<Exclude<ObszarTestu, "performance">, number[]> = {
  silaPalcow: [80, 85, 90, 95, 100, 102, 104, 106, 108, 111, 116, 119, 122, 128, 134, 140, 146, 152, 158, 164],
  ciagniecie: [-30, -20, -10, 0, 10, 20, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95],
  wytrzymalosc: [15, 18, 22, 26, 30, 34, 38, 41, 44, 47, 50, 53, 56, 59, 62, 65, 68, 71, 74, 77],
  technika: [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 93, 96, 100],
};

export const WAGI: Record<ObszarTestu, number> = {
  performance: 0.35,
  silaPalcow: 0.2,
  ciagniecie: 0.15,
  wytrzymalosc: 0.15,
  technika: 0.15,
};

const MAKS_INDEKS = SKALA_KURTYKI.length - 1;

/**
 * Znajduje najwyższy poziom (indeks w SKALA_KURTYKI), którego benchmark
 * użytkownik osiągnął lub przekroczył daną wartością pomiaru.
 */
function poziomZBenchmarku(wartosc: number, benchmarki: number[]): number {
  let poziom = 0;
  for (let i = 0; i < benchmarki.length; i++) {
    if (wartosc >= benchmarki[i]) {
      poziom = i;
    }
  }
  return poziom;
}

export function poziomSilyPalcow(masaCiala: number, dociazenieKg: number): number {
  if (masaCiala <= 0) return 0;
  const procentMasy = ((masaCiala + dociazenieKg) / masaCiala) * 100;
  return poziomZBenchmarku(procentMasy, BENCHMARKI.silaPalcow);
}

export function poziomCiagniecia(masaCiala: number, dociazenieKg: number): number {
  if (masaCiala <= 0) return 0;
  const procentMasy = (dociazenieKg / masaCiala) * 100;
  return poziomZBenchmarku(procentMasy, BENCHMARKI.ciagniecie);
}

export function poziomWytrzymalosci(liczbaRuchow: number): number {
  return poziomZBenchmarku(liczbaRuchow, BENCHMARKI.wytrzymalosc);
}

export function poziomTechniki(punktyCheckisty: number): number {
  return poziomZBenchmarku(punktyCheckisty, BENCHMARKI.technika);
}

type WynikiObszarow = Record<ObszarTestu, number>;

/**
 * Łączy wyniki z 5 obszarów w jeden poziom końcowy. Ważona średnia,
 * ale ograniczona do performance + maksymalnie 2 kroki w górę — żeby
 * sama siła palców/ciągnięcia bez realnego performance nie zawyżała wyniku.
 */
export function policzPoziomKoncowy(wyniki: WynikiObszarow): {
  indeksKoncowy: number;
  ocenaKurtyki: string;
  waznaSrednia: number;
} {
  const waznaSrednia =
    wyniki.performance * WAGI.performance +
    wyniki.silaPalcow * WAGI.silaPalcow +
    wyniki.ciagniecie * WAGI.ciagniecie +
    wyniki.wytrzymalosc * WAGI.wytrzymalosc +
    wyniki.technika * WAGI.technika;

  const ograniczenie = wyniki.performance + 2;
  const indeksKoncowy = Math.max(0, Math.min(MAKS_INDEKS, Math.round(Math.min(waznaSrednia, ograniczenie))));

  return {
    indeksKoncowy,
    ocenaKurtyki: SKALA_KURTYKI[indeksKoncowy],
    waznaSrednia,
  };
}

/**
 * Zwraca obszary posortowane od największego ograniczenia (najbardziej
 * poniżej performance) do najmniejszego — pomija sam performance,
 * bo to on jest punktem odniesienia, nie ograniczeniem.
 */
export function znajdzOgraniczenia(
  wyniki: WynikiObszarow
): { obszar: ObszarTestu; roznica: number }[] {
  const obszaryFizyczne: ObszarTestu[] = ["silaPalcow", "ciagniecie", "wytrzymalosc", "technika"];

  return obszaryFizyczne
    .map((obszar) => ({ obszar, roznica: wyniki[obszar] - wyniki.performance }))
    .sort((a, b) => a.roznica - b.roznica);
}

export const NAZWY_OBSZAROW: Record<ObszarTestu, string> = {
  performance: "Rzeczywisty performance",
  silaPalcow: "Siła palców",
  ciagniecie: "Siła ciągnięcia",
  wytrzymalosc: "Wytrzymałość",
  technika: "Technika",
};