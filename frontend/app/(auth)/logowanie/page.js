"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { zapytanieApi } from "../../../lib/api";
import { czyZapamietajMnie, pobierzSesje, zapiszSesje, wyczyscSesje } from "../../../lib/auth";
import { supabase } from "../../../lib/supabase";

function czyPoprawnyEmail(wartosc) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(wartosc || "").trim());
}

function komunikatBleduLogowania(error) {
  const tresc = String(error?.message || "").trim();
  const trescMala = tresc.toLowerCase();

  if (!tresc) return "Wystąpił błąd logowania.";
  if (trescMala.includes("invalid login credentials")) return "Nieprawidłowy email lub hasło.";
  if (trescMala.includes("email not confirmed")) return "Adres email nie został jeszcze potwierdzony.";

  return tresc;
}

export default function StronaLogowania() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [haslo, setHaslo] = useState("");
  const [noweHaslo, setNoweHaslo] = useState("");
  const [powtorzHaslo, setPowtorzHaslo] = useState("");
  const [blad, setBlad] = useState("");
  const [wiadomosc, setWiadomosc] = useState("");
  const [pokazEasterEgg, setPokazEasterEgg] = useState(false);
  const [ladowanie, setLadowanie] = useState(false);
  const [sprawdzanieSesji, setSprawdzanieSesji] = useState(true);
  const [trybResetu, setTrybResetu] = useState(false);
  const [zapamietaj, setZapamietaj] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setZapamietaj(czyZapamietajMnie());
  }, []);

  useEffect(() => {
    let aktywny = true;

    async function sprawdzSesje() {
      if (typeof window === "undefined") return;

      if (window.location.hash.includes("type=recovery")) {
        if (aktywny) {
          setSprawdzanieSesji(false);
        }
        return;
      }

      const lokalnaSesja = pobierzSesje();
      if (lokalnaSesja?.token) {
        router.replace("/start");
        return;
      }

      if (!supabase) {
        if (aktywny) {
          setSprawdzanieSesji(false);
        }
        return;
      }

      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        if (!czyZapamietajMnie()) {
          await wyczyscSesje();
          if (aktywny) {
            setSprawdzanieSesji(false);
          }
          return;
        }
        router.replace("/start");
        return;
      }

      if (aktywny) {
        setSprawdzanieSesji(false);
      }
    }

    sprawdzSesje();

    return () => {
      aktywny = false;
    };
  }, [router]);

  useEffect(() => {
    if (!supabase || typeof window === "undefined") {
      return undefined;
    }

    if (window.location.hash.includes("type=recovery")) {
      setTrybResetu(true);
      setWiadomosc("Ustaw nowe hasło do konta.");
    }

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setTrybResetu(true);
        setBlad("");
        setWiadomosc("Ustaw nowe hasło do konta.");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function obsluzLogowanie() {
    setBlad("");
    setWiadomosc("");
    setLadowanie(true);

    try {
      const adresEmail = String(email || "").trim();

      if (!supabase) {
        throw new Error("Supabase Auth nie jest skonfigurowany.");
      }

      if (!adresEmail) {
        throw new Error("Wpisz adres email.");
      }

      if (!czyPoprawnyEmail(adresEmail)) {
        throw new Error("Podany adres email jest niepoprawny.");
      }

      if (!String(haslo || "").trim()) {
        throw new Error("Wpisz hasło.");
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: adresEmail,
        password: haslo
      });

      if (error) {
        throw new Error(komunikatBleduLogowania(error));
      }

      const accessToken = data?.session?.access_token;
      if (!accessToken) {
        throw new Error("Brak tokenu sesji z Supabase.");
      }

      const sesjaApi = await zapytanieApi("/auth/sesja", {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      zapiszSesje(
        {
          token: accessToken,
          uzytkownik: sesjaApi.uzytkownik
        },
        { zapamietaj }
      );

      router.push("/start");
    } catch (error) {
      setBlad(error.message);
    } finally {
      setLadowanie(false);
    }
  }

  async function resetujHaslo() {
    setBlad("");
    setWiadomosc("");

    try {
      const adresEmail = String(email || "").trim();

      if (!supabase) {
        throw new Error("Supabase Auth nie jest skonfigurowany.");
      }

      if (!adresEmail) {
        throw new Error("Podaj adres email do resetu hasła.");
      }

      if (!czyPoprawnyEmail(adresEmail)) {
        throw new Error("Podany adres email jest niepoprawny.");
      }

      const { error } = await supabase.auth.resetPasswordForEmail(adresEmail, {
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}/logowanie` : undefined
      });

      if (error) {
        throw new Error(error.message || "Nie udało się wysłać linku resetu hasła.");
      }

      setWiadomosc("Jeśli konto istnieje w Supabase Auth, link resetu hasła został wysłany.");
    } catch (error) {
      setBlad(error.message);
    }
  }

  async function zapiszNoweHaslo() {
    setBlad("");
    setWiadomosc("");
    setLadowanie(true);

    try {
      if (!supabase) {
        throw new Error("Supabase Auth nie jest skonfigurowany.");
      }

      if (!noweHaslo.trim()) {
        throw new Error("Wpisz nowe hasło.");
      }

      if (noweHaslo.length < 8) {
        throw new Error("Nowe hasło musi mieć co najmniej 8 znaków.");
      }

      if (noweHaslo !== powtorzHaslo) {
        throw new Error("Hasła nie są takie same.");
      }

      const { error } = await supabase.auth.updateUser({
        password: noweHaslo
      });

      if (error) {
        throw new Error(error.message || "Nie udało się zapisać nowego hasła.");
      }

      await supabase.auth.signOut();
      setTrybResetu(false);
      setNoweHaslo("");
      setPowtorzHaslo("");
      setHaslo("");
      setWiadomosc("Hasło zostało zmienione. Możesz zalogować się nowym hasłem.");

      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", "/logowanie");
      }
    } catch (error) {
      setBlad(error.message);
    } finally {
      setLadowanie(false);
    }
  }

  const klasyInputa =
    "pole h-12 rounded-xl border-white/[0.07] bg-white/[0.025] px-4 text-sm transition placeholder:text-slate-500/90 focus:border-emerald-200/20 focus:bg-white/[0.04]";

  if (sprawdzanieSesji) {
    return null;
  }

  return (
    <div className="karta-szklana relative w-full max-w-sm overflow-hidden rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(35,47,57,0.985)_0%,rgba(32,44,54,0.955)_56%,rgba(29,40,50,0.94)_100%)] p-6 shadow-[0_22px_60px_rgba(0,0,0,0.28)]">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="pointer-events-none absolute -left-12 top-20 h-28 w-28 rounded-full bg-emerald-300/[0.04] blur-3xl" />

      <div className="mb-4 flex justify-center">
        <Image
          src="/logo.png"
          alt="Eltreko logo"
          width={713}
          height={189}
          priority
          className="h-auto w-[72%] max-w-none object-contain opacity-90 saturate-[1.03]"
        />
      </div>

      <div className="mx-auto -mt-1 mb-4 h-px w-52 rounded-full bg-gradient-to-r from-transparent via-[#7df0a4]/70 to-transparent shadow-[0_0_10px_rgba(125,240,164,0.12)]" />

      <div className="mb-6 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-400">Panel dostępu</p>
        <h1 className="mt-4 text-[1.6rem] font-semibold leading-tight tracking-tight text-slate-50">
          {trybResetu ? "Ustaw nowe hasło" : "Bezpieczne logowanie"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-300/80">
          {trybResetu
            ? "Zmień hasło i wróć do pracy w panelu technicznym."
            : "Dostęp do dokumentów technicznych i panelu serwisowego."}
        </p>
      </div>

      <div className="space-y-4">
        {trybResetu ? (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Nowe hasło</label>
              <input
                type="password"
                className={klasyInputa}
                value={noweHaslo}
                onChange={(e) => setNoweHaslo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") zapiszNoweHaslo();
                }}
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Powtórz nowe hasło</label>
              <input
                type="password"
                className={klasyInputa}
                value={powtorzHaslo}
                onChange={(e) => setPowtorzHaslo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") zapiszNoweHaslo();
                }}
                required
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Email</label>
              <input
                type="email"
                className={klasyInputa}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") obsluzLogowanie();
                }}
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Hasło</label>
              <input
                type="password"
                className={klasyInputa}
                value={haslo}
                onChange={(e) => setHaslo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") obsluzLogowanie();
                }}
                required
              />
            </div>

            <label className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-sm text-slate-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-white/20 bg-transparent accent-emerald-400"
                checked={zapamietaj}
                onChange={(e) => setZapamietaj(e.target.checked)}
              />
              <span>Zapamiętaj mnie</span>
            </label>
          </>
        )}

        {blad ? (
          <p className="rounded-2xl border border-red-400/14 bg-red-500/[0.07] px-4 py-3 text-sm text-red-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
            {blad}
          </p>
        ) : null}
        {wiadomosc ? (
          <p className="rounded-2xl border border-emerald-400/14 bg-emerald-500/[0.07] px-4 py-3 text-sm text-emerald-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
            {wiadomosc}
          </p>
        ) : null}
        {pokazEasterEgg ? (
          <p className="rounded-2xl border border-red-400/14 bg-red-500/[0.07] px-4 py-3 text-sm text-red-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
            Artur wie
          </p>
        ) : null}

        <button
          type="button"
          onClick={trybResetu ? zapiszNoweHaslo : obsluzLogowanie}
          className="przycisk-glowny h-12 w-full rounded-xl text-base"
          disabled={ladowanie}
        >
          {ladowanie ? (trybResetu ? "Zapisywanie..." : "Trwa logowanie...") : trybResetu ? "Zapisz nowe hasło" : "Zaloguj się"}
        </button>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-white/8 pt-4">
        <button
          type="button"
          onClick={() => setPokazEasterEgg((aktualny) => !aktualny)}
          className="text-[11px] uppercase tracking-[0.22em] text-slate-500 transition hover:text-slate-300"
        >
          Pomoc
        </button>
        {trybResetu ? null : (
          <button
            type="button"
            onClick={resetujHaslo}
            className="rounded-full border border-white/[0.07] bg-white/[0.02] px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:border-white/[0.1] hover:bg-white/[0.04] hover:text-white"
          >
            Resetuj hasło
          </button>
        )}
      </div>

      <p className="mt-4 text-center text-[11px] text-slate-500/90">© Eltreko. Wszelkie prawa zastrzeżone.</p>
    </div>
  );
}
