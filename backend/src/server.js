require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const db = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const protokolyRoutes = require("./routes/protokolyRoutes");
const klienciRoutes = require("./routes/klienciRoutes");
const kontrahenciRoutes = require("./routes/kontrahenciRoutes");
const zgloszeniaRoutes = require("./routes/zgloszeniaRoutes");
const odczytyLicznikowRoutes = require("./routes/odczytyLicznikowRoutes");
const kategorieUsterekRoutes = require("./routes/kategorieUsterekRoutes");
const czynnosciSerwisoweRoutes = require("./routes/czynnosciSerwisoweRoutes");
const szablonyPrzegladowRoutes = require("./routes/szablonyPrzegladowRoutes");
const definicjeCzesciRoutes = require("./routes/definicjeCzesciRoutes");
const ppozRoutes = require("./routes/ppozRoutes");
const szablonyRoutes = require("./routes/szablonyRoutes");
const uzytkownicyRoutes = require("./routes/uzytkownicyRoutes");
const technicyRoutes = require("./routes/technicyRoutes");

const app = express();
const port = process.env.PORT || 5000;
const uploadDir = process.env.UPLOAD_DIR || "uploads";

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(`/${uploadDir}`, express.static(path.join(process.cwd(), uploadDir)));

app.get("/api/zdrowie", (_req, res) => {
  res.json({ status: "OK", aplikacja: "EltrekoAPP API" });
});

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/protokoly", protokolyRoutes);
app.use("/api/klienci", klienciRoutes);
app.use("/api/kontrahenci", kontrahenciRoutes);
app.use("/api/zgloszenia", zgloszeniaRoutes);
app.use("/api/odczyty-licznikow", odczytyLicznikowRoutes);
app.use("/api/kategorie-usterek", kategorieUsterekRoutes);
app.use("/api/czynnosci-serwisowe", czynnosciSerwisoweRoutes);
app.use("/api/szablony-przegladow", szablonyPrzegladowRoutes);
app.use("/api/definicje-czesci", definicjeCzesciRoutes);
app.use("/api/ppoz", ppozRoutes);
app.use("/api/szablony", szablonyRoutes);
app.use("/api/uzytkownicy", uzytkownicyRoutes);
app.use("/api/technicy", technicyRoutes);

app.use((err, _req, res, _next) => {
  const dbErrorCode = err?.code;
  const dbConnectionError =
    dbErrorCode === "ECONNREFUSED" ||
    dbErrorCode === "ER_ACCESS_DENIED_ERROR" ||
    dbErrorCode === "ER_BAD_DB_ERROR";
  const dbDataError = dbErrorCode === "ER_DUP_ENTRY" || dbErrorCode === "ER_DATA_TOO_LONG";

  if (dbConnectionError) {
    console.error("Blad polaczenia z baza danych:", {
      code: err.code,
      errno: err.errno,
      sqlMessage: err.sqlMessage
    });

    return res.status(503).json({
      blad: "Brak polaczenia z baza danych. Sprawdz konfiguracje backend/.env i polaczenie z aktywna baza."
    });
  }

  if (dbDataError) {
    if (dbErrorCode === "ER_DUP_ENTRY") {
      return res.status(409).json({ blad: "Duplikat danych. Wpis juz istnieje." });
    }
    if (dbErrorCode === "ER_DATA_TOO_LONG") {
      return res.status(400).json({ blad: "Jedno z pol jest za dlugie dla bazy danych." });
    }
  }

  if (err?.message?.includes(".docx")) {
    return res.status(400).json({ blad: err.message });
  }

  console.error("Blad serwera:", err);
  return res.status(500).json({ blad: "Wystapil blad serwera." });
});

app.listen(port, () => {
  console.log(`EltrekoAPP API dziala na porcie ${port}`);

  db.pool
    .query("SELECT 1")
    .then(() => {
      console.log("Polaczenie z baza danych: OK");
    })
    .catch((error) => {
      console.error("Polaczenie z baza danych: NIEUDANE", {
        code: error.code,
        errno: error.errno,
        message: error.message
      });
    });
});
