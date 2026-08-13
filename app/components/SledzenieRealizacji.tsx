"use client";

import { useState, useEffect } from "react";
import { supabase } from "../supabaseclient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const DNI_TYGODNIA = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];
const KROK_HISTORII = 4;
const LICZBA_TYGODNI_DO_PRZODU = 3;

type Blok = {
  id: number;
  dzien_tygodnia: number;
  tytul: string;
  created_at: string;
  kategorie_treningowe: { nazwa: string; kolor: string } | null;
};

type Wykonanie = {
  id: number;
  blok_id: number;
  tydzien_start: string;
};

function poniedzialekTygodnia(data: Date): Date {
  const kopia = new Date(data);
  const dzienTygodnia = kopia.getDay();
  const przesuniecie = dzienTygodnia === 0 ? -6 : 1 - dzienTygodnia;
  kopia.setDate(kopia.getDate() + przesuniecie);
  kopia.setHours(0, 0, 0, 0);
  return kopia;
}

function toISODate(data: Date): string {
  return data.toISOString().split("T")[0];
}

function formatujKrotko(data: Date): string {
  const dzien = String(data.getDate()).padStart(2, "0");
  const miesiac = String(data.getMonth() + 1).padStart(2, "0");
  return `${dzien}.${miesiac}`;
}

function formatujZakresTygodnia(poniedzialek: Date): string {
  const niedziela = new Date(poniedzialek);
  niedziela.setDate(niedziela.getDate() + 6);
  return `${formatujKrotko(poniedzialek)}-${formatujKrotko(niedziela)}`;
}

function blokIstnialWTygodniu(blok: Blok, tydzienStart: Date): boolean {
  const tydzienUtworzenia = poniedzialekTygodnia(new Date(blok.created_at));
  return tydzienUtworzenia.getTime() <= tydzienStart.getTime();
}

/**
 * Numer tygodnia wg ISO 8601 — tydzień z czwartkiem wyznacza, do którego
 * roku należy (rok ma 52 lub 53 tygodnie, tydzień 1 to ten zawierający
 * pierwszy czwartek roku).
 */
function numerTygodniaISO(data: Date): number {
  const d = new Date(Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()));
  const dzienTygodnia = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dzienTygodnia);
  const poczatekRoku = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - poczatekRoku.getTime()) / 86400000 + 1) / 7);
}

