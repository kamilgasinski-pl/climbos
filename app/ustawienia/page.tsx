"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  Ustawienia as TypUstawien,
  ZAKLADKI_PLANNERA,
  WIDOKI_SESJI,
  DOMYSLNE_USTAWIENIA,
  MIN_DNI,
  MAX_DNI,
  pobierzUstawienia,
  zapiszUstawienia,
} from "../engine/ustawieniaEngine";

function Pigulka({
  aktywna,
  onClickAction,
  children,
}: {
  aktywna: boolean;
  onClickAction: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClickAction}
      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
        aktywna
          ? "bg-gray-900 border-gray-900 text-white"
          : "border-gray-300 text-gray-600 hover:border-gray-400"
      }`}
    >
      {children}
    </button>
  );
}
function Suwak({
  wlaczony,
  zmianaAction,
}: {
  wlaczony: boolean;
  zmianaAction: (nowa: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={wlaczony}
      onClick={() => zmianaAction(!wlaczony)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        wlaczony ? "bg-gray-900" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          wlaczony ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
export default function UstawieniaStrona() {
  const [ustawienia, setUstawienia] = useState<TypUstawien>(DOMYSLNE_USTAWIENIA);
  const [dniTekst, setDniTekst] = useState(String(DOMYSLNE_USTAWIENIA.dni_na_wykonanie_bloku));
  const [ladowanie, setLadowanie] = useState(true);
  const [zapisywanie, setZapisywanie] = useState(false);
  const [komunikat, setKomunikat] = useState<{ typ: "ok" | "blad"; tekst: string } | null>(null);

  useEffect(() => {
    pobierzUstawienia().then((u) => {
      setUstawienia(u);
      setDniTekst(String(u.dni_na_wykonanie_bloku));
      setLadowanie(false);
    });
  }, []);

  function przywrocDomyslne() {
    setUstawienia(DOMYSLNE_USTAWIENIA);
    setDniTekst(String(DOMYSLNE_USTAWIENIA.dni_na_wykonanie_bloku));
    setKomunikat(null);
  }

  async function zapisz() {
    const dni = Number(dniTekst);
    if (!Number.isInteger(dni) || dni < MIN_DNI || dni > MAX_DNI) {
      setKomunikat({
        typ: "blad",
        tekst: `Liczba dni musi być liczbą całkowitą od ${MIN_DNI} do ${MAX_DNI}.`,
      });
      return;
    }

    setKomunikat(null);
    setZapisywanie(true);
    const blad = await zapiszUstawienia({ ...ustawienia, dni_na_wykonanie_bloku: dni });
    setZapisywanie(false);

    if (blad) {
      setKomunikat({ typ: "blad", tekst: blad });
      return;
    }
    setKomunikat({ typ: "ok", tekst: "Ustawienia zapisane." });
  }

  return (
    <main className="p-10 font-sans">
      <h1 className="text-3xl font-bold">Ustawienia</h1>
      <p className="text-gray-500">Dostosuj działanie aplikacji do siebie</p>

      {ladowanie ? (
        <div className="flex items-center gap-2 text-gray-500 mt-8">
          <Loader2 className="animate-spin" size={20} />
          Ładowanie ustawień...
        </div>
      ) : (
        <Card className="p-5 mt-5 max-w-2xl">
          <div className="flex flex-col gap-6">
                        <section>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold">Zarządzanie kompetencjami</div>
                  <p className="text-gray-500 text-sm mt-0.5">
                    Gdy włączone, możesz przypisywać kompetencje do bloków, sesji i celów oraz
                    śledzić je w DNA. Wyłączone ukrywa tę funkcję, a zapisane dane zostają i wrócą
                    po ponownym włączeniu.
                  </p>
                </div>
                <Suwak
                  wlaczony={ustawienia.zarzadzanie_kompetencjami}
                  zmianaAction={(nowa) =>
                    setUstawienia((u) => ({ ...u, zarzadzanie_kompetencjami: nowa }))
                  }
                />
              </div>
            </section>
            <section>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold">Test poziomu</div>
                  <p className="text-gray-500 text-sm mt-0.5">
                    Gdy włączony, test poziomu jest dostępny w DNA i na stronie głównej. Wyłączony
                    ukrywa go, a zapisane wyniki zostają i wrócą po ponownym włączeniu.
                  </p>
                </div>
                <Suwak
                  wlaczony={ustawienia.test_poziomu_wlaczony}
                  zmianaAction={(nowa) =>
                    setUstawienia((u) => ({ ...u, test_poziomu_wlaczony: nowa }))
                  }
                />
              </div>
            </section>
            <section>
              <div className="font-bold">Planner: domyślna zakładka</div>
              <p className="text-gray-500 text-sm mt-0.5">
                Zakładka, którą Planner otwiera po wejściu z menu. Linki z innych stron (np. z Home
                do Realizacji) nadal otwierają wskazaną zakładkę.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {ZAKLADKI_PLANNERA.map((z) => (
                  <Pigulka
                    key={z.klucz}
                    aktywna={ustawienia.domyslna_zakladka_plannera === z.klucz}
                    onClickAction={() =>
                      setUstawienia((u) => ({ ...u, domyslna_zakladka_plannera: z.klucz }))
                    }
                  >
                    {z.etykieta}
                  </Pigulka>
                ))}
              </div>
            </section>

            <section>
              <div className="font-bold">Planner → Sesje: domyślny widok</div>
              <p className="text-gray-500 text-sm mt-0.5">
                Jak grupować listę zaplanowanych sesji po wejściu do zakładki.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {WIDOKI_SESJI.map((w) => (
                  <Pigulka
                    key={w.klucz}
                    aktywna={ustawienia.domyslny_widok_sesji === w.klucz}
                    onClickAction={() =>
                      setUstawienia((u) => ({ ...u, domyslny_widok_sesji: w.klucz }))
                    }
                  >
                    {w.etykieta}
                  </Pigulka>
                ))}
              </div>
            </section>

            <section>
              <div className="font-bold">Realizacja: czas na wykonanie bloku</div>
              <p className="text-gray-500 text-sm mt-0.5">
                Po ilu dniach od dnia bloku niewykonana aktywność dostaje czerwony krzyżyk
                (domyślnie {DOMYSLNE_USTAWIENIA.dni_na_wykonanie_bloku}).
              </p>
              <div className="relative w-[120px] mt-3">
                <Input
                  type="number"
                  min={MIN_DNI}
                  max={MAX_DNI}
                  value={dniTekst}
                  onChange={(e) => setDniTekst(e.target.value)}
                  className="pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
                  dni
                </span>
              </div>
            </section>

            {komunikat && (
              <p
                className={`text-sm ${
                  komunikat.typ === "ok" ? "text-green-700" : "text-red-600"
                }`}
              >
                {komunikat.tekst}
              </p>
            )}

            <div className="flex gap-2">
              <Button onClick={zapisz} disabled={zapisywanie}>
                {zapisywanie ? "Zapisywanie..." : "Zapisz ustawienia"}
              </Button>
              <Button variant="outline" onClick={przywrocDomyslne}>
                Przywróć domyślne
              </Button>
            </div>
          </div>
        </Card>
      )}
    </main>
  );
}