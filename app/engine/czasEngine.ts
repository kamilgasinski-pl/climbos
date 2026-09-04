/**
 * Konwertuje liczbę minut na format GG:MM, np. 84 -> "01:24".
 */
export function minutyNaHHMM(minuty: number): string {
  const godziny = Math.floor(minuty / 60);
  const reszta = minuty % 60;
  return `${String(godziny).padStart(2, "0")}:${String(reszta).padStart(2, "0")}`;
}

/**
 * Parsuje tekst w formacie GG:MM na liczbę minut. Zwraca null,
 * jeśli format jest niepoprawny (np. minuty >= 60 albo zły zapis).
 */
export function hhmmNaMinuty(tekst: string): number | null {
  const dopasowanie = tekst.trim().match(/^(\d{1,3}):(\d{2})$/);
  if (!dopasowanie) return null;

  const godziny = Number(dopasowanie[1]);
  const minuty = Number(dopasowanie[2]);
  if (minuty >= 60) return null;

  return godziny * 60 + minuty;
}