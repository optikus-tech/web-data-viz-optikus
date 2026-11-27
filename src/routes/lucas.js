var express = require("express");
var router = express.Router();
var lucasController = require("../controllers/lucasController");

router.post("/listar", lucasController.listar);
router.post("/dashboard", lucasController.dashboard);

module.exports = router;