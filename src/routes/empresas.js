var express = require("express");
var router = express.Router();

var empresaController = require("../controllers/empresaController");

router.post("/listarFuncionarios", function (req, res) {
    empresaController.listarFuncionarios(req, res);
});

router.post("/cadastrar", function (req, res) {
    empresaController.cadastrar(req, res);
})

router.post("/deletar", function (req, res) {
    empresaController.deletar(req, res)
})

module.exports = router;