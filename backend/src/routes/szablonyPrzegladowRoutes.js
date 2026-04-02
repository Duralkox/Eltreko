const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { wymagajAutoryzacji } = require("../middleware/auth");
const { uploadSzablonPrzegladu } = require("../middleware/upload");
const {
  listaSzablonowPrzegladow,
  utworzSzablonPrzegladu,
  edytujSzablonPrzegladu,
  usunSzablonPrzegladu,
  pobierzSzablonPrzegladu,
  pobierzSzablonProtokoluDocx
} = require("../controllers/szablonyPrzegladowController");

const router = express.Router();

router.use(wymagajAutoryzacji);
router.get("/", asyncHandler(listaSzablonowPrzegladow));
router.get("/protokol/docx", asyncHandler(pobierzSzablonProtokoluDocx));
router.get("/:id/pobierz", asyncHandler(pobierzSzablonPrzegladu));
router.post("/", uploadSzablonPrzegladu.single("plik"), asyncHandler(utworzSzablonPrzegladu));
router.put("/:id", uploadSzablonPrzegladu.single("plik"), asyncHandler(edytujSzablonPrzegladu));
router.delete("/:id", asyncHandler(usunSzablonPrzegladu));

module.exports = router;
