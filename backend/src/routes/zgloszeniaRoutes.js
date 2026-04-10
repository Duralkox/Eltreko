const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { wymagajAutoryzacji } = require("../middleware/auth");
const {
  listaZgloszen,
  listaOpcjiZgloszen,
  utworzZgloszenie,
  edytujZgloszenie,
  usunZgloszenie,
  wyslijMailDlaZgloszenia
} = require("../controllers/zgloszeniaController");

const router = express.Router();

router.use(wymagajAutoryzacji);
router.get("/opcje", asyncHandler(listaOpcjiZgloszen));
router.post("/wyslij-mail", asyncHandler(wyslijMailDlaZgloszenia));
router.get("/", asyncHandler(listaZgloszen));
router.post("/", asyncHandler(utworzZgloszenie));
router.put("/:id", asyncHandler(edytujZgloszenie));
router.delete("/:id", asyncHandler(usunZgloszenie));

module.exports = router;
