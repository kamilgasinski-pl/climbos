"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  value: string;
  onChange: (wartosc: string) => void;
};

const GODZINY = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTY = ["00", "15", "30", "45"];

export default function WyborGodziny({ value, onChange }: Props) {
  const [godzina, minuta] = value.split(":");

  function zmienGodzine(nowaGodzina: string) {
    onChange(`${nowaGodzina}:${minuta ?? "00"}`);
  }

  function zmienMinute(nowaMinuta: string) {
    onChange(`${godzina ?? "00"}:${nowaMinuta}`);
  }

  return (
    <div className="flex items-center gap-1">
      <Select value={godzina} onValueChange={(v) => zmienGodzine(v ?? "00")}>
        <SelectTrigger className="w-[70px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {GODZINY.map((g) => (
            <SelectItem key={g} value={g}>
              {g}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-gray-400">:</span>
      <Select value={minuta} onValueChange={(v) => zmienMinute(v ?? "00")}>
        <SelectTrigger className="w-[70px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MINUTY.map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}