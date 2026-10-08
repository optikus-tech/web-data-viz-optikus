var loginModel = require("../models/loginModel");

function login(req, res) {
    var email = req.body.email;
    var senha = req.body.senha;
    loginModel.login(email,senha).then((resultado) => {

        res.status(200).json(resultado[0]);

    }).catch(function(erro){
         res.status(500).json(erro.sqlMessage);
    })
   
}

module.exports = {
    login
}