"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "../supabaseclient";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import {
  POLA_SLEDZENIA,
  PoleSledzenia,
  WykonanieCwiczenia,
  formatujWykonanie,
} from "../engine/cwiczeniaEngine";

type CwiczenieSkrot = {
  id: number;
  nazwa: string;
  kolejnosc: number;
  sledzone: PoleSledzenia[];
};

type ZestawSkrot = {
  id: number;
  nazwa: string;
  cwiczenia_zestawu: CwiczenieSkrot[];
};

type PunktWykresu = {
  data: string;
  wartosc: number;
  wpis: WykonanieCwiczenia;
};

function formatujDate(iso: string): string {
  const [r, m, d] = iso.split("-").map(Number);
  return new Date(r, m - 1, d).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "short",
  });
}

function WykresCwiczenia({
  cwiczenie,
  wpisy,
}: {
  cwiczenie: CwiczenieSkrot;
  wpisy: WykonanieCwiczenia[];
}) {
  const [wybrana, setWybrana] = useState<PoleSledzenia | null>(null);

  const metryki = POLA_SLEDZENIA.filter(
    (p) => p.liczbowe && cwiczenie.sledzone.includes(p.klucz)
  );
  const aktywna: PoleSledzenia | null =
    wybrana && metryki.some((m) => m.klucz === wybrana) ? wybrana : metryki[0]?.klucz ?? null;
  const opis = metryki.find((m) => m.klucz === aktywna);

  const dane: PunktWykresu[] = aktywna
    ? [...wpisy]
        .filter((w) => w[aktywna] != null)
        .sort((a, b) => a.data.localeCompare(b.data) || a.id - b.id)
        .map((w) => ({ data: w.data, wartosc: Number(w[aktywna]), wpis: w }))
    : [];

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <div className="font-medium">{cwiczenie.nazwa}</div>

      {wpisy.length === 0 ? (
        <p className="text-gray-400 text-sm mt-1">
          Brak wpisów — dodaj pierwszy w zakładce „Zestawy".
        </p>
      ) : metryki.length === 0 ? (
        <p className="text-gray-400 text-sm mt-1">
          To ćwiczenie śledzi tylko notatki, więc nie ma liczb do wykresu.
        </p>
      ) : (
        <>
          {metryki.length > 1 && (
            <div className="flex gap-1.5 flex-wrap mt-2">
              {metryki.map((m) => (
                <button
                  key={m.klucz}
                  type="button"
                  onClick={() => setWybrana(m.klucz)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    aktywna === m.klucz
                      ? "bg-gray-900 border-gray-900 text-white"
                      : "border-gray-300 text-gray-600 hover:border-gray-400"
                  }`}
                >
                  {m.etykieta}
                </button>
              ))}
            </div>
          )}

          {dane.length === 0 ? (
            <p className="text-gray-400 text-sm mt-3">
              Żaden wpis nie ma wartości „{opis?.etykieta}".
            </p>
          ) : (
            <div className="mt-3">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={dane} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
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
                    unit={opis?.jednostka ? ` ${opis.jednostka}` : ""}
                  />
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const punkt = payload[0].payload as PunktWykresu;
                      return (
                        <div className="bg-white border border-gray-300 rounded-md px-3 py-2 shadow-sm">
                          <div className="text-sm text-gray-500">{formatujDate(punkt.data)}</div>
                          <div className="text-sm font-medium">
                            {formatujWykonanie(punkt.wpis, cwiczenie.sledzone) || "—"}
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
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function PostepZestawow() {
  const [zestawy, setZestawy] = useState<ZestawSkrot[]>([]);
  const [wybranyId, setWybranyId] = useState("");
  const [wykonania, setWykonania] = useState<WykonanieCwiczenia[]>([]);
  const [ladowanieZestawow, setLadowanieZestawow] = useState(true);
  const [ladowanieWykonan, setLadowanieWykonan] = useState(false);
  const [blad, setBlad] = useState("");

  useEffect(() => {
    async function pobierzZestawy() {
      const { data, error } = await supabase
        .from("zestawy_cwiczen")
        .select("id, nazwa, cwiczenia_zestawu(id, nazwa, kolejnosc, sledzone)")
        .order("created_at", { ascending: true })
        .order("kolejnosc", { referencedTable: "cwiczenia_zestawu", ascending: true });

      if (error) {
        console.error("Błąd pobierania zestawów:", error);
        setBlad("Nie udało się pobrać zestawów.");
        setLadowanieZestawow(false);
        return;
      }

      const lista = data as unknown as ZestawSkrot[];
      setZestawy(lista);
      if (lista.length > 0) setWybranyId(String(lista[0].id));
      setLadowanieZestawow(false);
    }

    pobierzZestawy();
  }, []);

  const zestaw = zestawy.find((z) => String(z.id) === wybranyId);

  useEffect(() => {
    if (!zestaw) {
      setWykonania([]);
      return;
    }

    const idCwiczen = zestaw.cwiczenia_zestawu.map((c) => c.id);
    if (idCwiczen.length === 0) {
      setWykonania([]);
      return;
    }

    let aktualne = true;
    setLadowanieWykonan(true);
    setBlad("");

    supabase
      .from("wykonania_cwiczen")
      .select("*")
      .in("cwiczenie_id", idCwiczen)
      .order("data", { ascending: false })
      .order("id", { ascending: false })
      .then(({ data, error }) => {
        if (!aktualne) return;
        if (error) {
          console.error("Błąd pobierania wykonań:", error);
          setBlad("Nie udało się pobrać wyników.");
        } else {
          setWykonania(data as WykonanieCwiczenia[]);
        }
        setLadowanieWykonan(false);
      });

    return () => {
      aktualne = false;
    };
  }, [zestaw]);

  if (ladowanieZestawow) {
    return <p className="text-gray-500">Ładowanie zestawów...</p>;
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="font-bold text-lg">Postęp zestawów ćwiczeń</div>
          <p className="text-gray-500 text-sm mt-0.5">
            Wybierz zestaw, żeby zobaczyć wykresy wyników jego ćwiczeń w czasie. Najedź na punkt,
            żeby zobaczyć wszystkie wartości z tego dnia.
          </p>
        </div>

        {zestawy.length > 0 && (
          <Select value={wybranyId} onValueChange={(v) => v && setWybranyId(v)}>
            <SelectTrigger className="w-[260px]">
              <span>{zestaw?.nazwa ?? "Wybierz zestaw"}</span>
            </SelectTrigger>
            <SelectContent>
              {zestawy.map((z) => (
                <SelectItem key={z.id} value={String(z.id)}>
                  {z.nazwa}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {blad && <p className="text-red-600 text-sm mt-3">{blad}</p>}

      {zestawy.length === 0 ? (
        <p className="text-gray-400 text-sm mt-4">
          Nie masz jeszcze zestawów.{" "}
          <Link href="/planner?tab=zestawy" className="text-blue-600 hover:underline">
            Utwórz pierwszy →
          </Link>
        </p>
      ) : !zestaw ? null : zestaw.cwiczenia_zestawu.length === 0 ? (
        <p className="text-gray-400 text-sm mt-4">Ten zestaw nie ma jeszcze ćwiczeń.</p>
      ) : ladowanieWykonan ? (
        <p className="text-gray-500 text-sm mt-4">Ładowanie wyników...</p>
      ) : (
        <div className="flex flex-col gap-3 mt-4">
          {zestaw.cwiczenia_zestawu.map((cwiczenie) => (
            <WykresCwiczenia
              key={cwiczenie.id}
              cwiczenie={cwiczenie}
              wpisy={wykonania.filter((w) => w.cwiczenie_id === cwiczenie.id)}
            />
          ))}
          <div>
            <Link href="/planner?tab=zestawy" className="text-blue-600 hover:underline text-sm">
              Dodaj lub usuń wpis w zakładce Zestawy →
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
}