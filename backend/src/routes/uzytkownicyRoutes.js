const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { wymagajAutoryzacji, wymagajRoli } = require("../middleware/auth");
const {
  listaUzytkownikow,
  utworzUzytkownika,
  edytujUzytkownika,
  usunUzytkownika
} = require("../controllers/uzytkownicyController");

const router = express.Router();

router.use(wymagajAutoryzacji);
router.use(wymagajRoli(["Administrator"]));
router.get("/", asyncHandler(listaUzytkownikow));
router.post("/", asyncHandler(utworzUzytkownika));
router.put("/:id", asyncHandler(edytujUzytkownika));
router.delete("/:id", asyncHandler(usunUzytkownika));

module.exports = router;
