export default function SekcjaNaglowek({ tytul, opis, prawaStrona }) {
  return (
    <header className="mb-6 flex flex-col gap-3 border-b border-white/10 pb-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-2xl font-semibold">{tytul}</h2>
        {opis ? <p className="mt-1 text-sm text-slate-400">{opis}</p> : null}
      </div>
      {prawaStrona ? <div className="flex flex-wrap gap-2">{prawaStrona}</div> : null}
    </header>
  );
}

