"use client";

import { useState, useEffect } from "react";
import { supabase } from "../supabaseclient";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil, Plus, Trash2 } from "lucide-react";
import CwiczenieKarta, { WyborPol, EdytorLinkow, ListaLinkow } from "./CwiczenieKarta";
import {
  Zestaw,
  LinkZestawu,
  PoleSledzenia,
  przygotujLinki,
} from "../engine/cwiczeniaEngine";

type DaneZestawu = { nazwa: string; opis: string; linki: LinkZestawu[] };

function FormularzZestawu({
  poczatkowe,
  etykietaZapisu,
  zapiszAction,
  anulujAction,
}: {
  poczatkowe: DaneZestawu;
  etykietaZapisu: string;
  zapiszAction: (dane: DaneZestawu) => Promise<string | null>;
  anulujAction: () => void;
}) {
  const [nazwa, setNazwa] = useState(poczatkowe.nazwa);
  const [opis, setOpis] = useState(poczatkowe.opis);
  const [linki, setLinki] = useState<LinkZestawu[]>(poczatkowe.linki);
  const [blad, setBlad] = useState("");
  const [zapisywanie, setZapisywanie] = useState(false);

  async function zapisz() {
    if (nazwa.trim() === "") {
      setBlad("Podaj nazwę zestawu.");
      return;
    }

    const przygotowane = przygotujLinki(linki);
    if (przygotowane.blad) {
      setBlad(przygotowane.blad);
      return;
    }

    setBlad("");
    setZapisywanie(true);
    const wynik = await zapiszAction({
      nazwa: nazwa.trim(),
      opis: opis.trim(),
      linki: przygotowane.linki,
    });
    setZapisywanie(false);
    if (wynik) setBlad(wynik);
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        value={nazwa}
        onChange={(e) => setNazwa(e.target.value)}
        placeholder="Nazwa zestawu (np. Trening palców)"
        className="max-w-sm"
        autoFocus
      />
      <textarea
        value={opis}
        onChange={(e) => setOpis(e.target.value)}
        placeholder="Opis / wskazówki (opcjonalnie)"
        rows={2}
        className="p-2 border border-gray-300 rounded-md resize-none text-sm max-w-xl"
      />

      <div className="text-gray-500 text-xs mt-1">Linki do zestawu (YouTube, artykuły...)</div>
      <EdytorLinkow linki={linki} zmianaAction={setLinki} />

      {blad && <p className="text-red-600 text-sm">{blad}</p>}
      <div className="flex gap-2 mt-1">
        <Button onClick={zapisz} disabled={zapisywanie}>
          {zapisywanie ? "Zapisywanie..." : etykietaZapisu}
        </Button>
        <Button variant="outline" onClick={anulujAction}>
          Anuluj
        </Button>
      </div>
    </div>
  );
}

