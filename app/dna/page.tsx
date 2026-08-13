"use client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "../supabaseclient";
import { policzProgresje, policzProgresjeWCzasie } from "../engine/progressionEngine";
import { generujRekomendacje } from "../engine/recommendationEngine";
import {
  policzKompetencje,
  policzKompetencjeZTreningu,
  polaczKompetencje,
  policzWartosciFilarow,
  NAZWY_KOMPETENCJI,
  NAZWY_FILAROW,
  Kompetencja,
  Filar,
} from "../engine/climbingKnowledgeEngine";
import PasekTrudnosci from "../components/PasekTrudnosci";
import WykresProgresji from "../components/WykresProgresji";
import WykresKompetencji from "../components/Wykreskompetencji";
import { Loader2 } from "lucide-react";

type Przejscie = {
  id: number;
  trudnosc: string;
  styl: string;
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

type Zakladka = "trendy" | "luki" | "historia";
type WidokKompetencji = "ogolny" | "szczegolowy";

export default function DNA() {
  const [sesje, setSesje] = useState<Sesja[]>([]);
  const [bloki, setBloki] = useState<Blok[]>([]);
  const [wykonania, setWykonania] = useState<Wykonanie[]>([]);
  const [ladowanie, setLadowanie] = useState(true);
  const [bladPobierania, setBladPobierania] = useState("");
  const [aktywnaZakladka, setAktywnaZakladka] = useState<Zakladka>("trendy");
  const [widokKompetencji, setWidokKompetencji] = useState<WidokKompetencji>("ogolny");

  useEffect(() => {
    pobierzDane();
  }, []);

  async function pobierzDane() {
    const [sesjeRes, blokiRes, wykonaniaRes] = await Promise.all([
      supabase.from("sesje").select("*, przejscia(*)"),
      supabase.from("bloki_tygodniowe").select("id, kompetencje"),
      supabase.from("wykonania_blokow").select("blok_id"),
    ]);

    if (sesjeRes.error || blokiRes.error || wykonaniaRes.error) {
      console.error("Błąd pobierania:", sesjeRes.error ?? blokiRes.error ?? wykonaniaRes.error);
      setBladPobierania("Nie udało się pobrać danych. Sprawdź połączenie i odśwież stronę.");
      setLadowanie(false);
      return;
    }
    setSesje(sesjeRes.data as Sesja[]);
    setBloki(blokiRes.data as unknown as Blok[]);
    setWykonania(wykonaniaRes.data as Wykonanie[]);
    setLadowanie(false);
  }

  const wszystkiePrzejscia = sesje.flatMap((s) => s.przejscia);
  const progresja = policzProgresje(wszystkiePrzejscia);
  const progresjaWCzasie = policzProgresjeWCzasie(sesje);
  const rekomendacje = generujRekomendacje(progresja);
  const kompetencjeZDrog = policzKompetencje(wszystkiePrzejscia);
  const kompetencjeZTreningu = policzKompetencjeZTreningu(bloki, wykonania);
  const kompetencje = polaczKompetencje(kompetencjeZDrog, kompetencjeZTreningu);
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
      <h1 className="text-3xl font-bold">DNA (Kompetencje)</h1>
      <p className="text-gray-500">Twój profil wspinaczkowy, oparty na realnych przejściach</p>

      <div className="flex gap-2 mt-5">
        <Button
          variant={aktywnaZakladka === "trendy" ? "default" : "outline"}
          onClick={() => setAktywnaZakladka("trendy")}
        >
          Trendy
        </Button>
        <Button
          variant={aktywnaZakladka === "luki" ? "default" : "outline"}
          onClick={() => setAktywnaZakladka("luki")}
        >
          Analiza luk
        </Button>
        <Button
          variant={aktywnaZakladka === "historia" ? "default" : "outline"}
          onClick={() => setAktywnaZakladka("historia")}
        >
          Historia
        </Button>
      </div>

      {ladowanie ? (
        <div className="flex items-center gap-2 text-gray-500 mt-8">
          <Loader2 className="animate-spin" size={20} />
          Ładowanie danych...
        </div>
      ) : bladPobierania ? (
        <p className="text-red-600 mt-8">{bladPobierania}</p>
      ) : aktywnaZakladka === "trendy" ? (
        <>
          <h2 className="text-xl font-bold mt-8">Progresja w czasie</h2>
          <Card className="p-4">
            <WykresProgresji dane={progresjaWCzasie} />
          </Card>

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
        </>
      ) : aktywnaZakladka === "luki" ? (
        <>
          <h2 className="text-xl font-bold mt-8">Jak się rozwijać?</h2>
          <div className="flex flex-col gap-3">
            {rekomendacje.length === 0 ? (
              <p className="text-gray-500 py-5">
                Brak rekomendacji — dodaj kilka przejść, żeby zobaczyć podpowiedzi.
              </p>
            ) : (
              rekomendacje.map((r) => (
                <Card key={r.tytul} className="p-4">
                  <div className="font-bold">{r.tytul}</div>
                  <div className="text-gray-500 text-sm mt-1">{r.opis}</div>
                </Card>
              ))
            )}
          </div>
        </>
      ) : (
        <>
          <h2 className="text-xl font-bold mt-8">Historia progresji</h2>
          <Card className="px-4 py-2">
            {progresja.length === 0 ? (
              <p className="text-gray-500 py-5">
                Brak danych — dodaj kilka przejść w Logbooku, żeby zobaczyć progresję.
              </p>
            ) : (
              progresja.map((w) => <PasekTrudnosci key={w.trudnosc} wynik={w} />)
            )}
          </Card>
        </>
      )}
    </main>
  );
}