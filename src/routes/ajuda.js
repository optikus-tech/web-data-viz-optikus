var express = require("express");
var router = express.Router();
var ajudaController = require("../controllers/ajudaController");

router.post("/servidores", function (req, res) {
  ajudaController.listarServidores(req, res);
});

router.post("/limites", function (req, res) {
  ajudaController.obterLimites(req, res);
});

module.exports = router;