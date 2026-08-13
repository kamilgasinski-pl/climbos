"use client";
import AuthProvider from "./authprovider";
import { Mountain, Home, BookOpen, Calendar, Dna, CalendarDays, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import WylogujButton from "./components/WylogujButton";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const linki = [
  { href: "/", label: "Home", ikona: Home },
  { href: "/logbook", label: "Logbook", ikona: BookOpen },
  { href: "/sesje", label: "Sesje", ikona: Calendar },
  { href: "/dna", label: "DNA", ikona: Dna },
  { href: "/planner", label: "Planner", ikona: CalendarDays },
  { href: "/profil", label: "Profil", ikona: User },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const aktywnaSciezka = usePathname();

  return (
    <html lang="pl" className={cn("font-sans", geist.variable)}>
      <body className="m-0 flex min-h-screen">
        <nav className="w-[220px] bg-gray-900 text-white p-6 flex flex-col gap-2">
         <div className="font-bold text-xl mb-6 flex items-center gap-2">
  <Mountain size={22} />
  ClimbOS
</div>
{linki.map((link) => {
  const czyAktywny = aktywnaSciezka === link.href;
  const Ikona = link.ikona;
  return (
    <Link
      key={link.href}
      href={link.href}
      className={`px-3 py-2.5 rounded-md no-underline transition-colors flex items-center gap-3 ${
        czyAktywny
          ? "bg-blue-600 font-bold"
          : "text-white hover:bg-gray-800"
      }`}
    >
      <Ikona size={18} />
      {link.label}
    </Link>
  );
})}
<WylogujButton />
      </nav>

        <div style={{ flex: 1, background: "#f5f5f5" }}>
  <AuthProvider>{children}</AuthProvider>
</div>
      </body>
    </html>
  );
}