"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  CalculatorIcon,
  BuildingOffice2Icon,
  WrenchScrewdriverIcon,
  ListBulletIcon,
  DocumentDuplicateIcon,
  DevicePhoneMobileIcon,
  CubeIcon,
  ShieldExclamationIcon,
  PlusCircleIcon,
  ArrowLeftOnRectangleIcon,
  ChevronDownIcon
} from "@heroicons/react/24/outline";
import { pobierzSesje, wyczyscSesje } from "../lib/auth";
import { zapytanieApi } from "../lib/api";

const MENU_GLOWNE = [
  { href: "/panel-glowny", etykieta: "Panel główny", ikona: HomeIcon },
  { href: "/protokoly", etykieta: "Protokoły", ikona: ClipboardDocumentListIcon },
  { href: "/odczyty-licznikow", etykieta: "Odczyty liczników", ikona: CalculatorIcon },
  { href: "/kontrahenci", etykieta: "Kontrahenci", ikona: BuildingOffice2Icon },
  { href: "/szablony-przegladow", etykieta: "Szablony przeglądów", ikona: DocumentDuplicateIcon },
  { href: "/aplikacja", etykieta: "Aplikacja", ikona: DevicePhoneMobileIcon }
];

const MENU_ELEMENTY = [
  { href: "/kategorie-usterek", etykieta: "Kategorie usterek", ikona: WrenchScrewdriverIcon },
  { href: "/czynnosci-serwisowe", etykieta: "Czynności serwisowe", ikona: ListBulletIcon },
  { href: "/definicja-czesci", etykieta: "Definicja części", ikona: CubeIcon }
];

const MENU_PPOZ = [
  { href: "/ppoz/nowy-przeglad", etykieta: "Nowy przegląd", ikona: PlusCircleIcon },
  { href: "/ppoz/przeglady", etykieta: "Lista przeglądów", ikona: ShieldExclamationIcon }
];
const KLUCZ_LICZNIKA_PPOZ = "eltreko_liczba_aktywnych_ppoz";
const KLUCZ_LICZNIKA_PPOZ_TS = "eltreko_liczba_aktywnych_ppoz_ts";

function Pozycja({ href, etykieta, ikona: Ikona, aktywny, badge = null }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={`group relative flex items-center gap-3 rounded-[1.15rem] px-3.5 py-3 text-[15px] transition ${
        aktywny
          ? "bg-[linear-gradient(90deg,rgba(82,211,126,0.24),rgba(82,211,126,0.07))] text-[#e7fff0] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_22px_rgba(34,197,94,0.10)]"
          : "text-slate-300 hover:bg-white/[0.045] hover:text-slate-100"
      }`}
    >
      <span
        className={`absolute left-0 top-1/2 h-9 w-[3px] -translate-y-1/2 rounded-full transition ${
          aktywny ? "bg-[#7df0a4]" : "bg-transparent group-hover:bg-white/8"
        }`}
      />
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
          aktywny
            ? "border-emerald-300/30 bg-emerald-500/18 text-[#e7fff0] shadow-[0_0_0_1px_rgba(110,231,183,0.05)]"
            : "border-white/0 bg-white/[0.03] text-slate-300 group-hover:border-white/8 group-hover:bg-white/[0.055]"
        }`}
      >
        <Ikona className="h-5 w-5" />
      </span>
      <span className="leading-none">{etykieta}</span>
      {badge ? (
        <span className="ml-auto rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

function PozycjaRozwijana({ etykieta, ikona: Ikona, aktywny, otwarta, onClick, children }) {
  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={onClick}
        className={`group relative flex w-full items-center gap-3 rounded-[1.15rem] px-3.5 py-3 text-left text-[15px] transition ${
          aktywny
            ? "bg-[linear-gradient(90deg,rgba(82,211,126,0.16),rgba(82,211,126,0.05))] text-[#e7fff0] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_22px_rgba(34,197,94,0.08)]"
            : "text-slate-300 hover:bg-white/[0.045] hover:text-slate-100"
        }`}
      >
        <span
          className={`absolute left-0 top-1/2 h-9 w-[3px] -translate-y-1/2 rounded-full transition ${
            aktywny ? "bg-[#7df0a4]" : "bg-transparent group-hover:bg-white/8"
          }`}
        />
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
            aktywny
              ? "border-emerald-300/30 bg-emerald-500/14 text-[#e7fff0]"
              : "border-white/0 bg-white/[0.03] text-slate-300 group-hover:border-white/8 group-hover:bg-white/[0.055]"
          }`}
        >
          <Ikona className="h-5 w-5" />
        </span>
        <span className="leading-none">{etykieta}</span>
        <ChevronDownIcon
          className={`ml-auto h-4 w-4 transition duration-200 ${otwarta ? "rotate-180 text-slate-200" : "text-slate-500 group-hover:text-slate-300"}`}
        />
      </button>

      {otwarta ? <div className="ml-4 space-y-1.5 border-l border-white/6 pl-3">{children}</div> : null}
    </div>
  );
}

