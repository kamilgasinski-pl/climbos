"use client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "../supabaseclient";
import { policzProgresjeWCzasie } from "../engine/progressionEngine";
import {
  policzKompetencje,
  policzKompetencjeZTreningu,
  policzKompetencjeZCelowSesji,
  polaczKompetencje,
  policzWartosciFilarow,
  NAZWY_KOMPETENCJI,
  NAZWY_FILAROW,
  Kompetencja,
  Filar,
} from "../engine/climbingKnowledgeEngine";
import WykresProgresji from "../components/WykresProgresji";
import WykresKompetencji from "../components/Wykreskompetencji";
import PaskiKompetencji from "../components/PaskiKompetencji";
import { Loader2 } from "lucide-react";
import WykresPomiarowCiala from "../components/WykresPomiarowCiala";
import { liczySieDoProgresji } from "../engine/gradeEngine";
import { useKompetencjeWlaczone } from "../components/useKompetencjeWlaczone";

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
  przejscia: Przejscie[];
};

type Blok = {
  id: number;
  kompetencje: Kompetencja[];
};

type Wykonanie = {
  blok_id: number;
};

type CelSesjiKompetencje = {
  kompetencje: Kompetencja[];
  wykonano: boolean;
};

type WidokKompetencji = "ogolny" | "szczegolowy";
type WidokProgresji = "zDolem" | "wedka";

const STYLE_Z_DOLEM = ["Flash", "OS", "RP"];

export default function DNA() {
  const kompetencjeWlaczone = useKompetencjeWlaczone();

  const [sesje, setSesje] = useState<Sesja[]>([]);
  const [bloki, setBloki] = useState<Blok[]>([]);
  const [wykonania, setWykonania] = useState<Wykonanie[]>([]);
  const [celeSesji, setCeleSesji] = useState<CelSesjiKompetencje[]>([]);
  const [ladowanie, setLadowanie] = useState(true);
  const [bladPobierania, setBladPobierania] = useState("");
  const [widokKompetencji, setWidokKompetencji] = useState<WidokKompetencji>("ogolny");
  const [widokProgresji, setWidokProgresji] = useState<WidokProgresji>("zDolem");

  useEffect(() => {
    pobierzDane();
  }, []);

  async function pobierzDane() {
    const [sesjeRes, blokiRes, wykonaniaRes, celeSesjiRes] = await Promise.all([
      supabase.from("sesje").select("*, przejscia(*)"),
      supabase.from("bloki_tygodniowe").select("id, kompetencje"),
      supabase.from("wykonania_blokow").select("blok_id"),
      supabase.from("cele_sesji").select("kompetencje, wykonano"),
    ]);

    if (sesjeRes.error || blokiRes.error || wykonaniaRes.error || celeSesjiRes.error) {
      console.error(
        "Błąd pobierania:",
        sesjeRes.error ?? blokiRes.error ?? wykonaniaRes.error ?? celeSesjiRes.error
      );
      setBladPobierania("Nie udało się pobrać danych. Sprawdź połączenie i odśwież stronę.");
      setLadowanie(false);
      return;
    }
    setSesje(sesjeRes.data as Sesja[]);
    setBloki(blokiRes.data as unknown as Blok[]);
    setWykonania(wykonaniaRes.data as Wykonanie[]);
    setCeleSesji(celeSesjiRes.data as unknown as CelSesjiKompetencje[]);
    setLadowanie(false);
  }

  const wszystkiePrzejscia = sesje.flatMap((s) => s.przejscia);

  const sesjeDlaWykresu = sesje.map((s) => ({
    ...s,
    przejscia: s.przejscia.filter(
      (p) =>
        liczySieDoProgresji(p) &&
        (widokProgresji === "wedka" ? p.styl === "Wędka" : STYLE_Z_DOLEM.includes(p.styl))
    ),
  }));
  const progresjaWCzasie = policzProgresjeWCzasie(sesjeDlaWykresu);

  const kompetencjeZDrog = policzKompetencje(wszystkiePrzejscia);
  const kompetencjeZTreningu = policzKompetencjeZTreningu(bloki, wykonania);
  const kompetencjeZCelowSesji = policzKompetencjeZCelowSesji(celeSesji);
  const kompetencje = polaczKompetencje(
    polaczKompetencje(kompetencjeZDrog, kompetencjeZTreningu),
    kompetencjeZCelowSesji
  );
  const wartosciFilarow = policzWartosciFilarow(kompetencje);

  const daneSzczegolowe = (Object.keys(kompetencje) as Kompetencja[]).map((klucz) => ({
    kompetencja: NAZWY_KOMPETENCJI[klucz],
    wartosc: kompetencje[klucz],
  }));

  const daneOgolne = (Object.keys(wartosciFilarow) as Filar[]).map((filar) => ({
    kompetencja: NAZWY_FILAROW[filar],
    wartosc: wartosciFilarow[filar],
  }));

  const daneWykresuKompetencji = widokKompetencji === "ogolny" ? daneOgolne : daneSzczegolowe;

  return (
    <main className="p-10 font-sans">
      <h1 className="text-3xl font-bold">
        {kompetencjeWlaczone ? "DNA (Kompetencje)" : "DNA"}
      </h1>
      <p className="text-gray-500">
        {kompetencjeWlaczone
          ? "Twój profil wspinaczkowy, oparty na realnych przejściach"
          : "Twój profil wspinaczkowy, oparty na realnych przejściach"}
      </p>

      {ladowanie ? (
        <div className="flex items-center gap-2 text-gray-500 mt-8">
          <Loader2 className="animate-spin" size={20} />
          Ładowanie danych...
        </div>
      ) : bladPobierania ? (
        <p className="text-red-600 mt-8">{bladPobierania}</p>
      ) : (
        <>
          <div className="flex items-center justify-between mt-8">
            <h2 className="text-xl font-bold">Progresja w czasie</h2>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={widokProgresji === "zDolem" ? "default" : "outline"}
                onClick={() => setWidokProgresji("zDolem")}
              >
                Z dołem
              </Button>
              <Button
                size="sm"
                variant={widokProgresji === "wedka" ? "default" : "outline"}
                onClick={() => setWidokProgresji("wedka")}
              >
                Wędka
              </Button>
            </div>
          </div>
          <Card className="p-4">
            <WykresProgresji dane={progresjaWCzasie} />
          </Card>

          {kompetencjeWlaczone && (
            <>
              <div className="flex items-center justify-between mt-8">
                <h2 className="text-xl font-bold">Twoje kompetencje</h2>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={widokKompetencji === "ogolny" ? "default" : "outline"}
                    onClick={() => setWidokKompetencji("ogolny")}
                  >
                    Ogólny
                  </Button>
                  <Button
                    size="sm"
                    variant={widokKompetencji === "szczegolowy" ? "default" : "outline"}
                    onClick={() => setWidokKompetencji("szczegolowy")}
                  >
                    Szczegółowy
                  </Button>
                </div>
              </div>
              <Card className="p-4">
                <WykresKompetencji dane={daneWykresuKompetencji} />
              </Card>

              <div className="mt-8">
                <PaskiKompetencji kompetencje={kompetencje} />
              </div>
            </>
          )}

          <h2 className="text-xl font-bold mt-8 mb-3">Skład ciała</h2>
          <WykresPomiarowCiala />
        </>
      )}
    </main>
  );
}