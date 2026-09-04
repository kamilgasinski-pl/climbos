"use client";

import { useState, useEffect } from "react";
import { supabase } from "../supabaseclient";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SKALA_KURTYKI, poziomTrudnosci, najtrudniejszaOcena } from "../engine/gradeEngine";
import {
  poziomSilyPalcow,
  poziomCiagniecia,
  poziomWytrzymalosci,
  poziomTechniki,
  policzPoziomKoncowy,
  znajdzOgraniczenia,
  NAZWY_OBSZAROW,
  ObszarTestu,
} from "../engine/testPoziomuEngine";
import { Loader2 } from "lucide-react";

type Przejscie = {
  trudnosc: string;
  styl: string;
};

type Props = {
  przejscia: Przejscie[];
};

type OdpowiedzTechniki = 0 | 5 | 10;

const PYTANIA_TECHNIKI: { id: string; tekst: string }[] = [
  { id: "praca_nog", tekst: "Świadomie stawiasz stopy, zamiast szukać ich wzrokiem w trakcie ruchu" },
  { id: "drop_knee", tekst: "Potrafisz wykonać drop-knee bez utraty równowagi" },
  { id: "heel_hook", tekst: "Świadomie używasz pięty (heel hook) do odciążenia rąk" },
  { id: "toe_hook", tekst: "Potrafisz zastosować toe hook na przewieszeniu" },
  { id: "flagowanie", tekst: "Używasz kontrflagowania do utrzymania równowagi" },
  { id: "przenoszenie_ciezaru", tekst: "Przenosisz ciężar na nogę przed wykonaniem ruchu ręką" },
  { id: "czytanie_drogi", tekst: "Planujesz sekwencję ruchów, zanim wejdziesz na drogę" },
  { id: "odpoczynek", tekst: "Potrafisz znaleźć i wykorzystać miejsca do strzepania rąk" },
  { id: "klipsowanie", tekst: "Klipsujesz sprawnie, bez tracenia pozycji i energii" },
  { id: "tempo", tekst: "Dostosowujesz tempo — szybciej w trudnych miejscach, wolniej żeby odpocząć" },
];

type WynikTestu = {
  id: number;
  data_testu: string;
  ocena_koncowa: string;
};

