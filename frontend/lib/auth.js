"use client";

import { supabase } from "./supabase";

const KLUCZ = "eltreko_sesja";
const KLUCZ_AKTYWNOSCI = "eltreko_sesja_aktywnosc";
const KLUCZ_ZAPAMIETAJ = "eltreko_sesja_zapamietaj";
const LIMIT_BEZCZYNNOSCI_MS = 15 * 60 * 1000;
const TTL_TOKENU_MS = 5000;

let cacheTokenu = null;
let cacheTokenuTs = 0;

export function czyZapamietajMnie() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KLUCZ_ZAPAMIETAJ) === "1";
}

export function ustawZapamietajMnie(wartosc) {
  if (typeof window === "undefined") return;
  if (wartosc) {
    localStorage.setItem(KLUCZ_ZAPAMIETAJ, "1");
    return;
  }
  localStorage.removeItem(KLUCZ_ZAPAMIETAJ);
}

export function zapiszSesje(dane, opcje = {}) {
  const zapamietaj = opcje.zapamietaj === true;
  ustawZapamietajMnie(zapamietaj);
  localStorage.setItem(KLUCZ, JSON.stringify(dane));
  localStorage.setItem(KLUCZ_AKTYWNOSCI, String(Date.now()));
  cacheTokenu = dane?.token || null;
  cacheTokenuTs = Date.now();
}

export function dotknijSesjeAktywnosc() {
  if (typeof window === "undefined") return;
  localStorage.setItem(KLUCZ_AKTYWNOSCI, String(Date.now()));
}

export function czySesjaWygasla() {
  if (typeof window === "undefined") return false;
  if (czyZapamietajMnie()) return false;
  const znacznik = Number(localStorage.getItem(KLUCZ_AKTYWNOSCI) || 0);
  if (!znacznik) return false;
  return Date.now() - znacznik > LIMIT_BEZCZYNNOSCI_MS;
}

export function pobierzSesje() {
  if (typeof window === "undefined") return null;
  if (czySesjaWygasla()) {
    localStorage.removeItem(KLUCZ);
    localStorage.removeItem(KLUCZ_AKTYWNOSCI);
    return null;
  }
  const surowe = localStorage.getItem(KLUCZ);
  if (!surowe) return null;
  try {
    return JSON.parse(surowe);
  } catch (_error) {
    localStorage.removeItem(KLUCZ);
    localStorage.removeItem(KLUCZ_AKTYWNOSCI);
    return null;
  }
}

export async function pobierzTokenAutoryzacji() {
  const teraz = Date.now();
  if (cacheTokenu && teraz - cacheTokenuTs < TTL_TOKENU_MS) {
    return cacheTokenu;
  }

  const lokalnaSesja = pobierzSesje();

  if (!supabase) {
    cacheTokenu = lokalnaSesja?.token || null;
    cacheTokenuTs = Date.now();
    return cacheTokenu;
  }

  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    cacheTokenu = lokalnaSesja?.token || null;
    cacheTokenuTs = cacheTokenu ? Date.now() : 0;
    if (cacheTokenu) {
      dotknijSesjeAktywnosc();
    }
    return cacheTokenu;
  }

  if (lokalnaSesja) {
    localStorage.setItem(
      KLUCZ,
      JSON.stringify({
        ...lokalnaSesja,
        token: session.access_token
      })
    );
    dotknijSesjeAktywnosc();
  }

  cacheTokenu = session.access_token;
  cacheTokenuTs = Date.now();
  return session.access_token;
}

export function wyczyscSesje() {
  localStorage.removeItem(KLUCZ);
  localStorage.removeItem(KLUCZ_AKTYWNOSCI);
  localStorage.removeItem(KLUCZ_ZAPAMIETAJ);
  cacheTokenu = null;
  cacheTokenuTs = 0;
  if (supabase) {
    supabase.auth.signOut().catch(() => {});
  }
}
