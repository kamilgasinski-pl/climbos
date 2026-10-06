"use client";

import { useState, useEffect } from "react";
import { supabase } from "../supabaseclient";
import { Card } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Loader2 } from "lucide-react";

type PomiarCiala = {
  data_pomiaru: string;
  waga_kg: number;
  bmi: number | null;
  tkanka_tluszczowa_procent: number | null;
  masa_miesniowa_kg: number | null;
  procent_miesni: number | null;
  woda_procent: number | null;
  bialko_procent: number | null;
  mineraly_kosci_procent: number | null;
  masa_miesni_szkieletowych_kg: number | null;
  tluszcz_trzewny: number | null;
  bmr_kcal: number | null;
  lbm_kg: number | null;
  impedancja_50khz: number | null;
  impedancja_250khz: number | null;
};

type PoleWykresu = {
  klucz: keyof PomiarCiala;
  etykieta: string;
  jednostka: string;
};

const SEKCJE: { tytul: string; pola: PoleWykresu[] }[] = [
  {
    tytul: "Podstawowe",
    pola: [
      { klucz: "waga_kg", etykieta: "Waga", jednostka: "kg" },
      { klucz: "bmi", etykieta: "BMI", jednostka: "" },
    ],
  },
  {
    tytul: "Skład ciała",
    pola: [
      { klucz: "tkanka_tluszczowa_procent", etykieta: "Tkanka tłuszczowa", jednostka: "%" },
      { klucz: "masa_miesniowa_kg", etykieta: "Masa mięśniowa", jednostka: "kg" },
      { klucz: "procent_miesni", etykieta: "Procent mięśni", jednostka: "%" },
      { klucz: "masa_miesni_szkieletowych_kg", etykieta: "Masa mięśni szkiel.", jednostka: "kg" },
      { klucz: "lbm_kg", etykieta: "LBM (bez tłuszczu)", jednostka: "kg" },
    ],
  },
  {
    tytul: "Pozostałe",
    pola: [
      { klucz: "woda_procent", etykieta: "Woda", jednostka: "%" },
      { klucz: "bialko_procent", etykieta: "Białko", jednostka: "%" },
      { klucz: "mineraly_kosci_procent", etykieta: "Minerały kości", jednostka: "%" },
      { klucz: "tluszcz_trzewny", etykieta: "Tłuszcz trzewny", jednostka: "" },
      { klucz: "bmr_kcal", etykieta: "BMR", jednostka: "kcal" },
    ],
  },
  {
    tytul: "Impedancja",
    pola: [
      { klucz: "impedancja_50khz", etykieta: "50 kHz", jednostka: "" },
      { klucz: "impedancja_250khz", etykieta: "250 kHz", jednostka: "" },
    ],
  },
];

const WSZYSTKIE_POLA: PoleWykresu[] = SEKCJE.flatMap((s) => s.pola);

function formatujDate(data: string): string {
  return new Date(data).toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
}

export default function WykresPomiarowCiala() {
  const [pomiary, setPomiary] = useState<PomiarCiala[]>([]);
  const [ladowanie, setLadowanie] = useState(true);
  const [wybranePole, setWybranePole] = useState<keyof PomiarCiala>("waga_kg");

  useEffect(() => {
    pobierz();
  }, []);

  async function pobierz() {
    const { data, error } = await supabase
      .from("pomiary_ciala")
      .select("*")
      .order("data_pomiaru", { ascending: true });

    if (error) {
      console.error("Błąd pobierania pomiarów ciała:", error);
      setLadowanie(false);
      return;
    }
    setPomiary(data as PomiarCiala[]);
    setLadowanie(false);
  }

  if (ladowanie) {
    return (
      <Card className="p-4 flex items-center gap-2 text-gray-500 text-sm">
        <Loader2 className="animate-spin" size={16} />
        Ładowanie...
      </Card>
    );
  }

  if (pomiary.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-gray-500 text-sm">
          Brak pomiarów — dodaj pierwszy w zakładce Profil, żeby zobaczyć wykres.
        </p>
      </Card>
    );
  }

  const poleInfo = WSZYSTKIE_POLA.find((p) => p.klucz === wybranePole)!;

  const daneWykresu = pomiary
    .filter((p) => p[wybranePole] != null)
    .map((p) => ({
      data: p.data_pomiaru,
      wartosc: p[wybranePole] as number,
    }));

  return (
    <Card className="p-4">
      <div className="text-gray-500 text-sm mb-3">Pomiary ciała w czasie</div>

      <div className="flex flex-col gap-2 mb-4">
        {SEKCJE.map((sekcja) => (
          <div key={sekcja.tytul} className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-400 text-xs w-[90px] shrink-0">{sekcja.tytul}</span>
            {sekcja.pola.map((pole) => (
              <button
                key={pole.klucz}
                type="button"
                onClick={() => setWybranePole(pole.klucz)}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                  wybranePole === pole.klucz
                    ? "bg-gray-900 border-gray-900 text-white"
                    : "border-gray-300 text-gray-600 hover:border-gray-400"
                }`}
              >
                {pole.etykieta}
              </button>
            ))}
          </div>
        ))}
      </div>

      {daneWykresu.length === 0 ? (
        <p className="text-gray-400 text-sm py-5 text-center">
          Brak danych dla "{poleInfo.etykieta}" — żaden zapisany pomiar nie ma wypełnionej tej
          wartości.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={daneWykresu} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="data"
              tickFormatter={formatujDate}
              tick={{ fontSize: 12, fill: "#6b7280" }}
            />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fontSize: 12, fill: "#6b7280" }}
              width={45}
            />
            <Tooltip
              content={({ active, payload }: any) => {
                if (!active || !payload || payload.length === 0) return null;
                const punkt = payload[0].payload as { data: string; wartosc: number };
                return (
                  <div className="bg-white border border-gray-300 rounded-md px-3 py-2 shadow-sm">
                    <div className="text-sm text-gray-500">{formatujDate(punkt.data)}</div>
                    <div className="font-bold">
                      {punkt.wartosc} {poleInfo.jednostka}
                    </div>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="wartosc"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 4, fill: "#2563eb" }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}