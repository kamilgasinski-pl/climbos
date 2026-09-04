"use client";

import { useEffect, useState } from "react";
import { supabase } from "../supabaseclient";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Check } from "lucide-react";
import { Kompetencja } from "../engine/climbingKnowledgeEngine";

const DNI_TYGODNIA = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];

type BlokDzisiaj = {
  id: number;
  godzina_start: string;
  godzina_koniec: string;
  tytul: string;
  kompetencje: Kompetencja[] | null;
  kategorie_treningowe: { nazwa: string; kolor: string } | null;
};

type Wykonanie = {
  id: number;
  blok_id: number;
  tydzien_start: string;
};

type Props = {
  onZmiana?: () => void;
};

function dzisiejszyIndeks(): number {
  const jsDzien = new Date().getDay();
  return (jsDzien + 6) % 7;
}

function poniedzialekTygodnia(data: Date): Date {
  const kopia = new Date(data);
  const dzienTygodnia = kopia.getDay();
  const przesuniecie = dzienTygodnia === 0 ? -6 : 1 - dzienTygodnia;
  kopia.setDate(kopia.getDate() + przesuniecie);
  kopia.setHours(0, 0, 0, 0);
  return kopia;
}

function toISODate(data: Date): string {
  return data.toISOString().split("T")[0];
}

function skroconaGodzina(godzina: string): string {
  return godzina.slice(0, 5);
}

export default function DzisiejszeAktywnosci({ onZmiana }: Props) {
  const [bloki, setBloki] = useState<BlokDzisiaj[]>([]);
  const [wykonania, setWykonania] = useState<Wykonanie[]>([]);
  const [ladowanie, setLadowanie] = useState(true);
  const [blad, setBlad] = useState("");

  const tydzienStart = toISODate(poniedzialekTygodnia(new Date()));

  useEffect(() => {
    pobierz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pobierz() {
    const [blokiRes, wykonaniaRes] = await Promise.all([
      supabase
        .from("bloki_tygodniowe")
        .select("id, godzina_start, godzina_koniec, tytul, kompetencje, kategorie_treningowe(nazwa, kolor)")
        .eq("dzien_tygodnia", dzisiejszyIndeks())
        .order("godzina_start", { ascending: true }),
      supabase.from("wykonania_blokow").select("id, blok_id, tydzien_start").eq("tydzien_start", tydzienStart),
    ]);

    if (blokiRes.error || wykonaniaRes.error) {
      console.error("Błąd pobierania dzisiejszych aktywności:", blokiRes.error ?? wykonaniaRes.error);
      setBlad("Nie udało się pobrać dzisiejszych aktywności.");
      setLadowanie(false);
      return;
    }
    setBloki(blokiRes.data as unknown as BlokDzisiaj[]);
    setWykonania(wykonaniaRes.data as Wykonanie[]);
    setLadowanie(false);
  }

  async function przelaczWykonanie(blokId: number) {
    const istniejace = wykonania.find((w) => w.blok_id === blokId);

    if (istniejace) {
      const { error } = await supabase.from("wykonania_blokow").delete().eq("id", istniejace.id);
      if (error) {
        console.error("Błąd usuwania wykonania:", error);
        setBlad("Nie udało się zaktualizować. Spróbuj ponownie.");
        return;
      }
      setWykonania((poprzednie) => poprzednie.filter((w) => w.id !== istniejace.id));
    } else {
      const { data, error } = await supabase
        .from("wykonania_blokow")
        .insert({ blok_id: blokId, tydzien_start: tydzienStart })
        .select()
        .single();

      if (error) {
        console.error("Błąd zapisu wykonania:", error);
        setBlad("Nie udało się zaktualizować. Spróbuj ponownie.");
        return;
      }
      setWykonania((poprzednie) => [...poprzednie, data as Wykonanie]);
    }

    onZmiana?.();
  }

  const dzisiaj = DNI_TYGODNIA[dzisiejszyIndeks()];

  return (
    <Card className="p-4 mt-6">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-bold text-lg">Dzisiejsze aktywności</h2>
        <div className="flex items-center gap-3">
          <Link href="/planner?tab=realizacja" className="text-blue-600 hover:underline text-sm">
            Zobacz w Planerze →
          </Link>
          <span className="text-gray-400 text-sm">{dzisiaj}</span>
        </div>
      </div>

      {ladowanie ? (
        <p className="text-gray-500 text-sm">Ładowanie...</p>
      ) : blad ? (
        <p className="text-red-600 text-sm">{blad}</p>
      ) : bloki.length === 0 ? (
        <div className="text-gray-500 text-sm">
          Nic nie zaplanowano na dziś.{" "}
          <Link href="/planner?tab=harmonogram" className="text-blue-600 hover:underline">
            Dodaj aktywność →
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {bloki.map((b) => {
            const kolor = b.kategorie_treningowe?.kolor ?? "#9ca3af";
            const wykonano = wykonania.some((w) => w.blok_id === b.id);
            return (
              <li
                key={b.id}
                className="flex items-center gap-3 rounded-md px-3 py-2"
                style={{ backgroundColor: kolor + "1a", borderLeft: `3px solid ${kolor}` }}
              >
                <button
                  onClick={() => przelaczWykonanie(b.id)}
                  className={`w-5 h-5 shrink-0 rounded-md border flex items-center justify-center transition-colors ${
                    wykonano
                      ? "bg-green-600 border-green-600 text-white"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                  aria-label={wykonano ? "Oznacz jako niewykonane" : "Oznacz jako wykonane"}
                >
                  {wykonano && <Check size={12} />}
                </button>
                <span className="text-sm font-mono text-gray-500 w-[90px] shrink-0">
                  {skroconaGodzina(b.godzina_start)}–{skroconaGodzina(b.godzina_koniec)}
                </span>
                <span className={`text-sm font-medium ${wykonano ? "line-through text-gray-400" : ""}`}>
                  {b.tytul}
                </span>
                {b.kategorie_treningowe?.nazwa && (
                  <span className="text-xs text-gray-400 ml-auto">
                    {b.kategorie_treningowe.nazwa}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}