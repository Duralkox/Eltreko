const path = require("path");
const fs = require("fs");
const multer = require("multer");

const katalog = process.env.UPLOAD_DIR || "uploads";

function upewnijKatalog(podkatalog) {
  const pelnaSciezka = path.join(process.cwd(), katalog, podkatalog);
  if (!fs.existsSync(pelnaSciezka)) {
    fs.mkdirSync(pelnaSciezka, { recursive: true });
  }
  return pelnaSciezka;
}

const magazynZdjec = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, upewnijKatalog("zdjecia")),
  filename: (_req, file, cb) => {
    const nazwa = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, nazwa);
  }
});

const magazynSzablonow = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, upewnijKatalog("szablony")),
  filename: (_req, file, cb) => {
    const nazwa = `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`;
    cb(null, nazwa);
  }
});

const magazynSzablonowPrzegladow = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, upewnijKatalog("szablony-przegladow")),
  filename: (_req, file, cb) => {
    const nazwa = `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`;
    cb(null, nazwa);
  }
});

const uploadZdjecia = multer({ storage: magazynZdjec });

const uploadSzablon = multer({
  storage: magazynSzablonow,
  fileFilter: (_req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith(".docx")) {
      return cb(new Error("Dozwolony jest wyłącznie format .docx"));
    }
    return cb(null, true);
  }
});

const dozwoloneRozszerzeniaPrzegladow = [".doc", ".docx", ".xls", ".xlsx", ".ods"];
const uploadSzablonPrzegladu = multer({
  storage: magazynSzablonowPrzegladow,
  fileFilter: (_req, file, cb) => {
    const rozszerzenie = path.extname(file.originalname || "").toLowerCase();
    if (!dozwoloneRozszerzeniaPrzegladow.includes(rozszerzenie)) {
      return cb(new Error("Dozwolone są pliki .doc, .docx, .xls, .xlsx oraz .ods"));
    }
    return cb(null, true);
  }
});

module.exports = { uploadZdjecia, uploadSzablon, uploadSzablonPrzegladu };
