"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Punkt = {
  data: string;
  wartosc: number;
};

type Props = {
  dane: Punkt[];
  jednostka: string;
  kolor?: string;
};

function formatujDate(data: string): string {
  return new Date(data).toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
}

export default function WykresAktywnosci({ dane, jednostka, kolor = "#2563eb" }: Props) {
  if (dane.length === 0) {
    return (
      <p className="text-gray-500 py-5">
        Brak danych — dodaj kilka sesji, żeby zobaczyć aktywność.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={dane} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="data"
          tickFormatter={formatujDate}
          tick={{ fontSize: 12, fill: "#6b7280" }}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 12, fill: "#6b7280" }}
          width={30}
        />
        <Tooltip
          content={({ active, payload }: any) => {
            if (!active || !payload || payload.length === 0) return null;
            const punkt = payload[0].payload as Punkt;
            return (
              <div className="bg-white border border-gray-300 rounded-md px-3 py-2 shadow-sm">
                <div className="text-sm text-gray-500">{formatujDate(punkt.data)}</div>
                <div className="font-bold">
                  {punkt.wartosc} {jednostka}
                </div>
              </div>
            );
          }}
        />
        <Bar dataKey="wartosc" fill={kolor} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}