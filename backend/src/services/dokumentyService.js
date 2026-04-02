const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

function bezpiecznyTekst(wartosc) {
  if (wartosc === null || wartosc === undefined || wartosc === "") return "-";
  return String(wartosc);
}

function formatujDate(data) {
  if (!data) return "-";
  const parsed = data instanceof Date ? data : new Date(data);
  if (Number.isNaN(parsed.getTime())) return String(data);
  return parsed.toLocaleDateString("pl-PL");
}

function parsujListeJson(wartosc) {
  if (Array.isArray(wartosc)) return wartosc;
  try {
    return JSON.parse(wartosc || "[]");
  } catch {
    return [];
  }
}

function wybierzCzcionke() {
  const kandydaciRegular = [
    path.join(process.cwd(), "assets", "fonts", "DejaVuSans.ttf"),
    "C:\\Windows\\Fonts\\arial.ttf"
  ];
  const kandydaciBold = [
    path.join(process.cwd(), "assets", "fonts", "DejaVuSans-Bold.ttf"),
    "C:\\Windows\\Fonts\\arialbd.ttf"
  ];
  return {
    regular: kandydaciRegular.find((p) => fs.existsSync(p)),
    bold: kandydaciBold.find((p) => fs.existsSync(p))
  };
}

function wybierzLogo() {
  const kandydaci = [
    path.join(process.cwd(), "..", "frontend", "public", "logo.png"),
    path.join(process.cwd(), "frontend", "public", "logo.png")
  ];
  return kandydaci.find((p) => fs.existsSync(p));
}

function rysujPole(doc, etykieta, wartosc, x, y, szerokosc, fontBold, fontRegular) {
  doc.font(fontBold).fontSize(10).fillColor("#253641").text(etykieta, x, y, { width: szerokosc });
  doc.font(fontRegular).fontSize(11).fillColor("#17212b").text(bezpiecznyTekst(wartosc), x, y + 18, {
    width: szerokosc
  });
}

