import SekcjaNaglowek from "../../../components/SekcjaNaglowek";

export default function Ustawienia() {
  return (
    <div className="space-y-6">
      <SekcjaNaglowek tytul="Ustawienia" opis="Konfiguracja aplikacji EltrekoAPP." />
      <section className="karta-szklana rounded-2xl p-4 text-sm text-slate-300">
        <p className="mb-2 font-medium">Instalacja aplikacji na telefonie (PWA)</p>
        <p>
          Otwórz EltrekoAPP w przeglądarce i wybierz opcję "Zainstaluj aplikację". Po instalacji system działa jak
          natywna aplikacja mobilna.
        </p>
      </section>
    </div>
  );
}

