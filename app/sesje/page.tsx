"use client";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { supabase } from "../supabaseclient";
import Link from "next/link";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";

type Przejscie = {
  id: number;
  nazwa_drogi: string;
  trudnosc: string;
  styl: string;
};

type Sesja = {
  id: number;
  data_treningu: string;
  miejsce: string;
  czas_trwania_min: number;
  notatka: string | null;
  przejscia: Przejscie[];
};

export default function Sesje() {
  const [sesje, setSesje] = useState<Sesja[]>([]);
  const [ladowanie, setLadowanie] = useState(true);
  const [bladPobierania, setBladPobierania] = useState("");
  const [bladFormularza, setBladFormularza] = useState("");
  const [dataTreningu, setDataTreningu] = useState("");
  const [miejsce, setMiejsce] = useState("");
  const [czasTrwania, setCzasTrwania] = useState(60);
  const [notatka, setNotatka] = useState("");
  const [rozwinieteSesje, setRozwinieteSesje] = useState<Set<number>>(new Set());

  useEffect(() => {
    pobierzSesje();
  }, []);

  async function pobierzSesje() {
    const { data, error } = await supabase
      .from("sesje")
      .select("*, przejscia(*)")
      .order("data_treningu", { ascending: false });

    if (error) {
      console.error("Błąd pobierania sesji:", error);
      setBladPobierania("Nie udało się pobrać danych. Sprawdź połączenie i odśwież stronę.");
      setLadowanie(false);
      return;
    }
    setSesje(data as Sesja[]);
    setLadowanie(false);
  }

  async function dodajSesje() {
    if (dataTreningu === "" || miejsce.trim() === "") {
      setBladFormularza("Podaj datę i miejsce sesji.");
      return;
    }
    setBladFormularza("");

    const { error } = await supabase.from("sesje").insert({
      data_treningu: dataTreningu,
      miejsce: miejsce,
      czas_trwania_min: czasTrwania,
      notatka: notatka.trim() === "" ? null : notatka,
    });

    if (error) {
      console.error("Błąd dodawania sesji:", error);
      setBladFormularza("Nie udało się dodać sesji. Spróbuj ponownie.");
      return;
    }

    setDataTreningu("");
    setMiejsce("");
    setCzasTrwania(60);
    setNotatka("");
    pobierzSesje();
  }

  async function usunSesje(id: number) {
    const { error } = await supabase.from("sesje").delete().eq("id", id);
    if (error) {
      console.error("Błąd usuwania sesji:", error);
      setBladPobierania("Nie udało się usunąć sesji. Spróbuj ponownie.");
      return;
    }
    pobierzSesje();
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

  return (
    <main className="p-10 font-sans">
      <h1 className="text-3xl font-bold">Sesje treningowe</h1>

      <div className="flex gap-2 mt-5 flex-wrap">
        <input
          type="date"
          value={dataTreningu}
          onChange={(e) => setDataTreningu(e.target.value)}
        />
        <input
          value={miejsce}
          onChange={(e) => setMiejsce(e.target.value)}
          placeholder="Miejsce (np. Ścianka XYZ)"
          className="p-2 border border-gray-300 rounded-md"
        />
        <input
          type="number"
          value={czasTrwania}
          onChange={(e) => setCzasTrwania(Number(e.target.value))}
          placeholder="Czas (min)"
          className="p-2 border border-gray-300 rounded-md w-[100px]"
        />
        <Button onClick={dodajSesje}>Dodaj sesję</Button>
      </div>
      <textarea
        value={notatka}
        onChange={(e) => setNotatka(e.target.value)}
        placeholder="Notatka (opcjonalnie)"
        rows={2}
        className="mt-2 p-2 border border-gray-300 rounded-md w-full max-w-md resize-none"
      />
      {bladFormularza && (
        <p className="text-red-600 text-sm mt-2">{bladFormularza}</p>
      )}

      {ladowanie ? (
        <div className="flex items-center gap-2 text-gray-500 mt-8">
          <Loader2 className="animate-spin" size={20} />
          Ładowanie sesji...
        </div>
      ) : bladPobierania ? (
        <p className="text-red-600 mt-8">{bladPobierania}</p>
      ) : (
        <ul className="list-none p-0 mt-8">
          {sesje.map((s) => {
            const rozwinieta = rozwinieteSesje.has(s.id);

            return (
              <li key={s.id}>
                <Card className="p-3">
                  <div className="flex flex-row items-center justify-between">
                    <div>
                      <strong>{s.data_treningu}</strong> — {s.miejsce} ({s.czas_trwania_min} min)
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
                        Szczegóły
                      </Link>
                      <Button variant="destructive" onClick={() => usunSesje(s.id)}>
                        Usuń
                      </Button>
                    </div>
                  </div>

                  {rozwinieta && (
                    <div className="mt-3 pt-3 border-t border-gray-200 flex flex-col gap-2">
                      {s.notatka && (
                        <p className="text-gray-600 text-sm italic border-l-2 border-gray-200 pl-2">
                          {s.notatka}
                        </p>
                      )}
                      {s.przejscia.length === 0 ? (
                        <p className="text-gray-500 text-sm">Brak dróg w tej sesji.</p>
                      ) : (
                        s.przejscia.map((p) => (
                          <div key={p.id} className="flex items-center gap-4 text-sm">
                            <strong>{p.nazwa_drogi}</strong>
                            <span className="text-gray-500">{p.trudnosc}</span>
                            <span className="text-gray-500">{p.styl}</span>
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
      )}
    </main>
  );
}