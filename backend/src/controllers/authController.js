async function logowanie(_req, res) {
  return res.status(410).json({
    blad: "Lokalne logowanie zostało wyłączone. Użyj Supabase Auth."
  });
}

async function resetHasla(req, res) {
  const email = String(req.body?.email || "").trim();

  if (!email) {
    return res.status(400).json({ blad: "Podaj adres email do resetu hasła." });
  }

  return res.status(410).json({
    blad: "Lokalny reset hasła został wyłączony. Użyj resetu hasła przez Supabase Auth."
  });
}

async function pobierzSesjeAutoryzowana(req, res) {
  return res.json({
    uzytkownik: {
      id: req.uzytkownik.id,
      email: req.uzytkownik.email,
      rola: req.uzytkownik.rola,
      imieNazwisko: req.uzytkownik.imieNazwisko
    }
  });
}

module.exports = { logowanie, resetHasla, pobierzSesjeAutoryzowana };