export default function SledzenieRealizacji() {
  const [bloki, setBloki] = useState<Blok[]>([]);
  const [wykonania, setWykonania] = useState<Wykonanie[]>([]);
  const [ladowanie, setLadowanie] = useState(true);
  const [bladPobierania, setBladPobierania] = useState("");
  const [pokazHistorie, setPokazHistorie] = useState(false);
  const [liczbaTygodniHistorii, setLiczbaTygodniHistorii] = useState(KROK_HISTORII);

  useEffect(() => {
    pobierzDane();
  }, []);

  async function pobierzDane() {
    const [blokiRes, wykonaniaRes] = await Promise.all([
      supabase
        .from("bloki_tygodniowe")
        .select("id, dzien_tygodnia, tytul, created_at, kategorie_treningowe(nazwa, kolor)")
        .order("dzien_tygodnia", { ascending: true }),
      supabase.from("wykonania_blokow").select("id, blok_id, tydzien_start"),
    ]);

    if (blokiRes.error || wykonaniaRes.error) {
      console.error("Błąd pobierania:", blokiRes.error ?? wykonaniaRes.error);
      setBladPobierania("Nie udało się pobrać danych. Sprawdź połączenie i odśwież stronę.");
      setLadowanie(false);
      return;
    }

    setBloki(blokiRes.data as unknown as Blok[]);
    setWykonania(wykonaniaRes.data as Wykonanie[]);
    setLadowanie(false);
  }

  async function przelaczWykonanie(blokId: number, tydzienStart: string) {
    const istniejace = wykonania.find(
      (w) => w.blok_id === blokId && w.tydzien_start === tydzienStart
    );

    if (istniejace) {
      const { error } = await supabase.from("wykonania_blokow").delete().eq("id", istniejace.id);
      if (error) {
        console.error("Błąd usuwania wykonania:", error);
        setBladPobierania("Nie udało się zaktualizować. Spróbuj ponownie.");
        return;
      }
      setWykonania((poprzednie) => poprzednie.filter((w) => w.id !== istniejace.id));
    } else {
      const { data, error } = await supabase
        .from("wykonania_blokow")
        .insert({ blok_id: blokId, tydzien_start: tydzienStart })
        .select()
        .single();

      if (error) {
        console.error("Błąd zapisu wykonania:", error);
        setBladPobierania("Nie udało się zaktualizować. Spróbuj ponownie.");
        return;
      }
      setWykonania((poprzednie) => [...poprzednie, data as Wykonanie]);
    }
  }

  if (ladowanie) return <p className="text-gray-500">Ładowanie...</p>;
  if (bladPobierania) return <p className="text-red-600">{bladPobierania}</p>;

  if (bloki.length === 0) {
    return (
      <p className="text-gray-500 py-5">
        Dodaj bloki w Harmonogramie tygodniowym, żeby zacząć śledzić ich realizację.
      </p>
    );
  }

  const dzisiejszyPoniedzialek = poniedzialekTygodnia(new Date());

  // Bieżący tydzień zawsze pierwszy; historia (poprzednie tygodnie,
  // od najnowszego do najstarszego) dołączana tylko gdy rozwinięta.
 const tygodnie: Date[] = [];

  if (pokazHistorie) {
    for (let i = liczbaTygodniHistorii; i >= 1; i--) {
      const dzien = new Date(dzisiejszyPoniedzialek);
      dzien.setDate(dzien.getDate() - i * 7);
      tygodnie.push(dzien);
    }
  }

  tygodnie.push(dzisiejszyPoniedzialek);

  for (let i = 1; i <= LICZBA_TYGODNI_DO_PRZODU; i++) {
    const dzien = new Date(dzisiejszyPoniedzialek);
    dzien.setDate(dzien.getDate() + i * 7);
    tygodnie.push(dzien);
  }

  return (
    <Card className="p-4 overflow-x-auto">
      <div className="flex justify-end mb-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPokazHistorie(!pokazHistorie)}
        >
          {pokazHistorie ? "Ukryj historię" : "Pokaż historię"}
        </Button>
      </div>

      <table className="text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left p-2 border-b border-gray-200 sticky left-0 bg-white">Dzień</th>
            <th className="text-left p-2 border-b border-gray-200">Aktywność</th>
            {tygodnie.map((t) => (
              <th key={toISODate(t)} className="p-2 border-b border-gray-200 text-center min-w-[90px]">
                <div>
                  T{numerTygodniaISO(t)}
                  {t.getTime() === dzisiejszyPoniedzialek.getTime() && (
                    <span className="text-blue-600"> · dziś</span>
                  )}
                </div>
                <div className="text-xs font-normal text-gray-400">{formatujZakresTygodnia(t)}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DNI_TYGODNIA.map((nazwaDnia, dzienIndex) => {
            const blokiDnia = bloki.filter((b) => b.dzien_tygodnia === dzienIndex);
            if (blokiDnia.length === 0) return null;

            const tloParzyste = dzienIndex % 2 === 0 ? "bg-white" : "bg-gray-50";

            return blokiDnia.map((blok, i) => (
              <tr key={blok.id} className={tloParzyste}>
                {i === 0 && (
                  <td
                    rowSpan={blokiDnia.length}
                    className={`p-2 border-t-2 border-gray-300 align-top font-bold text-gray-700 sticky left-0 ${tloParzyste}`}
                  >
                    {nazwaDnia}
                  </td>
                )}
                <td className={`p-2 ${i === 0 ? "border-t-2 border-gray-300" : "border-t border-gray-100"}`}>
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: blok.kategorie_treningowe?.kolor ?? "#9ca3af" }}
                  />
                  {blok.tytul}
                </td>
                {tygodnie.map((t) => {
                  const tydzienStart = toISODate(t);
                  const istnial = blokIstnialWTygodniu(blok, t);
                  const wykonano = wykonania.some(
                    (w) => w.blok_id === blok.id && w.tydzien_start === tydzienStart
                  );
                  return (
                    <td
                      key={tydzienStart}
                      className={`p-2 text-center ${i === 0 ? "border-t-2 border-gray-300" : "border-t border-gray-100"}`}
                    >
                      {istnial ? (
                        <button
                          onClick={() => przelaczWykonanie(blok.id, tydzienStart)}
                          className={`w-6 h-6 rounded-md border flex items-center justify-center mx-auto transition-colors ${
                            wykonano
                              ? "bg-green-600 border-green-600 text-white"
                              : "border-gray-300 hover:border-gray-400"
                          }`}
                        >
                          {wykonano && <Check size={14} />}
                        </button>
                      ) : (
                        <div
                          className="w-6 h-6 flex items-center justify-center mx-auto text-gray-300"
                          title="Blok jeszcze nie istniał w tym tygodniu"
                        >
                          —
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ));
          })}
        </tbody>
      </table>

      {pokazHistorie && (
        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            onClick={() => setLiczbaTygodniHistorii((n) => Math.max(KROK_HISTORII, n - KROK_HISTORII))}
            disabled={liczbaTygodniHistorii <= KROK_HISTORII}
          >
            Pokaż mniej historii
          </Button>
          <Button
            variant="outline"
            onClick={() => setLiczbaTygodniHistorii((n) => n + KROK_HISTORII)}
          >
            Pokaż więcej historii
          </Button>
        </div>
      )}
    </Card>
  );
}