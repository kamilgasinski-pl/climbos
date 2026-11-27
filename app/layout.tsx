"use client";
import AuthProvider from "./authprovider";
import { Mountain } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import WylogujButton from "./components/WylogujButton";
import NawigacjaMobilna from "./components/NawigacjaMobilna";
import { linki, czyAktywna } from "./components/pozycjeMenu";




const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const aktywnaSciezka = usePathname();

  return (
    <html lang="pl" className={cn("font-sans", geist.variable)}>
      <body className="m-0 flex min-h-screen">
        <nav className="hidden md:flex w-[220px] shrink-0 bg-gray-900 text-white p-6 flex-col gap-2">
         <div className="font-bold text-xl mb-6 flex items-center gap-2">
  <Mountain size={22} />
  ClimbOS
</div>
{linki.map((link) => {
  const czyAktywny = czyAktywna(aktywnaSciezka, link.href);
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

        <div className="flex-1 min-w-0 bg-[#f5f5f5] pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
          <AuthProvider>{children}</AuthProvider>
        </div>
        <NawigacjaMobilna />
      </body>
    </html>
  );
}