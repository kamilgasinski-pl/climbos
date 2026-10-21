"use client";

import { useState, useEffect } from "react";
import { supabase } from "../supabaseclient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil, X, ChevronDown, ChevronUp, ExternalLink, Plus, Trash2 } from "lucide-react";
import {
  POLA_SLEDZENIA,
  PoleSledzenia,
  Cwiczenie,
  LinkZestawu,
  WykonanieCwiczenia,
  formatujWykonanie,
  dzisiajLokalnie,
  przygotujLinki,
  nazwaLinku,
} from "../engine/cwiczeniaEngine";

const LIMIT_WPISOW = 8;

export function WyborPol({
  wybrane,
  zmianaAction,
}: {
  wybrane: PoleSledzenia[];
  zmianaAction: (nowe: PoleSledzenia[]) => void;
}) {
  function przelacz(klucz: PoleSledzenia) {
    zmianaAction(
      wybrane.includes(klucz) ? wybrane.filter((k) => k !== klucz) : [...wybrane, klucz]
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {POLA_SLEDZENIA.map((pole) => (
        <button
          key={pole.klucz}
          type="button"
          onClick={() => przelacz(pole.klucz)}
          className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
            wybrane.includes(pole.klucz)
              ? "bg-gray-900 border-gray-900 text-white"
              : "border-gray-300 text-gray-600 hover:border-gray-400"
          }`}
        >
          {pole.etykieta}
          {pole.jednostka ? ` (${pole.jednostka})` : ""}
        </button>
      ))}
    </div>
  );
}

export function EdytorLinkow({
  linki,
  zmianaAction,
}: {
  linki: LinkZestawu[];
  zmianaAction: (nowe: LinkZestawu[]) => void;
}) {
  function zmienLink(indeks: number, zmiana: Partial<LinkZestawu>) {
    zmianaAction(linki.map((l, i) => (i === indeks ? { ...l, ...zmiana } : l)));
  }

  return (
    <div className="flex flex-col gap-2">
      {linki.map((l, i) => (
        <div key={i} className="flex gap-2 flex-wrap items-center">
          <Input
            value={l.etykieta}
            onChange={(e) => zmienLink(i, { etykieta: e.target.value })}
            placeholder="Nazwa (opcjonalnie)"
            className="h-8 text-sm w-[180px] bg-white"
          />
          <Input
            value={l.url}
            onChange={(e) => zmienLink(i, { url: e.target.value })}
            placeholder="https://..."
            className="h-8 text-sm flex-1 min-w-[220px] max-w-md bg-white"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => zmianaAction(linki.filter((_, j) => j !== i))}
            className="text-gray-400 hover:text-red-600"
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => zmianaAction([...linki, { etykieta: "", url: "" }])}
        className="text-blue-600 hover:underline text-sm flex items-center gap-1 w-fit"
      >
        <Plus size={13} /> Dodaj link
      </button>
    </div>
  );
}

export function ListaLinkow({ linki, maly = false }: { linki: LinkZestawu[]; maly?: boolean }) {
  if (!linki || linki.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {linki.map((link, i) => (
        <a
          key={i}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`${
            maly ? "text-xs" : "text-sm"
          } text-blue-600 hover:underline flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-md`}
        >
          <ExternalLink size={maly ? 11 : 12} />
          {nazwaLinku(link)}
        </a>
      ))}
    </div>
  );
}

function formatujDate(data: string): string {
  const [r, m, d] = data.split("-").map(Number);
  return new Date(r, m - 1, d).toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
}

type Props = {
  cwiczenie: Cwiczenie;
  zmianaAction: () => void;
  usunAction: (id: number) => void;
};

export default function CwiczenieKarta({ cwiczenie, zmianaAction, usunAction }: Props) {
  const [wykonania, setWykonania] = useState<WykonanieCwiczenia[]>([]);
  const [ladowanie, setLadowanie] = useState(true);

  const [formularz, setFormularz] = useState(false);
  const [data, setData] = useState(dzisiajLokalnie());
  const [wartosci, setWartosci] = useState<Record<string, string>>({});
  const [blad, setBlad] = useState("");
  const [zapisywanie, setZapisywanie] = useState(false);

  const [historia, setHistoria] = useState(false);
  const [pokazWszystkie, setPokazWszystkie] = useState(false);
  const [wybranyWpisId, setWybranyWpisId] = useState<number | null>(null);

  const [edycja, setEdycja] = useState(false);
  const [nazwaEdycji, setNazwaEdycji] = useState(cwiczenie.nazwa);
  const [sledzoneEdycji, setSledzoneEdycji] = useState<PoleSledzenia[]>(cwiczenie.sledzone);
  const [linkiEdycji, setLinkiEdycji] = useState<LinkZestawu[]>(cwiczenie.linki ?? []);
  const [bladEdycji, setBladEdycji] = useState("");

  useEffect(() => {
    pobierz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cwiczenie.id]);

  async function pobierz() {
    const { data: wynik, error } = await supabase
      .from("wykonania_cwiczen")
      .select("*")
      .eq("cwiczenie_id", cwiczenie.id)
      .order("data", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      console.error("Błąd pobierania wykonań ćwiczenia:", error);
      setLadowanie(false);
      return;
    }
    setWykonania(wynik as WykonanieCwiczenia[]);
    setLadowanie(false);
  }

  function otworzFormularz() {
    const ostatnie = wykonania[0];
    const start: Record<string, string> = {};
    for (const pole of POLA_SLEDZENIA) {
      if (!cwiczenie.sledzone.includes(pole.klucz)) continue;
      const wartosc = ostatnie ? ostatnie[pole.klucz] : null;
      start[pole.klucz] = pole.klucz !== "notatka" && wartosc != null ? String(wartosc) : "";
    }
    setWartosci(start);
    setData(dzisiajLokalnie());
    setBlad("");
    setFormularz(true);
  }

  async function zapiszWykonanie() {
    const rekord: Record<string, unknown> = { cwiczenie_id: cwiczenie.id, data };
    let cosWpisano = false;

    for (const klucz of cwiczenie.sledzone) {
      const tekst = (wartosci[klucz] ?? "").trim();
      if (klucz === "notatka") {
        rekord.notatka = tekst === "" ? null : tekst;
        if (tekst !== "") cosWpisano = true;
      } else if (tekst === "") {
        rekord[klucz] = null;
      } else {
        const liczba = Number(tekst.replace(",", "."));
        if (Number.isNaN(liczba) || liczba < 0) {
          setBlad("Wpisz poprawne liczby (bez liter, nieujemne).");
          return;
        }
        rekord[klucz] = liczba;
        cosWpisano = true;
      }
    }

    if (!cosWpisano) {
      setBlad("Wpisz przynajmniej jedną wartość.");
      return;
    }

    setBlad("");
    setZapisywanie(true);
    const { error } = await supabase.from("wykonania_cwiczen").insert(rekord);
    setZapisywanie(false);

    if (error) {
      console.error("Błąd zapisu wykonania:", error);
      setBlad("Nie udało się zapisać. Spróbuj ponownie.");
      return;
    }

    setFormularz(false);
    pobierz();
  }

  async function usunWykonanie(id: number) {
    const { error } = await supabase.from("wykonania_cwiczen").delete().eq("id", id);
    if (error) {
      console.error("Błąd usuwania wykonania:", error);
      return;
    }
    setWybranyWpisId(null);
    setWykonania((poprzednie) => poprzednie.filter((w) => w.id !== id));
  }

  function rozpocznijEdycje() {
    setNazwaEdycji(cwiczenie.nazwa);
    setSledzoneEdycji(cwiczenie.sledzone);
    setLinkiEdycji(cwiczenie.linki ?? []);
    setBladEdycji("");
    setEdycja(true);
  }

  async function zapiszEdycje() {
    if (nazwaEdycji.trim() === "") {
      setBladEdycji("Podaj nazwę ćwiczenia.");
      return;
    }
    if (sledzoneEdycji.length === 0) {
      setBladEdycji("Zaznacz przynajmniej jedno pole do śledzenia.");
      return;
    }

    const przygotowane = przygotujLinki(linkiEdycji);
    if (przygotowane.blad) {
      setBladEdycji(przygotowane.blad);
      return;
    }
    setBladEdycji("");

    const { error } = await supabase
      .from("cwiczenia_zestawu")
      .update({
        nazwa: nazwaEdycji.trim(),
        sledzone: sledzoneEdycji,
        linki: przygotowane.linki,
      })
      .eq("id", cwiczenie.id);

    if (error) {
      console.error("Błąd edycji ćwiczenia:", error);
      setBladEdycji("Nie udało się zapisać zmian.");
      return;
    }

    setEdycja(false);
    zmianaAction();
  }

  const ostatnie = wykonania[0];
  const widoczneWpisy = pokazWszystkie ? wykonania : wykonania.slice(0, LIMIT_WPISOW);

  if (edycja) {
    return (
      <div className="border border-gray-200 rounded-md p-3 flex flex-col gap-2 bg-gray-50">
        <Input
          value={nazwaEdycji}
          onChange={(e) => setNazwaEdycji(e.target.value)}
          placeholder="Nazwa ćwiczenia"
          className="h-8 text-sm bg-white"
          autoFocus
        />
        <div className="text-gray-500 text-xs">Co śledzić:</div>
        <WyborPol wybrane={sledzoneEdycji} zmianaAction={setSledzoneEdycji} />
        <div className="text-gray-500 text-xs mt-1">Linki do ćwiczenia (YouTube, artykuły...):</div>
        <EdytorLinkow linki={linkiEdycji} zmianaAction={setLinkiEdycji} />
        {bladEdycji && <p className="text-red-600 text-xs">{bladEdycji}</p>}
        <div className="flex gap-2">
          <Button size="sm" onClick={zapiszEdycje}>
            Zapisz
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setBladEdycji("");
              setEdycja(false);
            }}
          >
            Anuluj
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-md p-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium text-sm">{cwiczenie.nazwa}</div>
          <div className="text-gray-400 text-xs mt-0.5">
            {ladowanie
              ? "Ładowanie..."
              : ostatnie
              ? `Ostatnio (${formatujDate(ostatnie.data)}): ${
                  formatujWykonanie(ostatnie, cwiczenie.sledzone) || "—"
                }`
              : "Jeszcze bez wpisów"}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={rozpocznijEdycje} className="text-gray-400 hover:text-blue-600">
            <Pencil size={14} />
          </button>
          <button
            onClick={() => usunAction(cwiczenie.id)}
            className="text-gray-400 hover:text-red-600"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <ListaLinkow linki={cwiczenie.linki ?? []} maly />

      {formularz ? (
        <div className="flex flex-col gap-2 bg-gray-50 rounded-md p-2.5">
          <div className="flex gap-2 flex-wrap items-center">
            <Input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="h-8 text-sm w-[150px] bg-white"
            />
            {cwiczenie.sledzone
              .filter((k) => k !== "notatka")
              .map((klucz) => {
                const pole = POLA_SLEDZENIA.find((p) => p.klucz === klucz)!;
                return (
                  <Input
                    key={klucz}
                    inputMode="decimal"
                    value={wartosci[klucz] ?? ""}
                    onChange={(e) =>
                      setWartosci((poprzednie) => ({ ...poprzednie, [klucz]: e.target.value }))
                    }
                    placeholder={`${pole.etykieta}${pole.jednostka ? ` (${pole.jednostka})` : ""}`}
                    className="h-8 text-sm w-[170px] bg-white"
                    autoComplete="off"
                  />
                );
              })}
            {cwiczenie.sledzone.includes("notatka") && (
              <Input
                value={wartosci.notatka ?? ""}
                onChange={(e) =>
                  setWartosci((poprzednie) => ({ ...poprzednie, notatka: e.target.value }))
                }
                placeholder="Notatka"
                className="h-8 text-sm w-[220px] bg-white"
                autoComplete="off"
              />
            )}
          </div>
          {blad && <p className="text-red-600 text-xs">{blad}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={zapiszWykonanie} disabled={zapisywanie}>
              {zapisywanie ? "Zapisywanie..." : "Zapisz wykonanie"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setFormularz(false)}>
              Anuluj
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button onClick={otworzFormularz} className="text-blue-600 hover:underline text-sm">
            + Zapisz wykonanie
          </button>
          {wykonania.length > 0 && (
            <button
              onClick={() => {
                setHistoria(!historia);
                setWybranyWpisId(null);
              }}
              className="text-gray-500 hover:text-gray-800 text-sm flex items-center gap-1"
            >
              Historia wpisów ({wykonania.length})
              {historia ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
      )}

      {historia && wykonania.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-100">
          <p className="text-gray-400 text-xs">
            Kliknij wpis, żeby go zaznaczyć. Dopiero wtedy pojawi się przycisk usuwania.
          </p>

          {widoczneWpisy.map((w) => {
            const wybrany = wybranyWpisId === w.id;
            return (
              <div
                key={w.id}
                role="button"
                tabIndex={0}
                onClick={() => setWybranyWpisId(wybrany ? null : w.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setWybranyWpisId(wybrany ? null : w.id);
                  }
                }}
                className={`flex items-center gap-3 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors ${
                  wybrany
                    ? "bg-blue-100 border-blue-400"
                    : "bg-white border-gray-200 hover:bg-blue-50 hover:border-blue-300"
                }`}
              >
                <span
                  className={`w-[70px] shrink-0 font-medium ${
                    wybrany ? "text-blue-800" : "text-gray-500"
                  }`}
                >
                  {formatujDate(w.data)}
                </span>
                <span className="flex-1 text-gray-700">
                  {formatujWykonanie(w, cwiczenie.sledzone) || "—"}
                </span>
                                {wybrany && (
                  <button
                    type="button"
                    title="Usuń wpis"
                    aria-label="Usuń wpis"
                    onClick={(e) => {
                      e.stopPropagation();
                      usunWykonanie(w.id);
                    }}
                    className="text-gray-500 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            );
          })}

          {wykonania.length > LIMIT_WPISOW && (
            <button
              onClick={() => setPokazWszystkie(!pokazWszystkie)}
              className="text-blue-600 hover:underline text-sm w-fit"
            >
              {pokazWszystkie ? "Pokaż mniej" : `Pokaż wszystkie (${wykonania.length})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}