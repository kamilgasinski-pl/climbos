"use client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../supabaseclient";
import { minutyNaHHMM, hhmmNaMinuty } from "../../engine/czasEngine";
import { NAZWY_KOMPETENCJI, FILARY, NAZWY_FILAROW, Kompetencja, Filar } from "../../engine/climbingKnowledgeEngine";
import WyborTypuSesji, { TypSesji } from "../../components/WyborTypuSesji";
import Link from "next/link";
import { Loader2, Pencil, X, Check } from "lucide-react";
import { konwertujOcene, SKALA_KURTYKI, najtrudniejszaOcena, STOPNIE_UKONCZENIA, StopienUkonczenia, czyUkonczonaWCalosci, liczySieDoProgresji } from "../../engine/gradeEngine";
import { useKompetencjeWlaczone } from "../../components/useKompetencjeWlaczone";

type Sesja = {
  id: number;
  data_treningu: string;
  miejsce: string;
  czas_trwania_min: number;
  notatka: string | null;
  kalorie_spalone: number | null;
  srednie_bpm: number | null;
  typ_sesji: TypSesji;
  rpe: number | null;
  brak_danych_zegarka: boolean | null;
};

type Przejscie = {
  id: number;
  nazwa_drogi: string;
  trudnosc: string;
  styl: string;
  stopien_ukonczenia: string;
  blok: boolean;
  sesja_id: number;
};

type WierszDrogi = {
  klucz: string;
  nazwaDrogi: string;
  trudnosc: string;
  styl: string;
  stopienUkonczenia: StopienUkonczenia;
  blok: boolean;
  tryb: "wlasna" | "projekt";
  projektId: string;
};

type ProjektDoWyboru = {
  id: number;
  nazwa: string;
  trudnosc: string;
};

type CelSesji = {
  id: number;
  tytul: string;
  kompetencje: Kompetencja[];
  wykonano: boolean;
};

const OPCJE_RPE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function opisRPE(rpe: number): string {
  if (rpe <= 2) return "bardzo lekko";
  if (rpe <= 4) return "lekko";
  if (rpe <= 6) return "umiarkowanie";
  if (rpe <= 8) return "ciężko";
  if (rpe === 9) return "bardzo ciężko";
  return "maksymalny wysiłek";
}

// Część drogi i blok mają sens tylko przy próbach (Projekt/Próba) i wędce.
function czyMoznaCzesciowo(styl: string): boolean {
  return styl === "Projekt" || styl === "Wędka";
}

function nowyWiersz(): WierszDrogi {
  return {
    klucz: crypto.randomUUID(),
    nazwaDrogi: "",
    trudnosc: "",
    styl: "OS",
    stopienUkonczenia: "cala",
    blok: false,
    tryb: "wlasna",
    projektId: "",
  };
}

