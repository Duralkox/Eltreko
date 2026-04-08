"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import Sidebar from "./Sidebar";
import { pobierzSesje } from "../lib/auth";

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
      router.push("/panel-glowny");
      return;
    }
    setGotowe(true);
  }, [router, pathname]);

  useEffect(() => {
    setMenuOtwarte(false);
  }, [pathname]);

  if (!gotowe) return null;

  return (
    <main className="min-h-screen overflow-x-hidden p-2 sm:p-3 md:p-6">
      <div className="mx-auto mb-3 flex w-full items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5 shadow-[0_10px_28px_rgba(0,0,0,0.12)] md:hidden">
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
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-100"
          aria-label={menuOtwarte ? "Zamknij menu" : "Otwórz menu"}
        >
          {menuOtwarte ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
        </button>
      </div>

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
              pokazStopke={false}
            />
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 md:flex-row md:gap-6">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <section className="karta-szklana min-w-0 flex-1 overflow-hidden rounded-2xl p-3 sm:p-4 md:p-6">
          {children}
        </section>
      </div>
    </main>
  );
}
