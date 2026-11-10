"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../supabaseclient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { najtrudniejszaOcena, liczySieDoProgresji } from "../engine/gradeEngine";
import { minutyNaHHMM } from "../engine/czasEngine";

type Przejscie = {
  id: number;
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
  typ_sesji: "sportowa" | "bouldering" | "mix" | null;
  przejscia: Przejscie[];
};

type MiesiacGrupa = {
  klucz: string; // "2026-11"
  etykieta: string; // "Listopad 2026"
  sesje: Sesja[];
};

function dzisiajISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function etykietaMiesiaca(klucz: string): string {
  const [rok, miesiac] = klucz.split("-").map(Number);
  const tekst = new Date(rok, miesiac - 1, 1).toLocaleDateString("pl-PL", {
    month: "long",
    year: "numeric",
  });
  return tekst.charAt(0).toUpperCase() + tekst.slice(1);
}

function sredniaZaokraglona(wartosci: number[]): number | null {
  if (wartosci.length === 0) return null;
  return Math.round(wartosci.reduce((suma, w) => suma + w, 0) / wartosci.length);
}

function sredniaZJednymMiejscem(wartosci: number[]): string | null {
  if (wartosci.length === 0) return null;
  const srednia = wartosci.reduce((suma, w) => suma + w, 0) / wartosci.length;
  return srednia.toFixed(1).replace(".", ",");
}

function etykietaTypu(typ: Sesja["typ_sesji"]): string {
  if (typ === "bouldering") return "Bouldering";
  if (typ === "mix") return "50:50";
  return "Wspinaczka";
}

function Kafelek({ etykieta, wartosc }: { etykieta: string; wartosc: string }) {
  return (
    <div>
      <div className="text-gray-500 text-xs">{etykieta}</div>
      <div className="text-lg font-bold">{wartosc}</div>
    </div>
  );
}

export default function PodsumowanieTreningow() {
  const [sesje, setSesje] = useState<Sesja[]>([]);
  const [ladowanie, setLadowanie] = useState(true);
  const [blad, setBlad] = useState("");
  const [wybranyKlucz, setWybranyKlucz] = useState("");

  useEffect(() => {
    async function pobierz() {
      const { data, error } = await supabase
        .from("sesje")
        .select("*, przejscia(*)")
        .order("data_treningu", { ascending: false });

      if (error) {
        console.error("Błąd pobierania podsumowania treningów:", error);
        setBlad("Nie udało się pobrać podsumowania treningów.");
        setLadowanie(false);
        return;
      }

      // Do podsumowania liczą się sesje, które już się odbyły (bez zaplanowanych w przyszłości).
      const dzisiaj = dzisiajISO();
      const odbyte = (data as Sesja[]).filter((s) => s.data_treningu.slice(0, 10) <= dzisiaj);
      setSesje(odbyte);

      // Na start pokazujemy najnowszy miesiąc.
      if (odbyte.length > 0) setWybranyKlucz(odbyte[0].data_treningu.slice(0, 7));
      setLadowanie(false);
    }
    pobierz();
  }, []);

  // Miesiące od najnowszego do najstarszego.
  const miesiace: MiesiacGrupa[] = [];
  for (const sesja of sesje) {
    const klucz = sesja.data_treningu.slice(0, 7);
    let grupa = miesiace.find((m) => m.klucz === klucz);
    if (!grupa) {
      grupa = { klucz, etykieta: etykietaMiesiaca(klucz), sesje: [] };
      miesiace.push(grupa);
    }
    grupa.sesje.push(sesja);
  }

  const indeks = Math.max(
    0,
    miesiace.findIndex((m) => m.klucz === wybranyKlucz)
  );
  const m = miesiace[indeks];

  function przesun(kierunek: -1 | 1) {
    const nowy = miesiace[indeks + kierunek];
    if (nowy) setWybranyKlucz(nowy.klucz);
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold">Podsumowanie treningów</h2>
      <p className="text-gray-500 text-sm mb-3">Wybierz miesiąc, żeby zobaczyć podsumowanie Twoich sesji</p>

      {ladowanie ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="animate-spin" size={18} />
          Ładowanie...
        </div>
      ) : blad ? (
        <p className="text-red-600 text-sm">{blad}</p>
      ) : !m ? (
        <p className="text-gray-400 text-sm">
          Brak odbytych sesji — dodaj pierwszą, żeby zobaczyć podsumowanie.
        </p>
      ) : (
        <Card className="p-4">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Strzałka w lewo = starszy miesiąc (lista jest od najnowszego) */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => przesun(1)}
              disabled={indeks >= miesiace.length - 1}
              aria-label="Starszy miesiąc"
            >
              <ChevronLeft size={16} />
            </Button>

            <Select value={m.klucz} onValueChange={(v) => v && setWybranyKlucz(v)}>
              <SelectTrigger className="w-[220px]">
                <span>{m.etykieta}</span>
              </SelectTrigger>
              <SelectContent>
                {miesiace.map((mies) => (
                  <SelectItem key={mies.klucz} value={mies.klucz}>
                    {mies.etykieta}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => przesun(-1)}
              disabled={indeks <= 0}
              aria-label="Nowszy miesiąc"
            >
              <ChevronRight size={16} />
            </Button>
          </div>

          <Podsumowanie miesiac={m} />
        </Card>
      )}
    </div>
  );
}

