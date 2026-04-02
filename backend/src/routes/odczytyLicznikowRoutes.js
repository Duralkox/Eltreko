const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { wymagajAutoryzacji } = require("../middleware/auth");
const {
  listaOdczytow,
  pobierzPodpieciePliku,
  zapiszPodpieciePliku,
  utworzOdczyt,
  edytujOdczyt,
  usunOdczyt,
  usunWszystkieOdczyty
} = require("../controllers/odczytyLicznikowController");

const router = express.Router();

router.use(wymagajAutoryzacji);
router.get("/podpiecie-pliku", asyncHandler(pobierzPodpieciePliku));
router.post("/podpiecie-pliku", asyncHandler(zapiszPodpieciePliku));
router.get("/", asyncHandler(listaOdczytow));
router.post("/", asyncHandler(utworzOdczyt));
router.delete("/", asyncHandler(usunWszystkieOdczyty));
router.put("/:id", asyncHandler(edytujOdczyt));
router.delete("/:id", asyncHandler(usunOdczyt));

module.exports = router;
