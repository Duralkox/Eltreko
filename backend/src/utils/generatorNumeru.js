function generujNumerProtokolu(rok, licznik) {
  return `ELT/${rok}/${String(licznik).padStart(4, "0")}`;
}

module.exports = { generujNumerProtokolu };
