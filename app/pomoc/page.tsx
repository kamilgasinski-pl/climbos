"use client";

import { Card } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";

type Punkt = { nazwa: string; opis: string };
type Sekcja = { id: string; tytul: string; wstep?: string; punkty: Punkt[] };

const SZYBKI_START: string[] = [
  "Na Home ustaw Mega Cel (ołówek w karcie celu), a w DNA → Test poziomu zrób pierwszy test. Dzięki temu pasek postępu ma punkt startowy.",
  "W Planner → Harmonogram tygodniowy ułóż tydzień: przeciągnij po siatce, nazwij blok, wybierz kategorię. Kliknij „Zapisz szablon”, żeby kolejne tygodnie powstawały z Twojego planu.",
  "Codziennie odhaczaj aktywności na Home (Dzisiejsze aktywności) albo w Planner → Realizacja.",
  "Po wspinaniu dodaj sesję (Home → + Dodaj nową sesję), wejdź w jej szczegóły i wpisz drogi, RPE albo dane z zegarka.",
  "Postępy oglądaj w Logbooku (sesje i przejścia) oraz w DNA (kompetencje, test poziomu, skład ciała).",
];

const SEKCJE: Sekcja[] = [
  {
    id: "home",
    tytul: "Home",
    wstep: "Panel dnia: cel, najbliższe terminy, statystyki i to, co masz dziś do zrobienia.",
    punkty: [
      {
        nazwa: "Mega Cel",
        opis: "Twój główny cel: konkretna trudność w stylu OS albo RP, albo opis własnymi słowami (np. przejście wybranej drogi). Dla celu z trudnością pasek pokazuje drogę od wyniku ostatniego testu poziomu do celu, więc bez testu poziomu pasek się nie pojawi. Aktualny poziom to wyższa z wartości: wynik testu albo najtrudniejsza ukończona droga w stylu celu. Edytujesz go ołówkiem (również w Planner → Cele).",
      },
      {
        nazwa: "Zbliżające się cele",
        opis: "Dla każdej kategorii (Fizyczne, Techniczne, Mentalne, Inne) widać najbliższy niewykonany cel z terminem. Termin po czasie jest czerwony. Cele długoterminowe nie mają kategorii, więc tu się nie pojawiają.",
      },
      {
        nazwa: "Statystyki przejść",
        opis: "Najtrudniejsza OS, RP i Wędka liczą się tylko z dróg ukończonych w całości i bez bloku. „Łącznie przejść Wędka” to wszystkie przejścia na wędkę, „z dołem” to OS + RP + Projekt, a „Łączna liczba przejść” to wszystkie próby.",
      },
      {
        nazwa: "Szacowany poziom (test)",
        opis: "Wynik ostatniego testu poziomu. Przycisk prowadzi do DNA, gdzie robisz test.",
      },
      {
        nazwa: "Dzisiejsze aktywności",
        opis: "Bloki z planu bieżącego tygodnia przypadające na dziś (oprócz oznaczonych „Nie uwzględniaj w Realizacji”) oraz aktywności jednodniowe dodane w Planner → Cele. Odhaczenie bloku zapisuje się też w Realizacji. Jeśli blok ma zestaw ćwiczeń, obok jest przycisk prowadzący do zestawu.",
      },
      {
        nazwa: "Ostatnia sesja",
        opis: "Skrót do ostatnio dodanej sesji oraz przycisk „+ Dodaj nową sesję”.",
      },
    ],
  },
  {
    id: "sesje",
    tytul: "Sesje",
    wstep: "Tu zapisujesz treningi, które się odbyły. Szczegóły sesji otwierasz przyciskiem „Szczegóły”.",
    punkty: [
      {
        nazwa: "Dodawanie sesji",
        opis: "Podajesz datę, miejsce, czas (w minutach) i opcjonalnie notatkę. Sesja z datą w przyszłości pojawi się w Planner → Sesje jako zaplanowana.",
      },
      {
        nazwa: "Lista sesji",
        opis: "Każda sesja ma plakietkę typu (Wspinaczka, Bouldering lub 50:50), czas oraz, jeśli je wpisałeś, kalorie, średnie tętno i RPE. Strzałka rozwija listę dróg, kosz usuwa sesję razem z jej drogami i celami.",
      },
      {
        nazwa: "Edycja w szczegółach",
        opis: "Ołówkiem zmienisz miejsce, notatkę, czas trwania (format GG:MM, np. 01:24) i dane z zegarka (kalorie, średnie BPM).",
      },
      {
        nazwa: "Typ sesji",
        opis: "Wspinaczka sportowa pokazuje formularz dróg i podsumowanie, Bouldering pokazuje RPE, a 50:50 oba naraz (dla treningów mieszanych).",
      },
      {
        nazwa: "RPE",
        opis: "Subiektywna intensywność całej sesji w skali 1–10 (1–2 bardzo lekko, 5–6 umiarkowanie, 9 bardzo ciężko, 10 maksymalny wysiłek). Pod spodem liczy się session-RPE = czas × RPE, czyli obciążenie sesji. Pozwala porównywać treningi bez zegarka.",
      },
      {
        nazwa: "Cele sesji",
        opis: "Własne cele na tę sesję (np. „3x lot”), opcjonalnie z kompetencjami, które rozwijają. Odhaczony cel dolicza punkty do profilu kompetencji.",
      },
      {
        nazwa: "Drogi",
        opis: "Dodajesz wiele naraz: nazwa, trudność wg skali Kurtyki i styl: OS, RP, Flash, Projekt/Próba albo Wędka. Każdą drogę da się edytować i usunąć. Podsumowanie sesji pokazuje liczbę dróg, najtrudniejszą i rozkład stylów.",
      },
      {
        nazwa: "Stopień ukończenia i blok",
        opis: "Droga może być ukończona częściowo (1/4, 1/2, 3/4) albo oznaczona jako zrobiona z przerwami („blok”). Do progresji i „najtrudniejszej” liczą się tylko drogi ukończone w całości i bez bloku, a do liczników objętości i kompetencji wszystkie próby.",
      },
    ],
  },
  {
    id: "logbook",
    tytul: "Logbook",
    wstep: "Historia i wykresy Twojej wspinaczki.",
    punkty: [
      {
        nazwa: "Progresja w czasie",
        opis: "Wykres najtrudniejszej drogi w każdej sesji, z osobną linią dla OS, RP, Projektu i Wędki (legenda pod wykresem).",
      },
      {
        nazwa: "Aktywność",
        opis: "Przełącznik Wspinaczka sportowa / Bouldering: pierwszy widok pokazuje liczbę dróg w sesji, drugi obciążenie sesji (czas × RPE). Sesje 50:50 liczą się w obu.",
      },
      {
        nazwa: "Statystyki",
        opis: "Te same sześć liczników co na Home.",
      },
      {
        nazwa: "Historia sesji",
        opis: "Lista sesji z typem, czasem, kalorie, tętnem, RPE, liczbą dróg i najtrudniejszą drogą. Strzałka rozwija drogi, „Zobacz szczegóły” otwiera sesję.",
      },
      {
        nazwa: "Progresja na skali Kurtyki",
        opis: "Dla każdego poziomu trudności liczba przejść na wędkę i „z dołem” (OS + RP + Projekt).",
      },
    ],
  },
  {
    id: "planner-sesje",
    tytul: "Planner → Sesje",
    wstep: "Planner ma sześć zakładek: Sesje, Harmonogram tygodniowy, Realizacja, Cele, Projekty i Zestawy.",
    punkty: [
      {
        nazwa: "Planowanie sesji",
        opis: "Zaplanuj przyszłą sesję: data, miejsce, czas i notatka. Listę nadchodzących sesji możesz oglądać w widoku dnia, tygodnia albo miesiąca.",
      },
    ],
  },
  {
    id: "planner-harmonogram",
    tytul: "Planner → Harmonogram tygodniowy",
    wstep: "Twój plan treningowy na tydzień, osobny dla każdego tygodnia.",
    punkty: [
      {
        nazwa: "Tygodnie",
        opis: "Każdy tydzień ma własny plan. Wybierasz go z listy (np. T43) albo strzałkami. Zmiana w jednym tygodniu nie rusza pozostałych, także tych minionych, więc historia Realizacji się nie przepisuje.",
      },
      {
        nazwa: "Nowy tydzień",
        opis: "Jeśli zapisałeś szablon, nowy tydzień powstaje z szablonu. Bez szablonu jest kopią poprzedniego tygodnia. Tygodnie utworzone wcześniej same się nie zmieniają.",
      },
      {
        nazwa: "Szablon",
        opis: "„Zapisz szablon” otwiera panel z dniami tygodnia. Zaznaczasz dni z oglądanego tygodnia, które mają trafić do szablonu albo nadpisać w nim swoją wersję, a pozostałe dni szablonu zostają bez zmian. Pomarańczowa kropka oznacza dzień różniący się od szablonu. „Zastosuj szablon” zastępuje plan bieżącego lub przyszłego tygodnia szablonem (o ile nie ma w nim odhaczonych aktywności).",
      },
      {
        nazwa: "Dodawanie bloków",
        opis: "Przeciągnij myszką po siatce, żeby zaznaczyć dzień i godziny. Otworzy się formularz: nazwa, kategoria (kolor), zestaw ćwiczeń, notatka, kompetencje oraz opcja „Nie uwzględniaj w Realizacji” (np. dla odpoczynku).",
      },
      {
        nazwa: "Edycja bloków",
        opis: "Blok przeniesiesz, chwytając środek, a rozciągniesz, chwytając górną lub dolną krawędź. Ołówek na bloku otwiera edycję, krzyżyk go usuwa. Ikonki na bloku oznaczają zestaw ćwiczeń i notatkę.",
      },
      {
        nazwa: "Kategorie",
        opis: "Na górze strony zarządzasz kategoriami i ich kolorami.",
      },
    ],
  },
  {
    id: "planner-realizacja",
    tytul: "Planner → Realizacja",
    wstep: "Sprawdzanie, co z planu faktycznie zrobiłeś.",
    punkty: [
      {
        nazwa: "Tabela",
        opis: "Wiersze to bloki z Twojego planu, kolumny to tygodnie (bieżący, nadchodzące z już utworzonym planem oraz wcześniejsze po kliknięciu „Pokaż historię”). Klikasz pole, żeby odhaczyć wykonanie.",
      },
      {
        nazwa: "Stany pól",
        opis: "Zielony ptaszek to wykonane. Czerwony krzyżyk pojawia się, gdy od dnia bloku minęło ponad 7 dni, a nie został odhaczony (nadal możesz go kliknąć). Kreska oznacza, że bloku nie było w planie tego tygodnia.",
      },
      {
        nazwa: "Postęp zestawów ćwiczeń",
        opis: "Pod tabelą wybierasz zestaw i widzisz wykres wyników każdego jego ćwiczenia w czasie, z przełącznikiem parametrów. Wpisy dodajesz w zakładce Zestawy.",
      },
    ],
  },
  {
    id: "planner-cele",
    tytul: "Planner → Cele",
    wstep: "Cele od głównego po dzienne.",
    punkty: [
      {
        nazwa: "Cel główny",
        opis: "Ten sam, który widzisz na Home: konkretna trudność albo opis własnymi słowami.",
      },
      {
        nazwa: "Cele długo-, średnio- i krótkoterminowe",
        opis: "Długoterminowe to lista (np. rok, sezon). Średnio- i krótkoterminowe układasz w czterech kolumnach: Fizyczne, Techniczne, Mentalne i Inne. Każdy cel może mieć termin (po terminie robi się czerwony). Ołówek edytuje, krzyżyk usuwa.",
      },
      {
        nazwa: "Zrealizowane cele",
        opis: "Odhaczony cel trafia na listę zrealizowanych z datą zamknięcia i pucharem.",
      },
      {
        nazwa: "Aktywność jednodniowa",
        opis: "Coś poza harmonogramem (np. obejrzeć filmik albo poczytać artykuł). Wybierasz nazwę i dzień, a w tym dniu zobaczysz ją na Home w Dzisiejszych aktywnościach i odhaczysz.",
      },
    ],
  },
  {
    id: "planner-projekty",
    tytul: "Planner → Projekty",
    punkty: [
      {
        nazwa: "Projekty",
        opis: "Drogi, nad którymi aktualnie pracujesz: nazwa, trudność i liczba wpinek. Przy dodawaniu dróg do sesji możesz wybrać projekt z listy podpowiedzi, żeby nie wpisywać go od nowa. Zrobiony projekt możesz zamknąć, wtedy trafia na listę ukończonych.",
      },
    ],
  },
  {
    id: "planner-zestawy",
    tytul: "Planner → Zestawy",
    wstep: "Własna biblioteka zestawów ćwiczeń ze śledzeniem postępu.",
    punkty: [
      {
        nazwa: "Zestaw",
        opis: "Ma nazwę, opis i linki (YouTube, artykuły). Zestaw możesz edytować ołówkiem albo usunąć koszem (razem z ćwiczeniami i historią).",
      },
      {
        nazwa: "Ćwiczenie i „co śledzić”",
        opis: "Do zestawu dodajesz ćwiczenia i dla każdego zaznaczasz pola do śledzenia: serie, powtórzenia, czas (s), dodatkowy ciężar (kg), krawędź (mm), notatka. Ćwiczenie może mieć własne linki.",
      },
      {
        nazwa: "Wpisy wykonania",
        opis: "„+ Zapisz wykonanie” otwiera formularz z wartościami z ostatniego razu, które tylko korygujesz. „Historia wpisów” pokazuje kolejne wykonania: kliknij wpis, żeby go zaznaczyć, a potem kosz, żeby usunąć.",
      },
      {
        nazwa: "Zestaw w planie",
        opis: "W Harmonogramie możesz przypisać zestaw do bloku. Na Home taki blok ma przycisk prowadzący do zestawu, a postęp ćwiczeń zobaczysz na wykresach w Planner → Realizacja.",
      },
    ],
  },
  {
    id: "dna",
    tytul: "DNA",
    wstep: "Twój profil wspinaczkowy, oparty na realnych danych.",
    punkty: [
      {
        nazwa: "Trendy",
        opis: "Progresja w czasie, wykres radarowy kompetencji (widok Ogólny: 3 filary, Szczegółowy: 13 kompetencji), paski kompetencji oraz wykres składu ciała z pomiarów z Profilu (przełącznik parametrów).",
      },
      {
        nazwa: "Analiza luk",
        opis: "Podpowiedzi „Jak się rozwijać” na podstawie Twoich przejść.",
      },
      {
        nazwa: "Historia",
        opis: "Liczba przejść na każdym poziomie trudności (wędka i z dołem).",
      },
      {
        nazwa: "Test poziomu",
        opis: "Szacuje Twój poziom z pięciu obszarów: wyniki na drogach (35%), siła palców (20%), ciągnięcie (15%), wytrzymałość (15%) i technika (15%). Wynik końcowy nie może przekroczyć wyniku na drogach o więcej niż 2 stopnie, żeby sama siła nie zawyżała oceny. Test wskazuje też, co Cię najbardziej ogranicza, a wyniki zapisują się w historii. Progi referencyjne są szacunkowe i mogą wymagać kalibracji na Twoich danych.",
      },
    ],
  },
  {
    id: "kompetencje",
    tytul: "Kompetencje i punkty",
    punkty: [
      {
        nazwa: "13 kompetencji w 3 filarach",
        opis: "Mentalne: taktyka, koncentracja, kontrola emocji, pewność siebie, czytanie drogi. Techniczne: taktyka wspinaczkowa, dynamika, praca nóg, technika ruchu. Fizyczne: siła, moc, wytrzymałość, mobilność.",
      },
      {
        nazwa: "Skąd biorą się punkty",
        opis: "Z trzech źródeł: dróg (zależnie od stylu przejścia), odhaczonych bloków z Harmonogramu, które mają przypisane kompetencje, oraz odhaczonych celów sesji. Wynik widzisz w DNA → Trendy.",
      },
    ],
  },
  {
    id: "profil",
    tytul: "Profil",
    punkty: [
      {
        nazwa: "Logowanie hasłem",
        opis: "Możesz ustawić hasło do konta, żeby logować się nim zamiast linkiem z maila.",
      },
      {
        nazwa: "Dane profilu",
        opis: "Wiek i wzrost wpisujesz raz, edytujesz ołówkiem.",
      },
      {
        nazwa: "Pomiary z wagi",
        opis: "Każde ważenie to osobny wpis z datą: waga, BMI, tkanka tłuszczowa, masa mięśniowa, procent mięśni, woda, białko, minerały kości, masa mięśni szkieletowych, tłuszcz trzewny, BMR, waga bez tkanki tłuszczowej oraz impedancja 50 i 250 kHz. Wypełniasz tylko to, co pokazuje Twoja waga. Wpisy da się edytować i usuwać, a zmiany w czasie zobaczysz w DNA → Trendy.",
      },
    ],
  },
   {
    id: "ustawienia",
    tytul: "Ustawienia",
    wstep: "Preferencje działania aplikacji (menu → Ustawienia).",
    punkty: [
      {
        nazwa: "Planner",
        opis: "Wybierasz zakładkę, którą Planner otwiera domyślnie, oraz domyślny widok listy zaplanowanych sesji (dzień, tydzień, miesiąc). Linki z innych stron nadal otwierają wskazaną zakładkę.",
      },
      {
        nazwa: "Realizacja",
        opis: "Liczba dni od dnia bloku, po których niewykonana aktywność dostaje czerwony krzyżyk (domyślnie 7, zakres 1–60).",
      },
    ],
  },
  {
    id: "wskazowki",
    tytul: "Wskazówki",
    punkty: [
      {
        nazwa: "Ikony",
        opis: "Ołówek edytuje, kosz albo krzyżyk usuwa, a „+” dodaje. Strzałka obok pozycji rozwija szczegóły.",
      },
      {
        nazwa: "Dane",
        opis: "Wszystko zapisuje się w chmurze, więc po zalogowaniu masz te same dane na każdym urządzeniu.",
      },
      {
        nazwa: "Instalacja",
        opis: "ClimbOS możesz zainstalować jak zwykłą aplikację (menu przeglądarki → Zainstaluj aplikację albo Dodaj do ekranu głównego). Działa online, bez trybu offline.",
      },
      {
        nazwa: "Bezpośrednie linki",
        opis: "Adres /planner?tab=cele otwiera od razu wybraną zakładkę Plannera (harmonogram, realizacja, cele, projekty, zestawy).",
      },
  
    ],
  },
];

