const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { logowanie, resetHasla, pobierzSesjeAutoryzowana } = require("../controllers/authController");
const { wymagajAutoryzacji } = require("../middleware/auth");

const router = express.Router();

router.post("/logowanie", asyncHandler(logowanie));
router.post("/reset-hasla", asyncHandler(resetHasla));
router.get("/sesja", asyncHandler(wymagajAutoryzacji), asyncHandler(pobierzSesjeAutoryzowana));

module.exports = router;
