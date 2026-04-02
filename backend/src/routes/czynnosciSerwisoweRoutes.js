const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { wymagajAutoryzacji } = require("../middleware/auth");
const { listaCzynnosci, utworzCzynnosc, edytujCzynnosc, usunCzynnosc } = require("../controllers/czynnosciSerwisoweController");

const router = express.Router();

router.use(wymagajAutoryzacji);
router.get("/", asyncHandler(listaCzynnosci));
router.post("/", asyncHandler(utworzCzynnosc));
router.put("/:id", asyncHandler(edytujCzynnosc));
router.delete("/:id", asyncHandler(usunCzynnosc));

module.exports = router;
