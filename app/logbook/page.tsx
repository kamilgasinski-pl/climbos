"use client";

import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "../supabaseclient";
import { najtrudniejszaOcena } from "../engine/gradeEngine";
import { policzProgresje, policzProgresjeWCzasie, policzAktywnoscWCzasie } from "../engine/progressionEngine";
import PasekTrudnosci from "../components/PasekTrudnosci";
import WykresProgresji from "../components/WykresProgresji";
import WykresAktywnosci from "../components/WykresAktywnosci";
import Link from "next/link";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";

type Przejscie = {
  id: number;
  nazwa_drogi: string;
  trudnosc: string;
  styl: string;
};

type Sesja = {
  id: number;
  data_treningu: string;
  miejsce: string;
  czas_trwania_min: number;
  przejscia: Przejscie[];
};

export default function Logbook() {
  const [sesje, setSesje] = useState<Sesja[]>([]);
  const [bladPobierania, setBladPobierania] = useState("");
  const [ladowanie, setLadowanie] = useState(true);
  const [rozwinieteSesje, setRozwinieteSesje] = useState<Set<number>>(new Set());

  useEffect(() => {
    pobierzDane();
  }, []);

  async function pobierzDane() {
    const { data, error } = await supabase
      .from("sesje")
      .select("*, przejscia(*)")
      .order("data_treningu", { ascending: false });

    if (error) {
      console.error("Błąd pobierania:", error);
      setBladPobierania("Nie udało się pobrać danych. Sprawdź połączenie i odśwież stronę.");
      setLadowanie(false);
      return;
    }
    setSesje(data as Sesja[]);
    setLadowanie(false);
  }

  function przelaczRozwiniecie(id: number) {
    setRozwinieteSesje((poprzednie) => {
      const nowe = new Set(poprzednie);
      if (nowe.has(id)) {
        nowe.delete(id);
      } else {
        nowe.add(id);
      }
      return nowe;
    });
  }

  const wszystkiePrzejscia = sesje.flatMap((s) => s.przejscia);
  const calkowitaLiczbaPrzejsc = wszystkiePrzejscia.length;

  const ocenyRP = wszystkiePrzejscia.filter((p) => p.styl === "RP").map((p) => p.trudnosc);
  const ocenyOS = wszystkiePrzejscia.filter((p) => p.styl === "OS").map((p) => p.trudnosc);

  const najtrudniejszaRP = najtrudniejszaOcena(ocenyRP) ?? "—";
  const najtrudniejszaOS = najtrudniejszaOcena(ocenyOS) ?? "—";

  const progresja = policzProgresje(wszystkiePrzejscia);
  const progresjaWCzasie = policzProgresjeWCzasie(sesje);
  const aktywnoscWCzasie = policzAktywnoscWCzasie(sesje);

  return (
    <main className="p-10 font-sans">
      <h1 className="text-3xl font-bold">Logbook</h1>

      {ladowanie ? (
        <div className="flex items-center gap-2 text-gray-500 mt-8">
          <Loader2 className="animate-spin" size={20} />
          Ładowanie danych...
        </div>
      ) : bladPobierania ? (
        <p className="text-red-600 mt-8">{bladPobierania}</p>
      ) : (
        <>
          <h2 className="text-xl font-bold mt-5">Progresja w czasie</h2>
          <Card className="p-4">
            <WykresProgresji dane={progresjaWCzasie} />
          </Card>

          <h2 className="text-xl font-bold mt-8">Aktywność</h2>
          <Card className="p-4">
            <WykresAktywnosci dane={aktywnoscWCzasie} />
          </Card>

          <Card className="flex gap-10 mt-5 p-5">
            <div>
              <div className="text-gray-500 text-sm">Najtrudniejsza RP</div>
              <div className="text-xl font-bold">{najtrudniejszaRP}</div>
            </div>
            <div>
              <div className="text-gray-500 text-sm">Najtrudniejsza OS</div>
              <div className="text-xl font-bold">{najtrudniejszaOS}</div>
            </div>
            <div>
              <div className="text-gray-500 text-sm">Całkowita liczba przejść</div>
              <div className="text-xl font-bold">{calkowitaLiczbaPrzejsc}</div>
            </div>
          </Card>

          <h2 className="text-xl font-bold mt-8">Historia sesji</h2>
          <ul className="list-none p-0">
            {sesje.map((s) => {
              const liczbaDrog = s.przejscia.length;
              const oceny = s.przejscia.map((p) => p.trudnosc);
              const najtrudniejszaWSesji = najtrudniejszaOcena(oceny) ?? "—";
              const rozwinieta = rozwinieteSesje.has(s.id);

              return (
                <li key={s.id}>
                  <Card className="p-3.5">
                    <div className="flex flex-row items-center justify-between">
                      <div>
                        <strong>{s.miejsce}</strong> — {s.data_treningu}
                        <div className="text-gray-500 text-sm">
                          {liczbaDrog} {liczbaDrog === 1 ? "droga" : "dróg"} · najtrudniejsza:{" "}
                          {najtrudniejszaWSesji}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => przelaczRozwiniecie(s.id)}
                          className="p-2 text-gray-500 hover:text-gray-800 transition-colors"
                        >
                          {rozwinieta ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                        <Link
                          href={`/sesje/${s.id}`}
                          className={buttonVariants({ variant: "outline" })}
                        >
                          Zobacz szczegóły
                        </Link>
                      </div>
                    </div>

                    {rozwinieta && (
                      <div className="mt-3 pt-3 border-t border-gray-200 flex flex-col gap-2">
                        {s.przejscia.length === 0 ? (
                          <p className="text-gray-500 text-sm">Brak dróg w tej sesji.</p>
                        ) : (
                          s.przejscia.map((p) => (
                            <div key={p.id} className="flex items-center gap-4 text-sm">
                              <strong>{p.nazwa_drogi}</strong>
                              <span className="text-gray-500">{p.trudnosc}</span>
                              <span className="text-gray-500">{p.styl}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>

          <h2 className="text-xl font-bold mt-8">Progresja na skali Kurtyki</h2>
          <Card className="px-4 py-2">
            {progresja.map((w) => (
              <PasekTrudnosci key={w.trudnosc} wynik={w} />
            ))}
          </Card>
        </>
      )}
    </main>
  );
}