export default function Sidebar({ className = "", onNavigate = null, pokazNaglowek = true, pokazStopke = true }) {
  const pathname = usePathname();
  const router = useRouter();
  const sesja = pobierzSesje();
  const emailUzytkownika = sesja?.uzytkownik?.email || "";
  const czyAdminGlowny = emailUzytkownika === "dominik@eltreko.pl";
  const menuGlowne = czyAdminGlowny
    ? MENU_GLOWNE
    : MENU_GLOWNE.filter((item) => item.href !== "/kontrahenci");
  const menuGlownePrzedElementami = menuGlowne.filter((item) => !["/szablony-przegladow", "/aplikacja"].includes(item.href));
  const menuGlownePoElementach = menuGlowne.filter((item) => ["/szablony-przegladow", "/aplikacja"].includes(item.href));
  const nazwaUzytkownika =
    emailUzytkownika === "dominik@eltreko.pl"
      ? "Dominik Administrator"
      : emailUzytkownika === "serwis@eltreko.pl"
        ? "Michał Serwis"
        : sesja?.uzytkownik?.imieNazwisko || "Użytkownik";
  const rolaUzytkownika =
    sesja?.uzytkownik?.rola === "Administrator"
      ? "Główny administrator"
      : sesja?.uzytkownik?.rola === "Technik"
        ? "Konserwator"
        : sesja?.uzytkownik?.rola || "Użytkownik";
  const [liczbaAktywnychPpoz, setLiczbaAktywnychPpoz] = useState(() => {
    if (typeof window === "undefined") return 0;
    const zapisana = window.sessionStorage.getItem(KLUCZ_LICZNIKA_PPOZ);
    return zapisana ? Number(zapisana) || 0 : 0;
  });
  const [elementyOtwarte, setElementyOtwarte] = useState(() =>
    MENU_ELEMENTY.some((item) => item.href === pathname)
  );

  useEffect(() => {
    if (MENU_ELEMENTY.some((item) => item.href === pathname)) {
      setElementyOtwarte(true);
    }
  }, [pathname]);

  useEffect(() => {
    const czyWartoOdswiezyc =
      pathname?.startsWith("/ppoz") ||
      pathname === "/panel-glowny" ||
      pathname === "/protokoly";

    if (!czyWartoOdswiezyc) return;

    const teraz = Date.now();
    const ostatniaAktualizacja = typeof window !== "undefined"
      ? Number(window.sessionStorage.getItem(KLUCZ_LICZNIKA_PPOZ_TS) || 0)
      : 0;
    const limitWaznosci = pathname?.startsWith("/ppoz") ? 10000 : 60000;

    if (ostatniaAktualizacja && teraz - ostatniaAktualizacja < limitWaznosci) {
      return;
    }

    zapytanieApi("/ppoz")
      .then((lista) => {
        const aktywne = Array.isArray(lista) ? lista.filter((wpis) => wpis.status !== "Zakończony").length : 0;
        setLiczbaAktywnychPpoz(aktywne);
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(KLUCZ_LICZNIKA_PPOZ, String(aktywne));
          window.sessionStorage.setItem(KLUCZ_LICZNIKA_PPOZ_TS, String(Date.now()));
        }
      })
      .catch(() => {});
  }, [pathname]);

  function wyloguj() {
    wyczyscSesje();
    router.push("/logowanie");
  }

  return (
    <aside className={`karta-szklana w-full rounded-2xl p-4 md:w-80 md:p-5 ${className}`}>
      {pokazNaglowek ? (
      <div className="mb-6">
        <div className="mb-5 px-2 pt-1">
          <div className="flex justify-center">
            <Image
              src="/logo.png"
              alt="Eltreko logo"
              width={713}
              height={189}
              className="h-auto w-56 object-contain opacity-88 saturate-[1.03]"
            />
          </div>
          <div className="mx-auto mt-4 h-px w-44 bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent" />
        </div>
        <div className="px-3 text-center">
          <h1 className="mt-1 text-[1.7rem] font-semibold leading-none tracking-tight text-slate-50">Panel serwisowy</h1>
        </div>
        <div className="mt-3 text-center">
          <p className="text-sm font-medium text-slate-200">{nazwaUzytkownika}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-slate-500">{rolaUzytkownika}</p>
        </div>
      </div>
      ) : null}

      <div className="rounded-[1.75rem] bg-[linear-gradient(180deg,rgba(215,169,92,0.1),rgba(255,255,255,0.03))] p-[1px] shadow-[0_14px_30px_rgba(9,18,28,0.1)]">
        <nav className="space-y-1.5 rounded-[1.7rem] bg-[linear-gradient(180deg,rgba(44,58,72,0.96),rgba(34,48,61,0.94))] p-3">
          {menuGlownePrzedElementami.map((item) => (
            <div key={item.href} onClick={onNavigate ? () => onNavigate() : undefined}>
              <Pozycja {...item} aktywny={pathname === item.href} />
            </div>
          ))}

          <PozycjaRozwijana
            etykieta="Elementy"
            ikona={CubeIcon}
            aktywny={MENU_ELEMENTY.some((item) => item.href === pathname)}
            otwarta={elementyOtwarte}
            onClick={() => setElementyOtwarte((prev) => !prev)}
          >
            {MENU_ELEMENTY.map((item) => (
              <div key={item.href} onClick={onNavigate ? () => onNavigate() : undefined}>
                <Pozycja {...item} aktywny={pathname === item.href} />
              </div>
            ))}
          </PozycjaRozwijana>

          {menuGlownePoElementach.map((item) => (
            <div key={item.href} onClick={onNavigate ? () => onNavigate() : undefined}>
              <Pozycja {...item} aktywny={pathname === item.href} />
            </div>
          ))}
        </nav>
      </div>

      <div className="mx-auto my-4 flex w-full justify-center px-4">
        <div className="h-px w-40 bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
      </div>

      <div className="my-5 rounded-[1.75rem] bg-[linear-gradient(180deg,rgba(215,169,92,0.085),rgba(255,255,255,0.025))] p-[1px] shadow-[0_14px_28px_rgba(9,18,28,0.09)]">
        <div className="rounded-[1.7rem] bg-[linear-gradient(180deg,rgba(44,58,72,0.95),rgba(34,48,61,0.93))] p-3">
          <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400">PPOŻ</p>
          <nav className="space-y-1.5">
            {MENU_PPOZ.map((item) => (
              <div key={item.href} onClick={onNavigate ? () => onNavigate() : undefined}>
                <Pozycja
                  {...item}
                  aktywny={pathname === item.href}
                  badge={item.href === "/ppoz/przeglady" && liczbaAktywnychPpoz > 0 ? liczbaAktywnychPpoz : null}
                />
              </div>
            ))}
          </nav>
        </div>
      </div>

      {pokazStopke ? (
      <button
        type="button"
        onClick={wyloguj}
        className="mx-auto mt-3 flex w-fit min-w-[156px] items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-2.5 text-sm text-slate-200 transition duration-200 hover:border-white/8 hover:bg-[rgba(179,58,58,0.10)] hover:shadow-[0_10px_24px_rgba(179,58,58,0.08)] hover:translate-y-[1px]"
      >
        <ArrowLeftOnRectangleIcon className="h-5 w-5" />
        Wyloguj
      </button>
      ) : null}

      {pokazStopke ? <p className="mt-4 text-center text-[10px] text-slate-500/85">© Eltreko. Wszelkie prawa zastrzeżone.</p> : null}
    </aside>
  );
}

