const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { wymagajAutoryzacji } = require("../middleware/auth");
const { uploadZdjecia } = require("../middleware/upload");
const {
  listaProtokolow,
  pobierzProtokol,
  nowyProtokol,
  edytujProtokol,
  usunProtokol,
  dodajZdjecia,
  eksportujDokument
} = require("../controllers/protokolyController");

const router = express.Router();

router.use(wymagajAutoryzacji);
router.get("/", asyncHandler(listaProtokolow));
router.get("/:id", asyncHandler(pobierzProtokol));
router.post("/", asyncHandler(nowyProtokol));
router.put("/:id", asyncHandler(edytujProtokol));
router.delete("/:id", asyncHandler(usunProtokol));
router.post("/:id/zdjecia", uploadZdjecia.array("zdjecia", 10), asyncHandler(dodajZdjecia));
router.get("/:id/eksport", asyncHandler(eksportujDokument));

module.exports = router;
