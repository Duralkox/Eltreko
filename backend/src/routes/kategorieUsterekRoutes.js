const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { wymagajAutoryzacji } = require("../middleware/auth");
const { listaKategorii, utworzKategorie, edytujKategorie, usunKategorie } = require("../controllers/kategorieUsterekController");

const router = express.Router();

router.use(wymagajAutoryzacji);
router.get("/", asyncHandler(listaKategorii));
router.post("/", asyncHandler(utworzKategorie));
router.put("/:id", asyncHandler(edytujKategorie));
router.delete("/:id", asyncHandler(usunKategorie));

module.exports = router;
