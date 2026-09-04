"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseclient";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import KategorieManager, { Kategoria } from "./KategorieManager";
import { NAZWY_KOMPETENCJI, FILARY, NAZWY_FILAROW, Kompetencja, Filar } from "../engine/climbingKnowledgeEngine";
import { X, Pencil, StickyNote } from "lucide-react";

const DNI_TYGODNIA = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];
const GODZINA_START_SIATKI = 5;
const GODZINA_KONIEC_SIATKI = 23;

type Blok = {
  id: number;
  dzien_tygodnia: number;
  godzina_start: string;
  godzina_koniec: string;
  tytul: string;
  kategoria_id: number | null;
  kompetencje: Kompetencja[] | null;
  notatka: string | null;
  kategorie_treningowe: { nazwa: string; kolor: string } | null;
};

type Zaznaczenie = {
  dzien: number;
  start: number;
  koniec: number;
};

type TrybPrzeciagania = "przesun" | "rozciagnijGora" | "rozciagnijDol";

type PrzeciaganieBloku = {
  blokId: number;
  tryb: TrybPrzeciagania;
  dlugosc: number;
  uchwytOffset: number;
  kolor: string;
};

type PodgladBloku = {
  dzien: number;
  start: number;
  koniec: number;
};

function godzinaNaLiczbe(godzina: string): number {
  const [h, m] = godzina.split(":").map(Number);
  return h + m / 60;
}

function indeksNaGodzine(indeks: number): string {
  return `${String(GODZINA_START_SIATKI + indeks).padStart(2, "0")}:00`;
}

