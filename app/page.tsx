"use client";

import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "./supabaseclient";
import { najtrudniejszaOcena } from "./engine/gradeEngine";
import MegaCel from "./components/MegaCel";
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

export default function Home() {
  const [sesje, setSesje] = useState<Sesja[]>([]);

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
      return;
    }
    setSesje(data as Sesja[]);
  }

  const wszystkiePrzejscia = sesje.flatMap((s) => s.przejscia);
  const ocenyRP = wszystkiePrzejscia.filter((p) => p.styl === "RP").map((p) => p.trudnosc);
  const ocenyOS = wszystkiePrzejscia.filter((p) => p.styl === "OS").map((p) => p.trudnosc);

  const najtrudniejszaRP = najtrudniejszaOcena(ocenyRP);
  const najtrudniejszaOS = najtrudniejszaOcena(ocenyOS);
  const ostatniaSesja = sesje[0];

  return (
    <main className="p-10 font-sans">
      <h1 className="text-3xl font-bold text-blue-600">Witaj w ClimbOS 🏔️</h1>
      <p className="text-gray-500">Twój cyfrowy trener wspinaczkowy</p>

      <MegaCel najtrudniejszaRP={najtrudniejszaRP} najtrudniejszaOS={najtrudniejszaOS} sesje={sesje} />

      <Card className="mt-8">
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