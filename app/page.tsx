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
import DzisiejszeAktywnosci from "./components/DzisiejszeAktywnosci";
import PaskiKompetencji from "./components/PaskiKompetencji";
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

export default function Home() {
  const [sesje, setSesje] = useState<Sesja[]>([]);
  const [blokiTreningowe, setBlokiTreningowe] = useState<BlokKompetencje[]>([]);
  const [wykonaniaBlokow, setWykonaniaBlokow] = useState<WykonanieBloku[]>([]);
  const [celeSesji, setCeleSesji] = useState<CelSesjiKompetencje[]>([]);

  useEffect(() => {
    pobierzDane();
    pobierzKompetencjeTreningowe();
    pobierzKompetencjeZCelowSesji();
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

  const wszystkiePrzejscia = sesje.flatMap((s) => s.przejscia);
  const ocenyRP = wszystkiePrzejscia.filter((p) => p.styl === "RP").map((p) => p.trudnosc);
  const ocenyOS = wszystkiePrzejscia.filter((p) => p.styl === "OS").map((p) => p.trudnosc);

  const najtrudniejszaRP = najtrudniejszaOcena(ocenyRP);
  const najtrudniejszaOS = najtrudniejszaOcena(ocenyOS);
  const ostatniaSesja = sesje[0];

  const kompetencjeZDrog = policzKompetencje(wszystkiePrzejscia);
  const kompetencjeZTreningu = policzKompetencjeZTreningu(
    blokiTreningowe.map((b) => ({ id: b.id, kompetencje: b.kompetencje ?? [] })),
    wykonaniaBlokow
  );
  const kompetencjeZCelowSesji = policzKompetencjeZCelowSesji(celeSesji);
  const profilKompetencji = polaczKompetencje(
    polaczKompetencje(kompetencjeZDrog, kompetencjeZTreningu),
    kompetencjeZCelowSesji
  );

  return (
    <main className="p-10 font-sans">
      <h1 className="text-3xl font-bold text-blue-600">Witaj w ClimbOS 🏔️</h1>
      <p className="text-gray-500">Twój cyfrowy trener wspinaczkowy</p>

      {/* Mega Cel zawsze na górze - stałe przypomnienie co mamy osiągnąć */}
      <MegaCel najtrudniejszaRP={najtrudniejszaRP} najtrudniejszaOS={najtrudniejszaOS} sesje={sesje} />

      <Card className="mt-6">
        <CardContent className="flex gap-10">
          <div>
            <div className="text-gray-500 text-sm">Najtrudniejsza RP</div>
            <div className="text-xl font-bold">{najtrudniejszaRP ?? "—"}</div>
          </div>
          <div>
            <div className="text-gray-500 text-sm">Najtrudniejsza OS</div>
            <div className="text-xl font-bold">{najtrudniejszaOS ?? "—"}</div>
          </div>
          <div>
            <div className="text-gray-500 text-sm">Łączna liczba przejść</div>
            <div className="text-xl font-bold">{wszystkiePrzejscia.length}</div>
          </div>
        </CardContent>
      </Card>

      {/* Co dziś do zrobienia */}
      <DzisiejszeAktywnosci onZmiana={pobierzKompetencjeTreningowe} />

      {/* Postęp kompetencji w stylu RPG */}
      <PaskiKompetencji kompetencje={profilKompetencji} />

      {ostatniaSesja && (
        <div className="mt-5 p-4 bg-white border border-gray-300 rounded-lg">
          <div className="text-gray-500 text-sm">Ostatnia sesja</div>
          <div className="text-lg font-bold">
            {ostatniaSesja.miejsce} — {ostatniaSesja.data_treningu}
          </div>
          <Link href={`/sesje/${ostatniaSesja.id}`} className="text-blue-600 hover:underline">
            Zobacz szczegóły →
          </Link>
        </div>
      )}

      <div className="mt-8">
        <Link href="/sesje" className={buttonVariants()}>
          + Dodaj nową sesję
        </Link>
      </div>
    </main>
  );
}