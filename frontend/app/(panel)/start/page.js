"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ClipboardDocumentListIcon,
  CalculatorIcon,
  ArrowRightIcon
} from "@heroicons/react/24/outline";

const KAFLE = [
  {
    href: "/protokoly",
    etykieta: "Protokoły",
    ikona: ClipboardDocumentListIcon
  },
  {
    href: "/odczyty-licznikow",
    etykieta: "Odczyty liczników",
    ikona: CalculatorIcon
  },
  {
    href: "/panel-glowny",
    etykieta: "Zgłoszenia",
    ikona: ClipboardDocumentListIcon
  }
];

export default function StartPage() {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] bg-[linear-gradient(145deg,rgba(34,47,59,0.98),rgba(27,39,49,0.95))] px-5 py-6 shadow-[0_26px_70px_rgba(6,13,19,0.18)] sm:px-7 sm:py-7">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,0.92fr)_minmax(360px,1fr)] xl:items-center">
          <div className="space-y-6 anim-panel">
            <div>
              <p className="max-w-xl text-base leading-7 text-slate-300/88 sm:text-lg">
                Szybki dostęp do protokołów, odczytów liczników i dokumentów technicznych.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {KAFLE.map(({ href, etykieta, ikona: Ikona }) => (
                <Link
                  key={href}
                  href={href}
                  className="group rounded-[1.55rem] bg-white/[0.035] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:bg-white/[0.055]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-[1.1rem] bg-emerald-500/12 text-emerald-200">
                    <Ikona className="h-5 w-5" />
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-base font-semibold text-slate-100">{etykieta}</p>
                    <ArrowRightIcon className="h-4 w-4 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-emerald-200" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="anim-panel">
            <div className="overflow-hidden rounded-[2rem] bg-white/[0.025]">
              <Image
                src="/panel-start.png"
                alt="Panel startowy Eltreko"
                width={1152}
                height={768}
                className="h-auto w-full object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
