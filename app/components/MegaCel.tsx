"use client";

import { useState, useEffect } from "react";
import { supabase } from "../supabaseclient";
import { SKALA_KURTYKI, najtrudniejszaOcena } from "../engine/gradeEngine";
import { policzPasekPostepu } from "../engine/progressionEngine";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil } from "lucide-react";

type TypCelu = "poziom" | "tekstowy";

type Cel = {
  id: number;
  typ: TypCelu;
  trudnosc_docelowa: string | null;
  styl_docelowy: string | null;
  opis_tekstowy: string | null;
};

type Props = {
  najtrudniejszaRP: string | null;
  najtrudniejszaOS: string | null;
  /** Ocena z ostatniego wykonanego testu poziomu (skala Kurtyki), punkt startowy paska */
  trudnoscTestu: string | null;
};

export default function MegaCel({ najtrudniejszaRP, najtrudniejszaOS, trudnoscTestu }: Props) {
  const [cel, setCel] = useState<Cel | null>(null);
  const [ladowanie, setLadowanie] = useState(true);
  const [edycja, setEdycja] = useState(false);

  const [typCelu, setTypCelu] = useState<TypCelu>("poziom");
  const [trudnoscDocelowa, setTrudnoscDocelowa] = useState("");
  const [stylDocelowy, setStylDocelowy] = useState("RP");
  const [opisTekstowy, setOpisTekstowy] = useState("");
  const [zapisywanie, setZapisywanie] = useState(false);
  const [blad, setBlad] = useState("");

  useEffect(() => {
    pobierzCel();
  }, []);

  async function pobierzCel() {
    const { data, error } = await supabase.from("cele").select("*").maybeSingle();

    if (error) {
      console.error("Błąd pobierania celu:", error);
      setLadowanie(false);
      return;
    }

    if (data) {
      const c = data as Cel;
      setCel(c);
      setTypCelu(c.typ ?? "poziom");
      setTrudnoscDocelowa(c.trudnosc_docelowa ?? "");
      setStylDocelowy(c.styl_docelowy ?? "RP");
      setOpisTekstowy(c.opis_tekstowy ?? "");
    } else {
      setEdycja(true);
    }
    setLadowanie(false);
  }

  async function zapiszCel() {
    if (typCelu === "poziom" && trudnoscDocelowa === "") {
      setBlad("Wybierz trudność docelową.");
      return;
    }
    if (typCelu === "tekstowy" && opisTekstowy.trim() === "") {
      setBlad("Opisz swój cel.");
      return;
    }
    setBlad("");
    setZapisywanie(true);

    const { data, error } = await supabase
      .from("cele")
      .upsert(
        {
          id: cel?.id,
          typ: typCelu,
          trudnosc_docelowa: typCelu === "poziom" ? trudnoscDocelowa : null,
          styl_docelowy: typCelu === "poziom" ? stylDocelowy : null,
          opis_tekstowy: typCelu === "tekstowy" ? opisTekstowy : null,
        },
        { onConflict: "id" }
      )
      .select()
      .single();

    setZapisywanie(false);

    if (error) {
      console.error("Błąd zapisu celu:", error);
      setBlad("Nie udało się zapisać celu. Spróbuj ponownie.");
      return;
    }

    setCel(data as Cel);
    setEdycja(false);
  }

  if (ladowanie) return null;

  if (edycja) {
    return (
      <Card className="p-5 mt-8">
        <div className="font-bold mb-3">Ustaw swój Mega Cel</div>

        <div className="flex gap-2 mb-3">
          <Button
            size="sm"
            variant={typCelu === "poziom" ? "default" : "outline"}
            onClick={() => setTypCelu("poziom")}
          >
            Poziom wspinaczkowy
          </Button>
          <Button
            size="sm"
            variant={typCelu === "tekstowy" ? "default" : "outline"}
            onClick={() => setTypCelu("tekstowy")}
          >
            Cel opisowy
          </Button>
        </div>

        {typCelu === "poziom" ? (
          <div className="flex gap-2 flex-wrap items-center">
            <Select value={stylDocelowy} onValueChange={(v) => setStylDocelowy(v ?? "RP")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RP">RP (redpoint)</SelectItem>
                <SelectItem value="OS">OS (on-sight)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={trudnoscDocelowa} onValueChange={(v) => setTrudnoscDocelowa(v ?? "")}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Trudność docelowa" />
              </SelectTrigger>
              <SelectContent>
                {SKALA_KURTYKI.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <textarea
            value={opisTekstowy}
            onChange={(e) => setOpisTekstowy(e.target.value)}
            placeholder='Np. "Przejść drogę Hokej w Tatrach na własnej asekuracji"'
            rows={2}
            className="w-full p-2 border border-gray-300 rounded-md resize-none text-sm"
          />
        )}

        <div className="flex gap-2 mt-3">
          <Button onClick={zapiszCel} disabled={zapisywanie}>
            {zapisywanie ? "Zapisywanie..." : "Zapisz cel"}
          </Button>
          {cel && (
            <Button variant="outline" onClick={() => setEdycja(false)}>
              Anuluj
            </Button>
          )}
        </div>
        {blad && <p className="text-red-600 text-sm mt-2">{blad}</p>}
      </Card>
    );
  }

  if (!cel) return null;

  if (cel.typ === "tekstowy") {
    return (
      <Card className="p-5 mt-8">
        <div className="flex items-center justify-between mb-3">
          <div className="text-gray-500 text-sm">Mega Cel</div>
          <button onClick={() => setEdycja(true)} className="text-gray-400 hover:text-gray-700">
            <Pencil size={16} />
          </button>
        </div>
        <div className="text-xl font-bold">{cel.opis_tekstowy}</div>
      </Card>
    );
  }

  // Bez testu poziomu nie mamy wiarygodnego punktu startowego dla paska.
  if (!trudnoscTestu) {
    return (
      <Card className="p-5 mt-8">
        <div className="flex items-center justify-between mb-3">
          <div className="text-gray-500 text-sm">
            Mega Cel · {cel.styl_docelowy}
          </div>
          <button onClick={() => setEdycja(true)} className="text-gray-400 hover:text-gray-700">
            <Pencil size={16} />
          </button>
        </div>
        <div className="flex items-center gap-3 text-2xl font-bold mb-3">
          <span className="text-gray-400">—</span>
          <span className="text-gray-400">→</span>
          <span className="text-blue-600">{cel.trudnosc_docelowa}</span>
        </div>
        <div className="text-gray-500 text-sm">
          Zrób{" "}
          <Link href="/dna" className="text-blue-600 hover:underline">
            test poziomu
          </Link>
          , żeby zobaczyć pasek postępu do celu.
        </div>
      </Card>
    );
  }

  // Aktualny poziom: test poziomu, albo zarejestrowana droga w stylu zgodnym
  // z celem (OS/RP), jeśli jest trudniejsza niż wynik testu — bierzemy wyższą
  // z dwóch, więc pasek automatycznie przełącza się na realne dane, gdy się pojawią.
  const najtrudniejszaWStylu = cel.styl_docelowy === "OS" ? najtrudniejszaOS : najtrudniejszaRP;
  const trudnoscObecna = najtrudniejszaOcena(
    [trudnoscTestu, najtrudniejszaWStylu].filter((t): t is string => t !== null)
  );
  const pasek = policzPasekPostepu(trudnoscTestu, trudnoscObecna, cel.trudnosc_docelowa!);

  return (
    <Card className="p-5 mt-8">
      <div className="flex items-center justify-between mb-3">
        <div className="text-gray-500 text-sm">
          Mega Cel · {cel.styl_docelowy}
        </div>
        <button onClick={() => setEdycja(true)} className="text-gray-400 hover:text-gray-700">
          <Pencil size={16} />
        </button>
      </div>
      <div className="flex items-center gap-3 text-2xl font-bold mb-3">
        <span>{pasek.trudnoscObecna}</span>
        <span className="text-gray-400">→</span>
        <span className="text-blue-600">{pasek.trudnoscDocelowa}</span>
      </div>

      {pasek.celOsiagniety ? (
        <div className="text-green-600 font-medium text-sm">🎉 Cel osiągnięty!</div>
      ) : (
        <div className="pt-1">
          <div className="relative bg-gray-200 rounded h-2">
            <div
              className="bg-blue-600 h-full rounded-l transition-all"
              style={{ width: `${pasek.procentPozycji}%` }}
            />
            <div
              className="absolute top-1/2 h-4 w-4 rounded-full bg-blue-600 border-2 border-white shadow -translate-y-1/2 -translate-x-1/2 transition-all"
              style={{ left: `${pasek.procentPozycji}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-1.5">
            {pasek.kroki.map((krok) => (
              <span key={krok}>{krok}</span>
            ))}
          </div>
          <div className="text-gray-400 text-xs mt-1">
            Start: {pasek.trudnoscStartowa} (test poziomu)
          </div>
        </div>
      )}
    </Card>
  );
}