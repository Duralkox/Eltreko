const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { wymagajAutoryzacji, wymagajRoli } = require("../middleware/auth");
const { uploadSzablon } = require("../middleware/upload");
const { listaSzablonow, dodajSzablon, usunSzablon } = require("../controllers/szablonyController");

const router = express.Router();

router.use(wymagajAutoryzacji);
router.get("/", asyncHandler(listaSzablonow));
router.post("/", wymagajRoli(["Administrator"]), uploadSzablon.single("plik"), asyncHandler(dodajSzablon));
router.delete("/:id", wymagajRoli(["Administrator"]), asyncHandler(usunSzablon));

module.exports = router;
