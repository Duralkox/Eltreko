"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import { pobierzSesje } from "../lib/auth";

export default function PanelLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [gotowe, setGotowe] = useState(false);

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

  if (!gotowe) return null;

  const trybMobilny = pathname?.startsWith("/m/");

  return (
    <main className="min-h-screen p-3 md:p-6">
      <div className={`mx-auto flex w-full flex-col gap-4 ${trybMobilny ? "max-w-4xl" : "max-w-7xl md:flex-row md:gap-6"}`}>
        {trybMobilny ? null : <Sidebar />}
        <section className={`karta-szklana flex-1 rounded-2xl p-4 md:p-6 ${trybMobilny ? "min-h-[calc(100vh-1.5rem)]" : ""}`}>
          {trybMobilny ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/8 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200/80">Tryb mobilny</p>
                <p className="mt-1 text-lg font-semibold text-slate-50">Protokoły</p>
              </div>
              <button type="button" onClick={() => router.push("/protokoly")} className="przycisk-wtorny px-3 py-2 text-sm">
                Pełny panel
              </button>
            </div>
          ) : null}
          {children}
        </section>
      </div>
    </main>
  );
}

