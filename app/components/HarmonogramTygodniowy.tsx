"use client";

import { useKompetencjeWlaczone } from "./useKompetencjeWlaczone";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseclient";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import KategorieManager, { Kategoria } from "./KategorieManager";
import { NAZWY_KOMPETENCJI, FILARY, NAZWY_FILAROW, Kompetencja, Filar } from "../engine/climbingKnowledgeEngine";
import { X, Pencil, StickyNote, Dumbbell, ChevronLeft, ChevronRight } from "lucide-react";
import {
  zapewnijTydzien,
  oznaczTydzien,
  poniedzialekISO,
  dodajDniISO,
  etykietaTygodnia,
  pobierzSzablon,
  zapiszSzablon,
  zastosujSzablon,
  RekordBloku,
} from "../engine/planTygodniaEngine";

const DNI_TYGODNIA = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];
const DNI_SKROT = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"];
const GODZINA_START_SIATKI = 5;
const GODZINA_KONIEC_SIATKI = 23;
const LICZBA_TYGODNI_WSTECZ = 12;
const LICZBA_TYGODNI_DO_PRZODU = 8;

type Blok = {
  id: number;
  dzien_tygodnia: number;
  godzina_start: string;
  godzina_koniec: string;
  tytul: string;
  kategoria_id: number | null;
  kompetencje: Kompetencja[] | null;
  notatka: string | null;
  pomijaj_w_realizacji: boolean;
  zestaw_id: number | null;
  tydzien_start: string;
  kategorie_treningowe: { nazwa: string; kolor: string } | null;
};