export default function SzczegolySesji() {
  const params = useParams();
  const sesjaId = Number(params.id);
  const kompetencjeWlaczone = useKompetencjeWlaczone();

  const [sesja, setSesja] = useState<Sesja | null>(null);
  const [przejscia, setPrzejscia] = useState<Przejscie[]>([]);
  const [ladowanie, setLadowanie] = useState(true);

  const [projekty, setProjekty] = useState<ProjektDoWyboru[]>([]);

  const [wiersze, setWiersze] = useState<WierszDrogi[]>(() => [nowyWiersz()]);
  const [bladPobierania, setBladPobierania] = useState("");
  const [bladFormularza, setBladFormularza] = useState("");
  const [zapisywanieDrog, setZapisywanieDrog] = useState(false);

  const [edytowanePrzejscieId, setEdytowanePrzejscieId] = useState<number | null>(null);
  const [edytowanaNazwa, setEdytowanaNazwa] = useState("");
  const [edytowanaTrudnosc, setEdytowanaTrudnosc] = useState("");
  const [edytowanyStyl, setEdytowanyStyl] = useState("OS");
  const [edytowanyStopienUkonczenia, setEdytowanyStopienUkonczenia] = useState<StopienUkonczenia>("cala");
  const [edytowanyBlok, setEdytowanyBlok] = useState(false);
  const [zapisywaniePrzejscia, setZapisywaniePrzejscia] = useState(false);

  const [edycjaMiejsca, setEdycjaMiejsca] = useState(false);
  const [miejsceTekst, setMiejsceTekst] = useState("");
  const [zapisywanieMiejsca, setZapisywanieMiejsca] = useState(false);
  const [dataTekst, setDataTekst] = useState("");

  const [edycjaNotatki, setEdycjaNotatki] = useState(false);
  const [notatkaTekst, setNotatkaTekst] = useState("");
  const [zapisywanieNotatki, setZapisywanieNotatki] = useState(false);

  const [edycjaZegarka, setEdycjaZegarka] = useState(false);
  const [kalorieTekst, setKalorieTekst] = useState("");
  const [bpmTekst, setBpmTekst] = useState("");
  const [zapisywanieZegarka, setZapisywanieZegarka] = useState(false);
  const [brakDanychZegarka, setBrakDanychZegarka] = useState(false);

  const [edycjaCzasu, setEdycjaCzasu] = useState(false);
  const [czasTekst, setCzasTekst] = useState("");
  const [zapisywanieCzasu, setZapisywanieCzasu] = useState(false);

  const [zapisywanieRpe, setZapisywanieRpe] = useState(false);

  const [celeSesji, setCeleSesji] = useState<CelSesji[]>([]);
  const [nowyCelTytul, setNowyCelTytul] = useState("");
  const [nowyCelKompetencje, setNowyCelKompetencje] = useState<Kompetencja[]>([]);
  const [pokazKompetencjeCelu, setPokazKompetencjeCelu] = useState(false);
  const [bladCelu, setBladCelu] = useState("");
  const [zapisywanieCelu, setZapisywanieCelu] = useState(false);

  useEffect(() => {
    async function pobierzWszystko() {
      await Promise.all([pobierzSesje(), pobierzPrzejscia(), pobierzCeleSesji(), pobierzProjekty()]);
      setLadowanie(false);
    }
    pobierzWszystko();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pobierzSesje() {
    const { data, error } = await supabase
      .from("sesje")
      .select("*")
      .eq("id", sesjaId)
      .single();

    if (error) {
      console.error("Błąd pobierania sesji:", error);
      setBladPobierania("Nie udało się pobrać danych sesji.");
      return;
    }
    setSesja(data as Sesja);
    setMiejsceTekst((data as Sesja).miejsce);
    setDataTekst((data as Sesja).data_treningu.slice(0, 10));
    setNotatkaTekst((data as Sesja).notatka ?? "");
    setKalorieTekst((data as Sesja).kalorie_spalone?.toString() ?? "");
    setBpmTekst((data as Sesja).srednie_bpm?.toString() ?? "");
    setBrakDanychZegarka((data as Sesja).brak_danych_zegarka ?? false);
    setCzasTekst(minutyNaHHMM((data as Sesja).czas_trwania_min));
  }

  async function pobierzPrzejscia() {
    const { data, error } = await supabase
      .from("przejscia")
      .select("*")
      .eq("sesja_id", sesjaId)
      .order("id", { ascending: true });

    if (error) {
      console.error("Błąd pobierania przejść:", error);
      setBladPobierania("Nie udało się pobrać listy dróg.");
      return;
    }
    setPrzejscia(data as Przejscie[]);
  }

  async function pobierzProjekty() {
    const { data, error } = await supabase
      .from("projekty")
      .select("id, nazwa, trudnosc")
      .order("created_at", { ascending: false });

    if (error) {
      // Projekty to tylko podpowiedzi — brak listy nie powinien blokować strony.
      console.error("Błąd pobierania projektów:", error);
      return;
    }
    setProjekty(data as ProjektDoWyboru[]);
  }

  async function pobierzCeleSesji() {
    const { data, error } = await supabase
      .from("cele_sesji")
      .select("*")
      .eq("sesja_id", sesjaId)
      .order("id", { ascending: true });

    if (error) {
      console.error("Błąd pobierania celów sesji:", error);
      setBladPobierania("Nie udało się pobrać celów sesji.");
      return;
    }
    setCeleSesji(data as unknown as CelSesji[]);
  }

  async function zmienTypSesji(typ: TypSesji) {
    if (!sesja || sesja.typ_sesji === typ) return;

    const poprzedniTyp = sesja.typ_sesji;
    setSesja({ ...sesja, typ_sesji: typ });

    const { error } = await supabase
      .from("sesje")
      .update({ typ_sesji: typ })
      .eq("id", sesjaId);

    if (error) {
      console.error("Błąd zmiany typu sesji:", error);
      setBladPobierania("Nie udało się zmienić typu sesji. Spróbuj ponownie.");
      setSesja((poprzednia) => (poprzednia ? { ...poprzednia, typ_sesji: poprzedniTyp } : poprzednia));
    }
  }

  async function ustawRpe(wartosc: number) {
    if (!sesja) return;

    const poprzednieRpe = sesja.rpe;
    setSesja({ ...sesja, rpe: wartosc });
    setZapisywanieRpe(true);

    const { error } = await supabase
      .from("sesje")
      .update({ rpe: wartosc })
      .eq("id", sesjaId);

    setZapisywanieRpe(false);

    if (error) {
      console.error("Błąd zapisu RPE:", error);
      setBladPobierania("Nie udało się zapisać RPE. Spróbuj ponownie.");
      setSesja((poprzednia) => (poprzednia ? { ...poprzednia, rpe: poprzednieRpe } : poprzednia));
    }
  }

  async function zapiszMiejsce() {
    if (miejsceTekst.trim() === "") {
      setBladPobierania("Podaj nazwę miejsca.");
      return;
    }
    if (dataTekst === "") {
      setBladPobierania("Podaj datę sesji.");
      return;
    }
    setBladPobierania("");
    setZapisywanieMiejsca(true);

    const { error } = await supabase
      .from("sesje")
      .update({ miejsce: miejsceTekst, data_treningu: dataTekst })
      .eq("id", sesjaId);

    setZapisywanieMiejsca(false);

    if (error) {
      console.error("Błąd zapisu miejsca i daty:", error);
      setBladPobierania("Nie udało się zapisać zmian. Spróbuj ponownie.");
      return;
    }

    setSesja((poprzednia) =>
      poprzednia ? { ...poprzednia, miejsce: miejsceTekst, data_treningu: dataTekst } : poprzednia
    );
    setEdycjaMiejsca(false);
  }

  async function zapiszNotatke() {
    setZapisywanieNotatki(true);

    const { error } = await supabase
      .from("sesje")
      .update({ notatka: notatkaTekst.trim() === "" ? null : notatkaTekst })
      .eq("id", sesjaId);

    setZapisywanieNotatki(false);

    if (error) {
      console.error("Błąd zapisu notatki:", error);
      setBladPobierania("Nie udało się zapisać notatki. Spróbuj ponownie.");
      return;
    }

    setSesja((poprzednia) =>
      poprzednia
        ? { ...poprzednia, notatka: notatkaTekst.trim() === "" ? null : notatkaTekst }
        : poprzednia
    );
    setEdycjaNotatki(false);
  }

  async function zapiszDaneZegarka() {
    setZapisywanieZegarka(true);

    // Gdy zaznaczono "brak danych z zegarka", kalorie i BPM zostają puste.
    const kalorie = brakDanychZegarka || kalorieTekst.trim() === "" ? null : Number(kalorieTekst);
    const bpm = brakDanychZegarka || bpmTekst.trim() === "" ? null : Number(bpmTekst);

    const { error } = await supabase
      .from("sesje")
      .update({ kalorie_spalone: kalorie, srednie_bpm: bpm, brak_danych_zegarka: brakDanychZegarka })
      .eq("id", sesjaId);

    setZapisywanieZegarka(false);

    if (error) {
      console.error("Błąd zapisu danych z zegarka:", error);
      setBladPobierania("Nie udało się zapisać danych z zegarka. Spróbuj ponownie.");
      return;
    }

    setSesja((poprzednia) =>
      poprzednia
        ? {
            ...poprzednia,
            kalorie_spalone: kalorie,
            srednie_bpm: bpm,
            brak_danych_zegarka: brakDanychZegarka,
          }
        : poprzednia
    );
    if (brakDanychZegarka) {
      setKalorieTekst("");
      setBpmTekst("");
    }
    setEdycjaZegarka(false);
  }

  async function zapiszCzas() {
    const nowyCzas = hhmmNaMinuty(czasTekst);
    if (nowyCzas === null || nowyCzas <= 0) {
      setBladPobierania("Podaj czas w formacie GG:MM, np. 01:24.");
      return;
    }
    setBladPobierania("");
    setZapisywanieCzasu(true);

    const { error } = await supabase
      .from("sesje")
      .update({ czas_trwania_min: nowyCzas })
      .eq("id", sesjaId);

    setZapisywanieCzasu(false);

    if (error) {
      console.error("Błąd zapisu czasu trwania:", error);
      setBladPobierania("Nie udało się zapisać czasu trwania. Spróbuj ponownie.");
      return;
    }

    setSesja((poprzednia) => (poprzednia ? { ...poprzednia, czas_trwania_min: nowyCzas } : poprzednia));
    setEdycjaCzasu(false);
  }

  function dodajWiersz() {
    setWiersze((poprzednie) => [...poprzednie, nowyWiersz()]);
  }

  function usunWiersz(klucz: string) {
    setWiersze((poprzednie) => poprzednie.filter((w) => w.klucz !== klucz));
  }

  function aktualizujWiersz(klucz: string, zmiana: Partial<WierszDrogi>) {
    setWiersze((poprzednie) =>
      poprzednie.map((w) => (w.klucz === klucz ? { ...w, ...zmiana } : w))
    );
  }

  function wybierzProjekt(klucz: string, idProjektu: string) {
    const projekt = projekty.find((p) => p.id.toString() === idProjektu);
    if (!projekt) return;
    aktualizujWiersz(klucz, {
      projektId: idProjektu,
      nazwaDrogi: projekt.nazwa,
      trudnosc: projekt.trudnosc,
    });
  }

  function zmienTryb(klucz: string, tryb: "wlasna" | "projekt") {
    if (tryb === "projekt") {
      aktualizujWiersz(klucz, { tryb, projektId: "", nazwaDrogi: "", trudnosc: "" });
    } else {
      // dane z wybranego projektu zostają, żeby można je było poprawić
      aktualizujWiersz(klucz, { tryb, projektId: "" });
    }
  }

  async function zapiszWszystkieDrogi() {
    const niepoprawny = wiersze.some(
      (w) => w.nazwaDrogi.trim() === "" || w.trudnosc === ""
    );

    if (wiersze.length === 0 || niepoprawny) {
      setBladFormularza("Uzupełnij nazwę i trudność (albo wybierz projekt) dla każdej dodawanej drogi.");
      return;
    }
    setBladFormularza("");
    setZapisywanieDrog(true);

    const rekordy = wiersze.map((w) => ({
      nazwa_drogi: w.nazwaDrogi,
      trudnosc: w.trudnosc,
      styl: w.styl,
      stopien_ukonczenia: czyMoznaCzesciowo(w.styl) ? w.stopienUkonczenia : "cala",
      blok: czyMoznaCzesciowo(w.styl) ? w.blok : false,
      sesja_id: sesjaId,
    }));

    const { error } = await supabase.from("przejscia").insert(rekordy);

    setZapisywanieDrog(false);

    if (error) {
      console.error("Błąd dodawania dróg:", error);
      setBladFormularza("Nie udało się zapisać dróg. Spróbuj ponownie.");
      return;
    }

    setWiersze([nowyWiersz()]);
    pobierzPrzejscia();
  }

  async function usunPrzejscie(id: number) {
    const { error } = await supabase.from("przejscia").delete().eq("id", id);
    if (error) {
      console.error("Błąd usuwania:", error);
      setBladPobierania("Nie udało się usunąć drogi. Spróbuj ponownie.");
      return;
    }
    pobierzPrzejscia();
  }

  function rozpocznijEdycjePrzejscia(p: Przejscie) {
    setEdytowanePrzejscieId(p.id);
    setEdytowanaNazwa(p.nazwa_drogi);
    setEdytowanaTrudnosc(p.trudnosc);
    setEdytowanyStyl(p.styl);
    setEdytowanyStopienUkonczenia(p.stopien_ukonczenia as StopienUkonczenia);
    setEdytowanyBlok(p.blok);
  }

  function anulujEdycjePrzejscia() {
    setEdytowanePrzejscieId(null);
    setEdytowanaNazwa("");
    setEdytowanaTrudnosc("");
    setEdytowanyStyl("OS");
    setEdytowanyStopienUkonczenia("cala");
    setEdytowanyBlok(false);
  }

  async function zapiszEdycjePrzejscia(id: number) {
    if (edytowanaNazwa.trim() === "" || edytowanaTrudnosc === "") {
      setBladPobierania("Podaj nazwę i trudność drogi.");
      return;
    }
    setBladPobierania("");
    setZapisywaniePrzejscia(true);

    const { error } = await supabase
      .from("przejscia")
      .update({
        nazwa_drogi: edytowanaNazwa,
        trudnosc: edytowanaTrudnosc,
        styl: edytowanyStyl,
        stopien_ukonczenia: czyMoznaCzesciowo(edytowanyStyl) ? edytowanyStopienUkonczenia : "cala",
        blok: czyMoznaCzesciowo(edytowanyStyl) ? edytowanyBlok : false,
      })
      .eq("id", id);

    setZapisywaniePrzejscia(false);

    if (error) {
      console.error("Błąd edycji drogi:", error);
      setBladPobierania("Nie udało się zapisać zmiany. Spróbuj ponownie.");
      return;
    }

    anulujEdycjePrzejscia();
    pobierzPrzejscia();
  }

  function przelaczKompetencjeCelu(klucz: Kompetencja) {
    setNowyCelKompetencje((poprzednie) =>
      poprzednie.includes(klucz)
        ? poprzednie.filter((k) => k !== klucz)
        : [...poprzednie, klucz]
    );
  }

  async function dodajCelSesji() {
    if (nowyCelTytul.trim() === "") {
      setBladCelu("Podaj nazwę celu.");
      return;
    }
    setBladCelu("");
    setZapisywanieCelu(true);

    const { error } = await supabase.from("cele_sesji").insert({
      sesja_id: sesjaId,
      tytul: nowyCelTytul,
      kompetencje: kompetencjeWlaczone ? nowyCelKompetencje : [],
    });

    setZapisywanieCelu(false);

    if (error) {
      console.error("Błąd dodawania celu sesji:", error);
      setBladCelu("Nie udało się dodać celu. Spróbuj ponownie.");
      return;
    }

    setNowyCelTytul("");
    setNowyCelKompetencje([]);
    setPokazKompetencjeCelu(false);
    pobierzCeleSesji();
  }

  async function przelaczWykonanieCelu(cel: CelSesji) {
    const { error } = await supabase
      .from("cele_sesji")
      .update({ wykonano: !cel.wykonano })
      .eq("id", cel.id);

    if (error) {
      console.error("Błąd aktualizacji celu:", error);
      setBladPobierania("Nie udało się zaktualizować celu. Spróbuj ponownie.");
      return;
    }

    setCeleSesji((poprzednie) =>
      poprzednie.map((c) => (c.id === cel.id ? { ...c, wykonano: !c.wykonano } : c))
    );
  }

  async function usunCelSesji(id: number) {
    const { error } = await supabase.from("cele_sesji").delete().eq("id", id);
    if (error) {
      console.error("Błąd usuwania celu:", error);
      setBladPobierania("Nie udało się usunąć celu. Spróbuj ponownie.");
      return;
    }
    setCeleSesji((poprzednie) => poprzednie.filter((c) => c.id !== id));
  }

  const liczbaDrog = przejscia.length;
  const przejsciaUkonczone = przejscia.filter((p) => liczySieDoProgresji(p));
  const najtrudniejszaWSesji = najtrudniejszaOcena(przejsciaUkonczone.map((p) => p.trudnosc));

  const rozkladStylow = przejscia.reduce<Record<string, number>>((akumulator, p) => {
    akumulator[p.styl] = (akumulator[p.styl] ?? 0) + 1;
    return akumulator;
  }, {});

  if (ladowanie || !sesja) {
    return (
      <main className="p-10 font-sans flex items-center gap-2 text-gray-500">
        <Loader2 className="animate-spin" size={20} />
        Ładowanie sesji...
      </main>
    );
  }

  const czySportowa = sesja.typ_sesji !== "bouldering";
  const czyRpe = sesja.typ_sesji === "bouldering" || sesja.typ_sesji === "mix";

  const klasaEtykietyBlok =
    "flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none whitespace-nowrap";

  return (
    <main className="p-10 font-sans">
      <Link href="/sesje" className="text-gray-500 hover:underline">
        ← Wróć do listy sesji
      </Link>

      {edycjaMiejsca ? (
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <Input
            value={miejsceTekst}
            onChange={(e) => setMiejsceTekst(e.target.value)}
            className="text-2xl font-bold h-11 max-w-xs"
            autoFocus
          />
          <Input
            type="date"
            value={dataTekst}
            onChange={(e) => setDataTekst(e.target.value)}
            className="w-[170px] h-11"
          />
          <Button onClick={zapiszMiejsce} disabled={zapisywanieMiejsca} size="sm">
            {zapisywanieMiejsca ? "Zapisywanie..." : "Zapisz"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setMiejsceTekst(sesja.miejsce);
              setDataTekst(sesja.data_treningu.slice(0, 10));
              setEdycjaMiejsca(false);
            }}
          >
            Anuluj
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 mt-4">
          <h1 className="text-3xl font-bold">
            {sesja.miejsce} — {sesja.data_treningu}
          </h1>
          <button
            onClick={() => setEdycjaMiejsca(true)}
            className="text-gray-400 hover:text-gray-700"
          >
            <Pencil size={16} />
          </button>
        </div>
      )}

      <div className="mt-3">
        <WyborTypuSesji wartosc={sesja.typ_sesji ?? "sportowa"} zmienTypAction={zmienTypSesji} mieszana />
      </div>

      {bladPobierania && <p className="text-red-600 mt-2">{bladPobierania}</p>}

      <Card className="p-4 mt-4">
        {edycjaNotatki ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={notatkaTekst}
              onChange={(e) => setNotatkaTekst(e.target.value)}
              placeholder="Notatka do sesji..."
              rows={3}
              className="p-2 border border-gray-300 rounded-md resize-none"
            />
            <div className="flex gap-2">
              <Button onClick={zapiszNotatke} disabled={zapisywanieNotatki} size="sm">
                {zapisywanieNotatki ? "Zapisywanie..." : "Zapisz notatkę"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNotatkaTekst(sesja.notatka ?? "");
                  setEdycjaNotatki(false);
                }}
              >
                Anuluj
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <p className={sesja.notatka ? "text-gray-700" : "text-gray-400 italic"}>
              {sesja.notatka || "Brak notatki — kliknij, aby dodać."}
            </p>
            <button
              onClick={() => setEdycjaNotatki(true)}
              className="text-gray-400 hover:text-gray-700 shrink-0"
            >
              <Pencil size={16} />
            </button>
          </div>
        )}
      </Card>

      {edycjaCzasu ? (
        <div className="flex items-center gap-2 mt-3">
          <Input
            type="text"
            value={czasTekst}
            onChange={(e) => setCzasTekst(e.target.value)}
            placeholder="GG:MM"
            className="w-[100px]"
            autoComplete="off"
          />
          <Button onClick={zapiszCzas} disabled={zapisywanieCzasu} size="sm">
            {zapisywanieCzasu ? "Zapisywanie..." : "Zapisz"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCzasTekst(minutyNaHHMM(sesja.czas_trwania_min));
              setEdycjaCzasu(false);
            }}
          >
            Anuluj
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 mt-3">
          <p className="text-gray-500">Czas trwania: {minutyNaHHMM(sesja.czas_trwania_min)}</p>
          <button
            onClick={() => setEdycjaCzasu(true)}
            className="text-gray-400 hover:text-gray-700"
          >
            <Pencil size={14} />
          </button>
        </div>
      )}

      <Card className="p-4 mt-4">
        {edycjaZegarka ? (
          <div className="flex flex-col gap-2">
            <div className="text-gray-500 text-sm mb-1">Dane z zegarka (opcjonalnie)</div>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none w-fit">
              <input
                type="checkbox"
                checked={brakDanychZegarka}
                onChange={(e) => setBrakDanychZegarka(e.target.checked)}
                className="rounded border-gray-300"
              />
              Brak danych z zegarka
            </label>
            <div className="flex gap-2 flex-wrap">
              <Input
                type="number"
                value={kalorieTekst}
                onChange={(e) => setKalorieTekst(e.target.value)}
                placeholder="Spalone kalorie (kcal)"
                className="w-[200px]"
                autoComplete="off"
                disabled={brakDanychZegarka}
              />
              <Input
                type="number"
                value={bpmTekst}
                onChange={(e) => setBpmTekst(e.target.value)}
                placeholder="Średnie BPM"
                className="w-[160px]"
                autoComplete="off"
                disabled={brakDanychZegarka}
              />
            </div>
            <div className="flex gap-2 mt-1">
              <Button onClick={zapiszDaneZegarka} disabled={zapisywanieZegarka} size="sm">
                {zapisywanieZegarka ? "Zapisywanie..." : "Zapisz dane"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setKalorieTekst(sesja.kalorie_spalone?.toString() ?? "");
                  setBpmTekst(sesja.srednie_bpm?.toString() ?? "");
                  setBrakDanychZegarka(sesja.brak_danych_zegarka ?? false);
                  setEdycjaZegarka(false);
                }}
              >
                Anuluj
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            {sesja.kalorie_spalone != null || sesja.srednie_bpm != null ? (
              <div className="flex gap-6 text-sm">
                {sesja.kalorie_spalone != null && (
                  <div>
                    <span className="text-gray-500">🔥 Kalorie: </span>
                    <span className="font-bold">{sesja.kalorie_spalone} kcal</span>
                  </div>
                )}
                {sesja.srednie_bpm != null && (
                  <div>
                    <span className="text-gray-500">❤️ Średnie BPM: </span>
                    <span className="font-bold">{sesja.srednie_bpm}</span>
                  </div>
                )}
              </div>
            ) : sesja.brak_danych_zegarka ? (
              <p className="text-gray-500 text-sm">⌚ Brak danych z zegarka</p>
            ) : (
              <p className="text-gray-400 italic text-sm">
                Brak danych z zegarka — kliknij, aby dodać.
              </p>
            )}
            <button
              onClick={() => setEdycjaZegarka(true)}
              className="text-gray-400 hover:text-gray-700 shrink-0"
            >
              <Pencil size={16} />
            </button>
          </div>
        )}
      </Card>

      {czyRpe && (
        <Card className="p-4 mt-4">
          <div className="text-gray-500 text-sm mb-2">
            Intensywność sesji (RPE) — jak ciężki był dla Ciebie cały trening?
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {OPCJE_RPE.map((wartosc) => (
              <button
                key={wartosc}
                type="button"
                onClick={() => ustawRpe(wartosc)}
                disabled={zapisywanieRpe}
                className={`w-9 h-9 rounded-md border flex items-center justify-center text-sm font-medium transition-colors ${
                  sesja.rpe === wartosc
                    ? "bg-gray-900 border-gray-900 text-white"
                    : "border-gray-300 text-gray-600 hover:border-gray-400"
                }`}
              >
                {wartosc}
              </button>
            ))}
          </div>

          <div className="text-xs text-gray-400 mt-2 flex flex-wrap gap-x-3 gap-y-0.5">
            <span>1–2 — bardzo lekko</span>
            <span>3–4 — lekko</span>
            <span>5–6 — umiarkowanie</span>
            <span>7–8 — ciężko</span>
            <span>9 — bardzo ciężko</span>
            <span>10 — maksymalny wysiłek</span>
          </div>

          {sesja.rpe != null && (
            <div className="text-sm text-gray-500 mt-2">
              RPE {sesja.rpe} — {opisRPE(sesja.rpe)} · session-RPE:{" "}
              <span className="font-bold text-gray-700">
                {sesja.czas_trwania_min * sesja.rpe}
              </span>{" "}
              (czas × RPE)
            </div>
          )}
        </Card>
      )}

      <h2 className="text-xl font-bold mt-8">Cele sesji</h2>
      <p className="text-gray-500 text-sm mt-1">
        {kompetencjeWlaczone
          ? 'Np. "3x lot" żeby popracować nad kontrolą emocji. Odhaczony cel dolicza punkty do profilu kompetencji w DNA.'
          : 'Np. "3x lot" albo "3 drogi w 6c". Odhaczaj cele w trakcie sesji.'}
      </p>

      <Card className="p-4 mt-3">
        {celeSesji.length === 0 ? (
          <p className="text-gray-400 text-sm mb-3">Brak celów dla tej sesji.</p>
        ) : (
          <ul className="flex flex-col gap-2 mb-4">
            {celeSesji.map((cel) => (
              <li
                key={cel.id}
                className="flex items-center gap-3 rounded-md px-3 py-2 bg-gray-50"
              >
                <button
                  onClick={() => przelaczWykonanieCelu(cel)}
                  className={`w-5 h-5 shrink-0 rounded-md border flex items-center justify-center transition-colors ${
                    cel.wykonano
                      ? "bg-green-600 border-green-600 text-white"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                  aria-label={cel.wykonano ? "Oznacz jako niewykonany" : "Oznacz jako wykonany"}
                >
                  {cel.wykonano && <Check size={12} />}
                </button>
                <span
                  className={`text-sm font-medium ${
                    cel.wykonano ? "line-through text-gray-400" : ""
                  }`}
                >
                  {cel.tytul}
                </span>
                {kompetencjeWlaczone && cel.kompetencje.length > 0 && (
                  <div className="flex gap-1 flex-wrap ml-1">
                    {cel.kompetencje.map((k) => (
                      <span
                        key={k}
                        className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600"
                      >
                        {NAZWY_KOMPETENCJI[k]}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => usunCelSesji(cel.id)}
                  className="text-gray-400 hover:text-red-600 ml-auto shrink-0"
                >
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2 flex-wrap items-center">
          <Input
            value={nowyCelTytul}
            onChange={(e) => setNowyCelTytul(e.target.value)}
            placeholder="Dodaj cele sesji treningowej..."
            className="w-[220px]"
          />
        </div>

        {kompetencjeWlaczone && (
          <>
            <button
              type="button"
              onClick={() => setPokazKompetencjeCelu(!pokazKompetencjeCelu)}
              className="text-sm text-blue-600 hover:underline mt-3"
            >
              {pokazKompetencjeCelu
                ? "− Ukryj kompetencje"
                : nowyCelKompetencje.length > 0
                ? `+ Kompetencje (${nowyCelKompetencje.length})`
                : "+ Dodaj kompetencje (opcjonalnie)"}
            </button>

            {pokazKompetencjeCelu && (
              <div className="mt-3">
                <div className="text-gray-500 text-xs mb-2">
                  Które kompetencje rozwija ten cel? (opcjonalnie)
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
                          onClick={() => przelaczKompetencjeCelu(klucz)}
                          className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
                            nowyCelKompetencje.includes(klucz)
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
          </>
        )}

        {bladCelu && <p className="text-red-600 text-sm mt-2">{bladCelu}</p>}

        <div className="mt-3">
          <Button onClick={dodajCelSesji} disabled={zapisywanieCelu}>
            {zapisywanieCelu ? "Zapisywanie..." : "+ Dodaj cel"}
          </Button>
        </div>
      </Card>

      {czySportowa && (
        <>
          <h2 className="text-xl font-bold mt-8">Dodaj drogi do tej sesji</h2>
          <div className="flex flex-col gap-2 mt-3">
            {wiersze.map((w) => (
              <Card key={w.klucz} className="flex flex-row items-center gap-2 p-3 flex-wrap">
                {projekty.length > 0 && (
                  <div className="flex rounded-md border border-gray-300 overflow-hidden text-sm">
                    <button
                      type="button"
                      onClick={() => zmienTryb(w.klucz, "wlasna")}
                      className={`px-3 py-1.5 ${
                        w.tryb === "wlasna"
                          ? "bg-gray-900 text-white"
                          : "bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      Własna droga
                    </button>
                    <button
                      type="button"
                      onClick={() => zmienTryb(w.klucz, "projekt")}
                      className={`px-3 py-1.5 border-l border-gray-300 ${
                        w.tryb === "projekt"
                          ? "bg-gray-900 text-white"
                          : "bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      Z projektu
                    </button>
                  </div>
                )}
                {w.tryb === "projekt" ? (
                  <Select
                    value={w.projektId}
                    onValueChange={(value) => wybierzProjekt(w.klucz, value ?? "")}
                  >
                    <SelectTrigger className="w-[260px]">
                      <SelectValue placeholder="Wybierz projekt" />
                    </SelectTrigger>
                    <SelectContent>
                      {projekty.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.nazwa} · {p.trudnosc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <>
                    <Input
                      value={w.nazwaDrogi}
                      onChange={(e) => aktualizujWiersz(w.klucz, { nazwaDrogi: e.target.value })}
                      placeholder="Nazwa drogi"
                      className="w-[180px]"
                    />
                    <Select
                      value={w.trudnosc}
                      onValueChange={(value) => aktualizujWiersz(w.klucz, { trudnosc: value ?? "" })}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Trudność" />
                      </SelectTrigger>
                      <SelectContent>
                        {SKALA_KURTYKI.map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
                <Select
                  value={w.styl}
                  onValueChange={(value) => {
                    const styl = value ?? "OS";
                    aktualizujWiersz(
                      w.klucz,
                      czyMoznaCzesciowo(styl)
                        ? { styl }
                        : { styl, stopienUkonczenia: "cala", blok: false }
                    );
                  }}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OS">OS (on-sight)</SelectItem>
                    <SelectItem value="RP">RP (redpoint)</SelectItem>
                    <SelectItem value="Flash">Flash</SelectItem>
                    <SelectItem value="Projekt">Projekt/Próba</SelectItem>
                    <SelectItem value="Wędka">Wędka</SelectItem>
                  </SelectContent>
                </Select>
                {czyMoznaCzesciowo(w.styl) && (
                  <>
                <Select
                  value={w.stopienUkonczenia}
                  onValueChange={(value) =>
                    aktualizujWiersz(w.klucz, { stopienUkonczenia: (value as StopienUkonczenia) ?? "cala" })
                  }
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STOPNIE_UKONCZENIA.map((s) => (
                      <SelectItem key={s.wartosc} value={s.wartosc}>
                        {s.etykieta}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className={klasaEtykietyBlok}>
                  <input
                    type="checkbox"
                    checked={w.blok}
                    onChange={(e) => aktualizujWiersz(w.klucz, { blok: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  Blok
                </label>
                  </>
                )}
                {wiersze.length > 1 && (
                  <button
                    onClick={() => usunWiersz(w.klucz)}
                    className="text-gray-400 hover:text-red-600 ml-auto"
                  >
                    <X size={18} />
                  </button>
                )}
              </Card>
            ))}

            <div className="flex gap-2 mt-1">
              <Button variant="outline" onClick={dodajWiersz}>
                + Dodaj kolejną drogę
              </Button>
              <Button onClick={zapiszWszystkieDrogi} disabled={zapisywanieDrog}>
                {zapisywanieDrog ? "Zapisywanie..." : "Zapisz drogi"}
              </Button>
            </div>
          </div>
          {bladFormularza && <p className="text-red-600 text-sm mt-2">{bladFormularza}</p>}

          <h2 className="text-xl font-bold mt-8">Podsumowanie sesji</h2>
          <Card className="p-4 flex gap-8 flex-wrap">
            <div>
              <div className="text-gray-500 text-sm">Liczba dróg</div>
              <div className="text-xl font-bold">{liczbaDrog}</div>
            </div>
            <div>
              <div className="text-gray-500 text-sm">Najtrudniejsza</div>
              <div className="text-xl font-bold">{najtrudniejszaWSesji ?? "—"}</div>
            </div>
            <div>
              <div className="text-gray-500 text-sm">Style</div>
              <div className="text-sm font-medium mt-1">
                {liczbaDrog === 0
                  ? "—"
                  : Object.entries(rozkladStylow)
                      .map(([styl, liczba]) => `${styl}: ${liczba}`)
                      .join(" · ")}
              </div>
            </div>
          </Card>

          <h2 className="text-xl font-bold mt-8">Drogi w tej sesji</h2>
          <ul className="list-none p-0">
            {przejscia.map((p) =>
              edytowanePrzejscieId === p.id ? (
                <li key={p.id}>
                  <Card className="flex flex-row items-center gap-2 p-2.5 flex-wrap">
                    <Input
                      value={edytowanaNazwa}
                      onChange={(e) => setEdytowanaNazwa(e.target.value)}
                      placeholder="Nazwa drogi"
                      className="w-[180px]"
                      autoFocus
                    />
                    <Select
                      value={edytowanaTrudnosc}
                      onValueChange={(value) => setEdytowanaTrudnosc(value ?? "")}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Trudność" />
                      </SelectTrigger>
                      <SelectContent>
                        {SKALA_KURTYKI.map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={edytowanyStyl}
                      onValueChange={(value) => {
                        const styl = value ?? "OS";
                        setEdytowanyStyl(styl);
                        if (!czyMoznaCzesciowo(styl)) {
                          setEdytowanyStopienUkonczenia("cala");
                          setEdytowanyBlok(false);
                        }
                      }}
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OS">OS (on-sight)</SelectItem>
                        <SelectItem value="RP">RP (redpoint)</SelectItem>
                        <SelectItem value="Flash">Flash</SelectItem>
                        <SelectItem value="Projekt">Projekt/Próba</SelectItem>
                        <SelectItem value="Wędka">Wędka</SelectItem>
                      </SelectContent>
                    </Select>
                    {czyMoznaCzesciowo(edytowanyStyl) && (
                      <>
                    <Select
                      value={edytowanyStopienUkonczenia}
                      onValueChange={(value) =>
                        setEdytowanyStopienUkonczenia((value as StopienUkonczenia) ?? "cala")
                      }
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STOPNIE_UKONCZENIA.map((s) => (
                          <SelectItem key={s.wartosc} value={s.wartosc}>
                            {s.etykieta}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <label className={klasaEtykietyBlok}>
                      <input
                        type="checkbox"
                        checked={edytowanyBlok}
                        onChange={(e) => setEdytowanyBlok(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      Blok
                    </label>
                      </>
                    )}
                    <Button size="sm" onClick={() => zapiszEdycjePrzejscia(p.id)} disabled={zapisywaniePrzejscia}>
                      {zapisywaniePrzejscia ? "Zapisywanie..." : "Zapisz"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={anulujEdycjePrzejscia}>
                      Anuluj
                    </Button>
                  </Card>
                </li>
              ) : (
                <li key={p.id}>
                  <Card className="flex flex-row items-center gap-4 p-2.5">
                    <strong>{p.nazwa_drogi}</strong>
                    <span>
                      {p.trudnosc} ({konwertujOcene(p.trudnosc, "kurtyki", "francuska")})
                    </span>
                    <span>{p.styl}</span>
                    {!czyUkonczonaWCalosci(p.stopien_ukonczenia) && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                        {p.stopien_ukonczenia} drogi
                      </span>
                    )}
                    {p.blok && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        Blok
                      </span>
                    )}
                    <div className="flex gap-2 ml-auto">
                      <Button size="sm" variant="outline" onClick={() => rozpocznijEdycjePrzejscia(p)}>
                        Edytuj
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => usunPrzejscie(p.id)}>
                        Usuń
                      </Button>
                    </div>
                  </Card>
                </li>
              )
            )}
          </ul>
        </>
      )}
    </main>
  );
}