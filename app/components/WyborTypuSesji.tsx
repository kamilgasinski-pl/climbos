"use client";

export type TypSesji = "sportowa" | "bouldering";

type Props = {
  wartosc: TypSesji;
  zmienTypAction: (typ: TypSesji) => void;
};

export default function WyborTypuSesji({ wartosc, zmienTypAction }: Props) {
  return (
    <div className="inline-flex rounded-full bg-gray-100 p-1 gap-1">
      <button
        type="button"
        onClick={() => zmienTypAction("sportowa")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
          wartosc === "sportowa"
            ? "bg-white shadow-sm text-gray-900"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        Wspinaczka sportowa
      </button>
      <button
        type="button"
        onClick={() => zmienTypAction("bouldering")}
        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
          wartosc === "bouldering"
            ? "bg-white shadow-sm text-gray-900"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        Bouldering
      </button>
    </div>
  );
}