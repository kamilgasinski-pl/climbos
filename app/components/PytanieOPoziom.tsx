"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SKALA_KURTYKI } from "../engine/gradeEngine";
import { zapiszPoziomWspinaczkowy } from "../engine/ustawieniaEngine";

type Props = {
  /** Wywoływane po udanym zapisie, z wybranym poziomem. */
  zapisanoAction: (poziom: string) => void;
};

/** Pytanie na Home dla kogoś, kto nie określił jeszcze swojego poziomu. */
export default function PytanieOPoziom({ zapisanoAction }: Props) {
  const [poziom, setPoziom] = useState("");
  const [zapisywanie, setZapisywanie] = useState(false);
  const [blad, setBlad] = useState("");

  async function zapisz() {
    if (poziom === "") {
      setBlad("Wybierz swój poziom.");
      return;
    }
    setBlad("");
    setZapisywanie(true);
    const wynik = await zapiszPoziomWspinaczkowy(poziom);
    setZapisywanie(false);

    if (wynik) {
      setBlad(wynik);
      return;
    }
    zapisanoAction(poziom);
  }

  return (
    <Card className="p-5 mt-8">
      <div className="font-bold">Określ swój poziom wspinaczkowy</div>
      <p className="text-gray-500 text-sm mt-1">
        Oceń go na podstawie własnego doświadczenia. To punkt startowy Twojego Mega Celu, więc
        pasek postępu pokaże drogę od tego poziomu do celu. Zmienisz go w każdej chwili w
        Ustawieniach.
      </p>
      <div className="flex gap-2 flex-wrap items-center mt-3">
        <Select value={poziom} onValueChange={(v) => setPoziom(v ?? "")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Twój poziom" />
          </SelectTrigger>
          <SelectContent>
            {SKALA_KURTYKI.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={zapisz} disabled={zapisywanie}>
          {zapisywanie ? "Zapisywanie..." : "Zapisz poziom"}
        </Button>
      </div>
      {blad && <p className="text-red-600 text-sm mt-2">{blad}</p>}
    </Card>
  );
}
