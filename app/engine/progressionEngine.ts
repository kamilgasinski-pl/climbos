import { poziomTrudnosci, SkalaTrudnosci, sumaWagMiedzyPoziomami } from "./gradeEngine";

export type StatusOpanowania = "nieosiagniety" | "projekt" | "rozwijany" | "opanowany";

export type WynikTrudnosci = {
  trudnosc: string;
  liczbaPrzejsc: number;
  status: StatusOpanowania;
  gwiazdki: number; // 0-5
};

type PrzejscieDoAnalizy = {
  trudnosc: string;
};

/**
 * Liczy status opanowania dla JEDNEJ konkretnej trudności,
 * na podstawie liczby przejść zarejestrowanych na tym poziomie.
 */
function policzStatusDlaTrudnosci(liczbaPrzejsc: number): { status: StatusOpanowania; gwiazdki: number } {
  if (liczbaPrzejsc === 0) {
    return { status: "nieosiagniety", gwiazdki: 0 };
  }
  if (liczbaPrzejsc <= 2) {
    return { status: "projekt", gwiazdki: 1 };
  }
  if (liczbaPrzejsc <= 5) {
    return { status: "rozwijany", gwiazdki: Math.min(4, Math.floor(liczbaPrzejsc / 2) + 1) };
  }
  return { status: "opanowany", gwiazdki: 5 };
}

/**
 * Główna funkcja silnika: bierze listę wszystkich przejść użytkownika
 * i zwraca podsumowanie opanowania dla każdej trudności, na której
 * cokolwiek zostało zrobione.
 */
export function policzProgresje(
  przejscia: PrzejscieDoAnalizy[],
  skala: SkalaTrudnosci = "kurtyki"
): WynikTrudnosci[] {
  const liczbaPrzejscNaTrudnosc = new Map<string, number>();

  for (const p of przejscia) {
    const obecna = liczbaPrzejscNaTrudnosc.get(p.trudnosc) ?? 0;
    liczbaPrzejscNaTrudnosc.set(p.trudnosc, obecna + 1);
  }

  const wyniki: WynikTrudnosci[] = [];
  for (const [trudnosc, liczba] of liczbaPrzejscNaTrudnosc.entries()) {
    const { status, gwiazdki } = policzStatusDlaTrudnosci(liczba);
    wyniki.push({ trudnosc, liczbaPrzejsc: liczba, status, gwiazdki });
  }

  // Sortujemy od najłatwiejszej do najtrudniejszej
  wyniki.sort((a, b) => poziomTrudnosci(a.trudnosc, skala) - poziomTrudnosci(b.trudnosc, skala));

  return wyniki;
}
export type PunktProgresji = {
  data: string;
  trudnosc: string;
  poziom: number;
};

type SesjaDoAnalizyCzasowej = {
  data_treningu: string;
  przejscia: { trudnosc: string }[];
};

/**
 * Dla każdej sesji znajduje najtrudniejsze przejście i zwraca punkt
 * do wykresu progresji w czasie. Sesje bez przejść są pomijane.
 */
export function policzProgresjeWCzasie(
  sesje: SesjaDoAnalizyCzasowej[],
  skala: SkalaTrudnosci = "kurtyki"
): PunktProgresji[] {
  const punkty: PunktProgresji[] = [];

  for (const sesja of sesje) {
    if (sesja.przejscia.length === 0) continue;

    const najtrudniejsza = sesja.przejscia.reduce((najt, obecna) => {
      return poziomTrudnosci(obecna.trudnosc, skala) > poziomTrudnosci(najt.trudnosc, skala)
        ? obecna
        : najt;
    });

    punkty.push({
      data: sesja.data_treningu,
      trudnosc: najtrudniejsza.trudnosc,
      poziom: poziomTrudnosci(najtrudniejsza.trudnosc, skala),
    });
  }

  punkty.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  return punkty;
}
export type PunktAktywnosci = {
  data: string;
  liczbaPrzejsc: number;
};

type SesjaDoAnalizyAktywnosci = {
  data_treningu: string;
  przejscia: unknown[];
};

/**
 * Zwraca liczbę przejść zarejestrowanych w każdej sesji,
 * posortowaną chronologicznie — dane do wykresu aktywności.
 */
export function policzAktywnoscWCzasie(
  sesje: SesjaDoAnalizyAktywnosci[]
): PunktAktywnosci[] {
  const punkty: PunktAktywnosci[] = sesje.map((sesja) => ({
    data: sesja.data_treningu,
    liczbaPrzejsc: sesja.przejscia.length,
  }));

  punkty.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  return punkty;
}
export type PostepDoCelu = {
  trudnoscObecna: string | null;
  trudnoscDocelowa: string;
  procentPostepu: number;
  malaHistoria: boolean;
};

const MIN_PRZEJSC_DO_TRENDU = 3;

/**
 * Liczy procent postępu od najtrudniejszej osiągniętej oceny (w danym stylu)
 * do celu. Jeśli cel jest już osiągnięty lub przekroczony, zwraca 100.
 */