function generujPdf(dane) {
  const doc = new PDFDocument({ margin: 46, size: "A4" });
  const buffory = [];
  doc.on("data", (chunk) => buffory.push(chunk));

  const { regular, bold } = wybierzCzcionke();
  if (regular) doc.registerFont("EltrekoRegular", regular);
  if (bold) doc.registerFont("EltrekoBold", bold);

  const fontRegular = regular ? "EltrekoRegular" : "Helvetica";
  const fontBold = bold ? "EltrekoBold" : "Helvetica-Bold";
  const logo = wybierzLogo();

  const ciemny = "#15212b";
  const szary = "#8e99a6";
  const linia = "#e7edf1";
  const akcent = "#7ac13f";
  const akcentTlo = "#f2f8ea";

  doc.roundedRect(38, 30, 519, 760, 16).lineWidth(1).strokeColor("#e3e9ee").stroke();

  doc.roundedRect(54, 46, 487, 108, 16).fillColor(akcentTlo).fill();
  doc.roundedRect(54, 46, 487, 108, 16).lineWidth(1).strokeColor("#e8f0dd").stroke();

  if (logo) {
    doc.image(logo, 66, 82, { fit: [150, 36], align: "left" });
  } else {
    doc.font(fontBold).fontSize(18).fillColor(ciemny).text("ELTREKO", 66, 88, { width: 150, align: "left" });
  }

  doc
    .font(fontRegular)
    .fontSize(8)
    .fillColor(szary)
    .text("tel. 513 086 511", 270, 72, { align: "left", width: 120 })
    .text("tel. 602 559 188", 270, 84, { align: "left", width: 120 })
    .text("e-mail: eltreko@gmail.com", 270, 100, { align: "left", width: 146 })
    .text("Warszawa", 270, 116, { align: "left", width: 90 });

  doc
    .font(fontBold)
    .fontSize(6.6)
    .fillColor(ciemny)
    .text("ELTREKO M. DURALSKI, A. PIETRAK", 382, 72, { width: 140, align: "right" })
    .text("SPÓŁKA JAWNA", 382, 82, { width: 140, align: "right" })
    .font(fontRegular)
    .fontSize(8)
    .fillColor(szary)
    .text("ul. Van Gogha 3A / 21", 382, 98, { width: 140, align: "right" })
    .text("03-188 Warszawa", 382, 110, { width: 140, align: "right" })
    .text("NIP: 5242673461", 382, 122, { width: 140, align: "right" });

  doc.roundedRect(54, 172, 487, 56, 14).fillColor("#ffffff").fill();
  doc.roundedRect(54, 172, 487, 56, 14).lineWidth(1).strokeColor("#e6ebef").stroke();

  doc.font(fontBold).fontSize(17).fillColor(ciemny).text("Protokół przyjęcia zlecenia", 74, 188, { width: 310 });
  doc.font(fontRegular).fontSize(10).fillColor(szary).text(`Nr ${bezpiecznyTekst(dane.numer_protokolu)}`, 74, 209);

  doc.roundedRect(402, 182, 122, 36, 10).fillColor("#eef6e6").fill();
  doc.font(fontBold).fontSize(8).fillColor("#5f7f31").text("DATA PRZYJĘCIA", 415, 190, { width: 96, align: "center" });
  doc.font(fontBold).fontSize(10).fillColor(ciemny).text(formatujDate(dane.data), 415, 202, { width: 96, align: "center" });

  rysujPole(doc, "Zlecający", dane.zlecajacy || dane.klient, 58, 252, 220, fontBold, fontRegular);
  rysujPole(doc, "Przyjmujący zlecenie", dane.przyjmujacy_zlecenie || dane.technik_nazwa || dane.technik, 302, 252, 226, fontBold, fontRegular);

  doc.moveTo(58, 312).lineTo(528, 312).strokeColor(linia).lineWidth(1).stroke();

  rysujPole(doc, "Obiekt", dane.obiekt || dane.klient, 58, 330, 220, fontBold, fontRegular);
  rysujPole(doc, "Adres obiektu", dane.adres_obiektu || dane.adres, 302, 330, 226, fontBold, fontRegular);

  doc.moveTo(58, 390).lineTo(528, 390).strokeColor(linia).lineWidth(1).stroke();

  doc.font(fontBold).fontSize(10).fillColor("#253641").text("Lokalizacja usterki", 58, 408);
  doc.font(fontRegular).fontSize(10.5).fillColor(ciemny).text(bezpiecznyTekst(dane.lokalizacja_usterki || dane.usterki), 58, 426, {
    width: 470,
    lineGap: 2
  });

  doc.font(fontBold).fontSize(10).fillColor("#253641").text("Kategoria usterki", 58, 468);
  doc.font(fontRegular).fontSize(10.5).fillColor(ciemny).text(bezpiecznyTekst(dane.kategoria_usterki_nazwa), 58, 486, { width: 200 });

  doc.font(fontBold).fontSize(10).fillColor("#253641").text("Czynności serwisowe", 302, 468);
  doc.font(fontRegular).fontSize(10.5).fillColor(ciemny).text(
    parsujListeJson(dane.czynnosci_serwisowe || dane.czynnosci_serwisowe_json).join(", ") || "-",
    302,
    486,
    { width: 226, lineGap: 2 }
  );

  doc.moveTo(58, 528).lineTo(528, 528).strokeColor(linia).lineWidth(1).stroke();

  doc.font(fontBold).fontSize(10).fillColor("#253641").text("Opis usterki", 58, 546);
  doc.font(fontRegular).fontSize(10.5).fillColor(ciemny).text(bezpiecznyTekst(dane.opis_usterki || dane.opis_pracy), 58, 564, {
    width: 470,
    lineGap: 3
  });

  doc.moveTo(58, 642).lineTo(528, 642).strokeColor(linia).lineWidth(1).stroke();

  doc.font(fontBold).fontSize(10).fillColor("#253641").text("Użyte części", 58, 660);
  doc.font(fontRegular).fontSize(10.2).fillColor(ciemny).text(
    (() => {
      const listaCzesci = parsujListeJson(dane.uzyte_czesci || dane.uzyte_czesci_json);
      if (!listaCzesci.length) return "-";
      return listaCzesci.map((czesc) => `${czesc.nazwa} - ${czesc.ilosc || "1"} ${czesc.jednostka || "szt"}`).join("\n");
    })(),
    58,
    678,
    {
      width: 470,
      lineGap: 3
    }
  );

  doc.moveTo(58, 730).lineTo(528, 730).strokeColor(linia).lineWidth(1).stroke();

  doc.font(fontBold).fontSize(10).fillColor("#253641").text("Planowana data wykonania naprawy", 58, 744);
  doc.font(fontBold).fontSize(11).fillColor(akcent).text(bezpiecznyTekst(formatujDate(dane.planowana_data_naprawy)), 58, 762);

  doc.font(fontBold).fontSize(10).fillColor("#253641").text("Uwagi do usługi", 266, 744);
  doc.font(fontRegular).fontSize(10.2).fillColor(ciemny).text(bezpiecznyTekst(dane.uwagi_do_uslugi), 266, 762, {
    width: 262,
    lineGap: 3
  });

  doc.end();
  return new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(buffory)));
  });
}

module.exports = {
  generujPdf
};
