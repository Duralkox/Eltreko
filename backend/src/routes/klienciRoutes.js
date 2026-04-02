const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { wymagajAutoryzacji } = require("../middleware/auth");
const {
  listaKlientow,
  utworzKlienta,
  edytujKlienta,
  usunKlienta
} = require("../controllers/klienciController");

const router = express.Router();

router.use(wymagajAutoryzacji);
router.get("/", asyncHandler(listaKlientow));
router.post("/", asyncHandler(utworzKlienta));
router.put("/:id", asyncHandler(edytujKlienta));
router.delete("/:id", asyncHandler(usunKlienta));

module.exports = router;
