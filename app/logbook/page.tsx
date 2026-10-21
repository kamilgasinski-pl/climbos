"use client";

import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "../supabaseclient";
import {
  policzProgresjeProsta,
  policzProgresjeWCzasiePoStylu,
  policzAktywnoscWCzasie,
  policzIntensywnoscBoulderingu,
} from "../engine/progressionEngine";
import PasekTrudnosciProsty from "../components/PasekTrudnosciProsty";
import WykresProgresjiStylow from "../components/WykresProgresjiStylow";
import WykresAktywnosci from "../components/WykresAktywnosci";
import WyborTypuSesji, { TypSesji } from "../components/WyborTypuSesji";
import Link from "next/link";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { najtrudniejszaOcena, czyUkonczonaWCalosci, liczySieDoProgresji } from "../engine/gradeEngine";

type Przejscie = {
  id: number;
  nazwa_drogi: string;
  trudnosc: string;
  styl: string;
  stopien_ukonczenia: string;
  blok: boolean;
};

type Sesja = {
  id: number;
  data_treningu: string;
  miejsce: string;
  czas_trwania_min: number;
  kalorie_spalone: number | null;
  srednie_bpm: number | null;
  rpe: number | null;
  typ_sesji: TypSesji | null;
  przejscia: Przejscie[];
};

export default function Logbook() {
  const [sesje, setSesje] = useState<Sesja[]>([]);
  const [bladPobierania, setBladPobierania] = useState("");
  const [ladowanie, setLadowanie] = useState(true);
  const [rozwinieteSesje, setRozwinieteSesje] = useState<Set<number>>(new Set());
  const [widokAktywnosci, setWidokAktywnosci] = useState<TypSesji>("sportowa");

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

  const przejsciaUkonczone = wszystkiePrzejscia.filter((p) => czyUkonczonaWCalosci(p.stopien_ukonczenia));

  const ocenyRP = przejsciaUkonczone.filter((p) => p.styl === "RP").map((p) => p.trudnosc);
  const ocenyOS = przejsciaUkonczone.filter((p) => p.styl === "OS").map((p) => p.trudnosc);
  const ocenyWedka = przejsciaUkonczone.filter((p) => p.styl === "Wędka").map((p) => p.trudnosc);

  const najtrudniejszaRP = najtrudniejszaOcena(ocenyRP) ?? "—";
  const najtrudniejszaOS = najtrudniejszaOcena(ocenyOS) ?? "—";
  const najtrudniejszaWedka = najtrudniejszaOcena(ocenyWedka) ?? "—";

  const liczbaWedka = wszystkiePrzejscia.filter((p) => p.styl === "Wędka").length;
  const liczbaZDolem = wszystkiePrzejscia.filter(
    (p) => p.styl === "OS" || p.styl === "RP" || p.styl === "Projekt"
  ).length;

  const progresja = policzProgresjeProsta(przejsciaUkonczone);
  const sesjeUkonczone = sesje.map((s) => ({
    ...s,
    przejscia: s.przejscia.filter((p) => czyUkonczonaWCalosci(p.stopien_ukonczenia)),
  }));
  const progresjaWCzasie = policzProgresjeWCzasiePoStylu(sesjeUkonczone);

  const sesjeSportowe = sesje.filter((s) => s.typ_sesji !== "bouldering");
    const sesjeBoulderingu = sesje.filter(
    (s) => s.typ_sesji === "bouldering" || s.typ_sesji === "mix"
  );
  const aktywnoscSportowa = policzAktywnoscWCzasie(sesjeSportowe).map((p) => ({
    data: p.data,
    wartosc: p.liczbaPrzejsc,
  }));
  const aktywnoscBoulderingu = policzIntensywnoscBoulderingu(sesjeBoulderingu);

  return (
    <main className="p-10 font-sans">
            <h1 className="text-3xl font-bold">Logbook</h1>
      <p className="text-gray-500">Twoja progresja w czasie</p>

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
            <WykresProgresjiStylow dane={progresjaWCzasie} />
          </Card>

          <div className="flex items-center justify-between mt-8 mb-3">
            <h2 className="text-xl font-bold">Aktywność</h2>
            <WyborTypuSesji wartosc={widokAktywnosci} zmienTypAction={setWidokAktywnosci} />
          </div>
          <Card className="p-4">
            {widokAktywnosci === "bouldering" ? (
              <WykresAktywnosci dane={aktywnoscBoulderingu} jednostka="pkt (czas × RPE)" kolor="#9333ea" />
            ) : (
              <WykresAktywnosci dane={aktywnoscSportowa} jednostka="dróg" />
            )}
          </Card>

          <Card className="flex gap-10 mt-5 p-5 flex-wrap">
            <div>
              <div className="text-gray-500 text-sm">Najtrudniejsza OS</div>
              <div className="text-xl font-bold">{najtrudniejszaOS}</div>
            </div>
            <div>
              <div className="text-gray-500 text-sm">Najtrudniejsza RP</div>
              <div className="text-xl font-bold">{najtrudniejszaRP}</div>
            </div>
            <div>
              <div className="text-gray-500 text-sm">Najtrudniejsza Wędka</div>
              <div className="text-xl font-bold">{najtrudniejszaWedka}</div>
            </div>
            <div>
              <div className="text-gray-500 text-sm">Łącznie przejść Wędka</div>
              <div className="text-xl font-bold">{liczbaWedka}</div>
            </div>
            <div>
              <div className="text-gray-500 text-sm">Łącznie przejść z dołem</div>
              <div className="text-xl font-bold">{liczbaZDolem}</div>
            </div>
            <div>
              <div className="text-gray-500 text-sm">Łączna liczba przejść</div>
              <div className="text-xl font-bold">{calkowitaLiczbaPrzejsc}</div>
            </div>
          </Card>

          <h2 className="text-xl font-bold mt-8">Historia sesji</h2>
          <ul className="list-none p-0">
            {sesje.map((s) => {
              const liczbaDrog = s.przejscia.length;
              const oceny = s.przejscia
              .filter((p) => liczySieDoProgresji(p))
              .map((p) => p.trudnosc);
              const najtrudniejszaWSesji = najtrudniejszaOcena(oceny) ?? "—";
              const rozwinieta = rozwinieteSesje.has(s.id);

              return (
                <li key={s.id}>
                  <Card className="p-3.5">
                    <div className="flex flex-row items-center justify-between">
                                            <div>
                        <strong>{s.data_treningu}</strong> — {s.miejsce}{" "}
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 align-middle">
                          {s.typ_sesji === "bouldering" ? "Bouldering" : s.typ_sesji === "mix" ? "50:50" : "Wspinaczka"}
                        </span>{" "}
                        <span className="text-gray-500">
                          ({s.czas_trwania_min} min
                          {s.kalorie_spalone != null && ` · 🔥 ${s.kalorie_spalone} kcal`}
                          {s.srednie_bpm != null && ` · ❤️ ${s.srednie_bpm} bpm`}
                          {s.rpe != null && ` · ⚡ RPE ${s.rpe}`})
                        </span>
                        <div className="text-gray-500 text-sm mt-0.5">
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
                              {!czyUkonczonaWCalosci(p.stopien_ukonczenia) && (
  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
    {p.stopien_ukonczenia} drogi
  </span>
)}
{p.blok && (
  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
    Blok
  </span>
)}
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
              <PasekTrudnosciProsty key={w.trudnosc} wynik={w} />
            ))}
          </Card>
        </>
      )}
    </main>
  );
}