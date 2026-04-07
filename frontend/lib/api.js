"use client";

import { pobierzTokenAutoryzacji } from "./auth";

function normalizujApiUrl(url) {
  const czystyUrl = String(url || "").replace(/\/+$/, "");
  if (!czystyUrl) return "http://localhost:5000/api";
  return czystyUrl.endsWith("/api") ? czystyUrl : `${czystyUrl}/api`;
}

const API_URL = normalizujApiUrl(process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api");
const KLUCZ_PREFEROWANEGO_API = "eltreko_preferowany_api";

function pobierzPreferowanyApiUrl() {
  if (typeof window === "undefined") return API_URL;
  return sessionStorage.getItem(KLUCZ_PREFEROWANEGO_API) || API_URL;
}

function zapiszPreferowanyApiUrl(url) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KLUCZ_PREFEROWANEGO_API, url);
}

function kandydaciApiUrl() {
  const urls = [];
  const preferowanyApiUrl = pobierzPreferowanyApiUrl();
  const local5000 = API_URL.includes("localhost:5000");
  const local5001 = API_URL.includes("localhost:5001");

  if (preferowanyApiUrl) urls.push(preferowanyApiUrl);
  if (!urls.includes(API_URL)) urls.push(API_URL);

  if (local5000 || local5001) {
    const alt = local5000
      ? API_URL.replace("localhost:5000", "localhost:5001")
      : API_URL.replace("localhost:5001", "localhost:5000");
    if (!urls.includes(alt)) urls.push(alt);
  }

  return urls;
}

export async function zapytanieApi(endpoint, opcje = {}) {
  const token = await pobierzTokenAutoryzacji();

  const naglowki = {
    ...(opcje.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(opcje.headers || {})
  };
  if (token) naglowki.Authorization = `Bearer ${token}`;

  const urls = kandydaciApiUrl();
  let ostatniBlad = null;

  for (const baseUrl of urls) {
    let odpowiedz;

    try {
      odpowiedz = await fetch(`${baseUrl}${endpoint}`, { ...opcje, headers: naglowki });
    } catch (error) {
      ostatniBlad = error;
      continue;
    }

    zapiszPreferowanyApiUrl(baseUrl);

    if (!odpowiedz.ok) {
      const dane = await odpowiedz.json().catch(() => ({}));
      throw new Error(dane.blad || "Błąd połączenia z API.");
    }

    if (opcje.zwrocBinarnie) {
      return odpowiedz.blob();
    }

    return odpowiedz.json();
  }

  throw ostatniBlad || new Error("Błąd połączenia z API.");
}

export { API_URL };
