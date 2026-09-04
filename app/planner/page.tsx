"use client";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { supabase } from "../supabaseclient";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import HarmonogramTygodniowy from "../components/HarmonogramTygodniowy";
import SledzenieRealizacji from "../components/SledzenieRealizacji";
import PiramidaCelow from "../components/PiramidaCelow";
import { useSearchParams } from "next/navigation";

type Sesja = {
  id: number;
  data_treningu: string;
  miejsce: string;
  czas_trwania_min: number;
  notatka: string | null;
};

type Grupa = {
  etykieta: string;
  sesje: Sesja[];
};

type ZakresWidoku = "dzien" | "tydzien" | "miesiac";
type Zakladka = "sesje" | "harmonogram" | "realizacja" | "cele";

function poczatekTygodnia(data: Date): Date {
  const kopia = new Date(data);
  const dzienTygodnia = kopia.getDay();
  const przesuniecie = dzienTygodnia === 0 ? -6 : 1 - dzienTygodnia;
  kopia.setDate(kopia.getDate() + przesuniecie);
  kopia.setHours(0, 0, 0, 0);
  return kopia;
}

function formatujDate(data: Date): string {
  return data.toLocaleDateString("pl-PL", { day: "numeric", month: "long" });
}

function formatujDzien(data: Date): string {
  return data.toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatujMiesiac(data: Date): string {
  const tekst = data.toLocaleDateString("pl-PL", { month: "long", year: "numeric" });
  return tekst.charAt(0).toUpperCase() + tekst.slice(1);
}

function grupujSesje(
  sesje: Sesja[],
  klucz: (data: Date) => string,
  etykieta: (data: Date) => string
): Grupa[] {
  const grupy = new Map<string, Grupa>();

  for (const sesja of sesje) {
    const data = new Date(sesja.data_treningu);
    const kluczGrupy = klucz(data);

    if (!grupy.has(kluczGrupy)) {
      grupy.set(kluczGrupy, { etykieta: etykieta(data), sesje: [] });
    }
    grupy.get(kluczGrupy)!.sesje.push(sesja);
  }

  return Array.from(grupy.values());
}

function pogrupujWgWidoku(sesje: Sesja[], widok: ZakresWidoku): Grupa[] {
  if (widok === "dzien") {
    return grupujSesje(
      sesje,
      (data) => data.toISOString().split("T")[0],
      (data) => formatujDzien(data)
    );
  }

  if (widok === "miesiac") {
    return grupujSesje(
      sesje,
      (data) => `${data.getFullYear()}-${data.getMonth()}`,
      (data) => formatujMiesiac(data)
    );
  }

  return grupujSesje(
    sesje,
    (data) => poczatekTygodnia(data).toISOString().split("T")[0],
    (data) => {
      const poniedzialek = poczatekTygodnia(data);
      const niedziela = new Date(poniedzialek);
      niedziela.setDate(niedziela.getDate() + 6);
      return `${formatujDate(poniedzialek)} – ${formatujDate(niedziela)}`;
    }
  );
}

function poprawnaZakladka(wartosc: string | null): Zakladka {
  if (wartosc === "harmonogram" || wartosc === "realizacja" || wartosc === "cele") {
    return wartosc;
  }
  return "sesje";
}

export default function Planner() {
  const searchParams = useSearchParams();
  const [aktywnaZakladka, setAktywnaZakladka] = useState<Zakladka>(
    poprawnaZakladka(searchParams.get("tab"))
  );
  const [widokZakres, setWidokZakres] = useState<ZakresWidoku>("tydzien");
  const [nadchodzace, setNadchodzace] = useState<Sesja[]>([]);
  const [ladowanie, setLadowanie] = useState(true);
  const [bladFormularza, setBladFormularza] = useState("");
  const [bladPobierania, setBladPobierania] = useState("");
  const [dataTreningu, setDataTreningu] = useState("");
  const [miejsce, setMiejsce] = useState("");
  const [czasTrwania, setCzasTrwania] = useState(60);
  const [notatka, setNotatka] = useState("");

  useEffect(() => {
    pobierzNadchodzace();
  }, []);

  async function pobierzNadchodzace() {
    const dzisiaj = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("sesje")
      .select("*")
      .gte("data_treningu", dzisiaj)
      .order("data_treningu", { ascending: true });

    if (error) {
      console.error("Błąd pobierania:", error);
      setBladPobierania("Nie udało się pobrać danych. Sprawdź połączenie i odśwież stronę.");
      setLadowanie(false);
      return;
    }
    setNadchodzace(data as Sesja[]);
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
    pobierzNadchodzace();
  }

  const grupy = pogrupujWgWidoku(nadchodzace, widokZakres);

  return (
    <main className="p-10 font-sans">
      <h1 className="text-3xl font-bold">Planner</h1>
      <p className="text-gray-500">Twoje nadchodzące sesje treningowe</p>

      <div className="flex gap-2 mt-5 flex-wrap">
        <Button
          variant={aktywnaZakladka === "sesje" ? "default" : "outline"}
          onClick={() => setAktywnaZakladka("sesje")}
        >
          Sesje
        </Button>
        <Button
          variant={aktywnaZakladka === "harmonogram" ? "default" : "outline"}
          onClick={() => setAktywnaZakladka("harmonogram")}
        >
          Harmonogram tygodniowy
        </Button>
        <Button
          variant={aktywnaZakladka === "realizacja" ? "default" : "outline"}
          onClick={() => setAktywnaZakladka("realizacja")}
        >
          Realizacja
        </Button>
        <Button
          variant={aktywnaZakladka === "cele" ? "default" : "outline"}
          onClick={() => setAktywnaZakladka("cele")}
        >
          Cele
        </Button>
      </div>

      {aktywnaZakladka === "harmonogram" ? (
        <div className="mt-5">
          <HarmonogramTygodniowy />
        </div>
      ) : aktywnaZakladka === "realizacja" ? (
        <div className="mt-5">
          <SledzenieRealizacji />
        </div>
       ) : aktywnaZakladka === "cele" ? (
        <div className="mt-5">
          <PiramidaCelow />
        </div>
      ) : (
        <>
          <Card className="flex flex-col gap-3 mt-5 p-4">
            <div className="flex gap-2 flex-wrap items-center">
              <Input
                type="date"
                value={dataTreningu}
                onChange={(e) => setDataTreningu(e.target.value)}
              />
              <Input
                value={miejsce}
                onChange={(e) => setMiejsce(e.target.value)}
                placeholder="Miejsce (np. Ścianka XYZ)"
              />
              <div className="relative">
                <Input
                  type="number"
                  value={czasTrwania}
                  onChange={(e) => setCzasTrwania(Number(e.target.value))}
                  className="w-[100px] pr-9"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
                  min
                </span>
              </div>
            </div>

            <textarea
              value={notatka}
              onChange={(e) => setNotatka(e.target.value)}
              placeholder="Notatka (opcjonalnie)"
              rows={2}
              className="p-2 border border-gray-300 rounded-md w-full resize-none text-sm"
            />

            <div>
              <Button onClick={dodajSesje}>Zaplanuj sesję</Button>
            </div>
          </Card>
          {bladFormularza && <p className="text-red-600 text-sm mt-2">{bladFormularza}</p>}

          <div className="flex gap-2 mt-5">
            <Button
              size="sm"
              variant={widokZakres === "dzien" ? "default" : "outline"}
              onClick={() => setWidokZakres("dzien")}
            >
              Dzień
            </Button>
            <Button
              size="sm"
              variant={widokZakres === "tydzien" ? "default" : "outline"}
              onClick={() => setWidokZakres("tydzien")}
            >
              Tydzień
            </Button>
            <Button
              size="sm"
              variant={widokZakres === "miesiac" ? "default" : "outline"}
              onClick={() => setWidokZakres("miesiac")}
            >
              Miesiąc
            </Button>
          </div>

          {ladowanie ? (
            <div className="flex items-center gap-2 text-gray-500 mt-8">
              <Loader2 className="animate-spin" size={20} />
              Ładowanie sesji...
            </div>
          ) : bladPobierania ? (
            <p className="text-red-600 mt-8">{bladPobierania}</p>
          ) : grupy.length === 0 ? (
            <p className="text-gray-500 mt-5">
              Brak zaplanowanych sesji.{" "}
              <Link href="/sesje" className="text-blue-600 hover:underline">
                Dodaj nową sesję
              </Link>{" "}
              z datą w przyszłości, żeby pojawiła się tutaj.
            </p>
          ) : (
            grupy.map((grupa) => (
              <div key={grupa.etykieta} className="mt-8">
                <h2 className="text-lg text-gray-700 border-b-2 border-gray-300 pb-2 capitalize">
                  {grupa.etykieta}
                </h2>
                <ul className="list-none p-0 mt-3">
                  {grupa.sesje.map((s) => (
                    <li key={s.id}>
                      <Card className="flex flex-row items-center justify-between p-4">
                        <div>
                          <strong>{s.miejsce}</strong> — {s.data_treningu}
                          <div className="text-gray-500 text-sm">{s.czas_trwania_min} min</div>
                          {s.notatka && (
                            <p className="text-gray-600 text-sm italic mt-1">{s.notatka}</p>
                          )}
                        </div>
                        <Link
                          href={`/sesje/${s.id}`}
                          className={buttonVariants({ variant: "outline" })}
                        >
                          Szczegóły
                        </Link>
                      </Card>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </>
      )}
    </main>
  );
}