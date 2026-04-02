const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { wymagajAutoryzacji } = require("../middleware/auth");
const { listaTechnikow } = require("../controllers/uzytkownicyController");

const router = express.Router();

router.get("/", wymagajAutoryzacji, asyncHandler(listaTechnikow));

module.exports = router;
