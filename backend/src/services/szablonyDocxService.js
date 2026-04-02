const fs = require("fs");
const path = require("path");
const {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  AlignmentType,
  BorderStyle,
  ImageRun,
  Header,
  ShadingType,
  VerticalAlign
} = require("docx");

function wybierzLogo() {
  const kandydaci = [
    path.join(process.cwd(), "..", "frontend", "public", "logo.png"),
    path.join(process.cwd(), "frontend", "public", "logo.png")
  ];
  return kandydaci.find((p) => fs.existsSync(p));
}

function komorka(children, options = {}) {
  return new TableCell({
    children,
    verticalAlign: options.verticalAlign || VerticalAlign.CENTER,
    width: options.width ? { size: options.width, type: WidthType.DXA } : undefined,
    shading: options.fill
      ? {
          type: ShadingType.CLEAR,
          color: "auto",
          fill: options.fill
        }
      : undefined,
    margins: {
      top: 120,
      bottom: 120,
      left: 180,
      right: 180
    },
    borders: options.borders || {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }
    }
  });
}

function akapitEtykieta(text) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 18,
        color: "253641"
      })
    ]
  });
}

function akapitWartosc(text = " ") {
  return new Paragraph({
    spacing: { after: 0 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 2, color: "E7EDF1" }
    },
    children: [
      new TextRun({
        text,
        size: 22,
        color: "17212B"
      })
    ]
  });
}

function sekcjaDwaPola(leftLabel, rightLabel) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [4600, 4600],
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }
    },
    rows: [
      new TableRow({
        children: [
          komorka([akapitEtykieta(leftLabel), akapitWartosc()]),
          komorka([akapitEtykieta(rightLabel), akapitWartosc()])
        ]
      })
    ]
  });
}

function sekcjaJednoPole(label, minLines = 1) {
  const children = [akapitEtykieta(label), akapitWartosc()];
  for (let i = 1; i < minLines; i += 1) {
    children.push(new Paragraph({ children: [new TextRun({ text: " ", size: 22 })] }));
  }
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }
    },
    rows: [new TableRow({ children: [komorka(children)] })]
  });
}

async function generujSzablonProtokoluDocx() {
  const logoPath = wybierzLogo();
  const logoRun = logoPath
    ? new ImageRun({
        data: fs.readFileSync(logoPath),
        transformation: { width: 180, height: 43 }
      })
    : new TextRun({ text: "ELTREKO", bold: true, size: 42, color: "7AC13F" });

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Arial",
            size: 22,
            color: "17212B"
          },
          paragraph: {
            spacing: {
              after: 0
            }
          }
        }
      }
    },
    sections: [
      {
        headers: {
          default: new Header({
            children: []
          })
        },
        properties: {},
        children: [
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            columnWidths: [3300, 2500, 3000],
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "E8F0DD" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "E8F0DD" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "E8F0DD" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "E8F0DD" },
              insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }
            },
            rows: [
              new TableRow({
                children: [
                  komorka(
                    [
                      new Paragraph({
                        children: [logoRun],
                        spacing: { after: 80 }
                      })
                    ],
                    { fill: "F2F8EA" }
                  ),
                  komorka(
                    [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: "tel. 513 086 511", size: 18, color: "8E99A6" })]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: "tel. 602 559 188", size: 18, color: "8E99A6" })]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: "e-mail: eltreko@gmail.com", size: 18, color: "8E99A6" })]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: "Warszawa", size: 18, color: "8E99A6" })]
                      })
                    ],
                    { fill: "F2F8EA" }
                  ),
                  komorka(
                    [
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                          new TextRun({
                            text: "ELTREKO M. DURALSKI, A. PIETRAK",
                            bold: true,
                            size: 17,
                            color: "15212B"
                          })
                        ]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [new TextRun({ text: "SPÓŁKA JAWNA", bold: true, size: 17, color: "15212B" })]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [new TextRun({ text: "ul. Van Gogha 3A / 21", size: 18, color: "8E99A6" })]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [new TextRun({ text: "03-188 Warszawa", size: 18, color: "8E99A6" })]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [new TextRun({ text: "NIP: 5242673461", size: 18, color: "8E99A6" })]
                      })
                    ],
                    { fill: "F2F8EA" }
                  )
                ]
              })
            ]
          }),

          new Paragraph({ spacing: { after: 220 } }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            columnWidths: [7000, 1800],
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "E6EBEF" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "E6EBEF" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "E6EBEF" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "E6EBEF" },
              insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }
            },
            rows: [
              new TableRow({
                children: [
                  komorka([
                    new Paragraph({
                      children: [new TextRun({ text: "Protokół przyjęcia zlecenia", bold: true, size: 34, color: "15212B" })]
                    }),
                    new Paragraph({
                      spacing: { before: 80 },
                      children: [new TextRun({ text: "Nr [", size: 20, color: "8E99A6" })]
                    })
                  ]),
                  komorka(
                    [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: "DATA PRZYJĘCIA", bold: true, size: 16, color: "5F7F31" })]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 60 },
                        children: [new TextRun({ text: "dd.mm.rrrr", bold: true, size: 20, color: "15212B" })]
                      })
                    ],
                    { fill: "EEF6E6" }
                  )
                ]
              })
            ]
          }),

          new Paragraph({ spacing: { after: 180 } }),

          sekcjaDwaPola("Zlecający", "Przyjmujący zlecenie"),
          new Paragraph({ spacing: { after: 120 } }),
          sekcjaDwaPola("Obiekt", "Adres obiektu"),
          new Paragraph({ spacing: { after: 120 } }),
          sekcjaJednoPole("Lokalizacja usterki", 2),
          new Paragraph({ spacing: { after: 120 } }),
          sekcjaJednoPole("Kategoria usterki"),
          new Paragraph({ spacing: { after: 120 } }),
          sekcjaJednoPole("Czynności serwisowe", 2),
          new Paragraph({ spacing: { after: 120 } }),
          sekcjaJednoPole("Opis usterki", 3),
          new Paragraph({ spacing: { after: 120 } }),
          sekcjaJednoPole("Użyte części", 2),
          new Paragraph({ spacing: { after: 120 } }),
          sekcjaDwaPola("Planowana data wykonania naprawy", "Uwagi do usługi")
        ]
      }
    ]
  });

  return Packer.toBuffer(doc);
}

module.exports = {
  generujSzablonProtokoluDocx
};
