"use client";

import { useEffect } from "react";

export default function RejestracjaSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "development") {
      navigator.serviceWorker.getRegistrations().then((rejestracje) => {
        rejestracje.forEach((r) => r.unregister());
      });
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((rejestracja) => rejestracja.update().catch(() => null))
      .catch(() => null);
  }, []);

  return null;
}

