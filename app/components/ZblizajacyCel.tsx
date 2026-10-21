"use client";

import { useState, useEffect } from "react";
import { supabase } from "../supabaseclient";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

type Filar = "fizyczne" | "techniczne" | "mentalne" | "inne";

type CelZTerminem = {
  tytul: string;
  termin: string;
  kategoria: "dlugoterminowy" | "sredni" | "krotki";
  filar: Filar;
};

const FILARY: Filar[] = ["fizyczne", "techniczne", "mentalne", "inne"];

const NAZWY_FILAROW: Record<Filar, string> = {
  fizyczne: "Fizyczne",
  techniczne: "Techniczne",
  mentalne: "Mentalne",
  inne: "Inne",
};

const NAZWY_KATEGORII: Record<string, string> = {
  dlugoterminowy: "Cel długoterminowy",
  sredni: "Cel średnioterminowy",
  krotki: "Cel krótkoterminowy",
};

function dzisiajLokalnie(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dz = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dz}`;
}

function formatujDate(iso: string): string {
  const [r, m, d] = iso.split("-").map(Number);
  return new Date(r, m - 1, d).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ZblizajacyCel() {
  const [cele, setCele] = useState<Partial<Record<Filar, CelZTerminem>>>({});
  const [ladowanie, setLadowanie] = useState(true);

  useEffect(() => {
    pobierz();
  }, []);

  async function pobierz() {
    const { data, error } = await supabase
      .from("cele_posrednie")
      .select("tytul, termin, kategoria, filar")
      .eq("wykonany", false)
      .not("termin", "is", null)
      .not("filar", "is", null)
      .order("termin", { ascending: true });

    if (error) {
      console.error("Błąd pobierania zbliżających się celów:", error);
      setLadowanie(false);
      return;
    }

    // Lista jest posortowana rosnąco po terminie, więc pierwszy cel
    // napotkany dla danej kategorii jest jej najbliższym.
    const najblizsze: Partial<Record<Filar, CelZTerminem>> = {};
    for (const cel of data as CelZTerminem[]) {
      if (FILARY.includes(cel.filar) && !najblizsze[cel.filar]) {
        najblizsze[cel.filar] = cel;
      }
    }

    setCele(najblizsze);
    setLadowanie(false);
  }

  if (ladowanie) return null;

  const dzisiaj = dzisiajLokalnie();

  return (
    <Card className="mt-6 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-gray-500 text-sm">Zbliżające się cele</div>
        <Link href="/planner?tab=cele" className={buttonVariants({ size: "sm" })}>
          Zobacz wszystkie cele
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {FILARY.map((filar) => {
          const cel = cele[filar];
          const poTerminie = cel ? cel.termin < dzisiaj : false;

          return (
            <div key={filar} className="border border-gray-200 rounded-lg p-3">
              <div className="text-gray-400 text-xs uppercase tracking-wide">
                {NAZWY_FILAROW[filar]}
              </div>
              {cel ? (
                <>
                  <div className="font-bold mt-1">{cel.tytul}</div>
                  <div className={`text-xs mt-1 ${poTerminie ? "text-red-600" : "text-gray-400"}`}>
                    {NAZWY_KATEGORII[cel.kategoria]} · do {formatujDate(cel.termin)}
                  </div>
                </>
              ) : (
                <div className="text-gray-400 text-sm mt-1">Brak celu z terminem</div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}