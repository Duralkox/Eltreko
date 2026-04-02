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

  return (
    <main className="min-h-screen p-3 md:p-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 md:flex-row md:gap-6">
        <Sidebar />
        <section className="karta-szklana flex-1 rounded-2xl p-4 md:p-6">{children}</section>
      </div>
    </main>
  );
}