export function policzPostepDoCelu(
  trudnoscObecna: string | null,
  trudnoscDocelowa: string,
  trudnoscStartowa: string | null,
  liczbaPrzejscWStylu: number,
  skala: SkalaTrudnosci = "kurtyki"
): PostepDoCelu {
  const poziomDocelowy = poziomTrudnosci(trudnoscDocelowa, skala);

  if (trudnoscObecna === null) {
    return { trudnoscObecna: null, trudnoscDocelowa, procentPostepu: 0, malaHistoria: true };
  }

  const poziomObecny = poziomTrudnosci(trudnoscObecna, skala);

  if (poziomObecny >= poziomDocelowy) {
    return { trudnoscObecna, trudnoscDocelowa, procentPostepu: 100, malaHistoria: false };
  }

  const malaHistoria = liczbaPrzejscWStylu < MIN_PRZEJSC_DO_TRENDU;

  let poziomStartowy: number;
  if (malaHistoria) {
    // Za mało danych, żeby historia coś znaczyła — cofamy się do umownego
    // progu na skali, żeby procent nie był mylącym zerem.
    poziomStartowy = Math.max(0, poziomDocelowy - 10);
  } else {
    poziomStartowy = trudnoscStartowa !== null ? poziomTrudnosci(trudnoscStartowa, skala) : poziomObecny;
    if (poziomStartowy >= poziomDocelowy) {
      poziomStartowy = Math.max(0, poziomDocelowy - 1);
    }
  }

const wagaPokonana = sumaWagMiedzyPoziomami(poziomStartowy, poziomObecny);
  const wagaCalkowita = sumaWagMiedzyPoziomami(poziomStartowy, poziomDocelowy);
  const procent = (wagaPokonana / wagaCalkowita) * 100;

  return {
    trudnoscObecna,
    trudnoscDocelowa,
    procentPostepu: Math.max(0, Math.min(100, Math.round(procent))),
    malaHistoria,
  };
}
type PrzejscieDoStartu = { trudnosc: string; styl: string };
type SesjaDoStartu = { data_treningu: string; przejscia: PrzejscieDoStartu[] };

/**
 * Znajduje trudność pierwszego chronologicznie zarejestrowanego przejścia
 * (opcjonalnie tylko w danym stylu) — realny punkt startowy użytkownika,
 * zamiast arbitralnego progu na skali.
 */
export function znajdzTrudnoscStartowa(
  sesje: SesjaDoStartu[],
  styl?: string
): string | null {
  const wszystkie = sesje.flatMap((s) =>
    s.przejscia
      .filter((p) => !styl || p.styl === styl)
      .map((p) => ({ trudnosc: p.trudnosc, data: s.data_treningu }))
  );

  if (wszystkie.length === 0) return null;

  wszystkie.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  return wszystkie[0].trudnosc;
}
export function zliczPrzejsciaWStylu(sesje: SesjaDoStartu[], styl?: string): number {
  return sesje.flatMap((s) => s.przejscia).filter((p) => !styl || p.styl === styl).length;
}
export type PunktProgresjiStylu = {
  data: string;
  poziomOS: number | null;
  poziomRP: number | null;
  poziomWedka: number | null;
  trudnoscOS: string | null;
  trudnoscRP: string | null;
  trudnoscWedka: string | null;
};

type SesjaDoAnalizyStylow = {
  data_treningu: string;
  przejscia: { trudnosc: string; styl: string }[];
};

/**
 * Jak policzProgresjeWCzasie, ale rozbite na trzy osobne linie
 * (OS/RP/Wędka) — dla każdej sesji najtrudniejsze przejście w danym
 * stylu, albo null jeśli w tej sesji nie było przejścia tym stylem.
 */
export function policzProgresjeWCzasiePoStylu(
  sesje: SesjaDoAnalizyStylow[],
  skala: SkalaTrudnosci = "kurtyki"
): PunktProgresjiStylu[] {
  const punkty: PunktProgresjiStylu[] = [];

  for (const sesja of sesje) {
    if (sesja.przejscia.length === 0) continue;

    function najtrudniejszaWStylu(styl: string) {
      const wStylu = sesja.przejscia.filter((p) => p.styl === styl);
      if (wStylu.length === 0) return null;
      return wStylu.reduce((najt, obecna) =>
        poziomTrudnosci(obecna.trudnosc, skala) > poziomTrudnosci(najt.trudnosc, skala)
          ? obecna
          : najt
      );
    }

    const os = najtrudniejszaWStylu("OS");
    const rp = najtrudniejszaWStylu("RP");
    const wedka = najtrudniejszaWStylu("Wędka");

    if (!os && !rp && !wedka) continue;

    punkty.push({
      data: sesja.data_treningu,
      poziomOS: os ? poziomTrudnosci(os.trudnosc, skala) : null,
      poziomRP: rp ? poziomTrudnosci(rp.trudnosc, skala) : null,
      poziomWedka: wedka ? poziomTrudnosci(wedka.trudnosc, skala) : null,
      trudnoscOS: os?.trudnosc ?? null,
      trudnoscRP: rp?.trudnosc ?? null,
      trudnoscWedka: wedka?.trudnosc ?? null,
    });
  }

  punkty.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  return punkty;
}
export type PunktAktywnosciOgolny = {
  data: string;
  wartosc: number;
};

type SesjaDoIntensywnosciBoulderingu = {
  data_treningu: string;
  czas_trwania_min: number;
  rpe: number | null;
};

/**
 * Dla sesji boulderowych z ustawionym RPE liczy session-RPE
 * (czas trwania w minutach × RPE) — miarę intensywności bez
 * konieczności liczenia dróg czy posiadania zegarka.
 */
export function policzIntensywnoscBoulderingu(
  sesje: SesjaDoIntensywnosciBoulderingu[]
): PunktAktywnosciOgolny[] {
  const punkty = sesje
    .filter((s) => s.rpe != null)
    .map((s) => ({
      data: s.data_treningu,
      wartosc: s.czas_trwania_min * (s.rpe as number),
    }));

  punkty.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  return punkty;
}