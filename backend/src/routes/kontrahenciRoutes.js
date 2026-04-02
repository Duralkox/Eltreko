const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { wymagajAutoryzacji } = require("../middleware/auth");
const { listaKlientow, utworzKlienta, edytujKlienta, usunKlienta } = require("../controllers/klienciController");
const { listaMetaKontrahentow, zapiszMetaKontrahenta } = require("../controllers/kontrahenciController");

const router = express.Router();

router.use(wymagajAutoryzacji);
router.get("/meta", asyncHandler(listaMetaKontrahentow));
router.put("/meta", asyncHandler(zapiszMetaKontrahenta));
router.get("/", asyncHandler(listaKlientow));
router.post("/", asyncHandler(utworzKlienta));
router.put("/:id", asyncHandler(edytujKlienta));
router.delete("/:id", asyncHandler(usunKlienta));

module.exports = router;
