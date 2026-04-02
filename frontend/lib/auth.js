"use client";

import { supabase } from "./supabase";

const KLUCZ = "eltreko_sesja";
const TTL_TOKENU_MS = 5000;

let cacheTokenu = null;
let cacheTokenuTs = 0;

export function zapiszSesje(dane) {
  localStorage.setItem(KLUCZ, JSON.stringify(dane));
  cacheTokenu = dane?.token || null;
  cacheTokenuTs = Date.now();
}

export function pobierzSesje() {
  if (typeof window === "undefined") return null;
  const surowe = localStorage.getItem(KLUCZ);
  if (!surowe) return null;
  try {
    return JSON.parse(surowe);
  } catch (_error) {
    localStorage.removeItem(KLUCZ);
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
    if (typeof window !== "undefined") {
      localStorage.removeItem(KLUCZ);
    }
    cacheTokenu = null;
    cacheTokenuTs = 0;
    return null;
  }

  if (lokalnaSesja) {
    localStorage.setItem(
      KLUCZ,
      JSON.stringify({
        ...lokalnaSesja,
        token: session.access_token
      })
    );
  }

  cacheTokenu = session.access_token;
  cacheTokenuTs = Date.now();
  return session.access_token;
}

export function wyczyscSesje() {
  localStorage.removeItem(KLUCZ);
  cacheTokenu = null;
  cacheTokenuTs = 0;
  if (supabase) {
    supabase.auth.signOut().catch(() => {});
  }
}
