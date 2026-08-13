export type Kompetencja =
  // Mentalne
  | "taktyka"
  | "koncentracja"
  | "kontrolaEmocji"
  | "pewnoscSiebie"
  | "czytanieDrog"
  // Techniczne
  | "taktykaWspinaczkowa"
  | "dynamika"
  | "pracaNog"
  | "technikaRuchu"
  // Fizyczne
  | "sila"
  | "moc"
  | "wytrzymalosc"
  | "mobilnosc";

export type Filar = "mentalne" | "techniczne" | "fizyczne";

export const NAZWY_KOMPETENCJI: Record<Kompetencja, string> = {
  taktyka: "Taktyka",
  koncentracja: "Koncentracja",
  kontrolaEmocji: "Kontrola emocji",
  pewnoscSiebie: "Pewność siebie",
  czytanieDrog: "Czytanie drogi",
  taktykaWspinaczkowa: "Taktyka wspinaczkowa",
  dynamika: "Dynamika",
  pracaNog: "Praca nóg",
  technikaRuchu: "Technika ruchu",
  sila: "Siła",
  moc: "Moc",
  wytrzymalosc: "Wytrzymałość",
  mobilnosc: "Mobilność",
};

export const NAZWY_FILAROW: Record<Filar, string> = {
  mentalne: "Mentalne",
  techniczne: "Techniczne",
  fizyczne: "Fizyczne",
};

export const FILARY: Record<Filar, Kompetencja[]> = {
  mentalne: ["taktyka", "koncentracja", "kontrolaEmocji", "pewnoscSiebie", "czytanieDrog"],
  techniczne: ["taktykaWspinaczkowa", "dynamika", "pracaNog", "technikaRuchu"],
  fizyczne: ["sila", "moc", "wytrzymalosc", "mobilnosc"],
};

function pustyProfil(): Record<Kompetencja, number> {
  const wynik = {} as Record<Kompetencja, number>;
  for (const filar of Object.keys(FILARY) as Filar[]) {
    for (const klucz of FILARY[filar]) {
      wynik[klucz] = 0;
    }
  }
  return wynik;
}

// Ile punktów danej kompetencji wnosi JEDNO przejście o danym stylu
const WPLYW_STYLU: Record<string, Partial<Record<Kompetencja, number>>> = {
  OS: { czytanieDrog: 3, pewnoscSiebie: 2 },
  RP: { technikaRuchu: 2, wytrzymalosc: 2 },
  "Wędka": { technikaRuchu: 1, pewnoscSiebie: 1 },
  Boulder: { moc: 3, sila: 2 },
};

type PrzejscieDoAnalizy = {
  styl: string;
};

/**
 * Główna funkcja silnika: bierze wszystkie przejścia i zwraca
 * profil kompetencji (0-100 dla każdej), na podstawie stylu wspinania.
 */
export function policzKompetencje(
  przejscia: PrzejscieDoAnalizy[]
): Record<Kompetencja, number> {
  const suma = pustyProfil();

  for (const p of przejscia) {
    const wplyw = WPLYW_STYLU[p.styl];
    if (!wplyw) continue;

    for (const klucz of Object.keys(wplyw) as Kompetencja[]) {
      suma[klucz] += wplyw[klucz] ?? 0;
    }
  }

  const wynik = {} as Record<Kompetencja, number>;
  for (const klucz of Object.keys(suma) as Kompetencja[]) {
    wynik[klucz] = Math.min(100, suma[klucz]);
  }

  return wynik;
}

const PUNKTY_ZA_WYKONANIE = 5;

type BlokDoKompetencji = {
  id: number;
  kompetencje: Kompetencja[];
};

type WykonanieDoKompetencji = {
  blok_id: number;
};

/**
 * Liczy punkty kompetencji z faktycznie wykonanych bloków treningowych
 * (zaznaczonych w Realizacji). Każde wykonanie bloku dolicza
 * PUNKTY_ZA_WYKONANIE do każdej kompetencji, którą ten blok ma oznaczoną.
 */
export function policzKompetencjeZTreningu(
  bloki: BlokDoKompetencji[],
  wykonania: WykonanieDoKompetencji[]
): Record<Kompetencja, number> {
  const suma = pustyProfil();
  const mapaBlokow = new Map(bloki.map((b) => [b.id, b.kompetencje]));

  for (const w of wykonania) {
    const kompetencje = mapaBlokow.get(w.blok_id);
    if (!kompetencje) continue;

    for (const klucz of kompetencje) {
      if (klucz in suma) {
        suma[klucz] += PUNKTY_ZA_WYKONANIE;
      }
    }
  }

  const wynik = {} as Record<Kompetencja, number>;
  for (const klucz of Object.keys(suma) as Kompetencja[]) {
    wynik[klucz] = Math.min(100, suma[klucz]);
  }

  return wynik;
}

/**
 * Łączy dwa źródła kompetencji (np. z dróg i z treningu) w jeden profil,
 * sumując wartości i ograniczając każdą do maksymalnie 100.
 */
export function polaczKompetencje(
  a: Record<Kompetencja, number>,
  b: Record<Kompetencja, number>
): Record<Kompetencja, number> {
  const wynik = {} as Record<Kompetencja, number>;
  for (const klucz of Object.keys(a) as Kompetencja[]) {
    wynik[klucz] = Math.min(100, a[klucz] + b[klucz]);
  }
  return wynik;
}

/**
 * Agreguje profil 13 kompetencji do 3 wartości ogólnych (średnia
 * kompetencji w każdym filarze) — do widoku "Ogólny" na wykresie.
 */
export function policzWartosciFilarow(
  kompetencje: Record<Kompetencja, number>
): Record<Filar, number> {
  const wynik = {} as Record<Filar, number>;
  for (const filar of Object.keys(FILARY) as Filar[]) {
    const klucze = FILARY[filar];
    const suma = klucze.reduce((akumulator, k) => akumulator + kompetencje[k], 0);
    wynik[filar] = Math.round(suma / klucze.length);
  }
  return wynik;
}