"use client";

export type TypSesji = "sportowa" | "bouldering" | "mix";

type Props = {
  wartosc: TypSesji;
  zmienTypAction: (typ: TypSesji) => void;
  mieszana?: boolean;
};

const OPCJE: { typ: TypSesji; etykieta: string }[] = [
  { typ: "sportowa", etykieta: "Wspinaczka sportowa" },
  { typ: "bouldering", etykieta: "Bouldering" },
  { typ: "mix", etykieta: "50:50" },
];

export default function WyborTypuSesji({ wartosc, zmienTypAction, mieszana = false }: Props) {
  const opcje = mieszana ? OPCJE : OPCJE.filter((o) => o.typ !== "mix");

  return (
    <div className="inline-flex rounded-full bg-gray-100 p-1 gap-1">
      {opcje.map((opcja) => (
        <button
          key={opcja.typ}
          type="button"
          onClick={() => zmienTypAction(opcja.typ)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            wartosc === opcja.typ
              ? "bg-white shadow-sm text-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {opcja.etykieta}
        </button>
      ))}
    </div>
  );
}