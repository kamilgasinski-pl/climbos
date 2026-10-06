import { poziomTrudnosci, SkalaTrudnosci, sumaWagMiedzyPoziomami, SKALA_KURTYKI } from "./gradeEngine";

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

export type WynikTrudnosciProsty = {
  trudnosc: string;
  liczbaWedka: number;
  liczbaZDolem: number;
};

type PrzejscieDoAnalizyProstej = {
  trudnosc: string;
  styl: string;
};

/**
 * Uproszczona wersja policzProgresje: zamiast statusu opanowania i gwiazdek,
 * dla każdej trudności zwraca po prostu liczbę przejść w stylu "Wędka"
 * i liczbę przejść "z dołem" (wszystko poza Wędką - OS, RP, Projekt itd.).
 */
export function policzProgresjeProsta(
  przejscia: PrzejscieDoAnalizyProstej[],
  skala: SkalaTrudnosci = "kurtyki"
): WynikTrudnosciProsty[] {
  const mapa = new Map<string, { liczbaWedka: number; liczbaZDolem: number }>();

  for (const p of przejscia) {
    const wpis = mapa.get(p.trudnosc) ?? { liczbaWedka: 0, liczbaZDolem: 0 };
    if (p.styl === "Wędka") {
      wpis.liczbaWedka += 1;
    } else {
      wpis.liczbaZDolem += 1;
    }
    mapa.set(p.trudnosc, wpis);
  }

  const wyniki: WynikTrudnosciProsty[] = [];
  for (const [trudnosc, { liczbaWedka, liczbaZDolem }] of mapa.entries()) {
    wyniki.push({ trudnosc, liczbaWedka, liczbaZDolem });
  }

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
  poziomProjekt: number | null;
  trudnoscOS: string | null;
  trudnoscRP: string | null;
  trudnoscWedka: string | null;
  trudnoscProjekt: string | null;
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
    const projekt = najtrudniejszaWStylu("Projekt");

    if (!os && !rp && !wedka && !projekt) continue;

    punkty.push({
      data: sesja.data_treningu,
      poziomOS: os ? poziomTrudnosci(os.trudnosc, skala) : null,
      poziomRP: rp ? poziomTrudnosci(rp.trudnosc, skala) : null,
      poziomWedka: wedka ? poziomTrudnosci(wedka.trudnosc, skala) : null,
      poziomProjekt: projekt ? poziomTrudnosci(projekt.trudnosc, skala) : null,
      trudnoscOS: os?.trudnosc ?? null,
      trudnoscRP: rp?.trudnosc ?? null,
      trudnoscWedka: wedka?.trudnosc ?? null,
      trudnoscProjekt: projekt?.trudnosc ?? null,
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

export type PasekPostepu = {
  trudnoscStartowa: string;
  trudnoscObecna: string | null;
  trudnoscDocelowa: string;
  poziomStartowy: number;
  poziomObecny: number | null;
  poziomDocelowy: number;
  /** Kolejne stopnie skali między startem a celem (włącznie), do podziałki paska */
  kroki: string[];
  /** Pozycja obecnego poziomu na pasku, liniowo 0-100 (nie ważona wykładniczo) */
  procentPozycji: number;
  celOsiagniety: boolean;
};

/**
 * Liczy pozycję na pasku postępu do Mega Celu (typ "poziom"), zamiast %
 * postępu liczonego wagą wysiłku. Start ustalony na podstawie testu
 * poziomu (realny, zmierzony punkt odniesienia zamiast pierwszego
 * zarejestrowanego przejścia), obecna pozycja na podstawie najtrudniejszej
 * zarejestrowanej drogi w stylu zgodnym z celem (OS/RP). Pozycja na pasku
 * jest liniowa względem liczby stopni skali między startem a celem —
 * prostsze i łatwiejsze w utrzymaniu niż wykładnicze ważenie wysiłku.
 */
export function policzPasekPostepu(
  trudnoscStartowa: string,
  trudnoscObecna: string | null,
  trudnoscDocelowa: string,
  skala: SkalaTrudnosci = "kurtyki"
): PasekPostepu {
  const poziomStartowy = poziomTrudnosci(trudnoscStartowa, skala);
  const poziomDocelowy = poziomTrudnosci(trudnoscDocelowa, skala);
  const poziomObecny = trudnoscObecna !== null ? poziomTrudnosci(trudnoscObecna, skala) : null;

  const celOsiagniety = poziomObecny !== null && poziomObecny >= poziomDocelowy;

  if (poziomDocelowy <= poziomStartowy) {
    // Cel na poziomie testu lub niżej - traktujemy jako już osiągnięty,
    // nie ma sensownego odcinka do pokazania na pasku.
    return {
      trudnoscStartowa,
      trudnoscObecna,
      trudnoscDocelowa,
      poziomStartowy,
      poziomObecny,
      poziomDocelowy,
      kroki: [trudnoscStartowa],
      procentPozycji: 100,
      celOsiagniety: true,
    };
  }

  const kroki = SKALA_KURTYKI.slice(poziomStartowy, poziomDocelowy + 1);

  let procentPozycji = 0;
  if (poziomObecny !== null) {
    const ograniczony = Math.max(poziomStartowy, Math.min(poziomDocelowy, poziomObecny));
    procentPozycji = ((ograniczony - poziomStartowy) / (poziomDocelowy - poziomStartowy)) * 100;
  }

  return {
    trudnoscStartowa,
    trudnoscObecna,
    trudnoscDocelowa,
    poziomStartowy,
    poziomObecny,
    poziomDocelowy,
    kroki,
    procentPozycji,
    celOsiagniety,
  };
}