export default function ZestawyCwiczen() {
  const [zestawy, setZestawy] = useState<Zestaw[]>([]);
  const [ladowanie, setLadowanie] = useState(true);
  const [blad, setBlad] = useState("");

  const [nowyZestaw, setNowyZestaw] = useState(false);
  const [edytowanyId, setEdytowanyId] = useState<number | null>(null);

  const [dodawanieDla, setDodawanieDla] = useState<number | null>(null);
  const [nowaNazwaCw, setNowaNazwaCw] = useState("");
  const [noweSledzone, setNoweSledzone] = useState<PoleSledzenia[]>([]);
  const [noweLinki, setNoweLinki] = useState<LinkZestawu[]>([]);
  const [bladCw, setBladCw] = useState("");

  useEffect(() => {
    pobierz();
  }, []);

  async function pobierz() {
    const { data, error } = await supabase
      .from("zestawy_cwiczen")
      .select("*, cwiczenia_zestawu(*)")
      .order("created_at", { ascending: false })
      .order("kolejnosc", { referencedTable: "cwiczenia_zestawu", ascending: true });

    if (error) {
      console.error("Błąd pobierania zestawów:", error);
      setBlad("Nie udało się pobrać zestawów. Odśwież stronę.");
      setLadowanie(false);
      return;
    }
    setZestawy(data as unknown as Zestaw[]);
    setLadowanie(false);
  }

  async function utworzZestaw(dane: DaneZestawu): Promise<string | null> {
    const { error } = await supabase.from("zestawy_cwiczen").insert({
      nazwa: dane.nazwa,
      opis: dane.opis === "" ? null : dane.opis,
      linki: dane.linki,
    });
    if (error) {
      console.error("Błąd tworzenia zestawu:", error);
      return "Nie udało się zapisać zestawu.";
    }
    setNowyZestaw(false);
    await pobierz();
    return null;
  }

  async function zapiszZestaw(id: number, dane: DaneZestawu): Promise<string | null> {
    const { error } = await supabase
      .from("zestawy_cwiczen")
      .update({
        nazwa: dane.nazwa,
        opis: dane.opis === "" ? null : dane.opis,
        linki: dane.linki,
      })
      .eq("id", id);
    if (error) {
      console.error("Błąd edycji zestawu:", error);
      return "Nie udało się zapisać zmian.";
    }
    setEdytowanyId(null);
    await pobierz();
    return null;
  }

  async function usunZestaw(zestaw: Zestaw) {
    const potwierdzenie = window.confirm(
      `Usunąć zestaw „${zestaw.nazwa}” razem z ćwiczeniami i całą historią wykonań?`
    );
    if (!potwierdzenie) return;

    const { error } = await supabase.from("zestawy_cwiczen").delete().eq("id", zestaw.id);
    if (error) {
      console.error("Błąd usuwania zestawu:", error);
      setBlad("Nie udało się usunąć zestawu.");
      return;
    }
    pobierz();
  }

  function otworzDodawanieCwiczenia(zestawId: number) {
    setDodawanieDla(zestawId);
    setNowaNazwaCw("");
    setNoweSledzone([]);
    setNoweLinki([]);
    setBladCw("");
  }

  async function dodajCwiczenie(zestaw: Zestaw) {
    if (nowaNazwaCw.trim() === "") {
      setBladCw("Podaj nazwę ćwiczenia.");
      return;
    }
    if (noweSledzone.length === 0) {
      setBladCw("Zaznacz przynajmniej jedno pole do śledzenia.");
      return;
    }

    const przygotowane = przygotujLinki(noweLinki);
    if (przygotowane.blad) {
      setBladCw(przygotowane.blad);
      return;
    }
    setBladCw("");

    const kolejnosc =
      zestaw.cwiczenia_zestawu.length > 0
        ? Math.max(...zestaw.cwiczenia_zestawu.map((c) => c.kolejnosc)) + 1
        : 0;

    const { error } = await supabase.from("cwiczenia_zestawu").insert({
      zestaw_id: zestaw.id,
      nazwa: nowaNazwaCw.trim(),
      kolejnosc,
      sledzone: noweSledzone,
      linki: przygotowane.linki,
    });

    if (error) {
      console.error("Błąd dodawania ćwiczenia:", error);
      setBladCw("Nie udało się dodać ćwiczenia.");
      return;
    }

    setDodawanieDla(null);
    pobierz();
  }

  async function usunCwiczenie(id: number) {
    const potwierdzenie = window.confirm(
      "Usunąć to ćwiczenie razem z historią jego wykonań?"
    );
    if (!potwierdzenie) return;

    const { error } = await supabase.from("cwiczenia_zestawu").delete().eq("id", id);
    if (error) {
      console.error("Błąd usuwania ćwiczenia:", error);
      setBlad("Nie udało się usunąć ćwiczenia.");
      return;
    }
    pobierz();
  }

  if (ladowanie) return <p className="text-gray-500 py-5">Ładowanie...</p>;

  return (
    <div className="flex flex-col gap-4 mt-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Zestawy ćwiczeń</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Własne zestawy z linkami i śledzeniem postępu w każdym ćwiczeniu.
          </p>
        </div>
        {!nowyZestaw && (
          <Button size="sm" onClick={() => setNowyZestaw(true)}>
            + Nowy zestaw
          </Button>
        )}
      </div>

      {blad && <p className="text-red-600 text-sm">{blad}</p>}

      {nowyZestaw && (
        <Card className="p-4">
          <FormularzZestawu
            poczatkowe={{ nazwa: "", opis: "", linki: [] }}
            etykietaZapisu="Utwórz zestaw"
            zapiszAction={utworzZestaw}
            anulujAction={() => setNowyZestaw(false)}
          />
        </Card>
      )}

      {zestawy.length === 0 && !nowyZestaw && (
        <p className="text-gray-400 text-sm">
          Brak zestawów — utwórz pierwszy, np. „Trening palców” z chwytotablicą.
        </p>
      )}

      {zestawy.map((zestaw) => (
        <Card key={zestaw.id} className="p-4">
          {edytowanyId === zestaw.id ? (
            <FormularzZestawu
              poczatkowe={{
                nazwa: zestaw.nazwa,
                opis: zestaw.opis ?? "",
                linki: zestaw.linki ?? [],
              }}
              etykietaZapisu="Zapisz zmiany"
              zapiszAction={(dane) => zapiszZestaw(zestaw.id, dane)}
              anulujAction={() => setEdytowanyId(null)}
            />
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-lg">{zestaw.nazwa}</div>
                  {zestaw.opis && (
                    <p className="text-gray-600 text-sm mt-1 whitespace-pre-line">
                      {zestaw.opis}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => setEdytowanyId(zestaw.id)}
                    className="text-gray-400 hover:text-blue-600"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => usunZestaw(zestaw)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {zestaw.linki?.length > 0 && (
                <div className="mt-2">
                  <ListaLinkow linki={zestaw.linki} />
                </div>
              )}

              <div className="flex flex-col gap-2 mt-4">
                {zestaw.cwiczenia_zestawu.map((cwiczenie) => (
                  <CwiczenieKarta
                    key={cwiczenie.id}
                    cwiczenie={cwiczenie}
                    zmianaAction={pobierz}
                    usunAction={usunCwiczenie}
                  />
                ))}

                {dodawanieDla === zestaw.id ? (
                  <div className="border border-dashed border-gray-300 rounded-md p-3 flex flex-col gap-2">
                    <Input
                      value={nowaNazwaCw}
                      onChange={(e) => setNowaNazwaCw(e.target.value)}
                      placeholder="Nazwa ćwiczenia (np. Chwytotablica 7/3)"
                      className="h-8 text-sm max-w-sm"
                      autoFocus
                    />
                    <div className="text-gray-500 text-xs">Co śledzić:</div>
                    <WyborPol wybrane={noweSledzone} zmianaAction={setNoweSledzone} />
                    <div className="text-gray-500 text-xs mt-1">
                      Linki do ćwiczenia (opcjonalnie):
                    </div>
                    <EdytorLinkow linki={noweLinki} zmianaAction={setNoweLinki} />
                    {bladCw && <p className="text-red-600 text-xs">{bladCw}</p>}
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => dodajCwiczenie(zestaw)}>
                        Dodaj ćwiczenie
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDodawanieDla(null)}
                      >
                        Anuluj
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => otworzDodawanieCwiczenia(zestaw.id)}
                    className="inline-flex items-center gap-1 rounded-full border border-gray-900 bg-gray-900 px-3 py-1 text-sm text-white transition-colors hover:bg-gray-700 w-fit"
                    >
                    <Plus size={13} /> Dodaj ćwiczenie
                    </button>
                )}
              </div>
            </>
          )}
        </Card>
      ))}
    </div>
  );
}