"use client";

import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "./supabaseclient";
import { najtrudniejszaOcena } from "./engine/gradeEngine";
import {
  policzKompetencje,
  policzKompetencjeZTreningu,
  policzKompetencjeZCelowSesji,
  polaczKompetencje,
  Kompetencja,
} from "./engine/climbingKnowledgeEngine";
import MegaCel from "./components/MegaCel";
import ZblizajacyCel from "./components/ZblizajacyCel";
import DzisiejszeAktywnosci from "./components/DzisiejszeAktywnosci";
import Projekty from "./components/Projekty";
import PodsumowanieTreningow from "./components/PodsumowanieTreningow";
import { useTestPoziomuWlaczony } from "./components/useTestPoziomuWlaczony";
import Link from "next/link";


type Przejscie = {
  id: number;
  trudnosc: string;
  styl: string;
};

type Sesja = {
  id: number;
  data_treningu: string;
  miejsce: string;
  przejscia: Przejscie[];
};

type BlokKompetencje = {
  id: number;
  kompetencje: Kompetencja[] | null;
};

type WykonanieBloku = {
  blok_id: number;
};

type CelSesjiKompetencje = {
  kompetencje: Kompetencja[];
  wykonano: boolean;
};

type WynikTestu = {
  ocena_koncowa: string;
  data_testu: string;
};

/** Ile pierwszych dróg w danym stylu wyznacza punkt startowy Mega Celu, gdy nie ma testu poziomu. */
const LICZBA_DROG_DO_STARTU = 3;

/**
 * Najtrudniejsza z pierwszych (chronologicznie) dróg w danym stylu.
 * Zwraca null, dopóki nie ma ich dość, żeby ustalić wiarygodny start.
 */
function ocenaStartowaZDrog(sesje: Sesja[], styl: string): string | null {
  const pierwszeDrogi = [...sesje]
    .sort((a, b) => a.data_treningu.localeCompare(b.data_treningu) || a.id - b.id)
    .flatMap((s) => [...s.przejscia].sort((a, b) => a.id - b.id))
    .filter((p) => p.styl === styl)
    .slice(0, LICZBA_DROG_DO_STARTU);

  if (pierwszeDrogi.length < LICZBA_DROG_DO_STARTU) return null;
  return najtrudniejszaOcena(pierwszeDrogi.map((p) => p.trudnosc));
}

