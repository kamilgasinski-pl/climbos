"use client";

import { useState, useEffect } from "react";
import { supabase } from "../supabaseclient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Pencil } from "lucide-react";

export type Kategoria = {
  id: number;
  nazwa: string;
  kolor: string;
};

type Props = {
  onZmiana: (kategorie: Kategoria[]) => void;
};

const DOMYSLNE_KOLORY = ["#22c55e", "#eab308", "#3b82f6", "#9ca3af", "#ef4444", "#a855f7"];

export default function KategorieManager({ onZmiana }: Props) {
  const [kategorie, setKategorie] = useState<Kategoria[]>([]);
  const [nazwa, setNazwa] = useState("");
  const [kolor, setKolor] = useState(DOMYSLNE_KOLORY[0]);
  const [blad, setBlad] = useState("");

  const [edycjaId, setEdycjaId] = useState<number | null>(null);
  const [edycjaNazwa, setEdycjaNazwa] = useState("");
  const [edycjaKolor, setEdycjaKolor] = useState(DOMYSLNE_KOLORY[0]);
  const [zapisywanieEdycji, setZapisywanieEdycji] = useState(false);

  useEffect(() => {
    pobierzKategorie();
  }, []);

  async function pobierzKategorie() {
    const { data, error } = await supabase
      .from("kategorie_treningowe")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Błąd pobierania kategorii:", error);
      return;
    }
    setKategorie(data as Kategoria[]);
    onZmiana(data as Kategoria[]);
  }

  async function dodajKategorie() {
    if (nazwa.trim() === "") {
      setBlad("Podaj nazwę kategorii.");
      return;
    }
    setBlad("");

    const { error } = await supabase
      .from("kategorie_treningowe")
      .insert({ nazwa, kolor });

    if (error) {
      console.error("Błąd dodawania kategorii:", error);
      setBlad("Nie udało się dodać kategorii.");
      return;
    }

    setNazwa("");
    pobierzKategorie();
  }

  async function usunKategorie(id: number) {
    const { error } = await supabase.from("kategorie_treningowe").delete().eq("id", id);
    if (error) {
      console.error("Błąd usuwania kategorii:", error);
      return;
    }
    pobierzKategorie();
  }

  function rozpocznijEdycje(kategoria: Kategoria) {
    setEdycjaId(kategoria.id);
    setEdycjaNazwa(kategoria.nazwa);
    setEdycjaKolor(kategoria.kolor);
    setBlad("");
  }

  async function zapiszEdycje() {
    if (edycjaNazwa.trim() === "") {
      setBlad("Podaj nazwę kategorii.");
      return;
    }
    if (edycjaId === null) return;

    setZapisywanieEdycji(true);
    const { error } = await supabase
      .from("kategorie_treningowe")
      .update({ nazwa: edycjaNazwa, kolor: edycjaKolor })
      .eq("id", edycjaId);

    setZapisywanieEdycji(false);

    if (error) {
      console.error("Błąd edycji kategorii:", error);
      setBlad("Nie udało się zapisać zmian.");
      return;
    }

    setEdycjaId(null);
    pobierzKategorie();
  }

  return (
    <div>
      <div className="flex gap-2 flex-wrap items-center mb-3">
        <Input
          value={nazwa}
          onChange={(e) => setNazwa(e.target.value)}
          placeholder="Nazwa kategorii (np. Technika)"
          className="w-[220px]"
        />
        <div className="flex gap-1 items-center">
          {DOMYSLNE_KOLORY.map((k) => (
            <button
              key={k}
              onClick={() => setKolor(k)}
              className="w-7 h-7 rounded-full border-2"
              style={{ backgroundColor: k, borderColor: kolor === k ? "#111827" : "transparent" }}
            />
          ))}
          <input
            type="color"
            value={kolor}
            onChange={(e) => setKolor(e.target.value)}
            className="w-7 h-7 rounded-full border-2 border-gray-300 cursor-pointer p-0"
            title="Wybierz dowolny kolor"
          />
        </div>
        <Button onClick={dodajKategorie}>Dodaj kategorię</Button>
      </div>
      {blad && <p className="text-red-600 text-sm mb-3">{blad}</p>}

      <div className="flex gap-2 flex-wrap">
        {kategorie.map((k) =>
          edycjaId === k.id ? (
            <div
              key={k.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm border border-gray-300 bg-white"
            >
              <Input
                value={edycjaNazwa}
                onChange={(e) => setEdycjaNazwa(e.target.value)}
                className="w-[140px] h-8"
                autoFocus
              />
             <div className="flex gap-1 items-center">
                {DOMYSLNE_KOLORY.map((kolorOpcja) => (
                  <button
                    key={kolorOpcja}
                    onClick={() => setEdycjaKolor(kolorOpcja)}
                    className="w-5 h-5 rounded-full border-2"
                    style={{
                      backgroundColor: kolorOpcja,
                      borderColor: edycjaKolor === kolorOpcja ? "#111827" : "transparent",
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={edycjaKolor}
                  onChange={(e) => setEdycjaKolor(e.target.value)}
                  className="w-5 h-5 rounded-full border-2 border-gray-300 cursor-pointer p-0"
                  title="Wybierz dowolny kolor"
                />
              </div>
              <button
                onClick={zapiszEdycje}
                disabled={zapisywanieEdycji}
                className="text-gray-600 hover:text-gray-900 text-xs font-medium px-1"
              >
                {zapisywanieEdycji ? "..." : "Zapisz"}
              </button>
              <button
                onClick={() => setEdycjaId(null)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div
              key={k.id}
              className="group flex items-center gap-2 px-3 py-1.5 rounded-md text-sm cursor-pointer"
              style={{ backgroundColor: k.kolor + "33", color: k.kolor }}
              onClick={() => rozpocznijEdycje(k)}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: k.kolor }} />
              <span className="font-medium">{k.nazwa}</span>
              <Pencil size={12} className="opacity-0 group-hover:opacity-60 transition-opacity" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  usunKategorie(k.id);
                }}
                className="hover:opacity-70"
              >
                <X size={14} />
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}