export default function HarmonogramTygodniowy() {
  const [kategorie, setKategorie] = useState<Kategoria[]>([]);
  const [bloki, setBloki] = useState<Blok[]>([]);
  const [ladowanie, setLadowanie] = useState(true);
  const [bladPobierania, setBladPobierania] = useState("");

  const [pokazFormularz, setPokazFormularz] = useState(false);
  const [dzien, setDzien] = useState("0");
  const [godzinaStart, setGodzinaStart] = useState("06:00");
  const [godzinaKoniec, setGodzinaKoniec] = useState("07:00");
  const [tytul, setTytul] = useState("");
  const [kategoriaId, setKategoriaId] = useState("");
  const [wybraneKompetencje, setWybraneKompetencje] = useState<Kompetencja[]>([]);
  const [pokazKompetencje, setPokazKompetencje] = useState(false);
  const [notatkaTekst, setNotatkaTekst] = useState("");
  const [edytowanyBlokId, setEdytowanyBlokId] = useState<number | null>(null);
  const [bladFormularza, setBladFormularza] = useState("");
  const [zapisywanie, setZapisywanie] = useState(false);

  const [zaznaczenie, setZaznaczenie] = useState<Zaznaczenie | null>(null);
  const [przeciaganie, setPrzeciaganie] = useState(false);

  const [przeciaganieBloku, setPrzeciaganieBloku] = useState<PrzeciaganieBloku | null>(null);
  const [podgladBloku, setPodgladBloku] = useState<PodgladBloku | null>(null);

  const formularzRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    pobierzBloki();
  }, []);

  useEffect(() => {
    function zakoncz() {
      setPrzeciaganie((byloPrzeciaganie) => {
        if (byloPrzeciaganie) {
          zakonczZaznaczanie();
        }
        return false;
      });
      if (przeciaganieBloku) {
        zakonczPrzeciaganieBloku();
      }
    }
    window.addEventListener("mouseup", zakoncz);
    return () => window.removeEventListener("mouseup", zakoncz);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zaznaczenie, przeciaganieBloku, podgladBloku]);

  useEffect(() => {
    if (pokazFormularz && formularzRef.current) {
      formularzRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [pokazFormularz]);

  async function pobierzBloki() {
    const { data, error } = await supabase
      .from("bloki_tygodniowe")
      .select("*, kategorie_treningowe(nazwa, kolor)")
      .order("godzina_start", { ascending: true });

    if (error) {
      console.error("Błąd pobierania harmonogramu:", error);
      setBladPobierania("Nie udało się pobrać harmonogramu. Sprawdź połączenie i odśwież stronę.");
      setLadowanie(false);
      return;
    }
    setBloki(data as unknown as Blok[]);
    setLadowanie(false);
  }

  function rozpocznijZaznaczanie(dzienIndex: number, godzinaIndex: number) {
    if (przeciaganieBloku) return;
    setZaznaczenie({ dzien: dzienIndex, start: godzinaIndex, koniec: godzinaIndex });
    setPrzeciaganie(true);
    setPokazFormularz(false);
  }

  function kontynuujZaznaczanie(dzienIndex: number, godzinaIndex: number) {
    setZaznaczenie((poprzednie) => {
      if (!poprzednie || !przeciaganie || poprzednie.dzien !== dzienIndex) return poprzednie;
      return { ...poprzednie, koniec: godzinaIndex };
    });
  }

  function zakonczZaznaczanie() {
    setZaznaczenie((aktualne) => {
      if (!aktualne) return null;

      const start = Math.min(aktualne.start, aktualne.koniec);
      const koniec = Math.max(aktualne.start, aktualne.koniec);

      setDzien(String(aktualne.dzien));
      setGodzinaStart(indeksNaGodzine(start));
      setGodzinaKoniec(indeksNaGodzine(koniec + 1));

      // Jeśli NIE edytujemy istniejącego bloku, to jest nowy blok -
      // czyścimy resztę formularza. Jeśli edytujemy, zachowujemy
      // tytuł/kategorię/kompetencje/notatkę - przeciągnięcie zmienia
      // tylko dzień/godziny tego bloku.
      setEdytowanyBlokId((biezacyEdytowanyId) => {
        if (biezacyEdytowanyId === null) {
          setTytul("");
          setKategoriaId("");
          setWybraneKompetencje([]);
          setNotatkaTekst("");
        }
        return biezacyEdytowanyId;
      });

      setPokazKompetencje(false);
      setBladFormularza("");
      setPokazFormularz(true);

      return aktualne;
    });
  }

  function rozpocznijPrzeciaganieBloku(
    e: React.MouseEvent<HTMLDivElement>,
    blok: Blok,
    tryb: TrybPrzeciagania
  ) {
    e.preventDefault();
    e.stopPropagation();

    const startIdx = Math.round(godzinaNaLiczbe(blok.godzina_start) - GODZINA_START_SIATKI);
    const koniecIdx = Math.round(godzinaNaLiczbe(blok.godzina_koniec) - GODZINA_START_SIATKI) - 1;

    let uchwytOffset = 0;
    if (tryb === "przesun") {
      const prostokat = e.currentTarget.getBoundingClientRect();
      const liczbaRzedow = koniecIdx - startIdx + 1;
      const wysokoscRzedu = prostokat.height / liczbaRzedow;
      uchwytOffset = Math.min(
        liczbaRzedow - 1,
        Math.max(0, Math.floor((e.clientY - prostokat.top) / wysokoscRzedu))
      );
    }

    setPrzeciaganieBloku({
      blokId: blok.id,
      tryb,
      dlugosc: koniecIdx - startIdx,
      uchwytOffset,
      kolor: blok.kategorie_treningowe?.kolor ?? "#9ca3af",
    });
    setPodgladBloku({ dzien: blok.dzien_tygodnia, start: startIdx, koniec: koniecIdx });
    setPokazFormularz(false);
  }

  function aktualizujPodgladPrzeciagania(dzienIndex: number, godzinaIndex: number) {
    setPrzeciaganieBloku((aktualne) => {
      if (!aktualne) return aktualne;

      setPodgladBloku((poprzedni) => {
        if (!poprzedni) return poprzedni;
        const maks = GODZINA_KONIEC_SIATKI - GODZINA_START_SIATKI;

        if (aktualne.tryb === "przesun") {
          let nowyStart = godzinaIndex - aktualne.uchwytOffset;
          let nowyKoniec = nowyStart + aktualne.dlugosc;
          if (nowyStart < 0) {
            nowyKoniec -= nowyStart;
            nowyStart = 0;
          }
          if (nowyKoniec > maks) {
            nowyStart -= nowyKoniec - maks;
            nowyKoniec = maks;
          }
          return { dzien: dzienIndex, start: nowyStart, koniec: nowyKoniec };
        }

        if (aktualne.tryb === "rozciagnijGora") {
          const nowyStart = Math.max(0, Math.min(godzinaIndex, poprzedni.koniec));
          return { ...poprzedni, start: nowyStart };
        }

        const nowyKoniec = Math.min(maks, Math.max(godzinaIndex, poprzedni.start));
        return { ...poprzedni, koniec: nowyKoniec };
      });

      return aktualne;
    });
  }

  async function zakonczPrzeciaganieBloku() {
    const blokId = przeciaganieBloku?.blokId;
    const zakres = podgladBloku;

    setPrzeciaganieBloku(null);
    setPodgladBloku(null);

    if (!blokId || !zakres) return;

    const { error } = await supabase
      .from("bloki_tygodniowe")
      .update({
        dzien_tygodnia: zakres.dzien,
        godzina_start: indeksNaGodzine(zakres.start),
        godzina_koniec: indeksNaGodzine(zakres.koniec + 1),
      })
      .eq("id", blokId);

    if (error) {
      console.error("Błąd przesuwania/rozciągania bloku:", error);
      setBladPobierania("Nie udało się zaktualizować bloku. Spróbuj ponownie.");
      return;
    }

    pobierzBloki();
  }

  function przelaczKompetencje(klucz: Kompetencja) {
    setWybraneKompetencje((poprzednie) =>
      poprzednie.includes(klucz)
        ? poprzednie.filter((k) => k !== klucz)
        : [...poprzednie, klucz]
    );
  }

  function anulujFormularz() {
    setPokazFormularz(false);
    setZaznaczenie(null);
    setEdytowanyBlokId(null);
  }

  function edytujBlok(blok: Blok) {
    setEdytowanyBlokId(blok.id);
    setDzien(String(blok.dzien_tygodnia));
    setGodzinaStart(blok.godzina_start.slice(0, 5));
    setGodzinaKoniec(blok.godzina_koniec.slice(0, 5));
    setTytul(blok.tytul);
    setKategoriaId(blok.kategoria_id ? String(blok.kategoria_id) : "");
    setWybraneKompetencje(blok.kompetencje ?? []);
    setNotatkaTekst(blok.notatka ?? "");
    setPokazKompetencje(false);
    setBladFormularza("");
    setZaznaczenie(null);
    setPokazFormularz(true);
  }

  async function zapiszBlok() {
    if (tytul.trim() === "") {
      setBladFormularza("Podaj tytuł aktywności.");
      return;
    }
    if (godzinaKoniec <= godzinaStart) {
      setBladFormularza("Godzina końca musi być późniejsza niż start.");
      return;
    }
    setBladFormularza("");
    setZapisywanie(true);

    const rekord = {
      dzien_tygodnia: Number(dzien),
      godzina_start: godzinaStart,
      godzina_koniec: godzinaKoniec,
      tytul,
      kategoria_id: kategoriaId ? Number(kategoriaId) : null,
      kompetencje: wybraneKompetencje,
      notatka: notatkaTekst.trim() === "" ? null : notatkaTekst,
    };

    const { error } = edytowanyBlokId
      ? await supabase.from("bloki_tygodniowe").update(rekord).eq("id", edytowanyBlokId)
      : await supabase.from("bloki_tygodniowe").insert(rekord);

    setZapisywanie(false);

    if (error) {
      console.error("Błąd zapisu bloku:", error);
      setBladFormularza("Nie udało się zapisać bloku. Spróbuj ponownie.");
      return;
    }

    setTytul("");
    setWybraneKompetencje([]);
    setNotatkaTekst("");
    setPokazKompetencje(false);
    setPokazFormularz(false);
    setZaznaczenie(null);
    setEdytowanyBlokId(null);
    pobierzBloki();
  }

  async function usunBlok(id: number) {
    const { error } = await supabase.from("bloki_tygodniowe").delete().eq("id", id);
    if (error) {
      console.error("Błąd usuwania bloku:", error);
      setBladPobierania("Nie udało się usunąć bloku. Spróbuj ponownie.");
      return;
    }
    pobierzBloki();
  }

  const liczbaGodzin = GODZINA_KONIEC_SIATKI - GODZINA_START_SIATKI + 1;

  return (
    <div>
      <Card className="p-4 mb-5">
        <div className="font-bold mb-3">Kategorie</div>
        <KategorieManager onZmiana={setKategorie} />
      </Card>

      <p className="text-gray-500 text-sm mb-3">
        Kliknij i przeciągnij po siatce poniżej, żeby zaznaczyć dzień i zakres godzin nowego bloku.
        Istniejący blok możesz przenieść (chwyć środek) albo rozciągnąć (chwyć górną/dolną krawędź).
      </p>

      {pokazFormularz && (
        <Card className="p-4 mb-5" ref={formularzRef}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {edytowanyBlokId && (
                <span className="text-xs font-bold uppercase tracking-wide text-gray-400">
                  Edycja
                </span>
              )}
              <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md text-sm font-medium text-blue-700">
                {DNI_TYGODNIA[Number(dzien)]} · {godzinaStart}–{godzinaKoniec}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={anulujFormularz}>
              Anuluj
            </Button>
          </div>

          <p className="text-gray-400 text-xs mb-3">
            Żeby zmienić dzień lub godziny, po prostu przeciągnij ponownie po siatce.
          </p>

          <div className="flex gap-2 flex-wrap items-center">
            <Input
              value={tytul}
              onChange={(e) => setTytul(e.target.value)}
              placeholder="Nazwa aktywności"
              className="w-[200px]"
              autoFocus
            />
          </div>

          <div className="mt-3">
            <div className="text-gray-500 text-xs mb-2">Kategoria</div>
            <div className="flex flex-wrap gap-2">
              {kategorie.map((k) => {
                const wybrana = kategoriaId === String(k.id);
                return (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setKategoriaId(wybrana ? "" : String(k.id))}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors"
                    style={
                      wybrana
                        ? { backgroundColor: k.kolor, borderColor: k.kolor, color: "#fff" }
                        : { borderColor: k.kolor + "80", color: k.kolor, backgroundColor: k.kolor + "0d" }
                    }
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: wybrana ? "#fff" : k.kolor }}
                    />
                    {k.nazwa}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3">
            <div className="text-gray-500 text-xs mb-2">Notatka (opcjonalnie)</div>
            <textarea
              value={notatkaTekst}
              onChange={(e) => setNotatkaTekst(e.target.value)}
              placeholder="Np. link do sekwencji treningowej, dodatkowe informacje..."
              rows={2}
              className="w-full p-2 border border-gray-300 rounded-md resize-none text-sm"
            />
          </div>

          <div className="flex items-center justify-between mt-3">
            <button
              type="button"
              onClick={() => setPokazKompetencje(!pokazKompetencje)}
              className="text-sm text-blue-600 hover:underline"
            >
              {pokazKompetencje
                ? "− Ukryj kompetencje"
                : wybraneKompetencje.length > 0
                ? `+ Kompetencje (${wybraneKompetencje.length})`
                : "+ Dodaj kompetencje (opcjonalnie)"}
            </button>
            <Button onClick={zapiszBlok} disabled={zapisywanie}>
              {zapisywanie ? "Zapisywanie..." : edytowanyBlokId ? "Zapisz zmiany" : "Zapisz blok"}
            </Button>
          </div>

          {pokazKompetencje && (
            <div className="mt-3">
              <div className="text-gray-500 text-xs mb-2">
                Które kompetencje rozwija ten blok? (opcjonalnie)
              </div>
              <div className="flex flex-col gap-2">
                {(Object.keys(FILARY) as Filar[]).map((filar) => (
                  <div key={filar} className="flex items-center gap-2 flex-wrap">
                    <span className="text-gray-400 text-xs w-[70px] shrink-0">
                      {NAZWY_FILAROW[filar]}
                    </span>
                    {FILARY[filar].map((klucz) => (
                      <button
                        key={klucz}
                        type="button"
                        onClick={() => przelaczKompetencje(klucz)}
                        className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
                          wybraneKompetencje.includes(klucz)
                            ? "bg-gray-900 border-gray-900 text-white"
                            : "border-gray-300 text-gray-600 hover:border-gray-400"
                        }`}
                      >
                        {NAZWY_KOMPETENCJI[klucz]}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {bladFormularza && <p className="text-red-600 text-sm mt-3">{bladFormularza}</p>}
        </Card>
      )}

      {ladowanie ? (
        <p className="text-gray-500">Ładowanie harmonogramu...</p>
      ) : bladPobierania ? (
        <p className="text-red-600">{bladPobierania}</p>
      ) : (
        <Card className="p-4 overflow-x-auto">
          <div
            className="grid text-sm select-none"
            style={{
              gridTemplateColumns: `60px repeat(7, minmax(120px, 1fr))`,
              gridTemplateRows: `auto repeat(${liczbaGodzin}, 36px)`,
            }}
          >
            <div />
            {DNI_TYGODNIA.map((d) => (
              <div key={d} className="font-bold text-center pb-2 border-b border-gray-200">
                {d}
              </div>
            ))}

            {Array.from({ length: liczbaGodzin }).map((_, i) => {
              const godzina = GODZINA_START_SIATKI + i;
              return (
                <div
                  key={godzina}
                  className="text-gray-400 text-xs text-right pr-2 border-t border-gray-100"
                  style={{ gridColumn: 1, gridRow: i + 2 }}
                >
                  {String(godzina).padStart(2, "0")}:00
                </div>
              );
            })}

            {DNI_TYGODNIA.map((_, dzienIndex) =>
              Array.from({ length: liczbaGodzin }).map((_, i) => {
                const zaznaczone =
                  zaznaczenie &&
                  zaznaczenie.dzien === dzienIndex &&
                  i >= Math.min(zaznaczenie.start, zaznaczenie.koniec) &&
                  i <= Math.max(zaznaczenie.start, zaznaczenie.koniec);

                return (
                  <div
                    key={`${dzienIndex}-${i}`}
                    onMouseDown={() => rozpocznijZaznaczanie(dzienIndex, i)}
                    onMouseEnter={() => {
                      if (przeciaganieBloku) {
                        aktualizujPodgladPrzeciagania(dzienIndex, i);
                      } else {
                        kontynuujZaznaczanie(dzienIndex, i);
                      }
                    }}
                    className={`border-t border-l border-gray-100 cursor-pointer transition-colors ${
                      zaznaczone ? "bg-blue-100" : "hover:bg-gray-50"
                    }`}
                    style={{ gridColumn: dzienIndex + 2, gridRow: i + 2 }}
                  />
                );
              })
            )}

            {bloki
              .filter((blok) => blok.id !== przeciaganieBloku?.blokId)
              .map((blok) => {
                const start = godzinaNaLiczbe(blok.godzina_start);
                const koniec = godzinaNaLiczbe(blok.godzina_koniec);
                const rowStart = Math.floor(start - GODZINA_START_SIATKI) + 2;
                const rowEnd = Math.ceil(koniec - GODZINA_START_SIATKI) + 2;
                const kolor = blok.kategorie_treningowe?.kolor ?? "#9ca3af";

                return (
                  <div
                    key={blok.id}
                    className="group relative m-0.5 rounded-md px-2 py-1 overflow-hidden cursor-move"
                    style={{
                      gridColumn: blok.dzien_tygodnia + 2,
                      gridRow: `${rowStart} / ${rowEnd}`,
                      backgroundColor: kolor + "33",
                      borderLeft: `3px solid ${kolor}`,
                      pointerEvents: przeciaganieBloku ? "none" : undefined,
                    }}
                    onMouseDown={(e) => rozpocznijPrzeciaganieBloku(e, blok, "przesun")}
                  >
                    <div
                      className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        rozpocznijPrzeciaganieBloku(e, blok, "rozciagnijGora");
                      }}
                    />
                    <div
                      className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        rozpocznijPrzeciaganieBloku(e, blok, "rozciagnijDol");
                      }}
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium truncate" style={{ color: kolor }}>
                        {blok.tytul}
                      </span>
                      {blok.notatka && (
                        <StickyNote size={10} className="shrink-0 opacity-60" style={{ color: kolor }} />
                      )}
                    </div>
                    <div className="absolute top-0.5 right-0.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={() => edytujBlok(blok)}
                        className="text-gray-500 hover:text-blue-600"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={() => usunBlok(blok.id)}
                        className="text-gray-500 hover:text-red-600"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}

            {podgladBloku && przeciaganieBloku && (
              <div
                className="relative m-0.5 rounded-md px-2 py-1 overflow-hidden pointer-events-none border-2 border-dashed"
                style={{
                  gridColumn: podgladBloku.dzien + 2,
                  gridRow: `${podgladBloku.start + 2} / ${podgladBloku.koniec + 3}`,
                  backgroundColor: przeciaganieBloku.kolor + "55",
                  borderColor: przeciaganieBloku.kolor,
                }}
              />
            )}
          </div>
        </Card>
      )}
    </div>
  );
}