export default function TestPoziomu({ przejscia }: Props) {
  const [masaCiala, setMasaCiala] = useState("");
  const [dociazeniePalce, setDociazeniePalce] = useState("");
  const [dociazenieCiagniecie, setDociazenieCiagniecie] = useState("");
  const [liczbaRuchow, setLiczbaRuchow] = useState("");
  const [poziomRegularny, setPoziomRegularny] = useState("");
  const [odpowiedziTechniki, setOdpowiedziTechniki] = useState<Record<string, OdpowiedzTechniki>>({});
  const [blad, setBlad] = useState("");
  const [zapisywanie, setZapisywanie] = useState(false);

  const [wynik, setWynik] = useState<{
    obszary: Record<ObszarTestu, number>;
    indeksKoncowy: number;
    ocenaKoncowa: string;
    ograniczenia: { obszar: ObszarTestu; roznica: number }[];
  } | null>(null);

  const [historia, setHistoria] = useState<WynikTestu[]>([]);
  const [ladowanieHistorii, setLadowanieHistorii] = useState(true);

  useEffect(() => {
    pobierzHistorie();
  }, []);

  async function pobierzHistorie() {
    const { data, error } = await supabase
      .from("testy_poziomu")
      .select("id, data_testu, ocena_koncowa")
      .order("data_testu", { ascending: false });

    if (error) {
      console.error("Błąd pobierania historii testów:", error);
      setLadowanieHistorii(false);
      return;
    }
    setHistoria(data as WynikTestu[]);
    setLadowanieHistorii(false);
  }

  const najtrudniejszaOS = najtrudniejszaOcena(przejscia.filter((p) => p.styl === "OS").map((p) => p.trudnosc));
  const najtrudniejszaRP = najtrudniejszaOcena(przejscia.filter((p) => p.styl === "RP").map((p) => p.trudnosc));

  function ustawOdpowiedzTechniki(id: string, wartosc: OdpowiedzTechniki) {
    setOdpowiedziTechniki((poprzednie) => ({ ...poprzednie, [id]: wartosc }));
  }

  function obliczWynik() {
    const masa = Number(masaCiala);
    const ruchy = Number(liczbaRuchow);

    if (!masa || masa <= 0) {
      setBlad("Podaj swoją masę ciała (kg).");
      return;
    }
    if (dociazeniePalce === "") {
      setBlad("Podaj dociążenie na zwisie (może być 0 lub ujemne przy asyście).");
      return;
    }
    if (dociazenieCiagniecie === "") {
      setBlad("Podaj dociążenie w podciąganiu.");
      return;
    }
    if (!liczbaRuchow || ruchy < 0) {
      setBlad("Podaj liczbę ruchów do odpadnięcia.");
      return;
    }

    const indeksyPerformance: number[] = [];
    if (najtrudniejszaOS) indeksyPerformance.push(poziomTrudnosci(najtrudniejszaOS, "kurtyki"));
    if (najtrudniejszaRP) indeksyPerformance.push(poziomTrudnosci(najtrudniejszaRP, "kurtyki"));
    if (poziomRegularny) indeksyPerformance.push(poziomTrudnosci(poziomRegularny, "kurtyki"));

    if (indeksyPerformance.length === 0) {
      setBlad("Podaj przynajmniej poziom pokonywany regularnie — brak innych danych o Twoich przejściach.");
      return;
    }

    setBlad("");

    const performanceIdx =
      indeksyPerformance.reduce((suma, i) => suma + i, 0) / indeksyPerformance.length;

    const punktyTechniki = PYTANIA_TECHNIKI.reduce(
      (suma, p) => suma + (odpowiedziTechniki[p.id] ?? 0),
      0
    );

    const obszary: Record<ObszarTestu, number> = {
      performance: performanceIdx,
      silaPalcow: poziomSilyPalcow(masa, Number(dociazeniePalce)),
      ciagniecie: poziomCiagniecia(masa, Number(dociazenieCiagniecie)),
      wytrzymalosc: poziomWytrzymalosci(ruchy),
      technika: poziomTechniki(punktyTechniki),
    };

    const { indeksKoncowy, ocenaKurtyki } = policzPoziomKoncowy(obszary);
    const ograniczenia = znajdzOgraniczenia(obszary);

    setWynik({ obszary, indeksKoncowy, ocenaKoncowa: ocenaKurtyki, ograniczenia });
  }

  async function zapiszWynik() {
    if (!wynik) return;
    setZapisywanie(true);

    const { error } = await supabase.from("testy_poziomu").insert({
      ocena_koncowa: wynik.ocenaKoncowa,
      wynik_performance: wynik.obszary.performance,
      wynik_sila_palcow: wynik.obszary.silaPalcow,
      wynik_ciagniecie: wynik.obszary.ciagniecie,
      wynik_wytrzymalosc: wynik.obszary.wytrzymalosc,
      wynik_technika: wynik.obszary.technika,
      dane_wejsciowe: {
        masaCiala,
        dociazeniePalce,
        dociazenieCiagniecie,
        liczbaRuchow,
        poziomRegularny,
        odpowiedziTechniki,
      },
    });

    setZapisywanie(false);

    if (error) {
      console.error("Błąd zapisu testu:", error);
      setBlad("Nie udało się zapisać wyniku. Spróbuj ponownie.");
      return;
    }

    pobierzHistorie();
  }

  return (
    <div className="flex flex-col gap-6 mt-8">
      <div>
        <h2 className="text-xl font-bold">Test poziomu wspinaczkowego</h2>
        <p className="text-gray-500 text-sm mt-1">
          5 obszarów, każdy waży inaczej. Wynik końcowy jest ograniczony przez Twój rzeczywisty
          performance — mocne palce bez odpowiedniego wspinania nie zawyżą oceny.
        </p>
      </div>

      <Card className="p-4 flex flex-col gap-5">
        <div>
          <div className="font-bold mb-2">A. Performance (35%)</div>
          <div className="flex gap-8 flex-wrap mb-3 text-sm">
            <div>
              <div className="text-gray-500">Najtrudniejsza OS</div>
              <div className="font-bold">{najtrudniejszaOS ?? "— brak danych"}</div>
            </div>
            <div>
              <div className="text-gray-500">Najtrudniejsza RP</div>
              <div className="font-bold">{najtrudniejszaRP ?? "— brak danych"}</div>
            </div>
          </div>
          <div className="text-gray-500 text-xs mb-1">Poziom pokonywany regularnie</div>
          <Select value={poziomRegularny} onValueChange={(v) => setPoziomRegularny(v ?? "")}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Wybierz poziom" />
            </SelectTrigger>
            <SelectContent>
              {SKALA_KURTYKI.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="font-bold mb-2">B. Siła palców (20%)</div>
          <p className="text-gray-500 text-xs mb-2">
            Zwis 7 sekund na krawędzi 20mm, oburącz. Dociążenie w kg — dodatnie jeśli dokładałeś
            obciążenie, ujemne jeśli potrzebowałeś asysty (np. gumy).
          </p>
          <div className="flex gap-2 flex-wrap">
            <Input
              type="number"
              value={masaCiala}
              onChange={(e) => setMasaCiala(e.target.value)}
              placeholder="Twoja masa ciała (kg)"
              className="w-[180px]"
              autoComplete="off"
            />
            <Input
              type="number"
              value={dociazeniePalce}
              onChange={(e) => setDociazeniePalce(e.target.value)}
              placeholder="Dociążenie na zwisie (kg)"
              className="w-[200px]"
              autoComplete="off"
            />
          </div>
        </div>

        <div>
          <div className="font-bold mb-2">C. Siła ciągnięcia (15%)</div>
          <p className="text-gray-500 text-xs mb-2">
            Podciąganie z dociążeniem (kg) — 0 dla zwykłego podciągnięcia, ujemne przy asyście.
          </p>
          <Input
            type="number"
            value={dociazenieCiagniecie}
            onChange={(e) => setDociazenieCiagniecie(e.target.value)}
            placeholder="Dociążenie w podciąganiu (kg)"
            className="w-[200px]"
            autoComplete="off"
          />
        </div>

        <div>
          <div className="font-bold mb-2">D. Wytrzymałość (15%)</div>
          <p className="text-gray-500 text-xs mb-2">
            Liczba ruchów do odpadnięcia na umiarkowanie trudnym, powtarzalnym obwodzie.
          </p>
          <Input
            type="number"
            value={liczbaRuchow}
            onChange={(e) => setLiczbaRuchow(e.target.value)}
            placeholder="Liczba ruchów"
            className="w-[160px]"
            autoComplete="off"
          />
        </div>

        <div>
          <div className="font-bold mb-2">E. Technika (15%)</div>
          <div className="flex flex-col gap-3">
            {PYTANIA_TECHNIKI.map((pytanie) => {
              const wartosc = odpowiedziTechniki[pytanie.id] ?? 0;
              return (
                <div key={pytanie.id} className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-sm text-gray-700 flex-1 min-w-[240px]">{pytanie.tekst}</span>
                  <div className="flex gap-1">
                    {([0, 5, 10] as OdpowiedzTechniki[]).map((opcja) => (
                      <button
                        key={opcja}
                        type="button"
                        onClick={() => ustawOdpowiedzTechniki(pytanie.id, opcja)}
                        className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
                          wartosc === opcja
                            ? "bg-gray-900 border-gray-900 text-white"
                            : "border-gray-300 text-gray-600 hover:border-gray-400"
                        }`}
                      >
                        {opcja === 0 ? "Nie" : opcja === 5 ? "Częściowo" : "Tak"}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {blad && <p className="text-red-600 text-sm">{blad}</p>}

        <div>
          <Button onClick={obliczWynik}>Oblicz wynik</Button>
        </div>
      </Card>

      {wynik && (
        <Card className="p-4 bg-gray-900 text-white">
          <div className="text-gray-400 text-sm">Szacowany poziom</div>
          <div className="text-4xl font-bold mt-1">{wynik.ocenaKoncowa}</div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-4">
            {(Object.keys(wynik.obszary) as ObszarTestu[]).map((obszar) => (
              <div key={obszar}>
                <div className="text-gray-400 text-xs">{NAZWY_OBSZAROW[obszar]}</div>
                <div className="font-bold">{SKALA_KURTYKI[Math.round(wynik.obszary[obszar])]}</div>
              </div>
            ))}
          </div>

          {wynik.ograniczenia[0] && wynik.ograniczenia[0].roznica < 0 && (
            <div className="mt-4 pt-4 border-t border-gray-700 text-sm">
              <span className="text-gray-400">Główne ograniczenie: </span>
              <span className="font-bold">{NAZWY_OBSZAROW[wynik.ograniczenia[0].obszar]}</span>
              {wynik.ograniczenia[1] && wynik.ograniczenia[1].roznica < 0 && (
                <>
                  <span className="text-gray-400"> · drugorzędne: </span>
                  <span className="font-bold">{NAZWY_OBSZAROW[wynik.ograniczenia[1].obszar]}</span>
                </>
              )}
            </div>
          )}

          <div className="mt-4">
            <Button
              onClick={zapiszWynik}
              disabled={zapisywanie}
              className="bg-white text-gray-900 hover:bg-gray-100"
            >
              {zapisywanie ? "Zapisywanie..." : "Zapisz wynik do historii"}
            </Button>
          </div>
        </Card>
      )}

      <div>
        <h3 className="font-bold mb-2">Historia testów</h3>
        {ladowanieHistorii ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="animate-spin" size={16} />
            Ładowanie...
          </div>
        ) : historia.length === 0 ? (
          <p className="text-gray-400 text-sm">Brak wcześniejszych testów.</p>
        ) : (
          <Card className="p-0 overflow-hidden">
            <ul className="list-none p-0 m-0 divide-y divide-gray-100">
              {historia.map((h) => (
                <li key={h.id} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-gray-500 text-sm">
                    {new Date(h.data_testu).toLocaleDateString("pl-PL", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <span className="font-bold">{h.ocena_koncowa}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}