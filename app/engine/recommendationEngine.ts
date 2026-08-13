import { WynikTrudnosci } from "./progressionEngine";
import { poziomTrudnosci, SKALA_KURTYKI, SkalaTrudnosci } from "./gradeEngine";

export type Rekomendacja = {
  tytul: string;
  opis: string;
};

export function generujRekomendacje(
  progresja: WynikTrudnosci[],
  skala: SkalaTrudnosci = "kurtyki"
): Rekomendacja[] {
  if (progresja.length === 0) {
    return [
      {
        tytul: "Zacznij od pierwszej sesji",
        opis: "Dodaj swoją pierwszą sesję w Logbooku, żeby zobaczyć tutaj spersonalizowane rekomendacje.",
      },
    ];
  }

  const rekomendacje: Rekomendacja[] = [];

  // 1. Trudności w statusie "projekt" — warto kontynuować
  const projekty = progresja.filter((w) => w.status === "projekt");
  if (projekty.length > 0) {
    const najlatwiejszyProjekt = projekty.reduce((a, b) =>
      poziomTrudnosci(a.trudnosc, skala) < poziomTrudnosci(b.trudnosc, skala) ? a : b
    );
    rekomendacje.push({
      tytul: `Kontynuuj pracę na ${najlatwiejszyProjekt.trudnosc}`,
      opis: `Masz na tym poziomie tylko ${najlatwiejszyProjekt.liczbaPrzejsc} przejście/a — kilka kolejnych prób pomoże przejść do statusu "Rozwijany".`,
    });
  }

  // 2. Najtrudniejszy opanowany poziom -> zasugeruj kolejny
  const opanowane = progresja.filter((w) => w.status === "opanowany");
  if (opanowane.length > 0) {
    const najtrudniejszyOpanowany = opanowane.reduce((a, b) =>
      poziomTrudnosci(a.trudnosc, skala) > poziomTrudnosci(b.trudnosc, skala) ? a : b
    );
    const indeksNastepnego = poziomTrudnosci(najtrudniejszyOpanowany.trudnosc, skala) + 1;
    const nastepnaTrudnosc = SKALA_KURTYKI[indeksNastepnego];

    if (nastepnaTrudnosc) {
      rekomendacje.push({
        tytul: `Spróbuj poziomu ${nastepnaTrudnosc}`,
        opis: `Masz opanowany poziom ${najtrudniejszyOpanowany.trudnosc} — czas na kolejne wyzwanie.`,
      });
    }
  }

  // 3. Gdyby powyższe nic nie zwróciły
  if (rekomendacje.length === 0) {
    rekomendacje.push({
      tytul: "Świetna robota!",
      opis: "Regularnie rejestruj przejścia, żeby rekomendacje były coraz trafniejsze.",
    });
  }

  return rekomendacje;
}