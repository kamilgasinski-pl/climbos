"use client";

import { useState, useEffect } from "react";
import { supabase } from "../supabaseclient";
import { NAZWY_KOMPETENCJI, Kompetencja } from "../engine/climbingKnowledgeEngine";
import { Card } from "@/components/ui/card";

type Priorytet = {
  id: number;
  kompetencja: string;
};

const MAX_PRIORYTETOW = 3;

export default function PriorytetyKompetencji() {
  const [priorytety, setPriorytety] = useState<Priorytet[]>([]);
  const [ladowanie, setLadowanie] = useState(true);
  const [blad, setBlad] = useState("");

  useEffect(() => {
    pobierzPriorytety();
  }, []);

  async function pobierzPriorytety() {
    const { data, error } = await supabase
      .from("priorytety_kompetencji")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Błąd pobierania priorytetów:", error);
      setBlad("Nie udało się pobrać priorytetów. Odśwież stronę.");
      setLadowanie(false);
      return;
    }
    setPriorytety(data as Priorytet[]);
    setLadowanie(false);
  }

  async function przelaczPriorytet(klucz: Kompetencja) {
    setBlad("");
    const istniejacy = priorytety.find((p) => p.kompetencja === klucz);

    if (istniejacy) {
      const { error } = await supabase
        .from("priorytety_kompetencji")
        .delete()
        .eq("id", istniejacy.id);

      if (error) {
        console.error("Błąd usuwania priorytetu:", error);
        setBlad("Nie udało się zaktualizować. Spróbuj ponownie.");
        return;
      }
      setPriorytety((poprzednie) => poprzednie.filter((p) => p.id !== istniejacy.id));
      return;
    }

    if (priorytety.length >= MAX_PRIORYTETOW) {
      setBlad(`Możesz wybrać maksymalnie ${MAX_PRIORYTETOW} priorytety.`);
      return;
    }

    const { data, error } = await supabase
      .from("priorytety_kompetencji")
      .insert({ kompetencja: klucz })
      .select()
      .single();

    if (error) {
      console.error("Błąd dodawania priorytetu:", error);
      setBlad("Nie udało się zaktualizować. Spróbuj ponownie.");
      return;
    }
    setPriorytety((poprzednie) => [...poprzednie, data as Priorytet]);
  }

  if (ladowanie) return <p className="text-gray-500">Ładowanie...</p>;

  return (
    <Card className="p-4">
      <div className="font-bold mb-1">Priorytety kompetencji</div>
      <p className="text-gray-500 text-sm mb-3">
        Wybierz do {MAX_PRIORYTETOW} obszarów, na których chcesz się teraz skupić.
      </p>
      <div className="flex gap-2 flex-wrap">
        {(Object.keys(NAZWY_KOMPETENCJI) as Kompetencja[]).map((klucz) => {
          const wybrany = priorytety.some((p) => p.kompetencja === klucz);
          return (
            <button
              key={klucz}
              onClick={() => przelaczPriorytet(klucz)}
             className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                wybrany
                  ? "bg-gray-900 border-gray-900 text-white"
                  : "border-gray-300 text-gray-700 hover:border-gray-400"
              }`}
            >
              {NAZWY_KOMPETENCJI[klucz]}
            </button>
          );
        })}
      </div>
      {blad && <p className="text-red-600 text-sm mt-2">{blad}</p>}
    </Card>
  );
}