type ZestawSkrot = {
  id: number;
  nazwa: string;
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

type BlokDoPorownania = {
  dzien_tygodnia: number;
  godzina_start: string;
  godzina_koniec: string;
  tytul: string;
  kategoria_id: number | null;
  zestaw_id: number | null;
};

type Komunikat = { typ: "ok" | "blad"; tekst: string };

function godzinaNaLiczbe(godzina: string): number {
  const [h, m] = godzina.split(":").map(Number);
  return h + m / 60;
}

function indeksNaGodzine(indeks: number): string {
  return `${String(GODZINA_START_SIATKI + indeks).padStart(2, "0")}:00`;
}

function opisTygodnia(tydzien: string, biezacy: string): string {
  const znacznik = tydzien === biezacy ? " · dziś" : tydzien < biezacy ? " · minął" : "";
  return `${etykietaTygodnia(tydzien)}${znacznik}`;
}

/** Tekstowy "odcisk" dnia, żeby sprawdzić czy dzień różni się od szablonu. */
function podpisDnia(bloki: BlokDoPorownania[], dzien: number): string {
  return bloki
    .filter((b) => b.dzien_tygodnia === dzien)
    .map(
      (b) =>
        `${b.godzina_start.slice(0, 5)}-${b.godzina_koniec.slice(0, 5)}|${b.tytul}|${
          b.kategoria_id ?? ""
        }|${b.zestaw_id ?? ""}`
    )
    .sort()
    .join(";");
}

export default function HarmonogramTygodniowy() {
  const kompetencjeWlaczone = useKompetencjeWlaczone();
  const [kategorie, setKategorie] = useState<Kategoria[]>([]);
  const [zestawy, setZestawy] = useState<ZestawSkrot[]>([]);
  const [bloki, setBloki] = useState<Blok[]>([]);
  const [ladowanie, setLadowanie] = useState(true);
  const [bladPobierania, setBladPobierania] = useState("");

  const [tydzien, setTydzien] = useState(() => poniedzialekISO(new Date()));

  const [szablon, setSzablon] = useState<RekordBloku[]>([]);
  const [panelSzablonu, setPanelSzablonu] = useState(false);
  const [dniDoZapisu, setDniDoZapisu] = useState<number[]>([]);
  const [pracaSzablonu, setPracaSzablonu] = useState(false);
  const [komunikat, setKomunikat] = useState<Komunikat | null>(null);

  const [pokazFormularz, setPokazFormularz] = useState(false);
  const [dzien, setDzien] = useState("0");
  const [godzinaStart, setGodzinaStart] = useState("06:00");
  const [godzinaKoniec, setGodzinaKoniec] = useState("07:00");
  const [tytul, setTytul] = useState("");
  const [kategoriaId, setKategoriaId] = useState("");
  const [zestawId, setZestawId] = useState("");
  const [wybraneKompetencje, setWybraneKompetencje] = useState<Kompetencja[]>([]);
  const [pokazKompetencje, setPokazKompetencje] = useState(false);
  const [notatkaTekst, setNotatkaTekst] = useState("");
  const [pomijajWRealizacji, setPomijajWRealizacji] = useState(false);
  const [edytowanyBlokId, setEdytowanyBlokId] = useState<number | null>(null);
  const [bladFormularza, setBladFormularza] = useState("");
  const [zapisywanie, setZapisywanie] = useState(false);

  const [zaznaczenie, setZaznaczenie] = useState<Zaznaczenie | null>(null);
  const [przeciaganie, setPrzeciaganie] = useState(false);

  const [przeciaganieBloku, setPrzeciaganieBloku] = useState<PrzeciaganieBloku | null>(null);
  const [podgladBloku, setPodgladBloku] = useState<PodgladBloku | null>(null);

  const formularzRef = useRef<HTMLDivElement>(null);

  const biezacyTydzien = poniedzialekISO(new Date());
  const opcjeTygodni: string[] = [];
  for (let i = -LICZBA_TYGODNI_WSTECZ; i <= LICZBA_TYGODNI_DO_PRZODU; i++) {
    opcjeTygodni.push(dodajDniISO(biezacyTydzien, i * 7));
  }
  const indeksTygodnia = opcjeTygodni.indexOf(tydzien);

  const maSzablon = szablon.length > 0;
  const dniRoznych = DNI_TYGODNIA.map((_, i) => podpisDnia(bloki, i) !== podpisDnia(szablon, i));
  const wszystkieDni = DNI_TYGODNIA.map((_, i) => i);

  useEffect(() => {
    pobierzZestawy();
    odswiezSzablon();
  }, []);

  useEffect(() => {
    let aktualne = true;

    setPokazFormularz(false);
    setEdytowanyBlokId(null);
    setZaznaczenie(null);
    setPanelSzablonu(false);
    setKomunikat(null);

    async function zaladuj() {
      setLadowanie(true);
      setBladPobierania("");
      try {
        await zapewnijTydzien(tydzien);
      } catch (e) {
        console.error("Błąd przygotowania tygodnia:", e);
        if (aktualne) {
          setBladPobierania("Nie udało się przygotować planu tego tygodnia. Odśwież stronę.");
          setLadowanie(false);
        }
        return;
      }
      if (aktualne) await pobierzBloki(tydzien);
    }

    zaladuj();
    return () => {
      aktualne = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tydzien]);

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
  }, [zaznaczenie, przeciaganieBloku, podgladBloku, tydzien]);

  useEffect(() => {
    if (pokazFormularz && formularzRef.current) {
      formularzRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [pokazFormularz]);

  async function pobierzBloki(tydzienDocelowy: string) {
    const { data, error } = await supabase
      .from("bloki_tygodniowe")
      .select("*, kategorie_treningowe(nazwa, kolor)")
      .eq("tydzien_start", tydzienDocelowy)
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

  async function pobierzZestawy() {
    const { data, error } = await supabase
      .from("zestawy_cwiczen")
      .select("id, nazwa")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Błąd pobierania zestawów:", error);
      return;
    }
    setZestawy(data as ZestawSkrot[]);
  }

  async function odswiezSzablon() {
    try {
      setSzablon(await pobierzSzablon());
    } catch (e) {
      console.error("Błąd pobierania szablonu:", e);
    }
  }

  function przelaczPanelSzablonu() {
    if (panelSzablonu) {
      setPanelSzablonu(false);
      return;
    }
    // Z istniejącym szablonem zaznaczamy dni, które się od niego różnią;
    // przy pierwszym zapisie zaznaczamy wszystkie.
    setDniDoZapisu(maSzablon ? wszystkieDni.filter((i) => dniRoznych[i]) : wszystkieDni);
    setKomunikat(null);
    setPokazFormularz(false);
    setPanelSzablonu(true);
  }

  function przelaczDzienSzablonu(dzienIndex: number) {
    setDniDoZapisu((poprzednie) =>
      poprzednie.includes(dzienIndex)
        ? poprzednie.filter((d) => d !== dzienIndex)
        : [...poprzednie, dzienIndex]
    );
  }

  async function zapiszSzablonKlik() {
    setPracaSzablonu(true);
    setKomunikat(null);
    const blad = await zapiszSzablon(tydzien, dniDoZapisu);
    setPracaSzablonu(false);

    if (blad) {
      setKomunikat({ typ: "blad", tekst: blad });
      return;
    }

    await odswiezSzablon();
    setPanelSzablonu(false);
    setKomunikat({
      typ: "ok",
      tekst: "Szablon zapisany. Nowe tygodnie będą powstawać z szablonu.",
    });
  }

  async function zastosujSzablonKlik() {
    const potwierdzenie = window.confirm(
      "Zastąpić plan tego tygodnia szablonem? Zmiany wprowadzone w tym tygodniu zostaną utracone."
    );
    if (!potwierdzenie) return;

    setPracaSzablonu(true);
    setKomunikat(null);
    const blad = await zastosujSzablon(tydzien);
    setPracaSzablonu(false);

    if (blad) {
      setKomunikat({ typ: "blad", tekst: blad });
      return;
    }

    await pobierzBloki(tydzien);
    setKomunikat({ typ: "ok", tekst: "Plan tego tygodnia zastąpiony szablonem." });
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
      // tytuł/kategorię/zestaw/kompetencje/notatkę - przeciągnięcie
      // zmienia tylko dzień/godziny tego bloku.
      setEdytowanyBlokId((biezacyEdytowanyId) => {
        if (biezacyEdytowanyId === null) {
          setTytul("");
          setKategoriaId("");
          setZestawId("");
          setWybraneKompetencje([]);
          setNotatkaTekst("");
          setPomijajWRealizacji(false);
        }
        return biezacyEdytowanyId;
      });

      setPokazKompetencje(false);
      setBladFormularza("");
      setPanelSzablonu(false);
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

    pobierzBloki(tydzien);
  }

  function przelaczKompetencje(klucz: Kompetencja) {
    setWybraneKompetencje((poprzednie) =>
      poprzednie.includes(klucz)
        ? poprzednie.filter((k) => k !== klucz)
        : [...poprzednie, klucz]
    );
  }

  function przelaczZestaw(zestaw: ZestawSkrot) {
    const juzWybrany = zestawId === String(zestaw.id);
    setZestawId(juzWybrany ? "" : String(zestaw.id));
    // Puste pole nazwy wypełniamy nazwą zestawu, ale nigdy nie nadpisujemy
    // nazwy wpisanej wcześniej przez użytkownika.
    if (!juzWybrany && tytul.trim() === "") {
      setTytul(zestaw.nazwa);
    }
  }

  function przesunTydzien(kierunek: -1 | 1) {
    const nowyIndeks = indeksTygodnia + kierunek;
    if (nowyIndeks >= 0 && nowyIndeks < opcjeTygodni.length) {
      setTydzien(opcjeTygodni[nowyIndeks]);
    }
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
    setZestawId(blok.zestaw_id ? String(blok.zestaw_id) : "");
    setWybraneKompetencje(blok.kompetencje ?? []);
    setNotatkaTekst(blok.notatka ?? "");
    setPomijajWRealizacji(blok.pomijaj_w_realizacji);
    setPokazKompetencje(false);
    setBladFormularza("");
    setZaznaczenie(null);
    setPanelSzablonu(false);
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

    try {
      // Tydzień z ręcznie dodanym blokiem ma własny plan, nawet jeśli to pierwszy blok.
      if (!edytowanyBlokId) await oznaczTydzien(tydzien);
    } catch (e) {
      console.error("Błąd oznaczania tygodnia:", e);
      setZapisywanie(false);
      setBladFormularza("Nie udało się zapisać bloku. Spróbuj ponownie.");
      return;
    }

    const rekord = {
      dzien_tygodnia: Number(dzien),
      godzina_start: godzinaStart,
      godzina_koniec: godzinaKoniec,
      tytul,
      kategoria_id: kategoriaId ? Number(kategoriaId) : null,
      zestaw_id: zestawId ? Number(zestawId) : null,
      kompetencje: wybraneKompetencje,
      notatka: notatkaTekst.trim() === "" ? null : notatkaTekst,
      pomijaj_w_realizacji: pomijajWRealizacji,
    };

    const { error } = edytowanyBlokId
      ? await supabase.from("bloki_tygodniowe").update(rekord).eq("id", edytowanyBlokId)
      : await supabase.from("bloki_tygodniowe").insert({ ...rekord, tydzien_start: tydzien });

    setZapisywanie(false);

    if (error) {
      console.error("Błąd zapisu bloku:", error);
      setBladFormularza("Nie udało się zapisać bloku. Spróbuj ponownie.");
      return;
    }

    setTytul("");
    setZestawId("");
    setWybraneKompetencje([]);
    setNotatkaTekst("");
    setPomijajWRealizacji(false);
    setPokazKompetencje(false);
    setPokazFormularz(false);
    setZaznaczenie(null);
    setEdytowanyBlokId(null);
    pobierzBloki(tydzien);
  }

  async function usunBlok(id: number) {
    const { error } = await supabase.from("bloki_tygodniowe").delete().eq("id", id);
    if (error) {
      console.error("Błąd usuwania bloku:", error);
      setBladPobierania("Nie udało się usunąć bloku. Spróbuj ponownie.");
      return;
    }
    pobierzBloki(tydzien);
  }

  const liczbaGodzin = GODZINA_KONIEC_SIATKI - GODZINA_START_SIATKI + 1;

  return (
    <div>
      <Card className="p-4 mb-5">
        <div className="font-bold mb-3">Kategorie</div>
        <KategorieManager onZmiana={setKategorie} />
      </Card>

      <Card className="p-3 mb-4 flex flex-row items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => przesunTydzien(-1)}
          disabled={indeksTygodnia <= 0}
        >
          <ChevronLeft size={16} />
        </Button>

        <Select value={tydzien} onValueChange={(v) => v && setTydzien(v)}>
          <SelectTrigger className="w-[280px]">
            <span>{opisTygodnia(tydzien, biezacyTydzien)}</span>
          </SelectTrigger>
          <SelectContent>
            {opcjeTygodni.map((t) => (
              <SelectItem key={t} value={t}>
                {opisTygodnia(t, biezacyTydzien)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => przesunTydzien(1)}
          disabled={indeksTygodnia < 0 || indeksTygodnia >= opcjeTygodni.length - 1}
        >
          <ChevronRight size={16} />
        </Button>

        {tydzien !== biezacyTydzien && (
          <Button variant="outline" size="sm" onClick={() => setTydzien(biezacyTydzien)}>
            Bieżący tydzień
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {maSzablon && tydzien >= biezacyTydzien && (
            <Button
              variant="outline"
              size="sm"
              onClick={zastosujSzablonKlik}
              disabled={pracaSzablonu || ladowanie}
            >
              Zastosuj szablon
            </Button>
          )}
          <Button size="sm" onClick={przelaczPanelSzablonu} disabled={ladowanie}>
            Zapisz szablon
          </Button>
        </div>

        <span className="w-full text-gray-400 text-xs">
          {maSzablon
            ? "Zmiany dotyczą tylko wybranego tygodnia. Nowy tydzień powstaje z zapisanego szablonu."
            : "Zmiany dotyczą tylko wybranego tygodnia. Nowy tydzień powstaje jako kopia poprzedniego — zapisz szablon, żeby to zmienić."}
        </span>
      </Card>

      {panelSzablonu && (
        <Card className="p-4 mb-4">
          <div className="font-bold">Zapisz szablon z tygodnia {etykietaTygodnia(tydzien)}</div>
          <p className="text-gray-500 text-sm mt-1">
            {maSzablon
              ? "Zaznacz dni, które mają nadpisać swoją wersję w szablonie. Pozostałe dni szablonu zostają bez zmian. Kropka oznacza dzień różniący się od szablonu."
              : "Zaznacz dni, które mają trafić do szablonu."}
          </p>

          <div className="flex flex-wrap gap-2 mt-3">
            {wszystkieDni.map((i) => {
              const wybrany = dniDoZapisu.includes(i);
              const liczba = bloki.filter((b) => b.dzien_tygodnia === i).length;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => przelaczDzienSzablonu(i)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    wybrany
                      ? "bg-gray-900 border-gray-900 text-white"
                      : "border-gray-300 text-gray-600 hover:border-gray-400"
                  }`}
                >
                  {DNI_SKROT[i]} · {liczba}
                  {maSzablon && dniRoznych[i] && (
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-orange-500"
                      title="Różni się od szablonu"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex gap-3 mt-2 text-sm">
            <button
              type="button"
              onClick={() => setDniDoZapisu(wszystkieDni)}
              className="text-gray-500 hover:text-gray-800 underline"
            >
              Wszystkie
            </button>
            <button
              type="button"
              onClick={() => setDniDoZapisu([])}
              className="text-gray-500 hover:text-gray-800 underline"
            >
              Żaden
            </button>
          </div>

          {maSzablon && dniRoznych.every((r) => !r) && (
            <p className="text-gray-400 text-xs mt-2">Ten tydzień jest zgodny z szablonem.</p>
          )}
          {dniDoZapisu.some((i) => bloki.filter((b) => b.dzien_tygodnia === i).length === 0) && (
            <p className="text-orange-600 text-xs mt-2">
              Zaznaczony dzień bez bloków wyczyści ten dzień w szablonie.
            </p>
          )}
          {!maSzablon && bloki.length === 0 && (
            <p className="text-orange-600 text-xs mt-2">
              Ten tydzień nie ma jeszcze żadnych bloków, więc nie ma czego zapisać.
            </p>
          )}

          <div className="flex gap-2 mt-3">
            <Button
              onClick={zapiszSzablonKlik}
              disabled={
                pracaSzablonu || dniDoZapisu.length === 0 || (!maSzablon && bloki.length === 0)
              }
            >
              {pracaSzablonu ? "Zapisywanie..." : "Zapisz szablon"}
            </Button>
            <Button variant="outline" onClick={() => setPanelSzablonu(false)}>
              Anuluj
            </Button>
          </div>
        </Card>
      )}

      {komunikat && (
        <p
          className={`text-sm mb-3 ${komunikat.typ === "ok" ? "text-green-700" : "text-red-600"}`}
        >
          {komunikat.tekst}
        </p>
      )}

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
            <div className="text-gray-500 text-xs mb-2">Zestaw ćwiczeń (opcjonalnie)</div>
            {zestawy.length === 0 ? (
              <p className="text-gray-400 text-xs">
                Brak zestawów — utwórz pierwszy w zakładce „Zestawy".
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {zestawy.map((z) => {
                  const wybrany = zestawId === String(z.id);
                  return (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() => przelaczZestaw(z)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        wybrany
                          ? "bg-gray-900 border-gray-900 text-white"
                          : "border-gray-300 text-gray-600 hover:border-gray-400"
                      }`}
                    >
                      <Dumbbell size={13} />
                      {z.nazwa}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 mt-3 text-sm text-gray-600 cursor-pointer select-none w-fit">
            <input
              type="checkbox"
              checked={pomijajWRealizacji}
              onChange={(e) => setPomijajWRealizacji(e.target.checked)}
              className="rounded border-gray-300"
            />
            Nie uwzględniaj w Realizacji
          </label>

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
            {kompetencjeWlaczone ? (
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
            ) : (
              <span />
            )}
            <Button onClick={zapiszBlok} disabled={zapisywanie}>
              {zapisywanie ? "Zapisywanie..." : edytowanyBlokId ? "Zapisz zmiany" : "Zapisz blok"}
            </Button>
          </div>

          {kompetencjeWlaczone && pokazKompetencje && (
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
          {bloki.length === 0 && (
            <p className="text-gray-400 text-sm mb-3">
              Ten tydzień nie ma jeszcze bloków — przeciągnij po siatce, żeby dodać pierwszy.
            </p>
          )}
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
                const zestawBloku = blok.zestaw_id
                  ? zestawy.find((z) => z.id === blok.zestaw_id)
                  : undefined;

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
                      {zestawBloku && (
                        <span title={`Zestaw: ${zestawBloku.nazwa}`} className="shrink-0 flex">
                          <Dumbbell size={10} className="opacity-70" style={{ color: kolor }} />
                        </span>
                      )}
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