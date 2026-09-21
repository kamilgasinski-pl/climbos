"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { SKALA_KURTYKI } from "../engine/gradeEngine";
import type { PunktProgresjiStylu } from "../engine/progressionEngine";

type Props = {
  dane: PunktProgresjiStylu[];
};

function formatujDate(data: string): string {
  return new Date(data).toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || payload.length === 0) return null;

  const punkt = payload[0].payload as PunktProgresjiStylu;

  return (
    <div className="bg-white border border-gray-300 rounded-md px-3 py-2 shadow-sm">
      <div className="text-sm text-gray-500 mb-1">{formatujDate(punkt.data)}</div>
      {punkt.trudnoscOS && (
        <div className="text-sm flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "#16a34a" }} />
          OS: <strong>{punkt.trudnoscOS}</strong>
        </div>
      )}
      {punkt.trudnoscRP && (
        <div className="text-sm flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "#2563eb" }} />
          RP: <strong>{punkt.trudnoscRP}</strong>
        </div>
      )}
      {punkt.trudnoscWedka && (
        <div className="text-sm flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "#9333ea" }} />
          Wędka: <strong>{punkt.trudnoscWedka}</strong>
        </div>
      )}
    </div>
  );
}

const ETYKIETY: Record<string, string> = {
  poziomOS: "OS",
  poziomRP: "RP",
  poziomWedka: "Wędka",
};

export default function WykresProgresjiStylow({ dane }: Props) {
  if (dane.length === 0) {
    return (
      <p className="text-gray-500 py-5">
        Brak danych — dodaj kilka przejść, żeby zobaczyć wykres progresji.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={dane} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="data"
          tickFormatter={formatujDate}
          tick={{ fontSize: 12, fill: "#6b7280" }}
        />
        <YAxis
          domain={["dataMin - 1", "dataMax + 1"]}
          tickFormatter={(poziom) => SKALA_KURTYKI[poziom] ?? ""}
          tick={{ fontSize: 12, fill: "#6b7280" }}
          width={45}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend formatter={(value) => ETYKIETY[value] ?? value} />
        <Line
          type="monotone"
          dataKey="poziomOS"
          name="poziomOS"
          stroke="#16a34a"
          strokeWidth={2}
          dot={{ r: 4, fill: "#16a34a" }}
          activeDot={{ r: 6 }}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="poziomRP"
          name="poziomRP"
          stroke="#2563eb"
          strokeWidth={2}
          dot={{ r: 4, fill: "#2563eb" }}
          activeDot={{ r: 6 }}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="poziomWedka"
          name="poziomWedka"
          stroke="#9333ea"
          strokeWidth={2}
          dot={{ r: 4, fill: "#9333ea" }}
          activeDot={{ r: 6 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}