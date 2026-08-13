"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

type PunktKompetencji = {
  kompetencja: string;
  wartosc: number;
};

type Props = {
  dane: PunktKompetencji[];
};

export default function WykresKompetencji({ dane }: Props) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={dane} outerRadius="75%">
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis
          dataKey="kompetencja"
          tick={{ fontSize: 12, fill: "#374151" }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: "#9ca3af" }}
        />
        <Radar
          dataKey="wartosc"
          stroke="#2563eb"
          fill="#2563eb"
          fillOpacity={0.3}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}