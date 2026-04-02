const nodemailer = require("nodemailer");

function pobierzKonfiguracjeMaila() {
  return {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.MAIL_FROM || process.env.SMTP_USER || ""
  };
}

function utworzTransporter() {
  const config = pobierzKonfiguracjeMaila();
  if (!config.host || !config.port || !config.user || !config.pass || !config.from) {
    throw new Error("Wysyłka email nie jest jeszcze skonfigurowana na serwerze.");
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });
}

async function wyslijKodResetuHasla({ email, kod, imieNazwisko }) {
  const transporter = utworzTransporter();
  const temat = "EltrekoAPP - kod resetu hasła";
  const powitanie = imieNazwisko ? `Cześć ${imieNazwisko},` : "Cześć,";

  await transporter.sendMail({
    from: pobierzKonfiguracjeMaila().from,
    to: email,
    subject: temat,
    text: `${powitanie}\n\nTwój kod resetu hasła do EltrekoAPP: ${kod}\n\nKod jest ważny przez 15 minut.\nJeśli to nie Ty, zignoruj tę wiadomość.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
        <p>${powitanie}</p>
        <p>Twój kod resetu hasła do <strong>EltrekoAPP</strong>:</p>
        <div style="display:inline-block;padding:12px 18px;border-radius:12px;background:#4ac46f;color:#0f172a;font-size:24px;font-weight:700;letter-spacing:0.18em;">
          ${kod}
        </div>
        <p style="margin-top:16px;">Kod jest ważny przez 15 minut.</p>
        <p>Jeśli to nie Ty, zignoruj tę wiadomość.</p>
      </div>
    `
  });
}

function escapeIcs(tekst) {
  return String(tekst || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function stampIcs(data) {
  return data
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

async function wyslijNotatkeDoKalendarza({ email, imieNazwisko, notatka }) {
  const transporter = utworzTransporter();
  const start = new Date(notatka.termin_at);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const powitanie = imieNazwisko ? `Cześć ${imieNazwisko},` : "Cześć,";
  const temat = `EltrekoAPP - wpis do kalendarza: ${notatka.tytul}`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Eltreko//Panel serwisowy//PL",
    "BEGIN:VEVENT",
    `UID:notatka-${notatka.id}@eltreko.pl`,
    `DTSTAMP:${stampIcs(new Date())}`,
    `DTSTART:${stampIcs(start)}`,
    `DTEND:${stampIcs(end)}`,
    `SUMMARY:${escapeIcs(notatka.tytul)}`,
    `DESCRIPTION:${escapeIcs(notatka.tresc || "")}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  await transporter.sendMail({
    from: pobierzKonfiguracjeMaila().from,
    to: email,
    subject: temat,
    text: `${powitanie}\n\nW załączniku znajdziesz wpis do kalendarza dla notatki: ${notatka.tytul}.\nTermin: ${start.toLocaleString("pl-PL")}\n\nPo otwarciu załącznika możesz dodać wydarzenie do swojego kalendarza.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
        <p>${powitanie}</p>
        <p>W załączniku znajdziesz wpis do kalendarza dla notatki:</p>
        <p style="font-size:18px;font-weight:700;margin:0 0 8px;">${notatka.tytul}</p>
        <p style="margin:0 0 16px;">Termin: <strong>${start.toLocaleString("pl-PL")}</strong></p>
        <p>Po otwarciu załącznika możesz dodać wydarzenie do swojego kalendarza.</p>
      </div>
    `,
    attachments: [
      {
        filename: `${String(notatka.tytul || "notatka").replace(/[^\w\-]+/g, "_")}.ics`,
        content: ics,
        contentType: "text/calendar; charset=utf-8; method=REQUEST"
      }
    ]
  });
}

module.exports = {
  wyslijKodResetuHasla,
  wyslijNotatkeDoKalendarza
};
