var express = require("express");
var router = express.Router();

var loginController = require("../controllers/loginController");

router.post("/login", function(req,res) {
    loginController.login(req, res);
});

module.exports = router;

