import {
  Home,
  CalendarDays,
  BookOpen,
  Calendar,
  Dna,
  User,
  Settings,
  LifeBuoy,
} from "lucide-react";

export type PozycjaMenu = {
  href: string;
  label: string;
  ikona: typeof Home;
};

/** Wszystkie pozycje menu (menu boczne na komputerze). */
export const linki: PozycjaMenu[] = [
  { href: "/", label: "Home", ikona: Home },
  { href: "/planner", label: "Planner", ikona: CalendarDays },
  { href: "/logbook", label: "Logbook", ikona: BookOpen },
  { href: "/sesje", label: "Sesje", ikona: Calendar },
  { href: "/dna", label: "DNA", ikona: Dna },
  { href: "/profil", label: "Profil", ikona: User },
  { href: "/ustawienia", label: "Ustawienia", ikona: Settings },
  { href: "/pomoc", label: "Pomoc", ikona: LifeBuoy },
];

/** Pozycje w dolnym pasku na telefonie. Reszta jest pod "Więcej". */
export const LINKI_DOLNY_PASEK = ["/", "/planner", "/logbook", "/sesje", "/dna"];

export function czyAktywna(sciezka: string, href: string): boolean {
  if (href === "/") return sciezka === "/";
  return sciezka === href || sciezka.startsWith(`${href}/`);
}
