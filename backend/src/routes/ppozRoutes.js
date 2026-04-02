const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { wymagajAutoryzacji } = require("../middleware/auth");
const { listaPpozPrzegladow, utworzPpozPrzeglad, edytujPpozPrzeglad, usunPpozPrzeglad } = require("../controllers/ppozController");

const router = express.Router();

router.use(wymagajAutoryzacji);
router.get("/", asyncHandler(listaPpozPrzegladow));
router.post("/", asyncHandler(utworzPpozPrzeglad));
router.put("/:id", asyncHandler(edytujPpozPrzeglad));
router.delete("/:id", asyncHandler(usunPpozPrzeglad));

module.exports = router;