function Podsumowanie({ miesiac }: { miesiac: MiesiacGrupa }) {
  const czasMin = miesiac.sesje.reduce((suma, s) => suma + s.czas_trwania_min, 0);
  const wszystkiePrzejscia = miesiac.sesje.flatMap((s) => s.przejscia);
  const ukonczone = wszystkiePrzejscia.filter((p) => liczySieDoProgresji(p));
  const najtrudniejsza = (styl: string) =>
    najtrudniejszaOcena(ukonczone.filter((p) => p.styl === styl).map((p) => p.trudnosc));

  const kalorie = miesiac.sesje.map((s) => s.kalorie_spalone).filter((k): k is number => k != null);
  const bpm = miesiac.sesje.map((s) => s.srednie_bpm).filter((b): b is number => b != null);
  const rpe = miesiac.sesje.map((s) => s.rpe).filter((r): r is number => r != null);

  const typy = miesiac.sesje.reduce<Record<string, number>>((akumulator, s) => {
    const etykieta = etykietaTypu(s.typ_sesji);
    akumulator[etykieta] = (akumulator[etykieta] ?? 0) + 1;
    return akumulator;
  }, {});

  return (
    <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col gap-4">
      <div className="flex gap-x-8 gap-y-3 flex-wrap">
        <Kafelek etykieta="Sesje" wartosc={String(miesiac.sesje.length)} />
        <Kafelek etykieta="Łączny czas" wartosc={minutyNaHHMM(czasMin)} />
        <Kafelek etykieta="Drogi" wartosc={String(wszystkiePrzejscia.length)} />
        <Kafelek etykieta="Najtrudniejsza OS" wartosc={najtrudniejsza("OS") ?? "—"} />
        <Kafelek etykieta="Najtrudniejsza RP" wartosc={najtrudniejsza("RP") ?? "—"} />
        <Kafelek etykieta="Najtrudniejsza Wędka" wartosc={najtrudniejsza("Wędka") ?? "—"} />
      </div>

      {(kalorie.length > 0 || bpm.length > 0 || rpe.length > 0) && (
        <div className="flex gap-x-8 gap-y-3 flex-wrap">
          {kalorie.length > 0 && (
            <Kafelek
              etykieta="🔥 Kalorie łącznie"
              wartosc={`${kalorie.reduce((s, k) => s + k, 0)} kcal`}
            />
          )}
          {bpm.length > 0 && (
            <Kafelek etykieta="❤️ Średnie BPM" wartosc={String(sredniaZaokraglona(bpm))} />
          )}
          {rpe.length > 0 && (
            <Kafelek etykieta="⚡ Średnie RPE" wartosc={sredniaZJednymMiejscem(rpe) ?? "—"} />
          )}
        </div>
      )}

      <div className="text-gray-500 text-sm">
        {Object.entries(typy)
          .map(([typ, liczba]) => `${typ}: ${liczba}`)
          .join(" · ")}
      </div>

      <div className="flex flex-col gap-1">
        {miesiac.sesje.map((s) => (
          <Link
            key={s.id}
            href={`/sesje/${s.id}`}
            className="flex items-center gap-3 text-sm rounded-md px-2 py-1.5 hover:bg-gray-50"
          >
            <span className="text-gray-400 w-[86px] shrink-0">{s.data_treningu.slice(0, 10)}</span>
            <span className="font-medium">{s.miejsce}</span>
            <span className="text-gray-400">
              {minutyNaHHMM(s.czas_trwania_min)} · {s.przejscia.length}{" "}
              {s.przejscia.length === 1 ? "droga" : "dróg"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}