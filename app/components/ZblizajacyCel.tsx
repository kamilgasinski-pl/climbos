"use client";

import { useState, useEffect } from "react";
import { supabase } from "../supabaseclient";
import { Card } from "@/components/ui/card";
import Link from "next/link";

type ZblizajacySieCel = {
  tytul: string;
  termin: string;
  kategoria: "dlugoterminowy" | "sredni" | "krotki";
  filar: "fizyczne" | "techniczne" | "mentalne" | null;
};

const NAZWY_KATEGORII: Record<string, string> = {
  dlugoterminowy: "Cel długoterminowy",
  sredni: "Cel średnioterminowy",
  krotki: "Cel krótkoterminowy",
};

const NAZWY_FILAROW: Record<string, string> = {
  fizyczne: "Fizyczne",
  techniczne: "Techniczne",
  mentalne: "Mentalne",
};

function formatujDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function dzisiajISO(): string {
  return new Date().toISOString().split("T")[0];
}

export default function ZblizajacyCel() {
  const [cel, setCel] = useState<ZblizajacySieCel | null>(null);
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
      .order("termin", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Błąd pobierania zbliżającego się celu:", error);
      setLadowanie(false);
      return;
    }

    setCel(data as ZblizajacySieCel | null);
    setLadowanie(false);
  }

  if (ladowanie || !cel) return null;

  const poTerminie = cel.termin < dzisiajISO();

  return (
    <Card className="mt-6 p-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="text-gray-500 text-sm">
            Zbliżający się cel
            {cel.filar && ` · ${NAZWY_FILAROW[cel.filar]}`}
          </div>
          <div className="text-lg font-bold mt-0.5">{cel.tytul}</div>
          <div className={`text-xs mt-0.5 ${poTerminie ? "text-red-600" : "text-gray-400"}`}>
            {NAZWY_KATEGORII[cel.kategoria]} · do {formatujDate(cel.termin)}
          </div>
        </div>
        <Link href="/planner?tab=cele" className="text-blue-600 hover:underline text-sm">
          Zobacz wszystkie cele →
        </Link>
      </div>
    </Card>
  );
}