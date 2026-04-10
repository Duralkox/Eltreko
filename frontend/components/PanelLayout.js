"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import Sidebar from "./Sidebar";
import { czySesjaWygasla, dotknijSesjeAktywnosc, pobierzSesje, wyczyscSesje } from "../lib/auth";

export default function PanelLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [gotowe, setGotowe] = useState(false);
  const [menuOtwarte, setMenuOtwarte] = useState(false);

  useEffect(() => {
    const sesja = pobierzSesje();
    if (!sesja?.token) {
      router.push("/logowanie");
      return;
    }
    if (pathname === "/") {
      router.push("/start");
      return;
    }
    setGotowe(true);
  }, [router, pathname]);

  useEffect(() => {
    setMenuOtwarte(false);
  }, [pathname]);

  useEffect(() => {
    if (!gotowe || typeof window === "undefined") return undefined;

    const odswiezAktywnosc = () => {
      dotknijSesjeAktywnosc();
    };

    const sprawdzWygasniecie = () => {
      if (!czySesjaWygasla()) return;
      wyczyscSesje();
      setMenuOtwarte(false);
      router.push("/logowanie");
    };

    const zdarzenia = ["pointerdown", "keydown", "touchstart", "focus"];
    zdarzenia.forEach((nazwa) => window.addEventListener(nazwa, odswiezAktywnosc, { passive: true }));
    document.addEventListener("visibilitychange", odswiezAktywnosc);

    const interwal = window.setInterval(sprawdzWygasniecie, 30000);
    odswiezAktywnosc();

    return () => {
      zdarzenia.forEach((nazwa) => window.removeEventListener(nazwa, odswiezAktywnosc));
      document.removeEventListener("visibilitychange", odswiezAktywnosc);
      window.clearInterval(interwal);
    };
  }, [gotowe, router]);

  if (!gotowe) return null;

  return (
    <main className="min-h-screen overflow-x-hidden p-2 sm:p-3 md:p-6">
      <div className="mx-auto mb-2 flex w-full items-center justify-between gap-3 rounded-2xl bg-[linear-gradient(180deg,rgba(40,54,66,0.94),rgba(34,47,59,0.9))] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_24px_rgba(0,0,0,0.16)] md:hidden">
        <Image
          src="/logo.png"
          alt="Eltreko logo"
          width={713}
          height={189}
          className="h-auto w-28 object-contain opacity-90"
        />
        <button
          type="button"
          onClick={() => setMenuOtwarte((prev) => !prev)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
          aria-label={menuOtwarte ? "Zamknij menu" : "Otwórz menu"}
        >
          {menuOtwarte ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
        </button>
      </div>
      <div className="mx-auto mb-2 h-px w-20 bg-gradient-to-r from-transparent via-white/10 to-transparent md:hidden" />

      {menuOtwarte ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            onClick={() => setMenuOtwarte(false)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]"
            aria-label="Zamknij menu"
          />
          <div className="absolute inset-y-0 left-0 w-[88vw] max-w-[360px] overflow-y-auto p-2">
            <Sidebar
              className="min-h-full"
              onNavigate={() => setMenuOtwarte(false)}
              pokazNaglowek={false}
              pokazStopke
            />
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 md:flex-row md:gap-6">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <section className="karta-szklana min-w-0 flex-1 overflow-hidden rounded-2xl p-3 sm:p-4 md:overflow-visible md:p-6">
          {children}
        </section>
      </div>
    </main>
  );
}
