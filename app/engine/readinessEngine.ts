import { WynikTrudnosci } from "./progressionEngine";

/**
 * Waga punktowa przypisana do każdego statusu — im wyżej opanowany
 * poziom, tym więcej "punktów gotowości" wnosi do ogólnego wyniku.
 */
const WAGA_STATUSU: Record<string, number> = {
  nieosiagniety: 0,
  projekt: 3,
  rozwijany: 7,
  opanowany: 10,
};

/**
 * Liczy ogólny wskaźnik Climbing Readiness (0-100) na podstawie
 * progresji na wszystkich trudnościach, na których użytkownik
 * ma jakiekolwiek przejścia.
 */
export function policzReadiness(progresja: WynikTrudnosci[]): number {
  if (progresja.length === 0) return 0;

  const sumaPunktow = progresja.reduce((suma, w) => suma + WAGA_STATUSU[w.status], 0);
  const maksymalnaMozliwaSuma = progresja.length * 10;

  const procent = (sumaPunktow / maksymalnaMozliwaSuma) * 100;
  return Math.round(procent);
}

/**
 * Zwraca krótki, czytelny opis poziomu gotowości — do wyświetlenia
 * obok samej liczby.
 */
export function opisReadiness(readiness: number): string {
  if (readiness >= 80) return "Świetna forma";
  if (readiness >= 60) return "Dobra gotowość";
  if (readiness >= 40) return "Umiarkowana gotowość";
  if (readiness >= 20) return "Wczesny etap rozwoju";
  return "Za mało danych lub początek drogi";
}