export default function Home() {
  const testPoziomuWlaczony = useTestPoziomuWlaczony();

  const [sesje, setSesje] = useState<Sesja[]>([]);
  const [blokiTreningowe, setBlokiTreningowe] = useState<BlokKompetencje[]>([]);
  const [wykonaniaBlokow, setWykonaniaBlokow] = useState<WykonanieBloku[]>([]);
  const [celeSesji, setCeleSesji] = useState<CelSesjiKompetencje[]>([]);
  const [najnowszyTest, setNajnowszyTest] = useState<WynikTestu | null>(null);

  useEffect(() => {
    pobierzDane();
    pobierzKompetencjeTreningowe();
    pobierzKompetencjeZCelowSesji();
    pobierzNajnowszyTest();
  }, []);

  async function pobierzDane() {
    const { data, error } = await supabase
      .from("sesje")
      .select("*, przejscia(*)")
      .order("data_treningu", { ascending: false });

    if (error) {
      console.error("Błąd pobierania:", error);
      return;
    }
    setSesje(data as Sesja[]);
  }

  async function pobierzKompetencjeTreningowe() {
    const [blokiRes, wykonaniaRes] = await Promise.all([
      supabase.from("bloki_tygodniowe").select("id, kompetencje"),
      supabase.from("wykonania_blokow").select("blok_id"),
    ]);

    if (blokiRes.error || wykonaniaRes.error) {
      console.error("Błąd pobierania kompetencji z treningu:", blokiRes.error ?? wykonaniaRes.error);
      return;
    }
    setBlokiTreningowe(blokiRes.data as unknown as BlokKompetencje[]);
    setWykonaniaBlokow(wykonaniaRes.data as WykonanieBloku[]);
  }

  async function pobierzKompetencjeZCelowSesji() {
    const { data, error } = await supabase.from("cele_sesji").select("kompetencje, wykonano");

    if (error) {
      console.error("Błąd pobierania celów sesji:", error);
      return;
    }
    setCeleSesji(data as unknown as CelSesjiKompetencje[]);
  }

  async function pobierzNajnowszyTest() {
    const { data, error } = await supabase
      .from("testy_poziomu")
      .select("ocena_koncowa, data_testu")
      .order("data_testu", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Błąd pobierania testu poziomu:", error);
      return;
    }
    setNajnowszyTest(data as WynikTestu | null);
  }

  const wszystkiePrzejscia = sesje.flatMap((s) => s.przejscia);
  const ocenyRP = wszystkiePrzejscia.filter((p) => p.styl === "RP").map((p) => p.trudnosc);
  const ocenyOS = wszystkiePrzejscia.filter((p) => p.styl === "OS").map((p) => p.trudnosc);
  const ocenyWedka = wszystkiePrzejscia.filter((p) => p.styl === "Wędka").map((p) => p.trudnosc);

  const najtrudniejszaRP = najtrudniejszaOcena(ocenyRP);
  const najtrudniejszaOS = najtrudniejszaOcena(ocenyOS);
  const najtrudniejszaWedka = najtrudniejszaOcena(ocenyWedka);

  const liczbaWedka = wszystkiePrzejscia.filter((p) => p.styl === "Wędka").length;
  const liczbaZDolem = wszystkiePrzejscia.filter(
    (p) => p.styl === "OS" || p.styl === "RP" || p.styl === "Projekt"
  ).length;

  const startZDrogRP = ocenaStartowaZDrog(sesje, "RP");
  const startZDrogOS = ocenaStartowaZDrog(sesje, "OS");

  const ostatniaSesja = sesje[0];

  const kompetencjeZDrog = policzKompetencje(wszystkiePrzejscia);
  const kompetencjeZTreningu = policzKompetencjeZTreningu(
    blokiTreningowe.map((b) => ({ id: b.id, kompetencje: b.kompetencje ?? [] })),
    wykonaniaBlokow
  );
  const kompetencjeZCelowSesji = policzKompetencjeZCelowSesji(celeSesji);
  // Profil kompetencji nie jest już pokazywany na Home (przeniesiony do DNA);
  // zostawiamy obliczenie, gdyby było potrzebne w przyszłości.
  void polaczKompetencje(
    polaczKompetencje(kompetencjeZDrog, kompetencjeZTreningu),
    kompetencjeZCelowSesji
  );

  return (
    <main className="p-10 font-sans">
      <h1 className="text-3xl font-bold">Witaj w ClimbOS</h1>
      <p className="text-gray-500">Twój cyfrowy trener wspinaczkowy</p>

      {/* Mega Cel zawsze na górze - stałe przypomnienie co mamy osiągnąć */}
      <MegaCel
        najtrudniejszaRP={najtrudniejszaRP}
        najtrudniejszaOS={najtrudniejszaOS}
        trudnoscTestu={najnowszyTest?.ocena_koncowa ?? null}
        pokazTest={testPoziomuWlaczony}
        startZDrogRP={startZDrogRP}
        startZDrogOS={startZDrogOS}
      />

      <ZblizajacyCel />

      <Card className="mt-6">
        <CardContent className="flex gap-10 flex-wrap">
          <div>
            <div className="text-gray-500 text-sm">Najtrudniejsza OS</div>
            <div className="text-xl font-bold">{najtrudniejszaOS ?? "—"}</div>
          </div>
          <div>
            <div className="text-gray-500 text-sm">Najtrudniejsza RP</div>
            <div className="text-xl font-bold">{najtrudniejszaRP ?? "—"}</div>
          </div>
          <div>
            <div className="text-gray-500 text-sm">Najtrudniejsza Wędka</div>
            <div className="text-xl font-bold">{najtrudniejszaWedka ?? "—"}</div>
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
            <div className="text-xl font-bold">{wszystkiePrzejscia.length}</div>
          </div>
        </CardContent>
      </Card>

      {testPoziomuWlaczony && (
        <Card className="mt-6 p-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-gray-500 text-sm">Szacowany poziom (test)</div>
              {najnowszyTest ? (
                <>
                  <div className="text-xl font-bold">{najnowszyTest.ocena_koncowa}</div>
                  <div className="text-gray-400 text-xs mt-0.5">
                    {new Date(najnowszyTest.data_testu).toLocaleDateString("pl-PL", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                </>
              ) : (
                <div className="text-gray-400 text-sm mt-1">Jeszcze nie wykonano testu</div>
              )}
            </div>
            <Link href="/dna" className={buttonVariants({ size: "sm" })}>
              {najnowszyTest ? "Zrób test ponownie" : "Zrób test poziomu"}
            </Link>
          </div>
        </Card>
      )}

      {/* Co dziś do zrobienia */}
      <DzisiejszeAktywnosci onZmianaAction={pobierzKompetencjeTreningowe} />

<Projekty tylkoAktywne />

      {ostatniaSesja && (
        <div className="mt-5 p-4 bg-white border border-gray-300 rounded-lg">
          <div className="text-gray-500 text-sm">Następna sesja treningowa</div>
          <div className="text-lg font-bold">
            {ostatniaSesja.miejsce} — {ostatniaSesja.data_treningu}
          </div>
          <div className="mt-2">
            <Link href={`/sesje/${ostatniaSesja.id}`} className={buttonVariants({ size: "sm" })}>
              Zobacz szczegóły
            </Link>
          </div>
        </div>
      )}

      <PodsumowanieTreningow />

      <div className="mt-8">
        <Link href="/sesje" className={buttonVariants()}>
          + Dodaj nową sesję
        </Link>
      </div>
    </main>
  );
}