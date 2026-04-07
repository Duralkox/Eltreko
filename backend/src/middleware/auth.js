const jwt = require("jsonwebtoken");
const db = require("../config/db");

async function pobierzUzytkownikaZSupabase(token) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseApiKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseApiKey) {
    return null;
  }

  const odpowiedz = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseApiKey,
      Authorization: `Bearer ${token}`
    }
  });

  if (!odpowiedz.ok) {
    return null;
  }

  const dane = await odpowiedz.json();
  if (!dane?.email) {
    return null;
  }

  const wynik = await db.query(
    "SELECT id, email, rola, imie_nazwisko FROM uzytkownicy WHERE email = ? AND aktywny = 1 LIMIT 1",
    [dane.email]
  );

  if (!wynik.rows.length) {
    return null;
  }

  const uzytkownik = wynik.rows[0];
  return {
    id: uzytkownik.id,
    email: uzytkownik.email,
    rola: uzytkownik.rola,
    imieNazwisko: uzytkownik.imie_nazwisko,
    provider: "supabase"
  };
}

async function wymagajAutoryzacji(req, res, next) {
  const naglowek = req.headers.authorization;
  if (!naglowek) {
    return res.status(401).json({ blad: "Brak tokenu autoryzacji." });
  }

  const token = naglowek.replace("Bearer ", "");

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.uzytkownik = payload;
    return next();
  } catch (_error) {
    try {
      const uzytkownikSupabase = await pobierzUzytkownikaZSupabase(token);
      if (!uzytkownikSupabase) {
        return res.status(401).json({ blad: "Nieprawidłowy token." });
      }

      req.uzytkownik = uzytkownikSupabase;
      return next();
    } catch (supabaseError) {
      const dbErrorCode = supabaseError?.code;
      const dbConnectionError =
        dbErrorCode === "ECONNREFUSED" ||
        dbErrorCode === "ER_ACCESS_DENIED_ERROR" ||
        dbErrorCode === "ER_BAD_DB_ERROR";

      if (dbConnectionError) {
        return res.status(503).json({
          blad: "Brak połączenia z bazą danych. Sprawdź połączenie backendu z aktywną bazą i spróbuj ponownie."
        });
      }

      return res.status(401).json({ blad: "Nieprawidłowy token." });
    }
  }
}

function wymagajRoli(dozwoloneRole) {
  return (req, res, next) => {
    if (!req.uzytkownik || !dozwoloneRole.includes(req.uzytkownik.rola)) {
      return res.status(403).json({ blad: "Brak uprawnień do wykonania operacji." });
    }
    return next();
  };
}

module.exports = { wymagajAutoryzacji, wymagajRoli };
