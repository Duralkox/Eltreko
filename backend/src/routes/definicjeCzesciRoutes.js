const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { wymagajAutoryzacji } = require("../middleware/auth");
const { listaCzesci, utworzCzesc, edytujCzesc, usunCzesc } = require("../controllers/definicjeCzesciController");

const router = express.Router();

router.use(wymagajAutoryzacji);
router.get("/", asyncHandler(listaCzesci));
router.post("/", asyncHandler(utworzCzesc));
router.put("/:id", asyncHandler(edytujCzesc));
router.delete("/:id", asyncHandler(usunCzesc));

module.exports = router;
