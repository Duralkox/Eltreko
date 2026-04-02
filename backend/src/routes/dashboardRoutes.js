const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { wymagajAutoryzacji } = require("../middleware/auth");
const { pobierzPanelGlowny, utworzNotatke, usunNotatke } = require("../controllers/dashboardController");

const router = express.Router();

router.get("/", wymagajAutoryzacji, asyncHandler(pobierzPanelGlowny));
router.post("/notatki", wymagajAutoryzacji, asyncHandler(utworzNotatke));
router.delete("/notatki/:id", wymagajAutoryzacji, asyncHandler(usunNotatke));

module.exports = router;
