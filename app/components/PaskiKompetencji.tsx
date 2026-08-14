"use client";

import { Card } from "@/components/ui/card";
import {
  FILARY,
  NAZWY_FILAROW,
  NAZWY_KOMPETENCJI,
  Filar,
  Kompetencja,
} from "../engine/climbingKnowledgeEngine";

type Props = {
  kompetencje: Record<Kompetencja, number>;
};

const KOLEJNOSC_FILAROW: Filar[] = ["fizyczne", "techniczne", "mentalne"];

const KOLOR_FILARU: Record<Filar, string> = {
  mentalne: "#8b5cf6",
  techniczne: "#3b82f6",
  fizyczne: "#f97316",
};

export default function PaskiKompetencji({ kompetencje }: Props) {
  return (
    <Card className="p-4 mt-6">
      <h2 className="font-bold text-lg mb-4">Rozwój kompetencji</h2>
      <div className="flex flex-col gap-5">
        {KOLEJNOSC_FILAROW.map((filar, indeks) => (
          <div
            key={filar}
            className={indeks > 0 ? "pt-5 border-t border-gray-200" : ""}
          >
            <div className="text-sm font-bold uppercase tracking-wide text-gray-700 mb-3">
              {NAZWY_FILAROW[filar]}
            </div>
            <div className="flex flex-col gap-3">
              {FILARY[filar].map((klucz) => {
                const wartosc = kompetencje[klucz] ?? 0;
                return (
                  <div key={klucz} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-[140px] shrink-0">
                      {NAZWY_KOMPETENCJI[klucz]}
                    </span>
                    <div className="flex-1 h-2.5 bg-gray-100 border border-gray-200 rounded-md overflow-hidden">
                      <div
                        className="h-full rounded-md transition-all"
                        style={{
                          width: `${wartosc}%`,
                          backgroundColor: KOLOR_FILARU[filar],
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-[28px] text-right">
                      {wartosc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}