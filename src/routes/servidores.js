var express = require("express");
var router = express.Router();
var servidorController = require("../controllers/servidorController");

router.post("/listar", function (req, res) {
    servidorController.listar(req, res);
});

router.post("/dashboard", function (req, res) {
    servidorController.dashboard(req, res);
});

router.post("/limites", function (req, res) {
    servidorController.listarLimites(req, res);
});

router.post("/limites/salvar", function (req, res) {
    servidorController.salvarLimites(req, res);
});

router.post("/localidades", function (req, res) {
    servidorController.listarLocalidades(req, res);
});

router.post("/validar-numero-serie", function (req, res) {
    servidorController.validarNumeroSerie(req, res);
});

router.post("/cadastrar", function (req, res) {
    servidorController.cadastrar(req, res);
});

router.post("/deletar", function (req, res) {
    servidorController.deletar(req, res);
});

module.exports = router;
