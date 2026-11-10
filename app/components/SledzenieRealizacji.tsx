"use client";

import { useState, useEffect } from "react";
import { supabase } from "../supabaseclient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { pobierzUstawienia } from "../engine/ustawieniaEngine";
import { Check, X } from "lucide-react";
import {
  zapewnijTydzien,
  poniedzialekISO,
  dodajDniISO,
  dataZISO,
  numerTygodniaISO,
  zakresTygodnia,
} from "../engine/planTygodniaEngine";

const DNI_TYGODNIA = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];
const KROK_HISTORII = 4;
const LICZBA_TYGODNI_DO_PRZODU = 3;

type Blok = {
  id: number;
  dzien_tygodnia: number;
  godzina_start: string;
  tytul: string;
  tydzien_start: string;
  linia_id: string;
  kategorie_treningowe: { nazwa: string; kolor: string } | null;
};

type Wykonanie = {
  id: number;
  blok_id: number;
  tydzien_start: string;
};

type Wiersz = {
  klucz: string;
  dzien: number;
  linia: string;
  tytul: string;
  godzinaStart: string;
  kolor: string;
};

function terminUplynal(blok: Blok, dniNaWykonanie: number): boolean {
  const termin = dataZISO(blok.tydzien_start);
  termin.setDate(termin.getDate() + blok.dzien_tygodnia + dniNaWykonanie);
  return new Date() > termin;
}