export default function Pomoc() {
  return (
    <main className="p-10 font-sans">
      <h1 className="text-3xl font-bold">Pomoc</h1>
      <p className="text-gray-500">Jak działa ClimbOS</p>

      <Card className="p-5 mt-5">
        <div className="font-bold text-lg">Szybki start</div>
        <ol className="mt-3 flex flex-col gap-2 list-decimal pl-5 text-sm text-gray-700">
          {SZYBKI_START.map((krok) => (
            <li key={krok}>{krok}</li>
          ))}
        </ol>
      </Card>

      <div className="flex flex-col gap-3 mt-5">
        {SEKCJE.map((sekcja) => (
          <Card key={sekcja.id} className="p-0 gap-0">
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer list-none p-4 font-bold [&::-webkit-details-marker]:hidden">
                {sekcja.tytul}
                <ChevronDown
                  size={18}
                  className="text-gray-400 transition-transform group-open:rotate-180"
                />
              </summary>
              <div className="px-4 pb-4 flex flex-col gap-3">
                {sekcja.wstep && <p className="text-sm text-gray-500">{sekcja.wstep}</p>}
                {sekcja.punkty.map((punkt) => (
                  <div key={punkt.nazwa}>
                    <div className="text-sm font-medium">{punkt.nazwa}</div>
                    <p className="text-sm text-gray-600 mt-0.5">{punkt.opis}</p>
                  </div>
                ))}
              </div>
            </details>
          </Card>
        ))}
      </div>
    </main>
  );
}