export default function SledzenieRealizacji() {
  const [bloki, setBloki] = useState<Blok[]>([]);
  const [wykonania, setWykonania] = useState<Wykonanie[]>([]);
  const [zapisaneTygodnie, setZapisaneTygodnie] = useState<Set<string>>(new Set());
  const [ladowanie, setLadowanie] = useState(true);
  const [bladPobierania, setBladPobierania] = useState("");
  const [pokazHistorie, setPokazHistorie] = useState(false);
  const [liczbaTygodniHistorii, setLiczbaTygodniHistorii] = useState(KROK_HISTORII);
  const [dniNaWykonanie, setDniNaWykonanie] = useState(7);

  useEffect(() => {
    zaladuj();
  }, []);

  async function zaladuj() {
    pobierzUstawienia().then((u) => setDniNaWykonanie(u.dni_na_wykonanie_bloku));
    try {
      await zapewnijTydzien(poniedzialekISO(new Date()));
    } catch (e) {
      console.error("Błąd przygotowania bieżącego tygodnia:", e);
      setBladPobierania("Nie udało się przygotować planu bieżącego tygodnia. Odśwież stronę.");
      setLadowanie(false);
      return;
    }

    const [blokiRes, wykonaniaRes, tygodnieRes] = await Promise.all([
      supabase
        .from("bloki_tygodniowe")
        .select(
          "id, dzien_tygodnia, godzina_start, tytul, tydzien_start, linia_id, kategorie_treningowe(nazwa, kolor)"
        )
        .not("tydzien_start", "is", null)
        .eq("pomijaj_w_realizacji", false),
      supabase.from("wykonania_blokow").select("id, blok_id, tydzien_start"),
      supabase.from("tygodnie_planu").select("tydzien_start"),
    ]);

    if (blokiRes.error || wykonaniaRes.error || tygodnieRes.error) {
      console.error(
        "Błąd pobierania:",
        blokiRes.error ?? wykonaniaRes.error ?? tygodnieRes.error
      );
      setBladPobierania("Nie udało się pobrać danych. Sprawdź połączenie i odśwież stronę.");
      setLadowanie(false);
      return;
    }

    setBloki(blokiRes.data as unknown as Blok[]);
    setWykonania(wykonaniaRes.data as Wykonanie[]);
    setZapisaneTygodnie(
      new Set((tygodnieRes.data ?? []).map((t) => t.tydzien_start as string))
    );
    setLadowanie(false);
  }

  async function przelaczWykonanie(blok: Blok) {
    const istniejace = wykonania.find((w) => w.blok_id === blok.id);

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
        .insert({ blok_id: blok.id, tydzien_start: blok.tydzien_start })
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

  const biezacy = poniedzialekISO(new Date());

  // Historia (jeśli rozwinięta) → bieżący tydzień → przyszłe tygodnie,
  // ale tylko te, które mają już własny plan.
  const tygodnie: string[] = [];

  if (pokazHistorie) {
    for (let i = liczbaTygodniHistorii; i >= 1; i--) {
      tygodnie.push(dodajDniISO(biezacy, -7 * i));
    }
  }

  tygodnie.push(biezacy);

  for (let i = 1; i <= LICZBA_TYGODNI_DO_PRZODU; i++) {
    const t = dodajDniISO(biezacy, 7 * i);
    if (zapisaneTygodnie.has(t)) tygodnie.push(t);
  }

  const pokazane = new Set(tygodnie);
  const blokiPokazane = bloki
    .filter((b) => pokazane.has(b.tydzien_start))
    .sort((a, b) => a.tydzien_start.localeCompare(b.tydzien_start));

  const mapaBlokow = new Map<string, Blok>();
  const mapaWierszy = new Map<string, Wiersz>();

  for (const b of blokiPokazane) {
    mapaBlokow.set(`${b.tydzien_start}|${b.linia_id}|${b.dzien_tygodnia}`, b);
    // Późniejszy tydzień nadpisuje nazwę, więc wiersz pokazuje najnowszą.
    mapaWierszy.set(`${b.dzien_tygodnia}|${b.linia_id}`, {
      klucz: `${b.dzien_tygodnia}|${b.linia_id}`,
      dzien: b.dzien_tygodnia,
      linia: b.linia_id,
      tytul: b.tytul,
      godzinaStart: b.godzina_start,
      kolor: b.kategorie_treningowe?.kolor ?? "#9ca3af",
    });
  }

  const wszystkieWiersze = Array.from(mapaWierszy.values());

  if (wszystkieWiersze.length === 0) {
    return (
      <p className="text-gray-500 py-5">
        Dodaj bloki w Harmonogramie tygodniowym, żeby zacząć śledzić ich realizację.
      </p>
    );
  }

  return (
    <Card className="p-4 overflow-x-auto">
      <div className="flex justify-end mb-3">
        <Button variant="outline" size="sm" onClick={() => setPokazHistorie(!pokazHistorie)}>
          {pokazHistorie ? "Ukryj historię" : "Pokaż historię"}
        </Button>
      </div>

      <table className="text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left p-2 border-b border-gray-200 sticky left-0 bg-white">Dzień</th>
            <th className="text-left p-2 border-b border-gray-200">Aktywność</th>
            {tygodnie.map((t) => (
              <th key={t} className="p-2 border-b border-gray-200 text-center min-w-[90px]">
                <div>
                  T{numerTygodniaISO(dataZISO(t))}
                  {t === biezacy && <span className="text-blue-600"> · dziś</span>}
                </div>
                <div className="text-xs font-normal text-gray-400">{zakresTygodnia(t)}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DNI_TYGODNIA.map((nazwaDnia, dzienIndex) => {
            const wierszeDnia = wszystkieWiersze
              .filter((w) => w.dzien === dzienIndex)
              .sort((a, b) => a.godzinaStart.localeCompare(b.godzinaStart));
            if (wierszeDnia.length === 0) return null;

            const tloParzyste = dzienIndex % 2 === 0 ? "bg-white" : "bg-gray-50";

            return wierszeDnia.map((wiersz, i) => (
              <tr key={wiersz.klucz} className={tloParzyste}>
                {i === 0 && (
                  <td
                    rowSpan={wierszeDnia.length}
                    className={`p-2 border-t-2 border-gray-300 align-top font-bold text-gray-700 sticky left-0 ${tloParzyste}`}
                  >
                    {nazwaDnia}
                  </td>
                )}
                <td className={`p-2 ${i === 0 ? "border-t-2 border-gray-300" : "border-t border-gray-100"}`}>
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: wiersz.kolor }}
                  />
                  {wiersz.tytul}
                </td>
                {tygodnie.map((t) => {
                  const blok = mapaBlokow.get(`${t}|${wiersz.linia}|${wiersz.dzien}`);
                  const wykonano = blok ? wykonania.some((w) => w.blok_id === blok.id) : false;
                  const przegapiony = blok ? !wykonano && terminUplynal(blok, dniNaWykonanie) : false;

                  return (
                    <td
                      key={t}
                      className={`p-2 text-center ${i === 0 ? "border-t-2 border-gray-300" : "border-t border-gray-100"}`}
                    >
                      {blok ? (
                        <button
                          onClick={() => przelaczWykonanie(blok)}
                          title={przegapiony ? "Termin minął — nie oznaczono jako wykonane" : undefined}
                          className={`w-6 h-6 rounded-md border flex items-center justify-center mx-auto transition-colors ${
                            wykonano
                              ? "bg-green-600 border-green-600 text-white"
                              : przegapiony
                              ? "bg-red-50 border-red-300 text-red-500 hover:border-red-400"
                              : "border-gray-300 hover:border-gray-400"
                          }`}
                        >
                          {wykonano ? <Check size={14} /> : przegapiony ? <X size={14} /> : null}
                        </button>
                      ) : (
                        <div
                          className="w-6 h-6 flex items-center justify-center mx-auto text-gray-300"
                          title="Tego bloku nie było w planie tego tygodnia"
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